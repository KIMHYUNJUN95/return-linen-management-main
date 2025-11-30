// ========================================
// 🛡️ HARU CS & Issue Tracker Logic
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc, // ✅ 삭제 함수 추가됨
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Init
const firebaseConfig = JSON.parse(window.__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const pendingList = document.getElementById("pendingList");
const resolvedList = document.getElementById("resolvedList");
const modal = document.getElementById("issueModal");
const btnNew = document.getElementById("btnNewIssue");
const btnClose = document.getElementById("btnCloseModal");
const btnSave = document.getElementById("btnSaveIssue");
const btnDelete = document.getElementById("btnDeleteIssue"); // ✅ 삭제 버튼

// Form Inputs
const typeBtns = document.querySelectorAll(".type-btn");
const formBuilding = document.getElementById("formBuilding");
const formRoom = document.getElementById("formRoom");
const formRating = document.getElementById("formRating");
const ratingGroup = document.getElementById("ratingGroup");
const formCleaner = document.getElementById("formCleaner");
const formContent = document.getElementById("formContent");
const formAction = document.getElementById("formAction");

let currentType = "airbnb"; // default
let editingId = null; // 수정 시 ID 저장

// ========================================
// 🚀 Initialization & Listeners
// ========================================

// 1. Load Data (Real-time)
const q = query(collection(db, "cs_issues"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
  pendingList.innerHTML = "";
  resolvedList.innerHTML = "";

  if (snapshot.empty) {
    pendingList.innerHTML = `<div style="text-align:center; padding:20px; color:#94A3B8;">현재 미조치된 이슈가 없습니다. 👍</div>`;
    return;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const card = createIssueCard(id, data);

    if (data.status === "resolved") {
      resolvedList.appendChild(card);
    } else {
      pendingList.appendChild(card);
    }
  });
});

// 2. Event Listeners
btnNew.addEventListener("click", () => openModal());
btnClose.addEventListener("click", () => closeModal());
btnSave.addEventListener("click", saveIssue);

// ✅ 삭제 버튼 이벤트 리스너
if (btnDelete) {
  btnDelete.addEventListener("click", deleteIssue);
}

// Type Toggle Logic
typeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    typeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentType = btn.dataset.value;
    
    // Airbnb가 아니면 별점 숨김
    if (currentType === "airbnb") {
      ratingGroup.style.display = "block";
    } else {
      ratingGroup.style.display = "none";
    }
  });
});

// ========================================
// 🛠 Functions
// ========================================

function createIssueCard(id, data) {
  const div = document.createElement("div");
  div.className = `issue-card ${data.status}`;
  div.onclick = () => openModal(id, data); // 카드 클릭 시 수정 모드

  // 소스 뱃지 & 평점 표시
  let sourceBadge = "";
  if (data.source === "airbnb") {
    const stars = "⭐".repeat(data.rating);
    sourceBadge = `<span class="card-source airbnb">AIRBNB</span> <span class="rating-star">${stars}</span>`;
  } else {
    sourceBadge = `<span class="card-source direct">DIRECT</span>`;
  }

  const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "-";

  // 조치 내용이 있으면 표시
  let actionHtml = "";
  if (data.actionTaken) {
    actionHtml = `<div style="margin-top:10px; padding:10px; background:#F1F5F9; font-size:0.9rem; color:#475569;">
      <strong>💡 조치:</strong> ${data.actionTaken}
    </div>`;
  }

  div.innerHTML = `
    <div class="card-header">
      <span class="card-location">${data.building} · ${data.room}</span>
      <div>${sourceBadge}</div>
    </div>
    <div class="card-content">
      "${data.content}"
    </div>
    ${actionHtml}
    <div class="card-meta">
      <span>📅 ${dateStr}</span>
      <span class="cleaner-info">🧹 ${data.cleaner || "담당자 미정"}</span>
    </div>
  `;
  return div;
}

function openModal(id = null, data = null) {
  editingId = id;
  
  if (data) {
    // Edit Mode (수정 모드)
    currentType = data.source;
    updateTypeButtons();
    
    formBuilding.value = data.building;
    formRoom.value = data.room;
    formRating.value = data.rating || 5;
    formCleaner.value = data.cleaner || "";
    formContent.value = data.content;
    formAction.value = data.actionTaken || "";
    
    // ✅ 삭제 버튼 보이기 (수정 모드일 때만)
    if (btnDelete) btnDelete.style.display = "block";

  } else {
    // New Mode (신규 등록 모드)
    currentType = "airbnb";
    updateTypeButtons();
    formBuilding.value = "아라키초A";
    formRoom.value = "";
    formRating.value = 5;
    formCleaner.value = "";
    formContent.value = "";
    formAction.value = "";
    
    // ✅ 삭제 버튼 숨기기 (새로 만들 땐 삭제할 게 없으니까)
    if (btnDelete) btnDelete.style.display = "none";
  }
  
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
  editingId = null;
}

function updateTypeButtons() {
  typeBtns.forEach(btn => {
    if(btn.dataset.value === currentType) btn.classList.add("active");
    else btn.classList.remove("active");
  });
  ratingGroup.style.display = (currentType === "airbnb") ? "block" : "none";
}

async function saveIssue() {
  const building = formBuilding.value;
  const room = formRoom.value.trim();
  const content = formContent.value.trim();
  const cleaner = formCleaner.value.trim();
  const action = formAction.value.trim();
  
  if (!room || !content) {
    alert("호수와 내용을 입력해주세요.");
    return;
  }

  // 조치 내용(action)이 있으면 'resolved', 없으면 'pending'으로 상태 자동 결정
  const status = action ? "resolved" : "pending";

  const payload = {
    source: currentType,
    building,
    room,
    content,
    cleaner,
    actionTaken: action,
    status: status,
    rating: (currentType === "airbnb") ? parseInt(formRating.value) : null,
    updatedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      // Update
      await updateDoc(doc(db, "cs_issues", editingId), payload);
      alert("수정되었습니다.");
    } else {
      // Create
      payload.timestamp = serverTimestamp(); // 생성 시에만 타임스탬프 추가
      await addDoc(collection(db, "cs_issues"), payload);
      alert("등록되었습니다.");
    }
    closeModal();
  } catch (e) {
    console.error("Error saving issue:", e);
    alert("저장 중 오류가 발생했습니다.");
  }
}

// ✅ 삭제 기능 함수
async function deleteIssue() {
  if (!editingId) return;
  
  if (!confirm("정말로 이 기록을 삭제하시겠습니까? (복구 불가)")) return;

  try {
    await deleteDoc(doc(db, "cs_issues", editingId));
    alert("삭제되었습니다.");
    closeModal();
  } catch (e) {
    console.error("Error deleting issue:", e);
    alert("삭제 중 오류가 발생했습니다.");
  }
}