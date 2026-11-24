import * as THREE from 'three';

export class ExplosionSystem {
  constructor({ towerManager, particleSystem, screenShake, soundManager, lighting, cameraController }) {
    this.towerManager = towerManager;
    this.particleSystem = particleSystem;
    this.screenShake = screenShake;
    this.soundManager = soundManager;
    this.lighting = lighting;
    this.cameraController = cameraController;
    this.pendingChains = [];
    this._dir = new THREE.Vector3();
  }

  clearPending() {
    this.pendingChains.length = 0;
  }

  queueExplosion(position, options, delaySeconds = 0.12) {
    this.pendingChains.push({
      position: position.clone(),
      options,
      timer: delaySeconds
    });
  }

  update(dt) {
    for (let i = this.pendingChains.length - 1; i >= 0; i--) {
      const item = this.pendingChains[i];
      item.timer -= dt;
      if (item.timer <= 0) {
        this.pendingChains.splice(i, 1);
        this.triggerExplosion(item.position, item.options);
      }
    }
  }

  triggerExplosion(origin, {
    radius = 5.0,
    force = 60,
    damage = 90,
    shake = 0.65,
    color = 0xff6b2b,
    isChain = false
  } = {}) {
    const pos = origin instanceof THREE.Vector3
      ? origin.clone()
      : new THREE.Vector3(origin.x, origin.y, origin.z);

    // Visual & Audio juice
    if (this.particleSystem) {
      this.particleSystem.spawnExplosion(pos, radius, color);
    }
    if (this.lighting) {
      this.lighting.triggerExplosionFlash(pos, Math.min(2.2, radius * 0.34));
    }
    if (this.screenShake) {
      this.screenShake.addTrauma(shake);
    }
    if (this.soundManager) {
      this.soundManager.playExplosion(Math.min(1.2, radius / 5.5), isChain);
    }
    if (this.cameraController && radius >= 3.5) {
      this.cameraController.pulseZoom(Math.min(1.0, radius / 6.5));
    }

    // Apply physics blast impulses & radial damage to all nearby tower blocks
    const blocks = this.towerManager.getActiveBlocks();
    let affectedCount = 0;

    for (const block of blocks) {
      if (block.destroyed || !block.body) continue;
      const bPos = block.getPosition();
      this._dir.subVectors(bPos, pos);
      const dist = this._dir.length();

      if (dist >= radius) continue;
      affectedCount++;

      // Falloff curve: strong near center, smooth toward edge
      const norm = 1 - dist / radius;
      const falloff = Math.pow(norm, 1.25);

      if (dist > 0.001) {
        this._dir.divideScalar(dist);
      } else {
        this._dir.set(0, 1, 0);
      }

      // Add upward lift so towers dramatically blow outward and upward
      const impulseMag = force * falloff;
      const ix = this._dir.x * impulseMag;
      const iy = (this._dir.y + 0.48) * impulseMag;
      const iz = this._dir.z * impulseMag;

      block.body.wakeUp();
      block.body.applyImpulse({ x: ix, y: iy, z: iz }, true);

      // Rotational spin impulse for juicy tumbling
      const spin = impulseMag * 0.16;
      block.body.applyTorqueImpulse(
        {
          x: (Math.random() - 0.5) * spin,
          y: (Math.random() - 0.5) * spin,
          z: (Math.random() - 0.5) * spin
        },
        true
      );

      // Apply radial blast damage
      const blastDmg = damage * falloff;
      if (blastDmg > 4) {
        this.towerManager.damageBlock(block, blastDmg, true);
      }
    }

    return affectedCount;
  }
}
