// ===============================
// 🧺 내역 관리 로직 (Tokyo Day Bright)
// — 본인+관리자 수정/삭제 허용
// ===============================

import { initHeaderMenu } from "./header.js";
import { db, auth } from "./storage.js"; // storage.js 통합 사용
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 1. 헤더 로드
document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html")
    .then(r => r.text())
    .then(h => {
      const placeholder = document.getElementById("header-placeholder");
      if (placeholder) {
        placeholder.innerHTML = h;
        initHeaderMenu();
      }
    })
    .catch(err => console.error("헤더 로드 실패:", err));
});

/* ✅ 린넨명 정규화 */
const OFFICIAL_LINENS = [
  "싱글 이불 커버", "싱글 매트 커버", "더블 이불 커버",
  "더블 매트 커버", "더블 매트 커버(고무)", "배게 커버",
  "수건타월", "발매트"
];
function normalizeLinenName(name) {
  if (!name) return "";
  const clean = name.replace(/\s+/g, "").trim();
  for (const official of OFFICIAL_LINENS) {
    if (clean.includes(official.replace(/\s+/g, ""))) return official;
  }
  return name;
}

const cardBody = document.getElementById("historyCardBody");
let allData = [];

/* ✅ 로딩 UI */
function showLoading() {
  if(cardBody) cardBody.innerHTML = `<div style="text-align:center; padding:40px; color:#94A3B8;">데이터를 불러오는 중입니다...</div>`;
}

/* ✅ 카드 렌더링 (디자인 리뉴얼) */
function renderCards(list) {
  const currentUser = auth.currentUser;
  const currentEmail = currentUser?.email || null;
  const adminEmail = "rlaguswns95@haru-tokyo.com";

  if (!list || list.length === 0) {
    cardBody.innerHTML = `<p style="text-align:center; padding:40px; color:#CBD5E1;">조회된 내역이 없습니다.</p>`;
    return;
  }

  // 날짜 내림차순 정렬
  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  cardBody.innerHTML = list.map(d => {
    // 권한 체크 (UI 표시용 - 실제 차단은 Firestore Rules)
    const isOwner = currentEmail && (d.authorEmail === currentEmail || d.userEmail === currentEmail);
    const isAdmin = currentEmail === adminEmail;
    const isEditable = isOwner || isAdmin;

    // 타입별 텍스트
    const typeText = d.type === "입고" ? "INCOMING" : "RETURN";

    // HTML 구조 생성
    return `
    <div class="history-card" data-type="${d.type}">
      <header>
        <span class="type-badge">${typeText}</span>
        <span class="meta">${d.date}</span>
      </header>

      <div class="info-row">
        <span class="info-label">건물</span>
        <span class="content">${d.building}</span>
      </div>
      <div class="info-row">
        <span class="info-label">담당자</span>
        <span class="content">${d.staff}</span>
      </div>

      <div style="margin-top:12px; border-top:1px solid #F1F5F9; padding-top:8px;">
        ${(d.items || [])
          .map(i => `
            <div style="display:flex; justify-content:space-between; font-size:13px; color:#334155; margin-bottom:4px;">
              <span>${i.linenType}</span>
              <span style="font-weight:700;">${i.count}</span>
            </div>
          `)
          .join("")}
      </div>

      ${d.desc && d.desc !== "-" 
        ? `<div class="content" style="margin-top:12px; font-size:13px; color:#64748B;">
             <span style="font-weight:700; color:#2C3E50;">MEMO</span><br>${d.desc}
           </div>`
        : ""
      }

      ${isEditable 
        ? `<div class="card-actions">
             <button class="btn-action" data-id="${d.id}" data-col="${d.col}">수정</button>
             <button class="btn-action del" data-id="${d.id}" data-col="${d.col}">삭제</button>
           </div>`
        : ""
      }
    </div>`;
  }).join("");

  // 이벤트 리스너 연결
  document.querySelectorAll(".btn-action").forEach(b => {
    if (b.classList.contains("del")) {
      b.addEventListener("click", () => deleteRecord(b.dataset.id, b.dataset.col));
    } else {
      b.addEventListener("click", () => openEditModal(b.dataset.id, b.dataset.col));
    }
  });
}

/* ✅ 데이터 파싱 (로직 유지) */
function parseSnap(snap, type) {
  const temp = [];
  snap.forEach(d => {
    const x = d.data();
    temp.push({
      id: d.id,
      col: d.ref.parent.id,
      type,
      date: x.date || "-",
      building: x.buildingId || x.building || "-",
      staff: x.staffName || x.staff || "-",
      desc: x.desc || "-",
      authorEmail: x.authorEmail || x.userEmail || null,
      items: (x.items || []).map(i => ({
        linenType: normalizeLinenName(i.linenType || i.type || ""),
        count: i.receivedCount ?? i.defectCount ?? 0,
      })),
    });
  });
  return temp;
}

