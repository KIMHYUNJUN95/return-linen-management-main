// ========================================
// 🛠️ HARU Maintenance List Logic (Fixed & Integrated)
// ========================================

// ✅ [수정됨] storage.js에서 통합된 db, auth 가져오기 (중복 초기화 방지)
import { db, auth } from "./storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 3. Header Logic (기존 로직 유지)
document.addEventListener("DOMContentLoaded", () => {
   console.log("Maintenance List Page Loaded");
});

// 전역 변수
let currentUser = null;
let currentRole = "user";
let allData = []; // 전체 데이터 캐싱

// 🔴 Role Check (내부 함수 유지)
const getUserRoleByEmail = async (email) => {
   const superAdmin = "rlaguswns95@haru-tokyo.com";
   if (email === superAdmin) return "admin";
   return "user";
};

/* ========================================
   🔧 보수방법 모달 제어 (HTML 모달 사용)
======================================== */
function openRepairModal(text) {
   const modal = document.getElementById("methodModal");
   const content = document.getElementById("methodContent");
   const closeBtn = document.getElementById("btnMethodClose");

   if (!modal || !content) {
       console.error("Method modal elements not found in HTML.");
       return;
   }

   // 텍스트 설정
   const value = (text || "").trim();
   content.textContent = value || "등록된 보수 방법이 없습니다.\n(수정 버튼을 눌러 내용을 등록해주세요)";

   // 보여주기
   modal.style.display = "flex";

   // 닫기 이벤트 연결 (중복 방지)
   closeBtn.onclick = () => modal.style.display = "none";
   modal.onclick = (e) => {
       if (e.target === modal) modal.style.display = "none";
   };
}

