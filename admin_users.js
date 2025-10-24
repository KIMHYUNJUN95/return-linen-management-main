// ========================================
// 👑 HARU 사용자 관리 (Super Admin 전용)
// ========================================

import { auth, db } from "./storage.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🧑 슈퍼 관리자 이메일
const superAdminEmail = "rlaguswns95@haru-tokyo.com";

// ================================
// 🔐 접근 권한 체크 (Super Admin만)
// ================================
auth.onAuthStateChanged(async (user) => {
  if (!user || user.email !== superAdminEmail) {
    alert("🚫 접근 권한이 없습니다.");
    location.href = "board.html";
    return;
  }
  console.log(`✅ 슈퍼관리자 로그인: ${user.email}`);
  await loadUsers();
});

// ================================
// 📋 사용자 목록 불러오기 (중복 제거)
// ================================
async function loadUsers() {
  const tbody = document.getElementById("userTbody");
  tbody.innerHTML = `<tr><td colspan="3" class="t-center">불러오는 중...</td></tr>`;

  try {
    const snap = await getDocs(collection(db, "users"));
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="3" class="t-center">등록된 사용자가 없습니다.</td></tr>`;
      return;
    }

    // 이메일 기준으로 중복 제거
    const usersMap = new Map();
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      usersMap.set(data.email, data);
    });

    const rows = [];
    usersMap.forEach((data) => {
      rows.push(`
        <tr>
          <td>${data.name || "(이름 없음)"}</td>
          <td>${data.email}</td>
          <td class="t-center">${data.role || "user"}</td>
        </tr>
      `);
    });

    tbody.innerHTML = rows.join("");
  } catch (err) {
    console.error("❌ 사용자 목록 불러오기 오류:", err);
    tbody.innerHTML = `<tr><td colspan="3" class="t-center">오류가 발생했습니다.</td></tr>`;
  }
}

// ================================
// 📝 권한 부여
// ================================
document.getElementById("btnGrantAdmin").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return alert("이메일을 입력하세요.");

  try {
    const ref = doc(db, "users", email);
    await setDoc(ref, { email, role: "admin" }, { merge: true });
    alert(`✅ ${email} 님에게 관리자 권한이 부여되었습니다.`);
    await loadUsers(); // ✅ 바로 반영
  } catch (err) {
    console.error("❌ 권한 부여 오류:", err);
    alert("권한 부여 중 오류가 발생했습니다.");
  }
});

// ================================
// 📝 권한 회수
// ================================
document.getElementById("btnRevokeAdmin").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return alert("이메일을 입력하세요.");

  try {
    const ref = doc(db, "users", email);
    await updateDoc(ref, { role: "user" });
    alert(`✅ ${email} 님의 관리자 권한이 회수되었습니다.`);
    await loadUsers(); // ✅ 바로 반영
  } catch (err) {
    console.error("❌ 권한 회수 오류:", err);
    alert("권한 회수 중 오류가 발생했습니다.");
  }
});

// ================================
// 🔄 목록 새로고침
// ================================
document.getElementById("btnRefreshUsers").addEventListener("click", loadUsers);
