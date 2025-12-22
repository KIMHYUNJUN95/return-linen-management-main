// ========================================
// 🚀 PWA 초기화 스크립트
// Service Worker 등록 및 설치 프롬프트 관리
// ========================================

// Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ [PWA] Service Worker registered:', registration.scope);

        // 업데이트 체크
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 [PWA] New Service Worker found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 새 버전 available
              console.log('🆕 [PWA] New version available. Please refresh.');

              // 자동 업데이트 (선택적)
              if (confirm('새로운 버전이 있습니다. 업데이트하시겠습니까?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ [PWA] Service Worker registration failed:', error);
      });
  });
}

// 설치 프롬프트 처리
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 [PWA] Install prompt triggered');

  // 기본 프롬프트 방지
  e.preventDefault();

  // 나중에 사용하기 위해 저장
  deferredPrompt = e;

  // 설치 버튼 표시 (선택적)
  showInstallButton();
});

// 설치 버튼 표시 함수 (선택적으로 구현)
function showInstallButton() {
  const installButton = document.getElementById('pwa-install-button');

  if (installButton) {
    installButton.style.display = 'block';

    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) {
        return;
      }

      // 설치 프롬프트 표시
      deferredPrompt.prompt();

      // 사용자 선택 결과 대기
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`📱 [PWA] User response: ${outcome}`);

      // 프롬프트 재사용 불가
      deferredPrompt = null;
      installButton.style.display = 'none';
    });
  }
}

// 설치 완료 이벤트
window.addEventListener('appinstalled', () => {
  console.log('✅ [PWA] App installed successfully');
  deferredPrompt = null;
});

// iOS Standalone 모드 감지
if (window.navigator.standalone === true) {
  console.log('📱 [PWA] Running in iOS standalone mode');
}

// Android Standalone 모드 감지
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('📱 [PWA] Running in standalone mode');
}

// 온라인/오프라인 상태 감지
window.addEventListener('online', () => {
  console.log('🌐 [PWA] Back online');
  const offlineIndicator = document.getElementById('offline-indicator');
  if (offlineIndicator) {
    offlineIndicator.style.display = 'none';
  }
});

window.addEventListener('offline', () => {
  console.log('📡 [PWA] Offline mode');
  const offlineIndicator = document.getElementById('offline-indicator');
  if (offlineIndicator) {
    offlineIndicator.style.display = 'block';
  }
});
