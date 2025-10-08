// ✅ Firebase import
import { app, auth, onAuthStateChanged } from "./auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const db = getFirestore(app);

// ✅ 린넨 종류 목록
const LINEN_TYPES = [
  "수건타월", "싱글 매트커버", "싱글 이불 커버",
  "더블 매트커버", "더블 매트 커버(고무)",
  "더블 이불 커버", "배게커버", "발매트"
];

// ✅ 요소 가져오기
const itemsBody = document.getElementById("itemsBody");
const btnAddRow = document.getElementById("btnAddRow");
const btnSave = document.getElementById("btnSave");

// ✅ 로그인 상태 확인
onAuthStateChanged(auth, (user) => {
  if (!user) location.href = "signup.html";
  else document.getElementById("staffName").value = user.email.split("@")[0];
});

// ✅ 행 추가
btnAddRow.onclick = () => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <select class="linenSel">
        <option value="">선택</option>
        ${LINEN_TYPES.map(v=>`<option>${v}</option>`).join("")}
      </select>
    </td>
    <td><input type="number" class="qty" min="1" placeholder="0"></td>
    <td><button class="btn danger btnDel">삭제</button></td>
  `;
  tr.querySelector(".btnDel").onclick = () => tr.remove();
  itemsBody.appendChild(tr);
};

// ✅ 저장 버튼
btnSave.onclick = async () => {
  const date = document.getElementById("dateInput").value;
  const buildingId = document.getElementById("buildingSelect").value;
  const staffName = document.getElementById("staffName").value;

  if (!date || !buildingId) return alert("날짜와 건물을 입력해주세요.");

  const items = [...document.querySelectorAll(".linenSel")].map((sel, i) => {
    const linenType = sel.value;
    const defectCount = parseInt(document.querySelectorAll(".qty")[i].value || 0);
    return linenType ? { linenType, defectCount } : null;
  }).filter(Boolean);

  if (items.length === 0) return alert("린넨 종류를 입력해주세요.");

  await addDoc(collection(db, "returns"), {
    buildingId,
    date,
    staffName,
    items,
    status: "pending",
    createdBy: auth.currentUser?.email || "unknown"
  });
  alert("등록 완료되었습니다!");
  itemsBody.innerHTML = "";
};