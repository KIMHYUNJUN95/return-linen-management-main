// ========================================
// 📅 HARU 주기 관리 대시보드
// - FullCalendar
// - 사진 업로드 완료
// - 다음 주기 자동 생성
// - 과거 일정도 캘린더에 표시
// - 사진 없이 강제 완료 옵션 추가
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
   🧭 유틸
======================================== */
const todayISO = () => new Date().toISOString().slice(0, 10);

function toISODate(v) {
  if (!v) return null;
  try {
    // 순수 YYYY-MM-DD
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return v;
    }
    // Firestore Timestamp
    if (typeof v === "object" && v.seconds) {
      return new Date(v.seconds * 1000).toISOString().slice(0, 10);
    }
    // Date 문자열
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch (e) {
    console.warn("toISODate 변환 실패:", v);
  }
  return null;
}

function addMonths(isoYYYYMMDD, months) {
  const base = isoYYYYMMDD ? new Date(isoYYYYMMDD) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

function yyyymmOf(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
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
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", loadSchedule, { once: true });
    } else {
      loadSchedule();
    }
  }
});

/* ========================================
   📥 Firestore 일정 불러오기
======================================== */
async function loadSchedule() {
  try {
    const colRef = collection(db, "maintenance_schedule");
    // 과거 포함 전체
    const qy = query(colRef, orderBy("nextDue", "asc"));
    const snap = await getDocs(qy);

    const items = [];
    snap.forEach((s) => items.push({ id: s.id, ...s.data() }));

    const today = todayISO();

    // 상태 계산
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

    const filtered = applyFilters(items);

    renderCalendar(filtered);
    renderMobileList(filtered);
    renderMonthlySummary(allItems);
  } catch (err) {
    console.error("🚨 스케줄 불러오기 오류:", err);
  }
}

/* ========================================
   🔍 필터 적용
======================================== */
function applyFilters(items) {
  const b = fBuilding ? fBuilding.value : "";
  const s = fStatus ? fStatus.value : "";
  const m = fMonth ? fMonth.value : "";

  return items.filter((row) => {
    let ok = true;
    if (b && row.building !== b) ok = false;

    const stat = row._computedStatus || row.status || "upcoming";
    if (s && stat !== s) ok = false;

    if (m) {
      const nd = toISODate(row.nextDue);
      if (!(nd && nd.startsWith(m))) ok = false;
    }

    return ok;
  });
}

/* ========================================
   📅 캘린더
======================================== */
function renderCalendar(data) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  // 완료는 캘린더에서 빼고 보여주고 싶어서 필터링
  const events = data
    .filter((d) => (d._computedStatus || d.status) !== "done")
    .map((d) => {
      const start = toISODate(d.nextDue) || toISODate(d.startDate) || null;
      return {
        title: `${d.building}-${d.room || "-"} · ${d.taskName}`,
        start,
        classNames: [
          (d._computedStatus === "overdue" && "ev-overdue") ||
            (d._computedStatus === "progress" && "ev-progress") ||
            (d._computedStatus === "upcoming" && "ev-upcoming") ||
            "ev-upcoming",
        ],
        extendedProps: d,
      };
    })
    .filter((e) => !!e.start);

  if (calendar) calendar.destroy();

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko",
    height: "auto",
    initialDate: new Date(), // 오늘 기준
    events,
    eventClick: (info) => {
      const data = info.event.extendedProps;
      openDetailModal(data);
    },
  });

  calendar.render();
}

