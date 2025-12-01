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
const storage = getStorage(app); 

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
const formCustomer = document.getElementById("formCustomer"); 
const formRating = document.getElementById("formRating");
const ratingGroup = document.getElementById("ratingGroup");
const formCleaner = document.getElementById("formCleaner");
const formContent = document.getElementById("formContent");
const formAction = document.getElementById("formAction");
const formPhoto = document.getElementById("formPhoto");

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
    
    updateRatingOptions(currentType);
    
    if (currentType === "airbnb" || currentType === "booking") {
      ratingGroup.style.display = "block";
    } else {
      ratingGroup.style.display = "none";
    }
  });
});

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

function updateRatingOptions(type) {
  formRating.innerHTML = ""; 

  if (type === "booking") {
    // Booking.com: 1~10점
    formRating.innerHTML = `
      <option value="1">⭐ 1점 (매우 나쁨)</option>
      <option value="2">⭐ 2점</option>
      <option value="3">⭐ 3점</option>
      <option value="4">⭐ 4점</option>
      <option value="5">⭐ 5점</option>
      <option value="6">⭐ 6점</option>
      <option value="7">⭐ 7점</option>
      <option value="8">⭐ 8점</option>
      <option value="9">⭐ 9점</option>
      <option value="10">⭐ 10점 (최고)</option>
    `;
  } else {
    // Airbnb (기본): 1~5점
    formRating.innerHTML = `
      <option value="1">⭐ 1점 (심각)</option>
      <option value="2">⭐⭐ 2점 (나쁨)</option>
      <option value="3">⭐⭐⭐ 3점 (보통)</option>
      <option value="4">⭐⭐⭐⭐ 4점 (좋음)</option>
      <option value="5">⭐⭐⭐⭐⭐ 5점 (완벽)</option>
    `;
  }
}

function createIssueCard(id, data) {
  const div = document.createElement("div");
  div.className = `issue-card ${data.status}`;
  
  div.onclick = (e) => {
      if(e.target.tagName !== 'IMG') {
          openModal(id, data);
      }
  };

  let sourceBadge = "";
  if (data.source === "airbnb" || data.source === "booking") {
    const stars = "⭐".repeat(data.rating || 0);
    const label = data.source === "airbnb" ? "AIRBNB" : "BOOKING";
    sourceBadge = `<span class="card-source ${data.source}">${label}</span> <span class="rating-star">${stars}</span>`;
  } else {
    sourceBadge = `<span class="card-source direct">DIRECT</span>`;
  }

  const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "-";

  let actionHtml = "";
  if (data.actionTaken) {
    actionHtml = `<div style="margin-top:10px; padding:10px; background:#F1F5F9; font-size:0.9rem; color:#475569;">
      <strong>💡 조치:</strong> ${data.actionTaken}
    </div>`;
  }

  let photoHtml = "";
  if (data.photoUrl) {
    photoHtml = `
      <img src="${data.photoUrl}" class="card-photo-preview" 
           alt="증빙사진" 
           style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #E2E8F0; margin-top:10px; cursor:pointer;"
           onclick="window.openZoom('${data.photoUrl}');">
    `;
  }

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
  
  if(formPhoto) formPhoto.value = "";

  if (data) {
    currentType = data.source;
    updateTypeButtons();
    updateRatingOptions(currentType); 
    
    formBuilding.value = data.building;
    formRoom.value = data.room;
    if(formCustomer) formCustomer.value = data.customer || "";
    formRating.value = data.rating || 5;
    formCleaner.value = data.cleaner || "";
    formContent.value = data.content;
    formAction.value = data.actionTaken || "";
    
    if (btnDelete) btnDelete.style.display = "block";

  } else {
    currentType = "airbnb";
    updateTypeButtons();
    updateRatingOptions(currentType);
    
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
  ratingGroup.style.display = (currentType === "airbnb" || currentType === "booking") ? "block" : "none";
}

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
  const photoFile = formPhoto ? formPhoto.files[0] : null;
  
  if (!room || !content) {
    alert("호수와 내용을 입력해주세요.");
    return;
  }

  // ✅ [중요 수정] 현재 로그인한 사용자 정보 가져오기
  const currentUser = auth.currentUser;
  if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
  }

  btnSave.innerText = "저장 중...";
  btnSave.disabled = true;

  try {
    let photoUrl = null;
    if (photoFile) {
        photoUrl = await uploadImage(photoFile);
    }

    const status = action ? "resolved" : "pending";

    const payload = {
      source: currentType,
      building,
      room,
      customer,
      content,
      cleaner,
      actionTaken: action,
      status: status,
      rating: (currentType === "airbnb" || currentType === "booking") ? parseInt(formRating.value) : null,
      updatedAt: serverTimestamp(),
      
      // ✅ [필수 추가] 보안 규칙(isOwner)을 통과하기 위한 작성자 정보
      uid: currentUser.uid,
      authorEmail: currentUser.email
    };

    if (photoUrl) {
        payload.photoUrl = photoUrl;
    }

    if (editingId) {
      await updateDoc(doc(db, "cs_issues", editingId), payload);
      alert("수정되었습니다.");
    } else {
      payload.timestamp = serverTimestamp();
      await addDoc(collection(db, "cs_issues"), payload);
      alert("등록되었습니다.");
    }
    closeModal();
  } catch (e) {
    console.error("Error saving issue:", e);
    // 보안 규칙 위반 시 알림 명확화
    if (e.code === 'permission-denied') {
        alert("수정 권한이 없습니다. (본인이 작성한 글만 수정 가능)");
    } else {
        alert("저장 중 오류가 발생했습니다: " + e.message);
    }
  } finally {
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
    if (e.code === 'permission-denied') {
        alert("삭제 권한이 없습니다. (본인이 작성한 글만 삭제 가능)");
    } else {
        alert("삭제 중 오류가 발생했습니다.");
    }
  }
}