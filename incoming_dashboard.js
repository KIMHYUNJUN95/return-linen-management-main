import { app, auth, db } from "./auth.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ADMIN_EMAIL = "rlaguswns95@haru-tokyo.com";
let currentUserEmail = null;
let allData = [];
let currentId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = "signup.html"; return; }
  currentUserEmail = user.email;
  await loadReturns();
});

document.getElementById("btnLogout").onclick = async () => {
  await signOut(auth);
  location.href = "signup.html";
};

const tbody = document.getElementById("tbody");

async function loadReturns() {
  let q;
  if (currentUserEmail === ADMIN_EMAIL) {
    q = query(collection(db, "returns"), orderBy("date", "desc"));
  } else {
    q = query(collection(db, "returns"), where("userEmail", "==", currentUserEmail), orderBy("date", "desc"));
  }
  const snap = await getDocs(q);
  allData = [];
  snap.forEach(docSnap => allData.push({ id: docSnap.id, ...docSnap.data() }));
  render(allData);
}

function render(data) {
  tbody.innerHTML = "";
  data.forEach(d => {
    const first = d.items?.[0] || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.buildingId || "-"}</td>
      <td>${d.date || "-"}</td>
      <td>${d.staffName || "-"}</td>
      <td>${first.linenType || "-"}</td>
      <td>${first.defectCount ?? "-"}</td>
      <td class="${d.status === "resolved" ? "status-resolved" : "status-pending"}">${d.status === "resolved" ? "완료" : "대기"}</td>
      <td><button class="btnDetail" data-id="${d.id}">상세</button></td>
      <td><button class="btnEdit" data-id="${d.id}">수정</button></td>
      <td><button class="btnDel" data-id="${d.id}">삭제</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.querySelectorAll(".btnDetail").forEach(b => b.onclick = openDetail);
  document.querySelectorAll(".btnEdit").forEach(b => b.onclick = openEdit);
  document.querySelectorAll(".btnDel").forEach(b => b.onclick = delItem);
}

async function openDetail(e) {
  const id = e.currentTarget.dataset.id;
  const data = allData.find(d => d.id === id);
  if (!data) return;
  alert(`건물: ${data.buildingId}\n담당자: ${data.staffName}\n날짜: ${data.date}\n상태: ${data.status === "resolved" ? "완료" : "대기"}`);
}

async function openEdit(e) {
  currentId = e.currentTarget.dataset.id;
  const d = allData.find(x => x.id === currentId);
  if (!d) return;

  document.getElementById("editBuilding").value = d.buildingId || "";
  document.getElementById("editDate").value = d.date || "";
  document.getElementById("editStaff").value = d.staffName || "";
  document.getElementById("editLinen").value = d.items?.[0]?.linenType || "";
  document.getElementById("editQty").value = d.items?.[0]?.defectCount || "";
  document.getElementById("editStatus").value = d.status || "pending";

  document.getElementById("detailModal").style.display = "flex";
}

document.getElementById("btnCloseModal").onclick = () => {
  document.getElementById("detailModal").style.display = "none";
};

document.getElementById("btnSave").onclick = async () => {
  if (!currentId) return;
  const updated = {
    buildingId: document.getElementById("editBuilding").value,
    date: document.getElementById("editDate").value,
    staffName: document.getElementById("editStaff").value,
    status: document.getElementById("editStatus").value,
    items: [{
      linenType: document.getElementById("editLinen").value,
      defectCount: parseInt(document.getElementById("editQty").value)
    }]
  };
  await updateDoc(doc(db, "returns", currentId), updated);
  alert("수정 완료되었습니다.");
  document.getElementById("detailModal").style.display = "none";
  await loadReturns();
};

async function delItem(e) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  await deleteDoc(doc(db, "returns", e.currentTarget.dataset.id));
  await loadReturns();
}