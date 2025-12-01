// ===============================
// 🧺 HARU 반품 등록 로직 (Tokyo Day Bright)
// ===============================

// 🚨 [핵심 수정 1] 스크립트 중복 실행 방지 (이중 로드 시 강제 종료)
if (window.__RETURN_FORM_LOADED__) {
  console.warn("⚠️ return_form.js가 중복 로드되었습니다. 중복 실행을 방지합니다.");
} else {
  window.__RETURN_FORM_LOADED__ = true;

  // --- 기존 Import 및 로직 시작 ---
  loadModule();
}

async function loadModule() {
  // 모듈을 동적으로 import하여 스코프 문제 방지
  const { initHeaderMenu } = await import("./header.js");
  const { db, auth, storage } = await import("./storage.js");
  const {
    collection, addDoc, updateDoc, serverTimestamp, doc
  } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const {
    ref, uploadBytes, getDownloadURL
  } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");

  // ✅ 1. 헤더 로드
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

  /* ===========================================
     📌 DOM 요소 참조
  =========================================== */
  function $(sel){ return document.querySelector(sel); }

  const form = $("#returnForm");
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

  // 🚨 [핵심 수정 2] 버튼 타입을 강제로 'button'으로 변경 (HTML 실수 방지)
  if (btnAddLinen) {
    btnAddLinen.type = "button"; 
  }

  // ✅ 공식 린넨 목록
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

  /* ===========================================
     📸 UI 로직
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
     🧺 UI 로직: 린넨 목록 관리
  =========================================== */
  const linens = []; 

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
    
    linenListWrap.querySelectorAll(".btn-del").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.index);
        linens.splice(i, 1);
        renderLinens();
      });
    });

    if(linenPayloadEl) linenPayloadEl.value = JSON.stringify(linens);
  }

  // ✅ [수정 완료] 이벤트 핸들러
  if (btnAddLinen) {
    // 기존 리스너 제거가 불가능하므로, 새 리스너 내에서 중복 실행 방지 플래그 사용이 아닌,
    // 위쪽의 window.__RETURN_FORM_LOADED__가 근본적인 해결책입니다.
    
    btnAddLinen.onclick = (e) => { // addEventListener 대신 onclick을 사용하여 기존 이벤트 덮어쓰기 시도 (안전장치)
      e.preventDefault();
      e.stopPropagation();

      const type = linenSelect.value;
      const qty = parseInt(linenQty.value);

      if (!type) {
        alert("린넨 종류를 선택하세요.");
        return;
      }
      if (!qty || qty < 1) {
        alert("수량은 1 이상이어야 합니다.");
        return;
      }
      
      const exist = linens.find(l => l.type === type);
      if (exist) {
        exist.qty += qty;
      } else {
        linens.push({ type, qty });
      }

      renderLinens();
      
      // 입력값 초기화
      linenQty.value = "1";
      linenSelect.value = "";
    };
  }

  /* ===========================================
     🛠 헬퍼 및 폼 제출
  =========================================== */

  function normalizeLinenName(name) {
    if (!name) return "";
    const clean = name.replace(/\s+/g, "").trim();
    for (const official of OFFICIAL_LINENS) {
      if (clean.includes(official.replace(/\s+/g, ""))) return official;
    }
    return name;
  }

  if (dateEl && !dateEl.value) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    dateEl.value = `${yyyy}-${mm}-${dd}`;
  }

  async function uploadAllImages(docId, files){
    const urls = [];
    for (let i=0; i<files.length; i++){
      const f = files[i];
      const path = `returns/${docId}/${Date.now()}_${i}_${f.name}`;
      const sref = ref(storage, path);
      await uploadBytes(sref, f);
      const url = await getDownloadURL(sref);
      urls.push(url);
    }
    return urls;
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const buildingId = buildingEl.value.trim();
      const date = dateEl.value.trim();
      const staffName = staffEl.value.trim();
      const desc = descEl.value.trim();

      let items = [];
      try {
        const sourceData = linenPayloadEl && linenPayloadEl.value ? JSON.parse(linenPayloadEl.value) : linens;
        items = sourceData.map(x => ({
          linenType: normalizeLinenName(String(x.type)),
          defectCount: Number(x.qty)
        }));
      } catch(err){
        console.warn("린넨 데이터 처리 실패:", err);
      }

      if (!buildingId) return alert("건물을 선택해주세요.");
      if (!date) return alert("날짜를 입력해주세요.");
      if (!staffName) return alert("담당자 이름을 입력해주세요.");
      if (!items.length) return alert("린넨을 최소 1개 이상 추가해주세요.");

      const userEmail = auth?.currentUser?.email || null;

      const payload = {
        buildingId,
        staffName,
        date,
        status: "returned",
        desc,
        items,
        imageUrls: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userEmail,
        authorEmail: userEmail
      };

      try {
        const docRef = await addDoc(collection(db, "returns"), payload);

        const files = photoInput.files || [];
        if (files.length > 0) {
          const urls = await uploadAllImages(docRef.id, files);
          await updateDoc(doc(db, "returns", docRef.id), {
            imageUrls: urls,
            updatedAt: serverTimestamp()
          });
        }

        alert("✅ 반품이 성공적으로 등록되었습니다.");
        location.href = "history_dashboard.html";
      } catch (err) {
        console.error(err);
        alert("등록 중 오류가 발생했습니다: " + (err.message || err));
      }
    });
  }
}