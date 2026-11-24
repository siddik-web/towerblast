import * as THREE from 'three';
import { BLOCK_MATERIALS } from '../levels/levelData.js';

// Shared geometries and procedural material/texture caches to keep draw calls & memory low
const sharedUnitBox = new THREE.BoxGeometry(1, 1, 1);
const sharedUnitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
const textureCache = new Map();
const materialCache = new Map();

function createProceduralTexture(kind) {
  if (textureCache.has(kind)) return textureCache.get(kind);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (kind === 'wood') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(70, 35, 10, 0.22)';
    ctx.lineWidth = 3;
    for (let y = 10; y < 128; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(42, y + 3, 86, y - 3, 128, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(55, 25, 5, 0.34)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);
  } else if (kind === 'stone') {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(40, 50, 65, 0.14)';
    ctx.fillRect(4, 4, 58, 56);
    ctx.fillRect(66, 66, 58, 58);
    ctx.strokeStyle = 'rgba(30, 40, 52, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 64); ctx.lineTo(128, 64);
    ctx.moveTo(64, 0); ctx.lineTo(64, 64);
    ctx.moveTo(32, 64); ctx.lineTo(32, 128);
    ctx.moveTo(96, 64); ctx.lineTo(96, 128);
    ctx.stroke();
    ctx.strokeRect(2, 2, 124, 124);
  } else if (kind === 'concrete') {
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 160; i++) {
      const x = (i * 37) % 128;
      const y = (i * 73) % 128;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.22)';
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.strokeStyle = 'rgba(60, 58, 54, 0.3)';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 122, 122);
  } else if (kind === 'steel') {
    ctx.fillStyle = '#e5eef8';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(18, 30, 46, 0.42)';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 10); ctx.lineTo(118, 118);
    ctx.moveTo(118, 10); ctx.lineTo(10, 118);
    ctx.stroke();
    // Rivets
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    for (const [rx, ry] of [[16, 16], [112, 16], [16, 112], [112, 112]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'glass') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(12, 128); ctx.lineTo(54, 0); ctx.lineTo(74, 0); ctx.lineTo(32, 128);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 122, 122);
  } else if (kind === 'explosive') {
    ctx.fillStyle = '#e53935';
    ctx.fillRect(0, 0, 128, 128);
    // Hazard bands top & bottom
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(0, 10, 128, 18);
    ctx.fillRect(0, 100, 128, 18);
    ctx.fillStyle = '#1f1f1f';
    for (let x = -16; x < 144; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 10); ctx.lineTo(x + 12, 10); ctx.lineTo(x + 4, 28); ctx.lineTo(x - 8, 28);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, 100); ctx.lineTo(x + 12, 100); ctx.lineTo(x + 4, 118); ctx.lineTo(x - 8, 118);
      ctx.fill();
    }
    // Center TNT badge
    ctx.fillStyle = '#fff8e1';
    ctx.fillRect(16, 42, 96, 44);
    ctx.fillStyle = '#d32f2f';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', 64, 65);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(kind, tex);
  return tex;
}

