// ========================================
// ⬆️ Scroll to Top Button (공용)
// ========================================

// 버튼 생성
const scrollBtn = document.createElement("button");
scrollBtn.id = "scrollTopBtn";
scrollBtn.innerHTML = "⬆️";
scrollBtn.style.position = "fixed";
scrollBtn.style.bottom = "20px";
scrollBtn.style.right = "20px";
scrollBtn.style.zIndex = "9999";
scrollBtn.style.padding = "12px 14px";
scrollBtn.style.fontSize = "20px";
scrollBtn.style.border = "none";
scrollBtn.style.borderRadius = "50%";
scrollBtn.style.background = "hsl(var(--color-primary))";
scrollBtn.style.color = "#fff";
scrollBtn.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
scrollBtn.style.cursor = "pointer";
scrollBtn.style.opacity = "0";
scrollBtn.style.transition = "opacity 0.3s ease";
scrollBtn.style.display = "none";

document.body.appendChild(scrollBtn);

// 스크롤 시 표시/숨김
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    scrollBtn.style.display = "block";
    scrollBtn.style.opacity = "1";
  } else {
    scrollBtn.style.opacity = "0";
    setTimeout(() => {
      if (window.scrollY <= 300) scrollBtn.style.display = "none";
    }, 300);
  }
});

// 클릭 시 부드럽게 스크롤 맨 위로
scrollBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
