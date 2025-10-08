import { app, auth } from "./auth.js";
import { 
  getFirestore, collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore(app);
const tbody = document.getElementById("tbody");

onAuthStateChanged(auth, (user) => {
  if (!user) location.href = "signup.html";
});

document.getElementById("btnLogout").onclick = async () => {
  await signOut(auth);
  location.href = "signup.html";
};

let DATA = [];

async function load() {
  const snap = await getDocs(query(collection(db, "returns"), orderBy("date", "desc")));
  DATA = [];
  snap.forEach((d) => {
    const x = d.data();
    DATA.push({ id: d.id, ...x });
  });
  render();
}

function render() {
  tbody.innerHTML = "";
  DATA.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.buildingId}</td>
      <td>${r.date}</td>
      <td>${r.staffName}</td>
      <td>${r.items?.map(i => `${i.linenType}(${i.defectCount})`).join(", ") || "-"}</td>
      <td>${r.status === "resolved" ? "완료" : "대기"}</td>
      <td>
        <button class="edit" data-id="${r.id}">수정</button>
        <button class="done" data-id="${r.id}">완료</button>
        <button class="wait" data-id="${r.id}">대기</button>
        <button class="delete" data-id="${r.id}">삭제</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".edit").forEach(b => b.onclick = editRow);
  tbody.querySelectorAll(".done").forEach(b => b.onclick = setDone);
  tbody.querySelectorAll(".wait").forEach(b => b.onclick = setWait);
  tbody.querySelectorAll(".delete").forEach(b => b.onclick = deleteRow);
}

async function editRow(e) {
  const id = e.target.dataset.id;
  const rec = DATA.find(v => v.id === id);
  const newType = prompt("새 린넨 종류를 입력:", rec.items[0]?.linenType || "");
  const newCount = prompt("새 수량을 입력:", rec.items[0]?.defectCount || 0);
  if (!newType) return alert("수정 취소됨");
  await updateDoc(doc(db, "returns", id), { items: [{ linenType: newType, defectCount: newCount }] });
  alert("수정 완료");
  load();
}

async function setDone(e) {
  await updateDoc(doc(db, "returns", e.target.dataset.id), { status: "resolved" });
  load();
}
async function setWait(e) {
  await updateDoc(doc(db, "returns", e.target.dataset.id), { status: "pending" });
  load();
}
async function deleteRow(e) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  await deleteDoc(doc(db, "returns", e.target.dataset.id));
  load();
}

load();