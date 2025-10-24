// ========================================
// ⏰ HARU Worklog (근무 기록)
// 상태 영속 + 청소 시작/완료 + 오늘 출근자 현황 + 리셋 + 근무시간계산 + 자정리셋
// ✅ UI 가독성 개선 (칩형태 + 2단 구분)
// ========================================

import { db, auth } from "./storage.js";
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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

function todayKey(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hhmm(d) {
  if (!d) return "-";
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function stateDocRef(uid, dayKey) {
  return doc(db, "worklogState", `${uid}_${dayKey}`);
}

// 상태에 따른 버튼 활성화
function setButtonsByStatus(status) {
  [clockInBtn, clockOutBtn, breakStartBtn, breakEndBtn, cleanStartBtn, cleanEndBtn].forEach(b => b && (b.disabled = true));
  if (resetWorkBtn) resetWorkBtn.disabled = false;

  switch (status) {
    case "출근전":
      clockInBtn.disabled = false;
      break;
    case "출근":
      clockOutBtn.disabled = false;
      breakStartBtn.disabled = false;
      cleanStartBtn.disabled = false;
      break;
    case "청소중":
      clockOutBtn.disabled = false;
      breakEndBtn.disabled = false;
      cleanEndBtn.disabled = false;
      break;
    case "청소완료":
      clockOutBtn.disabled = false;
      breakStartBtn.disabled = false;
      break;
    case "퇴근":
      break;
  }
}

// 리셋
async function handleResetWorkState() {
  const user = auth.currentUser;
  if (!user) return;
  if (!confirm("오늘 상태를 초기화할까요?")) return;

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
  });

  await loadStateAndRender();
}

// 상태 로드
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

  clockInTimeEl.style.display = state.clockIn ? "block" : "none";
  clockOutTimeEl.style.display = state.clockOut ? "block" : "none";
  totalBreakTimeEl.style.display = state.breakMinutes > 0 ? "block" : "none";

  if (state.clockIn?.toDate) clockInTimeEl.textContent = hhmm(state.clockIn.toDate());
  if (state.clockOut?.toDate) clockOutTimeEl.textContent = hhmm(state.clockOut.toDate());
  if (state.breakMinutes > 0) totalBreakTimeEl.textContent = `휴식 누계 ${formatMinutes(state.breakMinutes)}`;

  setButtonsByStatus(state.status);
  await renderTodayAttendanceFromDB();
}

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
    };
    await setDoc(ref, base);
    return base;
  }
  return snap.data();
}

// 출퇴근
async function handleClockIn() {
  const user = auth.currentUser;
  if (!user) return alert("로그인 후 이용하세요.");
  const ref = stateDocRef(user.uid, todayKey());
  const now = serverTimestamp();
  await ensureStateExists();
  await updateDoc(ref, { status: "출근", clockIn: now, updatedAt: now });
  await addDoc(collection(db, "worklog"), { user: user.displayName || user.email, type: "출근", time: serverTimestamp() });
  await loadStateAndRender();
}

async function handleClockOut() {
  const user = auth.currentUser;
  if (!user) return alert("로그인 후 이용하세요.");
  const ref = stateDocRef(user.uid, todayKey());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const st = snap.data();
  if (!st.clockIn) return alert("출근 기록이 없습니다.");
  if (st.status === "퇴근") return alert("이미 퇴근 처리되었습니다.");

  const now = serverTimestamp();
  await updateDoc(ref, { status: "퇴근", clockOut: now, updatedAt: now });
  await addDoc(collection(db, "worklog"), { user: user.displayName || user.email, type: "퇴근", time: serverTimestamp(), breakMinutes: st.breakMinutes || 0 });
  await loadStateAndRender();
}

// 휴식
let breakStartLocal = null;

async function handleBreakStart() {
  breakStartLocal = Date.now();
  breakStatusEl.textContent = "☕ 휴식 중…";
  breakStartBtn.disabled = true;
  breakEndBtn.disabled = false;
}

async function handleBreakEnd() {
  if (!breakStartLocal) return;
  const user = auth.currentUser;
  if (!user) return;

  const elapsedMin = Math.floor((Date.now() - breakStartLocal) / 60000);
  breakStartLocal = null;

  const ref = stateDocRef(user.uid, todayKey());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const prev = snap.data().breakMinutes || 0;
  const next = Math.max(0, prev + elapsedMin);

  await updateDoc(ref, { breakMinutes: next, updatedAt: serverTimestamp() });
  breakStatusEl.textContent = "";
  totalBreakTimeEl.textContent = `휴식 누계 ${formatMinutes(next)}`;
  totalBreakTimeEl.style.display = "block";
  breakStartBtn.disabled = false;
  breakEndBtn.disabled = true;

  await addDoc(collection(db, "worklog"), { user: user.displayName || user.email, type: "휴식", time: serverTimestamp(), breakMinutes: next });
  await renderTodayAttendanceFromDB();
}

