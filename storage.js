// ==============================
// 🚀 Firebase 초기 설정 파일 (수정됨)
// ==============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.appspot.com",   // ✅ 올바른 버킷명
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// ✅ Firebase 초기화
const app = initializeApp(firebaseConfig);

// ✅ Firestore
const db = getFirestore(app);

// ✅ Storage (기본 버킷 사용)
const storage = getStorage(app);

// ✅ Auth
const auth = getAuth(app);

// ✅ Analytics (선택)
const analytics = getAnalytics(app);

// ✅ 내보내기
export { db, storage, auth };
