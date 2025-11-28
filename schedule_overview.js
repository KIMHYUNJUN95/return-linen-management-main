// ========================================
// 📊 HARU Schedule List Controller
// Design System: Tokyo Day Bright
// Features: List, Edit, Delete, Photo Preview
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔴 1. Firebase Initialization
let firebaseConfig = {};
if (window.__firebase_config) {
  try { firebaseConfig = JSON.parse(window.__firebase_config); } catch (e) { console.error(e); }
}

let app, auth, db;
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    auth = { onAuthStateChanged: () => {} };
}

// 2. DOM Elements
const buildingFilter = document.getElementById("buildingFilter");
const statusFilter = document.getElementById("statusFilter");
const tableBody = document.getElementById("taskTableBody");
const mobileList = document.getElementById("mobileList");
const btnRefresh = document.getElementById("btnRefresh");
const btnBack = document.getElementById("btnBack");

// Photo Modal Elements
const photoModal = document.getElementById("photoModal");
const photoImg = document.getElementById("photoImg");
const btnPhotoClose = document.getElementById("btnPhotoClose");

let allTasks = [];
let currentUser = null;

// ========================================
// 🔐 Auth Check & Init
// ========================================
if (auth && typeof auth.onAuthStateChanged === 'function') {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            alert("Please login first.");
            location.href = "index.html";
        } else {
            currentUser = user;
            loadTasks();
        }
    });
}

// ========================================
// 📡 Load Data (Improved Robustness)
// ========================================
async function loadTasks() {
  if (!db) return;

  // Loading State
  if(tableBody) tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:#64748B;">LOADING...</td></tr>`;
  if(btnRefresh) {
      btnRefresh.disabled = true;
      btnRefresh.textContent = "LOADING...";
  }

  try {
    // 🔴 중요: orderBy를 제거하고 클라이언트에서 정렬합니다.
    // 필드가 없는 문서가 제외되는 문제를 방지하기 위함입니다.
    const q = query(collection(db, "maintenance_schedule"));
    const snap = await getDocs(q);
    
    allTasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    // 기본 정렬: 다음 예정일(Next Due) 오름차순 (임박한 순서)
    allTasks.sort((a, b) => {
        const dateA = a.nextDueDate || a.nextDue || "9999-99-99";
        const dateB = b.nextDueDate || b.nextDue || "9999-99-99";
        return dateA.localeCompare(dateB);
    });

    renderTableAndList();

  } catch (err) {
    console.error("🚨 Firestore Load Error:", err);
    if(tableBody) tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#E74C3C;">ERROR LOADING DATA</td></tr>`;
  } finally {
    if(btnRefresh) {
        btnRefresh.disabled = false;
        btnRefresh.textContent = "REFRESH";
    }
  }
}

// ========================================
// 🎨 Status Helpers
// ========================================
function getStatusInfo(status, dueDate) {
  const today = new Date().toISOString().slice(0, 10);
  
  if (status === 'done') {
    return { label: "DONE", color: "#166534", bg: "#DCFCE7", border: "#166534" };
  }
  
  if (dueDate && dueDate < today) {
    return { label: "OVERDUE", color: "#991B1B", bg: "#FEE2E2", border: "#991B1B" };
  }
  
  return { label: "UPCOMING", color: "#0369A1", bg: "#E0F2FE", border: "#0369A1" };
}

