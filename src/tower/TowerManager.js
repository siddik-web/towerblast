import { TowerGenerator } from './TowerGenerator.js';

export class TowerManager {
  constructor({ physicsWorld, scene, particleSystem, soundManager, onBlockDestroyed, onExplosiveDetonate }) {
    this.physicsWorld = physicsWorld;
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.soundManager = soundManager;
    this.onBlockDestroyed = onBlockDestroyed;
    this.onExplosiveDetonate = onExplosiveDetonate;

    this.generator = new TowerGenerator(physicsWorld, scene);
    this.blocks = [];
    this.totalBlocks = 0;
    this.countedDestroyed = 0;
    this.towerHeight = 6;
    this.elapsed = 0;
    this.recentCollapseCount = 0;
    this.collapseWindowTimer = 0;
  }

  buildTower(levelConfig) {
    this.clearTower();
    const { blocks, towerHeight } = this.generator.generate(levelConfig);
    this.blocks = blocks;
    this.totalBlocks = blocks.length;
    this.countedDestroyed = 0;
    this.towerHeight = towerHeight;
    this.recentCollapseCount = 0;
    this.collapseWindowTimer = 0;
    return { totalBlocks: this.totalBlocks, towerHeight: this.towerHeight };
  }

  clearTower() {
    for (const block of this.blocks) {
      block.destroy();
    }
    this.blocks = [];
    this.totalBlocks = 0;
    this.countedDestroyed = 0;
  }

  getActiveBlocks() {
    return this.blocks.filter((b) => !b.destroyed);
  }

  getActiveMeshes() {
    const meshes = [];
    for (const b of this.blocks) {
      if (!b.destroyed && b.mesh) meshes.push(b.mesh);
    }
    return meshes;
  }

  getDestructionRatio() {
    if (this.totalBlocks === 0) return 0;
    return Math.min(1, this.countedDestroyed / this.totalBlocks);
  }

  damageBlock(block, amount, fromExplosion = false) {
    if (!block || block.destroyed) return;
    const lethal = block.takeDamage(amount);
    if (lethal) {
      this.shatterBlock(block, fromExplosion);
    } else if (block.isExplosive && block.hp <= block.maxHp * 0.45 && !block.detonated) {
      this.shatterBlock(block, true);
    }
  }

  shatterBlock(block, fromExplosion = false) {
    if (!block || block.destroyed) return;
    const pos = block.getPosition().clone();
    const color = block.colorHex;
    const matDef = block.materialDef;
    const wasToppled = block.toppled;

    block.destroy();

    if (this.particleSystem) {
      this.particleSystem.spawnDebris(pos, color, fromExplosion ? 10 : 8, fromExplosion ? 1.25 : 0.9);
      this.particleSystem.spawnDust(pos, 3);
    }
    if (this.soundManager) {
      this.soundManager.playBlockShatter(matDef.sound);
    }

    if (!wasToppled) {
      this._recordBlockCounted(block, pos, true);
    }

    if (block.isExplosive && !block.detonated) {
      block.detonated = true;
      if (this.onExplosiveDetonate) {
        this.onExplosiveDetonate(pos, matDef);
      }
    }
  }

  _recordBlockCounted(block, pos, shattered) {
    this.countedDestroyed++;
    this.recentCollapseCount++;
    this.collapseWindowTimer = 0.65;

    if (this.recentCollapseCount >= 5 && this.soundManager) {
      this.soundManager.playTowerCollapse();
      this.recentCollapseCount = 0;
    }

    if (this.onBlockDestroyed) {
      this.onBlockDestroyed(block, pos, shattered);
    }
  }

  isSettled() {
    let moving = 0;
    for (const b of this.blocks) {
      if (b.destroyed) continue;
      if (b.getLinearSpeedSq() > 0.36) {
        moving++;
        if (moving >= 2) return false;
      }
    }
    return moving === 0;
  }

  update(dt, checkDestruction = true) {
    this.elapsed += dt;
    if (this.collapseWindowTimer > 0) {
      this.collapseWindowTimer -= dt;
      if (this.collapseWindowTimer <= 0) {
        this.recentCollapseCount = 0;
      }
    }

    for (const block of this.blocks) {
      if (block.destroyed) continue;
      block.syncFromPhysics(dt, this.elapsed);

      if (!checkDestruction) continue;

      const pos = block.position;
      const distXZ = Math.hypot(pos.x, pos.z);

      // Cleanly shatter & remove blocks that fell off the arena island
      if (pos.y < -2.4 || distXZ > 13.8) {
        this.shatterBlock(block, false);
        continue;
      }

      if (!block.toppled && block.checkToppled()) {
        this._recordBlockCounted(block, pos.clone(), false);
      }
    }
  }
}
