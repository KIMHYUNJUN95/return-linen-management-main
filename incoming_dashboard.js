import { app, auth, db } from "./auth.js";
import { collection, getDocs, orderBy, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const ADMIN_EMAIL = "rlaguswns95@haru-tokyo.com";
let currentUserEmail = null;
let allData = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) location.href = "signup.html";
  else {
    currentUserEmail = user.email;
    await loadData();
  }
});

async function loadData() {
  let q;
  if (currentUserEmail === ADMIN_EMAIL)
    q = query(collection(db, "incoming"), orderBy("date", "desc"));
  else
    q = query(collection(db, "incoming"), where("userEmail", "==", currentUserEmail), orderBy("date", "desc"));

  const snap = await getDocs(q);
  allData = [];
  snap.forEach((doc) => allData.push({ id: doc.id, ...doc.data() }));
  render(allData);
}

function render(data) {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";
  data.forEach((d) => {
    const first = d.items?.[0] || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d.buildingId || "-"}</td><td>${d.date || "-"}</td><td>${d.staffName || "-"}</td><td>${first.linenType || "-"}</td><td>${first.receivedCount ?? "-"}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById("btnLogout").onclick = async () => {
  await signOut(auth);
  location.href = "signup.html";
};

document.getElementById("btnFilter").onclick = () => {
  const s = document.getElementById("startDate").value;
  const e = document.getElementById("endDate").value;
  const b = document.getElementById("buildingFilter").value;
  const filtered = allData.filter((d) => {
    const okDate = (!s || d.date >= s) && (!e || d.date <= e);
    const okBld = b === "전체" || d.buildingId === b;
    return okDate && okBld;
  });
  render(filtered);
};

document.getElementById("btnExcel").onclick = () => {
  const wb = XLSX.utils.table_to_book(document.getElementById("incomingTable"), { sheet: "Incoming" });
  XLSX.writeFile(wb, "haru_incoming.xlsx");
};

document.getElementById("btnPDF").onclick = async () => {
  const wrapper = document.getElementById("incomingTable").parentElement;
  const canvas = await html2canvas(wrapper, { scale: 2 });
  const img = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "pt", "a4");
  const pw = pdf.internal.pageSize.getWidth();
  const iw = pw - 40;
  const ih = (canvas.height * iw) / canvas.width;
  pdf.text("HARU 린넨 입고 내역", 20, 20);
  pdf.addImage(img, "PNG", 20, 40, iw, ih);
  pdf.save("haru_incoming.pdf");
};