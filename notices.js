// ========================================
// 📢 HARU Notices (공지사항)
// ========================================

import { db } from "./storage.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const noticesList = document.getElementById("noticesList");
const emptyState = document.getElementById("emptyState");
const noticeModal = document.getElementById("noticeModal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const modalMeta = document.getElementById("modalMeta");

// 날짜 포맷
function formatDate(ts) {
  if (!ts) return "-";
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("ko-KR", {
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

// 공지 렌더링
function renderNotices(notices) {
  if (notices.length === 0) {
    noticesList.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  noticesList.style.display = "block";
  emptyState.style.display = "none";

  noticesList.innerHTML = notices.map(notice => {
    const important = notice.important ? ' important' : '';
    return `
      <div class="notice-card${important}" onclick="viewNotice('${notice.id}')">
        <div class="notice-header">
          <div style="flex:1;">
            <div class="notice-title">
              ${notice.important ? '🔴 ' : ''}${notice.title}
            </div>
            <div class="notice-meta">
              ${formatDate(notice.createdAt)} · ${notice.createdBy || "관리자"}
            </div>
          </div>
          ${notice.important ? '<span class="badge badge-error">중요</span>' : ''}
        </div>
        <div class="notice-preview">${notice.content}</div>
      </div>
    `;
  }).join('');
}

// 공지 로드
async function loadNotices() {
  try {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    renderNotices(notices);
    window.allNotices = notices;

    // ✅ 접속할 때마다 자동 팝업
    showAutoNotice(notices);
  } catch (err) {
    console.error("❌ 공지 로드 오류:", err);
  }
}

// 공지 상세보기
window.viewNotice = (id) => {
  const notice = window.allNotices.find(n => n.id === id);
  if (!notice) return;

  modalTitle.textContent = notice.title;
  modalContent.innerHTML = notice.content.replace(/\n/g, '<br>');
  modalMeta.textContent = `작성: ${notice.createdBy || "관리자"} · ${formatDate(notice.createdAt)}`;
  noticeModal.style.display = "flex";
};

// 모달 닫기
window.closeModal = () => {
  noticeModal.style.display = "none";
};

// 배경 클릭 시 닫기
noticeModal.addEventListener("click", (e) => {
  if (e.target === noticeModal) {
    closeModal();
  }
});

/* =====================================================
   📢 자동 공지 팝업 (매 접속 시마다)
   - 중요공지 우선 → 없으면 최신 공지
===================================================== */
function showAutoNotice(notices) {
  if (!Array.isArray(notices) || notices.length === 0) return;

  // 중요공지 우선
  const importantNotice = notices.find(n => n.important);
  const target = importantNotice || notices[0];
  if (!target) return;

  modalTitle.textContent = target.title;
  modalContent.innerHTML = target.content.replace(/\n/g, '<br>');
  modalMeta.textContent = `작성: ${target.createdBy || "관리자"} · ${formatDate(target.createdAt)}`;
  noticeModal.style.display = "flex";
}

// 초기 로드
loadNotices();
