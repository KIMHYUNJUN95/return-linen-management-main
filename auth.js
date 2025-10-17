/* ✅ Firebase SDK import */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* ✅ Firebase 기본 설정 (본인 프로젝트 설정값으로 교체 가능) */
const firebaseConfig = {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.firebasestorage.app",
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830"
};

/* ✅ Firebase 초기화 */
const app = initializeApp(firebaseConfig);

/* ✅ 서비스 내보내기 */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* ✅ 로그인 상태 자동 감시 및 페이지 이동 제어 */
onAuthStateChanged(auth, (user) => {
  const path = location.pathname;

  if (user) {
    // 로그인 상태에서 로그인/랜딩이면 게시판으로
    if (path.includes("signup.html") || path.endsWith("/") || path.includes("index.html")) {
      location.href = "board.html";
    }
  } else {
    // 비로그인 상태에서 보호 페이지 접근 시 로그인으로
    const publicPages = ["signup.html", "index.html"];
    const isPublic = publicPages.some(p => path.includes(p));
    if (!isPublic) location.href = "signup.html";
  }
});