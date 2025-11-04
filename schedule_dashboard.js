// ========================================
// 📅 HARU 주기 관리 대시보드
// - FullCalendar
// - 완료 시 사진 업로드
// - 다음 주기 자동 생성 (DB에는 저장)
// - 하지만 화면에는 이번 달 것만 표시
// - JST(도쿄) 기준 날짜 보정
// ========================================

import { db, storage, auth } from "./storage.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ========================================
   🔧 DOM
======================================== */
const fBuilding = document.getElementById("fBuilding");
const fStatus = document.getElementById("fStatus");
const fMonth = document.getElementById("fMonth");
const btnRefresh = document.getElementById("btnRefresh");
const mobileList = document.getElementById("mobileList");

const detailModal = document.getElementById("detailModal");
const completeModal = document.getElementById("completeModal");
const photoModal = document.getElementById("photoModal");

const btnDetailClose = document.getElementById("btnDetailClose");
const btnOpenComplete = document.getElementById("btnOpenComplete");

const btnCompleteCancel = document.getElementById("btnCompleteCancel");
const btnCompleteSubmit = document.getElementById("btnCompleteSubmit");

const btnPhotoClose = document.getElementById("btnPhotoClose");

let calendar;
let currentUser = null;
let selectedDoc = null;
let allItems = [];
let isProcessing = false;

/* ========================================
   🧭 JST 기준 유틸
======================================== */
// 오늘날짜를 "YYYY-MM-DD" 로, 일본시간 기준으로
const todayISO = () => {
  const now = new Date();
  const jst = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + 9 * 60 * 60 * 1000
  );
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, "0");
  const d = String(jst.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Firestore Timestamp, 문자열, Date 를 전부 "YYYY-MM-DD" 로 바꿔줌 (JST)
function toISODate(d) {
  if (!d) return null;
  try {
    let base;
    if (typeof d === "object" && d.seconds) {
      base = new Date(d.seconds * 1000);
    } else {
      base = new Date(d);
    }
    if (isNaN(base)) return null;
    const jst = new Date(
      base.getTime() + base.getTimezoneOffset() * 60000 + 9 * 60 * 60 * 1000
    );
    const y = jst.getFullYear();
    const m = String(jst.getMonth() + 1).padStart(2, "0");
    const dd = String(jst.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  } catch {
    return null;
  }
}

// "YYYY-MM-DD" 에서 개월수 더해서 다시 "YYYY-MM-DD"
function addMonths(isoYYYYMMDD, months) {
  const [y, m, d] = isoYYYYMMDD.split("-").map(Number);
  const newDate = new Date(y, m - 1 + months, d);
  const ny = newDate.getFullYear();
  const nm = String(newDate.getMonth() + 1).padStart(2, "0");
  const nd = String(newDate.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function yyyymmOf(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/* ========================================
   🔐 로그인 + 초기 로드
======================================== */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("로그인 후 이용 가능합니다.");
    location.href = "login.html";
  } else {
    currentUser = user;
    loadSchedule();
  }
});

/* ========================================
   📥 Firestore 일정 불러오기
======================================== */
async function loadSchedule() {
  try {
    const qy = query(collection(db, "maintenance_schedule"), orderBy("nextDue", "asc"));
    const snap = await getDocs(qy);
    const items = [];
    snap.forEach((s) => items.push({ id: s.id, ...s.data() }));

    // 상태 계산
    const today = todayISO();
    items.forEach((it) => {
      const due = toISODate(it.nextDue);
      if (it.status === "done") {
        it._computedStatus = "done";
      } else if (due && due < today) {
        it._computedStatus = "overdue";
      } else {
        it._computedStatus = it.status || "upcoming";
      }
    });

    allItems = items;

    // ✅ 화면에는 이번 달 것만 보이게 (다음 주기로 자동 생성된 12월 일정은 숨김)
    const ymNow = yyyymmOf(new Date());
    const displayItems = applyFilters(items).filter((it) => {
      const nd = toISODate(it.nextDue);
      const sd = toISODate(it.startDate);
      // 날짜가 아예 없으면 보여준다 (등록 중 이상치 막기)
      if (!nd && !sd) return true;
      // nextDue가 이번 달이거나, startDate가 이번 달이면 표시
      if (nd && nd.startsWith(ymNow)) return true;
      if (sd && sd.startsWith(ymNow)) return true;
      // 나머지(다음달 이후 자동생성)는 화면에서만 숨김
      return false;
    });

    renderCalendar(displayItems);
    renderMobileList(displayItems);
    renderMonthlySummary(allItems);
  } catch (err) {
    console.error("🚨 스케줄 불러오기 오류:", err);
  }
}

/* ========================================
   🔍 필터
======================================== */
function applyFilters(items) {
  const b = fBuilding?.value || "";
  const s = fStatus?.value || "";
  const m = fMonth?.value || "";
  return items.filter((d) => {
    if (b && d.building !== b) return false;
    const stat = d._computedStatus || d.status || "upcoming";
    if (s && stat !== s) return false;
    if (m) {
      const nd = toISODate(d.nextDue);
      if (!(nd && nd.startsWith(m))) return false;
    }
    return true;
  });
}

/* ========================================
   📅 캘린더
======================================== */
function renderCalendar(data) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  const events = data
    .filter((d) => (d._computedStatus || d.status) !== "done")
    .map((d) => ({
      title: `${d.building}-${d.room || "-"} · ${d.taskName}`,
      start: toISODate(d.nextDue),
      extendedProps: d,
    }))
    .filter((e) => !!e.start);

  if (calendar) calendar.destroy();
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko",
    height: "auto",
    initialDate: new Date(), // 항상 이번 달
    events,
    eventClick: (info) => openDetailModal(info.event.extendedProps),
  });
  calendar.render();
}

