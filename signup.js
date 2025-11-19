// ========================================
// 🔐 HARU Authentication (Login & Signup) - 최종 고정 버전
// ========================================

import { auth, db } from "./storage.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ========================================
   ✅ 로그인 상태 확인 (자동 이동)
   → Firestore 덮어쓰기 금지 처리 포함
======================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const userRef = doc(db, "users", user.email);
  const userSnap = await getDoc(userRef);

  // 🔥 Firestore에 기존 데이터가 있으면 덮어쓰기 금지
  if (!userSnap.exists()) {
    await setDoc(
      userRef,
      {
        email: user.email,
        name: user.displayName || "(이름 없음)",
        role: "user",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 🔥 displayName이 비어있으면 profile.html로 이동하도록 header.js가 체크함
  location.href = "board.html";
});

/* 🔧 DOM 요소 연결 */
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const toSignup = document.getElementById("toSignup");
const toggleText = document.getElementById("toggleText");
const formTitle = document.getElementById("formTitle");

/* ⚠️ 에러 메시지 추가 */
const errorBox = document.createElement("div");
errorBox.id = "authErrorBox";
errorBox.style.color = "#ef4444";
errorBox.style.fontWeight = "600";
errorBox.style.marginTop = "10px";
errorBox.style.fontSize = "14px";
errorBox.style.display = "none";
loginForm.parentNode.insertBefore(errorBox, toggleText);

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}
function clearError() {
  errorBox.textContent = "";
  errorBox.style.display = "none";
}

/* 🔄 로그인 ↔ 회원가입 전환 */
toSignup.onclick = () => {
  clearError();
  const isLoginMode = loginForm.style.display !== "none";
  loginForm.style.display = isLoginMode ? "none" : "block";
  signupForm.style.display = isLoginMode ? "block" : "none";
  formTitle.textContent = isLoginMode ? "회원가입" : "로그인";

  toggleText.innerHTML = isLoginMode
    ? `이미 계정이 있나요? <span class="toggle-link" id="toSignup">로그인</span>`
    : `계정이 없나요? <span class="toggle-link" id="toSignup">회원가입</span>`;

  document.getElementById("toSignup").onclick = toSignup.onclick;
};

/* 🔐 로그인 */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const email = document.getElementById("email").value.trim();
  const pw = document.getElementById("password").value;

  if (!email || !pw) return showError("이메일과 비밀번호를 입력해주세요.");

  try {
    await signInWithEmailAndPassword(auth, email, pw);
    alert("✅ 로그인 성공!");
  } catch (err) {
    console.error("❌ 로그인 오류:", err);
    let message = "로그인에 실패했습니다.";
    switch (err.code) {
      case "auth/user-not-found":
        message = "존재하지 않는 계정입니다.";
        break;
      case "auth/wrong-password":
        message = "비밀번호가 올바르지 않습니다.";
        break;
      case "auth/invalid-email":
        message = "이메일 형식이 올바르지 않습니다.";
        break;
      case "auth/too-many-requests":
        message = "시도가 너무 많습니다. 잠시 후 다시 시도해주세요.";
        break;
    }
    showError(message);
  }
});

/* 📝 회원가입 */
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pw = document.getElementById("signupPw").value;

  if (!name || !email || !pw) return showError("모든 필드를 입력해주세요.");
  if (pw.length < 6) return showError("비밀번호는 6자 이상이어야 합니다.");

  try {
    // 🔥 사용자 생성
    const userCred = await createUserWithEmailAndPassword(auth, email, pw);

    // 🔥 Auth displayName 저장
    await updateProfile(userCred.user, { displayName: name });

    // 🔥 필수! 사용자 정보 최신화
    await userCred.user.reload();

    // 🔥 Firestore users 저장
    await setDoc(
      doc(db, "users", email),
      {
        email,
        name,
        role: "user",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    alert("✅ 회원가입 완료!");
    location.href = "board.html";

  } catch (err) {
    console.error("❌ 회원가입 오류:", err);
    let message = "회원가입에 실패했습니다.";
    switch (err.code) {
      case "auth/email-already-in-use":
        message = "이미 사용 중인 이메일입니다.";
        break;
      case "auth/weak-password":
        message = "비밀번호가 너무 약합니다.";
        break;
      case "auth/invalid-email":
        message = "이메일 형식이 올바르지 않습니다.";
        break;
      case "auth/network-request-failed":
        message = "네트워크 오류입니다.";
        break;
    }
    showError(message);
  }
});
