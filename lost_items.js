import { db } from "./storage.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const form = document.getElementById("lostForm");
const photoInput = document.getElementById("photo");

// ✅ 올바른 버킷 명시
const correctStorage = getStorage(undefined, "gs://return-linen-management.appspot.com");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const buildingSelect = form.building;
  const building = buildingSelect.options[buildingSelect.selectedIndex].text;
  const room = form.room.value.trim();
  const item = form.item.value.trim();
  const desc = form.desc.value.trim();

  if (!building || !room || !item) {
    alert("필수 입력값(건물, 객실, 분실물명)을 확인해주세요.");
    return;
  }

  try {
    const photoUrls = [];
    for (const file of photoInput.files) {
      const path = `lostItems/${Date.now()}_${file.name}`;
      const storageRef = ref(correctStorage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      console.log("✅ URL:", url);
      photoUrls.push(url);
    }

    await addDoc(collection(db, "lostItems"), {
      building,
      room,
      item,
      description: desc,
      photos: photoUrls,
      status: "보관중",
      createdAt: serverTimestamp()
    });

    alert("✅ 분실물 등록 완료!");
    form.reset();
    document.getElementById("photoPreview").innerHTML = "";
  } catch (err) {
    console.error("❌ 저장 오류:", err);
    alert("저장 중 오류가 발생했습니다.");
  }
});
