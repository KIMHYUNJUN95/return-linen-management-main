// ========================================
// 👤 HARU Profile (내 정보)
// ========================================

import { auth } from "./storage.js";
import {
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  deleteUser,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const form = document.getElementById("updateProfileForm");
const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const displayNameEl = document.getElementById("displayName");
const joinDateEl = document.getElementById("joinDate");
const lastLoginEl = document.getElementById("lastLogin");
const emailVerifiedEl = document.getElementById("emailVerified");
const avatarIcon = document.getElementById("avatarIcon");

// 날짜 포맷
function formatDate(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// 사용자 정보 로드
onAuthStateChanged(auth, (user) => {
  if (user) {
    const name = user.displayName || "익명 사용자";
    const email = user.email || "";

    userNameEl.textContent = name;
    userEmailEl.textContent = email;
    displayNameEl.value = user.displayName || "";
    joinDateEl.textContent = formatDate(user.metadata.creationTime);
    lastLoginEl.textContent = formatDate(user.metadata.lastSignInTime);
    
    emailVerifiedEl.innerHTML = user.emailVerified
      ? '<span class="badge badge-success">인증됨</span>'
      : '<span class="badge badge-warning">미인증</span>';

    // 아바타 아이콘 (이름 첫 글자)
    avatarIcon.textContent = name.charAt(0).toUpperCase();
  } else {
    location.href = "signup.html";
  }
});

// 프로필 업데이트
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newName = displayNameEl.value.trim();

  if (!newName) {
    alert("이름을 입력해주세요.");
    return;
  }

  try {
    await updateProfile(auth.currentUser, {
      displayName: newName
    });

    alert("✅ 프로필이 업데이트되었습니다!");
    location.reload();
  } catch (err) {
    console.error("❌ 프로필 업데이트 오류:", err);
    alert("프로필 업데이트 중 오류가 발생했습니다.");
  }
});

// 비밀번호 변경
window.changePassword = async () => {
  const email = auth.currentUser?.email;
  
  if (!email) {
    alert("이메일 정보를 찾을 수 없습니다.");
    return;
  }

  if (!confirm(`${email}로 비밀번호 재설정 이메일을 보내시겠습니까?`)) {
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("✅ 비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.");
  } catch (err) {
    console.error("❌ 비밀번호 재설정 오류:", err);
    alert("비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.");
  }
};

// 계정 삭제
window.deleteAccount = async () => {
  if (!confirm("⚠️ 정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
    return;
  }

  if (!confirm("⚠️ 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?")) {
    return;
  }

  try {
    await deleteUser(auth.currentUser);
    alert("계정이 삭제되었습니다.");
    location.href = "signup.html";
  } catch (err) {
    console.error("❌ 계정 삭제 오류:", err);
    
    if (err.code === "auth/requires-recent-login") {
      alert("❌ 보안을 위해 다시 로그인이 필요합니다. 로그아웃 후 다시 로그인해주세요.");
    } else {
      alert("계정 삭제 중 오류가 발생했습니다.");
    }
  }
};
