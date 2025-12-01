// ==============================
// 🚀 Firebase 초기 설정 파일 (통합 버전)
// ==============================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// 1️⃣ HTML에서 설정을 가져오거나, 없으면 아래 하드코딩된 값을 사용
const configFromHTML = typeof window !== 'undefined' && window.__firebase_config 
  ? JSON.parse(window.__firebase_config) 
  : null;

// ✅ Firebase 설정
// [중요] storageBucket은 Firebase Console -> Storage 화면에 적힌 주소와 100% 일치해야 합니다.
// 보통 '프로젝트ID.firebasestorage.app' 또는 '프로젝트ID.appspot.com' 입니다.
const firebaseConfig = configFromHTML || {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.firebasestorage.app", // 👈 여기를 확인하세요! (보통 firebasestorage.app이 기본)
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// ✅ Firebase 초기화 (중복 방지 로직 적용)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ✅ Firestore
const db = getFirestore(app);

// ✅ Storage
// 🛑 [수정됨] 하드코딩된 gs:// 주소를 제거하고, firebaseConfig의 설정을 따르도록 변경합니다.
// 이렇게 하면 설정값만 맞으면 에러가 사라집니다.
const storage = getStorage(app);

// ✅ Auth
const auth = getAuth(app);

// ✅ Messaging
const messaging = getMessaging(app);

// ✅ Analytics
const analytics = getAnalytics(app);

// ✅ 내보내기
export { db, storage, auth, messaging, getToken };