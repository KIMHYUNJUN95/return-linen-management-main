// ✅ return_form.js (수정 완료 버전)
import { app, auth, db } from "./auth.js";
import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let currentUserEmail = null;

// 로그인한 사용자 이메일 저장
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "signup.html";
  } else {
    currentUserEmail = user.email;
    document.getElementById("staffName").value = user.displayName || "알바생";
  }
});

// ✅ 린넨 항목 추가 기능
const linenContainer = document.getElementById("linenContainer");
document.getElementById("addItem").addEventListener("click", () => {
  const div = document.createElement("div");
  div.className = "linen-row";
  div.innerHTML = `
    <select class="linenType">
      <option value="">린넨 종류 선택</option>
      <option>수건</option>
      <option>이불</option>
      <option>베개커버</option>
      <option>시트</option>
      <option>매트리스커버</option>
    </select>
    <input type="number" class="linenCount" placeholder="불량 수량" min="0">
    <button type="button" class="removeItem">삭제</button>
  `;
  linenContainer.appendChild(div);

  div.querySelector(".removeItem").onclick = () => div.remove();
});

// ✅ 린넨 항목 수집 함수
function collectLinenItems() {
  const rows = document.querySelectorAll(".linen-row");
  const items = [];
  rows.forEach((row) => {
    const linenType = row.querySelector(".linenType").value;
    const defectCount = parseInt(row.querySelector(".linenCount").value || 0);
    if (linenType) items.push({ linenType, defectCount });
  });
  return items;
}

// ✅ 반품 저장
document.getElementById("saveBtn").addEventListener("click", async () => {
  const staffName = document.getElementById("staffName").value.trim();
  const date = document.getElementById("date").value;
  const buildingId = document.getElementById("buildingSelect").value;
  const items = collectLinenItems();

  if (!staffName || !date || !buildingId || items.length === 0) {
    alert("모든 필드를 입력하세요.");
    return;
  }

  try {
    await addDoc(collection(db, "returns"), {
      staffName,
      date,
      buildingId,
      items,
      status: "pending",
      userEmail: currentUserEmail || "unknown", // ✅ 사용자 이메일 저장
      createdAt: new Date()
    });

    alert("반품이 등록되었습니다!");
    location.reload();
  } catch (error) {
    console.error("등록 실패:", error);
    alert("등록 중 오류가 발생했습니다.");
  }
});

// ✅ 로그아웃
document.getElementById("btnLogout").onclick = async () => {
  await signOut(auth);
  location.href = "signup.html";
};
