// ========================================
// 🔐 HARU Authentication (Login & Signup) - 개선버전
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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ✅ 로그인 상태 확인: 이미 로그인된 사용자는 게시판으로 이동 */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await setDoc(
      doc(db, "users", user.email),
      {
        email: user.email,
        name: user.displayName || "(이름 없음)",
        role: "user", // 기본 권한
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    location.href = "board.html";
  }
});

/* 🔧 DOM 요소 연결 */
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const toSignup = document.getElementById("toSignup");
const toggleText = document.getElementById("toggleText");
const formTitle = document.getElementById("formTitle");

/* ⚠️ 에러 메시지 표시용 DOM 추가 */
const errorBox = document.createElement("div");
errorBox.id = "authErrorBox";
errorBox.style.color = "#ef4444";
errorBox.style.fontWeight = "600";
errorBox.style.marginTop = "10px";
errorBox.style.fontSize = "14px";
errorBox.style.display = "none";
loginForm.parentNode.insertBefore(errorBox, toggleText);

/* ✨ 에러 메시지 표시/초기화 함수 */
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
    ? `이미 계정이 있나요? <span class="toggle-link" id="toSignup" data-testid="link-toggle">로그인</span>`
    : `계정이 없나요? <span class="toggle-link" id="toSignup" data-testid="link-toggle">회원가입</span>`;

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
    // Firestore 저장은 onAuthStateChanged에서 자동 처리됨
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
        message = "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.";
        break;
      default:
        message = "로그인 중 오류가 발생했습니다.";
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
    const userCred = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(userCred.user, { displayName: name });

    // Firestore 저장
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

    alert("✅ 회원가입 완료! 게시판으로 이동합니다.");
    location.href = "board.html";
  } catch (err) {
    console.error("❌ 회원가입 오류:", err);
    let message = "회원가입에 실패했습니다.";
    switch (err.code) {
      case "auth/email-already-in-use":
        message = "이미 사용 중인 이메일입니다.";
        break;
      case "auth/weak-password":
        message = "비밀번호가 너무 약합니다. (6자 이상 입력)";
        break;
      case "auth/invalid-email":
        message = "이메일 형식이 올바르지 않습니다.";
        break;
      case "auth/network-request-failed":
        message = "네트워크 오류입니다. 인터넷 연결을 확인해주세요.";
        break;
      default:
        message = "회원가입 중 오류가 발생했습니다.";
    }
    showError(message);
  }
});
