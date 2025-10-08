// ✅ Firebase 모듈을 CDN에서 직접 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.appspot.com", // ✅ 수정 완료
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// ✅ 초기화
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ 로그인
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("로그인 성공!");
      if (email.includes("admin")) location.href = "admin_dashboard.html";
      else location.href = "return_form.html";
    } catch (err) {
      alert("로그인 실패: " + err.message);
    }
  });
}

// ✅ 회원가입
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("회원가입 성공! 로그인 해주세요.");
      location.href = "signup.html";
    } catch (err) {
      alert("회원가입 실패: " + err.message);
    }
  });
}

// ✅ 로그아웃
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
    alert("로그아웃 되었습니다.");
    location.href = "signup.html";
  });
}