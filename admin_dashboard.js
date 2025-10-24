// ========================================
// 🧺 HARU 린넨 통계 (incoming + returns)
// ========================================
import { db } from "./storage.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const dataType = document.getElementById("dataType");
const buildingFilter = document.getElementById("buildingFilter");
const autoMonthCheckbox = document.getElementById("autoMonth");
const monthPicker = document.getElementById("monthPicker");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const btnApply = document.getElementById("btnApply");
const btnReset = document.getElementById("btnReset");
const btnExportCsv = document.getElementById("btnExportCsv");
const btnExportPdf = document.getElementById("btnExportPdf");

const totalIncomingEl = document.getElementById("totalIncoming");
const totalReturnsEl = document.getElementById("totalReturns");
const totalNetEl = document.getElementById("totalNet");
const linenTableBody = document.getElementById("linenTableBody");
const statCards = document.getElementById("statCards");
const rangeLabel = document.getElementById("rangeLabel");

// 오늘 날짜 기준
const today = new Date();
const thisMonth = today.toISOString().slice(0, 7);
monthPicker.value = thisMonth;
autoMonthCheckbox.checked = true;

// 🧮 날짜 포맷
function formatDate(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  return `${y}-${m}-${day}`;
}

// 📅 한 달 자동 체크시
autoMonthCheckbox.addEventListener("change", () => {
  if (autoMonthCheckbox.checked) {
    const month = monthPicker.value;
    const start = `${month}-01`;
    const end = new Date(month + "-01");
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    const endStr = formatDate(end);
    startDateInput.value = start;
    endDateInput.value = endStr;
  }
});

// 초기 날짜 셋팅
autoMonthCheckbox.dispatchEvent(new Event("change"));

// 🧺 데이터 합산 함수
async function getTotals(collectionName, startStr, endStr, building, fieldName) {
  let qRef = query(
    collection(db, collectionName),
    where("date", ">=", startStr),
    where("date", "<=", endStr)
  );

  if (building) {
    qRef = query(
      collection(db, collectionName),
      where("buildingId", "==", building),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );
  }

  const snap = await getDocs(qRef);
  const totalsByLinen = {};

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (Array.isArray(data.items)) {
      data.items.forEach(item => {
        const name = item.linenType || item.type;
        const count = Number(item[fieldName] || 0);
        totalsByLinen[name] = (totalsByLinen[name] || 0) + count;
      });
    }
  });

  return totalsByLinen;
}

// 📊 렌더링
async function renderStats() {
  const startStr = startDateInput.value;
  const endStr = endDateInput.value;
  const building = buildingFilter.value;
  const type = dataType.value;

  let incomingTotals = {};
  let returnTotals = {};

  // 데이터 타입에 따른 조건 처리
  if (type === "all" || type === "incoming") {
    incomingTotals = await getTotals("incoming", startStr, endStr, building, "receivedCount");
  }
  if (type === "all" || type === "returns") {
    returnTotals = await getTotals("returns", startStr, endStr, building, "defectCount");
  }

  const linenNames = new Set([...Object.keys(incomingTotals), ...Object.keys(returnTotals)]);
  let totalIncoming = 0;
  let totalReturns = 0;
  let rows = "";

  linenNames.forEach(name => {
    const inCount = incomingTotals[name] || 0;
    const reCount = returnTotals[name] || 0;
    const net = inCount - reCount;
    totalIncoming += inCount;
    totalReturns += reCount;
    rows += `
      <tr>
        <td>${name}</td>
        <td class="t-right">${inCount.toLocaleString()}</td>
        <td class="t-right">${reCount.toLocaleString()}</td>
        <td class="t-right">${net.toLocaleString()}</td>
      </tr>
    `;
  });

  linenTableBody.innerHTML = rows || `<tr><td colspan="4" style="text-align:center;">데이터가 없습니다.</td></tr>`;
  totalIncomingEl.textContent = totalIncoming.toLocaleString();
  totalReturnsEl.textContent = totalReturns.toLocaleString();
  totalNetEl.textContent = (totalIncoming - totalReturns).toLocaleString();

  rangeLabel.textContent = `📅 ${startStr} ~ ${endStr} ｜ 🏢 ${building || "전체"} ｜ ${type === "all" ? "입고+반품" : type === "incoming" ? "입고만" : "반품만"}`;

  // 카드 뷰 렌더링
  statCards.innerHTML = `
    <div class="card"><h3>📥 총 입고</h3><p>${totalIncoming.toLocaleString()}</p></div>
    <div class="card"><h3>📦 총 반품</h3><p>${totalReturns.toLocaleString()}</p></div>
    <div class="card"><h3>🧾 순입고</h3><p>${(totalIncoming - totalReturns).toLocaleString()}</p></div>
  `;
}

// 🔘 버튼 이벤트
btnApply.addEventListener("click", renderStats);
btnReset.addEventListener("click", () => {
  dataType.value = "all";
  buildingFilter.value = "";
  monthPicker.value = thisMonth;
  autoMonthCheckbox.checked = true;
  autoMonthCheckbox.dispatchEvent(new Event("change"));
  renderStats();
});

// 📤 CSV
btnExportCsv.addEventListener("click", () => {
  const rows = [["품목", "입고 수량", "반품 수량", "순입고"]];
  document.querySelectorAll("#linenTableBody tr").forEach(tr => {
    const cols = Array.from(tr.querySelectorAll("td")).map(td => td.textContent);
    rows.push(cols);
  });
  const csv = rows.map(r => r.join(",")).join("\n");
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

// 📑 PDF
btnExportPdf.addEventListener("click", async () => {
  const { jsPDF } = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("HARU 린넨 통계", 14, 20);

  let y = 30;
  document.querySelectorAll("#linenTableBody tr").forEach(tr => {
    const cells = Array.from(tr.querySelectorAll("td")).map(td => td.textContent);
    doc.text(cells.join("    "), 14, y);
    y += 8;
  });

  doc.save(`HARU_린넨통계_${Date.now()}.pdf`);
});

// 🚀 초기 로드
renderStats();
