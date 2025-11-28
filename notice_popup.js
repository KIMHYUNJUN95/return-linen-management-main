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
// 3) 모달 생성
// ----------------------------------------
function createNoticeModal() {
  if (document.getElementById("noticeModalGlobal")) return;

  const style = document.createElement("style");
  style.textContent = `
    .notice-modal-bg {
      position: fixed;
      inset: 0;
      background: rgba(44, 62, 80, 0.5);
      backdrop-filter: blur(4px);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    .notice-card {
      background: white;
      width: 90%;
      max-width: 480px;
      border: 1px solid #E74C3C;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      animation: fadeIn 0.25s ease-out;
      font-family: 'Inter','Noto Sans KR',sans-serif;
    }
    .notice-header {
      background: #E74C3C;
      padding: 16px 20px;
      color: white;
      font-size: 16px;
      font-weight: 800;
    }
    .notice-body {
      padding: 20px;
      font-size: 14px;
      color: #334155;
      white-space: pre-wrap;
      line-height: 1.6;
      max-height: 240px;
      overflow-y: auto;
    }
    .notice-footer {
      padding: 14px 20px;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
    }
    .notice-close-btn {
      background: #2C3E50;
      color: white;
      padding: 8px 20px;
      border: none;
      font-weight: 700;
      cursor: pointer;
    }
    .notice-check-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 12px;
      color: #64748B;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `;

  const modal = document.createElement("div");
  modal.id = "noticeModalGlobal";
  modal.className = "notice-modal-bg";

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

    document.getElementById("noticeTitleGlobal").textContent = "[중요] " + latest.title;
    document.getElementById("noticeContentGlobal").textContent = latest.content;

    document.getElementById("noticeModalGlobal").style.display = "flex";

  } catch (e) {
    console.error("❌ Notice Popup Error:", e);
  }
});
