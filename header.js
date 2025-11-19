// ========================================
// 🧭 HARU Header Controller
// Super Admin + Firestore Admin + 이름 미기입 제한 + 자동 이동
// ========================================

import { auth, db } from "./storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function initHeaderMenu() {
  console.log("✅ HARU Header initialized");

  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".menu-list");

  // 📌 메뉴 토글
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
      // ⭐⭐ 중요: 유저 정보 즉시 리로드하여 displayName 지연 버그 제거
      await user.reload();

      // Firestore users 컬렉션 불러오기
      const userRef = doc(db, "users", user.email);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // 최신 displayName 반영됨
      const userName = userData.name || user.displayName || "";

      // 현재 페이지가 내정보 페이지인지 체크
      const isProfilePage = location.href.includes("profile.html");

      // 🔥 profile.html에서는 제한 OFF
      if (isProfilePage) {
        console.log("ℹ️ profile.html → 이름 없어도 제한 없음");
        return;
      }

      // ========================================
      // ⚠️ 이름 누락 → 강제 이동
      // ========================================
      if (!userName || userName === "(이름 없음)") {
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

      // ========================================
      // 👑 슈퍼관리자 권한
      // ========================================
      if (user.email === superAdminEmail) {
        superAdminTabs.forEach((el) => (el.style.display = "block"));
        if (adminTab) adminTab.style.display = "block";
        return;
      }

      // ========================================
      // 👮 일반 관리자 Firestore roles 체크
      // ========================================
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
}
