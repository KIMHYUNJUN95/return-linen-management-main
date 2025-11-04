// ========================================
// 📊 HARU 전체 작업 현황 (정렬개선 + 수정/삭제 + 사진 미리보기)
// ========================================

import { db } from "./storage.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ========================================
   📦 요소 참조
======================================== */
const buildingFilter = document.getElementById("buildingFilter");
const statusFilter = document.getElementById("statusFilter");
const tableBody = document.getElementById("taskTableBody");
const mobileList = document.getElementById("mobileList");
const btnRefresh = document.getElementById("btnRefresh");

let allTasks = [];
let editingTask = null;

/* ========================================
   🔄 데이터 불러오기
======================================== */
async function loadTasks() {
  try {
    const q = query(collection(db, "maintenance_schedule"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    allTasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTable();
  } catch (err) {
    console.error("🚨 Firestore 로드 오류:", err);
    tableBody.innerHTML = `<tr><td colspan="9">데이터를 불러오지 못했습니다.</td></tr>`;
  }
}

/* ========================================
   🎨 상태 라벨 / 색상
======================================== */
function statusBadge(status) {
  switch (status) {
    case "done":
      return `<span class="badge b-done">완료</span>`;
    case "overdue":
    case "delayed":
      return `<span class="badge b-overdue">지연</span>`;
    case "progress":
      return `<span class="badge b-progress">진행중</span>`;
    default:
      return `<span class="badge b-upcoming">예정</span>`;
  }
}

/* ========================================
   📋 테이블 + 모바일 렌더링
======================================== */
function renderTable() {
  const bVal = buildingFilter.value;
  const sVal = statusFilter.value;

  let filtered = allTasks;
  if (bVal) filtered = filtered.filter((t) => t.building === bVal);
  if (sVal) filtered = filtered.filter((t) => t.status === sVal);

  // 테이블 렌더링
  tableBody.innerHTML = "";
  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="9">해당 조건의 데이터가 없습니다.</td></tr>`;
  } else {
    filtered.forEach((t) => {
      const tr = document.createElement("tr");
      tr.style.textAlign = "center";
      tr.innerHTML = `
        <td>${t.building || "-"}</td>
        <td>${t.room || "-"}</td>
        <td>${t.taskName || "-"}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${t.startDate || "-"}</td>
        <td>${t.nextDue || "-"}</td>
        <td>${t.note || "-"}</td>
        <td>
          ${
            t.photoUrl
              ? `<button class="btn-sm btn-photo" data-url="${t.photoUrl}">사진보기</button>`
              : `<button class="btn-sm btn-photo" disabled style="opacity:0.5;">사진없음</button>`
          }
        </td>
        <td>
          <button class="btn-sm btn-edit" data-id="${t.id}">수정</button>
          <button class="btn-sm btn-del" data-id="${t.id}">삭제</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // 모바일 카드
  mobileList.innerHTML = "";
  filtered.forEach((t) => {
    const div = document.createElement("div");
    div.className = "ml-card";
    div.innerHTML = `
      <div class="ml-top">
        <h3>${t.taskName || "작업"}</h3>
        ${statusBadge(t.status)}
      </div>
      <div class="ml-meta">
        <b>건물:</b> ${t.building || "-"}<br>
        <b>객실:</b> ${t.room || "-"}<br>
        <b>작업일:</b> ${t.startDate || "-"}<br>
        <b>다음주기:</b> ${t.nextDue || "-"}<br>
        <b>비고:</b> ${t.note || "-"}
      </div>
      <div class="ml-actions">
        ${
          t.photoUrl
            ? `<button class="btn-sm btn-photo" data-url="${t.photoUrl}">사진보기</button>`
            : `<button class="btn-sm btn-photo" disabled style="opacity:0.5;">사진없음</button>`
        }
        <button class="btn-sm btn-edit" data-id="${t.id}">수정</button>
        <button class="btn-sm btn-del" data-id="${t.id}">삭제</button>
      </div>
    `;
    mobileList.appendChild(div);
  });

  // 이벤트 연결
  document.querySelectorAll(".btn-edit").forEach((b) =>
    b.addEventListener("click", (e) => openEditModal(e.target.dataset.id))
  );
  document.querySelectorAll(".btn-del").forEach((b) =>
    b.addEventListener("click", (e) => deleteTask(e.target.dataset.id))
  );
  document.querySelectorAll(".btn-photo").forEach((b) =>
    b.addEventListener("click", (e) => openPhotoModal(e.target.dataset.url))
  );
}

/* ========================================
   ✏️ 수정 모달
======================================== */
function openEditModal(id) {
  const t = allTasks.find((x) => x.id === id);
  if (!t) return;

  const modal = document.createElement("div");
  modal.className = "modal-bg";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:480px;background:#fff;color:#111;padding:20px;border-radius:12px;">
      <h3 style="font-weight:800;font-size:18px;margin-bottom:10px;">작업 수정</h3>
      <label>작업명</label>
      <input id="editTaskName" class="form-input" value="${t.taskName || ""}" />
      <label style="margin-top:10px;">주기 (개월)</label>
      <input id="editCycle" type="number" class="form-input" value="${t.cycleMonths || 0}" />
      <label style="margin-top:10px;">비고</label>
      <textarea id="editNote" class="form-textarea">${t.note || ""}</textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button id="btnEditCancel" class="btn btn-ghost">취소</button>
        <button id="btnEditSave" class="btn btn-primary">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = "flex";

  document.getElementById("btnEditCancel").onclick = () => modal.remove();
  document.getElementById("btnEditSave").onclick = async () => {
    const newTaskName = document.getElementById("editTaskName").value.trim();
    const newCycle = Number(document.getElementById("editCycle").value);
    const newNote = document.getElementById("editNote").value.trim();

    if (!newTaskName) return alert("작업명을 입력해주세요.");

    try {
      const docRef = doc(db, "maintenance_schedule", id);
      await updateDoc(docRef, {
        taskName: newTaskName,
        cycleMonths: newCycle,
        note: newNote,
      });
      alert("✅ 수정되었습니다.");
      modal.remove();
      loadTasks();
    } catch (err) {
      console.error("수정 오류:", err);
      alert("수정 중 오류가 발생했습니다.");
    }
  };
}

/* ========================================
   ❌ 삭제
======================================== */
async function deleteTask(id) {
  if (!confirm("정말로 삭제하시겠습니까?")) return;
  try {
    await deleteDoc(doc(db, "maintenance_schedule", id));
    alert("🗑️ 삭제되었습니다.");
    loadTasks();
  } catch (err) {
    console.error("삭제 오류:", err);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

/* ========================================
   🖼 사진 미리보기 모달
======================================== */
function openPhotoModal(url) {
  if (!url) return;
  const modal = document.createElement("div");
  modal.className = "modal-bg";
  modal.innerHTML = `
    <div class="modal-card photo-card" style="max-width:600px;background:#fff;color:#111;padding:20px;border-radius:12px;">
      <h3 style="font-weight:800;font-size:18px;margin-bottom:10px;">사진 미리보기</h3>
      <img src="${url}" alt="작업 사진" style="width:100%;border-radius:12px;margin-bottom:12px;">
      <div style="text-align:right;">
        <a href="${url}" target="_blank" class="btn btn-primary">원본 열기</a>
        <button class="btn btn-ghost" id="btnPhotoClose">닫기</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = "flex";
  document.getElementById("btnPhotoClose").onclick = () => modal.remove();
}

/* ========================================
   🔍 필터 / 새로고침
======================================== */
if (buildingFilter) buildingFilter.addEventListener("change", renderTable);
if (statusFilter) statusFilter.addEventListener("change", renderTable);
if (btnRefresh) {
  btnRefresh.addEventListener("click", async () => {
    btnRefresh.disabled = true;
    btnRefresh.textContent = "불러오는 중...";
    await loadTasks();
    btnRefresh.textContent = "새로고침";
    btnRefresh.disabled = false;
  });
}

/* ========================================
   🚀 초기 실행
======================================== */
loadTasks();
