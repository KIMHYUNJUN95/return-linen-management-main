// ========================================
// 🧭 HARU Header Controller (Tokyo Modern)
// Super Admin + Firestore Admin + Name Check
// + PWA Install Controller 추가됨
// ========================================

import { auth, db } from "./storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function initHeaderMenu() {
  console.log("✅ HARU Header (Tokyo Modern) initialized");

  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".menu-list");

  // 📌 메뉴 토글 (CSS Hamburger Animation과 연동됨)
  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen);
    });

    document.addEventListener("click", (e) => {
      if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // 📌 로그아웃 버튼 등록
  function attachLogoutEvent() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) {
      setTimeout(attachLogoutEvent, 300);
      return;
    }

    logoutBtn.addEventListener("click", async () => {
      if (!confirm("로그아웃 하시겠습니까?")) return;
      try {
        await signOut(auth);
        alert("로그아웃 완료되었습니다.");
        location.href = "signup.html";
      } catch (err) {
        console.error("❌ 로그아웃 오류:", err);
        alert("로그아웃 중 문제가 발생했습니다.");
      }
    });
  }

  attachLogoutEvent();

  // ========================================
  // 👤 로그인 후 권한 + 이름 체크
  // ========================================
  onAuthStateChanged(auth, async (user) => {
    const adminTab = document.querySelector(".admin-only");
    const superAdminTabs = document.querySelectorAll(".super-admin-only");
    const menuItems = document.querySelectorAll("a, button, .menu-item, .nav-link, .btn");

    if (!user) return;

    const superAdminEmail = "rlaguswns95@haru-tokyo.com";

    try {
      await user.reload();

      // 🔥 users 문서는 uid 기반
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const userName = userData.name || user.displayName || "";

      const isProfilePage = location.href.includes("profile.html");

      if (!isProfilePage && (!userName || userName === "(이름 없음)")) {
        alert("⚠️ 이름이 등록되지 않아 메뉴 사용이 제한됩니다.\n지금 내 정보 페이지로 이동합니다.");

        menuItems.forEach((el) => {
          if (!el.id?.includes("logout")) {
            el.style.pointerEvents = "none";
            el.style.opacity = "0.4";
          }
        });

        location.href = "profile.html";
        return;
      }

      // 👑 슈퍼관리자
      if (user.email === superAdminEmail) {
        superAdminTabs.forEach((el) => (el.style.display = "block"));
        if (adminTab) adminTab.style.display = "block";
        return;
      }

      // 👮 일반 관리자
      const roleRef = doc(db, "roles", user.email);
      const roleSnap = await getDoc(roleRef);

      if (roleSnap.exists()) {
        const roleData = roleSnap.data();
        if (roleData.role === "admin" && adminTab) {
          adminTab.style.display = "block";
        }
      }
    } catch (err) {
      console.error("❌ 관리자/이름 확인 오류:", err);
    }
  });

  // ========================================
  // 📲 PWA Install Button Logic 추가
  // ========================================

  let deferredPrompt = null;

  // 헤더에 있는 설치 버튼 가져오기
  const installBtn = document.getElementById("installHaruBtn");

  if (installBtn) installBtn.style.display = "none"; // 기본 숨김

  // PWA 설치 이벤트
  window.addEventListener("beforeinstallprompt", (e) => {
    console.log("📲 beforeinstallprompt fired");
    e.preventDefault(); // 자동 배너 막기
    deferredPrompt = e;

    if (installBtn) installBtn.style.display = "block"; // 버튼 표시
  });

  // 버튼 클릭 → 설치 실행
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      console.log("PWA install result:", choice.outcome);

      deferredPrompt = null;
      installBtn.style.display = "none";
    });
  }
}