/* ========================================
   📱 모바일 리스트
======================================== */
function renderMobileList(data) {
  if (!mobileList) return;
  if (!data.length) {
    mobileList.innerHTML =
      '<div style="text-align:center;opacity:.6;">데이터가 없습니다.</div>';
    return;
  }

  const html = data
    .map((d) => {
      const st = d._computedStatus || d.status || "upcoming";
      const badgeClass =
        st === "done"
          ? "b-done"
          : st === "overdue"
          ? "b-overdue"
          : st === "progress"
          ? "b-progress"
          : "b-upcoming";

      return `
        <div class="ml-item" data-id="${d.id}">
          <div class="ml-top" style="display:flex;justify-content:space-between;align-items:center;">
            <div><b>${d.building}</b> - ${d.room || "-"}</div>
            <div class="badge ${badgeClass}">${statusText(st)}</div>
          </div>
          <div style="margin-top:4px;font-weight:600;">${d.taskName}</div>
          <div class="ml-meta" style="font-size:12px;color:#6b7280;">📅 예정일: ${toISODate(
            d.nextDue
          ) || "-"} | 🕓 최근: ${toISODate(d.lastDone) || "-"}</div>
          <div class="ml-actions" style="margin-top:6px;display:flex;gap:6px;">
            <button class="btn btn-sm" data-action="detail" style="height:30px;">상세</button>
            ${
              st === "done"
                ? ""
                : '<button class="btn btn-sm btn-primary" data-action="complete" style="height:30px;">완료</button>'
            }
          </div>
        </div>
      `;
    })
    .join("");

  mobileList.innerHTML = html;

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
   🧾 상태 텍스트
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

  detailModal.style.display = "flex";
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
function openPhotoModal(url) {
  if (!photoModal) return;
  const img = document.getElementById("photoImg");
  const link = document.getElementById("btnPhotoOpen");
  const cap = document.getElementById("photoCap");
  if (img) img.src = url;
  if (link) link.href = url;
  if (cap) cap.textContent = "";
  photoModal.style.display = "flex";
}

if (btnPhotoClose) btnPhotoClose.onclick = () => (photoModal.style.display = "none");

/* ========================================
   ✅ 완료 모달 + 사진업로드 + 다음주기 생성
   🔥 사진이 없으면 관리자가 강제로 완료 가능
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

    const noteEl = document.getElementById("cNote");
    const fileEl = document.getElementById("cPhoto");
    const note = noteEl ? noteEl.value.trim() : "";
    const file = fileEl ? fileEl.files[0] : null;

    try {
      const doneDate = todayISO();
      let photoUrl = null;

      if (file) {
        // 정상 흐름: 사진 업로드
        const path = `maintenance_photos/${selectedDoc.building}_${
          selectedDoc.room || "-"
        }_${Date.now()}_${file.name}`;
        const fileRef = ref(storage, path);
        const snap = await uploadBytes(fileRef, file);
        photoUrl = await getDownloadURL(snap.ref);
      } else {
        // 🔥 사진 없이 강제 완료
        const ok = confirm("사진 없이 완료 처리하시겠습니까?");
        if (!ok) {
          isProcessing = false;
          return;
        }
      }

      // 원본 문서 업데이트
      const docRef = doc(db, "maintenance_schedule", selectedDoc.id);
      await updateDoc(docRef, {
        status: "done",
        note,
        photoUrl: photoUrl || selectedDoc.photoUrl || null,
        lastDone: doneDate,
        updatedBy: currentUser?.email || "unknown",
        timestamp: serverTimestamp(),
      });

      // 다음 주기 자동 생성
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
    calWrap.parentElement.insertBefore(
      summary,
      document.getElementById("mobileList")
    );
  }
  return summary;
}

function renderMonthlySummary(items) {
  const summaryWrap = ensureSummaryContainer();
  if (!summaryWrap) return;
  const container = document.getElementById("monthlySummaryInner");
  if (!container) return;

  const ym = yyyymmOf(new Date());
  const currentMonthItems = items.filter((it) => {
    const next = toISODate(it.nextDue);
    const start = toISODate(it.startDate);
    return (next && next.startsWith(ym)) || (start && start.startsWith(ym));
  });

  const done = currentMonthItems.filter(
    (it) => (it.status || it._computedStatus) === "done"
  ).length;
  const notDone = currentMonthItems.filter(
    (it) => (it.status || it._computedStatus) !== "done"
  );
  const overdue = notDone.filter(
    (it) => (it._computedStatus || it.status) === "overdue"
  ).length;
  const upcoming = notDone.filter(
    (it) => (it._computedStatus || it.status) === "upcoming"
  ).length;
  const progress = notDone.filter(
    (it) => (it._computedStatus || it.status) === "progress"
  ).length;

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
