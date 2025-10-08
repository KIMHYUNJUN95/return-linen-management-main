import { auth, db } from "./auth.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* 관리자 계정 */
const ADMIN_EMAIL = "rlaguswns95@haru-tokyo.com";

let currentUserEmail = null;

/* Auth gate */
onAuthStateChanged(auth, async (u)=>{
  if(!u) { location.href="signup.html"; return; }
  currentUserEmail = u.email;
  await Promise.all([loadReturns(), loadIncoming()]);
});

document.getElementById("btnLogout").onclick = async ()=>{
  await signOut(auth);
  location.href="signup.html";
};

/* 탭 전환 */
const tabR = document.getElementById("tabReturns");
const tabI = document.getElementById("tabIncoming");
const secR = document.getElementById("returnsSection");
const secI = document.getElementById("incomingSection");
tabR.onclick = ()=>{ tabR.className="primary"; tabI.className="secondary"; secR.style.display="block"; secI.style.display="none"; };
tabI.onclick = ()=>{ tabI.className="primary"; tabR.className="secondary"; secI.style.display="block"; secR.style.display="none"; };

/* ---------- 반품(returns) ---------- */
let ALL_R = [];

async function loadReturns(){
  let qRef;
  if(currentUserEmail === ADMIN_EMAIL)
    qRef = query(collection(db,"returns"), orderBy("date","desc"));
  else
    qRef = query(collection(db,"returns"), where("userEmail","==",currentUserEmail), orderBy("date","desc"));

  const snap = await getDocs(qRef);
  ALL_R = [];
  snap.forEach(d=> ALL_R.push({ id:d.id, ...d.data() }) );
  renderReturns(ALL_R);
}

function renderReturns(rows){
  const tbody = document.getElementById("tbodyR");
  tbody.innerHTML = "";
  rows.forEach(r=>{
    const first = r.items?.[0] || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.buildingId||"-"}</td>
      <td>${r.date||"-"}</td>
      <td>${r.staffName||"-"}</td>
      <td>${first.linenType||"-"}</td>
      <td>${first.defectCount??"-"}</td>
      <td class="${r.status==='resolved'?'status-resolved':'status-pending'}">${r.status==='resolved'?'완료':'대기'}</td>
      <td><button class="ghost btnDetail" data-id="${r.id}">상세</button></td>
      <td><button class="secondary btnEdit" data-id="${r.id}">수정</button></td>
      <td>${(currentUserEmail===ADMIN_EMAIL || currentUserEmail===r.userEmail)?`<button class="danger btnDel" data-id="${r.id}">삭제</button>`:`-`}</td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".btnDetail").forEach(b=>b.onclick=openDetail);
  tbody.querySelectorAll(".btnEdit").forEach(b=>b.onclick=openEdit);
  tbody.querySelectorAll(".btnDel").forEach(b=>b.onclick=delReturn);
}

/* 필터 (반품) */
document.getElementById("btnFilterR").onclick = ()=>{
  const s = document.getElementById("startDateR").value;
  const e = document.getElementById("endDateR").value;
  const b = document.getElementById("buildingFilterR").value;
  const f = ALL_R.filter(r=>{
    const okDate = (!s || r.date>=s) && (!e || r.date<=e);
    const okB = (b==="전체" || r.buildingId===b);
    return okDate && okB;
  });
  renderReturns(f);
};
document.getElementById("btnResetR").onclick = ()=>{
  document.getElementById("startDateR").value="";
  document.getElementById("endDateR").value="";
  document.getElementById("buildingFilterR").value="전체";
  renderReturns(ALL_R);
};

/* 내보내기 (반품) */
document.getElementById("btnExcelR").onclick = ()=>{
  const wb = XLSX.utils.table_to_book(document.getElementById("returnsTable"),{sheet:"Returns"});
  XLSX.writeFile(wb,"haru_returns.xlsx");
};
document.getElementById("btnPDFR").onclick = async ()=>{
  const wrap = document.getElementById("returnsTable").parentElement;
  const canvas = await html2canvas(wrap,{scale:2,backgroundColor:"#fff"});
  const img = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","pt","a4");
  const pw = pdf.internal.pageSize.getWidth();
  const iw = pw-40;
  const ih = canvas.height * (iw/canvas.width);
  pdf.text("HARU 반품 내역",20,20);
  pdf.addImage(img,"PNG",20,36,iw,ih);
  pdf.save("haru_returns.pdf");
};

