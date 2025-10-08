import { app, auth, db } from "./auth.js";
import { collection, getDocs, orderBy, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const ADMIN_EMAIL = "rlaguswns95@haru-tokyo.com";
let currentUserEmail = null;
let returnsData = [];
let incomingData = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) location.href = "signup.html";
  else {
    currentUserEmail = user.email;
    await loadReturns();
    await loadIncoming();
  }
});

document.getElementById("btnLogout").onclick = async () => {
  await signOut(auth);
  location.href = "signup.html";
};

// 탭 전환
const tabReturns = document.getElementById("tabReturns");
const tabIncoming = document.getElementById("tabIncoming");
const returnsSection = document.getElementById("returnsSection");
const incomingSection = document.getElementById("incomingSection");

tabReturns.onclick = () => {
  tabReturns.classList.add("active");
  tabIncoming.classList.remove("active");
  returnsSection.style.display = "block";
  incomingSection.style.display = "none";
};

tabIncoming.onclick = () => {
  tabIncoming.classList.add("active");
  tabReturns.classList.remove("active");
  incomingSection.style.display = "block";
  returnsSection.style.display = "none";
};

// === 반품 데이터 ===
async function loadReturns() {
  let q;
  if (currentUserEmail === ADMIN_EMAIL)
    q = query(collection(db, "returns"), orderBy("date", "desc"));
  else
    q = query(collection(db, "returns"), where("userEmail", "==", currentUserEmail), orderBy("date", "desc"));

  const snap = await getDocs(q);
  returnsData = [];
  snap.forEach((d) => returnsData.push({ id: d.id, ...d.data() }));
  renderReturns(returnsData);
}

function renderReturns(data) {
  const tbody = document.getElementById("tbodyR");
  tbody.innerHTML = "";
  data.forEach((r) => {
    const first = r.items?.[0] || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.buildingId || "-"}</td><td>${r.date || "-"}</td><td>${r.staffName || "-"}</td><td>${first.linenType || "-"}</td><td>${first.defectCount ?? "-"}</td><td>${r.status === "resolved" ? "완료" : "대기"}</td>`;
    tbody.appendChild(tr);
  });
}

// === 입고 데이터 ===
async function loadIncoming() {
  let q;
  if (currentUserEmail === ADMIN_EMAIL)
    q = query(collection(db, "incoming"), orderBy("date", "desc"));
  else
    q = query(collection(db, "incoming"), where("userEmail", "==", currentUserEmail), orderBy("date", "desc"));

  const snap = await getDocs(q);
  incomingData = [];
  snap.forEach((d) => incomingData.push({ id: d.id, ...d.data() }));
  renderIncoming(incomingData);
}

function renderIncoming(data) {
  const tbody = document.getElementById("tbodyI");
  tbody.innerHTML = "";
  data.forEach((r) => {
    const first = r.items?.[0] || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.buildingId || "-"}</td><td>${r.date || "-"}</td><td>${r.staffName || "-"}</td><td>${first.linenType || "-"}</td><td>${first.receivedCount ?? "-"}</td>`;
    tbody.appendChild(tr);
  });
}
