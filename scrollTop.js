// ========================================
// ⬆️ Scroll to Top Button (Tokyo Day Bright)
// Design: Sharp Square, Navy/White, Typography
// Position: Left Side, Mobile Optimized
// ========================================

// 1. 스타일 주입 (반응형 처리를 위해 style 태그 사용)
const style = document.createElement('style');
style.textContent = `
  #scrollTopBtn {
    position: fixed;
    bottom: 40px;
    left: 40px; /* 👈 위치를 왼쪽으로 변경 */
    z-index: 9999;
    width: 44px;
    height: 44px;
    padding: 0;
    
    font-size: 12px;
    font-weight: 800;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.05em;
    
    background-color: #FFFFFF;
    color: #2C3E50;
    border: 1px solid #2C3E50;
    border-radius: 0px; /* 📐 직각 모서리 유지 */
    
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
    display: none; /* 초기 숨김 */
    justify-content: center;
    align-items: center;
  }

  /* 호버 효과 (데스크탑) */
  @media (hover: hover) {
    #scrollTopBtn:hover {
      background-color: #2C3E50;
      color: #FFFFFF;
      border-color: #2C3E50;
    }
  }

  /* 📱 모바일 최적화 */
  @media (max-width: 768px) {
    #scrollTopBtn {
      bottom: 20px; /* 하단 여백 축소 */
      left: 20px;   /* 좌측 여백 축소 */
      width: 40px;  /* 크기 약간 축소 */
      height: 40px;
      font-size: 11px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15); /* 그림자 조정 */
    }
  }
`;
document.head.appendChild(style);

// 2. 버튼 생성
const scrollBtn = document.createElement("button");
scrollBtn.id = "scrollTopBtn";
scrollBtn.textContent = "TOP"; // 텍스트 유지

document.body.appendChild(scrollBtn);

// 3. 스크롤 감지 로직
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    if (scrollBtn.style.display !== "flex") {
      scrollBtn.style.display = "flex";
      // 레이아웃 배치 후 애니메이션 적용
      requestAnimationFrame(() => {
        scrollBtn.style.opacity = "1";
        scrollBtn.style.transform = "translateY(0)";
      });
    }
  } else {
    scrollBtn.style.opacity = "0";
    scrollBtn.style.transform = "translateY(10px)";
    // 페이드 아웃 효과 후 display: none 처리
    setTimeout(() => {
      if (window.scrollY <= 300) {
        scrollBtn.style.display = "none";
      }
    }, 300);
  }
});

// 4. 클릭 이벤트 (Smooth Scroll)
scrollBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});