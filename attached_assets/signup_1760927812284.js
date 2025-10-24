// ✅ Firebase 인증 불러오기
import { auth } from "./auth.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ✅ 로그인 상태 확인: 이미 로그인된 사용자는 게시판으로 이동 */
onAuthStateChanged(auth, (user) => {
  if (user) location.href = "board.html";
});

/* 🔧 DOM 요소 연결 */
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const toSignup = document.getElementById("toSignup");
const toggleText = document.getElementById("toggleText");
const formTitle = document.getElementById("formTitle");

/* 🔄 로그인 ↔ 회원가입 전환 */
toSignup.onclick = () => {
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
  const email = document.getElementById("email").value.trim();
  const pw = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, pw);
    alert("✅ 로그인 성공");
    location.href = "board.html";
  } catch (err) {
    alert("❌ 로그인 실패: " + (err.message || err));
  }
});

/* 📝 회원가입 */
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pw = document.getElementById("signupPw").value;

  if (!name || !email || !pw) return alert("모든 필드를 입력하세요.");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(userCred.user, { displayName: name });
    alert("✅ 회원가입 완료! 게시판으로 이동합니다.");
    location.href = "board.html";
  } catch (err) {
    alert("❌ 회원가입 실패: " + (err.message || err));
  }
});
