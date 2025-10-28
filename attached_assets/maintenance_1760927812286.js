import { db, storage } from "./storage.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const form = document.getElementById("maintenanceForm");
const photoInput = document.getElementById("photo");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const building = form.building.value;
  const room = form.room.value.trim();
  const staffName = form.staff.value.trim();
  const desc = form.desc.value.trim();

  if (!building || !room || !staffName || !desc) {
    alert("건물, 객실, 담당자, 내용을 모두 입력해주세요.");
    return;
  }

  try {
    const photoUrls = [];
    for (const file of photoInput.files) {
      const storageRef = ref(storage, `maintenance/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      photoUrls.push(url);
    }

    console.log("📸 업로드된 이미지 URL 목록:", photoUrls);

    await addDoc(collection(db, "maintenance"), {
      building, room, desc,
      photos: photoUrls,
      staffName,
      status: "점검중",
      createdAt: serverTimestamp()
    });

    alert("✅ 유지보수 등록 완료!");
    form.reset();
    document.getElementById("photoPreview").innerHTML = "";
  } catch (err) {
    console.error("🚨 사진 업로드 오류:", err);
    alert("저장 중 오류가 발생했습니다: " + (err.message || err));
  }
});