/* ✅ 병렬 로드 및 필터링 (스마트 리미트 적용) */
async function loadHistory() {
  if(!cardBody) return;
  showLoading();
  allData = [];

  const typeFilter = document.getElementById("filterType")?.value;
  const buildingFilter = document.getElementById("filterBuilding")?.value;
  const startDate = document.getElementById("startDate")?.value;
  const endDate = document.getElementById("endDate")?.value;

  // 🛑 [수정됨] 날짜 검색 여부에 따라 가져올 데이터 개수 조절
  // 날짜를 지정하면 기간 내 데이터를 다 봐야 하므로 제한을 2000개로 늘림
  // 평소에는 300개만 보여줌 (기존 100개는 너무 적음)
  let queryLimit = 300; 
  if (startDate || endDate) {
      queryLimit = 2000; 
  }

  const jobs = [
    { db, col: "incoming", type: "입고" },
    { db, col: "returns", type: "반품" },
  ];

  for (const job of jobs) {
    (async () => {
      try {
        const q = query(
          collection(job.db, job.col),
          orderBy("date", "desc"),
          limit(queryLimit) // ✅ 동적 제한 적용
        );
        const snap = await getDocs(q);
        let parsed = parseSnap(snap, job.type);

        parsed = parsed.filter(d => {
          if (typeFilter && d.col !== typeFilter) return false;
          if (buildingFilter && d.building !== buildingFilter) return false;
          if (startDate && d.date < startDate) return false;
          if (endDate && d.date > endDate) return false;
          return true;
        });

        allData.push(...parsed);
        renderCards(allData);
      } catch (err) {
        console.error(`${job.col} 로드 실패:`, err);
      }
    })();
  }
}

/* ======================================
   🔧 수정 모달 (디자인 리뉴얼)
====================================== */
async function openEditModal(id, col) {
  const user = auth.currentUser;
  const adminEmail = "rlaguswns95@haru-tokyo.com";

  if (!user) return alert("로그인이 필요합니다.");

  const snap = await getDocs(collection(db, col));
  const docData = snap.docs.find(d => d.id === id)?.data();

  if (!docData) return alert("데이터를 찾을 수 없습니다.");

  // 소유권 확인 (이메일 기준)
  const isOwner = (docData.authorEmail === user.email) || (docData.userEmail === user.email);
  const isAdmin = user.email === adminEmail;

  if (!isOwner && !isAdmin) {
    alert("수정 권한이 없습니다.");
    return;
  }

  const bg = document.createElement("div");
  // 모달 배경 스타일
  Object.assign(bg.style, {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(44, 62, 80, 0.6)", backdropFilter: "blur(4px)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: "9999"
  });

  const modal = document.createElement("div");
  // 모달 창 스타일
  Object.assign(modal.style, {
    background: "#fff", padding: "30px", width: "90%", maxWidth: "450px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)", border: "1px solid #E2E8F0",
    borderRadius: "0", overflowY: "auto", maxHeight: "85vh"
  });

  modal.innerHTML = `
    <h3 style="margin:0 0 20px 0; font-size:18px; color:#2C3E50; font-weight:800;">내역 수정</h3>
    
    <div style="margin-bottom:12px; font-size:13px; color:#64748B;">
      <strong>DATE:</strong> ${docData.date || "-"}<br>
      <strong>BUILDING:</strong> ${docData.buildingId || docData.building || "-"}
    </div>

    <div style="margin-bottom:16px;">
      <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px; color:#2C3E50;">담당자</label>
      <input id="editStaff" value="${docData.staffName || docData.staff || ""}"
        style="width:100%; padding:10px; border:1px solid #CBD5E1; background:#F8FAFC; color:#2C3E50; font-size:14px;">
    </div>

    <h4 style="font-size:13px; margin:20px 0 10px 0; color:#2C3E50; text-transform:uppercase;">Items</h4>
    <ul style="list-style:none; padding:0; border:1px solid #E2E8F0; padding:10px; background:#F8FAFC;">
      ${(docData.items || [])
        .map((i, idx) => `
          <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:13px;">
            <span>${normalizeLinenName(i.linenType || i.type || "")}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" id="editQty${idx}" value="${i.receivedCount ?? i.defectCount ?? 0}"
                style="width:60px; padding:6px; border:1px solid #CBD5E1; text-align:center; color:#2C3E50;">
            </div>
          </li>`)
        .join("")}
    </ul>

    <div style="margin-top:16px;">
      <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px; color:#2C3E50;">메모</label>
      <textarea id="editDesc" style="width:100%; padding:10px; border:1px solid #CBD5E1; background:#fff; min-height:80px; resize:vertical; color:#2C3E50;">${docData.desc || ""}</textarea>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
      <button id="btnClose" style="background:#fff; border:1px solid #CBD5E1; color:#64748B; padding:10px 20px; font-weight:700; cursor:pointer;">취소</button>
      <button id="btnSave" style="background:#2C3E50; border:1px solid #2C3E50; color:#fff; padding:10px 20px; font-weight:700; cursor:pointer;">저장하기</button>
    </div>
  `;

  bg.appendChild(modal);
  document.body.appendChild(bg);

  modal.querySelector("#btnClose").addEventListener("click", () => bg.remove());

  // ✅ [수정됨] 저장 로직에 에러 핸들링 추가
  modal.querySelector("#btnSave").addEventListener("click", async () => {
    const btnSave = modal.querySelector("#btnSave");
    btnSave.textContent = "저장 중...";
    btnSave.disabled = true;

    try {
        const newStaff = modal.querySelector("#editStaff").value.trim();
        const newDesc = modal.querySelector("#editDesc").value.trim();

        const updatedItems = (docData.items || []).map((i, idx) => {
          const updated = { ...i };
          const newValue = Number(modal.querySelector(`#editQty${idx}`).value);
          if (i.receivedCount !== undefined) updated.receivedCount = newValue;
          if (i.defectCount !== undefined) updated.defectCount = newValue;
          return updated;
        });

        await updateDoc(doc(db, col, id), {
          staffName: newStaff,
          desc: newDesc,
          items: updatedItems,
        });

        alert("성공적으로 수정되었습니다.");
        bg.remove();
        loadHistory();
    } catch (err) {
        console.error("수정 실패:", err);
        if (err.code === 'permission-denied') {
            alert("권한이 없습니다. (본인이 작성한 글만 수정 가능)");
        } else {
            alert("저장 중 오류가 발생했습니다.");
        }
    } finally {
        btnSave.textContent = "저장하기";
        btnSave.disabled = false;
    }
  });
}

