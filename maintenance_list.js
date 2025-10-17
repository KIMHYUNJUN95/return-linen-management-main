import { db } from "./storage.js";
import {
  collection, getDocs, query, orderBy, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const listEl = document.getElementById("maintenanceBody");
const mobileList = document.getElementById("mobileList");
const searchInput = document.getElementById("searchInput");
const filterBuilding = document.getElementById("filterBuilding");
const filterBtn = document.getElementById("filterBtn");
const resetBtn = document.getElementById("resetBtn");

const modal = document.getElementById("photoModal");
const modalImg = document.getElementById("modalImg");
const detailModal = document.getElementById("detailModal");
const detailContent = document.getElementById("detailContent");

function fmt(ts) {
  if (!ts) return "-";
  try {
    return ts.toDate().toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return "-";
  }
}

const statusEmoji = (s) => {
  if (!s) return "🟡 진행중";
  if (String(s).includes("완료")) return "🟢 완료";
  if (String(s).includes("대기")) return "⚫ 대기";
  return "🟡 진행중";
};

async function loadData() {
  const q = query(collection(db, "maintenance"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a,b)=>(a.createdAt?.seconds<b.createdAt?.seconds?1:-1));
}

/* ✅ 렌더링 (PC 테이블) */
function renderTable(data) {
  listEl.innerHTML = data.map(d => {
    const photos = d.photos || d.imageUrls || [];
    const photoHtml = photos.length
      ? `<img src="${photos[0]}" class="photo-thumb" onclick="showPhoto('${photos[0]}')">`
      : "-";
    return `
      <tr>
        <td>${fmt(d.createdAt)}</td>
        <td>${d.building || "-"}</td>
        <td>${d.room || "-"}</td>
        <td>${d.desc || "-"}</td>
        <td>${d.staffName || d.createdBy || "-"}</td>
        <td>${photoHtml}</td>
        <td>${statusEmoji(d.status)}</td>
        <td>
          <div style="display:flex;justify-content:center;gap:6px;">
            <button onclick="viewDetail('${d.id}')">보기</button>
            <button class="danger" onclick="deleteItem('${d.id}')">삭제</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

/* ✅ 렌더링 (모바일 카드) */
function renderCards(data) {
  mobileList.innerHTML = data.map(d => {
    const photos = d.photos || d.imageUrls || [];
    const photoHtml = photos.length ? `<img src="${photos[0]}" onclick="showPhoto('${photos[0]}')">` : "";
    return `
      <div class="mobile-card">
        <p><b>등록일:</b> ${fmt(d.createdAt)}</p>
        <p><b>건물:</b> ${d.building}</p>
        <p><b>객실:</b> ${d.room}</p>
        <p><b>내용:</b> ${d.desc}</p>
        <p><b>등록자:</b> ${d.staffName || d.createdBy || "-"}</p>
        <p><b>상태:</b> ${statusEmoji(d.status)}</p>
        ${photoHtml}
        <div style="margin-top:8px;display:flex;gap:8px;">
          <button onclick="viewDetail('${d.id}')">보기</button>
          <button class="danger" onclick="deleteItem('${d.id}')">삭제</button>
        </div>
      </div>`;
  }).join("");
}

/* ✅ 사진 확대 */
window.showPhoto = (url) => {
  modalImg.src = url;
  modal.style.display = "flex";
};

/* ✅ 상세 보기 */
window.viewDetail = async (id) => {
  const snap = await getDocs(collection(db, "maintenance"));
  const item = snap.docs.map(d=>({id:d.id,...d.data()})).find(x=>x.id===id);
  if(!item)return;
  const photos=(item.photos||item.imageUrls||[]).map(p=>`<img src="${p}">`).join("");
  detailContent.innerHTML = `
    <h3>${item.building || "-"} ${item.room || ""}</h3>
    <p><b>등록일:</b> ${fmt(item.createdAt)}</p>
    <p><b>등록자:</b> ${item.staffName || item.createdBy || "-"}</p>
    <p><b>상태:</b> ${statusEmoji(item.status)}</p>
    <p><b>내용:</b> ${item.desc || "-"}</p>
    ${photos}
    <div style="text-align:center;margin-top:10px;">
      <button onclick="detailModal.style.display='none'">닫기</button>
    </div>
  `;
  detailModal.style.display = "flex";
};

/* ✅ 삭제 */
window.deleteItem = async (id) => {
  if(!confirm("정말 삭제하시겠습니까?"))return;
  await deleteDoc(doc(db,"maintenance",id));
  alert("삭제 완료");
  init();
};

/* ✅ 검색 / 필터 */
filterBtn.addEventListener("click", async () => {
  const keyword = searchInput.value.trim();
  const building = filterBuilding.value;
  const data = await loadData();
  let filtered = data;
  if(keyword){
    filtered = filtered.filter(x =>
      (x.desc && x.desc.includes(keyword)) ||
      (x.room && x.room.includes(keyword)) ||
      (x.staffName && x.staffName.includes(keyword))
    );
  }
  if(building) filtered = filtered.filter(x => x.building === building);
  renderTable(filtered);
  renderCards(filtered);
});
resetBtn.addEventListener("click", init);

/* ✅ 초기 실행 */
async function init(){
  const data = await loadData();
  renderTable(data);
  renderCards(data);
}
init();
