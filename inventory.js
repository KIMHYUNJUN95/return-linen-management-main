// ========================================
// 📦 HARU 재고 관리 시스템 (전체화면 모드 + 상태 표시 추가)
// ========================================

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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 항상 admin
const getUserRoleByEmail = () => Promise.resolve("admin");

window.addEventListener("DOMContentLoaded", () => {
  const invBuildingSel = document.getElementById("invBuilding");
  const invSearchInput = document.getElementById("invSearch");
  const invTbody = document.getElementById("invTbody");
  const btnExportInv = document.getElementById("btnExportInv");
  const openFormBtn = document.getElementById("openFormBtn");
  const btnDeleteAllInv = document.getElementById("btnDeleteAllInv"); // ✅ 전체 삭제 버튼 (옵션)

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
  // 🪄 모달
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
  // 전체화면 모달
  // ============================================
  btnOpenInventoryFull.addEventListener("click", () => {
    renderFullInventory();
    inventoryFullModal.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  btnCloseInventoryFull.addEventListener("click", () => {
    inventoryFullModal.classList.remove("active");
    document.body.style.overflow = "";
  });

  function renderFullInventory() {
    if (!cachedItems.length) {
      fullscreenInventory.innerHTML =
        `<p style="text-align:center;opacity:.6;">불러온 데이터가 없습니다.</p>`;
      return;
    }

    fullscreenInventory.innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f4f6f8;">
            <th style="padding:8px;">품목명</th>
            <th style="padding:8px;">재고</th>
            <th style="padding:8px;">최소</th>
            <th style="padding:8px;">상태</th>
            <th style="padding:8px;">건물</th>
            <th style="padding:8px;">최근 수정</th>
          </tr>
        </thead>
        <tbody>
          ${cachedItems
            .map((d) => {
              const qty = Number(d.quantity || 0);
              const min = Number(d.minQuantity || 0);
              const status =
                qty <= min
                  ? `<span style="color:#f43f5e;font-weight:600;">품절</span>`
                  : `<span style="color:#10b981;font-weight:600;">정상</span>`;
              return `
                <tr style="border-bottom:1px solid #ddd;">
                  <td style="padding:8px;">${d.itemName}</td>
                  <td style="padding:8px;text-align:right;">${qty}</td>
                  <td style="padding:8px;text-align:right;">${min}</td>
                  <td style="padding:8px;text-align:center;">${status}</td>
                  <td style="padding:8px;">${d.building}</td>
                  <td style="padding:8px;">${d.lastUpdated}</td>
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

    commonItemSelect.innerHTML =
      `<option value="">직접 입력</option>
       <option value="all">🌐 전체 등록</option>` +
      items.map((n) => `<option value="${n}">${n}</option>`).join("");
  }

  commonItemSelect.addEventListener("change", async () => {
    const building = formBuilding.value;
    const selected = commonItemSelect.value;
    const allowed = getAllowedItems(building);

    if (!selected) return;

    // 전체 등록
    if (selected === "all") {
      const colRef = collection(db, "inventory");
      const snap = await getDocs(
        query(colRef, where("building", "==", building))
      );
      const exist = snap.docs.map((d) => d.data().itemName);

      let count = 0;
      for (const name of allowed) {
        if (exist.includes(name)) continue;

        await addDoc(colRef, {
          building,
          itemName: name,
          quantity: 0,
          minQuantity: 0,
          note: "",
          lastUpdated: new Date().toISOString().split("T")[0],
        });
        count++;
      }

      alert(`등록된 품목: ${count}개`);
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
        `<tr><td colspan="7" style="text-align:center;opacity:.7;">데이터가 없습니다.</td></tr>`;
      return;
    }

    invTbody.innerHTML = rows
      .map((d) => {
        const qty = Number(d.quantity || 0);
        const min = Number(d.minQuantity || 0);
        const status =
          qty <= min
            ? `<span style="color:#f43f5e;font-weight:600;">❌ 품절</span>`
            : `<span style="color:#10b981;font-weight:600;">✅ 정상</span>`;

        return `
        <tr data-id="${d.id}">
          <td>${d.itemName}</td>
          <td class="t-right">${qty}</td>
          <td class="t-right">${min}</td>
          <td>${status}</td>
          <td>${d.building}</td>
          <td>${d.lastUpdated}</td>
          <td>
            ${
              userRole === "admin"
                ? `<button class="btn btn-sm" data-action="edit">수정</button>
                   <button class="btn btn-sm danger" data-action="delete">삭제</button>`
                : `<button class="btn btn-sm" disabled style="opacity:.5;">수정</button>
                   <button class="btn btn-sm danger" disabled style="opacity:.5;">삭제</button>`
            }
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

    const q = building
      ? query(col, where("building", "==", building), orderBy("itemName"))
      : query(col, orderBy("itemName"));

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
    formTitle.textContent = "품목 등록 / 수정";
    formBuilding.value = building;
    formName.value = "";
    formQty.value = 0;
    formMin.value = 0;
    formNote.value = "";
    fillCommonDropdown();
  }

  btnResetForm.addEventListener("click", resetForm);

  // ============================================
  // 저장
  // ============================================
  btnSaveItem.addEventListener("click", async () => {
    const building = formBuilding.value.trim();
    const itemName = formName.value.trim();
    const quantity = Number(formQty.value || 0);
    const minQuantity = Number(formMin.value || 0);
    const note = formNote.value.trim();

    if (!itemName) return alert("품목명을 입력하세요.");
    if (userRole !== "admin") return alert("관리자만 가능합니다.");

    // 🔥 이 건물에서 허용되는 품목인지 체크
    const allowed = getAllowedItems(building);
    if (!allowed.includes(itemName)) {
      return alert("해당 건물에서 허용되지 않는 품목입니다.");
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
      const q = query(
        collection(db, "inventory"),
        where("building", "==", building),
        where("itemName", "==", itemName)
      );
      const snap = await getDocs(q);

      // 중복 체크
      if (!currentDocId && !snap.empty) {
        alert("이미 등록된 품목입니다.");
        return;
      }

      if (currentDocId) {
        await setDoc(doc(db, "inventory", currentDocId), payload, {
          merge: true,
        });
        alert("수정되었습니다.");
      } else {
        await addDoc(collection(db, "inventory"), payload);
        alert("등록되었습니다.");
      }

      resetForm();
      modalOverlay.style.display = "none";
      document.body.style.overflow = "";
    } catch (err) {
      alert("오류 발생");
      console.error(err);
    }
  });

  // ============================================
  // 수정 / 삭제
  // ============================================
  invTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const tr = btn.closest("tr");
    const id = tr?.dataset?.id;
    if (!id) return;

    const action = btn.dataset.action;
    const ref = doc(db, "inventory", id);

    // 수정
    if (action === "edit") {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const d = snap.data();
      currentDocId = id;

      formTitle.textContent = `수정 중: ${d.itemName}`;
      formBuilding.value = d.building;
      formName.value = d.itemName;
      formQty.value = d.quantity;
      formMin.value = d.minQuantity;
      formNote.value = d.note;

      fillCommonDropdown();
      modalOverlay.style.display = "flex";
      document.body.style.overflow = "hidden";
    }

    // 삭제
    if (action === "delete") {
      if (userRole !== "admin") return alert("관리자만 가능합니다.");
      if (!confirm("삭제할까요?")) return;

      await deleteDoc(ref);
      alert("삭제되었습니다.");
    }
  });

  // ============================================
  // 🔥 전체 삭제 (현재 선택 건물 또는 전체)
// ============================================
  if (btnDeleteAllInv) {
    btnDeleteAllInv.addEventListener("click", async () => {
      if (userRole !== "admin") {
        alert("관리자만 가능합니다.");
        return;
      }

      const building = invBuildingSel.value;
      const targetText = building
        ? `${building}의 모든 재고`
        : "모든 건물의 모든 재고";

      if (!confirm(`${targetText}를 정말 삭제하시겠습니까?`)) return;
      if (
        !confirm(
          "⚠️ 삭제 후에는 복구할 수 없습니다.\n정말 모든 재고 데이터를 삭제하시겠습니까?"
        )
      )
        return;

      try {
        const colRef = collection(db, "inventory");
        let snap;

        if (building) {
          const q = query(colRef, where("building", "==", building));
          snap = await getDocs(q);
        } else {
          snap = await getDocs(colRef);
        }

        if (snap.empty) {
          alert("삭제할 데이터가 없습니다.");
          return;
        }

        const deletes = [];
        snap.forEach((docSnap) => {
          deletes.push(deleteDoc(doc(db, "inventory", docSnap.id)));
        });

        await Promise.all(deletes);
        alert("전체 삭제가 완료되었습니다.");
      } catch (err) {
        console.error("전체 삭제 오류:", err);
        alert("전체 삭제 중 오류가 발생했습니다.");
      }
    });
  }

  // ============================================
  // 검색
  // ============================================
  invBuildingSel.addEventListener("change", () => {
    fillCommonDropdown();
    subscribeInventory();
  });

  invSearchInput.addEventListener("input", () => {
    const keyword = invSearchInput.value.trim().toLowerCase();
    const filtered = cachedItems.filter((r) =>
      (r.itemName || "").toLowerCase().includes(keyword)
    );
    renderRows(filtered);
  });

  buildingTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      buildingTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const selected = tab.dataset.building;
      invBuildingSel.value = selected;
      formBuilding.value = selected;

      fillCommonDropdown();
      subscribeInventory();
    });
  });

  // ============================================
  // CSV
  // ============================================
  btnExportInv.addEventListener("click", async () => {
    const building = invBuildingSel.value;
    const col = collection(db, "inventory");

    const q = building
      ? query(col, where("building", "==", building), orderBy("itemName"))
      : query(col, orderBy("itemName"));

    const snap = await getDocs(q);

    const rows = [["품목", "재고", "최소", "건물", "최근 업데이트"]];
    snap.forEach((s) => {
      const d = s.data();
      rows.push([
        d.itemName,
        d.quantity,
        d.minQuantity,
        d.building,
        d.lastUpdated,
      ]);
    });

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `HARU_재고_${building || "전체"}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // ============================================
  // 로그인
  // ============================================
  onAuthStateChanged(auth, async (user) => {
    if (!user?.email) return;

    try {
      const role = await getUserRoleByEmail(user.email);
      userRole = role === "admin" ? "admin" : "user";
    } catch {
      userRole = "user";
    }

    subscribeInventory();
  });

  // ============================================
  // 초기 실행
  // ============================================
  fillCommonDropdown();
  subscribeInventory();
  resetForm();
});
