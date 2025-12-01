// ========================================
// 👑 HARU 사용자 관리 (Logic Fixed)
// Theme: Tokyo Day Bright (Korean)
// ========================================

import { initHeaderMenu } from "./header.js";
// ✅ [수정됨] storage.js에서 통합된 객체 가져오기
import { auth, db } from "./storage.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 1. 헤더 로드
document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html")
    .then(r => r.text())
    .then(h => {
      const placeholder = document.getElementById("header-placeholder");
      if (placeholder) {
        placeholder.innerHTML = h;
        initHeaderMenu();
      }
    })
    .catch(err => console.error("헤더 로드 실패:", err));
});

// 🧑 슈퍼 관리자 이메일 (절대 권한)
const superAdminEmail = "rlaguswns95@haru-tokyo.com";

// ================================
// 🔐 접근 권한 체크 (Super Admin OR DB Admin)
// ================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    location.href = "index.html"; // 로그인 안했으면 쫓아냄
    return;
  }

  // 1. 슈퍼 관리자 프리패스 (사장님은 무조건 통과)
  if (user.email === superAdminEmail) {
    console.log(`👑 슈퍼 관리자 접속: ${user.email}`);
    await loadUsers();
    return;
  }

  // 2. 일반 관리자(DB role 확인) 체크
  try {
    // 현재 로그인한 사람의 uid로 문서를 찾아서 role 확인
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists() && userDoc.data().role === "admin") {
        console.log(`🛡️ 관리자 접속: ${user.email}`);
        await loadUsers();
    } else {
        // 관리자가 아니면 쫓아냄
        alert("접근 권한이 없습니다. (관리자 전용 페이지)");
        location.href = "board.html";
    }
  } catch (e) {
    console.error("권한 확인 실패:", e);
    alert("오류가 발생하여 메인으로 이동합니다.");
    location.href = "board.html";
  }
});

// ================================
// 📋 사용자 목록 불러오기
// ================================
async function loadUsers() {
  const tbody = document.getElementById("userTbody");
  tbody.innerHTML = `<tr><td colspan="3" class="t-center" style="padding:40px; color:#94A3B8;">데이터를 불러오는 중입니다...</td></tr>`;

  try {
    // 모든 사용자 가져오기
    const snap = await getDocs(collection(db, "users"));
    
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="3" class="t-center" style="padding:40px; color:#94A3B8;">등록된 사용자가 없습니다.</td></tr>`;
      return;
    }

    const rows = [];
    
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      // data.uid가 없는 옛날 데이터 방어
      const uid = data.uid || docSnap.id; 
      const role = data.role || "user";
      let roleBadge = "";
      
      // 뱃지 디자인
      if (role === "admin") {
        roleBadge = `<span style="background:#2C3E50; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700;">관리자</span>`;
      } else {
        roleBadge = `<span style="background:#F1F5F9; color:#64748B; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700;">사용자</span>`;
      }

      // 슈퍼 관리자 표시
      const displayEmail = data.email === superAdminEmail 
        ? `<strong style="color:#E74C3C;">${data.email}</strong> (Super)` 
        : data.email;

      rows.push(`
        <tr>
          <td style="font-weight:600; color:#2C3E50; padding:16px;">${data.name || "(이름 없음)"}</td>
          <td style="font-family:'Inter', sans-serif; color:#475569; padding:16px;">${displayEmail}</td>
          <td class="t-center" style="padding:16px;">${roleBadge}</td>
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
// 📝 권한 부여 (로직 수정됨: 이메일로 UID 찾기)
// ================================
document.getElementById("btnGrantAdmin").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return alert("이메일을 입력하세요.");

  if (!confirm(`${email} 님에게 관리자 권한을 부여하시겠습니까?`)) return;

  try {
    // 1. 입력한 이메일을 가진 진짜 유저 문서를 찾음
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return alert("가입되지 않은 이메일입니다.\n(사용자가 먼저 회원가입을 해야 합니다)");
    }

    // 2. 찾은 문서(uid가 ID인 문서)를 업데이트
    const updates = [];
    let targetName = "";
    
    querySnapshot.forEach((docSnap) => {
        targetName = docSnap.data().name;
        // doc(db, "users", docSnap.id) -> 여기서 docSnap.id가 바로 uid임
        updates.push(updateDoc(doc(db, "users", docSnap.id), { role: "admin" }));
    });

    await Promise.all(updates);

    alert(`[${targetName || email}] 님에게 관리자 권한을 부여했습니다.`);
    document.getElementById("emailInput").value = ""; 
    await loadUsers(); // 목록 갱신

  } catch (err) {
    console.error("권한 부여 오류:", err);
    alert("권한 부여 중 오류가 발생했습니다.");
  }
});

// ================================
// 📝 권한 회수 (로직 수정됨)
// ================================
document.getElementById("btnRevokeAdmin").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return alert("이메일을 입력하세요.");

  if (email === superAdminEmail) return alert("슈퍼 관리자의 권한은 해제할 수 없습니다.");

  if (!confirm(`${email} 님의 관리자 권한을 회수하시겠습니까?`)) return;

  try {
    // 1. 이메일로 유저 찾기
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return alert("가입되지 않은 이메일입니다.");
    }

    // 2. 권한 회수 (role: "user"로 변경)
    const updates = [];
    querySnapshot.forEach((docSnap) => {
        updates.push(updateDoc(doc(db, "users", docSnap.id), { role: "user" }));
    });

    await Promise.all(updates);

    alert(`[${email}] 님의 관리자 권한을 회수했습니다.`);
    document.getElementById("emailInput").value = ""; 
    await loadUsers();

  } catch (err) {
    console.error("권한 회수 오류:", err);
    alert("권한 회수 중 오류가 발생했습니다.");
  }
});

// ================================
// 🔄 목록 새로고침
// ================================
document.getElementById("btnRefreshUsers").addEventListener("click", loadUsers);