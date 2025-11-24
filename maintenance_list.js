// 📄 maintenance_list.js (유지보수 목록 + 보수방법 보기 모달 - 버튼 data 사용 버전)

// ========================================
// 🛠️ HARU 유지보수 목록 (모든 사용자 접근 가능 + 권한별 수정/삭제 제어)
// ========================================

import { db, auth } from "./storage.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getUserRoleByEmail } from "./roles.js";

// ✅ 현재 사용자 및 권한 전역 변수
let currentUser = null;
let currentRole = "user";

// ✅ 보수방법 모달 관련 전역
let repairModalEl = null;
let repairTextEl = null;

// ========================================
// 🔧 보수방법 밝은 모달 생성
// ========================================
function setupRepairModal() {
  if (repairModalEl) return;

  repairModalEl = document.createElement("div");
  repairModalEl.style.position = "fixed";
  repairModalEl.style.inset = "0";
  repairModalEl.style.background = "rgba(15,23,42,0.35)";
  repairModalEl.style.display = "none";
  repairModalEl.style.justifyContent = "center";
  repairModalEl.style.alignItems = "center";
  repairModalEl.style.zIndex = "9999";
  repairModalEl.style.padding = "20px";

  const card = document.createElement("div");
  card.style.width = "90%";
  card.style.maxWidth = "600px";
  card.style.background = "#ffffff";
  card.style.border = "1px solid rgba(148,163,184,0.7)";
  card.style.borderRadius = "18px";
  card.style.boxShadow = "0 18px 45px rgba(15,23,42,0.25)";
  card.style.padding = "20px 22px";
  card.style.color = "#111827";
  card.style.maxHeight = "80vh";
  card.style.overflowY = "auto";
  card.style.fontSize = "14px";
  card.style.lineHeight = "1.6";

  const title = document.createElement("h3");
  title.textContent = "🔧 보수 방법";
  title.style.fontSize = "18px";
  title.style.fontWeight = "700";
  title.style.marginBottom = "10px";
  title.style.color = "#0f172a";

  repairTextEl = document.createElement("div");
  repairTextEl.style.whiteSpace = "pre-wrap";
  repairTextEl.style.wordBreak = "break-word";
  repairTextEl.style.marginTop = "4px";

  const footer = document.createElement("div");
  footer.style.textAlign = "center";
  footer.style.marginTop = "16px";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "닫기";
  closeBtn.style.padding = "8px 18px";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.border = "none";
  closeBtn.style.background = "#111827";
  closeBtn.style.color = "#f9fafb";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "13px";
  closeBtn.style.fontWeight = "600";
  closeBtn.style.boxShadow = "0 4px 10px rgba(15,23,42,0.35)";
  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.background = "#020617";
  });
  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.background = "#111827";
  });
  closeBtn.addEventListener("click", () => {
    repairModalEl.style.display = "none";
  });

  footer.appendChild(closeBtn);
  card.appendChild(title);
  card.appendChild(repairTextEl);
  card.appendChild(footer);
  repairModalEl.appendChild(card);

  repairModalEl.addEventListener("click", (e) => {
    if (e.target === repairModalEl) {
      repairModalEl.style.display = "none";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && repairModalEl.style.display === "flex") {
      repairModalEl.style.display = "none";
    }
  });

  document.body.appendChild(repairModalEl);
}

function openRepairModal(text) {
  setupRepairModal();
  const value = (text || "").trim();
  repairTextEl.textContent = value || "등록된 보수 방법이 없습니다.";
  repairModalEl.style.display = "flex";
}

// ========================================
// 🔐 로그인 감시
// ========================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("로그인이 필요합니다.");
    location.href = "signup.html";
    return;
  }
  currentUser = user;
  currentRole = await getUserRoleByEmail(user.email);
  console.log("🔐 사용자 권한:", currentRole);
  setupRepairModal();
  loadMaintenanceList();
});