/* 상세/수정 (반품) */
let CURRENT_ID = null;
function openDetail(e){
  const id = e.currentTarget.dataset.id;
  const r = ALL_R.find(x=>x.id===id);
  if(!r) return;
  const lines = (r.items||[]).map((it,i)=>`${i+1}. ${it.linenType} - ${it.defectCount}`).join("\n") || "-";
  alert(`건물: ${r.buildingId}\n담당자: ${r.staffName}\n날짜: ${r.date}\n상태: ${r.status==='resolved'?'완료':'대기'}\n\n[항목]\n${lines}`);
}
function openEdit(e){
  const id = e.currentTarget.dataset.id;
  const r = ALL_R.find(x=>x.id===id);
  if(!r) return;
  CURRENT_ID = id;
  document.getElementById("editBuilding").value = r.buildingId||"";
  document.getElementById("editDate").value = r.date||"";
  document.getElementById("editStaff").value = r.staffName||"";
  document.getElementById("editLinen").value = r.items?.[0]?.linenType||"";
  document.getElementById("editQty").value = r.items?.[0]?.defectCount??0;
  document.getElementById("editStatus").value = r.status||"pending";
  document.getElementById("detailModal").style.display="flex";
}
document.getElementById("btnCloseModal").onclick = ()=> document.getElementById("detailModal").style.display="none";
document.getElementById("btnSave").onclick = async ()=>{
  if(!CURRENT_ID) return;
  const updated = {
    buildingId: document.getElementById("editBuilding").value,
    date: document.getElementById("editDate").value,
    staffName: document.getElementById("editStaff").value,
    status: document.getElementById("editStatus").value,
    items: [{
      linenType: document.getElementById("editLinen").value,
      defectCount: parseInt(document.getElementById("editQty").value||0)
    }]
  };
  await updateDoc(doc(db,"returns",CURRENT_ID), updated);
  alert("수정 완료");
  document.getElementById("detailModal").style.display="none";
  await loadReturns();
};
async function delReturn(e){
  if(!confirm("삭제하시겠습니까?")) return;
  await deleteDoc(doc(db,"returns", e.currentTarget.dataset.id));
  await loadReturns();
}

/* ---------- 입고(incoming) ---------- */
let ALL_I = [];

async function loadIncoming(){
  let qRef;
  if(currentUserEmail === ADMIN_EMAIL)
    qRef = query(collection(db,"incoming"), orderBy("date","desc"));
  else
    qRef = query(collection(db,"incoming"), where("userEmail","==",currentUserEmail), orderBy("date","desc"));

  const snap = await getDocs(qRef);
  ALL_I = [];
  snap.forEach(d=> ALL_I.push({ id:d.id, ...d.data() }) );
  renderIncoming(ALL_I);
}

function renderIncoming(rows){
  const tbody = document.getElementById("tbodyI");
  tbody.innerHTML="";
  rows.forEach(r=>{
    const first = r.items?.[0] || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.buildingId||"-"}</td>
      <td>${r.date||"-"}</td>
      <td>${r.staffName||"-"}</td>
      <td>${first.linenType||"-"}</td>
      <td>${first.receivedCount??"-"}</td>
      <td><button class="ghost btnIDetail" data-id="${r.id}">상세</button></td>
      <td>${(currentUserEmail===ADMIN_EMAIL || currentUserEmail===r.userEmail)?`<button class="danger btnIDel" data-id="${r.id}">삭제</button>`:`-`}</td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".btnIDetail").forEach(b=>b.onclick=(e)=>{
    const id = e.currentTarget.dataset.id;
    const r = ALL_I.find(x=>x.id===id);
    if(!r) return;
    const lines = (r.items||[]).map((it,i)=>`${i+1}. ${it.linenType} - ${it.receivedCount}`).join("\n") || "-";
    alert(`건물: ${r.buildingId}\n담당자: ${r.staffName}\n날짜: ${r.date}\n\n[입고 항목]\n${lines}`);
  });
  tbody.querySelectorAll(".btnIDel").forEach(b=>b.onclick=delIncoming);
}

/* 필터 (입고) */
document.getElementById("btnFilterI").onclick = ()=>{
  const s = document.getElementById("startDateI").value;
  const e = document.getElementById("endDateI").value;
  const b = document.getElementById("buildingFilterI").value;
  const f = ALL_I.filter(r=>{
    const okDate = (!s || r.date>=s) && (!e || r.date<=e);
    const okB = (b==="전체" || r.buildingId===b);
    return okDate && okB;
  });
  renderIncoming(f);
};
document.getElementById("btnResetI").onclick = ()=>{
  document.getElementById("startDateI").value="";
  document.getElementById("endDateI").value="";
  document.getElementById("buildingFilterI").value="전체";
  renderIncoming(ALL_I);
};

/* 내보내기 (입고) */
document.getElementById("btnExcelI").onclick = ()=>{
  const wb = XLSX.utils.table_to_book(document.getElementById("incomingTable"),{sheet:"Incoming"});
  XLSX.writeFile(wb,"haru_incoming.xlsx");
};
document.getElementById("btnPDFI").onclick = async ()=>{
  const wrap = document.getElementById("incomingTable").parentElement;
  const canvas = await html2canvas(wrap,{scale:2,backgroundColor:"#fff"});
  const img = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","pt","a4");
  const pw = pdf.internal.pageSize.getWidth();
  const iw = pw-40;
  const ih = canvas.height * (iw/canvas.width);
  pdf.text("HARU 입고 내역",20,20);
  pdf.addImage(img,"PNG",20,36,iw,ih);
  pdf.save("haru_incoming.pdf");
};

async function delIncoming(e){
  if(!confirm("삭제하시겠습니까?")) return;
  await deleteDoc(doc(db,"incoming", e.currentTarget.dataset.id));
  await loadIncoming();
}