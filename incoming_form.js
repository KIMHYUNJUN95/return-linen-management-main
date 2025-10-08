import { app, auth, db } from "./auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let currentUserEmail = null;

onAuthStateChanged(auth, (user) => {
  if (!user) location.href = "signup.html";
  else {
    currentUserEmail = user.email;
    document.getElementById("staffName").value = user.displayName || "알바생";
  }
});

const linenContainer = document.getElementById("linenContainer");
document.getElementById("addItem").addEventListener("click", () => {
  const div = document.createElement("div");
  div.className = "linen-row";
  div.innerHTML = `
    <select class="linenType">
      <option value="">린넨 종류 선택</option>
      <option>수건타월</option>
      <option>싱글 매트커버</option>
      <option>싱글 이불 커버</option>
      <option>더블 매트커버</option>
      <option>더블 매트 커버(고무)</option>
      <option>더블 이불 커버</option>
      <option>배게커버</option>
      <option>발매트</option>
    </select>
    <input type="number" class="linenCount" placeholder="수량" min="0">
    <button type="button" class="removeItem">삭제</button>
  `;
  linenContainer.appendChild(div);
  div.querySelector(".removeItem").onclick = () => div.remove();
});

function collectLinenItems() {
  const rows = document.querySelectorAll(".linen-row");
  const items = [];
  rows.forEach((row) => {
    const linenType = row.querySelector(".linenType").value;
    const receivedCount = parseInt(row.querySelector(".linenCount").value || 0);
    if (linenType) items.push({ linenType, receivedCount });
  });
  return items;
}

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
    await addDoc(collection(db, "incoming"), {
      staffName, date, buildingId, items,
      status: "received", userEmail: currentUserEmail || "unknown", createdAt: new Date()
    });
    alert("입고가 등록되었습니다!");
    location.reload();
  } catch (error) {
    console.error("등록 실패:", error);
    alert("등록 중 오류가 발생했습니다.");
  }
});

document.getElementById("btnLogout").onclick = async () => {
  await signOut(auth);
  location.href = "signup.html";
};