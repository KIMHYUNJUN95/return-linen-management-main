// ==============================
// 🚀 Firebase 초기 설정 파일 (통합 버전)
// ==============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// 1️⃣ HTML에서 설정을 가져오거나, 없으면 아래 하드코딩된 값을 사용
const configFromHTML = typeof window !== 'undefined' && window.__firebase_config 
  ? JSON.parse(window.__firebase_config) 
  : null;

// ✅ Firebase 설정
// ★★ storageBucket 주소를 정상 주소로 수정 ★★
const firebaseConfig = configFromHTML || {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.appspot.com",  // 🔥 FIXED
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// ✅ Firebase 초기화
const app = initializeApp(firebaseConfig);

// ✅ Firestore
const db = getFirestore(app);

// ✅ Storage
// ★★ 잘못된 firebasestorage.app → appspot.com 으로 수정 ★★
const storage = getStorage(app, "gs://return-linen-management.appspot.com");

// ✅ Auth
const auth = getAuth(app);

// ✅ Analytics (선택)
const analytics = getAnalytics(app);

// ✅ 내보내기
export { db, storage, auth };
