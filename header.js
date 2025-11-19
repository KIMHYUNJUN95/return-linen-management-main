// ========================================
// 🧭 HARU Header Controller (Super Admin + Firestore Admin + 이름 미기입 제한 + 자동 이동)
// ========================================

import { auth, db } from "./storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function initHeaderMenu() {
  console.log("✅ HARU Header initialized");

  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".menu-list");

  // 📌 메뉴 토글 기능
  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen);
    });

    // 📌 외부 클릭 시 닫기
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
        alert("로그아웃이 완료되었습니다.");
        location.href = "signup.html";
      } catch (err) {
        console.error("❌ 로그아웃 오류:", err);
        alert("로그아웃 중 문제가 발생했습니다.");
      }
    });
  }

  attachLogoutEvent();

  // 👑 권한 + 이름 확인
  onAuthStateChanged(auth, async (user) => {
    const adminTab = document.querySelector(".admin-only");
    const superAdminTabs = document.querySelectorAll(".super-admin-only");
    const menuItems = document.querySelectorAll("a, button, .menu-item, .nav-link, .btn");

    if (!user) return;

    const superAdminEmail = "rlaguswns95@haru-tokyo.com"; // 슈퍼관리자 계정

    try {
      // Firestore users 컬렉션에서 사용자 정보 가져오기
      const userRef = doc(db, "users", user.email);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const userName = userData.name || user.displayName || "";

      const isMyInfoPage = location.href.includes("myinfo.html") || location.href.includes("profile.html");

      // ========================================
      // 🔥 (핵심) 내정보 페이지(myinfo.html)에서는 제한을 절대 적용하지 않음
      // ========================================
      if (isMyInfoPage) {
        console.log("ℹ️ myinfo.html - 이름 없어도 기능 제한 안함");
        return; // 여기서 끝 → 모든 기능 정상작동
      }

      // ========================================
      // ⚠️ 이름 없으면 제한 + 자동 이동 (myinfo.html 제외)
      // ========================================
      if (!userName || userName === "(이름 없음)") {
        alert("⚠️ 이름이 등록되지 않아 메뉴 사용이 제한됩니다.\n지금 내 정보 페이지로 이동합니다.");

        // 메뉴 클릭 막기
        menuItems.forEach((el) => {
          if (!el.id?.includes("logout")) {
            el.style.pointerEvents = "none";
            el.style.opacity = "0.4";
          }
        });

        // 강제 이동
        if (!isMyInfoPage) {
          location.href = "myinfo.html";
        }

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
      // 👮 일반 관리자 Firestore roles 확인
      // ========================================
      const roleRef = doc(db, "roles", user.email);
      const roleSnap = await getDoc(roleRef);

      if (roleSnap.exists()) {
        const data = roleSnap.data();
        if (data.role === "admin" && adminTab) {
          adminTab.style.display = "block";
        }
      }

    } catch (err) {
      console.error("❌ 관리자/이름 확인 오류:", err);
    }
  });
}
