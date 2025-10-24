// ===============================
// 🧺 history_dashboard_fast.js — 메모 필드 반영 + 기존 기능 유지
// ===============================
import { db } from "./storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ✅ 이전 Firebase 연결 */
const oldConfig = {
  apiKey: "YOUR_OLD_API_KEY",
  authDomain: "YOUR_OLD_PROJECT.firebaseapp.com",
  projectId: "YOUR_OLD_PROJECT",
};
const appOld = initializeApp(oldConfig, "oldApp");
const dbOld = getFirestore(appOld);

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
  cardBody.innerHTML = `<div style="text-align:center;padding:20px;color:#777;">불러오는 중...</div>`;
}

/* ✅ 카드 렌더링 */
function renderCards(list) {
  if (!list || list.length === 0) {
    cardBody.innerHTML = `<p style="text-align:center;color:#888;">등록된 내역이 없습니다.</p>`;
    return;
  }
  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  cardBody.innerHTML = list.map(d => `
    <div class="history-card" style="
      background:${d.type === "입고" ? "#f0f6ff" : "#fff7f7"};
      border:1px solid #ccc;
      border-left:6px solid ${d.type === "입고" ? "#4c9aff" : "#ff6b6b"};
      border-radius:10px;
      padding:14px;
      margin-bottom:12px;
      box-shadow:0 2px 6px rgba(0,0,0,0.05);
    ">
      <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-weight:700;color:${d.type === "입고" ? "#4c9aff" : "#ff6b6b"};">
          ${d.type === "입고" ? "📦 입고" : "🧺 반품"}
        </span>
        <span class="meta" style="color:#777;font-size:13px;">${d.date}</span>
      </header>
      <div class="content" style="margin-bottom:4px;"><b>건물:</b> ${d.building}</div>
      <div class="content" style="margin-bottom:4px;"><b>담당자:</b> ${d.staff}</div>
      <div class="content" style="margin-bottom:6px;color:#333;">
        ${(d.items || []).map(i => `<span style="display:inline-block;margin-right:6px;">${i.linenType} <b>${i.count}개</b></span>`).join("")}
      </div>
      ${d.desc && d.desc !== "-" ? `<div class="content" style="margin-top:6px;color:#555;"><b>📌 메모:</b> ${d.desc}</div>` : ""}
      ${d.source === "old" ? `<span class="legacy-label" style="font-size:12px;color:#999;">📜 이전기록</span>` : ""}
      <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn-edit" data-id="${d.id}" data-col="${d.col}" data-source="${d.source}"
          style="background:#007bff;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">수정</button>
        <button class="btn-del" data-id="${d.id}" data-col="${d.col}" data-source="${d.source}"
          style="background:#d32f2f;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">삭제</button>
      </div>
    </div>`).join("");

  document.querySelectorAll(".btn-edit").forEach(b => {
    b.addEventListener("click", () => openEditModal(b.dataset.id, b.dataset.col, b.dataset.source));
  });
  document.querySelectorAll(".btn-del").forEach(b => {
    b.addEventListener("click", () => deleteRecord(b.dataset.id, b.dataset.col, b.dataset.source));
  });
}

/* ✅ 데이터 파싱 */
function parseSnap(snap, type, source) {
  const temp = [];
  snap.forEach(d => {
    const x = d.data();
    temp.push({
      id: d.id,
      col: d.ref.parent.id,
      type,
      source,
      date: x.date || "-",
      building: x.buildingId || x.building || "-",
      staff: x.staffName || x.staff || "-",
      desc: x.desc || "-", // ✅ 메모 필드 반영
      items: (x.items || []).map(i => ({
        linenType: normalizeLinenName(i.linenType || i.type || ""),
        count: i.receivedCount ?? i.defectCount ?? 0,
      })),
    });
  });
  return temp;
}