/* ========================================
   📱 모바일 리스트
======================================== */
function renderMobileList(data) {
  if (!mobileList) return;
  if (!data.length) {
    mobileList.innerHTML = `<div style="text-align:center;opacity:.6;">데이터가 없습니다.</div>`;
    return;
  }

  mobileList.innerHTML = data
    .map((d) => {
      const st = d._computedStatus || d.status || "upcoming";
      return `
      <div class="ml-item" data-id="${d.id}">
        <div class="ml-top">
          <div><b>${d.building}</b> - ${d.room || "-"}</div>
          <div class="badge">${statusText(st)}</div>
        </div>
        <div style="margin-top:4px;font-weight:600;">${d.taskName}</div>
        <div class="ml-meta">📅 예정일: ${toISODate(d.nextDue) || "-"} | 🕓 최근: ${toISODate(d.lastDone) || "-"}</div>
        <div class="ml-actions">
          <button class="btn btn-sm" data-action="detail">상세</button>
          ${
            st === "done"
              ? ""
              : '<button class="btn btn-sm btn-primary" data-action="complete">완료</button>'
          }
        </div>
      </div>`;
    })
    .join("");

  mobileList.querySelectorAll(".ml-item button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".ml-item").dataset.id;
      const action = btn.dataset.action;
      const target = data.find((d) => d.id === id);
      if (!target) return;
      if (action === "detail") openDetailModal(target);
      if (action === "complete") openCompleteModal(target);
    });
  });
}

/* ========================================
   상태 텍스트
======================================== */
function statusText(s) {
  return (
    {
      upcoming: "예정",
      progress: "진행중",
      overdue: "지연",
      done: "완료",
    }[s] || s
  );
}

/* ========================================
   🔍 상세 모달
======================================== */
function openDetailModal(data) {
  if (!detailModal) return;
  selectedDoc = data;
  detailModal.style.display = "flex";

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? "-";
  };

  setText("dBuilding", data.building);
  setText("dRoom", data.room);
  setText("dTask", data.taskName);
  setText("dStatus", statusText(data._computedStatus || data.status));
  setText("dNextDue", toISODate(data.nextDue));
  setText("dLastDone", toISODate(data.lastDone));
  setText("dNote", data.note);

  // 사진 있으면 버튼 보여주기
  if (data.photoUrl) {
    const wrap = document.getElementById("dPhotoWrap");
    if (wrap) wrap.style.display = "flex";
    const btn = document.getElementById("btnOpenPhoto");
    if (btn) btn.onclick = () => openPhotoModal(data.photoUrl, data.note || "");
  } else {
    const wrap = document.getElementById("dPhotoWrap");
    if (wrap) wrap.style.display = "none";
  }
}

if (btnDetailClose)
  btnDetailClose.onclick = () => (detailModal.style.display = "none");

if (btnOpenComplete) {
  btnOpenComplete.onclick = () => {
    detailModal.style.display = "none";
    if (
      selectedDoc &&
      (selectedDoc._computedStatus || selectedDoc.status) !== "done"
    ) {
      openCompleteModal(selectedDoc);
    } else {
      alert("이미 완료된 작업입니다.");
    }
  };
}

/* ========================================
   🖼 사진 모달
======================================== */
function openPhotoModal(url, cap) {
  if (!photoModal) return;
  const img = document.getElementById("photoImg");
  const caption = document.getElementById("photoCap");
  const btnOpen = document.getElementById("btnPhotoOpen");
  if (img) img.src = url;
  if (caption) caption.textContent = cap || "";
  if (btnOpen) btnOpen.href = url;
  photoModal.style.display = "flex";
}
if (btnPhotoClose) btnPhotoClose.onclick = () => (photoModal.style.display = "none");

/* ========================================
   ✅ 완료 모달 & 처리
======================================== */
function openCompleteModal(data) {
  if (!completeModal) return;
  if (isProcessing) return alert("처리 중입니다. 잠시만 기다려주세요.");
  selectedDoc = data;
  completeModal.style.display = "flex";
}

if (btnCompleteCancel)
  btnCompleteCancel.onclick = () => (completeModal.style.display = "none");

