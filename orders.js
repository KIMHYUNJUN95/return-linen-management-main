// ========================================
// 🛒 HARU Orders (주문 요청 & 수정 기능 추가)
// ========================================

import { db, auth } from "./storage.js";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

  // =============================
  // ✨ 수정 모드 감지
  // =============================
  let editMode = false;
  let editOrderId = null;
  let items = [];

  const savedOrderData = localStorage.getItem("editOrderData");
  if (savedOrderData) {
    try {
      const orderData = JSON.parse(savedOrderData);
      editMode = true;
      editOrderId = orderData.id;

      // 상단 안내 표시
      editIndicator.style.display = "block";
      submitBtn.textContent = "주문 수정하기";

      // 기존 데이터 반영
      items = orderData.items || [];
      urgencyEl.value = orderData.urgency || "일반";
      notesEl.value = orderData.notes || "";

      renderItems();
    } catch (err) {
      console.error("❌ editOrderData 파싱 오류:", err);
    }
  }

  // =============================
  // 📌 일본어 감지 함수
  // =============================
  function containsJapanese(text) {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text);
  }

  // =============================
  // 🔍 아마존 검색 기능
  // =============================
  searchAmazonBtn.addEventListener("click", () => {
    const searchTerm = amazonSearchEl.value.trim();
    if (!searchTerm) {
      alert("검색어를 입력하세요.");
      return;
    }
    if (!containsJapanese(searchTerm)) {
      alert("일본어로 입력해주세요 (히라가나, 가타카나, 한자)");
      return;
    }

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
    alert(`✅ "${searchTerm}" 항목이 자동으로 추가되었습니다!`);
  });

  // 🔍 아마존 검색 엔터키 처리
  amazonSearchEl.addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
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

    itemList.innerHTML = items.map((item, idx) => {
      const linkHtml = item.link 
        ? `<a href="${item.link}" target="_blank" style="color:hsl(var(--color-primary));font-size:var(--font-size-xs);margin-top:var(--space-1);display:inline-block;">🔗 링크 보기</a>` 
        : '';
      return `
        <div class="item-row">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-qty">${item.category} · ${item.quantity}개</div>
            ${linkHtml}
          </div>
          <button type="button" class="btn btn-sm btn-ghost" onclick="removeItem(${idx})">
            삭제
          </button>
        </div>
      `;
    }).join('');
  }

  // =============================
  // ➕ 항목 추가
  // =============================
  addBtn.addEventListener("click", () => {
    const category = categoryEl.value.trim();
    const name = itemNameEl.value.trim();
    const quantity = parseInt(quantityEl.value);
    const link = itemLinkEl.value.trim();

    if (!category) {
      alert("카테고리를 선택하세요.");
      return;
    }
    if (!name) {
      alert("물품명을 입력하세요.");
      return;
    }
    if (!quantity || quantity < 1) {
      alert("수량은 1 이상이어야 합니다.");
      return;
    }

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

  // =============================
  // 🗑️ 항목 삭제
  // =============================
  window.removeItem = (idx) => {
    items.splice(idx, 1);
    renderItems();
  };

  // =============================
  // 📡 주문 제출 (등록 또는 수정)
  // =============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!items || items.length === 0) {
      alert("주문할 물품을 최소 1개 이상 추가하세요.");
      return;
    }

    const urgency = urgencyEl.value;
    const notes = notesEl.value.trim();
    const userEmail = auth?.currentUser?.email || null;
    const userName = auth?.currentUser?.displayName || "익명";

    const orderData = {
      items: [...items],
      urgency,
      notes,
      status: "pending",
      createdBy: userName,
      userEmail,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editMode && editOrderId) {
        // ✨ 수정 모드 → updateDoc
        const orderRef = doc(db, "orders", editOrderId);
        await updateDoc(orderRef, orderData);
        localStorage.removeItem("editOrderData");
        alert("✅ 주문이 성공적으로 수정되었습니다!");
      } else {
        // 신규 등록 → addDoc
        orderData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, "orders"), orderData);
        console.log("✅ 주문 요청 성공:", docRef.id);
        alert("✅ 주문 요청이 완료되었습니다!");
      }

      items = [];
      location.href = "orders_list.html";
    } catch (err) {
      console.error("❌ 주문 처리 오류 발생:", err);
      alert("주문 처리 중 오류가 발생했습니다: " + err.message);
    }
  });

  // =============================
  // 🧭 초기 렌더링
  // =============================
  renderItems();
});
