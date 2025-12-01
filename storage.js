// ==============================
// 🚀 Firebase 초기 설정 파일 (안전 모드)
// ==============================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// ❌ [삭제됨] Messaging 모듈 제거 (카카오톡 인앱 브라우저 충돌 방지)
// import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// 1️⃣ HTML에서 설정을 가져오거나, 없으면 아래 하드코딩된 값을 사용
const configFromHTML = typeof window !== 'undefined' && window.__firebase_config 
  ? JSON.parse(window.__firebase_config) 
  : null;

// ✅ Firebase 설정
const firebaseConfig = configFromHTML || {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.appspot.com", 
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// ✅ Firebase 초기화 (중복 방지 로직 적용)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ✅ Firestore & Storage & Auth
const db = getFirestore(app);
const storage = getStorage(app); // 버켓 주소 자동 감지
const auth = getAuth(app);

// ✅ Analytics (선택)
const analytics = getAnalytics(app);

// ❌ [삭제됨] messaging 내보내기 제거
export { db, storage, auth };