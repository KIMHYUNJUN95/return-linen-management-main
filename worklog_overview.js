// ========================================
// 📊 HARU Worklog Overview Controller (Admin Only)
// Design System: Tokyo Day Bright (Architectural, No Emoji)
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔴 1. Firebase Initialization (Safe Handling)
let firebaseConfig = {};
if (window.__firebase_config) {
  try {
    firebaseConfig = JSON.parse(window.__firebase_config);
  } catch (e) {
    console.error("Firebase config parsing error:", e);
  }
} else {
  console.error("❌ __firebase_config is missing. Please check worklog_overview.html");
}

// Config가 유효할 때만 초기화 진행
let app, auth, db;
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.warn("Initializing with dummy Firebase instance to prevent crash.");
    auth = { onAuthStateChanged: () => {} };
    db = {};
}

// 2. DOM Elements
const monthPicker = document.getElementById("monthPicker");
const loadBtn = document.getElementById("loadBtn");
const backBtn = document.getElementById("backBtn");
const tbody = document.getElementById("worklogBody");

const totalWorkdaysEl = document.getElementById("totalWorkdays");
const totalWorkHoursEl = document.getElementById("totalWorkHours");
const avgWorkHoursEl = document.getElementById("avgWorkHours");

// ========================================
// 🔒 Admin Permission Check
// ========================================
if (auth && typeof auth.onAuthStateChanged === 'function') {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("Please login first.");
      location.href = "index.html"; // or signup/login page
      return;
    }

    const superAdmin = "rlaguswns95@haru-tokyo.com";
    let isAdmin = false;

    // 1. Super Admin Check
    if (user.email === superAdmin) {
      isAdmin = true;
    } else {
      // 2. Firestore Role Check
      try {
        const roleRef = doc(db, "roles", user.email);
        const roleSnap = await getDoc(roleRef);
        if (roleSnap.exists() && roleSnap.data().role === "admin") {
          isAdmin = true;
        }
      } catch (e) {
        console.error("Role check error:", e);
      }
    }

    if (!isAdmin) {
      alert("Access Denied: Admins Only.");
      location.href = "worklog.html";
      return;
    }

    // Load current month data initially
    if (monthPicker.value) {
      const [year, month] = monthPicker.value.split("-");
      loadWorklogByMonth(year, month);
    }
  });
}

// ========================================
// 🧮 Calculation Helpers
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
  // Architectural formatting
  if(h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Status text styler (Tokyo Day Bright Colors)
function formatStatus(status) {
  if (!status || status === "출근" || status === "퇴근") return `<span style="color:#94a3b8;">-</span>`;
  
  if (status === "청소완료") {
    return `<span style="color:#27ae60; font-weight:700; font-size:0.8rem;">DONE</span>`;
  }
  if (status === "청소중") {
    return `<span style="color:#D4AF37; font-weight:700; font-size:0.8rem;">CLEANING</span>`;
  }
  
  return `<span style="color:#64748B;">${status}</span>`;
}

// ========================================
// 📅 Data Loading & Rendering
// ========================================

async function loadWorklogByMonth(year, month) {
  tbody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align:center; color:#64748B;">LOADING DATA...</td></tr>`;

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  
  try {
    // Query: worklogState collection where dateKey matches the selected month
    const q = query(
      collection(db, "worklogState"), 
      where("dateKey", ">=", `${monthKey}-01`), 
      where("dateKey", "<=", `${monthKey}-31`)
    );
    
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align:center; color:#94a3b8;">NO DATA FOUND FOR ${monthKey}</td></tr>`;
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
      
      // Calculate work minutes only if both clockIn and clockOut exist
      let mins = 0;
      if (d.clockIn && d.clockOut) {
        mins = diffMinutes(d.clockIn, d.clockOut) - (d.breakMinutes || 0);
        // Only count positive work time
        if (mins > 0) {
            totalWorkMinutes += mins;
            totalWorkdays++;
        }
      }

      rows.push({
        name: d.userName || "Unknown",
        date: d.dateKey,
        clockIn: d.clockIn?.toDate().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) || "-",
        clockOut: d.clockOut?.toDate().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) || "-",
        total: mins > 0 ? formatHM(mins) : "-",
        break: formatHM(d.breakMinutes || 0),
        status: d.status
      });
    });

    // Update Summary Cards
    const avgWorkMins = totalWorkdays > 0 ? Math.floor(totalWorkMinutes / totalWorkdays) : 0;
    
    totalWorkdaysEl.textContent = totalWorkdays;
    totalWorkHoursEl.textContent = formatHM(totalWorkMinutes);
    avgWorkHoursEl.textContent = formatHM(avgWorkMins);

    // Render Table Rows
    // Sort by date descending (latest first) or ascending based on preference. Let's do Date Ascending.
    rows.sort((a, b) => a.date.localeCompare(b.date));

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td style="font-weight:600;">${r.name}</td>
        <td style="font-family:'Inter'; color:#64748B;">${r.date}</td>
        <td style="font-family:'Inter';">${r.clockIn}</td>
        <td style="font-family:'Inter';">${r.clockOut}</td>
        <td style="font-family:'Inter'; font-weight:700; color:#2C3E50;">${r.total}</td>
        <td style="font-family:'Inter'; color:#64748B;">${r.break}</td>
        <td>${formatStatus(r.status)}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Error loading worklog:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align:center; color:#E74C3C;">ERROR LOADING DATA</td></tr>`;
  }
}

// ========================================
// 🖱 Event Listeners
// ========================================

loadBtn.addEventListener("click", () => {
  const val = monthPicker.value;
  if (!val) {
    alert("Please select a month.");
    return;
  }
  const [year, month] = val.split("-");
  loadWorklogByMonth(year, month);
});

backBtn.addEventListener("click", () => {
  location.href = "worklog.html";
});

// Default: Set Current Month
const now = new Date();
const currentY = now.getFullYear();
const currentM = String(now.getMonth() + 1).padStart(2, "0");
monthPicker.value = `${currentY}-${currentM}`;