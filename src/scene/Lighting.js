import * as THREE from 'three';

const THEME_LIGHTING = {
  sunny: {
    hemiSky: 0x9be2ff,
    hemiGround: 0x5c7c47,
    hemiInt: 0.95,
    sunColor: 0xfff4dc,
    sunInt: 2.1,
    sunPos: [18, 28, 16],
    rimColor: 0x7ac5ff,
    rimInt: 0.55
  },
  alpine: {
    hemiSky: 0xb6ecff,
    hemiGround: 0x6c808f,
    hemiInt: 1.0,
    sunColor: 0xffffff,
    sunInt: 2.0,
    sunPos: [-16, 30, 18],
    rimColor: 0x99e0ff,
    rimInt: 0.6
  },
  golden: {
    hemiSky: 0xffd59e,
    hemiGround: 0x735b43,
    hemiInt: 0.92,
    sunColor: 0xffd185,
    sunInt: 2.25,
    sunPos: [24, 21, 12],
    rimColor: 0xff9f68,
    rimInt: 0.55
  },
  sunset: {
    hemiSky: 0xffb38a,
    hemiGround: 0x563f57,
    hemiInt: 0.88,
    sunColor: 0xff9857,
    sunInt: 2.15,
    sunPos: [-24, 17, 10],
    rimColor: 0xc084fc,
    rimInt: 0.65
  },
  twilight: {
    hemiSky: 0x8ea8ff,
    hemiGround: 0x3b3354,
    hemiInt: 0.95,
    sunColor: 0xffc69e,
    sunInt: 1.9,
    sunPos: [18, 22, 18],
    rimColor: 0x5eead4,
    rimInt: 0.72
  }
};

export class Lighting {
  constructor(scene, isMobile = false) {
    this.scene = scene;

    // Soft ambient hemisphere fill
    this.hemiLight = new THREE.HemisphereLight(0x9be2ff, 0x5c7c47, 0.95);
    this.scene.add(this.hemiLight);

    // Primary sun directional light with crisp shadows tightly fitted to gameplay arena
    this.sunLight = new THREE.DirectionalLight(0xfff4dc, 2.1);
    this.sunLight.position.set(18, 28, 16);
    this.sunLight.castShadow = true;

    const mapSize = isMobile ? 1024 : 2048;
    this.sunLight.shadow.mapSize.set(mapSize, mapSize);
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 72;
    this.sunLight.shadow.camera.left = -16;
    this.sunLight.shadow.camera.right = 16;
    this.sunLight.shadow.camera.top = 18;
    this.sunLight.shadow.camera.bottom = -14;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);

    // Secondary rim light for juicy low-poly silhouette separation
    this.rimLight = new THREE.DirectionalLight(0x7ac5ff, 0.55);
    this.rimLight.position.set(-18, 12, -16);
    this.scene.add(this.rimLight);

    // Dynamic explosion flash point light
    this.flashLight = new THREE.PointLight(0xff7b29, 0, 26, 1.6);
    this.flashLight.position.set(0, 4, 0);
    this.scene.add(this.flashLight);
    this.flashIntensity = 0;
  }

  applyTheme(themeName = 'sunny') {
    const cfg = THEME_LIGHTING[themeName] || THEME_LIGHTING.sunny;
    this.hemiLight.color.setHex(cfg.hemiSky);
    this.hemiLight.groundColor.setHex(cfg.hemiGround);
    this.hemiLight.intensity = cfg.hemiInt;

    this.sunLight.color.setHex(cfg.sunColor);
    this.sunLight.intensity = cfg.sunInt;
    this.sunLight.position.set(...cfg.sunPos);

    this.rimLight.color.setHex(cfg.rimColor);
    this.rimLight.intensity = cfg.rimInt;
  }

  triggerExplosionFlash(position, strength = 1.4) {
    this.flashLight.position.copy(position);
    this.flashLight.position.y += 0.6;
    this.flashIntensity = Math.min(35, Math.max(this.flashIntensity, strength * 16));
    this.flashLight.intensity = this.flashIntensity;
  }

  setShadowsEnabled(enabled) {
    this.sunLight.castShadow = enabled;
  }

  update(dt) {
    if (this.flashIntensity > 0.05) {
      this.flashIntensity *= Math.pow(0.015, dt);
      this.flashLight.intensity = this.flashIntensity;
    } else if (this.flashLight.intensity !== 0) {
      this.flashIntensity = 0;
      this.flashLight.intensity = 0;
    }
  }
}
