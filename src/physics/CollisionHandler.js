export class CollisionHandler {
  constructor({ physicsWorld, particleSystem, soundManager, onProjectileHit, onBlockImpact }) {
    this.physicsWorld = physicsWorld;
    this.particleSystem = particleSystem;
    this.soundManager = soundManager;
    this.onProjectileHit = onProjectileHit;
    this.onBlockImpact = onBlockImpact;
    this.lastSoundTime = 0;
    this.blockSoundCooldown = 0.055;
    this.graceTimer = 0;
  }

  setSpawnGrace(seconds = 0.45) {
    this.graceTimer = seconds;
  }

  update(dt) {
    if (this.graceTimer > 0) {
      this.graceTimer = Math.max(0, this.graceTimer - dt);
    }
  }

  processEvents(eventQueue) {
    if (!eventQueue) return;

    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (!started) return;
      const e1 = this.physicsWorld.getEntityByCollider(handle1);
      const e2 = this.physicsWorld.getEntityByCollider(handle2);
      if (!e1 || !e2) return;

      // Projectile collision
      if (e1.type === 'projectile' || e2.type === 'projectile') {
        const projEntity = e1.type === 'projectile' ? e1 : e2;
        const otherEntity = e1.type === 'projectile' ? e2 : e1;
        // Ignore projectile hitting another projectile from the same cluster volley
        if (otherEntity.type === 'projectile') return;

        if (this.onProjectileHit && projEntity.ref && projEntity.ref.active) {
          this.onProjectileHit(projEntity.ref, otherEntity);
        }
        return;
      }

      // Skip subtle settling noises during initial tower spawn grace period
      if (this.graceTimer > 0) return;

      // Block-to-block or block-to-ground impact detection via relative velocity
      if (e1.type === 'block' || e2.type === 'block') {
        const b1 = e1.type === 'block' ? e1.ref : null;
        const b2 = e2.type === 'block' ? e2.ref : null;
        const v1 = b1 && b1.body ? b1.body.linvel() : { x: 0, y: 0, z: 0 };
        const v2 = b2 && b2.body ? b2.body.linvel() : { x: 0, y: 0, z: 0 };

        const dvx = v1.x - v2.x;
        const dvy = v1.y - v2.y;
        const dvz = v1.z - v2.z;
        const impactSpeed = Math.hypot(dvx, dvy, dvz);

        if (impactSpeed > 2.4) {
          const primaryBlock = b1 || b2;
          const pos = primaryBlock.getPosition();

          // Sound feedback (throttled)
          const now = performance.now() / 1000;
          if (now - this.lastSoundTime > this.blockSoundCooldown) {
            this.lastSoundTime = now;
            const intensity = Math.min(1, (impactSpeed - 2.0) / 14);
            this.soundManager.playBlockCollision(primaryBlock.materialDef.sound, intensity);
          }

          // Dust puff on noticeable collisions
          if (impactSpeed > 4.2 && this.particleSystem) {
            this.particleSystem.spawnDust(pos, Math.min(8, Math.floor(impactSpeed * 0.6)));
          }

          // Impact damage for hard falls / crushes
          if (impactSpeed > 5.0 && this.onBlockImpact) {
            const kineticDmg = (impactSpeed - 4.2) * 5.2;
            if (b1 && !b1.destroyed) {
              const weightFactor = b2 ? Math.max(0.6, b2.materialDef.density / b1.materialDef.density) : 1.15;
              this.onBlockImpact(b1, kineticDmg * weightFactor, pos);
            }
            if (b2 && !b2.destroyed) {
              const weightFactor = b1 ? Math.max(0.6, b1.materialDef.density / b2.materialDef.density) : 1.15;
              this.onBlockImpact(b2, kineticDmg * weightFactor, pos);
            }
          }
        }
      }
    });

    // Clear contact force queue so it does not accumulate
    eventQueue.drainContactForceEvents(() => {});
  }
}
