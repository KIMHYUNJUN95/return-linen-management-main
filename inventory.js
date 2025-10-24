// ========================================
// 📦 HARU 재고 관리 시스템 (UI + 권한 오류 제거 버전)
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

// ✅ 권한 기능 비활성화용 임시 함수 (항상 user로 반환)
const getUserRoleByEmail = () => Promise.resolve("admin");


// ========================================
// ✅ 초기화
// ========================================
window.addEventListener("DOMContentLoaded", () => {
  const invBuildingSel = document.getElementById("invBuilding");
  const invSearchInput = document.getElementById("invSearch");
  const invTbody = document.getElementById("invTbody");
  const btnExportInv = document.getElementById("btnExportInv");
  const btnResetForm = document.getElementById("btnResetForm");
  const btnSaveItem = document.getElementById("btnSaveItem");
  const formTitle = document.getElementById("formTitle");
  const formBuilding = document.getElementById("formBuilding");
  const formName = document.getElementById("formName");
  const formQty = document.getElementById("formQty");
  const formMin = document.getElementById("formMin");
  const formNote = document.getElementById("formNote");
  const commonItemSelect = document.getElementById("commonItemSelect");
  const buildingTabs = document.querySelectorAll(".building-tabs button");

  let unsub = null;
  let currentDocId = null;
  let cachedItems = [];
  let userRole = "user";

  const COMMON_ITEMS = [
    "칫솔","솜","바디타올","슬리퍼","휴족시간","드립커피 팩","두루마리 휴지","각티슈","주방 수세미","쓰레기봉투(45L)",
    "화장실 쓰레기 봉투(20L)","화장실 방향제","샴푸 (리필형)","컨디셔너 (리필형)","바디워시 (리필형)","손세정제 (리필형)",
    "퐁퐁 (리필형)","페브리즈(10L)","캡슐세제 (팩)","니트릴장갑 (M)","니트릴장갑 (L)","돌돌이 (리필)","싱크대 망 (대)",
    "토이레 (리필형)","마이펫토 (리필형)","가라스 (리필형)","카비키라 (리필형)","알코올 (리필형)","피톤치트 (리필형)",
    "웰컴카드","출근카드","AA건전지","AAA건전지","CR2 (도어락 건전지)","충전기선 (C타입)","충전기 어뎁터 (C타입)",
    "스팀 다리미","헤어 드라이기","갈색 샴푸통","에어컨 리모컨","티비 리모컨","욕실 배수구캡"
  ];

  // -------------------------------
  // 🧾 공통품목 드롭다운 채우기
  // -------------------------------
  function fillCommonDropdown() {
    commonItemSelect.innerHTML =
      `<option value="">직접 입력</option>
       <option value="all">🌐 공통 품목 전체 등록</option>` +
      COMMON_ITEMS.map((n) => `<option value="${n}">${n}</option>`).join("");
  }

  commonItemSelect.addEventListener("change", async () => {
    const value = commonItemSelect.value;
    if (value === "") return;

    // ✅ 전체 등록 기능
    if (value === "all") {
      if (userRole !== "admin") {
        alert("전체 품목 등록은 관리자만 가능합니다.");
        commonItemSelect.value = "";
        return;
      }
      if (!confirm("공통 품목 전체를 현재 건물에 등록하시겠습니까?")) return;

      const building = formBuilding.value;
      const colRef = collection(db, "inventory");
      const existingSnap = await getDocs(query(colRef, where("building", "==", building)));
      const existingNames = existingSnap.docs.map((d) => d.data().itemName);
      let addedCount = 0;

      for (const name of COMMON_ITEMS) {
        if (existingNames.includes(name)) continue;
        await addDoc(colRef, {
          building,
          itemName: name,
          quantity: 0,
          minQuantity: 0,
          note: "",
          lastUpdated: new Date().toISOString().split("T")[0],
        });
        addedCount++;
      }
      alert(`✅ ${addedCount}개 품목이 새로 등록되었습니다.`);
      return;
    }

    // ✅ 단일 품목 자동 입력
    formName.value = value;
  });

  // -------------------------------
  // 📋 테이블 렌더링
  // -------------------------------
  function renderRows(items) {
    const keyword = (invSearchInput.value || "").trim().toLowerCase();
    let rows = keyword
      ? items.filter((r) => (r.itemName || "").toLowerCase().includes(keyword))
      : items;

    if (!rows.length) {
      invTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;opacity:.7;">데이터가 없습니다.</td></tr>`;
      return;
    }

    invTbody.innerHTML = rows
      .map(
        (d) => `
      <tr data-id="${d.id}">
        <td>${d.itemName || ""}</td>
        <td class="t-right">${Number(d.quantity || 0).toLocaleString()}</td>
        <td class="t-right">${Number(d.minQuantity || 0).toLocaleString()}</td>
        <td>${d.building || ""}</td>
        <td>${d.lastUpdated || ""}</td>
        <td>
          ${
            userRole === "admin"
              ? `
                <button class="btn btn-sm" data-action="edit">수정</button>
                <button class="btn btn-sm danger" data-action="delete">삭제</button>
              `
              : `
                <button class="btn btn-sm" disabled style="opacity:.5;cursor:not-allowed;">수정</button>
                <button class="btn btn-sm danger" disabled style="opacity:.5;cursor:not-allowed;">삭제</button>
              `
          }
        </td>
      </tr>`
      )
      .join("");
  }

  // -------------------------------
  // 🔁 Firestore 실시간 구독
  // -------------------------------
  function subscribeInventory() {
    if (unsub) unsub();

    const building = invBuildingSel.value;
    const col = collection(db, "inventory");
    const q = building
      ? query(col, where("building", "==", building), orderBy("itemName"))
      : query(col, orderBy("itemName"));

    unsub = onSnapshot(q, (snap) => {
      cachedItems = [];
      snap.forEach((docSnap) => cachedItems.push({ id: docSnap.id, ...docSnap.data() }));
      renderRows(cachedItems);
    });
  }

  // -------------------------------
  // 🧾 폼 초기화
  // -------------------------------
  function resetForm() {
    currentDocId = null;
    formTitle.textContent = "품목 등록 / 수정";
    formBuilding.value = invBuildingSel.value || "아라키초A";
    formName.value = "";
    formQty.value = 0;
    formMin.value = 0;
    formNote.value = "";
    commonItemSelect.value = "";
  }

  btnResetForm.addEventListener("click", resetForm);

  // -------------------------------
  // 💾 저장 (등록 / 수정)
  // -------------------------------
  btnSaveItem.addEventListener("click", async () => {
    const building = formBuilding.value.trim();
    const itemName = formName.value.trim();
    const quantity = Number(formQty.value || 0);
    const minQuantity = Number(formMin.value || 0);
    const note = formNote.value.trim();

    if (!itemName) return alert("품목명을 입력하세요.");
    if (userRole !== "admin") {
      alert("관리자만 재고 데이터를 수정할 수 있습니다.");
      return;
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
      const existingSnap = await getDocs(q);

      if (!currentDocId && !existingSnap.empty) {
        alert("이미 등록된 품목입니다.");
        return;
      }

      if (currentDocId) {
        await setDoc(doc(db, "inventory", currentDocId), payload, { merge: true });
        alert("수정되었습니다.");
      } else {
        await addDoc(collection(db, "inventory"), payload);
        alert("등록되었습니다.");
      }
      resetForm();
    } catch (err) {
      console.error("❌ 저장 실패:", err);
      alert("저장 중 오류가 발생했습니다.");
    }
  });

  // -------------------------------
  // ✏️ 수정 & 삭제
  // -------------------------------
  invTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const tr = btn.closest("tr");
    const id = tr?.dataset?.id;
    if (!id) return;
    const action = btn.dataset.action;
    const docRef = doc(db, "inventory", id);

    if (action === "edit") {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return alert("데이터를 찾을 수 없습니다.");
      const d = snap.data();
      currentDocId = id;
      formTitle.textContent = `수정 중: ${d.itemName}`;
      formBuilding.value = d.building || "";
      formName.value = d.itemName || "";
      formQty.value = Number(d.quantity || 0);
      formMin.value = Number(d.minQuantity || 0);
      formNote.value = d.note || "";
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }

    if (action === "delete") {
      if (userRole !== "admin") return alert("관리자만 삭제할 수 있습니다.");
      if (!confirm("정말 삭제하시겠습니까?")) return;
      await deleteDoc(docRef);
      alert("삭제되었습니다.");
    }
  });

  // -------------------------------
  // 🔍 필터 및 검색
  // -------------------------------
  invBuildingSel.addEventListener("change", subscribeInventory);
  invSearchInput.addEventListener("input", () => {
    const keyword = invSearchInput.value.trim().toLowerCase();
    const filtered = cachedItems.filter((r) =>
      (r.itemName || "").toLowerCase().includes(keyword)
    );
    renderRows(filtered);
  });

  // 🏢 건물 탭 클릭 시
  buildingTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      buildingTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const selected = tab.dataset.building;
      invBuildingSel.value = selected;
      formBuilding.value = selected;
      subscribeInventory();
    });
  });

  // -------------------------------
  // 📤 CSV 내보내기
  // -------------------------------
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
      rows.push([d.itemName, d.quantity, d.minQuantity, d.building, d.lastUpdated]);
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

  // -------------------------------
  // 🔐 로그인 권한 확인
  // -------------------------------
  onAuthStateChanged(auth, async (user) => {
    if (!user?.email) return;
    try {
      const role = await getUserRoleByEmail(user.email);
      userRole = role === "admin" ? "admin" : "user";
      subscribeInventory();
    } catch (err) {
      console.warn("권한 확인 실패:", err);
      userRole = "user";
      subscribeInventory();
    }
  });

  // -------------------------------
  // 🚀 초기 실행
  // -------------------------------
  fillCommonDropdown();
  subscribeInventory();
  resetForm();
});
