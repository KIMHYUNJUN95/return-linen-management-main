// ========================================
// 🧰 HARU Schedule Form Controller
// Design System: Tokyo Day Bright
// Logic: Auto Room List, Default Cycles, Firestore Write
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔴 1. Firebase Initialization (Safe Handling)
let firebaseConfig = {};
if (window.__firebase_config) {
  try {
    firebaseConfig = JSON.parse(window.__firebase_config);
  } catch (e) {
    console.error("Firebase config parsing error:", e);
  }
}

let app, auth, db;
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    // Dummy Init to prevent crash if config is missing
    auth = { onAuthStateChanged: () => {} };
    db = {};
}

/* ========================================
   📦 DOM Elements (ID 매칭 보완)
======================================== */
// HTML ID와 JS 변수명이 일치하는지 확인하며, 혹시 모를 구버전 ID도 대비합니다.
const buildingEl = document.getElementById("buildingSelect") || document.getElementById("building");
const roomEl = document.getElementById("roomSelect") || document.getElementById("room");
const taskEl = document.getElementById("taskSelect") || document.getElementById("taskName");
const cycleEl = document.getElementById("intervalMonths") || document.getElementById("cycleDays");
const startEl = document.getElementById("startDate") || document.getElementById("firstDate");
const noteEl = document.getElementById("notes");
const btnSave = document.getElementById("saveBtn");
const btnCancel = document.getElementById("cancelBtn");

let currentUser = null;

/* ========================================
   🔐 Auth Check
======================================== */
if (auth && typeof auth.onAuthStateChanged === 'function') {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        alert("로그인 후 이용 가능합니다.");
        location.href = "index.html"; 
      } else {
        currentUser = user;
      }
    });
}

/* ========================================
   🏢 Building - Room List Mapping
======================================== */
const buildingRooms = {
  "아라키초A": ["201","202","301","302","401","402","501","502","602","701","702"],
  "아라키초B": ["101","102","201","202","301","302","401","402"],
  "가부키초": ["202","203","302","303","402","403","502","603","802","803"],
  "다카다노바바": ["2","3","4","5","6","7","8","9"],
  "다이쿄초": ["B01","B02","101","102","201","202","301"],
  "오쿠보1": [],
  "오쿠보2": [],
  "오쿠보4": []
};

if (buildingEl) {
  buildingEl.addEventListener("change", () => {
    const val = buildingEl.value;
    const rooms = buildingRooms[val] || [];
    
    // Reset Room Select
    if (roomEl) {
        roomEl.innerHTML = `<option value="" selected disabled>객실 선택</option>`;
        
        rooms.forEach((r) => {
          const opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r;
          roomEl.appendChild(opt);
        });
        
        // Enable/Disable based on room availability
        roomEl.disabled = rooms.length === 0;
    }
  });
}

/* ========================================
   🧾 Default Cycle Settings
======================================== */
const defaultCycles = {
  "에어컨필터": 1,
  "바퀴치약/바퀴캡슐": 6,
  "제습제 교체": 3,
  "탈취제": 3,
  "왁스작업": 12,
  "제초작업": 2,
  "환기구 청소": 12,
  "오염된 매트리스/카페트/이불": 0,
  "정수기 필터 교체": 6,
  "선반 보수": 0,
};

if (taskEl && cycleEl) {
  taskEl.addEventListener("change", () => {
    const name = taskEl.value;
    if (defaultCycles[name] !== undefined) {
      cycleEl.value = defaultCycles[name];
    }
  });
}

/* ========================================
   💾 Firestore Save Logic
======================================== */
if (btnSave) {
  btnSave.addEventListener("click", async (e) => {
    e.preventDefault(); // Form submit 방지

    // 요소 존재 여부 재확인 (Null Safety)
    if (!buildingEl || !taskEl || !startEl) {
        console.error("Critical form elements are missing.");
        alert("페이지 로딩 중 오류가 발생했습니다. 새로고침 해주세요.");
        return;
    }

    if (!db || !firebaseConfig.apiKey) {
        alert("데이터베이스 연결에 실패했습니다.");
        return;
    }

    // 값 읽기 (Null check 포함)
    const building = buildingEl.value;
    const room = roomEl ? roomEl.value : "-";
    const task = taskEl.value;
    const cycle = cycleEl ? Number(cycleEl.value) : 0;
    const startDate = startEl.value;
    const note = noteEl ? noteEl.value.trim() : "";

    if (!building || !task || !startDate) {
      alert("필수 항목(건물, 작업, 날짜)을 모두 입력해주세요.");
      return;
    }

    // ✅ 최초 등록 시: 시작일(startDate)을 다음 예정일(nextDue)로 설정
    const nextDue = startDate;

    try {
      await addDoc(collection(db, "maintenance_schedule"), {
        building,
        room: room || "-",
        taskName: task,
        cycleMonths: cycle || 0,
        note,
        status: "upcoming", // 초기 상태: 예정
        startDate,
        nextDueDate: nextDue, // 📌 표준 필드명 사용
        lastDoneDate: null,   // 📌 표준 필드명 사용
        createdBy: currentUser?.email || "unknown",
        timestamp: serverTimestamp(),
      });

      alert("✅ 작업이 등록되었습니다.");
      location.href = "schedule_dashboard.html";
    } catch (err) {
      console.error("🚨 등록 오류:", err);
      alert("등록 중 오류가 발생했습니다.");
    }
  });
}

/* ========================================
   ❌ Cancel Logic
======================================== */
if (btnCancel) {
  btnCancel.addEventListener("click", () => {
    if (confirm("작업 등록을 취소하시겠습니까?")) {
      location.href = "schedule_dashboard.html";
    }
  });
}