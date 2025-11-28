// ===============================
// 🧺 HARU 입고 등록 로직 (Tokyo Day Bright)
// ===============================

import { initHeaderMenu } from "./header.js";
import { db, auth, storage } from "./storage.js";
import {
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
    
  // 초기 렌더링
  renderLinens();
});

// ===============================
// 📌 DOM 요소 참조
// ===============================
function $(sel) { return document.querySelector(sel); }

const form = $("#incomingForm");
const buildingEl = $("#building");
const dateEl = $("#date");
const staffEl = $("#staff");
const descEl = $("#desc");
const photoInput = $("#photo");
const photoPreview = $("#photoPreview");

// 린넨 추가 관련 요소
const linenSelect = $("#linenSelect");
const linenQty = $("#linenQty");
const btnAddLinen = $("#btnAddLinen");
const linenListWrap = $("#linenList");
const linenPayloadEl = $("#linenPayload");

// ===============================
// 📌 공식 린넨 목록 & 정규화 함수
// ===============================
const OFFICIAL_LINENS = [
  "싱글 이불 커버",
  "싱글 매트 커버",
  "더블 이불 커버",
  "더블 매트 커버",
  "더블 매트 커버(고무)",
  "배게 커버",
  "수건타월",
  "발매트"
];

function normalizeLinenName(name) {
  if (!name) return "";
  const clean = name.replace(/\s+/g, "").trim();
  for (const official of OFFICIAL_LINENS) {
    if (clean.includes(official.replace(/\s+/g, ""))) return official;
  }
  return name;
}

// ===============================
// 📅 날짜 기본값 오늘로 설정
// ===============================
if (dateEl && !dateEl.value) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  dateEl.value = `${yyyy}-${mm}-${dd}`;
}

/* ===========================================
   📸 UI 로직 1: 사진 미리보기
=========================================== */
if (photoInput) {
  photoInput.addEventListener("change", () => {
    photoPreview.innerHTML = "";
    [...photoInput.files].forEach(file => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      photoPreview.appendChild(img);
    });
  });
}

/* ===========================================
   🧺 UI 로직 2: 린넨 목록 관리
=========================================== */
const linens = []; // 로컬 상태

function renderLinens() {
  if (!linenListWrap) return;

  if (linens.length === 0) {
    linenListWrap.innerHTML = '<div class="linen-empty">목록이 비어있습니다.</div>';
    if(linenPayloadEl) linenPayloadEl.value = "";
    return;
  }

  const rows = linens.map((ln, idx) => `
    <tr>
      <td style="font-weight:600;">${ln.type}</td>
      <td>${ln.qty}</td>
      <td style="text-align:right;">
        <button type="button" class="btn btn-del" data-index="${idx}">삭제</button>
      </td>
    </tr>`).join("");
  
  linenListWrap.innerHTML = `
    <table>
      <thead><tr><th>품목명</th><th>수량</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  
  // 삭제 버튼 이벤트
  linenListWrap.querySelectorAll(".btn-del").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.index);
      linens.splice(i, 1);
      renderLinens();
    });
  });

  // 히든 인풋 업데이트
  if(linenPayloadEl) linenPayloadEl.value = JSON.stringify(linens);
}

if (btnAddLinen) {
  btnAddLinen.addEventListener("click", () => {
    const type = linenSelect.value;
    const qty = parseInt(linenQty.value);

    if (!type) return alert("린넨 종류를 선택하세요.");
    if (!qty || qty < 1) return alert("수량은 1 이상이어야 합니다.");
    
    const exist = linens.find(l => l.type === type);
    if (exist) exist.qty += qty;
    else linens.push({ type, qty });

    renderLinens();
    linenQty.value = "1";
    linenSelect.value = "";
  });
}

// ===============================
// 📸 이미지 업로드 함수
// ===============================
async function uploadAllImages(docId, files) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = `incoming/${docId}/${Date.now()}_${i}_${file.name}`;
    const sref = ref(storage, path);
    await uploadBytes(sref, file);
    const url = await getDownloadURL(sref);
    urls.push(url);
  }
  return urls;
}

// ===============================
// 📝 폼 제출 처리
// ===============================
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const buildingId = buildingEl.value.trim();
    const date = dateEl.value.trim();
    const staffName = staffEl.value.trim();
    const desc = descEl.value.trim();

    // 🧺 린넨 항목 파싱
    let items = [];
    try {
      // 인풋에 값이 있으면 파싱, 없으면 로컬 배열 사용
      const sourceData = linenPayloadEl && linenPayloadEl.value ? JSON.parse(linenPayloadEl.value) : linens;
      
      items = sourceData.map(x => ({
        linenType: normalizeLinenName(String(x.type)),
        receivedCount: Number(x.qty)
      }));
    } catch (err) {
      console.warn("린넨 데이터 처리 실패:", err);
    }

    // ✅ 필수값 검증
    if (!buildingId) return alert("건물을 선택해주세요.");
    if (!date) return alert("날짜를 입력해주세요.");
    if (!staffName) return alert("담당자 이름을 입력해주세요.");
    if (!items.length) return alert("린넨을 최소 1개 이상 추가해주세요.");

    // 🔥 이메일 정보
    const userEmail = auth?.currentUser?.email || null;

    const payload = {
      buildingId,
      staffName,
      date,
      status: "received",
      desc,
      items,
      imageUrls: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      // ⭐ 기존 필드 유지
      userEmail,

      // ⭐ 신규 필드 추가 (내역관리 권한 핵심)
      authorEmail: userEmail
    };

    try {
      // 🔸 기본 정보 저장
      const docRef = await addDoc(collection(db, "incoming"), payload);

      // 📸 사진 업로드 (있을 경우)
      const files = photoInput.files || [];
      if (files.length > 0) {
        const urls = await uploadAllImages(docRef.id, files);
        await updateDoc(doc(db, "incoming", docRef.id), {
          imageUrls: urls,
          updatedAt: serverTimestamp()
        });
      }

      alert("✅ 입고가 성공적으로 등록되었습니다.");
      location.href = "history_dashboard.html";
    } catch (err) {
      console.error(err);
      alert("등록 중 오류가 발생했습니다: " + (err.message || err));
    }
  });
}