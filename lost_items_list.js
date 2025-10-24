import { db } from "./storage.js";
import {
  collection, getDocs, deleteDoc, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const listEl = document.getElementById("lostBody");
const mobileList = document.getElementById("mobileList");
const searchInput = document.getElementById("searchInput");
const filterBuilding = document.getElementById("filterBuilding");
const filterBtn = document.getElementById("filterBtn");
const resetBtn = document.getElementById("resetBtn");

const modal = document.getElementById("photoModal");
const modalImg = document.getElementById("modalImg");
const detailModal = document.getElementById("detailModal");
const detailContent = document.getElementById("detailContent");

/* ✅ 날짜 포맷 */
function formatDate(ts) {
  if (!ts) return "-";
  try {
    if (ts.seconds) ts = new Date(ts.seconds * 1000);
    else ts = new Date(ts);
    return ts.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "-";
  }
}

/* ✅ Firestore 로드 */
async function loadData() {
  const snap = await getDocs(collection(db, "lostItems"));
  const data = snap.docs.map(doc => {
    const d = doc.data();
    // 📌 imageUrls와 photos를 모두 인식하도록 수정
    const images = Array.isArray(d.imageUrls) && d.imageUrls.length
      ? d.imageUrls
      : Array.isArray(d.photos)
      ? d.photos
      : [];
    return {
      id: doc.id,
      building: d.building || "-",
      room: d.room || "-",
      createdAt: d.createdAt || "-",
      createdBy: d.createdBy || "-",
      description: d.description || "-",
      status: d.status || "-",
      imageUrls: images,
      memo: d.memo || ""
    };
  });
  return data.sort((a,b)=>(a.createdAt?.seconds<b.createdAt?.seconds?1:-1));
}

/* ✅ 렌더링 (PC 테이블) */
function renderTable(data) {
  listEl.innerHTML = data.map(d => `
    <tr>
      <td>${formatDate(d.createdAt)}</td>
      <td>${d.building}</td>
      <td>${d.room}</td>
      <td>${d.description}</td>
      <td>${d.imageUrls.length ? `<img src="${d.imageUrls[0]}" class="photo-thumb" onclick="showPhoto('${d.imageUrls[0]}')">` : "-"}</td>
      <td>
        <select onchange="updateStatus('${d.id}',this.value)" style="height:36px;border-radius:8px;padding:4px 8px;">
          <option value="보관중" ${d.status==="보관중"?"selected":""}>보관중</option>
          <option value="회수" ${d.status==="회수"?"selected":""}>회수</option>
          <option value="폐기" ${d.status==="폐기"?"selected":""}>폐기</option>
        </select>
      </td>
      <td>
        <div style="display:flex;justify-content:center;gap:6px;">
          <button onclick="viewDetail('${d.id}')">보기</button>
          <button onclick="editItem('${d.id}')">수정</button>
          <button class="danger" onclick="deleteItem('${d.id}')">삭제</button>
        </div>
      </td>
    </tr>
  `).join("");
}

/* ✅ 렌더링 (모바일 카드) */
function renderCards(data) {
  mobileList.innerHTML = data.map(d => `
    <div class="mobile-card">
      <p><b>등록일:</b> ${formatDate(d.createdAt)}</p>
      <p><b>건물:</b> ${d.building}</p>
      <p><b>객실:</b> ${d.room}</p>
      <p><b>내용:</b> ${d.description}</p>
      <p><b>상태:</b> ${d.status}</p>
      ${d.imageUrls.length ? `<img src="${d.imageUrls[0]}" onclick="showPhoto('${d.imageUrls[0]}')">` : ""}
      <div style="margin-top:8px;display:flex;gap:8px;">
        <button onclick="viewDetail('${d.id}')">보기</button>
        <button onclick="editItem('${d.id}')">수정</button>
        <button class="danger" onclick="deleteItem('${d.id}')">삭제</button>
      </div>
    </div>
  `).join("");
}

/* ✅ 사진 확대 */
window.showPhoto = (url) => {
  modalImg.src = url;
  modal.style.display = "flex";
};

/* ✅ 상태 변경 */
window.updateStatus = async (id, val) => {
  await updateDoc(doc(db, "lostItems", id), { status: val });
  alert("상태가 변경되었습니다.");
};

/* ✅ 상세보기 */
window.viewDetail = async (id) => {
  const snap = await getDocs(collection(db, "lostItems"));
  const item = snap.docs.map(d=>({id:d.id,...d.data()})).find(x=>x.id===id);
  if(!item)return;
  const images = Array.isArray(item.imageUrls) && item.imageUrls.length
    ? item.imageUrls
    : Array.isArray(item.photos)
    ? item.photos
    : [];
  const photos = images.map(u=>`<img src="${u}" style="margin-top:8px;border-radius:8px;">`).join("");
  detailContent.innerHTML = `
    <h3>${item.building} ${item.room}</h3>
    <p><b>등록일:</b> ${formatDate(item.createdAt)}</p>
    <p><b>등록자:</b> ${item.createdBy}</p>
    <p><b>상태:</b> ${item.status}</p>
    <p><b>내용:</b><br>${item.description}</p>
    ${photos}
    <hr>
    <label>메모</label>
    <textarea id="memoInput">${item.memo || ""}</textarea>
    <div style="margin-top:10px;display:flex;gap:10px;">
      <button class="primary" onclick="saveMemo('${id}')">저장</button>
      <button onclick="detailModal.style.display='none'">닫기</button>
    </div>
  `;
  detailModal.style.display = "flex";
};

/* ✅ 메모 저장 */
window.saveMemo = async (id) => {
  const memo = document.getElementById("memoInput").value;
  await updateDoc(doc(db,"lostItems",id),{memo});
  alert("메모 저장 완료");
  detailModal.style.display="none";
  init();
};

/* ✅ 수정 */
window.editItem = (id) => {
  location.href = `lost_items.html?edit=${id}`;
};

/* ✅ 삭제 */
window.deleteItem = async (id) => {
  if(!confirm("정말 삭제하시겠습니까?"))return;
  await deleteDoc(doc(db,"lostItems",id));
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
      (x.description && x.description.includes(keyword)) ||
      (x.room && x.room.includes(keyword)) ||
      (x.createdBy && x.createdBy.includes(keyword))
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
