// ========================================
// 🧰 HARU 작업 등록 (주기 + 일정 계산 + 초기 상태 upcoming)
// ========================================

import { db, auth } from "./storage.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ========================================
   📦 DOM 요소
======================================== */
const buildingEl = document.getElementById("buildingSelect");
const roomEl = document.getElementById("roomSelect");
const taskEl = document.getElementById("taskSelect");
const cycleEl = document.getElementById("intervalMonths");
const startEl = document.getElementById("startDate");
const noteEl = document.getElementById("notes");
const btnSave = document.getElementById("saveBtn");
const btnCancel = document.getElementById("cancelBtn");

let currentUser = null;

/* ========================================
   🔐 로그인 확인
======================================== */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("로그인 후 이용 가능합니다.");
    location.href = "login.html";
  } else {
    currentUser = user;
  }
});

/* ========================================
   🏢 건물별 객실 리스트
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
    roomEl.innerHTML = `<option value="">객실 선택</option>`;
    rooms.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      roomEl.appendChild(opt);
    });
    roomEl.disabled = rooms.length === 0;
  });
}

/* ========================================
   🧾 기본 주기 자동설정
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

if (taskEl) {
  taskEl.addEventListener("change", () => {
    const name = taskEl.value;
    if (defaultCycles[name] !== undefined) {
      cycleEl.value = defaultCycles[name];
    }
  });
}

/* ========================================
   💾 Firestore 저장 (수정 완료)
======================================== */
if (btnSave) {
  btnSave.addEventListener("click", async () => {
    const building = buildingEl.value.trim();
    const room = roomEl.value.trim();
    const task = taskEl.value.trim();
    const cycle = Number(cycleEl.value);
    const startDate = startEl.value;
    const note = noteEl.value.trim();

    if (!building || !task || !startDate) {
      alert("필수 항목(건물, 작업, 날짜)을 모두 입력해주세요.");
      return;
    }

    // ✅ 최초 등록 시: 오늘(또는 지정 startDate) 일정만 등록
    // 다음 주기(nextDue)는 완료 처리 시 자동 생성됨
    const nextDue = startDate;

    try {
      await addDoc(collection(db, "maintenance_schedule"), {
        building,
        room: room || "-",
        taskName: task,
        cycleMonths: cycle || 0,
        note,
        status: "upcoming", // 항상 예정 상태로 시작
        startDate,
        nextDue, // ✅ 시작일 그대로 저장
        lastDone: null,
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
   ❌ 취소 버튼
======================================== */
if (btnCancel) {
  btnCancel.addEventListener("click", () => {
    if (confirm("작업 등록을 취소하시겠습니까?")) {
      location.href = "schedule_dashboard.html";
    }
  });
}
