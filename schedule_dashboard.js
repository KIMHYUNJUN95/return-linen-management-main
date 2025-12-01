// ========================================
// 📅 HARU Schedule Dashboard Controller
// Logic: FullCalendar, Photo Upload, Cyclic Task Generation
// Design: Tokyo Day Bright (No Emoji, Architectural)
// ========================================

// ✅ [수정됨] storage.js에서 통합된 객체 가져오기 (중복 초기화 방지)
import { db, auth, storage } from "./storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 2. DOM Elements
const calendarEl = document.getElementById('calendar');
const mobileListEl = document.getElementById('mobileList');

// Filters
const fBuilding = document.getElementById('fBuilding');
const fStatus = document.getElementById('fStatus');
// const fMonth = document.getElementById('fMonth'); // Removed based on HTML
const btnRefresh = document.getElementById('btnRefresh');
const btnGoOverview = document.getElementById('btnGoOverview');

// Modals
const detailModal = document.getElementById('detailModal');
const completeModal = document.getElementById('completeModal');
const photoModal = document.getElementById("photoModal"); // HTML ID 확인 필요

// State
let calendar;
let allSchedules = [];
let selectedEventData = null;
let isProcessing = false;

// ========================================
// 🛠 Helpers
// ========================================

const todayISO = () => new Date().toISOString().slice(0, 10);

function toISODate(v) {
  if (!v) return null;
  if (v && v.seconds) {
    return new Date(v.seconds * 1000).toISOString().slice(0, 10);
  }
  if (typeof v === 'string') return v.slice(0, 10);
  return null;
}

function addMonths(dateStr, months) {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + parseInt(months));
  return date.toISOString().slice(0, 10);
}

function yyyymmOf(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

// Status Styling Helper
function getStatusInfo(status, dueDate) {
  const today = todayISO();
  
  if (status === 'done') {
    return { label: "DONE", class: "evt-done", color: "#166534", bg: "#DCFCE7", border: "#166534" };
  }
  
  if (dueDate && dueDate < today) {
    return { label: "OVERDUE", class: "evt-overdue", color: "#991B1B", bg: "#FEE2E2", border: "#991B1B" };
  }
  
  return { label: "UPCOMING", class: "evt-upcoming", color: "#0369A1", bg: "#E0F2FE", border: "#0369A1" };
}

// ========================================
// 📅 Calendar & List Rendering
// ========================================

function initCalendar() {
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listWeek'
    },
    height: 'auto',
    contentHeight: 700,
    events: [],
    eventClick: handleEventClick,
    eventContent: function(arg) {
        return {
            html: `<div class="fc-event-main-frame">
                    <div class="fc-event-title-container">
                        <div class="fc-event-title" style="font-weight:600;">
                            ${arg.event.title}
                        </div>
                    </div>
                   </div>`
        };
    }
  });
  calendar.render();
}

function renderMobileList(data) {
  if (!mobileListEl) return;
  
  if (data.length === 0) {
    mobileListEl.innerHTML = `<div style="text-align:center; padding:2rem; color:#64748B; border:1px dashed #CBD5E1;">NO TASKS FOUND</div>`;
    return;
  }

  mobileListEl.innerHTML = data.map(d => {
    const dueDate = d.nextDueDate || d.nextDue;
    const statusInfo = getStatusInfo(d.status, dueDate);
    
    return `
      <div class="calendar-card" style="margin-bottom: 1rem; padding: 1.2rem; cursor:pointer;" onclick="openDetailFromList('${d.id}')">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
          <div>
            <span style="font-size:0.75rem; font-weight:700; color:#64748B; text-transform:uppercase;">${d.building} · ${d.room}</span>
            <h4 style="margin:0.2rem 0 0 0; font-size:1rem; font-weight:700; color:#2C3E50;">${d.taskName}</h4>
          </div>
          <span style="
            font-size:0.7rem; font-weight:700; padding:2px 6px; 
            color:${statusInfo.color}; background:${statusInfo.bg}; border:1px solid ${statusInfo.border};
          ">${statusInfo.label}</span>
        </div>
        
        <div style="font-size:0.85rem; color:#64748B; margin-top:0.8rem; display:flex; justify-content:space-between;">
            <span>DUE: <strong style="color:#2C3E50;">${dueDate || '-'}</strong></span>
            <span>CYCLE: ${d.cycleMonths || 0} MON</span>
        </div>
      </div>
    `;
  }).join('');
}

// Global helper for onclick
window.openDetailFromList = (id) => {
    const target = allSchedules.find(s => s.id === id);
    if(target) openDetailModal(target);
};

// ========================================
// 📡 Data Loading
// ========================================

async function loadSchedules() {
  if (!db) return;

  try {
    const q = query(collection(db, "maintenance_schedule"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    
    const items = [];
    snap.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });

    allSchedules = items;
    applyFiltersAndRender();
    renderMonthlySummary(items); // Monthly Stats

  } catch (err) {
    console.error("Error loading schedules:", err);
  }
}

