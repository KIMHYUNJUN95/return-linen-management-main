// admin_dashboard.js — 카드형 린넨 통계 대시보드
import { db } from "./storage.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ====== 요소 ====== */
const autoMonthEl = document.getElementById("autoMonth");
const monthPicker = document.getElementById("monthPicker");
const startDateEl = document.getElementById("startDate");
const endDateEl = document.getElementById("endDate");
const btnApply = document.getElementById("btnApply");
const btnReset = document.getElementById("btnReset");
const btnExportCsv = document.getElementById("btnExportCsv");
const btnExportPdf = document.getElementById("btnExportPdf");

const rangeLabel = document.getElementById("rangeLabel");
const updatedLabel = document.getElementById("updatedLabel");
const statCards = document.getElementById("statCards");

const totalIncomingEl = document.getElementById("totalIncoming");
const totalReturnsEl = document.getElementById("totalReturns");
const totalNetEl = document.getElementById("totalNet");

/* ====== 기본 린넨 리스트 ====== */
const OFFICIAL_LINENS = [
  "싱글 이불 커버",
  "싱글 매트 커버",
  "더블 이불 커버",
  "더블 매트 커버",
  "더블 매트 커버(고무)",
  "배게 커버",
  "수건타월",
  "발매트",
];

function normalizeName(name) {
  if (!name) return "";
  const clean = name.replace(/\s+/g, "").trim();
  for (const official of OFFICIAL_LINENS) {
    if (clean.includes(official.replace(/\s+/g, ""))) return official;
  }
  return name;
}

/* ====== 날짜 유틸 ====== */
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
function formatDate(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function startEndOfMonth(year, monthIndex) {
  const s = new Date(year, monthIndex, 1);
  const e = new Date(year, monthIndex + 1, 0);
  return [formatDate(s), formatDate(e)];
}
function todayYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

/* ====== 초기화 ====== */
(function initFilters() {
  monthPicker.value = todayYearMonth();
  autoMonthEl.checked = true;
  applyAutoMonthRange();
})();

function applyAutoMonthRange() {
  const [y, m] = monthPicker.value.split("-").map(Number);
  if (!y || !m) return;
  const [s, e] = startEndOfMonth(y, m - 1);
  startDateEl.value = s;
  endDateEl.value = e;
  rangeLabel.textContent = `기간: ${s} ~ ${e} (한 달 자동)`;
}
function applyManualRangeLabel() {
  const s = startDateEl.value || "-";
  const e = endDateEl.value || "-";
  rangeLabel.textContent = `기간: ${s} ~ ${e} (직접 선택)`;
}

autoMonthEl.addEventListener("change", () => {
  if (autoMonthEl.checked) applyAutoMonthRange();
  else applyManualRangeLabel();
});
monthPicker.addEventListener("change", () => {
  if (autoMonthEl.checked) applyAutoMonthRange();
});
btnApply.addEventListener("click", () => {
  if (autoMonthEl.checked) applyAutoMonthRange();
  else applyManualRangeLabel();
  loadAndRender();
});
btnReset.addEventListener("click", () => {
  monthPicker.value = todayYearMonth();
  autoMonthEl.checked = true;
  applyAutoMonthRange();
  loadAndRender();
});

window.addEventListener("DOMContentLoaded", () => loadAndRender());

/* ====== Firestore 데이터 수집 ====== */
function extractItems(items, kind) {
  if (!Array.isArray(items)) return [];
  return items
    .map((i) => {
      const name = normalizeName(i.linenType || i.type || "");
      let qty = 0;
      if (kind === "incoming")
        qty = Number(i.receivedCount ?? i.count ?? i.qty ?? 0);
      else qty = Number(i.defectCount ?? i.count ?? i.qty ?? 0);
      return { name, qty: isNaN(qty) ? 0 : qty };
    })
    .filter((x) => x.name);
}

async function fetchRange(collectionName, startDate, endDate) {
  const qRef = query(collection(db, collectionName), orderBy("date", "desc"));
  const snap = await getDocs(qRef);
  const list = [];
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const dateStr = d.date;
    if (!dateStr) return;
    if (startDate && dateStr < startDate) return;
    if (endDate && dateStr > endDate) return;
    list.push({ id: docSnap.id, ...d });
  });
  return list;
}

/* ====== 데이터 로드 + 카드 렌더링 ====== */
async function loadAndRender() {
  try {
    const s = startDateEl.value;
    const e = endDateEl.value;
    statCards.innerHTML = `<div class="card"><h3>불러오는 중...</h3></div>`;

    const [incomingList, returnsList] = await Promise.all([
      fetchRange("incoming", s, e),
      fetchRange("returns", s, e),
    ]);

    const incomingMap = new Map();
    const returnsMap = new Map();

    incomingList.forEach((d) => {
      extractItems(d.items, "incoming").forEach(({ name, qty }) => {
        incomingMap.set(name, (incomingMap.get(name) || 0) + qty);
      });
    });
    returnsList.forEach((d) => {
      extractItems(d.items, "returns").forEach(({ name, qty }) => {
        returnsMap.set(name, (returnsMap.get(name) || 0) + qty);
      });
    });

    let totalIn = 0,
      totalRet = 0,
      totalNet = 0;

    const cards = OFFICIAL_LINENS.map((name) => {
      const inQty = incomingMap.get(name) || 0;
      const retQty = returnsMap.get(name) || 0;
      const net = inQty - retQty;
      totalIn += inQty;
      totalRet += retQty;
      totalNet += net;

      return `
        <div class="card">
          <h3>${name}</h3>
          <p>입고: <b>${inQty}</b></p>
          <p>반품: <b>${retQty}</b></p>
          <p>순입고: <b>${net}</b></p>
        </div>`;
    }).join("");

    statCards.innerHTML = cards;
    totalIncomingEl.textContent = totalIn;
    totalReturnsEl.textContent = totalRet;
    totalNetEl.textContent = totalNet;
    updatedLabel.textContent = `업데이트: ${formatDate(new Date())}`;
  } catch (err) {
    console.error("❌ 대시보드 로드 오류:", err);
    statCards.innerHTML = `<div class="card"><h3>데이터를 불러오지 못했습니다.</h3></div>`;
    totalIncomingEl.textContent = "0";
    totalReturnsEl.textContent = "0";
    totalNetEl.textContent = "0";
  }
}

/* ====== 내보내기 ====== */
btnExportCsv.addEventListener("click", () => {
  const rows = [["린넨", "입고 수량", "반품 수량", "순 입고량"]];
  document.querySelectorAll(".card").forEach((card) => {
    const name = card.querySelector("h3")?.textContent.trim();
    const values = Array.from(card.querySelectorAll("b")).map(
      (b) => b.textContent
    );
    if (name && values.length === 3) rows.push([name, ...values]);
  });

  rows.push([
    "총 합계",
    totalIncomingEl.textContent,
    totalReturnsEl.textContent,
    totalNetEl.textContent,
  ]);

  const csv = rows
    .map((r) => r.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HARU_린넨통계_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

btnExportPdf.addEventListener("click", () => {
  window.print();
});
