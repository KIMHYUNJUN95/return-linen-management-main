// ========================================
// ⏰ HARU Worklog (근무기록)
// ========================================

import { db, auth } from "./storage.js";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const clockInBtn = document.getElementById("clockInBtn");
  const clockOutBtn = document.getElementById("clockOutBtn");
  const breakStartBtn = document.getElementById("breakStartBtn");
  const breakEndBtn = document.getElementById("breakEndBtn");
  const clockInTimeEl = document.getElementById("clockInTime");
  const clockOutTimeEl = document.getElementById("clockOutTime");
  const breakStatusEl = document.getElementById("breakStatus");
  const totalBreakTimeEl = document.getElementById("totalBreakTime");
  const recentLogs = document.getElementById("recentLogs");

  let breakStart = null; // epoch ms when break started
  let totalBreak = 0;    // minutes accumulated for today (local)

  // 상태 복원 (localStorage)
  function loadWorkState() {
    const status = localStorage.getItem("workStatus");
    const start = localStorage.getItem("clockInTime");
    const breakData = localStorage.getItem("totalBreak");

    if (status === "working" && start) {
      clockInBtn.disabled = true;
      clockOutBtn.disabled = false;
      breakStartBtn.disabled = false;
      clockInTimeEl.textContent = formatTime(new Date(start));
      clockInTimeEl.style.display = "block";

      if (breakData) {
        totalBreak = parseInt(breakData, 10) || 0;
        if (totalBreak > 0) {
          totalBreakTimeEl.textContent = `휴식 ${formatMinutes(totalBreak)}`;
          totalBreakTimeEl.style.display = "block";
        }
      }
    }
  }

  function saveWorkState(status) {
    localStorage.setItem("workStatus", status);
    if (status === "working") {
      localStorage.setItem("clockInTime", new Date().toISOString());
    } else {
      localStorage.removeItem("clockInTime");
      localStorage.removeItem("workStatus");
      localStorage.removeItem("totalBreak");
    }
  }

  // 출근
  clockInBtn.addEventListener("click", async () => {
    const now = new Date();
    clockInTimeEl.textContent = formatTime(now);
    clockInTimeEl.style.display = "block";

    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    breakStartBtn.disabled = false;

    saveWorkState("working");

    await addDoc(collection(db, "worklog"), {
      user: auth?.currentUser?.displayName || "-",
      type: "출근",
      time: serverTimestamp(),
    });

    loadRecentLogsGroupedDaily();
  });

  // 퇴근
  clockOutBtn.addEventListener("click", async () => {
    const now = new Date();
    clockOutTimeEl.textContent = formatTime(now);
    clockOutTimeEl.style.display = "block";

    clockOutBtn.disabled = true;
    breakStartBtn.disabled = true;
    breakEndBtn.disabled = true;

    saveWorkState("off");

    await addDoc(collection(db, "worklog"), {
      user: auth?.currentUser?.displayName || "-",
      type: "퇴근",
      time: serverTimestamp(),
      breakMinutes: totalBreak
    });

    loadRecentLogsGroupedDaily();
  });

  // 휴식 시작
  breakStartBtn.addEventListener("click", () => {
    breakStart = Date.now();
    breakStartBtn.disabled = true;
    breakEndBtn.disabled = false;
    breakStatusEl.textContent = "휴식 중...";
  });

  // 휴식 종료
  breakEndBtn.addEventListener("click", () => {
    if (breakStart) {
      const duration = Math.floor((Date.now() - breakStart) / 60000);
      totalBreak += duration;
      localStorage.setItem("totalBreak", totalBreak.toString());

      totalBreakTimeEl.textContent = `휴식 ${formatMinutes(totalBreak)}`;
      totalBreakTimeEl.style.display = "block";

      breakStart = null;
      breakStartBtn.disabled = false;
      breakEndBtn.disabled = true;
      breakStatusEl.textContent = "";
    }
  });

  // 최근 로그(원본 카드 스타일) — 호환 유지용
  async function loadRecentLogs() {
    const q = query(collection(db, "worklog"), orderBy("time", "desc"));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => doc.data());

    recentLogs.innerHTML = logs.slice(0, 20).map(log => {
      const date = log.time?.toDate ? formatTime(log.time.toDate()) : "-";
      const typeEmoji = log.type === "출근" ? "🟢" : log.type === "퇴근" ? "🔴" : "☁️";
      return `
        <div class="log-card">
          <div class="log-header">
            <strong>${typeEmoji} ${log.type}</strong>
            <span class="log-date">${date}</span>
          </div>
          <div>${log.user || "-"}</div>
          ${log.breakMinutes ? `<div style="margin-top:4px;color:gray;">휴식 ${formatMinutes(log.breakMinutes)}</div>` : ""}
        </div>
      `;
    }).join('');
  }

  // 사용자별 1줄 요약 (오늘만 표시, 휴식 제외 총 근무시간)
  async function loadRecentLogsGroupedDaily() {
    const TYPE_IN_SET = new Set(["출근", "�E�근"]);
    const TYPE_OUT_SET = new Set(["퇴근", "����E�"]);

    const q = query(collection(db, "worklog"), orderBy("time", "desc"));
    const snapshot = await getDocs(q);
    const allLogs = snapshot.docs.map(doc => doc.data());

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todaysLogs = allLogs.filter(l => {
      if (!l.time || !l.time.toDate) return false;
      const d = l.time.toDate();
      return d >= startOfDay && d <= endOfDay;
    });

    const byUser = new Map();
    for (const log of todaysLogs) {
      const user = log.user || "-";
      const d = log.time?.toDate ? log.time.toDate() : null;
      if (!d) continue;
      if (!byUser.has(user)) byUser.set(user, []);
      byUser.get(user).push({ ...log, _date: d });
    }

    for (const [user, arr] of byUser.entries()) {
      arr.sort((a, b) => a._date - b._date);
    }

    const rows = [];
    for (const [user, arr] of byUser.entries()) {
      let firstIn = null;
      let lastOut = null;
      let lastInForPair = null;
      let workedMs = 0;
      let breakTotalMin = 0;

      for (const item of arr) {
        if (TYPE_IN_SET.has(item.type)) {
          if (!firstIn) firstIn = item._date;
          if (!lastInForPair) lastInForPair = item._date;
        } else if (TYPE_OUT_SET.has(item.type)) {
          lastOut = item._date;
          if (typeof item.breakMinutes === 'number') breakTotalMin += item.breakMinutes;
          if (lastInForPair) {
            workedMs += (item._date - lastInForPair);
            lastInForPair = null;
          }
        }
      }

      const breakMs = breakTotalMin * 60000;
      const netMs = (lastOut && workedMs ? Math.max(0, workedMs - breakMs) : null);

      rows.push({ user, firstIn, lastOut, breakTotalMin, netMs });
    }

    // 최신 활동 기준 정렬
    rows.sort((a, b) => {
      const at = (a.lastOut || a.firstIn || startOfDay).getTime();
      const bt = (b.lastOut || b.firstIn || startOfDay).getTime();
      return bt - at;
    });

    const container = recentLogs;
    if (!container) return;

    container.innerHTML = rows.map(row => {
      const inStr = row.firstIn ? row.firstIn.toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' }) : '-';
      const outStr = row.lastOut ? row.lastOut.toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' }) : '-';
      const breakStr = row.breakTotalMin ? formatMinutes(row.breakTotalMin) : '-';
      const netStr = row.netMs == null ? '-' : formatMinutes(Math.floor(row.netMs / 60000));
      return `
        <div class="log-card condensed">
          <div class="log-header" style="border-bottom:none;margin:0;padding:0;width:100%;gap:12px;">
            <strong style="white-space:nowrap;">${row.user}</strong>
            <span class="log-date" style="white-space:nowrap;">출근 ${inStr}</span>
            <span class="log-date" style="white-space:nowrap;">휴식 ${breakStr}</span>
            <span class="log-date" style="white-space:nowrap;">퇴근 ${outStr}</span>
            <span class="log-date" style="white-space:nowrap;">총 ${netStr}</span>
          </div>
        </div>`;
    }).join("");
  }

  // 유틸
  function formatTime(date) {
    return date.toLocaleString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function formatMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  // 초기 로드
  loadWorkState();
  loadRecentLogsGroupedDaily();
});
