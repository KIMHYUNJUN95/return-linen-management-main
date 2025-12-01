// ========================================
// 🔐 HARU Auth Guard (페이지 보호)
// ========================================

// ✅ [수정됨] storage.js에서 auth 가져오기 (중복 초기화 방지)
import { auth } from "./storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ✅ 로그인 상태 자동 감시 및 페이지 이동 제어 */
onAuthStateChanged(auth, (user) => {
  const path = location.pathname;
  
  // 1. 로그인 상태일 때
  if (user) {
    // 로그인/회원가입/메인 페이지 접근 시 -> 게시판으로 납치
    if (path.includes("signup.html") || path.includes("index.html") || path === "/" || path.endsWith("/")) {
      location.href = "board.html";
    }
  } 
  // 2. 비로그인 상태일 때
  else {
    // 공개 페이지 목록
    const publicPages = ["signup.html", "index.html"];
    
    // 현재 페이지가 공개 페이지인지, 아니면 루트 경로('/')인지 확인
    const isPublic = publicPages.some(p => path.includes(p)) || path === "/" || path.endsWith("/");
    
    // 공개 페이지가 아니라면 (업무 페이지라면) -> 로그인 페이지로 쫓아냄
    if (!isPublic) {
      // alert("로그인이 필요합니다."); // 필요 시 주석 해제 (너무 자주 뜨면 불편함)
      location.href = "signup.html";
    }
  }
});

export { auth };