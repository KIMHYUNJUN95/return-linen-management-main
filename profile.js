// ========================================
// 👤 HARU Profile (내 정보)
// ========================================

import { auth, db } from "./storage.js";
import {
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  deleteUser,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "signup.html";
    return;
  }

  const email = user.email;
  const userDoc = doc(db, "users", email);
  const snap = await getDoc(userDoc);
  const userData = snap.exists() ? snap.data() : {};

  const name = user.displayName || userData.name || "익명 사용자";

  userNameEl.textContent = name;
  userEmailEl.textContent = email;
  displayNameEl.value = name;
  joinDateEl.textContent = formatDate(user.metadata.creationTime);
  lastLoginEl.textContent = formatDate(user.metadata.lastSignInTime);

  emailVerifiedEl.innerHTML = user.emailVerified
    ? '<span class="badge badge-success">인증됨</span>'
    : '<span class="badge badge-warning">미인증</span>';

  avatarIcon.textContent = name.charAt(0).toUpperCase();
});

// 프로필 업데이트
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newName = displayNameEl.value.trim();
  const email = auth.currentUser.email;

  if (!newName) {
    alert("이름을 입력해주세요.");
    return;
  }

  try {
    // 1) Firebase Auth 업데이트
    await updateProfile(auth.currentUser, { displayName: newName });

    // 2) Firestore users 컬렉션에도 업데이트
    await setDoc(
      doc(db, "users", email),
      { name: newName, email },
      { merge: true }
    );

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
    alert("✅ 비밀번호 재설정 이메일이 발송되었습니다.");
  } catch (err) {
    console.error("❌ 비밀번호 재설정 오류:", err);
    alert("비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.");
  }
};

// 계정 삭제
window.deleteAccount = async () => {
  if (!confirm("⚠️ 정말로 계정을 삭제하시겠습니까?")) return;
  if (!confirm("⚠️ 모든 데이터가 영구적으로 삭제됩니다.")) return;

  try {
    await deleteUser(auth.currentUser);
    alert("계정이 삭제되었습니다.");
    location.href = "signup.html";
  } catch (err) {
    console.error("❌ 계정 삭제 오류:", err);

    if (err.code === "auth/requires-recent-login") {
      alert("❌ 다시 로그인이 필요합니다.");
    } else {
      alert("계정 삭제 중 오류가 발생했습니다.");
    }
  }
};