if (btnCompleteSubmit) {
  btnCompleteSubmit.onclick = async () => {
    if (!selectedDoc) return;
    if (isProcessing) return;
    isProcessing = true;

    const note = document.getElementById("cNote").value.trim();
    const file = document.getElementById("cPhoto").files[0];
    if (!file) {
      alert("사진은 필수입니다.");
      isProcessing = false;
      return;
    }

    try {
      // 1) 사진 업로드
      const path = `maintenance_photos/${selectedDoc.building}_${selectedDoc.room || "-"}_${Date.now()}_${file.name}`;
      const fileRef = ref(storage, path);
      const snap = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snap.ref);

      // 2) 원래 문서 완료처리
      const doneDate = todayISO();
      await updateDoc(doc(db, "maintenance_schedule", selectedDoc.id), {
        status: "done",
        note,
        photoUrl: url,
        lastDone: doneDate,
        updatedBy: currentUser?.email || "unknown",
        timestamp: serverTimestamp(),
      });

      // 3) 다음 주기 자동 생성 (DB에는 넣지만, 화면에서는 이번 달만 보여서 안 보임)
      const cycle = Number(selectedDoc.cycleMonths || 0);
      if (cycle > 0) {
        const nextDue = addMonths(doneDate, cycle);
        await addDoc(collection(db, "maintenance_schedule"), {
          building: selectedDoc.building,
          room: selectedDoc.room || "-",
          taskName: selectedDoc.taskName,
          cycleMonths: cycle,
          note: "",
          status: "upcoming",
          startDate: doneDate,
          nextDue,
          lastDone: null,
          createdBy: currentUser?.email || "unknown",
          timestamp: serverTimestamp(),
        });
      }

      alert("✅ 완료 처리되었습니다.");
      completeModal.style.display = "none";

      await loadSchedule();
      if (calendar) calendar.gotoDate(new Date());
    } catch (err) {
      console.error("🚨 완료 처리 오류:", err);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      isProcessing = false;
    }
  };
}

/* ========================================
   📊 이번달 요약
======================================== */
function ensureSummaryContainer() {
  let summary = document.getElementById("monthlySummary");
  if (!summary) {
    const calWrap = document.querySelector(".calendar-card");
    if (!calWrap || !calWrap.parentElement) return null;
    summary = document.createElement("section");
    summary.id = "monthlySummary";
    summary.style.marginTop = "12px";
    summary.innerHTML = `<div id="monthlySummaryInner"></div>`;
    calWrap.parentElement.insertBefore(summary, document.getElementById("mobileList"));
  }
  return summary;
}

function renderMonthlySummary(items) {
  const wrap = ensureSummaryContainer();
  if (!wrap) return;
  const container = document.getElementById("monthlySummaryInner");
  if (!container) return;

  const ym = yyyymmOf(new Date());
  const currentMonthItems = items.filter((it) => {
    const next = toISODate(it.nextDue);
    const start = toISODate(it.startDate);
    return (next && next.startsWith(ym)) || (start && start.startsWith(ym));
  });

  const done = currentMonthItems.filter((it) => (it.status || it._computedStatus) === "done").length;
  const notDone = currentMonthItems.filter((it) => (it.status || it._computedStatus) !== "done");
  const overdue = notDone.filter((it) => (it._computedStatus || it.status) === "overdue").length;
  const upcoming = notDone.filter((it) => (it._computedStatus || it.status) === "upcoming").length;
  const progress = notDone.filter((it) => (it._computedStatus || it.status) === "progress").length;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
      <div style="background:#fff;border:1px solid #e6eaf0;border-radius:12px;padding:14px;">
        <div style="font-weight:800;color:#111;">이번달 완료</div>
        <div style="font-size:28px;font-weight:900;color:#10b981;margin-top:4px;">${done}</div>
      </div>
      <div style="background:#fff;border:1px solid #e6eaf0;border-radius:12px;padding:14px;">
        <div style="font-weight:800;color:#111;">이번달 미완료</div>
        <div style="font-size:28px;font-weight:900;color:#ef4444;margin-top:4px;">${notDone.length}</div>
      </div>
      <div style="background:#fff;border:1px solid #e6eaf0;border-radius:12px;padding:14px;">
        <div style="font-weight:800;color:#111;">지연</div>
        <div style="font-size:28px;font-weight:900;color:#b91c1c;margin-top:4px;">${overdue}</div>
      </div>
      <div style="background:#fff;border:1px solid #e6eaf0;border-radius:12px;padding:14px;">
        <div style="font-weight:800;color:#111;">예정</div>
        <div style="font-size:28px;font-weight:900;color:#0ea5e9;margin-top:4px;">${upcoming}</div>
      </div>
      <div style="background:#fff;border:1px solid #e6eaf0;border-radius:12px;padding:14px;">
        <div style="font-weight:800;color:#111;">진행중</div>
        <div style="font-size:28px;font-weight:900;color:#a16207;margin-top:4px;">${progress}</div>
      </div>
    </div>
  `;
}

/* ========================================
   🔄 새로고침 버튼
======================================== */
if (btnRefresh) btnRefresh.onclick = () => loadSchedule();
