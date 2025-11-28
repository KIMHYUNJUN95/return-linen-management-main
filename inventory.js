// ========================================
// 📦 HARU 재고 관리 시스템 (Tokyo Day Bright)
// ========================================

import { initHeaderMenu } from "./header.js";
import { db, auth } from "./storage.js";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// 항상 admin (기존 로직 유지)
const getUserRoleByEmail = () => Promise.resolve("admin");

window.addEventListener("DOMContentLoaded", () => {
  const invBuildingSel = document.getElementById("invBuilding");
  const invSearchInput = document.getElementById("invSearch");
  const invTbody = document.getElementById("invTbody");
  const btnExportInv = document.getElementById("btnExportInv");
  const openFormBtn = document.getElementById("openFormBtn");
  const btnDeleteAllInv = document.getElementById("btnDeleteAllInv");

  const btnResetForm = document.getElementById("btnResetForm");
  const btnSaveItem = document.getElementById("btnSaveItem");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const formTitle = document.getElementById("formTitle");
  const formBuilding = document.getElementById("formBuilding");
  const formName = document.getElementById("formName");
  const formQty = document.getElementById("formQty");
  const formMin = document.getElementById("formMin");
  const formNote = document.getElementById("formNote");
  const commonItemSelect = document.getElementById("commonItemSelect");
  const buildingTabs = document.querySelectorAll(".building-tabs button");
  const modalOverlay = document.getElementById("inventoryModal");

  const btnOpenInventoryFull = document.getElementById("btnOpenInventoryFull");
  const inventoryFullModal = document.getElementById("inventoryFullModal");
  const btnCloseInventoryFull = document.getElementById("btnCloseInventoryFull");
  const fullscreenInventory = document.getElementById("fullscreenInventory");

  let unsub = null;
  let currentDocId = null;
  let cachedItems = [];
  let userRole = "user";

  // ============================================
  // 🔥 건물별 품목 정의
  // ============================================

  // 오쿠보2 린넨 전용
  const OKUBO2_LINEN = [
    "싱글 매트커버",
    "싱글 이불커버",
    "더블 매트커버",
    "더블 이불커버",
    "배게커버",
    "수건타월",
    "발매트",
  ];

  // 비품 공통
  const COMMON_ITEMS = [
    "웰컴카드",
    "출근카드",
    "AA건전지",
    "AAA건전지",
    "CR2(도어락 건전지)",
    "충전기선 (C타입)",
    "충전기 어뎁터",
    "스팀 다리미",
    "헤어 드라이기",
    "에어컨 리모컨",
    "티비 리모컨",
    "아기 의자",
    "아기 침대",
    "아기 욕조",
    "전기장판",
  ];

  // 🔥 건물별 허용 품목 결정 함수
  function getAllowedItems(building) {
    if (building === "오쿠보2_린넨") return OKUBO2_LINEN;
    return COMMON_ITEMS;
  }

  // ============================================
  // 🪄 모달 제어
  // ============================================
  openFormBtn.addEventListener("click", () => {
    modalOverlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    resetForm();
  });

  closeModalBtn.addEventListener("click", () => {
    modalOverlay.style.display = "none";
    document.body.style.overflow = "";
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.style.display = "none";
      document.body.style.overflow = "";
    }
  });

  // ============================================
  // 📋 전체화면 모달
  // ============================================
  if (btnOpenInventoryFull) {
    btnOpenInventoryFull.addEventListener("click", () => {
      renderFullInventory();
      inventoryFullModal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  if (btnCloseInventoryFull) {
    btnCloseInventoryFull.addEventListener("click", () => {
      inventoryFullModal.classList.remove("active");
      document.body.style.overflow = "";
    });
  }

  function renderFullInventory() {
    if (!cachedItems.length) {
      fullscreenInventory.innerHTML =
        `<p style="text-align:center; opacity:.6; padding:20px;">불러온 데이터가 없습니다.</p>`;
      return;
    }

    // 디자인: 테이블 헤더 및 스타일 적용
    fullscreenInventory.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead>
          <tr style="background:#F8FAFC; border-bottom:2px solid #E2E8F0;">
            <th style="padding:12px; text-align:left; color:#64748B; font-weight:700;">품목명</th>
            <th style="padding:12px; text-align:right; color:#64748B; font-weight:700;">재고</th>
            <th style="padding:12px; text-align:right; color:#64748B; font-weight:700;">최소</th>
            <th style="padding:12px; text-align:center; color:#64748B; font-weight:700;">상태</th>
            <th style="padding:12px; text-align:left; color:#64748B; font-weight:700;">건물</th>
            <th style="padding:12px; text-align:left; color:#64748B; font-weight:700;">최근 수정</th>
          </tr>
        </thead>
        <tbody>
          ${cachedItems
            .map((d) => {
              const qty = Number(d.quantity || 0);
              const min = Number(d.minQuantity || 0);
              const isLow = qty <= min;
              
              // 상태 뱃지 적용
              const status = isLow
                ? `<span class="status-badge status-out">부족</span>`
                : `<span class="status-badge status-ok">정상</span>`;
                
              return `
                <tr style="border-bottom:1px solid #F1F5F9;">
                  <td style="padding:12px; color:#2C3E50; font-weight:600;">${d.itemName}</td>
                  <td style="padding:12px; text-align:right;">${qty}</td>
                  <td style="padding:12px; text-align:right; color:#94A3B8;">${min}</td>
                  <td style="padding:12px; text-align:center;">${status}</td>
                  <td style="padding:12px;">${d.building}</td>
                  <td style="padding:12px; color:#94A3B8; font-size:12px;">${d.lastUpdated}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  // ============================================
  // 공통품목 셀렉트
  // ============================================
  function fillCommonDropdown() {
    const building = formBuilding.value;
    const items = getAllowedItems(building);

    // 이모지 제거, 텍스트 깔끔하게
    commonItemSelect.innerHTML =
      `<option value="">직접 입력</option>
       <option value="all">전체 일괄 등록</option>` +
      items.map((n) => `<option value="${n}">${n}</option>`).join("");
  }

  commonItemSelect.addEventListener("change", async () => {
    const building = formBuilding.value;
    const selected = commonItemSelect.value;
    const allowed = getAllowedItems(building);

    if (!selected) return;

    // 전체 등록
    if (selected === "all") {
      if(!confirm(`'${building}'에 공통 품목을 일괄 등록하시겠습니까?`)) return;
      
      const colRef = collection(db, "inventory");
      const snap = await getDocs(
        query(colRef, where("building", "==", building))
      );
      const exist = snap.docs.map((d) => d.data().itemName);

      const batch = writeBatch(db);
      let count = 0;
      
      for (const name of allowed) {
        if (exist.includes(name)) continue;

        const newRef = doc(colRef);
        batch.set(newRef, {
          building,
          itemName: name,
          quantity: 0,
          minQuantity: 0,
          note: "",
          lastUpdated: new Date().toISOString().split("T")[0],
        });
        count++;
      }

      if (count > 0) {
        await batch.commit();
        alert(`총 ${count}개의 품목이 등록되었습니다.`);
      } else {
        alert("이미 모든 품목이 등록되어 있습니다.");
      }
      return;
    }

    formName.value = selected;
  });

  // ============================================
  // 테이블 렌더링
  // ============================================
  function renderRows(items) {
    const keyword = (invSearchInput.value || "").trim().toLowerCase();

    const rows = keyword
      ? items.filter((r) =>
          (r.itemName || "").toLowerCase().includes(keyword)
        )
      : items;

    if (!rows.length) {
      invTbody.innerHTML =
        `<tr><td colspan="7" style="text-align:center; padding:40px; color:#CBD5E1;">데이터가 없습니다.</td></tr>`;
      return;
    }

    // 정렬: 이름순
    rows.sort((a, b) => (a.itemName || "").localeCompare(b.itemName || ""));

    invTbody.innerHTML = rows
      .map((d) => {
        const qty = Number(d.quantity || 0);
        const min = Number(d.minQuantity || 0);
        const isLow = qty <= min;
        
        // 상태 뱃지 (디자인 적용)
        const status = isLow
          ? `<span class="status-badge status-out">부족</span>`
          : `<span class="status-badge status-ok">정상</span>`;

        // 버튼: 관리자만 활성화
        const btnDisabled = userRole !== "admin" ? "disabled style='opacity:0.5; cursor:not-allowed;'" : "";

        return `
        <tr data-id="${d.id}">
          <td style="color:#2C3E50; font-weight:600;">${d.itemName}</td>
          <td class="t-right" style="font-weight:700;">${qty}</td>
          <td class="t-right" style="color:#94A3B8;">${min}</td>
          <td class="text-center">${status}</td>
          <td>${d.building}</td>
          <td style="color:#94A3B8; font-size:12px;">${d.lastUpdated}</td>
          <td class="text-center">
            <button class="btn ghost" data-action="edit" ${btnDisabled} style="padding:4px 10px; height:28px; font-size:11px;">수정</button>
            <button class="btn danger" data-action="delete" ${btnDisabled} style="padding:4px 10px; height:28px; font-size:11px;">삭제</button>
          </td>
        </tr>`;
      })
      .join("");
  }

  // ============================================
  // 실시간 구독
  // ============================================
  function subscribeInventory() {
    if (unsub) unsub();

    const building = invBuildingSel.value;
    const col = collection(db, "inventory");

    // 쿼리: 건물 선택 시 필터링
    const q = building
      ? query(col, where("building", "==", building))
      : query(col); // 전체 조회

    unsub = onSnapshot(q, (snap) => {
      cachedItems = [];
      snap.forEach((docSnap) =>
        cachedItems.push({ id: docSnap.id, ...docSnap.data() })
      );
      renderRows(cachedItems);
    });
  }

  // ============================================
  // 폼 초기화
  // ============================================
  function resetForm() {
    currentDocId = null;

    const building = invBuildingSel.value || "아라키초A";
    formTitle.textContent = "품목 등록";
    formBuilding.value = building;
    formName.value = "";
    formQty.value = 0;
    formMin.value = 0;
    formNote.value = "";
    btnSaveItem.textContent = "등록하기";
    fillCommonDropdown();
  }

  btnResetForm.addEventListener("click", resetForm);

  // ============================================
  // 저장 (등록/수정)
  // ============================================
  btnSaveItem.addEventListener("click", async () => {
    const building = formBuilding.value.trim();
    const itemName = formName.value.trim();
    const quantity = Number(formQty.value || 0);
    const minQuantity = Number(formMin.value || 0);
    const note = formNote.value.trim();

    if (!itemName) return alert("품목명을 입력하세요.");
    if (userRole !== "admin") return alert("관리자 권한이 필요합니다.");

    // 🔥 건물별 허용 품목 체크
    const allowed = getAllowedItems(building);
    if (!allowed.includes(itemName)) {
      return alert(`'${building}'에서는 허용되지 않는 품목입니다.\n(오쿠보2 린넨/비품 구분 확인 필요)`);
    }

    const payload = {
      building,
      itemName,
      quantity,
      minQuantity,
      note,
      lastUpdated: new Date().toISOString().split("T")[0],
    };

    try {
      // 중복 체크 (신규 등록 시에만)
      if (!currentDocId) {
        const q = query(
          collection(db, "inventory"),
          where("building", "==", building),
          where("itemName", "==", itemName)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert("이미 등록된 품목입니다.");
          return;
        }
      }

      if (currentDocId) {
        await updateDoc(doc(db, "inventory", currentDocId), payload);
        alert("수정되었습니다.");
      } else {
        await addDoc(collection(db, "inventory"), payload);
        alert("등록되었습니다.");
      }

      resetForm();
      modalOverlay.style.display = "none";
      document.body.style.overflow = "";
    } catch (err) {
      alert("저장 중 오류가 발생했습니다.");
      console.error(err);
    }
  });

  // ============================================
  // 테이블 클릭 이벤트 (수정/삭제)
  // ============================================
  invTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const tr = btn.closest("tr");
    const id = tr?.dataset?.id;
    if (!id) return;

    const action = btn.dataset.action;
    
    // 수정
    if (action === "edit") {
      if (userRole !== "admin") return alert("관리자만 가능합니다.");
      
      const docRef = doc(db, "inventory", id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;

      const d = snap.data();
      currentDocId = id;

      formTitle.textContent = "품목 수정";
      formBuilding.value = d.building;
      formName.value = d.itemName;
      formQty.value = d.quantity;
      formMin.value = d.minQuantity;
      formNote.value = d.note || "";
      btnSaveItem.textContent = "수정 완료";

      fillCommonDropdown();
      modalOverlay.style.display = "flex";
      document.body.style.overflow = "hidden";
    }

    // 삭제
    if (action === "delete") {
      if (userRole !== "admin") return alert("관리자만 가능합니다.");
      if (!confirm("정말 삭제하시겠습니까?")) return;

      await deleteDoc(doc(db, "inventory", id));
      alert("삭제되었습니다.");
    }
  });

  // ============================================
  // 🔥 전체 삭제 (배치 제한 수정됨)
  // ============================================
  if (btnDeleteAllInv) {
    btnDeleteAllInv.addEventListener("click", async () => {
      if (userRole !== "admin") {
        alert("관리자만 가능합니다.");
        return;
      }

      const building = invBuildingSel.value;
      const targetText = building
        ? `'${building}'의 모든 재고`
        : "전체 건물의 모든 재고";

      if (!confirm(`${targetText}를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
      if (!confirm("정말로 삭제하시겠습니까?")) return;

      try {
        // 현재 필터링된 데이터 대상
        const targets = cachedItems; 
        
        if (targets.length === 0) return alert("삭제할 대상이 없습니다.");

        // Firestore Batch Limit (500) 고려하여 400개씩 분할 처리
        const chunkArray = (arr, size) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        };

        const chunks = chunkArray(targets, 400);

        // 순차적으로 배치 실행
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(item => {
            batch.delete(doc(db, "inventory", item.id));
          });
          await batch.commit();
        }
        
        alert("삭제 완료되었습니다.");
      } catch (err) {
        console.error("전체 삭제 오류:", err);
        alert("삭제 중 오류가 발생했습니다.");
      }
    });
  }

  // ============================================
  // 검색 및 필터 이벤트
  // ============================================
  invBuildingSel.addEventListener("change", () => {
    fillCommonDropdown();
    subscribeInventory();
    
    // 탭 UI 동기화
    const val = invBuildingSel.value;
    buildingTabs.forEach(btn => {
      if(btn.dataset.building === val) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  });

  invSearchInput.addEventListener("input", () => {
    renderRows(cachedItems);
  });

  // 탭 버튼 클릭 시
  buildingTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      buildingTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const selected = tab.dataset.building;
      invBuildingSel.value = selected;
      
      fillCommonDropdown();
      subscribeInventory();
    });
  });

  // ============================================
  // CSV 내보내기
  // ============================================
  btnExportInv.addEventListener("click", () => {
    if (cachedItems.length === 0) return alert("데이터가 없습니다.");
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM 추가
    csvContent += "건물,품목명,재고,최소수량,상태,비고,수정일\n";

    cachedItems.forEach(row => {
      const status = Number(row.quantity) <= Number(row.minQuantity) ? "부족" : "정상";
      // 콤마 제거
      const cleanName = (row.itemName || "").replace(/,/g, " ");
      const cleanNote = (row.note || "").replace(/,/g, " ");
      
      csvContent += `${row.building},${cleanName},${row.quantity},${row.minQuantity},${status},${cleanNote},${row.lastUpdated}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0,10);
    const buildingStr = invBuildingSel.value || "전체";
    link.setAttribute("download", `HARU_재고_${buildingStr}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // ============================================
  // 로그인 상태 확인
  // ============================================
  onAuthStateChanged(auth, async (user) => {
    if (!user?.email) {
        // 비로그인 상태라도 조회는 가능하게 유지
        subscribeInventory();
        return;
    }

    try {
      const role = await getUserRoleByEmail(user.email);
      userRole = role === "admin" ? "admin" : "user";
    } catch {
      userRole = "user";
    }

    fillCommonDropdown();
    subscribeInventory();
  });

  // 초기 실행
  fillCommonDropdown();
  resetForm();
});