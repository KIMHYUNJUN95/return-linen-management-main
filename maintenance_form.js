// ========================================
// 🛠️ HARU Maintenance Form Controller
// Design System: Tokyo Day Bright
// ========================================

// ✅ [수정됨] storage.js에서 통합된 객체 가져오기 (중복 초기화 방지)
import { db, auth, storage } from "./storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 1. 헤더 로드 (보조)
document.addEventListener("DOMContentLoaded", () => {
    // HTML 내의 스크립트가 헤더를 로드하므로 여기서는 콘솔 로그만
    console.log("Maintenance Form Loaded");
});

/* ========== DOM Elements ========== */
const form = document.getElementById("maintenanceForm");
const photoInput = document.getElementById("photo");
const preview = document.getElementById("photoPreview");
const buildingEl = document.getElementById("building");
const roomEl = document.getElementById("room");
const statusEl = document.getElementById("status");
const descEl = document.getElementById("description");
const repairEl = document.getElementById("repairMethod"); // 🔧 보수방법 필드
const submitBtn = document.getElementById("submitBtn");
const titleEl = document.getElementById("formTitle");

/* ========== Edit Mode Check ========== */
const urlParams = new URLSearchParams(location.search);
const editId = urlParams.get("edit");
let existingPhotos = [];

/* ========== Load Data for Edit ========== */
if (editId) {
    (async function loadForEdit() {
        if (titleEl) titleEl.textContent = "EDIT MAINTENANCE (유지보수 수정)";
        if (submitBtn) submitBtn.textContent = "UPDATE (수정 저장)";

        try {
            const snap = await getDoc(doc(db, "maintenance", editId));
            if (!snap.exists()) {
                alert("Data not found.");
                location.href = "maintenance_list.html";
                return;
            }

            const d = snap.data();
            if (buildingEl) buildingEl.value = d.building || "";
            if (roomEl) roomEl.value = d.room || "";
            if (statusEl) statusEl.value = d.status || "접수됨";
            
            // DB field compatibility
            if (descEl) descEl.value = d.issue || d.description || d.desc || "";
            
            // 🔧 Load Repair Method
            if (repairEl) repairEl.value = d.repairMethod || ""; 

            // Image handling
            existingPhotos = Array.isArray(d.imageUrls) && d.imageUrls.length
                ? d.imageUrls
                : d.photoURL ? [d.photoURL] : d.photos || [];

            // Preview existing photos
            preview.innerHTML = existingPhotos.map(url => 
                `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border:1px solid #E2E8F0;margin-right:8px;">`
            ).join("");

        } catch (e) {
            console.error("Load error:", e);
        }
    })();
}

/* ========== Upload Helper ========== */
async function uploadPhotos(files) {
  const urls = [];
  for (const file of files) {
    const storageRef = ref(storage, `maintenance/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    urls.push(await getDownloadURL(storageRef));
  }
  return urls;
}

/* ========== Submit Handler ========== */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // 🔒 로그인 체크
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "PROCESSING...";

    const building = buildingEl.value.trim();
    const room = roomEl.value.trim();
    const status = statusEl.value.trim();
    const desc = descEl.value.trim();
    const repairMethod = repairEl ? repairEl.value.trim() : ""; // 🔧 Save Repair Method

    if (!building || !room || !desc) {
      alert("Please fill in all required fields.");
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? "UPDATE" : "SUBMIT REQUEST";
      return;
    }

    try {
      const staff = currentUser.displayName || currentUser.email;
      
      // New Photo Upload
      const newFiles = Array.from(photoInput.files || []);
      const newUrls = newFiles.length ? await uploadPhotos(newFiles) : [];

      // Merge photos
      const imageUrls = [...existingPhotos, ...newUrls];
      const photoURL = imageUrls[0] || ""; 

      const data = {
        building,
        room,
        issue: desc,
        staff,
        status,
        repairMethod, // 🔧 Save to DB
        imageUrls,
        photoURL,
        updatedAt: serverTimestamp(),
        
        // ✅ [추가됨] 보안 규칙(isOwner) 통과를 위한 필수 필드
        uid: currentUser.uid,
        authorEmail: currentUser.email,
        createdByEmail: currentUser.email // 기존 호환용 유지
      };

      if (editId) {
        // Update
        // 수정 시에는 uid를 덮어쓰지 않아도 됨 (기존 uid 유지)
        // 하지만 관리자가 수정하는 경우를 대비해 lastUpdatedBy 등을 남길 수도 있음
        await updateDoc(doc(db, "maintenance", editId), data);
        alert("Updated successfully.");
      } else {
        // Create
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "maintenance"), data);
        alert("Registered successfully.");
      }

      location.href = "maintenance_list.html";

    } catch (err) {
      console.error("Save Error:", err);
      if (err.code === 'permission-denied') {
          alert("권한이 없습니다. (본인이 작성한 글만 수정 가능)");
      } else {
          alert("Error saving data.");
      }
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? "UPDATE" : "SUBMIT REQUEST";
    }
  });
}

/* ========== Photo Preview ========== */
if (photoInput) {
  photoInput.addEventListener("change", () => {
    // Re-render existing
    let html = existingPhotos.map(url => `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border:1px solid #E2E8F0;margin-right:8px;">`).join("");
    
    [...photoInput.files].forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const src = URL.createObjectURL(file);
      html += `<img src="${src}" style="width:80px;height:80px;object-fit:cover;border:1px solid #E2E8F0;margin-right:8px;">`;
    });
    
    preview.innerHTML = html;
  });
}

// Auth Check
onAuthStateChanged(auth, (user) => {
    if (!user) {
         // alert("Please login.");
         // location.href = "index.html";
         // 필요 시 활성화
    }
});