// ========================================
// 📢 HARU Notices Admin Controller
// Design System: Tokyo Day Bright (Architectural, No Emoji)
// 👑 Admin Only: Create & Delete
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Config가 유효할 때만 초기화 진행
let app, auth, db;
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.warn("Initializing with dummy Firebase instance.");
    auth = { onAuthStateChanged: () => {} };
    db = {};
}

// 2. DOM Elements
const form = document.getElementById("noticeForm");
const noticesList = document.getElementById("noticesList");
const titleEl = document.getElementById("title");
const contentEl = document.getElementById("content");
const importantEl = document.getElementById("important");

// 👑 관리자 계정 이메일 목록 (하드코딩된 슈퍼 관리자 + 추가 관리자)
const ADMIN_EMAILS = [
  "rlaguswns95@haru-tokyo.com",
  "admin@haru.com"
];

// ========================================
// 🔐 Auth & Permission Check
// ========================================
if (auth && typeof auth.onAuthStateChanged === 'function') {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
        // 로그인이 안 된 경우 처리는 HTML 내 스크립트에서 담당하지만, 이중 체크
        if(form) form.style.display = "none";
        return;
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email);

    // 관리자만 작성폼 활성화
    if (!isAdmin) {
      if (form) form.style.display = "none";
      // 리스트는 볼 수 있게 할지, 아예 차단할지는 기획에 따름 (여기선 로드만 함)
    }

    // 공지 로드
    loadNotices(isAdmin);
  });
}

// ========================================
// 📝 Create Notice
// ========================================
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = titleEl.value.trim();
    const content = contentEl.value.trim();
    const important = importantEl.checked;
    const userName = auth?.currentUser?.displayName || "Admin";
    const userEmail = auth?.currentUser?.email || null;

    if (!title || !content) {
      alert("Please fill in both title and content.");
      return;
    }

    // 권한 이중 검사
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
      alert("Only admins can post notices.");
      return;
    }

    try {
      await addDoc(collection(db, "notices"), {
        title,
        content,
        important,
        createdBy: userName,
        userEmail,
        createdAt: serverTimestamp(),
      });

      alert("Notice posted successfully.");
      form.reset();
      await loadNotices(true); // 리스트 갱신
    } catch (err) {
      console.error("Error posting notice:", err);
      alert("Failed to post notice.");
    }
  });
}

// ========================================
// 📋 Load & Render Notices
// ========================================
async function loadNotices(isAdmin = false) {
  if (!noticesList) return;
  
  if (!db || !firebaseConfig.apiKey) {
      noticesList.innerHTML = '<div class="empty-state">Database connection error.</div>';
      return;
  }

  try {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      noticesList.innerHTML = `
        <div style="text-align: center; padding: 4rem 0; color: #64748B; border: 1px dashed #CBD5E1;">
          NO NOTICES FOUND
        </div>
      `;
      return;
    }

    const notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Tokyo Day Bright Style Rendering
    noticesList.innerHTML = notices.map(notice => {
        // 중요 표시
        const importantMark = notice.important 
            ? `<span style="color:#E74C3C; font-weight:700; font-size:0.8rem; margin-right:8px;">IMPORTANT</span>` 
            : ``;
        
        return `
          <div class="notice-item-admin" data-testid="notice-item-${notice.id}">
            <div class="notice-info">
              <h4>
                ${importantMark}${notice.title}
              </h4>
              <div class="notice-meta-text">
                <span style="font-weight:600;">DATE:</span> ${formatDate(notice.createdAt)} 
                <span style="margin: 0 8px; color:#CBD5E1;">|</span>
                <span style="font-weight:600;">WRITER:</span> ${notice.createdBy || "Admin"}
              </div>
              <p style="
                margin-top: 8px; 
                font-size: 0.9rem; 
                color: #64748B; 
                white-space: pre-wrap; 
                display: -webkit-box; 
                -webkit-line-clamp: 2; 
                -webkit-box-orient: vertical; 
                overflow: hidden;
              ">${notice.content}</p>
            </div>
            
            ${isAdmin ? `
              <div style="margin-left: 16px; flex-shrink: 0;">
                <button class="btn-delete" onclick="deleteNotice('${notice.id}')" data-testid="button-delete-${notice.id}">
                  DELETE
                </button>
              </div>` : ``}
          </div>
        `;
    }).join('');

  } catch (err) {
    console.error("Error loading notices:", err);
    noticesList.innerHTML = `<div style="text-align:center; padding:20px; color:#E74C3C;">Failed to load notices.</div>`;
  }
}

// ========================================
// 🗑 Delete Notice
// ========================================
window.deleteNotice = async (id) => {
  const user = auth.currentUser;
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    alert("Permission denied.");
    return;
  }

  if (!confirm("Are you sure you want to delete this notice?")) return;

  try {
    await deleteDoc(doc(db, "notices", id));
    alert("Notice deleted.");
    await loadNotices(true);
  } catch (err) {
    console.error("Error deleting notice:", err);
    alert("Failed to delete notice.");
  }
};

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