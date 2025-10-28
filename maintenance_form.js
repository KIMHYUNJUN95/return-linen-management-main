// ========================================
// 🛠️ HARU 유지보수 등록/수정 (작성자 이메일 저장 추가)
// ========================================

import { db, storage, auth } from "./storage.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* ========== DOM 요소 ========== */
const form = document.getElementById("maintenanceForm");
const photoInput = document.getElementById("photo");
const preview = document.getElementById("photoPreview");
const buildingEl = document.getElementById("building");
const roomEl = document.getElementById("room");
const statusEl = document.getElementById("status");
const descEl = document.getElementById("description");
const submitBtn = document.getElementById("submitBtn");
const titleEl = document.getElementById("formTitle");

/* ========== 수정 모드 확인 ========== */
const urlParams = new URLSearchParams(location.search);
const editId = urlParams.get("edit");
let existingPhotos = [];

/* ========== 수정 모드 데이터 로드 ========== */
(async function maybeLoadForEdit() {
  if (!editId) return;
  if (titleEl) titleEl.textContent = "객실 유지보수 수정";
  if (submitBtn) submitBtn.textContent = "수정 완료";

  const snap = await getDoc(doc(db, "maintenance", editId));
  if (!snap.exists()) return;

  const d = snap.data();
  buildingEl.value = d.building || "";
  roomEl.value = d.room || "";
  statusEl.value = d.status || "접수됨";
  descEl.value = d.issue || d.description || d.desc || "";

  // 📸 단일·다중 이미지 호환 처리
  existingPhotos = Array.isArray(d.imageUrls) && d.imageUrls.length
    ? d.imageUrls
    : (d.photoURL ? [d.photoURL] : (d.photos || []));

  preview.innerHTML = existingPhotos
    .map(url => `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-right:8px;">`)
    .join("");
})();

/* ========== 사진 업로드 ========== */
async function uploadPhotos(files) {
  const urls = [];
  for (const file of files) {
    const storageRef = ref(storage, `maintenance/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }
  return urls;
}

/* ========== 등록/수정 이벤트 ========== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitBtn) submitBtn.disabled = true;

  const building = (buildingEl.value || "").trim();
  const room = (roomEl.value || "").trim();
  const status = (statusEl.value || "").trim();
  const desc = (descEl.value || "").trim();

  if (!building || !room || !desc) {
    alert("건물, 객실, 내용을 입력하세요.");
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  try {
    const user = auth.currentUser;
    const staff = user ? (user.displayName || user.email) : "관리자";
    const createdByEmail = user ? user.email : "관리자"; // ✅ 작성자 이메일 저장

    const newFiles = Array.from(photoInput.files || []);
    const newUrls = newFiles.length ? await uploadPhotos(newFiles) : [];
    const imageUrls = [...existingPhotos, ...newUrls];
    const photoURL = imageUrls[0] || "";

    const data = {
      building,
      room,
      issue: desc,
      staff,
      createdByEmail,    // ✅ 권한 제어용 필드
      status,
      imageUrls,
      photoURL,
      updatedAt: serverTimestamp(),
    };

    if (editId) {
      await updateDoc(doc(db, "maintenance", editId), data);
      alert("✅ 수정 완료");
    } else {
      await addDoc(collection(db, "maintenance"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      alert("✅ 등록 완료");
    }

    location.href = "maintenance_list.html";
  } catch (err) {
    console.error("🚨 저장 오류:", err);
    alert("저장 중 오류가 발생했습니다.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

/* ========== 사진 미리보기 ========== */
photoInput.addEventListener("change", () => {
  preview.innerHTML = "";
  [...photoInput.files].forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.width = "80px";
    img.style.height = "80px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    img.style.marginRight = "8px";
    preview.appendChild(img);
  });
});