/* ======================================
   🗑 삭제 로직 (권한 체크 유지)
====================================== */
async function deleteRecord(id, col) {
  const user = auth.currentUser;
  const adminEmail = "rlaguswns95@haru-tokyo.com";

  if (!user) return alert("로그인이 필요합니다.");

  // 문서 확인 없이 바로 삭제 시도 (보안 규칙에 맡김) 또는 확인 후 삭제
  if (!confirm("정말로 이 내역을 삭제하시겠습니까?")) return;

  try {
    await deleteDoc(doc(db, col, id));
    alert("삭제되었습니다.");
    loadHistory();
  } catch (err) {
    console.error("삭제 실패:", err);
    if (err.code === 'permission-denied') {
        alert("삭제 권한이 없습니다. (본인이 작성한 글만 삭제 가능)");
    } else {
        alert("삭제 중 오류가 발생했습니다.");
    }
  }
}

/* ======================================
   🚀 초기 실행
====================================== */
window.addEventListener("DOMContentLoaded", () => {
  // 필터 버튼 이벤트
  const filterBtn = document.getElementById("filterBtn");
  const resetBtn = document.getElementById("resetBtn");

  if (filterBtn) filterBtn.addEventListener("click", loadHistory);
  
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const fType = document.getElementById("filterType");
      const fBuild = document.getElementById("filterBuilding");
      const fStart = document.getElementById("startDate");
      const fEnd = document.getElementById("endDate");
      
      if(fType) fType.value = "";
      if(fBuild) fBuild.value = "";
      if(fStart) fStart.value = "";
      if(fEnd) fEnd.value = "";
      
      loadHistory();
    });
  }

  // 엑셀 내보내기
  document.getElementById("btnExcel")?.addEventListener("click", () => {
    if (allData.length === 0) return alert("내보낼 데이터가 없습니다.");
    
    // 엑셀용 데이터 포맷팅
    const wsData = allData.map(d => ({
      날짜: d.date,
      구분: d.type,
      건물: d.building,
      담당자: d.staff,
      내용: d.items.map(i => `${i.linenType}(${i.count})`).join(", "),
      메모: d.desc
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "내역");
    XLSX.writeFile(wb, `HARU_History_${new Date().toISOString().slice(0,10)}.xlsx`);
  });

  // PDF 내보내기
  document.getElementById("btnPDF")?.addEventListener("click", () => {
    if (allData.length === 0) return alert("내보낼 데이터가 없습니다.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(14);
    doc.text("HARU HISTORY REPORT", 14, 20);
    
    // PDF 표 데이터 준비
    const tableBody = allData.map(d => [
        d.date, 
        d.type, 
        d.building, 
        d.staff, 
        d.items.map(i => `${i.linenType}(${i.count})`).join("\n") // 줄바꿈 처리
    ]);

    doc.autoTable({
        head: [['Date', 'Type', 'Building', 'Staff', 'Items']],
        body: tableBody,
        startY: 30,
        styles: { font: "helvetica", fontSize: 10 },
        headStyles: { fillColor: [44, 62, 80] } // Navy Header
    });

    doc.save(`HARU_History_${new Date().toISOString().slice(0,10)}.pdf`);
  });

  loadHistory();
});