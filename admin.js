// ========================================
// 👨‍💼 HARU 관리자 대시보드 로직
// Theme: Tokyo Day Bright (Minimal)
// ========================================

import { initHeaderMenu } from "./header.js";
import { auth, db } from "./storage.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
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

// ========================================
// 🚨 점검 모드 제어 시스템
// ========================================

const maintenanceBtn = document.getElementById("maintenanceBtn");
const maintenanceModal = document.getElementById("maintenanceModal");
const btnStartMaintenance = document.getElementById("btnStartMaintenance");
const btnEndMaintenance = document.getElementById("btnEndMaintenance");
const btnCancelModal = document.getElementById("btnCancelModal");
const statusBox = document.getElementById("statusBox");
const statusText = document.getElementById("statusText");
const endDateInput = document.getElementById("endDate");
const maintenanceMsgInput = document.getElementById("maintenanceMsg");

const MAINTENANCE_DOC_PATH = doc(db, "systemSettings", "maintenance");

// 모달 열기
if (maintenanceBtn) {
  maintenanceBtn.addEventListener("click", async () => {
    await loadMaintenanceStatus();
    maintenanceModal.style.display = "flex";
  });
}

// 모달 닫기
if (btnCancelModal) {
  btnCancelModal.addEventListener("click", () => {
    maintenanceModal.style.display = "none";
  });
}

// 점검 시작
if (btnStartMaintenance) {
  btnStartMaintenance.addEventListener("click", async () => {
    const endDate = endDateInput.value;
    const message = maintenanceMsgInput.value.trim();

    if (!endDate) {
      alert("점검 종료 일시를 선택해주세요.");
      return;
    }

    if (!message) {
      alert("점검 안내 메시지를 입력해주세요.");
      return;
    }

    if (!confirm("정말 점검 모드를 시작하시겠습니까?\n일반 사용자는 접속이 차단됩니다.")) {
      return;
    }

    try {
      await setDoc(MAINTENANCE_DOC_PATH, {
        isActive: true,
        startTime: serverTimestamp(),
        endTime: new Date(endDate).toISOString(),
        message: message,
        updatedAt: serverTimestamp()
      });

      alert("✅ 점검 모드가 시작되었습니다.\n관리자만 접속 가능합니다.");
      await loadMaintenanceStatus();
    } catch (err) {
      console.error("점검 모드 시작 오류:", err);
      alert("점검 모드 시작 중 오류가 발생했습니다.");
    }
  });
}

// 점검 종료
if (btnEndMaintenance) {
  btnEndMaintenance.addEventListener("click", async () => {
    if (!confirm("점검 모드를 종료하시겠습니까?\n모든 사용자가 접속 가능해집니다.")) {
      return;
    }

    try {
      await setDoc(MAINTENANCE_DOC_PATH, {
        isActive: false,
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert("✅ 점검 모드가 종료되었습니다.");
      await loadMaintenanceStatus();
    } catch (err) {
      console.error("점검 모드 종료 오류:", err);
      alert("점검 모드 종료 중 오류가 발생했습니다.");
    }
  });
}

// 현재 점검 상태 로드
async function loadMaintenanceStatus() {
  try {
    const docSnap = await getDoc(MAINTENANCE_DOC_PATH);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const isActive = data.isActive || false;

      if (isActive) {
        // 점검 중
        statusBox.className = "maintenance-status active";
        statusText.textContent = "⚠️ 점검 중";
        btnStartMaintenance.style.display = "none";
        btnEndMaintenance.style.display = "block";

        // 기존 값 표시
        if (data.endTime) {
          const endDate = new Date(data.endTime);
          const formatted = endDate.toLocaleString("sv-SE").replace(" ", "T").slice(0, 16);
          endDateInput.value = formatted;
        }
        if (data.message) {
          maintenanceMsgInput.value = data.message;
        }
      } else {
        // 정상 운영
        statusBox.className = "maintenance-status inactive";
        statusText.textContent = "✅ 정상 운영 중";
        btnStartMaintenance.style.display = "block";
        btnEndMaintenance.style.display = "none";
      }
    } else {
      // 문서 없음 (초기 상태)
      statusBox.className = "maintenance-status inactive";
      statusText.textContent = "✅ 정상 운영 중";
      btnStartMaintenance.style.display = "block";
      btnEndMaintenance.style.display = "none";
    }
  } catch (err) {
    console.error("점검 상태 로드 오류:", err);
  }
}