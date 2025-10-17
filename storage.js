// ✅ Firebase SDK 불러오기
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs",
  authDomain: "return-linen-management.firebaseapp.com",
  projectId: "return-linen-management",
  storageBucket: "return-linen-management.firebasestorage.app",
  messagingSenderId: "310421638033",
  appId: "1:310421638033:web:280047bf93a8c780f8e830",
  measurementId: "G-D6BDRRKD9Y"
};

// ✅ 이미 초기화된 앱이 있으면 재사용
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Firebase 모듈들 연결
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ✅ 내보내기
export { db, auth, storage };