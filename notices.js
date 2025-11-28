// ========================================
// 📢 HARU Notices Controller
// Design System: Tokyo Day Bright (No Emoji, Architectural)
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔴 1. Firebase Initialization (Safe Handling)
let firebaseConfig = {};
if (window.__firebase_config) {
  try {
    firebaseConfig = JSON.parse(window.__firebase_config);
  } catch (e) {
    console.error("Firebase config parsing error:", e);
  }
} else {
  console.error("❌ __firebase_config is missing.");
}

// Config가 유효할 때만 초기화
let db;
if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} else {
    console.warn("Initializing with dummy DB to prevent crash.");
    db = {};
}

// 2. DOM Elements
const noticesList = document.getElementById("noticesList");
const emptyState = document.getElementById("emptyState");
const noticeModal = document.getElementById("noticeModal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const modalMeta = document.getElementById("modalMeta");

// ========================================
// 🛠 Helpers
// ========================================

function formatDate(ts) {
  if (!ts) return "-";
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch {
    return "-";
  }
}

// ========================================
// 🎨 Rendering
// ========================================

function renderNotices(notices) {
  if (!noticesList) return;

  if (notices.length === 0) {
    noticesList.style.display = "none";
    if(emptyState) emptyState.style.display = "block";
    return;
  }

  noticesList.style.display = "block";
  if(emptyState) emptyState.style.display = "none";

  noticesList.innerHTML = notices.map(notice => {
    // 중요 공지 클래스 처리 (CSS에서 스타일링)
    const importantClass = notice.important ? ' important' : '';
    
    return `
      <div class="notice-card${importantClass}" onclick="viewNotice('${notice.id}')">
        <div class="notice-header">
          <h3 class="notice-title">${notice.title}</h3>
        </div>
        <div class="notice-meta">
          <span>DATE: ${formatDate(notice.createdAt)}</span>
          <span>WRITER: ${notice.createdBy || "Admin"}</span>
        </div>
        <div class="notice-preview">${notice.content}</div>
      </div>
    `;
  }).join('');
}

// ========================================
// 📡 Data Loading
// ========================================

async function loadNotices() {
  if (!db || !db.type) return; // DB 미초기화 시 중단 (type 체크는 dummy db 구분용)

  try {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    renderNotices(notices);
    window.allNotices = notices;

    // ✅ 접속 시 자동 팝업 (중요 공지 우선)
    showAutoNotice(notices);
  } catch (err) {
    console.error("❌ 공지 로드 오류:", err);
    if(noticesList) noticesList.innerHTML = `<div style="text-align:center; padding:2rem; color:#E74C3C;">Failed to load notices.</div>`;
  }
}

// ========================================
// 🪄 Modal Logic
// ========================================

window.viewNotice = (id) => {
  if (!window.allNotices) return;
  const notice = window.allNotices.find(n => n.id === id);
  if (!notice) return;

  if(modalTitle) modalTitle.textContent = notice.title;
  if(modalContent) modalContent.innerHTML = notice.content.replace(/\n/g, '<br>');
  
  if(modalMeta) {
      modalMeta.innerHTML = `
        <span><strong>WRITER:</strong> ${notice.createdBy || "Admin"}</span>
        <span><strong>DATE:</strong> ${formatDate(notice.createdAt)}</span>
      `;
  }
  
  if(noticeModal) noticeModal.style.display = "flex";
};

// Global close function matches HTML onclick
window.closeModal = () => {
  if(noticeModal) noticeModal.style.display = "none";
};

// Close on background click
if(noticeModal) {
    noticeModal.addEventListener("click", (e) => {
      if (e.target === noticeModal) {
        closeModal();
      }
    });
}

// ========================================
// 📢 Auto Popup Logic
// ========================================

function showAutoNotice(notices) {
  if (!Array.isArray(notices) || notices.length === 0) return;

  // 세션 스토리지 체크 (이미 봤다면 스킵) -> 현재는 매번 뜨게 설정됨 (요청사항 반영)
  // const hasSeen = sessionStorage.getItem("notice_seen");
  // if (hasSeen) return;

  // 중요 공지 우선, 없으면 최신 공지
  const importantNotice = notices.find(n => n.important);
  const target = importantNotice || notices[0];
  
  if (!target) return;

  // 팝업 띄우기
  viewNotice(target.id);
  
  // sessionStorage.setItem("notice_seen", "true");
}

// Start
if (firebaseConfig.apiKey) {
    loadNotices();
}