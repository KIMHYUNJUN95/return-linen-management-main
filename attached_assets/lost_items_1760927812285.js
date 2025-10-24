import { db, storage } from "./storage.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const form = document.getElementById("lostForm");
const photoInput = document.getElementById("photo");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const building = form.building.value;
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
      const storageRef = ref(storage, `lost_items/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      photoUrls.push(url);
    }

    await addDoc(collection(db, "lostItems"), {
      building,
      room,
      item,
      desc,
      photos: photoUrls,
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