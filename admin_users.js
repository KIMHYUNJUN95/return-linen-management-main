// ========================================
// 👑 HARU 사용자 관리 (Logic Preserved)
// Theme: Tokyo Day Bright (Korean)
// ========================================

import { initHeaderMenu } from "./header.js"; // 헤더 로드용 추가
import { auth, db } from "./storage.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// 🧑 슈퍼 관리자 이메일
const superAdminEmail = "rlaguswns95@haru-tokyo.com";

// ================================
// 🔐 접근 권한 체크 (Super Admin만)
// ================================
auth.onAuthStateChanged(async (user) => {
  if (!user || user.email !== superAdminEmail) {
    alert("접근 권한이 없습니다."); // 이모지 제거
    location.href = "board.html";
    return;
  }
  console.log(`관리자 접속: ${user.email}`);
  await loadUsers();
});

// ================================
// 📋 사용자 목록 불러오기 (중복 제거 로직 유지 + UI 업데이트)
// ================================
async function loadUsers() {
  const tbody = document.getElementById("userTbody");
  // 로딩 메시지 디자인 개선
  tbody.innerHTML = `<tr><td colspan="3" class="t-center" style="padding:40px; color:#94A3B8;">데이터를 불러오는 중입니다...</td></tr>`;

  try {
    const snap = await getDocs(collection(db, "users"));
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="3" class="t-center" style="padding:40px; color:#94A3B8;">등록된 사용자가 없습니다.</td></tr>`;
      return;
    }

    // 이메일 기준으로 중복 제거 (원본 로직 유지)
    const usersMap = new Map();
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      usersMap.set(data.email, data);
    });

    const rows = [];
    
    // 맵 순회하며 행 생성
    usersMap.forEach((data) => {
      // 역할에 따른 뱃지 스타일 적용
      const role = data.role || "user";
      let roleBadge = "";
      
      if (role === "admin") {
        roleBadge = `<span class="badge-admin">관리자</span>`;
      } else {
        roleBadge = `<span class="badge-user">사용자</span>`;
      }

      // 슈퍼 관리자 표시 (선택사항, 데이터 명확성을 위해 추가)
      const displayEmail = data.email === superAdminEmail 
        ? `<strong>${data.email}</strong> (Super)` 
        : data.email;

      rows.push(`
        <tr>
          <td style="font-weight:600; color:var(--haru-navy);">${data.name || "(이름 없음)"}</td>
          <td style="font-family:'Inter', sans-serif;">${displayEmail}</td>
          <td class="t-center">${roleBadge}</td>
        </tr>
      `);
    });

    tbody.innerHTML = rows.join("");
  } catch (err) {
    console.error("사용자 목록 로드 오류:", err);
    tbody.innerHTML = `<tr><td colspan="3" class="t-center" style="color:#E74C3C; padding:40px;">데이터 로드 중 오류가 발생했습니다.</td></tr>`;
  }
}

// ================================
// 📝 권한 부여 (로직 유지)
// ================================
document.getElementById("btnGrantAdmin").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return alert("이메일을 입력하세요.");

  if (!confirm(`${email} 님에게 관리자 권한을 부여하시겠습니까?`)) return;

  try {
    const ref = doc(db, "users", email);
    // setDoc merge: true 로직 유지
    await setDoc(ref, { email, role: "admin" }, { merge: true });
    alert(`[${email}] 관리자 권한 부여 완료`);
    document.getElementById("emailInput").value = ""; // 입력창 초기화
    await loadUsers(); // 목록 갱신
  } catch (err) {
    console.error("권한 부여 오류:", err);
    alert("권한 부여 중 오류가 발생했습니다.");
  }
});

// ================================
// 📝 권한 회수 (로직 유지)
// ================================
document.getElementById("btnRevokeAdmin").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return alert("이메일을 입력하세요.");

  if (email === superAdminEmail) return alert("슈퍼 관리자의 권한은 해제할 수 없습니다.");

  if (!confirm(`${email} 님의 관리자 권한을 회수하시겠습니까?`)) return;

  try {
    const ref = doc(db, "users", email);
    // updateDoc 로직 유지
    await updateDoc(ref, { role: "user" });
    alert(`[${email}] 관리자 권한 회수 완료`);
    document.getElementById("emailInput").value = ""; // 입력창 초기화
    await loadUsers(); // 목록 갱신
  } catch (err) {
    console.error("권한 회수 오류:", err);
    alert("권한 회수 중 오류가 발생했습니다.");
  }
});

// ================================
// 🔄 목록 새로고침
// ================================
document.getElementById("btnRefreshUsers").addEventListener("click", loadUsers);