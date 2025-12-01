// ========================================
// ⏰ HARU Worklog Controller
// Design System: Tokyo Day Bright (Architectural, No Emoji)
// Logic: Firestore Persistence, Cleaning Task, Daily Reset
// ========================================

// ✅ [수정됨] storage.js에서 통합된 객체 가져오기 (중복 초기화 방지)
import { db, auth } from "./storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 2. DOM Elements
const $ = (id) => document.getElementById(id);

const clockInBtn = $("clockInBtn");
const clockOutBtn = $("clockOutBtn");
const breakStartBtn = $("breakStartBtn");
const breakEndBtn = $("breakEndBtn");
const cleanStartBtn = $("cleanStartBtn");
const cleanEndBtn = $("cleanEndBtn");
const resetWorkBtn = $("resetWorkBtn");

const clockInTimeEl = $("clockInTime");
const clockOutTimeEl = $("clockOutTime");
const breakStatusEl = $("breakStatus");
const totalBreakTimeEl = $("totalBreakTime");
const recentLogs = $("recentLogs");

// Modal Elements
const logModal = $("logModal");
const closeModalBtn = $("closeModalBtn");

// ========================================
// 🛠 Helpers
// ========================================

function todayKey(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hhmm(d) {
  if (!d) return "-";
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}H ${m}M`;
  return `${m}M`;
}

function stateDocRef(uid, dayKey) {
  return doc(db, "worklogState", `${uid}_${dayKey}`);
}

// ========================================
// 🎨 UI Rendering (Tokyo Day Bright Style)
// ========================================

// 상태에 따른 버튼 활성화/비활성화
function setButtonsByStatus(status) {
  const allBtns = [clockInBtn, clockOutBtn, breakStartBtn, breakEndBtn, cleanStartBtn, cleanEndBtn];
  allBtns.forEach(b => {
    if(b) b.disabled = true;
  });

  if (resetWorkBtn) resetWorkBtn.disabled = false;

  switch (status) {
    case "출근전":
      if(clockInBtn) clockInBtn.disabled = false;
      break;
    case "출근":
      if(clockOutBtn) clockOutBtn.disabled = false;
      if(breakStartBtn) breakStartBtn.disabled = false;
      if(cleanStartBtn) cleanStartBtn.disabled = false;
      break;
    case "휴식중":
      if(breakEndBtn) breakEndBtn.disabled = false;
      // 휴식 중에는 퇴근/청소 불가
      break;
    case "청소중":
      if(clockOutBtn) clockOutBtn.disabled = false; 
      if(cleanEndBtn) cleanEndBtn.disabled = false;
      break;
    case "청소완료":
      if(clockOutBtn) clockOutBtn.disabled = false;
      if(breakStartBtn) breakStartBtn.disabled = false; 
      break;
    case "퇴근":
      // All disabled except reset
      break;
  }
}

// 상태 칩 (Architectural Style)
function statusChip(status) {
  const map = {
    "출근전": { color: "#64748B", border: "#CBD5E1", label: "READY" },
    "출근":   { color: "#2980b9", border: "#2980b9", label: "WORKING" },
    "청소중": { color: "#D4AF37", border: "#D4AF37", label: "CLEANING" }, // Gold
    "청소완료": { color: "#27ae60", border: "#27ae60", label: "CLEAN DONE" },
    "퇴근":   { color: "#2C3E50", border: "#2C3E50", label: "OFF WORK" },
  };
  
  const s = map[status] || map["출근전"];
  
  return `
    <span style="
      display: inline-block;
      padding: 2px 8px;
      border: 1px solid ${s.border};
      color: ${s.color};
      font-weight: 700;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      background: #FFFFFF;
      text-transform: uppercase;
    ">${s.label}</span>
  `;
}

// 오늘 출근자 카드 렌더링
function renderTodayAttendance(rows) {
  if (!recentLogs) return;
  
  if (!rows || rows.length === 0) {
    recentLogs.innerHTML = `
      <div style="
        width: 100%; 
        padding: 2rem; 
        text-align: center; 
        color: var(--color-text-tertiary); 
        border: 1px dashed var(--color-border);
        font-size: 0.9rem;
      ">
        NO WORKERS LOGGED IN TODAY
      </div>`;
    return;
  }

  // 렌더링 전 기존 데이터 클리어
  recentLogs.innerHTML = "";

  rows.forEach(r => {
    const ci = r.clockIn?.toDate ? r.clockIn.toDate() : null;
    const co = r.clockOut?.toDate ? r.clockOut.toDate() : null;
    
    // 계산 로직
    const now = new Date();
    const endTime = co || now;
    let diffMs = 0;
    if (ci) {
      diffMs = endTime - ci;
    }
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000) - (r.breakMinutes || 0));

    // 카드 요소 생성
    const card = document.createElement("div");
    card.className = "log-card";
    card.style.cursor = "pointer";
    card.onclick = () => openLogModal(r, totalMinutes); // 모달 연결

    card.innerHTML = `
      <div class="log-header">
        <div class="log-user-name">${r.userName || "Unknown"}</div>
        ${statusChip(r.status)}
      </div>
      
      <div style="
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 8px; 
        font-size: 0.8rem; 
        color: var(--color-text-secondary);
        margin-top: 8px;
      ">
        <div>
          <span style="font-weight:600; color:var(--color-text-tertiary);">IN</span> 
          ${hhmm(ci)}
        </div>
        <div style="text-align:right;">
          <span style="font-weight:600; color:var(--color-text-tertiary);">OUT</span> 
          ${hhmm(co)}
        </div>
      </div>

      <div style="
        margin-top: 12px; 
        padding-top: 8px; 
        border-top: 1px solid #f1f5f9; 
        display: flex; 
        justify-content: space-between; 
        align-items: center;
      ">
        <span style="font-size: 0.75rem; color: var(--color-text-tertiary);">TOTAL TIME</span>
        <span style="font-weight: 700; color: var(--color-text-primary); font-family:'Inter';">
          ${formatMinutes(totalMinutes)}
        </span>
      </div>
    `;

    recentLogs.appendChild(card);
  });
}

// ========================================
// 💾 Logic & Persistence
// ========================================

// 상태 로드 및 화면 갱신
async function loadStateAndRender() {
  const user = auth.currentUser;
  if (!user) {
    setButtonsByStatus("출근전");
    renderTodayAttendance([]);
    return;
  }

  const key = todayKey();
  const ref = stateDocRef(user.uid, key);
  const snap = await getDoc(ref);

  let state = {
    uid: user.uid,
    dateKey: key,
    userName: user.displayName || user.email || "익명",
    status: "출근전",
    clockIn: null,
    clockOut: null,
    breakMinutes: 0,
    cleanStart: null,
    cleanEnd: null,
  };

  if (snap.exists()) state = { ...state, ...snap.data() };

  // 시간 표시
  if (clockInTimeEl) {
    clockInTimeEl.style.display = state.clockIn ? "block" : "none";
    if (state.clockIn?.toDate) clockInTimeEl.textContent = hhmm(state.clockIn.toDate());
  }
  
  if (clockOutTimeEl) {
    clockOutTimeEl.style.display = state.clockOut ? "block" : "none";
    if (state.clockOut?.toDate) clockOutTimeEl.textContent = hhmm(state.clockOut.toDate());
  }

  // 휴식 상태 표시
  if (breakStatusEl) {
    if (breakStartLocal) {
        breakStatusEl.textContent = "RESTING... (휴식 중)";
    } else {
        breakStatusEl.textContent = "";
    }
  }

  if (totalBreakTimeEl) {
    totalBreakTimeEl.style.display = state.breakMinutes > 0 ? "block" : "none";
    if (state.breakMinutes > 0) totalBreakTimeEl.textContent = `TOTAL BREAK: ${formatMinutes(state.breakMinutes)}`;
  }

  setButtonsByStatus(state.status);
  
  // 버튼 강제 상태 제어 (로컬 상태 반영)
  if (breakStartLocal) {
     if(breakStartBtn) breakStartBtn.disabled = true;
     if(breakEndBtn) breakEndBtn.disabled = false;
     if(clockOutBtn) clockOutBtn.disabled = true;
     if(cleanStartBtn) cleanStartBtn.disabled = true;
  }

  await renderTodayAttendanceFromDB();
}

// DB에서 금일 현황 가져오기
async function renderTodayAttendanceFromDB() {
  const key = todayKey();
  const qy = query(collection(db, "worklogState"), where("dateKey", "==", key));
  const snap = await getDocs(qy);
  const rows = snap.docs.map(d => d.data());
  renderTodayAttendance(rows);
}

// 상태 문서 보장 (없으면 생성)
async function ensureStateExists() {
  const user = auth.currentUser;
  const key = todayKey();
  const ref = stateDocRef(user.uid, key);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const base = {
      uid: user.uid,
      dateKey: key,
      userName: user.displayName || user.email || "익명",
      status: "출근전",
      clockIn: null,
      clockOut: null,
      breakMinutes: 0,
      cleanStart: null,
      cleanEnd: null,
      updatedAt: serverTimestamp(),
      
      // ✅ [추가됨] 작성자 정보 (보안 규칙용)
      authorEmail: user.email
    };
    await setDoc(ref, base);
    return base;
  }
  return snap.data();
}

// ----------------------------------------
// Actions
// ----------------------------------------

// 출근
async function handleClockIn() {
  const user = auth.currentUser;
  if (!user) return alert("Please login first.");
  
  if(!confirm("출근 처리하시겠습니까? (Clock In)")) return;

  const ref = stateDocRef(user.uid, todayKey());
  const now = serverTimestamp();
  
  await ensureStateExists();
  await updateDoc(ref, { status: "출근", clockIn: now, updatedAt: now });
  
  // 로그 기록
  await addDoc(collection(db, "worklog"), { 
    user: user.displayName || user.email, 
    type: "출근", 
    dateKey: todayKey(),
    time: serverTimestamp(),
    // ✅ [추가됨] 작성자 정보
    uid: user.uid,
    authorEmail: user.email
  });
  
  await loadStateAndRender();
}

// 퇴근
async function handleClockOut() {
  const user = auth.currentUser;
  if (!user) return alert("Please login first.");

  const ref = stateDocRef(user.uid, todayKey());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const st = snap.data();
  if (!st.clockIn) return alert("No clock-in record found.");
  if (st.status === "퇴근") return alert("Already clocked out.");

  if(!confirm("퇴근 처리하시겠습니까? (Clock Out)")) return;

  const now = serverTimestamp();
  await updateDoc(ref, { status: "퇴근", clockOut: now, updatedAt: now });
  
  await addDoc(collection(db, "worklog"), { 
    user: user.displayName || user.email, 
    type: "퇴근", 
    dateKey: todayKey(),
    time: serverTimestamp(), 
    breakMinutes: st.breakMinutes || 0,
    // ✅ [추가됨] 작성자 정보
    uid: user.uid,
    authorEmail: user.email
  });
  
  await loadStateAndRender();
}

// 휴식
let breakStartLocal = null;

async function handleBreakStart() {
  if(!confirm("휴식을 시작하시겠습니까? (Start Break)")) return;
  breakStartLocal = Date.now();
  
  // UI 즉시 반영
  if(breakStatusEl) breakStatusEl.textContent = "RESTING... (휴식 중)";
  if(breakStartBtn) breakStartBtn.disabled = true;
  if(breakEndBtn) breakEndBtn.disabled = false;
  if(clockOutBtn) clockOutBtn.disabled = true;
}

async function handleBreakEnd() {
  if (!breakStartLocal) return;
  const user = auth.currentUser;
  if (!user) return;

  if(!confirm("휴식을 종료하시겠습니까? (End Break)")) return;

  const elapsedMin = Math.floor((Date.now() - breakStartLocal) / 60000);
  breakStartLocal = null;

  const ref = stateDocRef(user.uid, todayKey());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const prev = snap.data().breakMinutes || 0;
  const next = Math.max(0, prev + elapsedMin);

  await updateDoc(ref, { breakMinutes: next, updatedAt: serverTimestamp() });
  
  if(breakStatusEl) breakStatusEl.textContent = "";
  if(totalBreakTimeEl) {
      totalBreakTimeEl.textContent = `TOTAL BREAK: ${formatMinutes(next)}`;
      totalBreakTimeEl.style.display = "block";
  }
  
  await addDoc(collection(db, "worklog"), { 
    user: user.displayName || user.email, 
    type: "휴식", 
    duration: elapsedMin,
    dateKey: todayKey(),
    time: serverTimestamp(), 
    breakMinutes: next,
    // ✅ [추가됨] 작성자 정보
    uid: user.uid,
    authorEmail: user.email
  });
  
  await loadStateAndRender();
}

// 청소
async function handleCleanStart() {
  const user = auth.currentUser;
  if (!user) return;
  
  if(!confirm("청소를 시작하시겠습니까? (Start Cleaning)")) return;

  const ref = stateDocRef(user.uid, todayKey());
  const now = serverTimestamp();
  await updateDoc(ref, { status: "청소중", cleanStart: now, updatedAt: now });
  
  await addDoc(collection(db, "worklog"), { 
      user: user.displayName || user.email, 
      type: "청소시작", 
      dateKey: todayKey(), 
      time: serverTimestamp(),
      // ✅ [추가됨] 작성자 정보
      uid: user.uid,
      authorEmail: user.email
  });
  
  await loadStateAndRender();
}

async function handleCleanEnd() {
  const user = auth.currentUser;
  if (!user) return;

  if(!confirm("청소를 완료하시겠습니까? (Finish Cleaning)")) return;

  const ref = stateDocRef(user.uid, todayKey());
  const now = serverTimestamp();
  await updateDoc(ref, { status: "청소완료", cleanEnd: now, updatedAt: now });
  
  await addDoc(collection(db, "worklog"), { 
      user: user.displayName || user.email, 
      type: "청소완료", 
      dateKey: todayKey(), 
      time: serverTimestamp(),
      // ✅ [추가됨] 작성자 정보
      uid: user.uid,
      authorEmail: user.email
  });
  
  await loadStateAndRender();
}

// 리셋
async function handleResetWorkState() {
  const user = auth.currentUser;
  if (!user) return;
  
  if (!confirm("⚠️ 정말 오늘 상태를 초기화할까요?\n데이터가 '출근전' 상태로 되돌아갑니다.")) return;

  const ref = stateDocRef(user.uid, todayKey());
  await setDoc(ref, {
    uid: user.uid,
    dateKey: todayKey(),
    userName: user.displayName || user.email || "익명",
    status: "출근전",
    clockIn: null,
    clockOut: null,
    breakMinutes: 0,
    cleanStart: null,
    cleanEnd: null,
    updatedAt: serverTimestamp(),
    // ✅ [추가됨] 작성자 정보
    authorEmail: user.email
  });

  breakStartLocal = null;
  await loadStateAndRender();
}

// ========================================
// 🪄 Modal Logic
// ========================================

window.openLogModal = (data, totalMinutes) => {
    if(!logModal) return;

    // Data Binding
    if($("modalUser")) $("modalUser").textContent = data.userName || "Unknown";
    if($("modalDate")) $("modalDate").textContent = data.dateKey || todayKey();
    
    if($("modalIn")) $("modalIn").textContent = hhmm(data.clockIn?.toDate ? data.clockIn.toDate() : null);
    if($("modalOut")) $("modalOut").textContent = hhmm(data.clockOut?.toDate ? data.clockOut.toDate() : null);
    if($("modalBreak")) $("modalBreak").textContent = formatMinutes(data.breakMinutes || 0);
    if($("modalTotal")) $("modalTotal").textContent = formatMinutes(totalMinutes || 0);

    // Show
    logModal.style.display = "flex";
};

if(closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        logModal.style.display = "none";
    });
}

// Close on outside click
window.addEventListener("click", (e) => {
    if (e.target === logModal) {
        logModal.style.display = "none";
    }
});

// ========================================
// 🌅 Initialization
// ========================================

function midnightResetCheck() {
  const lastKey = localStorage.getItem("worklog_last");
  const today = todayKey();
  if (lastKey && lastKey !== today) {
    localStorage.clear();
    breakStartLocal = null;
  }
  localStorage.setItem("worklog_last", today);
}

function bindEvents() {
  if(clockInBtn) clockInBtn.addEventListener("click", handleClockIn);
  if(clockOutBtn) clockOutBtn.addEventListener("click", handleClockOut);
  if(breakStartBtn) breakStartBtn.addEventListener("click", handleBreakStart);
  if(breakEndBtn) breakEndBtn.addEventListener("click", handleBreakEnd);
  if(cleanStartBtn) cleanStartBtn.addEventListener("click", handleCleanStart);
  if(cleanEndBtn) cleanEndBtn.addEventListener("click", handleCleanEnd);
  if(resetWorkBtn) resetWorkBtn.addEventListener("click", handleResetWorkState);
}

// Start (Safety Check)
if (auth && typeof auth.onAuthStateChanged === 'function') {
    auth.onAuthStateChanged(async (user) => {
      bindEvents();
      midnightResetCheck();
      await loadStateAndRender();
    });
} else {
    console.log("Firebase not initialized correctly. Please check API Key.");
}