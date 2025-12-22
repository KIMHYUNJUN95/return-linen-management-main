// ========================================
// 🚨 HARU 점검 모드 가드
// 모든 페이지에서 점검 상태를 체크하여
// 슈퍼 관리자가 아닌 경우 점검 페이지로 리다이렉트
// ========================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

console.log("🛡️ Maintenance Guard Loaded");

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
let auth = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("🔥 Firebase Initialized (new)");
  } else {
    app = getApps()[0];
    console.log("♻️ Firebase Reused Existing App");
  }
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("❌ Firebase Init Error:", e);
}

// ----------------------------------------
// 3) 슈퍼 관리자 이메일
// ----------------------------------------
const SUPER_ADMIN_EMAIL = "rlaguswns95@haru-tokyo.com";

// ----------------------------------------
// 4) 점검 모드 체크 제외 페이지
// ----------------------------------------
const EXCLUDED_PAGES = [
  "maintenance_notice.html",  // 점검 페이지 자체
  "index.html"                // 로그인 페이지
];

// 현재 페이지가 제외 대상인지 확인
function isExcludedPage() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  return EXCLUDED_PAGES.includes(currentPage);
}

// ----------------------------------------
// 5) 점검 모드 체크 함수
// ----------------------------------------
async function checkMaintenanceMode() {
  // 제외 페이지면 체크 안 함
  if (isExcludedPage()) {
    console.log("✅ Excluded page - maintenance check skipped");
    return;
  }

  if (!db) {
    console.warn("⚠️ DB not initialized - maintenance check skipped");
    return;
  }

  try {
    const maintenanceDoc = await getDoc(doc(db, "systemSettings", "maintenance"));

    if (!maintenanceDoc.exists()) {
      // 점검 문서 없음 = 정상 운영
      console.log("✅ No maintenance document - normal operation");
      return;
    }

    const data = maintenanceDoc.data();
    const isActive = data.isActive || false;

    if (!isActive) {
      // 점검 모드 비활성화 = 정상 운영
      console.log("✅ Maintenance mode inactive - normal operation");
      return;
    }

    // ⚠️ 점검 모드 활성화됨!
    console.log("🚨 Maintenance mode is ACTIVE");

    // 슈퍼 관리자인지 확인 (로그인 상태 체크)
    onAuthStateChanged(auth, (user) => {
      if (user && user.email === SUPER_ADMIN_EMAIL) {
        // 슈퍼 관리자는 접속 허용
        console.log("👑 Super admin detected - access granted");
        showAdminNotice(data);
      } else {
        // 일반 사용자는 점검 페이지로 리다이렉트
        console.log("🚫 Redirecting to maintenance page");
        window.location.href = "maintenance_notice.html";
      }
    });

  } catch (err) {
    console.error("❌ Maintenance check error:", err);
    // 에러 발생 시에도 정상 운영으로 간주 (안전장치)
  }
}

// ----------------------------------------
// 6) 관리자에게 점검 모드 알림 표시
// ----------------------------------------
function showAdminNotice(data) {
  // 이미 알림이 있으면 추가하지 않음
  if (document.getElementById("adminMaintenanceNotice")) return;

  const noticeHeight = 50; // 알림 바 높이

  const notice = document.createElement("div");
  notice.id = "adminMaintenanceNotice";
  notice.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #EF4444, #DC2626);
    color: white;
    padding: 12px 20px;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    z-index: 99999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: slideDown 0.3s ease-out;
    height: ${noticeHeight}px;
  `;

  const endTime = data.endTime ? new Date(data.endTime).toLocaleString("ko-KR") : "미정";
  notice.innerHTML = `
    <span style="margin-right: 10px;">🚨</span>
    <strong>점검 모드 활성화됨</strong>
    <span style="margin: 0 10px;">|</span>
    종료 예정: ${endTime}
    <span style="margin: 0 10px;">|</span>
    일반 사용자 접속 차단 중
  `;

  // 애니메이션 및 헤더 위치 조정
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideDown {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
    /* 헤더를 알림 바 아래로 이동 */
    .main-header {
      top: ${noticeHeight}px !important;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notice);

  // body padding 조정 (헤더 높이 + 알림 바 높이)
  const currentPadding = parseInt(getComputedStyle(document.body).paddingTop) || 0;
  document.body.style.paddingTop = (currentPadding + noticeHeight) + "px";
}

// ----------------------------------------
// 7) 페이지 로드 시 자동 실행
// ----------------------------------------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkMaintenanceMode);
} else {
  // 이미 로드됨
  checkMaintenanceMode();
}