/* ========================================
   🔐 로그인 감시
======================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
      // 비로그인 처리 (필요 시 리다이렉트)
      return; 
  }
  currentUser = user;
  try {
    currentRole = await getUserRoleByEmail(user.email);
  } catch {
    currentRole = "user";
  }
  
  // 데이터 로드 시작
  loadMaintenanceList();
});

/* 📅 날짜 포맷 */
function formatDate(ts) {
  if (!ts) return "-";
  try {
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

/* ========================================
   📋 Firestore 목록 불러오기 & 렌더링
======================================== */
async function loadMaintenanceList() {
  const listContainer = document.getElementById("maintenanceList");
  const filterBuilding = document.getElementById("filterBuilding");
  const filterStatus = document.getElementById("filterStatus");
  const searchInput = document.getElementById("searchInput");
  const buildingTabs = document.querySelectorAll(".building-tabs button");

  if (!listContainer) return;

  // 로딩 표시
  listContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:#94A3B8;">데이터를 불러오는 중입니다...</div>`;

  try {
    // 데이터 로드
    const qy = query(collection(db, "maintenance"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(qy);

    allData = [];
    snapshot.forEach((docSnap) => {
      allData.push({ id: docSnap.id, ...docSnap.data() });
    });

    // 렌더링 함수
    const render = () => {
      const buildingVal = filterBuilding ? filterBuilding.value : "";
      const statusVal = filterStatus ? filterStatus.value : "";
      const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

      const filtered = allData.filter(d => {
        const building = d.building || "";
        const status = d.status || "";
        const text = (d.issue || d.description || "") + (d.room || "") + (d.staff || "");
        
        const matchBuilding = !buildingVal || building === buildingVal;
        const matchStatus = !statusVal || status === statusVal;
        const matchSearch = !keyword || text.toLowerCase().includes(keyword);

        return matchBuilding && matchStatus && matchSearch;
      });

      if (filtered.length === 0) {
        listContainer.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #CBD5E1;">
            등록된 내역이 없습니다.
          </div>`;
        return;
      }

      listContainer.innerHTML = filtered.map(d => {
        const createdAt = formatDate(d.createdAt);
        const issue = d.issue || d.description || "-";
        
        // 보수 방법 데이터 확인
        const repairMethodRaw = d.repairMethod || d.repair_method || "";
        const hasRepair = repairMethodRaw && typeof repairMethodRaw === "string" && repairMethodRaw.trim() !== "";
        // 데이터셋에 넣기 위해 인코딩
        const encodedRepair = encodeURIComponent(repairMethodRaw || "");
        
        const photo = d.photoURL || (Array.isArray(d.imageUrls) && d.imageUrls.length > 0 ? d.imageUrls[0] : "");
        const photoHtml = photo 
          ? `<img src="${photo}" class="photo-thumb" style="width:100%; height:150px; object-fit:cover; margin-top:12px; border:1px solid #E2E8F0; cursor:pointer;" onclick="window.openPhoto('${photo}')">` 
          : "";

        const canEdit = true; // 누구나 수정 가능 (혹은 권한 체크)
        const canDelete = currentRole === "admin"; // 관리자만 삭제

        let statusClass = "status-received";
        if (d.status === "진행중") statusClass = "status-progress";
        if (d.status === "완료") statusClass = "status-completed";

        // 🔥 보수 방법 버튼 생성
        const repairButtonHtml = `
            <button class="method-btn btn-view-repair" data-repair="${encodedRepair}">
                 🔧 보수 방법 보기 ${!hasRepair ? '(미등록)' : ''}
            </button>
        `;

        return `
          <div class="maintenance-card" data-id="${d.id}">
            <span class="status-badge ${statusClass}">${d.status || "접수됨"}</span>
            
            <div class="card-header">
              <div>
                <h3 class="card-title">${d.building || "-"} ${d.room || "-"}</h3>
                <div class="card-subtitle">${d.staff || "Unknown"}</div>
              </div>
            </div>

            <div class="card-body">
              <div class="info-row">
                <div class="info-label">요청 내용</div>
                ${issue}
              </div>
              
              ${d.note ? `<div class="info-row"><div class="info-label">비고</div>${d.note}</div>` : ""}
              
              ${photoHtml}
              
              <div style="margin-top:16px;">
                ${repairButtonHtml}
              </div>
            </div>

            <div class="card-meta">
              <span>${createdAt}</span>
              <span>${d.createdByEmail ? "작성자 확인됨" : "관리자"}</span>
            </div>

            <div class="card-footer">
                <div class="card-actions">
                    <button class="action-btn edit-btn" data-id="${d.id}">수정</button>
                    <button class="action-btn delete delete-btn" data-id="${d.id}">삭제</button>
                </div>
            </div>
          </div>
        `;
      }).join("");

      attachEvents();
    };

    // 🏢 탭 클릭 이벤트
    buildingTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        buildingTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        const val = tab.dataset.building;
        if(filterBuilding) {
          filterBuilding.value = val;
          render(); // 필터 적용하여 렌더링
        }
      });
    });

    // 필터/검색 이벤트
    const filterBtn = document.getElementById("filterBtn");
    const resetBtn = document.getElementById("resetBtn");
    
    if(filterBtn) filterBtn.addEventListener("click", render);
    if(filterBuilding) {
      filterBuilding.addEventListener("change", () => {
        // 셀렉트 박스 변경 시 탭 동기화
        const val = filterBuilding.value;
        buildingTabs.forEach(t => {
          if(t.dataset.building === val) t.classList.add("active");
          else t.classList.remove("active");
        });
        render();
      });
    }
    
    if(resetBtn) resetBtn.addEventListener("click", () => {
        filterBuilding.value = "";
        filterStatus.value = "";
        searchInput.value = "";
        buildingTabs.forEach(t => t.classList.remove("active"));
        // 전체 탭 활성화
        if(buildingTabs.length > 0) buildingTabs[0].classList.add("active");
        render();
    });

    // 초기 렌더링
    render();

  } catch (err) {
    console.error("Firestore 불러오기 오류:", err);
    listContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#E74C3C;">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
  }
}

/* 🖱️ 동적 요소 이벤트 리스너 */
function attachEvents() {
  // 1. 보수 방법 보기 버튼
  document.querySelectorAll(".btn-view-repair").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const encoded = e.target.dataset.repair || "";
      const txt = decodeURIComponent(encoded);
      openRepairModal(txt);
    });
  });

  // 2. 수정 버튼
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      location.href = `maintenance.html?edit=${e.target.dataset.id}`;
    });
  });

  // 3. 삭제 버튼
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("정말로 삭제하시겠습니까?")) return;
      try {
        await deleteDoc(doc(db, "maintenance", e.target.dataset.id));
        alert("삭제되었습니다.");
        loadMaintenanceList();
      } catch (err) {
        console.error("삭제 실패:", err);
        // ✅ [추가됨] 권한 에러 처리 명시
        if (err.code === 'permission-denied') {
            alert("권한이 없습니다. (관리자만 삭제 가능)");
        } else {
            alert("삭제 중 오류가 발생했습니다.");
        }
      }
    });
  });
}

/* 🔍 사진 확대 (전역 함수) */
const photoModal = document.getElementById("photoModal");
const modalImg = document.getElementById("modalImg");

window.openPhoto = (url) => {
  if(modalImg && photoModal) {
    modalImg.src = url;
    photoModal.style.display = "flex";
  }
};

if(photoModal) {
    photoModal.addEventListener("click", () => photoModal.style.display = "none");
}