// ========================================
// 📋 Render Logic
// ========================================
function renderTableAndList() {
  const bVal = buildingFilter ? buildingFilter.value : "";
  const sVal = statusFilter ? statusFilter.value : "";
  const today = new Date().toISOString().slice(0, 10);

  const filtered = allTasks.filter(t => {
    // 🔹 호환성: nextDueDate 또는 nextDue 사용
    const dueDate = t.nextDueDate || t.nextDue;

    if (bVal && t.building !== bVal) return false;
    
    if (sVal) {
        const isDone = t.status === 'done';
        const isOverdue = dueDate && dueDate < today && !isDone;
        const isUpcoming = dueDate && dueDate >= today && !isDone;

        if (sVal === 'done' && !isDone) return false;
        if (sFilter === 'overdue' && !isOverdue) return false;
        if (sFilter === 'upcoming' && !isUpcoming) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    if(tableBody) tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:#64748B;">NO TASKS FOUND</td></tr>`;
    if(mobileList) mobileList.innerHTML = `<div style="text-align:center; padding:40px; color:#64748B; border:1px dashed #CBD5E1;">NO TASKS FOUND</div>`;
    return;
  }

  // 1. Desktop Table
  if (tableBody) {
      tableBody.innerHTML = filtered.map((t) => {
        const dueDate = t.nextDueDate || t.nextDue;
        const lastDate = t.lastDoneDate || t.lastDone;
        const statusInfo = getStatusInfo(t.status, dueDate);
        
        return `
            <tr>
              <td style="font-weight:600;">${t.building || "-"}</td>
              <td>${t.room || "-"}</td>
              <td>${t.taskName || "-"}</td>
              <td><span style="color:${statusInfo.color}; font-weight:700; font-size:0.8rem;">${statusInfo.label}</span></td>
              <td>${dueDate || "-"}</td>
              <td style="color:#64748B;">${lastDate || '-'}</td>
              <td style="font-size:0.8rem; color:#64748B; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.note || "-"}</td>
              <td>
                ${
                  t.photoUrl
                    ? `<button class="btn-sm" style="background:#f1f5f9; color:#1e3a8a; border:1px solid #cbd5e1; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="openPhotoModal('${t.photoUrl}')">VIEW</button>`
                    : `<span style="color:#cbd5e1; font-size:0.8rem;">-</span>`
                }
              </td>
              <td style="display:flex; gap:4px; justify-content:center;">
                <button class="btn-sm" style="background:#bfdbfe; color:#1e3a8a; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="openEditModal('${t.id}')">EDIT</button>
                <button class="btn-sm" style="background:#fecaca; color:#7f1d1d; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="deleteTask('${t.id}')">DEL</button>
              </td>
            </tr>
          `;
      }).join('');
  }

  // 2. Mobile List
  if (mobileList) {
      mobileList.innerHTML = filtered.map((t) => {
        const dueDate = t.nextDueDate || t.nextDue;
        const lastDate = t.lastDoneDate || t.lastDone;
        const statusInfo = getStatusInfo(t.status, dueDate);

        return `
            <div class="ml-card" style="background:#fff; border:1px solid #e0e0e0; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="margin:0; font-size:1rem; font-weight:700; color:#2C3E50;">${t.taskName || "Task"}</h3>
                        <div style="font-size:0.85rem; color:#64748B; margin-top:4px;">${t.building || "-"} ${t.room || ""}</div>
                    </div>
                    <span style="color:${statusInfo.color}; font-weight:700; font-size:0.75rem; border:1px solid ${statusInfo.border}; background:${statusInfo.bg}; padding:2px 6px;">
                        ${statusInfo.label}
                    </span>
                </div>
                <div class="ml-meta" style="margin-top:12px; font-size:0.85rem; color:#475569; line-height:1.5;">
                    <div><b>DUE:</b> ${dueDate || "-"}</div>
                    <div><b>LAST:</b> ${lastDate || "-"}</div>
                </div>
                <div class="ml-actions" style="margin-top:12px; display:flex; justify-content:flex-end; gap:8px;">
                    ${
                      t.photoUrl
                        ? `<button style="background:#f1f5f9; color:#1e3a8a; border:1px solid #cbd5e1; padding:6px 12px; border-radius:4px; font-weight:600; cursor:pointer;" onclick="openPhotoModal('${t.photoUrl}')">PHOTO</button>`
                        : ``
                    }
                    <button style="background:#bfdbfe; color:#1e3a8a; border:none; padding:6px 12px; border-radius:4px; font-weight:600; cursor:pointer;" onclick="openEditModal('${t.id}')">EDIT</button>
                    <button style="background:#fecaca; color:#7f1d1d; border:none; padding:6px 12px; border-radius:4px; font-weight:600; cursor:pointer;" onclick="deleteTask('${t.id}')">DEL</button>
                </div>
            </div>
        `;
      }).join('');
  }
}

// ========================================
// ✏️ Edit Modal (Dynamic Creation)
// ========================================
window.openEditModal = (id) => {
  const t = allTasks.find((x) => x.id === id);
  if (!t) return;

  const existing = document.getElementById('editModalDynamic');
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = 'editModalDynamic';
  modal.className = "modal-bg";
  modal.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:9999;";
  
  modal.innerHTML = `
    <div style="width:90%; max-width:480px; background:#fff; padding:24px; border-radius:0px; border:1px solid #CBD5E1; box-shadow:0 10px 40px rgba(0,0,0,0.2);">
      <h3 style="font-weight:800; font-size:1.2rem; margin:0 0 16px 0; color:#2C3E50; border-bottom:2px solid #2C3E50; padding-bottom:8px;">EDIT TASK</h3>
      
      <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:4px;">TASK NAME</label>
      <input id="editTaskName" style="width:100%; padding:10px; border:1px solid #CBD5E1; margin-bottom:12px;" value="${t.taskName || ""}" />
      
      <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:4px;">CYCLE (MONTHS)</label>
      <input id="editCycle" type="number" style="width:100%; padding:10px; border:1px solid #CBD5E1; margin-bottom:12px;" value="${t.cycleMonths || 0}" />
      
      <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:4px;">DUE DATE</label>
      <input id="editNextDue" type="date" style="width:100%; padding:10px; border:1px solid #CBD5E1; margin-bottom:12px;" value="${t.nextDueDate || t.nextDue || ""}" />

      <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:4px;">NOTE</label>
      <textarea id="editNote" style="width:100%; height:80px; padding:10px; border:1px solid #CBD5E1; resize:vertical;">${t.note || ""}</textarea>
      
      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:20px;">
        <button id="btnEditCancel" style="background:transparent; border:1px solid #CBD5E1; padding:10px 20px; cursor:pointer; font-weight:600;">CANCEL</button>
        <button id="btnEditSave" style="background:#2C3E50; color:#fff; border:none; padding:10px 20px; cursor:pointer; font-weight:600;">SAVE</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("btnEditCancel").onclick = () => modal.remove();
  
  document.getElementById("btnEditSave").onclick = async () => {
    const newTaskName = document.getElementById("editTaskName").value.trim();
    const newCycle = Number(document.getElementById("editCycle").value);
    const newNextDue = document.getElementById("editNextDue").value;
    const newNote = document.getElementById("editNote").value.trim();

    if (!newTaskName) return alert("Task name is required.");

    try {
      const docRef = doc(db, "maintenance_schedule", id);
      await updateDoc(docRef, {
        taskName: newTaskName,
        cycleMonths: newCycle,
        nextDueDate: newNextDue, // Ensure this field is updated
        note: newNote,
      });
      alert("✅ Task updated.");
      modal.remove();
      loadTasks();
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating task.");
    }
  };
};

// ========================================
// ❌ Delete Task
// ========================================
window.deleteTask = async (id) => {
  if (!confirm("Are you sure you want to delete this task? (삭제하시겠습니까?)")) return;
  try {
    await deleteDoc(doc(db, "maintenance_schedule", id));
    alert("🗑️ Task deleted.");
    loadTasks();
  } catch (err) {
    console.error("Delete error:", err);
    alert("Error deleting task.");
  }
};

// ========================================
// 🖼 Photo Modal
// ========================================
window.openPhotoModal = (url) => {
  if (!url) return;
  if(photoImg) photoImg.src = url;
  if(photoModal) photoModal.style.display = "flex";
};

if(btnPhotoClose) {
    btnPhotoClose.addEventListener('click', () => {
        if(photoModal) photoModal.style.display = "none";
    });
}

// Close photo modal on background click
if(photoModal) {
    photoModal.addEventListener('click', (e) => {
        if(e.target === photoModal) photoModal.style.display = "none";
    });
}

// ========================================
// 🔍 Listeners
// ========================================
if (buildingFilter) buildingFilter.addEventListener("change", renderTableAndList);
if (statusFilter) statusFilter.addEventListener("change", renderTableAndList);
if (btnRefresh) {
  btnRefresh.addEventListener("click", () => {
    loadTasks();
  });
}
if (btnBack) {
    btnBack.addEventListener("click", () => {
        location.href = "schedule_dashboard.html";
    });
}