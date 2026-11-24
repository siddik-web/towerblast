import * as THREE from 'three';

const SKY_THEMES = {
  sunny: { top: 0x2085e6, mid: 0x73c8ff, horizon: 0xffe8c2, fog: 0x99d6ff, sun: 0xfff8d6 },
  alpine: { top: 0x1b6bc2, mid: 0x6fb8f2, horizon: 0xdff4ff, fog: 0xb6e3ff, sun: 0xffffff },
  golden: { top: 0x3b6cb8, mid: 0xdf9b6d, horizon: 0xffdca3, fog: 0xf4c794, sun: 0xffe29a },
  sunset: { top: 0x2c2b6b, mid: 0xc95f75, horizon: 0xffb36b, fog: 0xe6957a, sun: 0xffa054 },
  twilight: { top: 0x161d4a, mid: 0x414a8a, horizon: 0x9b72aa, fog: 0x5a578f, sun: 0xffcc99 }
};

export class Environment {
  constructor(scene, sceneManager) {
    this.scene = scene;
    this.sceneManager = sceneManager;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.clouds = [];
    this.waterMesh = null;
    this.time = 0;

    this._createSkyDome();
    this._createArenaIsland();
    this._createCannonPlatform();
    this._createWater();
    this._createDistantMountains();
    this._createInstancedTrees();
    this._createClouds();
  }