// ========================================
// 📅 날짜 포맷
// ========================================
function formatDate(ts) {
  if (!ts) return "—";
  try {
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ========================================
// 📋 Firestore 유지보수 목록 불러오기
// ========================================
async function loadMaintenanceList() {
  const tbody = document.getElementById("maintenanceBody");
  const mobileList = document.getElementById("mobileList");

  if (!tbody || !mobileList) {
    console.error("❌ HTML 요소를 찾을 수 없습니다. (maintenanceBody 또는 mobileList)");
    return;
  }

  try {
    // 🔥 날짜 최신순 정렬 적용
    const qy = query(
      collection(db, "maintenance"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(qy);

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="10">등록된 유지보수 내역이 없습니다.</td></tr>`;
      mobileList.innerHTML = `<p style="text-align:center;color:#999;">등록된 유지보수 내역이 없습니다.</p>`;
      return;
    }

    let tableHtml = "";
    let mobileHtml = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;

      const createdAt = formatDate(data.createdAt);
      const building = data.building || "-";
      const room = data.room || "-";
      const issue = data.issue || data.description || "-";
      const note = data.note || "-";
      const staff = data.staff || "-";
      const status = data.status || "-";
      const createdByEmail = data.createdByEmail || null;

      const repairMethodRaw =
        data.repairMethod ||
        data.repair_method ||
        data.repairmethod ||
        data.repair ||
        data.fix ||
        data.method ||
        "";

      const hasRepair =
        repairMethodRaw &&
        typeof repairMethodRaw === "string" &&
        repairMethodRaw.trim() !== "";

      const photo =
        data.photoURL ||
        (Array.isArray(data.imageUrls) && data.imageUrls.length > 0
          ? data.imageUrls[0]
          : "");

      const canEdit =
        currentUser &&
        (currentRole === "admin" || currentUser.email === createdByEmail);
      const canDelete = currentRole === "admin";

      const encodedRepair = encodeURIComponent(repairMethodRaw || "");

      // ---------------- PC 테이블 ----------------
      tableHtml += `
        <tr data-id="${id}">
          <td>${createdAt}</td>
          <td>${building}</td>
          <td>${room}</td>
          <td>${issue}</td>
          <td>
            ${
              hasRepair
                ? `<button 
                     class="btn-view-repair" 
                     data-id="${id}"
                     data-repair="${encodedRepair}"
                     style="padding:4px 10px;border-radius:999px;border:1px solid rgba(148,163,184,0.7);background:#f9fafb;color:#111827;font-size:12px;cursor:pointer;">
                     보수방법 보기
                   </button>`
                : `<span style="font-size:12px;color:#9ca3af;">미등록</span>`
            }
          </td>
          <td>${staff}</td>
          <td>${note}</td>
          <td>
            ${
              photo
                ? `<img src="${photo}" class="photo-thumb" alt="사진" data-photo="${photo}">`
                : "-"
            }
          </td>
          <td>${status}</td>
          <td>
            ${canEdit ? `<button class="btn-edit" data-id="${id}">✏️ 수정</button>` : ""}
            ${canDelete ? `<button class="btn-del" data-id="${id}">🗑️ 삭제</button>` : ""}
          </td>
        </tr>
      `;

      // ---------------- 모바일 카드 ----------------
      mobileHtml += `
        <div class="mobile-card" data-id="${id}">
          <strong>🏢 ${building}</strong> · <span>${room}</span><br>
          <p>🧰 ${issue}</p>
          <p>
            🔧 ${
              hasRepair
                ? `<button 
                     class="btn-view-repair" 
                     data-id="${id}" 
                     data-repair="${encodedRepair}"
                     style="margin-top:4px;padding:4px 10px;border-radius:999px;border:1px solid rgba(148,163,184,0.7);background:#f9fafb;color:#111827;font-size:12px;cursor:pointer;">
                     보수방법 보기
                   </button>`
                : `<span style="font-size:12px;color:#9ca3af;">미등록</span>`
            }
          </p>
          <p>👤 ${staff} | ${status}</p>
          <p>📝 ${note}</p>
          ${
            photo
              ? `<img src="${photo}" alt="사진" data-photo="${photo}">`
              : ""
          }
          <div style="margin-top:6px;">
            ${canEdit ? `<button class="btn-edit" data-id="${id}">✏️ 수정</button>` : ""}
            ${canDelete ? `<button class="btn-del" data-id="${id}">🗑️ 삭제</button>` : ""}
          </div>
        </div>
      `;
    });

    tbody.innerHTML = tableHtml;
    mobileList.innerHTML = mobileHtml;

    attachPhotoEvents();
    attachDeleteEvents();
    attachEditEvents();
    attachRepairEvents();

  } catch (err) {
    console.error("🔥 Firestore 불러오기 오류:", err);
    tbody.innerHTML = `<tr><td colspan="10">데이터 불러오기 오류가 발생했습니다.</td></tr>`;
  }
}

// ========================================
// 🖼️ 사진 확대 모달
// ========================================
function attachPhotoEvents() {
  const photoModal = document.getElementById("photoModal");
  const modalImg = document.getElementById("modalImg");
  if (!photoModal || !modalImg) return;

  document.querySelectorAll("[data-photo]").forEach((img) => {
    img.addEventListener("click", () => {
      modalImg.src = img.dataset.photo;
      photoModal.style.display = "flex";
    });
  });

  photoModal.addEventListener("click", (e) => {
    if (e.target === photoModal) photoModal.style.display = "none";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") photoModal.style.display = "none";
  });
}

// ========================================
// 🔧 보수방법 보기 이벤트
// ========================================
function attachRepairEvents() {
  setupRepairModal();
  document.querySelectorAll(".btn-view-repair").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const encoded = e.currentTarget.dataset.repair || "";
      let txt = "";
      try {
        txt = decodeURIComponent(encoded);
      } catch {
        txt = encoded;
      }
      openRepairModal(txt);
    });
  });
}

// ========================================
// ✏️ 수정 이동
// ========================================
function attachEditEvents() {
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      location.href = `maintenance.html?edit=${id}`;
    });
  });
}

// ========================================
// ❌ 삭제 (관리자만 가능)
// ========================================
function attachDeleteEvents() {
  document.querySelectorAll(".btn-del").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      if (!confirm("정말 삭제하시겠습니까?")) return;
      try {
        await deleteDoc(doc(db, "maintenance", id));
        alert("삭제되었습니다.");
        loadMaintenanceList();
      } catch (err) {
        console.error("❌ 삭제 실패:", err);
        alert("삭제 중 오류가 발생했습니다.");
      }
    });
  });
}
