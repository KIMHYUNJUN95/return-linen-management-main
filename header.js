// ========================================
// 🧭 HARU Header Controller (Tokyo Modern)
// Super Admin + Firestore Admin + Name Check
// + PWA Install Controller Integrated
// ========================================

// ✅ storage.js에서 통합된 객체 가져오기
import { auth, db } from "./storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function initHeaderMenu() {
  console.log("✅ HARU Header (Tokyo Modern) initialized");

  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".menu-list");

  // 📌 1. 메뉴 토글 (CSS Hamburger Animation과 연동됨)
  if (menuToggle && navMenu) {
    // 기존 이벤트 리스너 제거를 위한 클론 (중복 실행 방지)
    const newToggle = menuToggle.cloneNode(true);
    menuToggle.parentNode.replaceChild(newToggle, menuToggle);

    newToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.toggle("open");
      newToggle.setAttribute("aria-expanded", isOpen);
    });

    document.addEventListener("click", (e) => {
      if (!navMenu.contains(e.target) && !newToggle.contains(e.target)) {
        navMenu.classList.remove("open");
        newToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // 📌 2. 로그아웃 버튼 등록
  function attachLogoutEvent() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) {
      // 헤더가 비동기로 로드될 경우를 대비해 재시도
      setTimeout(attachLogoutEvent, 300);
      return;
    }

    // 버튼 복제하여 기존 이벤트 제거
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

    newLogoutBtn.addEventListener("click", async () => {
      if (!confirm("로그아웃 하시겠습니까?")) return;
      try {
        await signOut(auth);
        alert("로그아웃 완료되었습니다.");
        // 🛑 [수정됨] 메인 페이지(index.html)로 이동
        window.location.href = "index.html";
      } catch (err) {
        console.error("❌ 로그아웃 오류:", err);
        alert("로그아웃 중 문제가 발생했습니다.");
      }
    });
  }

  attachLogoutEvent();

  // ========================================
  // 👤 3. 로그인 후 권한 + 이름 체크
  // ========================================
  onAuthStateChanged(auth, async (user) => {
    const adminTab = document.querySelector(".admin-only");
    const superAdminTabs = document.querySelectorAll(".super-admin-only");
    const menuItems = document.querySelectorAll("a, button, .menu-item, .nav-link, .btn");

    if (!user) return; // 비로그인은 guard.js가 처리

    const superAdminEmail = "rlaguswns95@haru-tokyo.com";

    try {
      // 최신 정보 동기화
      // await user.reload(); // 상황에 따라 생략 가능 (무한 로딩 방지)

      // 🔥 users 문서는 uid 기반 (DB 통일성 유지)
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const userName = userData.name || user.displayName || "";
      const userRole = userData.role || "user"; // role 필드 확인

      const isProfilePage = location.href.includes("profile.html");

      // ⚠️ 이름 미등록 시 제한 (프로필 페이지 제외)
      if (!isProfilePage && (!userName || userName === "(이름 없음)")) {
        alert("⚠️ 이름이 등록되지 않아 메뉴 사용이 제한됩니다.\n지금 내 정보 페이지로 이동합니다.");

        menuItems.forEach((el) => {
          // 로그아웃 버튼은 살려둠
          if (!el.id?.includes("logout")) {
            el.style.pointerEvents = "none";
            el.style.opacity = "0.4";
          }
        });

        location.href = "profile.html";
        return;
      }

      // 👑 슈퍼관리자 (이메일 체크)
      if (user.email === superAdminEmail) {
        superAdminTabs.forEach((el) => (el.style.display = "block"));
        if (adminTab) adminTab.style.display = "block";
      } 
      // 👮 일반 관리자 (DB role 체크 - 수정됨)
      else if (userRole === "admin") {
        // 일반 관리자에게 보여줄 메뉴가 있다면 여기서 처리
        if (adminTab) adminTab.style.display = "block";
        
        // 필요 시 super-admin-only 메뉴도 보여줄지 결정 (현재는 슈퍼관리자 전용으로 유지)
        // superAdminTabs.forEach((el) => (el.style.display = "block")); 
      }

    } catch (err) {
      console.error("❌ 관리자/이름 확인 오류:", err);
    }
  });

  // ========================================
  // 📲 4. PWA Install Button Logic
  // ========================================

  let deferredPrompt = null;

  // 헤더에 있는 설치 버튼 가져오기
  const installBtn = document.getElementById("installHaruBtn");

  if (installBtn) installBtn.style.display = "none"; // 기본 숨김

  // PWA 설치 이벤트 감지
  window.addEventListener("beforeinstallprompt", (e) => {
    console.log("📲 beforeinstallprompt fired");
    e.preventDefault(); // 자동 배너 막기
    deferredPrompt = e;

    if (installBtn) installBtn.style.display = "block"; // 버튼 표시 (또는 list-item이면 list-item)
  });

  // 버튼 클릭 → 설치 실행
  if (installBtn) {
    // a태그일 경우 href 방지
    installBtn.setAttribute("href", "javascript:void(0)");
    
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