// ========================================
// 👤 HARU Profile Logic (Tokyo Day Bright)
// ========================================

import { initHeaderMenu } from "./header.js";
import { auth, db } from "./storage.js";
import {
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 1. 헤더 로드
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

// DOM 요소 참조
const form = document.getElementById("updateProfileForm");
const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const displayNameEl = document.getElementById("displayName");
const joinDateEl = document.getElementById("joinDate");
const lastLoginEl = document.getElementById("lastLogin");
const emailVerifiedEl = document.getElementById("emailVerified");
const avatarIcon = document.getElementById("avatarIcon");

// 🧮 날짜 포맷
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

// 👤 사용자 정보 로드
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "signup.html";
    return;
  }

  const uid = user.uid;        // 🔥 uid 기반으로 변경
  const email = user.email;

  const userDoc = doc(db, "users", uid);   // 🔥 email → uid 변경
  
  try {
    const snap = await getDoc(userDoc);
    const userData = snap.exists() ? snap.data() : {};

    const name = user.displayName || userData.name || "익명 사용자";

    // UI 업데이트
    userNameEl.textContent = name;
    userEmailEl.textContent = email;
    displayNameEl.value = name;

    joinDateEl.textContent = formatDate(user.metadata.creationTime);
    lastLoginEl.textContent = formatDate(user.metadata.lastSignInTime);

    emailVerifiedEl.innerHTML = user.emailVerified
      ? '<span class="badge badge-success">인증됨</span>'
      : '<span class="badge badge-glass">미인증</span>';

    avatarIcon.textContent = name.charAt(0).toUpperCase();

  } catch (error) {
    console.error("사용자 정보 로드 실패:", error);
  }
});

// 💾 프로필 업데이트
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newName = displayNameEl.value.trim();
    const user = auth.currentUser;

    if (!newName) {
      alert("이름을 입력해주세요.");
      return;
    }

    try {
      // 1) Firebase Auth 업데이트
      await updateProfile(user, { displayName: newName });

      // 2) Firestore 데이터 업데이트 (uid 기준)
      await setDoc(
        doc(db, "users", user.uid),   // 🔥 email → uid 변경
        {
          uid: user.uid,             // 🔥 rules 통과 필수
          email: user.email,
          name: newName
        },
        { merge: true }
      );

      alert("프로필이 성공적으로 업데이트되었습니다.");
      location.reload();

    } catch (err) {
      console.error("프로필 업데이트 오류:", err);
      alert("업데이트 중 오류가 발생했습니다.");
    }
  });
}

// 🔑 비밀번호 변경
window.changePassword = async () => {
  const email = auth.currentUser?.email;

  if (!email) {
    alert("사용자 정보를 찾을 수 없습니다.");
    return;
  }

  if (!confirm(`${email} 주소로 비밀번호 재설정 메일을 보내시겠습니까?`)) {
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("비밀번호 재설정 이메일이 발송되었습니다.\n메일함을 확인해주세요.");
  } catch (err) {
    console.error("비밀번호 재설정 오류:", err);
    alert("이메일 발송 중 오류가 발생했습니다.");
  }
};

// 🗑 계정 삭제
window.deleteAccount = async () => {
  if (!confirm("정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;
  if (!confirm("모든 데이터가 영구적으로 삭제됩니다.\n진행하시겠습니까?")) return;

  try {
    await deleteUser(auth.currentUser);
    alert("계정이 삭제되었습니다.");
    location.href = "signup.html";
  } catch (err) {
    console.error("계정 삭제 오류:", err);

    if (err.code === "auth/requires-recent-login") {
      alert("보안을 위해 로그아웃 후 다시 로그인하여 시도해주세요.");
    } else {
      alert("계정 삭제 중 오류가 발생했습니다.");
    }
  }
};
