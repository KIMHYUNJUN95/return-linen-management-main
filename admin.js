// ========================================
// 👨‍💼 HARU 관리자 대시보드 로직
// Theme: Tokyo Day Bright (Minimal)
// ========================================

import { initHeaderMenu } from "./header.js";
import { auth, db } from "./storage.js";
import { 
  collection, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ 1. 헤더 로드 (필수: HTML 인라인 스크립트 대체)
document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html")
    .then(r => r.text())
    .then(h => {
      const headerPlaceholder = document.getElementById("header-placeholder");
      if (headerPlaceholder) {
        headerPlaceholder.innerHTML = h;
        initHeaderMenu();
      }
    })
    .catch(err => console.error("헤더 로드 실패:", err));
});

// DOM 요소 참조
const totalUsersEl = document.getElementById("totalUsers");
const totalOrdersEl = document.getElementById("totalOrders");
const totalNoticesEl = document.getElementById("totalNotices");
const totalLogsEl = document.getElementById("totalLogs");

// 🔐 로그인 상태 확인 및 데이터 로드
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 로그인 된 경우 통계 로드 시작
    loadStats();
  } else {
    // 비로그인 시 로그인 페이지로 이동 (보안)
    // alert("로그인이 필요합니다."); // UX를 위해 alert 생략 가능
    // location.href = "login.html";
  }
});

// 📊 통계 데이터 로드 함수
async function loadStats() {
  try {
    // 로딩 상태 표시 (0으로 초기화)
    if(totalUsersEl) totalUsersEl.textContent = "0";
    if(totalOrdersEl) totalOrdersEl.textContent = "0";
    if(totalNoticesEl) totalNoticesEl.textContent = "0";
    if(totalLogsEl) totalLogsEl.textContent = "0";

    // 1. 주문 수
    const ordersSnap = await getDocs(collection(db, "orders"));
    animateValue(totalOrdersEl, 0, ordersSnap.size, 1000);

    // 2. 공지 수
    const noticesSnap = await getDocs(collection(db, "notices"));
    animateValue(totalNoticesEl, 0, noticesSnap.size, 1000);

    // 3. 근무 기록 수
    const logsSnap = await getDocs(collection(db, "worklogs"));
    animateValue(totalLogsEl, 0, logsSnap.size, 1000);

    // 4. 사용자 수 (Firestore users 컬렉션 카운트)
    // Auth만으로는 전체 수를 알 수 없으므로 Firestore users 컬렉션을 활용
    const usersSnap = await getDocs(collection(db, "users"));
    animateValue(totalUsersEl, 0, usersSnap.size, 1000);

  } catch (err) {
    console.error("❌ 통계 로드 오류:", err);
    // 에러 발생 시 '-' 표시로 시각적 피드백
    if(totalUsersEl) totalUsersEl.textContent = "-";
    if(totalOrdersEl) totalOrdersEl.textContent = "-";
    if(totalNoticesEl) totalNoticesEl.textContent = "-";
    if(totalLogsEl) totalLogsEl.textContent = "-";
  }
}

// 🔢 숫자 카운트 애니메이션 (고급스러운 UX)
function animateValue(obj, start, end, duration) {
  if (!obj) return;
  
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // 정수로 변환하여 표시 (천단위 콤마 추가)
    obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}