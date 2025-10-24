import { auth } from "./storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export function initHeaderMenu() {
  console.log("✅ header.js 실행됨");

  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".menu-list");

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      navMenu.classList.toggle("open");
    });
  }

  function attachLogoutEvent() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
      console.warn("⏳ 로그아웃 버튼 대기중...");
      setTimeout(attachLogoutEvent, 300);
      return;
    }

    logoutBtn.addEventListener("click", async () => {
      console.log("✅ 로그아웃 버튼 클릭 감지됨");
      try {
        await signOut(auth);
        alert("로그아웃 되었습니다.");
        location.href = "login.html";
      } catch (err) {
        console.error("🚨 로그아웃 오류:", err);
      }
    });
  }

  attachLogoutEvent();

  onAuthStateChanged(auth, (user) => {
    const userNameEl = document.getElementById("userName");
    if (user && userNameEl) {
      userNameEl.textContent = user.displayName || user.email || "사용자";
    }
  });
}