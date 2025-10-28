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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getUserRoleByEmail } from "./roles.js";

// ✅ 현재 사용자 및 권한 전역 변수
let currentUser = null;
let currentRole = "user";

// ✅ 로그인 상태 감시
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("로그인이 필요합니다.");
    location.href = "signup.html";
    return;
  }
  currentUser = user;
  currentRole = await getUserRoleByEmail(user.email);
  console.log("🔐 사용자 권한:", currentRole);
  loadMaintenanceList();
});

// ========================================
// 🧭 날짜 포맷
// ========================================
function formatDate(ts) {
  if (!ts) return "—";
  try {
    const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
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
    const qy = query(collection(db, "maintenance"));
    const snapshot = await getDocs(qy);

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="9">등록된 유지보수 내역이 없습니다.</td></tr>`;
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
      const photo =
        data.photoURL ||
        (Array.isArray(data.imageUrls) && data.imageUrls.length > 0 ? data.imageUrls[0] : "");

      // ✅ 수정/삭제 권한 체크
      const canEdit = currentUser && (currentRole === "admin" || currentUser.email === createdByEmail);
      const canDelete = currentRole === "admin";

      // ✨ PC 테이블
      tableHtml += `
        <tr data-id="${id}">
          <td>${createdAt}</td>
          <td>${building}</td>
          <td>${room}</td>
          <td>${issue}</td>
          <td>${staff}</td>
          <td>${note}</td>
          <td>
            ${photo ? `<img src="${photo}" class="photo-thumb" alt="사진" data-photo="${photo}">` : "-"}
          </td>
          <td>${status}</td>
          <td>
            ${canEdit ? `<button class="btn-edit" data-id="${id}">✏️ 수정</button>` : ""}
            ${canDelete ? `<button class="btn-del" data-id="${id}">🗑️ 삭제</button>` : ""}
          </td>
        </tr>
      `;

      // ✨ 모바일 카드
      mobileHtml += `
        <div class="mobile-card" data-id="${id}">
          <strong>🏢 ${building}</strong> · <span>${room}</span><br>
          <p>🧰 ${issue}</p>
          <p>👤 ${staff} | ${status}</p>
          <p>📝 ${note}</p>
          ${photo ? `<img src="${photo}" alt="사진" data-photo="${photo}">` : ""}
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
  } catch (err) {
    console.error("🔥 Firestore 불러오기 오류:", err);
    tbody.innerHTML = `<tr><td colspan="9">데이터 불러오기 오류가 발생했습니다.</td></tr>`;
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
