// ===============================
// 🧺 HARU 반품 등록 로직 (Finalized)
// ===============================

// 중복 실행 방지
if (window.__RETURN_FORM_LOADED__) {
  console.warn("⚠️ return_form.js 중복 실행 방지");
} else {
  window.__RETURN_FORM_LOADED__ = true;
  loadModule();
}

// ================================
// 🔥 공통 헤더 로드
// ================================
(async () => {
  try {
    const html = await fetch("header.html").then(r => r.text());
    const placeholder = document.getElementById("header-placeholder");

    if (placeholder) {
      placeholder.innerHTML = html;

      // 🛑 동적 임포트로 헤더 스크립트 실행 (innerHTML 스크립트 미실행 문제 해결)
      const { initHeaderMenu } = await import("./header.js");
      if(initHeaderMenu) initHeaderMenu(); 
    }

  } catch (err) {
    console.error("헤더 로드 실패:", err);
  }
})();


// ===============================
// 메인 모듈
// ===============================
async function loadModule() {

  // ✅ [수정됨] storage.js에서 통합된 객체 가져오기
  const { db, auth, storage } = await import("./storage.js");
  const {
    collection, addDoc, updateDoc, serverTimestamp, doc
  } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const {
    ref, uploadBytes, getDownloadURL
  } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");

  /* DOM 요소 */
  function $(s){ return document.querySelector(s); }

  const form = $("#returnForm");
  const buildingEl = $("#building");
  const dateEl = $("#date");
  const staffEl = $("#staff");
  const descEl = $("#desc");
  const photoInput = $("#photo");
  const photoPreview = $("#photoPreview");

  const linenSelect = $("#linenSelect");
  const linenQty = $("#linenQty");
  const btnAddLinen = $("#btnAddLinen");
  const linenListWrap = $("#linenList");
  const linenPayloadEl = $("#linenPayload");

  if (btnAddLinen) btnAddLinen.type = "button";

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


  /* 사진 미리보기 */
  if (photoInput) {
    photoInput.addEventListener("change", () => {
      photoPreview.innerHTML = "";
      [...photoInput.files].forEach(f => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(f);
        photoPreview.appendChild(img);
      });
    });
  }


  /* 린넨 목록 */
  const linens = [];

  function renderLinens() {
    if (!linenListWrap) return;

    if (linens.length === 0) {
      linenListWrap.innerHTML = '<div class="linen-empty">추가된 린넨이 없습니다.</div>';
      linenPayloadEl.value = "";
      return;
    }

    linenListWrap.innerHTML = `
      <table>
        <thead><tr><th>린넨</th><th>수량</th><th></th></tr></thead>
        <tbody>
          ${linens.map((l,i)=>`
            <tr>
              <td>${l.type}</td>
              <td>${l.qty}</td>
              <td class="actions-cell">
                <button type="button" class="btn btn-del" data-i="${i}">삭제</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    `;

    linenListWrap.querySelectorAll(".btn-del").forEach(btn => {
      btn.onclick = () => {
        linens.splice(Number(btn.dataset.i),1);
        renderLinens();
      };
    });

    linenPayloadEl.value = JSON.stringify(linens);
  }


  if (btnAddLinen) {
    btnAddLinen.onclick = () => {
      const type = linenSelect.value;
      const qty = Number(linenQty.value);

      if (!type) return alert("린넨 종류 선택");
      if (!qty || qty < 1) return alert("수량 오류");

      const exist = linens.find(l => l.type === type);
      if (exist) exist.qty += qty;
      else linens.push({ type, qty });

      renderLinens();

      linenQty.value = "1";
      linenSelect.value = "";
    };
  }


  /* 기본 날짜 */
  if (dateEl && !dateEl.value) {
    const d = new Date();
    dateEl.value =
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }


  /* 이미지 업로드 */
  async function uploadImages(id, files){
    const urls = [];
    for (let i=0;i<files.length;i++) {
      const f = files[i];
      const sref = ref(storage, `returns/${id}/${Date.now()}_${i}_${f.name}`);
      await uploadBytes(sref, f);
      urls.push(await getDownloadURL(sref));
    }
    return urls;
  }


  /* 제출 */
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      // 🔒 로그인 체크 (필수)
      const currentUser = auth.currentUser;
      if (!currentUser) {
          alert("로그인이 필요합니다.");
          return;
      }

      const buildingId = buildingEl.value;
      const date = dateEl.value;
      const staffName = staffEl.value;
      const desc = descEl.value;

      let items = [];
      try {
        items = JSON.parse(linenPayloadEl.value || "[]")
          .map(x => ({ linenType:x.type, defectCount:Number(x.qty) }));
      } catch {}

      if (!buildingId) return alert("건물 선택");
      if (!date) return alert("날짜 입력");
      if (!staffName) return alert("담당자 입력");
      if (!items.length) return alert("린넨 추가 필요");

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
        
        // ✅ [추가됨] 보안 규칙(isOwner) 통과를 위한 필수 필드
        uid: currentUser.uid,
        authorEmail: currentUser.email,
        userEmail: currentUser.email
      };

      try {
        const docRef = await addDoc(collection(db, "returns"), payload);

        const files = photoInput.files;
        if (files.length > 0) {
          const urls = await uploadImages(docRef.id, files);
          await updateDoc(doc(db, "returns", docRef.id), {
            imageUrls: urls,
            updatedAt: serverTimestamp()
          });
        }

        alert("등록 완료");
        location.href = "history_dashboard.html";

      } catch (err) {
        console.error(err);
        if (err.code === 'permission-denied') {
            alert("권한이 없습니다. (로그인 상태 확인)");
        } else {
            alert("오류: " + err.message);
        }
      }
    };
  }
}