import * as THREE from 'three';
import { WEAPON_TYPES, WEAPON_ORDER } from '../levels/levelData.js';
import { Projectile } from './Projectile.js';

const POOL_SIZE = 16;

export class WeaponManager {
  constructor({ scene, physicsWorld, particleSystem, soundManager }) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.particleSystem = particleSystem;
    this.soundManager = soundManager;

    this.ammo = { cannonball: 0, bomb: 0, cluster: 0, rocket: 0 };
    this.initialAmmoTotal = 0;
    this.shotsFired = 0;
    this.selectedWeaponId = 'cannonball';

    // Pre-allocate object pool of projectiles
    this.pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(new Projectile(scene, physicsWorld));
    }
  }

  loadAmmo(ammoConfig) {
    this.clearProjectiles();
    this.ammo = {
      cannonball: ammoConfig.cannonball || 0,
      bomb: ammoConfig.bomb || 0,
      cluster: ammoConfig.cluster || 0,
      rocket: ammoConfig.rocket || 0
    };
    this.initialAmmoTotal = this.getTotalAmmo();
    this.shotsFired = 0;
    this.selectFirstAvailable();
  }

  selectFirstAvailable() {
    for (const id of WEAPON_ORDER) {
      if (this.ammo[id] > 0) {
        this.selectedWeaponId = id;
        return id;
      }
    }
    return this.selectedWeaponId;
  }

  selectWeapon(weaponId) {
    if (!WEAPON_TYPES[weaponId]) return false;
    if (this.ammo[weaponId] <= 0) return false;
    if (this.selectedWeaponId !== weaponId) {
      this.selectedWeaponId = weaponId;
      if (this.soundManager) this.soundManager.playWeaponSelect();
    }
    return true;
  }

  getSelectedWeapon() {
    return WEAPON_TYPES[this.selectedWeaponId] || WEAPON_TYPES.cannonball;
  }

  getTotalAmmo() {
    return (
      (this.ammo.cannonball || 0) +
      (this.ammo.bomb || 0) +
      (this.ammo.cluster || 0) +
      (this.ammo.rocket || 0)
    );
  }

  canFire() {
    return this.ammo[this.selectedWeaponId] > 0;
  }

  _acquireProjectile() {
    const free = this.pool.find((p) => !p.active);
    if (free) return free;
    // Recycle oldest active projectile if pool saturated
    let oldest = this.pool[0];
    for (const p of this.pool) {
      if (p.life > oldest.life) oldest = p;
    }
    oldest.deactivate();
    return oldest;
  }

  fire(cannon) {
    if (!this.canFire()) return null;

    const weaponDef = this.getSelectedWeapon();
    this.ammo[weaponDef.id] = Math.max(0, this.ammo[weaponDef.id] - 1);
    this.shotsFired++;

    const muzzlePos = cannon.getMuzzleWorldPosition();
    const aimDir = cannon.getAimDirection();
    const right = new THREE.Vector3().crossVectors(aimDir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, aimDir).normalize();

    const count = weaponDef.count || 1;
    const spawned = [];

    // Cluster spread pattern: center + 4 diamond offsets
    const offsets =
      count === 5
        ? [
            [0, 0],
            [-1, 0.35],
            [1, 0.35],
            [-0.55, -0.55],
            [0.55, -0.55]
          ]
        : [[0, 0]];

    for (let i = 0; i < count; i++) {
      const proj = this._acquireProjectile();
      const [ox, oy] = offsets[i] || [0, 0];
      const spread = weaponDef.spread || 0;

      const shotDir = aimDir
        .clone()
        .addScaledVector(right, ox * spread)
        .addScaledVector(up, oy * spread)
        .normalize();

      const spawnPos = muzzlePos
        .clone()
        .addScaledVector(right, ox * 0.22)
        .addScaledVector(up, oy * 0.22);

      const velocity = shotDir.multiplyScalar(weaponDef.speed);
      proj.spawn(weaponDef, spawnPos, velocity);
      spawned.push(proj);
    }

    // Visual & audio cannon feedback
    cannon.triggerRecoil(weaponDef.id === 'bomb' || weaponDef.id === 'rocket' ? 0.78 : 0.52);
    if (this.particleSystem) {
      this.particleSystem.spawnMuzzleBurst(muzzlePos, aimDir);
    }
    if (this.soundManager) {
      this.soundManager.playCannonFire(weaponDef.id);
    }

    // Auto-select next available weapon if current ran out
    if (this.ammo[weaponDef.id] <= 0) {
      this.selectFirstAvailable();
    }

    return { weaponDef, spawned };
  }

  hasActiveProjectiles() {
    for (const p of this.pool) {
      if (p.active) return true;
    }
    return false;
  }

  clearProjectiles() {
    for (const p of this.pool) {
      p.deactivate();
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (p.active) {
        p.update(dt, this.particleSystem);
      }
    }
  }

  dispose() {
    for (const p of this.pool) {
      p.dispose();
    }
    this.pool = [];
  }
}
