// ========================================
// 🌌 HARU 3D Background Scene (Three.js)
// 미래적인 움직이는 3D 객체 배경
// ========================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

class HaruScene {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.objects = [];
    this.particles = null;
    this.animationId = null;
    this.isLowPerf = false;
    
    this.init();
  }

  // 성능 감지 (저사양 폴백)
  detectPerformance() {
    // 하드웨어 동시성 체크
    const cores = navigator.hardwareConcurrency || 2;
    
    // 메모리 체크 (Chrome only)
    const memory = navigator.deviceMemory || 4;
    
    // 모바일 감지
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // 저사양 판단: 코어 4개 미만 OR 메모리 4GB 미만 OR 모바일
    this.isLowPerf = cores < 4 || memory < 4 || isMobile;
    
    console.log(`🎮 Performance Mode: ${this.isLowPerf ? 'Low (Fallback)' : 'High'}`);
  }

  init() {
    this.detectPerformance();

    // 저사양이면 간단한 그라데이션으로 대체
    if (this.isLowPerf) {
      this.createFallbackBackground();
      return;
    }

    try {
      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.createObjects();
      this.createParticles();
      this.setupLights();
      this.setupEventListeners();
      this.animate();
    } catch (error) {
      console.error('❌ Three.js 초기화 실패:', error);
      this.createFallbackBackground();
    }
  }

  createFallbackBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    // CSS gradient 폴백
    canvas.style.background = `
      linear-gradient(135deg, 
        hsl(220, 25%, 8%) 0%, 
        hsl(220, 30%, 12%) 50%, 
        hsl(200, 40%, 15%) 100%)
    `;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0e14, 10, 50);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 15;
  }

  setupRenderer() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) {
      console.error('❌ Canvas #bg-canvas not found');
      return;
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false, // 성능 최적화
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 성능 최적화
  }

  createObjects() {
    const geometries = [
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.IcosahedronGeometry(1, 0),
    ];

    const count = 12; // 객체 수 제한 (성능)

    for (let i = 0; i < count; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      
      const material = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? 0x4e9eff : 0x9d5cff,
        emissive: i % 2 === 0 ? 0x2d5a8f : 0x6a3d9a,
        emissiveIntensity: 0.3,
        shininess: 100,
        transparent: true,
        opacity: 0.6,
        wireframe: Math.random() > 0.5,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // 랜덤 위치
      mesh.position.x = (Math.random() - 0.5) * 30;
      mesh.position.y = (Math.random() - 0.5) * 30;
      mesh.position.z = (Math.random() - 0.5) * 30;

      // 랜덤 회전 속도
      mesh.userData.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01,
      };

      // 랜덤 부유 속도
      mesh.userData.floatSpeed = Math.random() * 0.5 + 0.3;
      mesh.userData.floatOffset = Math.random() * Math.PI * 2;

      this.scene.add(mesh);
      this.objects.push(mesh);
    }
  }

  createParticles() {
    const particleCount = 500; // 파티클 수 제한
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 50;
      positions[i + 1] = (Math.random() - 0.5) * 50;
      positions[i + 2] = (Math.random() - 0.5) * 50;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x4e9eff,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  setupLights() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
    this.scene.add(ambientLight);

    // Point Lights (미래적인 느낌)
    const light1 = new THREE.PointLight(0x4e9eff, 1, 50);
    light1.position.set(10, 10, 10);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0x9d5cff, 1, 50);
    light2.position.set(-10, -10, -10);
    this.scene.add(light2);
  }

  setupEventListeners() {
    // 윈도우 리사이즈
    window.addEventListener('resize', () => this.onResize());

    // 마우스 패럴랙스
    let mouseX = 0, mouseY = 0;
    
    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      
      this.camera.position.x = mouseX * 2;
      this.camera.position.y = mouseY * 2;
    });
  }

  onResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // 객체 회전 & 부유
    this.objects.forEach((obj) => {
      obj.rotation.x += obj.userData.rotationSpeed.x;
      obj.rotation.y += obj.userData.rotationSpeed.y;
      obj.rotation.z += obj.userData.rotationSpeed.z;

      obj.position.y += Math.sin(time * obj.userData.floatSpeed + obj.userData.floatOffset) * 0.01;
    });

    // 파티클 회전
    if (this.particles) {
      this.particles.rotation.y += 0.0002;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    this.objects.forEach((obj) => {
      obj.geometry.dispose();
      obj.material.dispose();
    });

    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
  }
}

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  // Canvas 없으면 생성
  if (!document.getElementById('bg-canvas')) {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);
  }

  window.haruScene = new HaruScene();
});

export default HaruScene;
