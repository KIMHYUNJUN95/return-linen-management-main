// ========================================
// 📢 HARU Notice Popup (Firebase-safe)
// ========================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("🚀 [Notice Popup] Loaded");

// ----------------------------------------
// 1) Firebase Config
// ----------------------------------------
let firebaseConfig = {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.firebasestorage.app",
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// HTML Inject Config 우선 적용
try {
  if (typeof window.__firebase_config === "string") {
    const parsed = JSON.parse(window.__firebase_config);
    if (parsed.apiKey) firebaseConfig = parsed;
  }
} catch (e) {
  console.warn("⚠ Config parse failed");
}

// ----------------------------------------
// 2) Firebase Initialize (Duplicate 방지)
// ----------------------------------------
let app = null;
let db = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("🔥 Firebase Initialized (new)");
  } else {
    app = getApps()[0]; // 이미 있는 앱 재사용
    console.log("♻️ Firebase Reused Existing App");
  }
  db = getFirestore(app);
} catch (e) {
  console.error("❌ Firebase Init Error:", e);
}

// ----------------------------------------
// 3) 모달 생성 (디자인 수정됨: White Post-it Style)
// ----------------------------------------
function createNoticeModal() {
  if (document.getElementById("noticeModalGlobal")) return;

  const style = document.createElement("style");
  style.textContent = `
    /* 배경 블러 처리 */
    .notice-modal-bg {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4); /* 조금 더 투명하고 모던하게 */
      backdrop-filter: blur(4px);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    /* 포스트잇 컨셉의 흰색 카드 */
    .notice-card {
      background: #ffffff;
      width: 90%;
      max-width: 420px; /* 너무 넓지 않게 조정 */
      border: 1px solid #E2E8F0; /* 테두리 아주 연하게 */
      border-radius: 2px; /* 포스트잇 느낌 (살짝 둥글거나 각지게) */
      box-shadow: 0 15px 40px rgba(0,0,0,0.15); /* 부드러운 그림자 */
      animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Noto Sans KR', sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* 헤더: 빨간색 제거 -> 심플한 타이틀 */
    .notice-header {
      background: #ffffff;
      padding: 24px 24px 12px 24px;
      color: #1e293b; /* HARU Navy Dark */
      font-size: 18px;
      font-weight: 800;
      line-height: 1.4;
      border-bottom: none; /* 선 제거 */
    }

    /* 본문: 여백 확보 */
    .notice-body {
      padding: 0 24px 24px 24px;
      font-size: 14px;
      color: #475569; /* 가독성 좋은 회색 */
      white-space: pre-wrap;
      line-height: 1.6;
      max-height: 300px;
      overflow-y: auto;
    }

    /* 푸터: 버튼 영역 */
    .notice-footer {
      padding: 0 24px 24px 24px;
      background: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: none;
    }

    /* 닫기 버튼: 진한 네이비 포인트 */
    .notice-close-btn {
      background: #1e293b;
      color: white;
      padding: 8px 20px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 2px;
      transition: opacity 0.2s;
    }
    .notice-close-btn:hover {
      opacity: 0.9;
    }

    /* 체크박스 버튼: 가로 정렬 오류 해결 */
    .notice-check-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 12px;
      color: #94A3B8; /* 연한 회색 */
      display: flex;
      align-items: center; /* 수직 중앙 정렬 */
      gap: 6px; /* 체크박스와 글자 사이 간격 */
      padding: 0;
      white-space: nowrap; /* 글자 줄바꿈 절대 금지 */
    }
    
    /* 체크박스 자체 스타일 미세 조정 */
    .notice-check-btn input[type="checkbox"] {
      margin: 0;
      width: 14px;
      height: 14px;
      cursor: pointer;
    }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;

  const modal = document.createElement("div");
  modal.id = "noticeModalGlobal";
  modal.className = "notice-modal-bg";

  // HTML 구조는 유지하되 클래스 스타일이 변경됨
  modal.innerHTML = `
    <div class="notice-card">
      <div class="notice-header" id="noticeTitleGlobal"></div>
      <div class="notice-body" id="noticeContentGlobal"></div>
      <div class="notice-footer">
        <button class="notice-check-btn" id="noticeHideTodayBtn">
          <input type="checkbox" style="pointer-events:none;"> 오늘 하루 보지 않기
        </button>
        <button class="notice-close-btn" id="noticeCloseBtn">닫기</button>
      </div>
    </div>
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  document.getElementById("noticeCloseBtn").onclick = () => {
    modal.style.display = "none";
  };
  
  document.getElementById("noticeHideTodayBtn").onclick = () => {
    if (window.__CURRENT_NOTICE_ID) {
      const today = new Date().toDateString();
      localStorage.setItem("notice_closed_" + window.__CURRENT_NOTICE_ID, today);
    }
    modal.style.display = "none";
  };
}

// ----------------------------------------
// 4) Timestamp 보정
// ----------------------------------------
function safeTimestamp(t) {
  if (!t) return 0;
  if (t.seconds) return t.seconds;
  if (typeof t === "number") return t;
  return 0;
}

// ----------------------------------------
// 5) 실행
// ----------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  if (!db) return;

  try {
    const q = query(
      collection(db, "notices"),
      where("important", "==", true)
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    const notices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notices.sort((a,b) => safeTimestamp(b.createdAt) - safeTimestamp(a.createdAt));

    const latest = notices[0];
    window.__CURRENT_NOTICE_ID = latest.id;

    const today = new Date().toDateString();
    if (localStorage.getItem("notice_closed_" + latest.id) === today) return;

    createNoticeModal();

    // 제목에 [중요] 말머리 추가
    document.getElementById("noticeTitleGlobal").textContent = "[중요] " + latest.title;

    document.getElementById("noticeContentGlobal").textContent = latest.content;

    document.getElementById("noticeModalGlobal").style.display = "flex";

  } catch (e) {
    console.error("❌ Notice Popup Error:", e);
  }
});