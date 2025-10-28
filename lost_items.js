// ========================================
// 📸 분실물 등록 (CORS 버킷 경로 수정 버전)
// ========================================

import { db } from "./storage.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ✅ 정확한 버킷 경로 지정 (기존 appspot → firebasestorage.app)
const storage = getStorage(undefined, "gs://return-linen-management.firebasestorage.app");

const form = document.getElementById("lostForm");
const photoInput = document.getElementById("photo");
const preview = document.getElementById("photoPreview");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const buildingSelect = form.building;
  const building = buildingSelect.options[buildingSelect.selectedIndex].text;
  const room = form.room.value.trim();
  const desc = form.desc.value.trim();

  if (!building || !room || !desc) {
    alert("필수 입력값(건물, 객실, 설명)을 확인해주세요.");
    return;
  }

  try {
    const photoUrls = [];

    // ✅ 이미지 업로드 (firebasestorage.app 버킷으로 전송됨)
    for (const file of photoInput.files) {
      const path = `lostItems/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      console.log("✅ 업로드 완료:", url);
      photoUrls.push(url);
    }

    // ✅ Firestore에 등록
    await addDoc(collection(db, "lostItems"), {
      building,
      room,
      description: desc,
      imageUrls: photoUrls,
      status: "보관중",
      createdAt: serverTimestamp()
    });

    alert("✅ 분실물 등록 완료!");
    form.reset();
    preview.innerHTML = "";
  } catch (err) {
    console.error("❌ 저장 오류:", err);
    alert("저장 중 오류가 발생했습니다.\n" + err.message);
  }
});
