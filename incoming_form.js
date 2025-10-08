import { auth, db } from "./auth.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, (u)=>{
  if(!u) location.href="signup.html";
  currentUser = u;
  document.getElementById("staffName").value = u?.displayName || "";
});

document.getElementById("btnLogout").onclick = async ()=>{
  await signOut(auth);
  location.href="signup.html";
};

const items = document.getElementById("items");
function addRow(){
  const row = document.createElement("div");
  row.className="linen-row";
  row.style.display="grid";
  row.style.gridTemplateColumns="1fr 120px";
  row.style.gap="8px";
  row.style.marginTop="8px";
  row.innerHTML = `
    <select class="linenType">
      <option>수건타월</option>
      <option>싱글 매트커버</option>
      <option>싱글 이불 커버</option>
      <option>더블 매트커버</option>
      <option>더블 매트 커버(고무)</option>
      <option>더블 이불 커버</option>
      <option>배게커버</option>
      <option>발매트</option>
    </select>
    <input type="number" class="qty" min="1" value="1" />
  `;
  items.appendChild(row);
}
function removeRow(){
  const rows = items.querySelectorAll(".linen-row");
  if(rows.length>0) rows[rows.length-1].remove();
}
document.getElementById("addItem").onclick = addRow;
document.getElementById("removeItem").onclick = removeRow;
addRow();

document.getElementById("incomingForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const date = document.getElementById("date").value;
  const staffName = document.getElementById("staffName").value.trim();
  const buildingId = document.getElementById("buildingId").value;

  const list=[];
  items.querySelectorAll(".linen-row").forEach(r=>{
    const linenType = r.querySelector(".linenType").value;
    const receivedCount = parseInt(r.querySelector(".qty").value||0);
    if(linenType && receivedCount>0) list.push({ linenType, receivedCount });
  });

  if(!date || !staffName || !buildingId || list.length===0){
    alert("모든 항목을 입력하세요.");
    return;
  }

  try{
    await addDoc(collection(db,"incoming"),{
      date, staffName, buildingId,
      items:list,
      status:"received",
      userEmail: currentUser?.email || "unknown",
      createdAt: new Date()
    });
    alert("입고 등록 완료!");
    e.target.reset();
    items.innerHTML=""; addRow();
  }catch(err){
    alert("등록 실패: "+(err.message||err));
  }
});