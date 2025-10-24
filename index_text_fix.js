// Runtime text normalization for index.html (Korean)
window.addEventListener('DOMContentLoaded', () => {
  try {
    // Title
    document.title = 'HARU 운영 관리 시스템';

    // Meta description
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name','description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content','린넨, 시설 유지보수, 분실물, 주문, 근무기록을 통합 관리합니다.');

    // Hero
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = 'HARU 운영 관리 시스템';
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = '린넨, 시설 유지보수, 분실물, 주문, 근무기록을 효율적으로 통합 관리하세요.';

    // CTA buttons
    const btnStart = document.querySelector('[data-testid="button-get-started"]');
    if (btnStart) btnStart.textContent = '시작하기';
    const btnDash = document.querySelector('[data-testid="button-dashboard"]');
    if (btnDash) btnDash.textContent = '대시보드';

    // Features
    function setFeature(id, title, desc){
      const card = document.querySelector(`[data-testid="${id}"]`);
      if (!card) return;
      const h3 = card.querySelector('.feature-title');
      const p = card.querySelector('.feature-desc');
      if (h3) h3.textContent = title;
      if (p) p.textContent = desc;
    }

    setFeature('feature-linen','린넨 관리','입고/재고/출고 흐름을 한눈에 관리');
    setFeature('feature-maintenance','시설 유지보수','객실 설비 점검과 수리 요청을 체계적으로 처리');
    setFeature('feature-lost-items','분실물 관리','분실물 등록과 인수인계 이력 관리');
    setFeature('feature-orders','발주 관리','소모품 발주와 승인 내역을 효율적으로 관리');
    setFeature('feature-worklog','근무기록','근무시간과 작업 내역 기록');
    setFeature('feature-notices','공지사항','업무 공지와 주요 알림 전달');
  } catch (e) {
    console.error('[index_text_fix] failed to normalize text', e);
  }
});
