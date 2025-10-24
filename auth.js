// ========================================
// 🔐 HARU Auth Guard (페이지 보호)
// ========================================

import { auth } from "./storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ✅ 로그인 상태 자동 감시 및 페이지 이동 제어 */
onAuthStateChanged(auth, (user) => {
  const path = location.pathname;
  
  if (user) {
    // 로그인 상태에서 로그인/랜딩 페이지 접근 시 게시판으로
    if (path.includes("signup.html") || path.endsWith("/") || path.includes("index.html")) {
      location.href = "board.html";
    }
  } else {
    // 비로그인 상태에서 보호 페이지 접근 시 로그인으로
    const publicPages = ["signup.html", "index.html"];
    const isPublic = publicPages.some(p => path.includes(p));
    
    if (!isPublic) {
      location.href = "signup.html";
    }
  }
});

export { auth };
