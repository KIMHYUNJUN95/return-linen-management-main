// ========================================
// 🔍 HARU 분실물 목록 로직 (Tokyo Day Bright)
// ========================================

import { initHeaderMenu } from "./header.js";
import { db, auth } from "./storage.js";
import {
  collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 1. 헤더 로드
document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html")
    .then(res => res.text())
    .then(html => {
      const placeholder = document.getElementById("header-placeholder");
      if (placeholder) {
        placeholder.innerHTML = html;
        initHeaderMenu();
      }
    })
    .catch(err => console.error("헤더 로드 실패:", err));
});

// DOM 요소 참조
const listContainer = document.getElementById("lostList");
const filterBuilding = document.getElementById("filterBuilding");
const filterStatus = document.getElementById("filterStatus");
const searchInput = document.getElementById("searchInput");
const filterBtn = document.getElementById("filterBtn");
const resetBtn = document.getElementById("resetBtn");

// 모달 관련 요소
const detailModal = document.getElementById("detailModal");
const detailContent = document.getElementById("detailContent");
const closeDetailModalBtn = document.getElementById("closeDetailModal");
const photoModal = document.getElementById("photoModal");
const modalImg = document.getElementById("modalImg");

let allItems = [];

/* 🚀 데이터 실시간 구독 */
const q = query(collection(db, "lostItems"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  allItems = [];
  snapshot.forEach((docSnap) => {
    const d = docSnap.data();

    // 레거시 이미지 호환
    const images = Array.isArray(d.imageUrls) && d.imageUrls.length
      ? d.imageUrls
      : Array.isArray(d.photos) ? d.photos : [];

    allItems.push({
      id: docSnap.id,
      building: d.building || "-",
      room: d.room || "-",
      createdAt: d.createdAt,
      createdBy: d.createdBy || "-",
      description: d.description || "-",
      status: d.status || "-",
      imageUrls: images,
      memo: d.memo || "",
      uid: d.uid || null   // ⭐ 작성자 확인용
    });
  });

  renderList();
});

/* 📅 날짜 포맷 */
function formatDate(ts) {
  if (!ts) return "-";
  try {
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return "-";
  }
}

