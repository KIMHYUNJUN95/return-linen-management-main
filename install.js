let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBox = document.createElement("div");
  installBox.id = "installBox";
  installBox.innerHTML = `
    <div style="
      position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      background:#1e90ff;color:#fff;padding:12px 16px;border-radius:12px;
      box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:9999;
      display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <span>📲 HARU 앱을 홈 화면에 추가하시겠어요?</span>
      <button id="btnInstall" style="
        background:#fff;color:#1e90ff;border:none;
        padding:6px 12px;border-radius:8px;font-weight:700;cursor:pointer;">
        설치
      </button>
      <button id="btnLater" style="
        background:transparent;color:#fff;border:none;
        padding:6px 12px;cursor:pointer;">나중에</button>
    </div>
  `;
  document.body.appendChild(installBox);

  document.getElementById("btnInstall").addEventListener("click", async () => {
    installBox.remove();
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      console.log("✅ 설치됨");
    } else {
      console.log("❌ 설치 취소");
    }
    deferredPrompt = null;
  });

  document.getElementById("btnLater").addEventListener("click", () => {
    installBox.remove();
  });
});

window.addEventListener("appinstalled", () => {
  console.log("🎉 HARU 앱 설치 완료!");
});
