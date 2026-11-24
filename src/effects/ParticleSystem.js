import * as THREE from 'three';

const MAX_DEBRIS = 260;
const MAX_PUFFS = 220;
const MAX_RINGS = 8;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();

    // 1. Pooled InstancedMesh for solid debris chunks
    const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
    const debrisMat = new THREE.MeshStandardMaterial({
      roughness: 0.75,
      metalness: 0.12,
      flatShading: true
    });
    this.debrisMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, MAX_DEBRIS);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debrisMesh.frustumCulled = false;
    this.debrisMesh.castShadow = true;
    this.scene.add(this.debrisMesh);

    this.debrisPool = [];
    for (let i = 0; i < MAX_DEBRIS; i++) {
      this.debrisPool.push({
        active: false,
        x: 0, y: -100, z: 0,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        vrx: 0, vry: 0, vrz: 0,
        scale: 0.2,
        life: 0,
        maxLife: 1
      });
      this._hideInstance(this.debrisMesh, i);
    }
    this.debrisCursor = 0;

    // 2. Pooled InstancedMesh for fire, smoke, dust & sparks
    const puffGeo = new THREE.IcosahedronGeometry(0.5, 1);
    const puffMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88
    });
    this.puffMesh = new THREE.InstancedMesh(puffGeo, puffMat, MAX_PUFFS);
    this.puffMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.puffMesh.frustumCulled = false;
    this.scene.add(this.puffMesh);

    this.puffPool = [];
    for (let i = 0; i < MAX_PUFFS; i++) {
      this.puffPool.push({
        active: false,
        x: 0, y: -100, z: 0,
        vx: 0, vy: 0, vz: 0,
        startScale: 0.3,
        endScale: 1.2,
        drag: 2.2,
        rise: 2.5,
        life: 0,
        maxLife: 0.6,
        colorA: new THREE.Color(),
        colorB: new THREE.Color()
      });
      this._hideInstance(this.puffMesh, i);
    }
    this.puffCursor = 0;

    // 3. Pooled shockwave rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.65, 1.0, 28);
    for (let i = 0; i < MAX_RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffc857,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.rotation.x = -Math.PI / 2;
      this.scene.add(mesh);
      this.rings.push({
        active: false,
        mesh,
        life: 0,
        maxLife: 0.45,
        maxScale: 5
      });
    }
  }

  _hideInstance(instMesh, index) {
    this._dummy.position.set(0, -200, 0);
    this._dummy.scale.setScalar(0.0001);
    this._dummy.updateMatrix();
    instMesh.setMatrixAt(index, this._dummy.matrix);
  }

  _allocDebris() {
    const idx = this.debrisCursor;
    this.debrisCursor = (this.debrisCursor + 1) % MAX_DEBRIS;
    return { idx, p: this.debrisPool[idx] };
  }

  _allocPuff() {
    const idx = this.puffCursor;
    this.puffCursor = (this.puffCursor + 1) % MAX_PUFFS;
    return { idx, p: this.puffPool[idx] };
  }

  spawnDebris(pos, colorHex, count = 10, power = 1.0) {
    this._color.setHex(colorHex);
    for (let i = 0; i < count; i++) {
      const { idx, p } = this._allocDebris();
      p.active = true;
      p.x = pos.x + (Math.random() - 0.5) * 0.7;
      p.y = pos.y + (Math.random() - 0.5) * 0.7;
      p.z = pos.z + (Math.random() - 0.5) * 0.7;

      const angle = Math.random() * Math.PI * 2;
      const speed = (2.5 + Math.random() * 6.5) * power;
      p.vx = Math.cos(angle) * speed;
      p.vy = (2.8 + Math.random() * 6.8) * power;
      p.vz = Math.sin(angle) * speed;

      p.rx = Math.random() * Math.PI;
      p.ry = Math.random() * Math.PI;
      p.rz = Math.random() * Math.PI;
      p.vrx = (Math.random() - 0.5) * 14;
      p.vry = (Math.random() - 0.5) * 14;
      p.vrz = (Math.random() - 0.5) * 14;

      p.scale = 0.14 + Math.random() * 0.22;
      p.life = 0;
      p.maxLife = 0.9 + Math.random() * 0.85;

      // Slight shade variation per chunk
      const shade = 0.85 + Math.random() * 0.3;
      const c = this._color.clone().multiplyScalar(shade);
      this.debrisMesh.setColorAt(idx, c);
    }
    if (this.debrisMesh.instanceColor) {
      this.debrisMesh.instanceColor.needsUpdate = true;
    }
  }

  spawnExplosion(pos, radius = 5.0, primaryColor = 0xff6b2b) {
    const scaleFactor = Math.max(0.6, Math.min(1.65, radius / 4.5));
    const fireCount = Math.floor(18 * scaleFactor);
    const smokeCount = Math.floor(14 * scaleFactor);

    // Bright fiery core puffs
    for (let i = 0; i < fireCount; i++) {
      const { idx, p } = this._allocPuff();
      p.active = true;
      p.x = pos.x + (Math.random() - 0.5) * 0.7 * scaleFactor;
      p.y = pos.y + (Math.random() - 0.5) * 0.7 * scaleFactor;
      p.z = pos.z + (Math.random() - 0.5) * 0.7 * scaleFactor;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (3.5 + Math.random() * 8.5) * scaleFactor;
      p.vx = Math.sin(phi) * Math.cos(theta) * spd;
      p.vy = Math.abs(Math.cos(phi)) * spd + 1.5;
      p.vz = Math.sin(phi) * Math.sin(theta) * spd;

      p.startScale = (0.55 + Math.random() * 0.55) * scaleFactor;
      p.endScale = (1.6 + Math.random() * 1.1) * scaleFactor;
      p.drag = 3.2;
      p.rise = 2.8;
      p.life = 0;
      p.maxLife = 0.34 + Math.random() * 0.28;
      p.colorA.setHex(0xfff3a1);
      p.colorB.setHex(primaryColor);
      this.puffMesh.setColorAt(idx, p.colorA);
    }

    // Expanding dark smoke clouds
    for (let i = 0; i < smokeCount; i++) {
      const { idx, p } = this._allocPuff();
      p.active = true;
      p.x = pos.x + (Math.random() - 0.5) * 1.0 * scaleFactor;
      p.y = pos.y + Math.random() * 0.8 * scaleFactor;
      p.z = pos.z + (Math.random() - 0.5) * 1.0 * scaleFactor;

      const angle = Math.random() * Math.PI * 2;
      const spd = (1.8 + Math.random() * 5.2) * scaleFactor;
      p.vx = Math.cos(angle) * spd;
      p.vy = (2.0 + Math.random() * 4.5) * scaleFactor;
      p.vz = Math.sin(angle) * spd;

      p.startScale = (0.6 + Math.random() * 0.5) * scaleFactor;
      p.endScale = (2.2 + Math.random() * 1.2) * scaleFactor;
      p.drag = 2.4;
      p.rise = 2.2;
      p.life = 0;
      p.maxLife = 0.65 + Math.random() * 0.55;
      p.colorA.setHex(0x555259);
      p.colorB.setHex(0x28262b);
      this.puffMesh.setColorAt(idx, p.colorA);
    }

    // Glowing sparks / debris embers
    this.spawnDebris(pos, 0xffaa33, Math.floor(12 * scaleFactor), 1.35 * scaleFactor);

    // Expanding shockwave ring
    const ring = this.rings.find((r) => !r.active) || this.rings[0];
    ring.active = true;
    ring.life = 0;
    ring.maxLife = 0.38 + scaleFactor * 0.12;
    ring.maxScale = radius * 1.1;
    ring.mesh.position.set(pos.x, Math.max(0.15, pos.y), pos.z);
    ring.mesh.scale.setScalar(0.3);
    ring.mesh.material.color.setHex(primaryColor === 0x06b6d4 ? 0x67e8f9 : 0xffd166);
    ring.mesh.material.opacity = 0.85;
    ring.mesh.visible = true;

    if (this.puffMesh.instanceColor) {
      this.puffMesh.instanceColor.needsUpdate = true;
    }
  }

  spawnDust(pos, count = 5) {
    for (let i = 0; i < count; i++) {
      const { idx, p } = this._allocPuff();
      p.active = true;
      p.x = pos.x + (Math.random() - 0.5) * 0.6;
      p.y = pos.y + Math.random() * 0.3;
      p.z = pos.z + (Math.random() - 0.5) * 0.6;

      const angle = Math.random() * Math.PI * 2;
      const spd = 0.8 + Math.random() * 2.2;
      p.vx = Math.cos(angle) * spd;
      p.vy = 0.8 + Math.random() * 1.8;
      p.vz = Math.sin(angle) * spd;

      p.startScale = 0.22 + Math.random() * 0.2;
      p.endScale = 0.85 + Math.random() * 0.45;
      p.drag = 2.6;
      p.rise = 1.1;
      p.life = 0;
      p.maxLife = 0.45 + Math.random() * 0.35;
      p.colorA.setHex(0xdfd7c8);
      p.colorB.setHex(0xb3aaa0);
      this.puffMesh.setColorAt(idx, p.colorA);
    }
    if (this.puffMesh.instanceColor) {
      this.puffMesh.instanceColor.needsUpdate = true;
    }
  }

  spawnMuzzleBurst(pos, dir) {
    for (let i = 0; i < 10; i++) {
      const { idx, p } = this._allocPuff();
      p.active = true;
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;

      const spd = 2.5 + Math.random() * 5.0;
      p.vx = dir.x * spd + (Math.random() - 0.5) * 2.4;
      p.vy = dir.y * spd + (Math.random() - 0.5) * 2.0 + 0.6;
      p.vz = dir.z * spd + (Math.random() - 0.5) * 2.4;

      p.startScale = 0.25 + Math.random() * 0.2;
      p.endScale = 1.05 + Math.random() * 0.5;
      p.drag = 3.5;
      p.rise = 1.4;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.colorA.setHex(i < 4 ? 0xffe082 : 0xd8dce3);
      p.colorB.setHex(0x9aa3b2);
      this.puffMesh.setColorAt(idx, p.colorA);
    }
    if (this.puffMesh.instanceColor) {
      this.puffMesh.instanceColor.needsUpdate = true;
    }
  }

  spawnTrailPuff(pos, colorHex = 0xffa726, scale = 0.32) {
    const { idx, p } = this._allocPuff();
    p.active = true;
    p.x = pos.x + (Math.random() - 0.5) * 0.14;
    p.y = pos.y + (Math.random() - 0.5) * 0.14;
    p.z = pos.z + (Math.random() - 0.5) * 0.14;
    p.vx = (Math.random() - 0.5) * 0.6;
    p.vy = 0.4 + Math.random() * 0.6;
    p.vz = (Math.random() - 0.5) * 0.6;
    p.startScale = scale;
    p.endScale = scale * 2.1;
    p.drag = 2.5;
    p.rise = 0.6;
    p.life = 0;
    p.maxLife = 0.28 + Math.random() * 0.15;
    p.colorA.setHex(colorHex);
    p.colorB.setHex(0x8c8c99);
    this.puffMesh.setColorAt(idx, p.colorA);
    if (this.puffMesh.instanceColor) {
      this.puffMesh.instanceColor.needsUpdate = true;
    }
  }

  update(dt) {
    let debrisDirty = false;
    for (let i = 0; i < MAX_DEBRIS; i++) {
      const p = this.debrisPool[i];
      if (!p.active) continue;
      debrisDirty = true;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this._hideInstance(this.debrisMesh, i);
        continue;
      }

      p.vy -= 21 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Simple pedestal ground bounce
      if (p.y < 0.12 && Math.hypot(p.x, p.z) < 7.3) {
        p.y = 0.12;
        p.vy = Math.abs(p.vy) * 0.38;
        p.vx *= 0.72;
        p.vz *= 0.72;
      }

      p.rx += p.vrx * dt;
      p.ry += p.vry * dt;
      p.rz += p.vrz * dt;

      const t = p.life / p.maxLife;
      const s = p.scale * (t > 0.7 ? Math.max(0.01, (1 - t) / 0.3) : 1);

      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.set(p.rx, p.ry, p.rz);
      this._dummy.scale.set(s * 1.2, s * 0.85, s);
      this._dummy.updateMatrix();
      this.debrisMesh.setMatrixAt(i, this._dummy.matrix);
    }
    if (debrisDirty) {
      this.debrisMesh.instanceMatrix.needsUpdate = true;
    }

    let puffDirty = false;
    let puffColorDirty = false;
    for (let i = 0; i < MAX_PUFFS; i++) {
      const p = this.puffPool[i];
      if (!p.active) continue;
      puffDirty = true;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this._hideInstance(this.puffMesh, i);
        continue;
      }

      const damping = Math.exp(-p.drag * dt);
      p.vx *= damping;
      p.vy = p.vy * damping + p.rise * dt;
      p.vz *= damping;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const t = p.life / p.maxLife;
      const scaleCurve = t < 0.75 ? t / 0.75 : (1 - t) / 0.25;
      const s = THREE.MathUtils.lerp(p.startScale, p.endScale, Math.min(1, t)) * Math.max(0.01, t > 0.7 ? (1 - t) / 0.3 : 1);

      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(Math.max(0.001, s * (0.4 + 0.6 * Math.min(1, scaleCurve + 0.3))));
      this._dummy.updateMatrix();
      this.puffMesh.setMatrixAt(i, this._dummy.matrix);

      this._color.copy(p.colorA).lerp(p.colorB, t);
      this.puffMesh.setColorAt(i, this._color);
      puffColorDirty = true;
    }
    if (puffDirty) {
      this.puffMesh.instanceMatrix.needsUpdate = true;
    }
    if (puffColorDirty && this.puffMesh.instanceColor) {
      this.puffMesh.instanceColor.needsUpdate = true;
    }

    for (const ring of this.rings) {
      if (!ring.active) continue;
      ring.life += dt;
      const t = ring.life / ring.maxLife;
      if (t >= 1) {
        ring.active = false;
        ring.mesh.visible = false;
        continue;
      }
      const easeOut = 1 - Math.pow(1 - t, 3);
      ring.mesh.scale.setScalar(0.35 + easeOut * ring.maxScale);
      ring.mesh.material.opacity = (1 - t) * 0.8;
    }
  }

  clear() {
    for (let i = 0; i < MAX_DEBRIS; i++) {
      this.debrisPool[i].active = false;
      this._hideInstance(this.debrisMesh, i);
    }
    this.debrisMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_PUFFS; i++) {
      this.puffPool[i].active = false;
      this._hideInstance(this.puffMesh, i);
    }
    this.puffMesh.instanceMatrix.needsUpdate = true;

    for (const ring of this.rings) {
      ring.active = false;
      ring.mesh.visible = false;
    }
  }

  dispose() {
    this.debrisMesh.geometry.dispose();
    this.debrisMesh.material.dispose();
    this.puffMesh.geometry.dispose();
    this.puffMesh.material.dispose();
    for (const ring of this.rings) {
      ring.mesh.geometry.dispose();
      ring.mesh.material.dispose();
    }
  }
}
