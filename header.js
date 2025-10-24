// ========================================
// 🧭 HARU Header Controller (Super Admin + Firestore Admin)
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

  // 📌 로그아웃
  function attachLogoutEvent() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) {
      console.warn("⏳ 로그아웃 버튼 대기 중...");
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

  // 👑 관리자 & 슈퍼관리자 권한 체크
  onAuthStateChanged(auth, async (user) => {
    const adminTab = document.querySelector(".admin-only");
    const superAdminTabs = document.querySelectorAll(".super-admin-only");

    if (!user) return;

    const superAdminEmail = "rlaguswns95@haru-tokyo.com"; // ✅ 너 이메일 고정

    try {
      // ✅ 1. 너 이메일이면 바로 슈퍼관리자 메뉴 표시
      if (user.email === superAdminEmail) {
        superAdminTabs.forEach(el => el.style.display = "block");
        if (adminTab) adminTab.style.display = "block";
        return;
      }

      // ✅ 2. Firestore에서 관리자 여부 확인
      const roleRef = doc(db, "roles", user.email);
      const roleSnap = await getDoc(roleRef);

      if (roleSnap.exists()) {
        const data = roleSnap.data();
        if (data.role === "admin" && adminTab) {
          adminTab.style.display = "block";
        }
      }
    } catch (err) {
      console.error("❌ 관리자 권한 확인 실패:", err);
    }
  });
}