/* 🎨 리스트 렌더링 */
function renderList() {
  const buildingVal = filterBuilding.value;
  const statusVal = filterStatus.value;
  const keyword = searchInput.value.trim().toLowerCase();

  const filtered = allItems.filter(item => {
    const matchBuilding = !buildingVal || item.building === buildingVal;
    const matchStatus = !statusVal || item.status === statusVal;

    const desc = (item.description || "").toLowerCase();
    const room = (item.room || "").toString().toLowerCase();
    const creator = (item.createdBy || "").toLowerCase();

    const matchSearch = !keyword || desc.includes(keyword) || room.includes(keyword) || creator.includes(keyword);

    return matchBuilding && matchStatus && matchSearch;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 80px 0; color: #CBD5E1;">
        <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
        <p>조건에 맞는 분실물이 없습니다.</p>
      </div>`;
    return;
  }

  listContainer.innerHTML = filtered.map(item => {
    const thumbUrl = (item.imageUrls && item.imageUrls.length > 0)
      ? item.imageUrls[0]
      : 'https://placehold.co/300x200/F1F5F9/94A3B8?text=No+Image';

    let statusClass = "status-keeping";
    if (item.status === "회수") statusClass = "status-returned";
    if (item.status === "폐기") statusClass = "status-discarded";

    return `
      <div class="lost-card" data-id="${item.id}">
        <span class="status-badge ${statusClass}">${item.status}</span>

        <div class="card-img-wrap">
            <img src="${thumbUrl}" class="card-img" alt="분실물 이미지" loading="lazy">
        </div>

        <div class="card-info">
          <h3>${item.building} ${item.room}호</h3>
          <p>${item.description}</p>
        </div>

        <div class="card-meta">
          <span>${formatDate(item.createdAt).split(". ")[0]}</span>
          <span>${item.createdBy}</span>
        </div>

        <div class="card-actions">
          <button class="action-btn edit-btn" data-id="${item.id}">수정</button>
          <button class="action-btn delete delete-btn" data-id="${item.id}">삭제</button>
        </div>
      </div>
    `;
  }).join("");

  attachEventListeners();
}

/* 🖱 이벤트 리스너 연결 */
function attachEventListeners() {
  // 카드 클릭 → 상세 모달
  document.querySelectorAll(".lost-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("action-btn")) return;
      const id = card.dataset.id;
      openDetailModal(id);
    });
  });

  // 수정 버튼 (페이지 이동)
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      location.href = `lost_items.html?edit=${id}`;
    });
  });

  // 삭제 버튼 (직접 삭제)
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      if (!auth.currentUser) {
        return alert("로그인이 필요합니다.");
      }

      if (!confirm("정말로 삭제하시겠습니까?")) return;

      const id = e.target.dataset.id;

      try {
        await deleteDoc(doc(db, "lostItems", id));
        alert("삭제되었습니다.");
      } catch (err) {
        console.error("삭제 실패:", err);
        // ✅ [추가됨] 권한 에러 처리
        if (err.code === 'permission-denied') {
            alert("삭제 권한이 없습니다. (본인이 작성한 글 또는 관리자만 삭제 가능)");
        } else {
            alert("삭제 중 오류가 발생했습니다.");
        }
      }
    });
  });
}

/* 📂 상세 모달 열기 */
function openDetailModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;

  const imagesHtml =
    item.imageUrls.length > 0
      ? `<div class="detail-photos">` +
        item.imageUrls.map(url =>
          `<img src="${url}" onclick="window.openPhoto('${url}')">`
        ).join("") +
        `</div>`
      : `<p style="color:#94A3B8; font-size:13px;">등록된 사진이 없습니다.</p>`;

  detailContent.innerHTML = `
    <h3 class="detail-title">${item.building} ${item.room}호</h3>
    <div class="detail-meta">
      등록일: ${formatDate(item.createdAt)} <br>
      등록자: ${item.createdBy}
    </div>
    <div class="detail-desc">${item.description}</div>

    <h4 style="font-size:13px; color:#2C3E50; margin-bottom:10px; font-weight:700;">PHOTOS</h4>
    ${imagesHtml}

    <div class="modal-edit-section">
      <label>상태 변경</label>
      <select id="modalStatusSelect">
        <option value="보관중" ${item.status === "보관중" ? "selected" : ""}>보관중</option>
        <option value="회수" ${item.status === "회수" ? "selected" : ""}>회수</option>
        <option value="폐기" ${item.status === "폐기" ? "selected" : ""}>폐기</option>
      </select>

      <label>관리자 메모</label>
      <textarea id="modalMemoInput" rows="3">${item.memo || ""}</textarea>

      <button class="btn-save-modal" id="modalSaveBtn" data-id="${item.id}">저장하기</button>
    </div>
  `;

  const saveBtn = document.getElementById("modalSaveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      if (!auth.currentUser) {
        return alert("로그인이 필요합니다.");
      }

      const newStatus = document.getElementById("modalStatusSelect").value;
      const newMemo = document.getElementById("modalMemoInput").value;
      const docId = e.target.dataset.id;

      try {
        await updateDoc(doc(db, "lostItems", docId), {
          status: newStatus,
          memo: newMemo
        });
        alert("저장되었습니다.");
        detailModal.style.display = "none";
      } catch (err) {
        console.error("저장 실패:", err);
        // ✅ [추가됨] 권한 에러 처리
        if (err.code === 'permission-denied') {
            alert("수정 권한이 없습니다. (본인이 작성한 글 또는 관리자만 수정 가능)");
        } else {
            alert("저장 중 오류가 발생했습니다.");
        }
      }
    });
  }

  detailModal.style.display = "flex";
}

/* 🔍 사진 확대 */
window.openPhoto = (url) => {
  const modalImg = document.getElementById("modalImg");
  const photoModal = document.getElementById("photoModal");
  
  if (modalImg && photoModal) {
    modalImg.src = url;
    photoModal.style.display = "flex";
  }
};

/* 모달 닫기 */
if(closeDetailModalBtn) {
    closeDetailModalBtn.addEventListener("click", () => {
        detailModal.style.display = "none";
    });
}

if(photoModal) {
    photoModal.addEventListener("click", () => {
        photoModal.style.display = "none";
    });
}

if(detailModal) {
    detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) detailModal.style.display = "none";
    });
}

/* 필터 */
if(filterBtn) filterBtn.addEventListener("click", renderList);
if(searchInput) {
    searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") renderList();
    });
}

if(resetBtn) {
    resetBtn.addEventListener("click", () => {
        filterBuilding.value = "";
        filterStatus.value = "";
        searchInput.value = "";
        renderList();
    });
}