// ========================================
// 📊 HARU 린넨 통계 로직 (Tokyo Day Bright - Korean)
// ========================================

import { initHeaderMenu } from "./header.js";
import { db } from "./storage.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 1. 헤더 로드 (HTML 인라인 스크립트 대체)
document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html")
    .then(r => r.text())
    .then(h => {
      const headerPlaceholder = document.getElementById("header-placeholder");
      if (headerPlaceholder) {
        headerPlaceholder.innerHTML = h;
        initHeaderMenu();
      }
    })
    .catch(err => console.error("헤더 로드 실패:", err));
});

// DOM 요소 참조 (ID 변경 없음 - 원본 유지)
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
const updatedLabel = document.getElementById("updatedLabel");

// 날짜 초기화
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

// 📅 한 달 자동 체크 로직
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
// 초기 실행
autoMonthCheckbox.dispatchEvent(new Event("change"));

// 🧺 데이터 집계 함수 (로직 100% 원본 유지)
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
        if (name) {
          totalsByLinen[name] = (totalsByLinen[name] || 0) + count;
        }
      });
    }
  });

  return totalsByLinen;
}

// 📊 렌더링 (디자인 수정: 이모지 제거, 한국어, CSS 변수 적용)
async function renderStats() {
  // 로딩 상태 (미니멀 디자인)
  if(statCards) statCards.innerHTML = `<div class="card"><h3>상태</h3><p style="font-size:16px; color:#94A3B8;">데이터 분석 중...</p></div>`;
  if(linenTableBody) linenTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#CBD5E1;">데이터를 불러오고 있습니다...</td></tr>`;

  const startStr = startDateInput.value;
  const endStr = endDateInput.value;
  const building = buildingFilter.value;
  const type = dataType.value;

  let incomingTotals = {};
  let returnTotals = {};

  try {
    const promises = [];
    if (type === "all" || type === "incoming") {
      promises.push(getTotals("incoming", startStr, endStr, building, "receivedCount").then(res => incomingTotals = res));
    }
    if (type === "all" || type === "returns") {
      promises.push(getTotals("returns", startStr, endStr, building, "defectCount").then(res => returnTotals = res));
    }
    
    await Promise.all(promises);

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
      
      // 디자인: 순입고 색상 처리 (음수면 빨강, 양수면 초록)
      // common.css에 정의된 변수 사용
      const netStyle = net < 0 
        ? 'color: var(--stat-return); font-weight:700;' 
        : 'color: var(--stat-net); font-weight:700;';

      // 테이블 행 생성 (이모지 제거, 깔끔한 텍스트)
      rows += `
        <tr>
          <td><span style="font-weight:600; color:var(--haru-navy);">${name}</span></td>
          <td class="t-right" style="color:var(--stat-incoming);">${inCount.toLocaleString()}</td>
          <td class="t-right" style="color:var(--stat-return);">${reCount.toLocaleString()}</td>
          <td class="t-right" style="${netStyle}">${net.toLocaleString()}</td>
        </tr>
      `;
    });

    // 테이블 업데이트
    linenTableBody.innerHTML = rows || `<tr><td colspan="4" style="text-align:center; padding:40px; color:#CBD5E1;">데이터가 없습니다.</td></tr>`;

    // 상단 요약 바 업데이트
    if(totalIncomingEl) totalIncomingEl.textContent = totalIncoming.toLocaleString();
    if(totalReturnsEl) totalReturnsEl.textContent = totalReturns.toLocaleString();
    if(totalNetEl) totalNetEl.textContent = (totalIncoming - totalReturns).toLocaleString();

    // 정보 텍스트 업데이트 (텍스트만 깔끔하게)
    if(rangeLabel) rangeLabel.textContent = `${startStr} ~ ${endStr} / ${building || "전체 건물"} / ${type === "all" ? "전체 내역" : type === "incoming" ? "입고 내역" : "반품 내역"}`;
    if(updatedLabel) updatedLabel.textContent = `업데이트: ${new Date().toLocaleTimeString()}`;

    // 📊 카드 뷰 렌더링 (이모지 제거, 한국어 타이틀, CSS 색상 변수 적용)
    statCards.innerHTML = `
      <div class="card">
        <h3>총 입고 수량</h3>
        <p style="color: var(--stat-incoming);">${totalIncoming.toLocaleString()}</p>
      </div>
      <div class="card">
        <h3>총 반품 수량</h3>
        <p style="color: var(--stat-return);">${totalReturns.toLocaleString()}</p>
      </div>
      <div class="card">
        <h3>순입고 (실재고)</h3>
        <p style="color: var(--stat-net);">${(totalIncoming - totalReturns).toLocaleString()}</p>
      </div>
    `;

  } catch (err) {
    console.error("Stats Error:", err);
    linenTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#E74C3C; padding:40px;">데이터 로드 중 오류 발생</td></tr>`;
  }
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

// 📤 CSV 내보내기 (이모지 제거된 깔끔한 헤더)
btnExportCsv.addEventListener("click", () => {
  const rows = [["품목명", "입고 수량", "반품 수량", "순입고"]];
  document.querySelectorAll("#linenTableBody tr").forEach(tr => {
    if (tr.cells.length < 4) return;
    const cols = Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim());
    rows.push(cols);
  });
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HARU_린넨통계_${formatDate(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// 📑 PDF 내보내기
btnExportPdf.addEventListener("click", async () => {
  try {
    const { jsPDF } = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js");
    const doc = new jsPDF();
    
    // 기본 영문 타이틀 (한글 폰트 미로드시 깨짐 방지 안전장치)
    doc.setFontSize(14);
    doc.text("HARU LINEN REPORT", 14, 20);

    doc.setFontSize(10);
    doc.text(`Period: ${startDateInput.value} ~ ${endDateInput.value}`, 14, 30);

    let y = 45;
    doc.text("ITEM | IN | OUT | NET", 14, 40);

    document.querySelectorAll("#linenTableBody tr").forEach(tr => {
      if (tr.cells.length < 4) return;
      const cells = Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim());
      // 셀 내용 출력
      doc.text(`${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[3]}`, 14, y);
      y += 8;
      
      // 페이지 넘김
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`HARU_린넨통계_${Date.now()}.pdf`);
  } catch (e) {
    console.error("PDF Export Error:", e);
    alert("PDF 생성 중 오류가 발생했습니다.");
  }
});

// 🚀 초기 실행
renderStats();