// 청소
async function handleCleanStart() {
  const user = auth.currentUser;
  if (!user) return alert("로그인 후 이용하세요.");
  const ref = stateDocRef(user.uid, todayKey());
  const now = serverTimestamp();
  await updateDoc(ref, { status: "청소중", cleanStart: now, updatedAt: now });
  await addDoc(collection(db, "worklog"), { user: user.displayName || user.email, type: "청소시작", time: serverTimestamp() });
  await loadStateAndRender();
}

async function handleCleanEnd() {
  const user = auth.currentUser;
  if (!user) return alert("로그인 후 이용하세요.");
  const ref = stateDocRef(user.uid, todayKey());
  const now = serverTimestamp();
  await updateDoc(ref, { status: "청소완료", cleanEnd: now, updatedAt: now });
  await addDoc(collection(db, "worklog"), { user: user.displayName || user.email, type: "청소완료", time: serverTimestamp() });
  await loadStateAndRender();
}

// 출근자 현황 UI 개선
function statusChip(status) {
  const map = {
    "출근전": { bg: "#e5e7eb", fg: "#374151", label: "대기" },
    "출근": { bg: "#fef3c7", fg: "#92400e", label: "출근" },
    "청소중": { bg: "#dcfce7", fg: "#166534", label: "청소중" },
    "청소완료": { bg: "#dbeafe", fg: "#1e40af", label: "청소완료" },
    "퇴근": { bg: "#e5e7eb", fg: "#374151", label: "퇴근" },
  };
  const s = map[status] || map["출근전"];
  return `<span style="display:inline-block;padding:4px 10px;border-radius:9999px;background:${s.bg};color:${s.fg};font-weight:600;font-size:12px;">${s.label}</span>`;
}

function renderTodayAttendance(rows) {
  if (!recentLogs) return;
  if (!rows || rows.length === 0) {
    recentLogs.innerHTML = `<div class="log-card" style="text-align:center;color:#777;">오늘 출근자가 없습니다.</div>`;
    return;
  }

  recentLogs.innerHTML = rows.map(r => {
    const ci = r.clockIn?.toDate ? r.clockIn.toDate() : null;
    const co = r.clockOut?.toDate ? r.clockOut.toDate() : null;
    const cs = r.cleanStart?.toDate ? r.cleanStart.toDate() : null;
    const ce = r.cleanEnd?.toDate ? r.cleanEnd.toDate() : null;

    const cleanDuration = (cs && ce) ? Math.floor((ce - cs) / 60000) : 0;
    const totalDuration = (ci && co) ? Math.floor(((co - ci) / 60000) - (r.breakMinutes || 0)) : 0;

    return `
      <div class="log-card condensed">
        <!-- 상단 -->
        <div class="log-header" style="justify-content:space-between;align-items:center;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <strong>${r.userName || "익명"}</strong>
            ${statusChip(r.status)}
          </div>
          <div class="info-chip">⏳ 총근무 ${totalDuration ? formatMinutes(totalDuration) : "-"}</div>
        </div>

        <!-- 하단 -->
        <div class="log-date" style="display:flex;flex-wrap:wrap;gap:8px;line-height:1.6;margin-top:8px;">
          <div class="info-chip">🕒 출근 ${ci ? hhmm(ci) : "-"}</div>
          <div class="info-chip">🧹 시작 ${cs ? hhmm(cs) : "-"}</div>
          <div class="info-chip">🧼 완료 ${ce ? hhmm(ce) : "-"}</div>
          <div class="info-chip">🪣 청소 ${cleanDuration ? formatMinutes(cleanDuration) : "-"}</div>
          <div class="info-chip">☕ 휴식 ${r.breakMinutes ? formatMinutes(r.breakMinutes) : "-"}</div>
          <div class="info-chip">🏁 퇴근 ${co ? hhmm(co) : "-"}</div>
        </div>
      </div>`;
  }).join("");
}

async function renderTodayAttendanceFromDB() {
  const key = todayKey();
  const qy = query(collection(db, "worklogState"), where("dateKey", "==", key));
  const snap = await getDocs(qy);
  const rows = snap.docs.map(d => d.data());
  renderTodayAttendance(rows);
}

// 자정 리셋
function midnightResetCheck() {
  const lastKey = localStorage.getItem("worklog_last");
  const today = todayKey();
  if (lastKey && lastKey !== today) {
    localStorage.clear();
  }
  localStorage.setItem("worklog_last", today);
}

// 이벤트 바인딩
function bindEvents() {
  clockInBtn?.addEventListener("click", handleClockIn);
  clockOutBtn?.addEventListener("click", handleClockOut);
  breakStartBtn?.addEventListener("click", handleBreakStart);
  breakEndBtn?.addEventListener("click", handleBreakEnd);
  cleanStartBtn?.addEventListener("click", handleCleanStart);
  cleanEndBtn?.addEventListener("click", handleCleanEnd);
  resetWorkBtn?.addEventListener("click", handleResetWorkState);
}

// 시작
auth.onAuthStateChanged(async () => {
  bindEvents();
  midnightResetCheck();
  await loadStateAndRender();
});
