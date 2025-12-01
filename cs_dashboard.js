// ========================================
// 🛡️ HARU CS & Issue Tracker Logic (Updated)
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
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// ✅ [추가됨] Storage 관련 함수 Import
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase Init
const firebaseConfig = JSON.parse(window.__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // ✅ [추가됨] 스토리지 초기화

// DOM Elements
const pendingList = document.getElementById("pendingList");
const resolvedList = document.getElementById("resolvedList");
const modal = document.getElementById("issueModal");
const btnNew = document.getElementById("btnNewIssue");
const btnClose = document.getElementById("btnCloseModal");
const btnSave = document.getElementById("btnSaveIssue");
const btnDelete = document.getElementById("btnDeleteIssue");

// Form Inputs
const typeBtns = document.querySelectorAll(".type-btn");
const formBuilding = document.getElementById("formBuilding");
const formRoom = document.getElementById("formRoom");
// HTML에 formCustomer가 있다면 아래 주석 해제하여 사용 권장 (현재 JS엔 빠져있어 추가하지 않음)
const formCustomer = document.getElementById("formCustomer"); 
const formRating = document.getElementById("formRating");
const ratingGroup = document.getElementById("ratingGroup");
const formCleaner = document.getElementById("formCleaner");
const formContent = document.getElementById("formContent");
const formAction = document.getElementById("formAction");
const formPhoto = document.getElementById("formPhoto"); // ✅ [추가됨] 사진 Input

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

// ✅ [추가됨] 사진 확대 모달 제어용 전역 함수 (모듈 스코프 탈출)
window.openZoom = function(url) {
  const zoomImg = document.getElementById("zoomImg");
  const photoModal = document.getElementById("photoModal");
  if(zoomImg && photoModal) {
    zoomImg.src = url;
    photoModal.style.display = 'flex';
  }
};

// ========================================
// 🛠 Functions
// ========================================

function createIssueCard(id, data) {
  const div = document.createElement("div");
  div.className = `issue-card ${data.status}`;
  // 주의: 사진 클릭 시에는 부모의 onclick(수정 모달 열기)이 실행되지 않도록 이벤트 버블링을 막아야 함
  div.onclick = (e) => {
      // 이미지를 클릭한 게 아닐 때만 수정 모달 열기
      if(e.target.tagName !== 'IMG') {
          openModal(id, data);
      }
  };

  // 소스 뱃지 & 평점 표시
  let sourceBadge = "";
  if (data.source === "airbnb") {
    const stars = "⭐".repeat(data.rating || 5);
    sourceBadge = `<span class="card-source airbnb">AIRBNB</span> <span class="rating-star">${stars}</span>`;
  } else {
    sourceBadge = `<span class="card-source direct">DIRECT</span>`;
  }

  const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "-";

  // 조치 내용 표시
  let actionHtml = "";
  if (data.actionTaken) {
    actionHtml = `<div style="margin-top:10px; padding:10px; background:#F1F5F9; font-size:0.9rem; color:#475569;">
      <strong>💡 조치:</strong> ${data.actionTaken}
    </div>`;
  }

  // ✅ [추가됨] 사진 미리보기 HTML 생성
  let photoHtml = "";
  if (data.photoUrl) {
    photoHtml = `
      <img src="${data.photoUrl}" class="card-photo-preview" 
           alt="증빙사진" 
           style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #E2E8F0; margin-top:10px; cursor:pointer;"
           onclick="window.openZoom('${data.photoUrl}');">
    `;
  }

  // 고객명 표시 (데이터에 있다면)
  const customerHtml = data.customer ? `<span class="card-customer" style="margin-left:8px; color:#2C3E50; font-weight:700;">${data.customer}</span>` : "";

  div.innerHTML = `
    <div class="card-header">
      <span class="card-location">${data.building} · ${data.room} ${customerHtml}</span>
      <div>${sourceBadge}</div>
    </div>
    <div class="card-content">
      "${data.content}"
    </div>
    ${photoHtml}
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
  
  // 파일 입력 초기화 (항상)
  if(formPhoto) formPhoto.value = "";

  if (data) {
    // Edit Mode
    currentType = data.source;
    updateTypeButtons();
    
    formBuilding.value = data.building;
    formRoom.value = data.room;
    if(formCustomer) formCustomer.value = data.customer || ""; // 고객명 연동
    formRating.value = data.rating || 5;
    formCleaner.value = data.cleaner || "";
    formContent.value = data.content;
    formAction.value = data.actionTaken || "";
    
    if (btnDelete) btnDelete.style.display = "block";

  } else {
    // New Mode
    currentType = "airbnb";
    updateTypeButtons();
    formBuilding.value = "아라키초A";
    formRoom.value = "";
    if(formCustomer) formCustomer.value = "";
    formRating.value = 5;
    formCleaner.value = "";
    formContent.value = "";
    formAction.value = "";
    
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

// ✅ [추가됨] 이미지 업로드 헬퍼 함수
async function uploadImage(file) {
    try {
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `cs_photos/${fileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error("Upload failed:", error);
        throw error;
    }
}

async function saveIssue() {
  const building = formBuilding.value;
  const room = formRoom.value.trim();
  const content = formContent.value.trim();
  const cleaner = formCleaner.value.trim();
  const action = formAction.value.trim();
  const customer = formCustomer ? formCustomer.value.trim() : "";
  const photoFile = formPhoto ? formPhoto.files[0] : null; // 파일 가져오기
  
  if (!room || !content) {
    alert("호수와 내용을 입력해주세요.");
    return;
  }

  // 저장 중 표시 (버튼 비활성화)
  btnSave.innerText = "저장 중...";
  btnSave.disabled = true;

  try {
    // ✅ [추가됨] 사진 업로드 로직
    let photoUrl = null;
    if (photoFile) {
        photoUrl = await uploadImage(photoFile);
    }

    const status = action ? "resolved" : "pending";

    const payload = {
      source: currentType,
      building,
      room,
      customer, // 고객명 추가
      content,
      cleaner,
      actionTaken: action,
      status: status,
      rating: (currentType === "airbnb") ? parseInt(formRating.value) : null,
      updatedAt: serverTimestamp()
    };

    // 사진이 새로 업로드된 경우에만 payload에 추가
    if (photoUrl) {
        payload.photoUrl = photoUrl;
    }

    if (editingId) {
      // Update
      // 주의: 수정 시 사진을 새로 안 올리면 기존 photoUrl 유지됨 (Firestore 특성)
      await updateDoc(doc(db, "cs_issues", editingId), payload);
      alert("수정되었습니다.");
    } else {
      // Create
      payload.timestamp = serverTimestamp();
      await addDoc(collection(db, "cs_issues"), payload);
      alert("등록되었습니다.");
    }
    closeModal();
  } catch (e) {
    console.error("Error saving issue:", e);
    alert("저장 중 오류가 발생했습니다: " + e.message);
  } finally {
    // 버튼 복구
    btnSave.innerText = "저장하기";
    btnSave.disabled = false;
  }
}

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