import * as THREE from 'three';

export class CameraController {
  constructor(camera, screenShake) {
    this.camera = camera;
    this.screenShake = screenShake;

    this.mode = 'menu'; // 'menu' | 'gameplay' | 'victory'
    this.orbitAngle = 0.4;
    this.aimYaw = 0;
    this.aimPitch = 0.25;
    this.towerHeight = 7;

    this.zoomPulse = 0;
    this.currentPos = new THREE.Vector3(0, 8, 26);
    this.currentLookAt = new THREE.Vector3(0, 3.8, 0);
    this.targetPos = new THREE.Vector3(0, 7.2, 24.5);
    this.targetLookAt = new THREE.Vector3(0, 3.8, 0);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }

  setMode(mode) {
    this.mode = mode;
  }

  setTowerHeight(height) {
    this.towerHeight = Math.max(4.5, Math.min(14, height));
  }

  setAim(yaw, pitch) {
    this.aimYaw = yaw;
    this.aimPitch = pitch;
  }

  pulseZoom(amount = 0.6) {
    this.zoomPulse = Math.min(1.2, Math.max(this.zoomPulse, amount));
  }

  snapToMode() {
    this._computeTargets(0.016);
    this.currentPos.copy(this.targetPos);
    this.currentLookAt.copy(this.targetLookAt);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }

  _computeTargets(dt) {
    const focusY = Math.min(5.2, Math.max(2.6, this.towerHeight * 0.48));

    if (this.mode === 'menu') {
      this.orbitAngle += dt * 0.24;
      const radius = 19.5 + this.towerHeight * 0.45;
      this.targetPos.set(
        Math.sin(this.orbitAngle) * radius,
        6.5 + this.towerHeight * 0.28,
        Math.cos(this.orbitAngle) * radius
      );
      this.targetLookAt.set(0, focusY, 0);
    } else if (this.mode === 'victory') {
      this.orbitAngle += dt * 0.42;
      const radius = 17.5;
      this.targetPos.set(
        Math.sin(this.orbitAngle) * radius,
        8.2,
        Math.cos(this.orbitAngle) * radius
      );
      this.targetLookAt.set(0, 2.5, 0);
    } else {
      // Third-person elevated arcade view behind the cannon showing carriage + full tower silhouette
      const baseDist = 25.2 + Math.max(0, this.towerHeight - 7.5) * 0.55;
      const zoomOffset = this.zoomPulse * 2.4;
      const sideShift = -this.aimYaw * 4.0;
      const pitchLift = (this.aimPitch - 0.24) * 1.8;

      this.targetPos.set(
        sideShift,
        6.1 + Math.max(0, this.towerHeight - 7) * 0.25 + pitchLift * 0.45 - zoomOffset * 0.25,
        baseDist - zoomOffset
      );
      this.targetLookAt.set(
        -this.aimYaw * 4.2,
        focusY + pitchLift * 0.65,
        -0.8
      );
    }
  }

  update(dt) {
    this._computeTargets(dt);

    // Decay zoom pulse gracefully
    this.zoomPulse = Math.max(0, this.zoomPulse - dt * 1.45);

    // Frame-rate independent smooth exponential damping
    const smooth = 1 - Math.exp(-5.2 * dt);
    this.currentPos.lerp(this.targetPos, smooth);
    this.currentLookAt.lerp(this.targetLookAt, smooth);

    // Apply screen shake offset
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let roll = 0;
    if (this.screenShake) {
      const offset = this.screenShake.update(dt);
      sx = offset.x;
      sy = offset.y;
      sz = offset.z;
      roll = offset.roll;
    }

    this.camera.position.set(
      this.currentPos.x + sx,
      this.currentPos.y + sy,
      this.currentPos.z + sz
    );
    this.camera.lookAt(
      this.currentLookAt.x + sx * 0.35,
      this.currentLookAt.y + sy * 0.35,
      this.currentLookAt.z
    );
    if (Math.abs(roll) > 0.0001) {
      this.camera.rotation.z += roll;
    }
  }
}