/* ✅ 병렬 로드 */
async function loadHistory() {
  showLoading();
  allData = [];

  const typeFilter = document.getElementById("filterType")?.value;
  const buildingFilter = document.getElementById("filterBuilding")?.value;
  const startDate = document.getElementById("startDate")?.value;
  const endDate = document.getElementById("endDate")?.value;

  const jobs = [
    { db, col: "incoming", type: "입고", source: "new" },
    { db, col: "returns", type: "반품", source: "new" },
    { db: dbOld, col: "incoming", type: "입고", source: "old" },
    { db: dbOld, col: "returns", type: "반품", source: "old" },
  ];

  for (const job of jobs) {
    (async () => {
      try {
        const q = query(collection(job.db, job.col), orderBy("date", "desc"), limit(100));
        const snap = await getDocs(q);
        let parsed = parseSnap(snap, job.type, job.source);

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

/* ✅ 수정 모달 */
async function openEditModal(id, col, source) {
  const targetDB = source === "old" ? dbOld : db;
  const snap = await getDocs(collection(targetDB, col));
  const docData = snap.docs.find(d => d.id === id)?.data();
  if (!docData) return alert("데이터를 찾을 수 없습니다.");

  const bg = document.createElement("div");
  Object.assign(bg.style, {
    position: "fixed", top: 0, left: 0,
    width: "100%", height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: "9999"
  });

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    width: "90%",
    maxWidth: "420px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    overflowY: "auto",
    maxHeight: "80vh",
  });

  modal.innerHTML = `
    <h3 style="margin-bottom:10px;">기록 수정</h3>
    <p><b>날짜:</b> ${docData.date || "-"}</p>
    <p><b>건물:</b> ${docData.buildingId || docData.building || "-"}</p>
    <p><b>담당자:</b>
      <input id="editStaff" value="${docData.staffName || docData.staff || ""}" 
        style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;">
    </p>
    <h4 style="margin-top:14px;">린넨 목록</h4>
    <ul style="margin-top:6px;padding-left:18px;">
      ${(docData.items || [])
        .map((i, idx) => `
          <li style="margin-bottom:6px;">
            ${normalizeLinenName(i.linenType || i.type || "")} 
            <input type="number" id="editQty${idx}" value="${i.receivedCount ?? i.defectCount ?? 0}"
              style="width:60px;padding:4px;border:1px solid #ccc;border-radius:6px;"> 개
          </li>`).join("")}
    </ul>
    <div style="margin-top:10px;">
      <label><b>📌 메모</b></label>
      <textarea id="editDesc" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;">${docData.desc || ""}</textarea>
    </div>
    <div style="text-align:right;margin-top:16px;">
      <button id="btnSave" style="background:#007bff;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">저장</button>
      <button id="btnClose" style="background:#ccc;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">닫기</button>
    </div>
  `;

  bg.appendChild(modal);
  document.body.appendChild(bg);

  modal.querySelector("#btnClose").addEventListener("click", () => bg.remove());
  modal.querySelector("#btnSave").addEventListener("click", async () => {
    const newStaff = modal.querySelector("#editStaff").value.trim();
    const newDesc = modal.querySelector("#editDesc").value.trim();
    const updatedItems = (docData.items || []).map((i, idx) => ({
      ...i,
      receivedCount:
        i.receivedCount !== undefined
          ? Number(modal.querySelector(`#editQty${idx}`).value)
          : undefined,
      defectCount:
        i.defectCount !== undefined
          ? Number(modal.querySelector(`#editQty${idx}`).value)
          : undefined,
    }));
    await updateDoc(doc(targetDB, col, id), {
      staffName: newStaff,
      desc: newDesc,
      items: updatedItems,
    });
    alert("수정되었습니다.");
    bg.remove();
    loadHistory();
  });
}

/* ✅ 삭제 */
async function deleteRecord(id, col, source) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  const targetDB = source === "old" ? dbOld : db;
  await deleteDoc(doc(targetDB, col, id));
  alert("삭제되었습니다.");
  loadHistory();
}

/* ✅ 실행 */
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("filterBtn").addEventListener("click", loadHistory);
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("filterType").value = "";
    document.getElementById("filterBuilding").value = "";
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    loadHistory();
  });

  loadHistory();
});
