// ========================================
// 📢 HARU Global Notice Popup (Important Only)
// Design System: Tokyo Day Bright
// Function: Auto-show LATEST IMPORTANT notice (Per-Notice Control)
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. Firebase Initialization
console.log("🚀 [Notice Popup] Script Start");

let firebaseConfig = {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.firebasestorage.app",
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// HTML 설정 우선
if (window.__firebase_config) {
  try {
    const envConfig = JSON.parse(window.__firebase_config);
    if (envConfig.apiKey) firebaseConfig = envConfig;
  } catch (e) {
    console.warn("Config parse failed");
  }
}

let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    db = null;
}

// 현재 표시 중인 공지 ID 저장용
let currentNoticeId = null;

// ========================================
// 🎨 UI Generation
// ========================================

function ensureNoticeModal() {
  if (document.getElementById("noticeModalGlobal")) return;

  const style = document.createElement("style");
  style.textContent = `
    .notice-modal-global {
      position: fixed; inset: 0; background: rgba(44, 62, 80, 0.5); backdrop-filter: blur(3px);
      display: none; justify-content: center; align-items: center; z-index: 9999; animation: fadeIn 0.3s ease;
    }
    .notice-card-global {
      background: #FFFFFF; border: 1px solid #E74C3C; padding: 0; max-width: 480px; width: 90%;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2); position: relative; animation: slideUp 0.3s ease;
      font-family: 'Inter', 'Noto Sans KR', sans-serif;
    }
    .notice-header-global {
      padding: 16px 24px; background: #E74C3C; display: flex; justify-content: space-between; align-items: center;
    }
    .notice-card-global h2 {
      margin: 0; font-size: 1rem; font-weight: 800; color: #FFFFFF; letter-spacing: 0.05em; text-transform: uppercase;
      display: flex; align-items: center; gap: 8px;
    }
    .notice-card-global h2::before { content: '📢'; font-size: 1.2rem; }
    .notice-body-global {
      padding: 24px; font-size: 0.95rem; line-height: 1.6; color: #2C3E50; white-space: pre-wrap; max-height: 50vh; overflow-y: auto;
    }
    .notice-footer-global {
      padding: 12px 24px; border-top: 1px solid #F1F5F9; background: #F8FAFC; text-align: right;
      display: flex; justify-content: space-between; align-items: center;
    }
    .btn-close-global {
      background: #2C3E50; color: #FFFFFF; border: none; padding: 8px 20px; font-weight: 700; font-size: 0.8rem;
      cursor: pointer; transition: background 0.2s; letter-spacing: 0.05em;
    }
    .btn-close-global:hover { background: #34495E; }
    .btn-check-global {
        background: transparent; color: #64748B; border: none; padding: 0; font-weight: 500; font-size: 0.8rem;
        cursor: pointer; display: flex; align-items: center; gap: 6px;
    }
    .btn-check-global:hover { color: #2C3E50; text-decoration: underline; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `;

  const overlay = document.createElement("div");
  overlay.id = "noticeModalGlobal";
  overlay.className = "notice-modal-global";
  
  overlay.innerHTML = `
    <div class="notice-card-global">
      <div class="notice-header-global">
        <h2 id="noticeTitleGlobal">IMPORTANT NOTICE</h2>
      </div>
      <div class="notice-body-global" id="noticeContentGlobal"></div>
      <div class="notice-footer-global">
        <button id="closeForeverBtn" class="btn-check-global">
          <input type="checkbox" style="pointer-events:none;"> 오늘 하루 보지 않기
        </button>
        <button id="closeNoticeBtnGlobal" class="btn-close-global">CLOSE</button>
      </div>
    </div>
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  const close = () => { overlay.style.display = "none"; };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.getElementById("closeNoticeBtnGlobal").addEventListener("click", close);
  
  // ✅ "오늘 하루 보지 않기" (글 ID별 저장)
  document.getElementById("closeForeverBtn").addEventListener("click", () => {
      if (currentNoticeId) {
          const today = new Date().toDateString();
          // 키를 'notice_closed_{ID}' 형식으로 저장하여 글마다 다르게 처리
          localStorage.setItem("notice_closed_" + currentNoticeId, today);
          console.log(`[Notice Popup] Hiding notice ${currentNoticeId} until tomorrow.`);
      }
      close();
  });
}

// ========================================
// 🚀 Main Logic
// ========================================

window.addEventListener("DOMContentLoaded", async () => {
  if (!db) return;

  try {
    // 1. 중요 공지 쿼리 (최신 1개)
    const q = query(
      collection(db, "notices"), 
      where("important", "==", true)
    );
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
        console.log("ℹ️ [Notice Popup] No important notices found.");
        return;
    }

    // 최신순 정렬 (Client-side sort to avoid index issues)
    const notices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    notices.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
    });

    const target = notices[0];
    
    // ✅ 2. 로컬 스토리지 체크 (ID별 확인)
    const today = new Date().toDateString();
    const closedDate = localStorage.getItem("notice_closed_" + target.id);
    
    if (closedDate === today) {
        console.log(`[Notice Popup] Notice ${target.id} hidden by user preference (Today)`);
        return; 
    }

    // 3. UI 생성
    ensureNoticeModal();
    
    // 현재 표시할 공지 ID 저장 (닫기 버튼용)
    currentNoticeId = target.id;

    const titleEl = document.getElementById("noticeTitleGlobal");
    const contentEl = document.getElementById("noticeContentGlobal");

    if (titleEl) titleEl.textContent = `[중요] ${target.title}`;
    if (contentEl) contentEl.textContent = target.content;

    // 4. 표시
    const modal = document.getElementById("noticeModalGlobal");
    if (modal) {
        modal.style.display = "flex";
    }

  } catch (err) {
    console.error("❌ [Notice Popup] Error:", err);
  }
});