function applyFiltersAndRender() {
  const buildingVal = fBuilding ? fBuilding.value : "";
  const statusVal = fStatus ? fStatus.value : "";
  // const monthVal = fMonth ? fMonth.value : ""; // Removed based on HTML

  const today = todayISO();

  const filtered = allSchedules.filter(d => {
    const dueDate = toISODate(d.nextDueDate || d.nextDue);
    const startDate = toISODate(d.startDate);

    // 1. Building Filter
    if (buildingVal && d.building !== buildingVal) return false;

    // 2. Status Filter
    if (statusVal) {
        const isDone = d.status === 'done';
        const isOverdue = dueDate && dueDate < today && !isDone;
        const isUpcoming = dueDate && dueDate >= today && !isDone;

        if (statusVal === 'done' && !isDone) return false;
        if (statusVal === 'overdue' && !isOverdue) return false;
        if (statusVal === 'upcoming' && !isUpcoming) return false;
    }

    return true;
  });

  // Render Calendar Events
  const events = filtered.map(d => {
    const dueDate = toISODate(d.nextDueDate || d.nextDue);
    if (!dueDate) return null;
    
    const statusInfo = getStatusInfo(d.status, dueDate);
    
    return {
      id: d.id,
      title: `${d.room ? d.room : ''} ${d.taskName}`,
      start: dueDate,
      classNames: [statusInfo.class],
      extendedProps: d
    };
  }).filter(e => e !== null);

  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(events);
  }
  
  renderMobileList(filtered);
}

// ========================================
// 📊 Monthly Summary (디자인 수정됨: CSS 클래스 사용)
// ========================================
function renderMonthlySummary(items) {
    // 1. 통계 섹션 찾기 또는 생성
    let summarySection = document.getElementById('monthlySummarySection');
    
    if (!summarySection) {
        summarySection = document.createElement('section');
        summarySection.id = 'monthlySummarySection';
        summarySection.className = 'stats-grid'; 
        
        const calCard = document.querySelector('.calendar-card');
        if(calCard && calCard.parentNode) calCard.parentNode.insertBefore(summarySection, calCard);
        else {
            // fallback location
            const main = document.querySelector('main');
            if(main) main.insertBefore(summarySection, main.firstChild);
        }
    } else {
        summarySection.className = 'stats-grid';
    }

    // 2. 데이터 계산
    const ym = yyyymmOf(new Date()); // Current Month
    const currentMonthItems = items.filter(it => {
        const next = toISODate(it.nextDueDate || it.nextDue);
        return next && next.startsWith(ym);
    });

    const done = currentMonthItems.filter(it => it.status === 'done').length;
    const total = currentMonthItems.length;
    const overdue = currentMonthItems.filter(it => {
        const d = toISODate(it.nextDueDate || it.nextDue);
        return it.status !== 'done' && d < todayISO();
    }).length; 

    // 3. HTML 생성
    summarySection.innerHTML = `
        <div class="stat-card">
            <div class="stat-title">TOTAL TASKS</div>
            <div class="stat-value">${total}</div>
        </div>
        <div class="stat-card">
            <div class="stat-title">DONE</div>
            <div class="stat-value done">${done}</div>
        </div>
        <div class="stat-card">
            <div class="stat-title">OVERDUE</div>
            <div class="stat-value overdue">${overdue}</div>
        </div>
    `;
}

// ========================================
// 🖱 Interactions & Modals
// ========================================

function handleEventClick(info) {
  openDetailModal(info.event.extendedProps);
}

function openDetailModal(data) {
  selectedEventData = data;
  if (!detailModal) return;

  const dueDate = toISODate(data.nextDueDate || data.nextDue);
  const lastDate = toISODate(data.lastDoneDate || data.lastDone);

  document.getElementById('dBuilding').textContent = data.building || '-';
  document.getElementById('dRoom').textContent = data.room || '-';
  document.getElementById('dTask').textContent = data.taskName || '-';
  document.getElementById('dNextDue').textContent = dueDate || '-';
  document.getElementById('dLastDone').textContent = lastDate || 'NEVER';
  document.getElementById('dNote').textContent = data.note || '-';
  
  const statusInfo = getStatusInfo(data.status, dueDate);
  document.getElementById('dStatus').innerHTML = `<span style="color:${statusInfo.color}; font-weight:700;">${statusInfo.label}</span>`;

  // Photo
  const photoWrap = document.getElementById("dPhotoWrap");
  if (photoWrap) {
    if (data.photoUrl) {
      photoWrap.style.display = "flex";
      const btn = document.getElementById("btnOpenPhoto");
      if (btn) btn.onclick = () => openPhotoModal(data.photoUrl);
    } else {
      photoWrap.style.display = "none";
    }
  }

  detailModal.style.display = 'flex';
  
  // Hide Complete button if already done
  const btnComplete = document.getElementById('btnOpenComplete');
  if (btnComplete) {
      btnComplete.style.display = (data.status === 'done') ? 'none' : 'block';
  }
}

// Open Complete Modal
const btnOpenComplete = document.getElementById('btnOpenComplete');
if (btnOpenComplete) {
    btnOpenComplete.addEventListener('click', () => {
        detailModal.style.display = 'none';
        completeModal.style.display = 'flex';
    });
}

