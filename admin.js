// ========================================
// 👨‍💼 HARU Admin Dashboard
// ========================================

import { db } from "./storage.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const totalUsersEl = document.getElementById("totalUsers");
const totalOrdersEl = document.getElementById("totalOrders");
const totalNoticesEl = document.getElementById("totalNotices");
const totalLogsEl = document.getElementById("totalLogs");

// 통계 로드
async function loadStats() {
  try {
    // 주문 수
    const ordersSnap = await getDocs(collection(db, "orders"));
    totalOrdersEl.textContent = ordersSnap.size;

    // 공지 수
    const noticesSnap = await getDocs(collection(db, "notices"));
    totalNoticesEl.textContent = noticesSnap.size;

    // 근무 기록 수
    const logsSnap = await getDocs(collection(db, "worklogs"));
    totalLogsEl.textContent = logsSnap.size;

    // 사용자 수는 Firebase Auth를 통해 얻을 수 없으므로 임시로 표시
    totalUsersEl.textContent = "-";

  } catch (err) {
    console.error("❌ 통계 로드 오류:", err);
  }
}

// 초기 로드
loadStats();