  _createSkyDome() {
    const geo = new THREE.SphereGeometry(220, 28, 18);
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color(SKY_THEMES.sunny.top) },
      uMidColor: { value: new THREE.Color(SKY_THEMES.sunny.mid) },
      uHorizonColor: { value: new THREE.Color(SKY_THEMES.sunny.horizon) },
      uSunDir: { value: new THREE.Vector3(0.45, 0.55, -0.68).normalize() },
      uSunColor: { value: new THREE.Color(SKY_THEMES.sunny.sun) }
    };

    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vWorldDir;
        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.36, h));
          col = mix(col, uTopColor, smoothstep(0.32, 0.9, h));
          float sunAmt = max(dot(dir, uSunDir), 0.0);
          col += uSunColor * pow(sunAmt, 24.0) * 0.45;
          col += uSunColor * smoothstep(0.996, 0.999, sunAmt) * 0.85;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    this.skyDome = new THREE.Mesh(geo, mat);
    this.group.add(this.skyDome);
  }

  _createArenaIsland() {
    // 1. Stone tower pedestal (top surface strictly at y = 0 matching PhysicsWorld)
    const pedestalGeo = new THREE.CylinderGeometry(7.2, 7.6, 1.25, 16);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xd8d3c8,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, -0.625, 0);
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    this.group.add(pedestal);

    // Decorative stone rim trim around pedestal edge
    const rimGeo = new THREE.TorusGeometry(7.2, 0.22, 6, 16);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x9aa4b2,
      roughness: 0.8,
      flatShading: true
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.08;
    rim.receiveShadow = true;
    this.group.add(rim);

    // Subtle painted courtyard rings on top of pedestal (y = 0.008)
    const ringColors = [0xc2bcb0, 0xb5aea0];
    [5.8, 3.6].forEach((r, idx) => {
      const rGeo = new THREE.RingGeometry(r - 0.14, r, 32);
      const rMat = new THREE.MeshStandardMaterial({
        color: ringColors[idx],
        roughness: 0.92,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.008;
      ring.receiveShadow = true;
      this.group.add(ring);
    });

    // 2. Outer lush grassy island (top surface strictly at y = -1.25 matching PhysicsWorld)
    const grassGeo = new THREE.CylinderGeometry(14.2, 13.4, 1.6, 18);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x5ab851,
      roughness: 0.9,
      flatShading: true
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.set(0, -2.05, 0);
    grass.receiveShadow = true;
    this.group.add(grass);

    // Tapered rocky cliff base under the island
    const cliffGeo = new THREE.CylinderGeometry(13.2, 7.5, 9.5, 14);
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x7d6b5d,
      roughness: 0.94,
      flatShading: true
    });
    const cliff = new THREE.Mesh(cliffGeo, cliffMat);
    cliff.position.set(0, -7.6, 0);
    this.group.add(cliff);

    // Decorative low-poly grass tufts / boulders around the outer ring
    const rockGeo = new THREE.DodecahedronGeometry(0.65, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x89929c,
      roughness: 0.9,
      flatShading: true
    });
    const rockAngles = [0.4, 1.15, 2.2, 2.85, 3.85, 4.9, 5.65];
    for (const a of rockAngles) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const rad = 11.2 + (Math.sin(a * 7) * 0.5 + 0.5) * 1.4;
      rock.position.set(Math.cos(a) * rad, -1.08, Math.sin(a) * rad);
      rock.scale.set(0.8 + (a % 0.6), 0.55 + (a % 0.4), 0.8 + (a % 0.5));
      rock.rotation.set(a, a * 1.7, 0);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
    }
  }

  _createCannonPlatform() {
    // Elevated wooden firing deck at z = 16.5 for the cannon
    const deckGroup = new THREE.Group();
    deckGroup.position.set(0, -0.25, 16.5);

    const baseGeo = new THREE.CylinderGeometry(3.4, 3.8, 1.6, 10);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x7f6f5e,
      roughness: 0.9,
      flatShading: true
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.8;
    base.receiveShadow = true;
    deckGroup.add(base);

    const topGeo = new THREE.CylinderGeometry(3.2, 3.3, 0.32, 10);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xb67b44,
      roughness: 0.82,
      flatShading: true
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.14;
    top.receiveShadow = true;
    top.castShadow = true;
    deckGroup.add(top);

    // Decorative pillar beneath deck into water
    const pillarGeo = new THREE.CylinderGeometry(2.6, 1.8, 9.5, 8);
    const pillar = new THREE.Mesh(pillarGeo, baseMat);
    pillar.position.y = -6.2;
    deckGroup.add(pillar);

    this.group.add(deckGroup);
  }

  _createWater() {
    const waterGeo = new THREE.CircleGeometry(210, 40);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2b9ce8,
      roughness: 0.25,
      metalness: 0.18,
      flatShading: true
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = -9.6;
    this.group.add(this.waterMesh);
  }

  _createDistantMountains() {
    const mountainGroup = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x5c7c99,
      roughness: 0.92,
      flatShading: true
    });
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x4ca35c,
      roughness: 0.9,
      flatShading: true
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf4f9ff,
      roughness: 0.78,
      flatShading: true
    });

    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.08;
      // Keep camera sightline behind cannon slightly lower so it never clips
      const dist = 74 + (i % 4) * 18;
      const height = 22 + ((i * 13) % 24);
      const radius = 14 + ((i * 7) % 12);

      const mGeo = new THREE.ConeGeometry(radius, height, 6);
      const mountain = new THREE.Mesh(mGeo, i % 3 === 0 ? hillMat : baseMat);
      mountain.position.set(
        Math.cos(angle) * dist,
        -10 + height * 0.5,
        Math.sin(angle) * dist
      );
      mountain.rotation.y = angle * 1.4;
      mountainGroup.add(mountain);

      // Snow cap for tall peaks
      if (height > 29 && i % 3 !== 0) {
        const capH = height * 0.32;
        const capR = radius * 0.33;
        const capGeo = new THREE.ConeGeometry(capR, capH, 6);
        const cap = new THREE.Mesh(capGeo, snowMat);
        cap.position.set(
          mountain.position.x,
          -10 + height - capH * 0.5 + 0.1,
          mountain.position.z
        );
        cap.rotation.y = mountain.rotation.y;
        mountainGroup.add(cap);
      }
    }

    // Small scenic side islets
    const isletPositions = [
      [-26, -6.5, -18, 9],
      [28, -6.5, -14, 10],
      [-30, -6.5, 14, 8],
      [30, -6.5, 18, 8.5],
      [0, -6.5, -34, 12]
    ];
    for (const [ix, iy, iz, ir] of isletPositions) {
      const isoGeo = new THREE.CylinderGeometry(ir, ir * 0.65, 6.2, 9);
      const iso = new THREE.Mesh(isoGeo, hillMat);
      iso.position.set(ix, iy, iz);
      mountainGroup.add(iso);
    }

    this.group.add(mountainGroup);
  }

  _createInstancedTrees() {
    // Low-poly pine trees rendered via InstancedMesh for ultra-fast draw calls
    const positions = [
      // Around outer edge of main arena island (avoiding front firing lane)
      [-10.8, -1.25, -4.5, 1.05],
      [-11.5, -1.25, 1.2, 0.9],
      [-9.5, -1.25, -8.5, 1.15],
      [-4.2, -1.25, -11.4, 1.0],
      [4.5, -1.25, -11.2, 1.15],
      [9.8, -1.25, -7.8, 0.95],
      [11.4, -1.25, -2.1, 1.1],
      [10.8, -1.25, 3.8, 0.88],
      // On side islets
      [-25, -3.4, -16, 1.5],
      [-28, -3.4, -20, 1.25],
      [-23, -3.4, -20, 1.35],
      [27, -3.4, -12, 1.55],
      [31, -3.4, -16, 1.3],
      [25, -3.4, -17, 1.2],
      [-3, -3.4, -33, 1.6],
      [3, -3.4, -35, 1.4],
      [0, -3.4, -31, 1.25],
      [-29, -3.4, 13, 1.35],
      [29, -3.4, 17, 1.4]
    ];

    const count = positions.length;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c4f2b, roughness: 0.9, flatShading: true });
    const leafGeo1 = new THREE.ConeGeometry(1.05, 2.0, 6);
    const leafGeo2 = new THREE.ConeGeometry(0.8, 1.7, 6);
    const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.85, flatShading: true });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3ca85c, roughness: 0.85, flatShading: true });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves1 = new THREE.InstancedMesh(leafGeo1, leafMat1, count);
    const leaves2 = new THREE.InstancedMesh(leafGeo2, leafMat2, count);

    trunks.castShadow = true;
    leaves1.castShadow = true;
    leaves2.castShadow = true;

    const dummy = new THREE.Object3D();
    positions.forEach(([x, y, z, s], i) => {
      const rot = i * 1.1;
      dummy.position.set(x, y + 0.6 * s, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 1.8 * s, z);
      dummy.updateMatrix();
      leaves1.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.85 * s, z);
      dummy.rotation.set(0, rot + 0.5, 0);
      dummy.updateMatrix();
      leaves2.setMatrixAt(i, dummy.matrix);
    });

    this.group.add(trunks, leaves1, leaves2);
  }

  _createClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      flatShading: true
    });
    const puffGeo = new THREE.DodecahedronGeometry(1.0, 1);

    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const mesh = new THREE.Mesh(puffGeo, cloudMat);
        const s = 1.4 + (p === 1 ? 0.8 : (p % 2) * 0.4);
        mesh.scale.set(s * 1.25, s * 0.72, s);
        mesh.position.set((p - (puffs - 1) / 2) * 2.1, (p % 2) * 0.45, (p % 3 - 1) * 0.5);
        cloud.add(mesh);
      }

      const angle = (i / 12) * Math.PI * 2;
      const dist = 36 + (i % 4) * 16;
      cloud.position.set(
        Math.cos(angle) * dist,
        22 + (i % 4) * 4.5,
        Math.sin(angle) * dist - 8
      );
      cloud.userData = {
        speed: 0.45 + (i % 4) * 0.18,
        baseY: cloud.position.y,
        phase: i * 0.9
      };

      this.group.add(cloud);
      this.clouds.push(cloud);
    }
  }

  applyTheme(themeName = 'sunny') {
    const theme = SKY_THEMES[themeName] || SKY_THEMES.sunny;
    this.skyUniforms.uTopColor.value.setHex(theme.top);
    this.skyUniforms.uMidColor.value.setHex(theme.mid);
    this.skyUniforms.uHorizonColor.value.setHex(theme.horizon);
    this.skyUniforms.uSunColor.value.setHex(theme.sun);
    if (this.sceneManager) {
      this.sceneManager.setFogColor(theme.fog, 0.0052);
    }
    if (this.waterMesh) {
      this.waterMesh.material.color.setHex(
        themeName === 'twilight' ? 0x1d3f72 : themeName === 'sunset' ? 0x2d689c : 0x2b9ce8
      );
    }
  }

  update(dt) {
    this.time += dt;
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 95) {
        cloud.position.x = -95;
      }
      cloud.position.y = cloud.userData.baseY + Math.sin(this.time * 0.6 + cloud.userData.phase) * 0.35;
    }
  }
}
