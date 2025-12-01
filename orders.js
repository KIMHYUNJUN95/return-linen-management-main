// ========================================
// 🛒 HARU Orders Logic (Finalized)
// Design System: Tokyo Day Bright
// ========================================

import { db, auth } from "./storage.js";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("orderForm");
  const addBtn = document.getElementById("addItemBtn");
  const itemList = document.getElementById("itemList");
  const searchAmazonBtn = document.getElementById("searchAmazonBtn");
  const amazonSearchEl = document.getElementById("amazonSearch");

  const categoryEl = document.getElementById("category");
  const itemNameEl = document.getElementById("itemName");
  const quantityEl = document.getElementById("quantity");
  const itemLinkEl = document.getElementById("itemLink");
  const urgencyEl = document.getElementById("urgency");
  const notesEl = document.getElementById("notes");
  const editIndicator = document.getElementById("editIndicator");
  const submitBtn = document.getElementById("submitBtn");

  // ========== 건물 + 요청자 이름 요소 동적 생성 (HTML에 없다면) ==========
  // 만약 HTML에 이미 있다면 getElementById로 가져와야 함
  let buildingEl = document.getElementById("buildingSelect");
  let requesterEl = document.getElementById("requesterName");

  if (!buildingEl) {
      buildingEl = document.createElement("select");
      buildingEl.id = "buildingSelect";
      buildingEl.className = "form-select";
      buildingEl.innerHTML = `
        <option value="">건물 선택</option>
        <option value="아라키초A">아라키초A</option>
        <option value="아라키초B">아라키초B</option>
        <option value="다이쿄초">다이쿄초</option>
        <option value="가부키초">가부키초</option>
        <option value="다카다노바바">다카다노바바</option>
        <option value="오쿠보1">오쿠보1</option>
        <option value="오쿠보2">오쿠보2</option>
        <option value="오쿠보4">오쿠보4</option>
      `;
      const urgencyGroup = urgencyEl.closest(".form-group");
      if (urgencyGroup) {
        const buildingWrap = document.createElement("div");
        buildingWrap.className = "form-group";
        buildingWrap.innerHTML = `<label class="form-label" for="buildingSelect">건물</label>`;
        buildingWrap.appendChild(buildingEl);
        urgencyGroup.parentElement.insertBefore(buildingWrap, urgencyGroup);
      }
  }

  if (!requesterEl) {
      requesterEl = document.createElement("input");
      requesterEl.type = "text";
      requesterEl.id = "requesterName";
      requesterEl.className = "form-input";
      requesterEl.placeholder = "요청자 이름 입력 (예: 김현준)";
      
      const urgencyGroup = urgencyEl.closest(".form-group");
      if (urgencyGroup) {
        const nameWrap = document.createElement("div");
        nameWrap.className = "form-group";
        nameWrap.innerHTML = `<label class="form-label" for="requesterName">이름</label>`;
        nameWrap.appendChild(requesterEl);
        urgencyGroup.parentElement.insertBefore(nameWrap, urgencyGroup);
      }
  }

  // =============================
  // ✨ 수정 모드 감지 (URL 파라미터 방식)
  // =============================
  const urlParams = new URLSearchParams(location.search);
  const editOrderId = urlParams.get("id");
  let items = [];

  if (editOrderId) {
    // Firestore에서 데이터 로드
    (async () => {
        try {
            const docRef = doc(db, "orders", editOrderId);
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
                const data = snap.data();
                
                editIndicator.style.display = "flex";
                editIndicator.innerHTML = "📝 현재 <strong>수정 모드</strong>입니다.";
                submitBtn.textContent = "주문 수정하기";

                // 폼 채우기
                items = data.items || [];
                urgencyEl.value = data.urgency || "일반";
                notesEl.value = data.notes || "";
                if(buildingEl) buildingEl.value = data.building || "";
                if(requesterEl) requesterEl.value = data.requesterName || "";

                renderItems();
            } else {
                alert("존재하지 않는 주문입니다.");
                location.href = "orders_list.html";
            }
        } catch (e) {
            console.error("데이터 로드 실패:", e);
        }
    })();
  }

  // =============================
  // 🔍 아마존 검색 기능
  // =============================
  function containsJapanese(text) {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text);
  }

  searchAmazonBtn.addEventListener("click", () => {
    const searchTerm = amazonSearchEl.value.trim();
    if (!searchTerm) return alert("검색어를 입력하세요.");
    if (!containsJapanese(searchTerm)) return alert("일본어로 입력해주세요.");

    const amazonUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(searchTerm)}`;
    itemLinkEl.value = amazonUrl;
    window.open(amazonUrl, "_blank");

    items.push({
      category: "기타",
      name: searchTerm,
      quantity: 1,
      link: amazonUrl
    });
    renderItems();
    amazonSearchEl.value = "";
    // alert(`"${searchTerm}" 항목이 추가되었습니다.`); // 사용자 경험상 알림 끄는게 나을 수 있음
  });

  amazonSearchEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchAmazonBtn.click();
    }
  });

  // =============================
  // 📃 목록 렌더링
  // =============================
  function renderItems() {
    if (items.length === 0) {
      itemList.innerHTML = '<div class="empty-list">추가된 물품이 없습니다</div>';
      return;
    }

    itemList.innerHTML = items
      .map((item, idx) => {
        const linkHtml = item.link
          ? `<a href="${item.link}" target="_blank" style="color:#D4AF37;font-size:0.8rem;margin-top:4px;display:inline-block;text-decoration:none;">🔗 링크 보기</a>`
          : "";
        return `
          <div class="item-row">
            <div class="item-info">
              <div class="item-name">${item.name}</div>
              <div class="item-qty">${item.category} · ${item.quantity}개</div>
              ${linkHtml}
            </div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="window.removeItem(${idx})" style="height:32px; font-size:0.8rem;">
              삭제
            </button>
          </div>
        `;
      })
      .join("");
  }

  // =============================
  // ➕ 항목 추가
  // =============================
  addBtn.addEventListener("click", () => {
    const category = categoryEl.value.trim();
    const name = itemNameEl.value.trim();
    const quantity = parseInt(quantityEl.value);
    const link = itemLinkEl.value.trim();

    if (!category) return alert("카테고리를 선택하세요.");
    if (!name) return alert("물품명을 입력하세요.");
    if (!quantity || quantity < 1) return alert("수량은 1 이상이어야 합니다.");

    const item = { category, name, quantity };
    if (link) item.link = link;
    items.push(item);
    renderItems();

    itemNameEl.value = "";
    quantityEl.value = "1";
    categoryEl.value = "";
    itemLinkEl.value = "";
    itemNameEl.focus();
  });

  // 전역 함수로 노출 (onclick에서 접근 가능하도록)
  window.removeItem = (idx) => {
    items.splice(idx, 1);
    renderItems();
  };

  // =============================
  // 📡 주문 제출 (등록 또는 수정)
  // =============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔒 로그인 체크 (보안 규칙 필수)
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    if (!items || items.length === 0)
      return alert("주문할 물품을 최소 1개 이상 추가하세요.");

    const building = buildingEl.value.trim();
    const requesterName = requesterEl.value.trim();
    if (!building) return alert("건물을 선택하세요.");
    if (!requesterName) return alert("이름을 입력하세요.");

    const urgency = urgencyEl.value;
    const notes = notesEl.value.trim();

    // ------------------------------
    // 🔥 데이터 구성 (uid 포함)
    // ------------------------------
    const orderData = {
      building,
      requesterName,
      items: [...items],
      urgency,
      notes,
      status: "pending",
      updatedAt: serverTimestamp(),
      
      // ✅ 작성자 정보 (수정 시에도 유지하거나 갱신)
      uid: currentUser.uid,
      authorEmail: currentUser.email,
      createdBy: requesterName // 표시용 이름
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "처리 중...";

    try {
      if (editOrderId) {
        // [수정]
        const orderRef = doc(db, "orders", editOrderId);
        await updateDoc(orderRef, orderData);
        alert("주문이 성공적으로 수정되었습니다!");
      } else {
        // [등록] createdAt 추가
        orderData.createdAt = serverTimestamp();
        await addDoc(collection(db, "orders"), orderData);
        alert("주문 요청이 완료되었습니다!");
      }

      items = [];
      location.href = "orders_list.html";
    } catch (err) {
      console.error("❌ 주문 처리 오류 발생:", err);
      if (err.code === 'permission-denied') {
          alert("권한이 없습니다. (본인이 작성한 글만 수정 가능)");
      } else {
          alert("주문 처리 중 오류가 발생했습니다: " + err.message);
      }
      submitBtn.disabled = false;
      submitBtn.textContent = editOrderId ? "주문 수정하기" : "SUBMIT ORDER REQUEST";
    }
  });

  // 초기 렌더링
  renderItems();
  
  // 로그인 상태 체크 (UI 업데이트용)
  onAuthStateChanged(auth, (user) => {
      if(user && requesterEl && !requesterEl.value) {
          // 이메일 앞부분 등을 기본값으로 넣어줄 수 있음
          // requesterEl.value = user.displayName || "";
      }
  });
});