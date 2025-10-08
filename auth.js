import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* 🔐 너의 Firebase 설정값 (유지) */
const firebaseConfig = {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.firebasestorage.app",
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ✅ 브라우저 닫아도 로그인 유지 */
setPersistence(auth, browserLocalPersistence);