function getSharedMaterial(materialId, colorHex) {
  const key = `${materialId}_${colorHex}`;
  if (materialCache.has(key)) return materialCache.get(key);

  const def = BLOCK_MATERIALS[materialId] || BLOCK_MATERIALS.wood;
  const mat = new THREE.MeshStandardMaterial({
    color: materialId === 'explosive' ? 0xffffff : colorHex,
    map: createProceduralTexture(materialId),
    roughness: def.roughness,
    metalness: def.metalness,
    transparent: Boolean(def.transparent),
    opacity: def.opacity ?? 1.0,
    emissive: def.emissive ? new THREE.Color(def.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: def.emissive ? 0.45 : 0
  });
  materialCache.set(key, mat);
  return mat;
}

export class Block {
  constructor(def, physicsWorld, scene, index = 0) {
    this.def = def;
    this.materialDef = BLOCK_MATERIALS[def.material] || BLOCK_MATERIALS.wood;
    this.physicsWorld = physicsWorld;
    this.scene = scene;

    const palette = this.materialDef.colors;
    this.colorHex = palette[def.colorIndex !== undefined ? def.colorIndex % palette.length : index % palette.length];

    this.maxHp = this.materialDef.hp;
    this.hp = this.maxHp;
    this.isExplosive = Boolean(this.materialDef.explosive);

    this.startPos = new THREE.Vector3(def.x, def.y, def.z);
    this.position = new THREE.Vector3(def.x, def.y, def.z);
    this.quaternion = new THREE.Quaternion();
    this._up = new THREE.Vector3(0, 1, 0);

    this.destroyed = false;
    this.toppled = false;
    this.detonated = false;
    this.hitFlash = 0;
    this.ownsMaterial = false;
    this.pulsePhase = index * 0.7;

    // Mesh
    const geo = def.shape === 'cylinder' ? sharedUnitCyl : sharedUnitBox;
    const mat = getSharedMaterial(this.materialDef.id, this.colorHex);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.scale.set(def.w, def.h, def.d);
    this.mesh.position.copy(this.startPos);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.block = this;
    this.scene.add(this.mesh);

    // Rapier rigid body & collider
    const { body, collider } = physicsWorld.createBlockBody({
      x: def.x,
      y: def.y,
      z: def.z,
      w: def.w,
      h: def.h,
      d: def.d,
      shape: def.shape || 'box',
      density: this.materialDef.density,
      friction: this.materialDef.friction,
      restitution: this.materialDef.restitution,
      ref: this
    });
    this.body = body;
    this.collider = collider;
  }

  _ensureUniqueMaterial() {
    if (!this.ownsMaterial) {
      this.mesh.material = this.mesh.material.clone();
      this.ownsMaterial = true;
    }
  }

  getPosition() {
    if (this.body && !this.destroyed) {
      const t = this.body.translation();
      this.position.set(t.x, t.y, t.z);
    }
    return this.position;
  }

  getLinearSpeedSq() {
    if (!this.body || this.destroyed) return 0;
    const v = this.body.linvel();
    return v.x * v.x + v.y * v.y + v.z * v.z;
  }

  takeDamage(amount) {
    if (this.destroyed) return false;
    this.hp -= amount;
    this.hitFlash = 1.0;
    this._ensureUniqueMaterial();

    const ratio = Math.max(0.35, this.hp / this.maxHp);
    if (this.materialDef.id !== 'explosive') {
      const base = new THREE.Color(this.colorHex);
      base.multiplyScalar(0.58 + ratio * 0.42);
      this.mesh.material.color.copy(base);
    }
    this.mesh.material.emissive.setHex(this.isExplosive ? 0xff7722 : 0xffffff);
    this.mesh.material.emissiveIntensity = 0.7;

    return this.hp <= 0;
  }

  checkToppled() {
    if (this.toppled || this.destroyed || !this.body) return false;
    const pos = this.getPosition();

    // Fell off pedestal or dropped far
    const distXZ = Math.hypot(pos.x, pos.z);
    if (pos.y < -0.35 || distXZ > 7.35) {
      this.toppled = true;
      return true;
    }

    // Significant vertical collapse for elevated blocks
    const droppedY = this.startPos.y - pos.y;
    if (this.startPos.y > 1.25 && droppedY > 1.35) {
      this.toppled = true;
      return true;
    }

    // Tilted more than ~50 degrees from upright
    this._up.set(0, 1, 0).applyQuaternion(this.quaternion);
    if (this._up.y < 0.64) {
      this.toppled = true;
      return true;
    }

    // Knocked significantly sideways from original footprint
    const horizDisp = Math.hypot(pos.x - this.startPos.x, pos.z - this.startPos.z);
    if (horizDisp > 2.25) {
      this.toppled = true;
      return true;
    }

    return false;
  }

  syncFromPhysics(dt, elapsed) {
    if (this.destroyed || !this.body) return;

    const t = this.body.translation();
    const r = this.body.rotation();
    this.position.set(t.x, t.y, t.z);
    this.quaternion.set(r.x, r.y, r.z, r.w);

    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 5.5);
      if (this.ownsMaterial) {
        const baseEmissive = this.isExplosive ? 0.35 : 0;
        this.mesh.material.emissiveIntensity = baseEmissive + this.hitFlash * 0.65;
      }
    } else if (this.isExplosive && this.ownsMaterial) {
      this.mesh.material.emissiveIntensity = 0.35 + Math.sin(elapsed * 5 + this.pulsePhase) * 0.2;
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.remove(this.mesh);
    if (this.ownsMaterial) {
      this.mesh.material.dispose();
    }
    this.physicsWorld.removeBody(this.body, this.collider);
    this.body = null;
    this.collider = null;
  }
}
