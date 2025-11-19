// ========================================
// 📊 HARU Worklog Overview Dashboard (Admin Only)
// ========================================

import { db, auth } from "./storage.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ DOM 요소
const monthPicker = document.getElementById("monthPicker");
const loadBtn = document.getElementById("loadBtn");
const backBtn = document.getElementById("backBtn");
const tbody = document.getElementById("worklogBody");
const totalWorkdaysEl = document.getElementById("totalWorkdays");
const totalWorkHoursEl = document.getElementById("totalWorkHours");
const avgWorkHoursEl = document.getElementById("avgWorkHours");

// ========================================
// 🔒 관리자 권한 확인
// ========================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("로그인 후 이용 가능합니다.");
    location.href = "signup.html";
    return;
  }

  const superAdmin = "rlaguswns95@haru-tokyo.com";
  let isAdmin = false;

  if (user.email === superAdmin) {
    isAdmin = true;
  } else {
    const roleRef = doc(db, "roles", user.email);
    const roleSnap = await getDoc(roleRef);
    if (roleSnap.exists() && roleSnap.data().role === "admin") {
      isAdmin = true;
    }
  }

  if (!isAdmin) {
    alert("이 페이지는 관리자 전용입니다.");
    location.href = "worklog.html";
    return;
  }
});

// ========================================
// 🧮 시간 계산 함수
// ========================================
function diffMinutes(start, end) {
  if (!start || !end || !start.toDate || !end.toDate) return 0;
  const s = start.toDate().getTime();
  const e = end.toDate().getTime();
  return Math.floor((e - s) / 60000);
}

function formatHM(mins) {
  if (!mins || mins <= 0) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

// ========================================
// 📆 월간 데이터 불러오기
// ========================================
async function loadWorklogByMonth(year, month) {
  tbody.innerHTML = `<tr><td colspan="7">불러오는 중...</td></tr>`;

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const q = query(collection(db, "worklogState"), where("dateKey", ">=", `${monthKey}-01`), where("dateKey", "<=", `${monthKey}-31`));
  const snap = await getDocs(q);

  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="7">데이터가 없습니다.</td></tr>`;
    totalWorkdaysEl.textContent = "0";
    totalWorkHoursEl.textContent = "0h";
    avgWorkHoursEl.textContent = "0h";
    return;
  }

  let totalWorkMinutes = 0;
  let totalWorkdays = 0;

  const rows = [];

  snap.forEach((doc) => {
    const d = doc.data();
    if (!d.clockIn || !d.clockOut) return; // 출퇴근이 있어야 포함
    const mins = diffMinutes(d.clockIn, d.clockOut) - (d.breakMinutes || 0);
    totalWorkMinutes += mins;
    totalWorkdays++;

    rows.push({
      name: d.userName || "익명",
      date: d.dateKey,
      clockIn: d.clockIn?.toDate().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      clockOut: d.clockOut?.toDate().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      total: formatHM(mins),
      break: formatHM(d.breakMinutes || 0),
      clean: d.status || "-",
    });
  });

  // ✅ 요약 계산
  const avgWorkMins = totalWorkdays > 0 ? Math.floor(totalWorkMinutes / totalWorkdays) : 0;
  totalWorkdaysEl.textContent = totalWorkdays;
  totalWorkHoursEl.textContent = formatHM(totalWorkMinutes);
  avgWorkHoursEl.textContent = formatHM(avgWorkMins);

  // ✅ 테이블 렌더링
  tbody.innerHTML = rows
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (r) => `
    <tr>
      <td>${r.name}</td>
      <td>${r.date}</td>
      <td>${r.clockIn}</td>
      <td>${r.clockOut}</td>
      <td>${r.total}</td>
      <td>${r.break}</td>
      <td>${r.clean}</td>
    </tr>`
    )
    .join("");
}

// ========================================
// 📅 버튼 이벤트
// ========================================
loadBtn.addEventListener("click", () => {
  const val = monthPicker.value;
  if (!val) {
    alert("조회할 월을 선택하세요.");
    return;
  }
  const [year, month] = val.split("-");
  loadWorklogByMonth(year, month);
});

backBtn.addEventListener("click", () => {
  location.href = "worklog.html";
});

// 기본값: 현재 월 자동 세팅
const now = new Date();
monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
