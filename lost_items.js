// ========================================
// 📝 HARU 분실물 등록 로직 (Optimized)
// ========================================

import { initHeaderMenu } from "./header.js";
// ✅ [수정됨] storage를 여기서 불러와서 중복 초기화 에러 방지
import { db, auth, storage } from "./storage.js"; 
import {
  collection, addDoc, serverTimestamp, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ✅ 헤더 로드
document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html")
    .then(res => res.text())
    .then(html => {
      const ph = document.getElementById("header-placeholder");
      if(ph) {
          ph.innerHTML = html;
          initHeaderMenu();
      }
    })
    .catch(err => console.error("헤더 로드 실패:", err));
});

// DOM 요소
const form = document.getElementById("lostForm");
const photoInput = document.getElementById("photo");
const preview = document.getElementById("photoPreview");
const submitBtn = document.getElementById("submitBtn");
const title = document.getElementById("formTitle");

// URL 파라미터 확인 (수정 모드)
const urlParams = new URLSearchParams(location.search);
const editId = urlParams.get("edit");

let existingPhotos = [];

/* 📸 사진 미리보기 기능 */
if (photoInput) {
  photoInput.addEventListener("change", () => {
    preview.innerHTML = "";
    const files = Array.from(photoInput.files || []);
    files.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    });
  });
}

/* 🔄 수정 모드일 경우 데이터 로드 */
if (editId) {
  (async () => {
    if (title) title.textContent = "분실물 정보 수정";
    if (submitBtn) submitBtn.textContent = "수정 저장";
    
    try {
      const snap = await getDoc(doc(db, "lostItems", editId));
      if (snap.exists()) {
        const d = snap.data();
        if (form.building) form.building.value = d.building || "";
        if (form.room) form.room.value = d.room || "";
        if (form.desc) form.desc.value = d.description || ""; 
        if (form.status) form.status.value = d.status || "보관중";
        
        existingPhotos = d.imageUrls || [];
        existingPhotos.forEach(url => {
          const img = document.createElement("img");
          img.src = url;
          preview.appendChild(img);
        });
      } else {
        alert("데이터를 찾을 수 없습니다.");
        location.href = "lost_items_list.html";
      }
    } catch (e) {
      console.error("데이터 로드 오류:", e);
    }
  })();
}

/* 🚀 폼 제출 처리 */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔒 로그인 체크 (필수)
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "처리 중...";

    const buildingSelect = form.building;
    const building = buildingSelect.options[buildingSelect.selectedIndex].text;
    const room = form.room.value.trim();
    const desc = form.desc.value.trim();
    const status = form.status ? form.status.value : "보관중";

    if (!building || !room || !desc) {
      alert("필수 입력값(건물, 객실, 설명)을 확인해주세요.");
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? "수정 저장" : "등록 완료";
      return;
    }

    try {
      const newPhotoUrls = [];

      // ✅ 이미지 업로드
      for (const file of photoInput.files) {
        const path = `lostItems/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newPhotoUrls.push(url);
      }

      const finalPhotoUrls = [...existingPhotos, ...newPhotoUrls];

      // 공통 데이터
      const baseData = {
        building,
        room,
        description: desc,
        imageUrls: finalPhotoUrls,
        status: status,
        updatedAt: serverTimestamp() // 수정 시에는 업데이트 시간만 변경
      };

      if (editId) {
        // [수정 모드] uid는 덮어쓰지 않고 내용만 업데이트
        await updateDoc(doc(db, "lostItems", editId), baseData);
        alert("✅ 수정이 완료되었습니다.");
      } else {
        // [등록 모드] uid, userEmail, createdBy, createdAt 추가
        const newData = {
            ...baseData,
            uid: currentUser.uid,
            userEmail: currentUser.email,
            createdBy: currentUser.email, // ⭐ 목록 표시용 이름 추가
            createdAt: serverTimestamp()
        };
        await addDoc(collection(db, "lostItems"), newData);
        alert("✅ 분실물 등록 완료!");
      }

      location.href = "lost_items_list.html";
    } catch (err) {
      console.error("❌ 저장 오류:", err);
      if (err.code === 'permission-denied') {
          alert("권한이 없습니다. (본인이 작성한 글만 수정 가능)");
      } else {
          alert("저장 중 오류가 발생했습니다.\n" + err.message);
      }
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? "수정 저장" : "등록 완료";
    }
  });
}