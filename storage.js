// ==========================================
// 🚀 Firebase 초기 설정 파일 (안전 모드)
// ==========================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// 1️⃣ HTML에서 설정을 가져오거나, 없으면 아래 하드코딩된 값을 사용
const configFromHTML = typeof window !== 'undefined' && window.__firebase_config 
  ? JSON.parse(window.__firebase_config) 
  : null;

// ✅ Firebase 설정
const firebaseConfig = configFromHTML || {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  // 🚨 [수정 완료] 없는 주소(appspot.com)를 지우고, 실제 존재하는 주소로 변경했습니다.
  storageBucket: "return-linen-management.firebasestorage.app", 
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// ✅ Firebase 초기화 (중복 방지 로직 적용)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ✅ Firestore & Storage & Auth
const db = getFirestore(app);
const storage = getStorage(app); // 이제 올바른 버킷(firebasestorage.app)을 바라봅니다.
const auth = getAuth(app);

// ✅ Analytics (선택)
const analytics = getAnalytics(app);

export { db, storage, auth };