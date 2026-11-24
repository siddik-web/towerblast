import * as THREE from 'three';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    this.isMobile = isMobile;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.2,
      360
    );

    this.scene.fog = new THREE.FogExp2(0x9bd7ff, 0.0058);

    this._onResize = this.handleResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this.handleResize();
  }

  handleResize() {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    const aspect = w / h;

    this.camera.aspect = aspect;
    // Widen FOV gracefully on narrow portrait mobile screens so tower + cannon remain clearly framed
    this.camera.fov = aspect < 0.85 ? 60 : aspect < 1.15 ? 54 : 47;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  setShadowsEnabled(enabled) {
    this.renderer.shadowMap.enabled = enabled;
    this.renderer.shadowMap.needsUpdate = true;
  }

  setFogColor(hex, density = 0.0056) {
    this.scene.fog.color.setHex(hex);
    this.scene.fog.density = density;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