// Submit Complete
const btnCompleteSubmit = document.getElementById('btnCompleteSubmit');
if (btnCompleteSubmit) {
    btnCompleteSubmit.addEventListener('click', async () => {
        if (!selectedEventData || !db) return;
        if (isProcessing) return;
        isProcessing = true;

        // 🔒 로그인 체크 (필수)
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("로그인이 필요합니다.");
            isProcessing = false;
            return;
        }

        const note = document.getElementById('cNote').value;
        const fileEl = document.getElementById('cPhoto');
        const file = fileEl ? fileEl.files[0] : null;

        try {
            const today = todayISO();
            let photoUrl = null;

            // 1. Upload Photo if exists
            if (file && storage) {
                const path = `maintenance_photos/${selectedEventData.building}_${Date.now()}_${file.name}`;
                const fileRef = ref(storage, path);
                const snap = await uploadBytes(fileRef, file);
                photoUrl = await getDownloadURL(snap.ref);
            } else {
                if (!confirm("사진 없이 완료 처리하시겠습니까?")) {
                    isProcessing = false;
                    return;
                }
            }

            // 2. Update Current (Mark as Done)
            const cycle = parseInt(selectedEventData.cycleMonths || 0);
            const docRef = doc(db, "maintenance_schedule", selectedEventData.id);
            
            await updateDoc(docRef, {
                status: 'done',
                lastDoneDate: today,
                photoUrl: photoUrl || selectedEventData.photoUrl || null,
                updatedAt: serverTimestamp(),
                note: note,
                completedBy: currentUser.email // 누가 완료했는지 기록
            });

            // 3. Create Next Cycle Task (if cycle > 0)
            if (cycle > 0) {
                const nextDate = addMonths(today, cycle);
                
                // ✅ [추가됨] 다음 스케줄 생성 시 작성자 정보(uid) 포함
                await addDoc(collection(db, "maintenance_schedule"), {
                    building: selectedEventData.building,
                    room: selectedEventData.room,
                    taskName: selectedEventData.taskName,
                    cycleMonths: cycle,
                    status: 'upcoming',
                    startDate: today,
                    nextDueDate: nextDate,
                    lastDoneDate: null,
                    
                    // 작성자 정보 저장
                    createdBy: currentUser.email,
                    uid: currentUser.uid, 
                    authorEmail: currentUser.email,
                    
                    timestamp: serverTimestamp()
                });
            }

            alert("✅ 작업 완료 및 다음 주기 생성됨!");
            completeModal.style.display = 'none';
            document.getElementById('cNote').value = '';
            if(fileEl) fileEl.value = '';
            
            loadSchedules();

        } catch (err) {
            console.error("Completion error:", err);
            if (err.code === 'permission-denied') {
                alert("권한이 없습니다. (수정 권한 확인 필요)");
            } else {
                alert("처리 중 오류가 발생했습니다.");
            }
        } finally {
            isProcessing = false;
        }
    });
}

/* ========================================
   🖼 Photo Modal
======================================== */
function openPhotoModal(url) {
  if (!photoModal) return;
  const img = document.getElementById("photoImg"); // HTML ID 확인 필요 (zoomImg 인지 photoImg 인지)
  // HTML 구조상 확대 이미지가 들어갈 img 태그 ID를 확인해서 매칭해야 함.
  // 여기서는 안전하게 id가 없으면 생성하거나 기존 로직을 따름.
  // 앞서 cs_dashboard에서는 'zoomImg'였음. 여기서는 HTML을 못봐서 'photoImg'로 가정.
  // 만약 이미지가 안뜬다면 HTML ID를 맞춰야 함.
  
  if (img) img.src = url;
  
  photoModal.style.display = "flex";
}

// Close Buttons
const btnDetailClose = document.getElementById('btnDetailClose');
if(btnDetailClose) btnDetailClose.addEventListener('click', () => detailModal.style.display = 'none');

const btnCompleteCancel = document.getElementById('btnCompleteCancel');
if(btnCompleteCancel) btnCompleteCancel.addEventListener('click', () => completeModal.style.display = 'none');

const btnPhotoClose = document.getElementById("btnPhotoClose");
if (btnPhotoClose && photoModal) {
    btnPhotoClose.onclick = () => photoModal.style.display = "none";
}
// 배경 클릭 닫기
if (photoModal) {
    photoModal.onclick = (e) => {
        if(e.target === photoModal) photoModal.style.display = "none";
    }
}

// ========================================
// 🔄 Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
});

if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadSchedules();
        }
    });
}

if (fBuilding) fBuilding.addEventListener('change', applyFiltersAndRender);
if (fStatus) fStatus.addEventListener('change', applyFiltersAndRender);
// if (fMonth) fMonth.addEventListener('change', applyFiltersAndRender);
if (btnRefresh) btnRefresh.addEventListener('click', loadSchedules);
if (btnGoOverview) btnGoOverview.addEventListener('click', () => location.href = 'schedule_overview.html');