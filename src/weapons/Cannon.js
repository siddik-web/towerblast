import * as THREE from 'three';

const TRAJECTORY_DOTS = 28;

export class Cannon {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.position.set(0, 0.05, 16.5);
    this.scene.add(this.root);

    this.yaw = 0;
    this.pitch = 0.24;
    this.minYaw = -0.48;
    this.maxYaw = 0.48;
    this.minPitch = 0.04;
    this.maxPitch = 0.84;

    this.recoilOffset = 0;
    this.recoilVelocity = 0;
    this.pulseTime = 0;

    this._raycaster = new THREE.Raycaster();
    this._buildModel();
    this._buildTrajectoryPreview();
    this.applyAimTransform();
  }

  _buildModel() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.82, flatShading: true });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.88, flatShading: true });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.42, metalness: 0.65, flatShading: true });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf4b942, roughness: 0.3, metalness: 0.78, flatShading: true });

    // Yaw rotating turret carriage
    this.yawGroup = new THREE.Group();
    this.root.add(this.yawGroup);

    // Carriage side cheeks
    const cheekGeo = new THREE.BoxGeometry(0.32, 0.75, 2.0);
    const leftCheek = new THREE.Mesh(cheekGeo, woodMat);
    leftCheek.position.set(-0.68, 0.68, 0.15);
    leftCheek.castShadow = true;
    leftCheek.receiveShadow = true;

    const rightCheek = new THREE.Mesh(cheekGeo, woodMat);
    rightCheek.position.set(0.68, 0.68, 0.15);
    rightCheek.castShadow = true;
    rightCheek.receiveShadow = true;

    // Crossbar bed
    const bedGeo = new THREE.BoxGeometry(1.45, 0.28, 1.8);
    const bed = new THREE.Mesh(bedGeo, darkWoodMat);
    bed.position.set(0, 0.42, 0.2);
    bed.castShadow = true;
    bed.receiveShadow = true;
    this.yawGroup.add(leftCheek, rightCheek, bed);

    // 4 chunky wheels with brass hubcaps
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 12);
    const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.26, 8);
    const wheelPositions = [
      [-0.86, 0.42, -0.52],
      [0.86, 0.42, -0.52],
      [-0.86, 0.42, 0.75],
      [0.86, 0.42, 0.75]
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, darkWoodMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      this.yawGroup.add(wheel);

      const hub = new THREE.Mesh(hubGeo, brassMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, wy, wz);
      this.yawGroup.add(hub);
    }

    // Pitch pivot for the barrel (facing -Z toward tower)
    this.pitchGroup = new THREE.Group();
    this.pitchGroup.position.set(0, 1.05, 0.05);
    this.yawGroup.add(this.pitchGroup);

    // Recoil sliding barrel group
    this.barrelGroup = new THREE.Group();
    this.pitchGroup.add(this.barrelGroup);

    // Main tapered iron barrel along -Z
    const barrelGeo = new THREE.CylinderGeometry(0.32, 0.46, 2.7, 14);
    const barrel = new THREE.Mesh(barrelGeo, ironMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.68);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    this.barrelGroup.add(barrel);

    // Breech knob at back
    const breechGeo = new THREE.SphereGeometry(0.45, 12, 10);
    const breech = new THREE.Mesh(breechGeo, ironMat);
    breech.position.set(0, 0, 0.65);
    breech.castShadow = true;
    this.barrelGroup.add(breech);

    const knobGeo = new THREE.SphereGeometry(0.2, 10, 8);
    const knob = new THREE.Mesh(knobGeo, brassMat);
    knob.position.set(0, 0, 1.12);
    this.barrelGroup.add(knob);

    // Brass decorative reinforcement bands
    const bandPositions = [
      { z: -1.98, r: 0.36, tube: 0.075 },
      { z: -1.15, r: 0.39, tube: 0.055 },
      { z: -0.15, r: 0.45, tube: 0.06 }
    ];
    for (const bp of bandPositions) {
      const bandGeo = new THREE.TorusGeometry(bp.r, bp.tube, 8, 16);
      const band = new THREE.Mesh(bandGeo, brassMat);
      band.position.set(0, 0, bp.z);
      band.castShadow = true;
      this.barrelGroup.add(band);
    }

    // Dark bore inside muzzle
    const boreGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12);
    const boreMat = new THREE.MeshBasicMaterial({ color: 0x0b0d12 });
    const bore = new THREE.Mesh(boreGeo, boreMat);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0, -2.02);
    this.barrelGroup.add(bore);

    // Muzzle anchor point
    this.muzzleAnchor = new THREE.Object3D();
    this.muzzleAnchor.position.set(0, 0, -2.25);
    this.barrelGroup.add(this.muzzleAnchor);
  }

  _buildTrajectoryPreview() {
    this.trajectoryGroup = new THREE.Group();
    this.scene.add(this.trajectoryGroup);

    this.trajectoryDots = [];
    const dotGeo = new THREE.SphereGeometry(0.14, 10, 8);
    for (let i = 0; i < TRAJECTORY_DOTS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85 * (1 - (i / TRAJECTORY_DOTS) * 0.65)
      });
      const dot = new THREE.Mesh(dotGeo, mat);
      const scale = 1.0 - (i / TRAJECTORY_DOTS) * 0.45;
      dot.scale.setScalar(scale);
      this.trajectoryGroup.add(dot);
      this.trajectoryDots.push(dot);
    }

    // Glowing impact reticle ring
    const reticleGeo = new THREE.RingGeometry(0.45, 0.72, 24);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthTest: false
    });
    this.reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticleMesh.renderOrder = 20;
    this.trajectoryGroup.add(this.reticleMesh);
  }

  setAim(yaw, pitch) {
    this.yaw = THREE.MathUtils.clamp(yaw, this.minYaw, this.maxYaw);
    this.pitch = THREE.MathUtils.clamp(pitch, this.minPitch, this.maxPitch);
    this.applyAimTransform();
  }

  adjustAim(deltaYaw, deltaPitch) {
    this.setAim(this.yaw + deltaYaw, this.pitch + deltaPitch);
  }

  resetAim() {
    this.setAim(0, 0.23);
  }

  applyAimTransform() {
    this.yawGroup.rotation.y = this.yaw;
    this.pitchGroup.rotation.x = this.pitch;
  }

  triggerRecoil(strength = 0.65) {
    this.recoilOffset = Math.min(0.85, strength);
    this.recoilVelocity = 0;
  }

  getMuzzleWorldPosition(target = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    return this.muzzleAnchor.getWorldPosition(target);
  }

  getAimDirection(target = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    const q = new THREE.Quaternion();
    this.pitchGroup.getWorldQuaternion(q);
    return target.set(0, 0, -1).applyQuaternion(q).normalize();
  }

  setTrajectoryVisible(visible) {
    this.trajectoryGroup.visible = visible;
  }

  updateTrajectory(weaponDef, gravityY = -18.5, towerMeshes = [], isAiming = false) {
    if (!this.trajectoryGroup.visible || !weaponDef) return;

    const start = this.getMuzzleWorldPosition();
    const dir = this.getAimDirection();
    const vx = dir.x * weaponDef.speed;
    const vy = dir.y * weaponDef.speed;
    const vz = dir.z * weaponDef.speed;
    const g = gravityY * weaponDef.gravityScale;

    const accentColor =
      weaponDef.id === 'bomb'
        ? 0xff5a5f
        : weaponDef.id === 'cluster'
          ? 0x38e8ff
          : weaponDef.id === 'rocket'
            ? 0xff9f1c
            : 0xfff3b0;

    const stepDt = weaponDef.id === 'rocket' ? 0.032 : 0.042;
    const prev = start.clone();
    const curr = new THREE.Vector3();
    const segDir = new THREE.Vector3();
    let hitPoint = null;
    let hitNormal = new THREE.Vector3(0, 0, 1);

    for (let i = 0; i < TRAJECTORY_DOTS; i++) {
      const dot = this.trajectoryDots[i];
      if (hitPoint) {
        dot.visible = false;
        continue;
      }

      const t = (i + 1) * stepDt + ((this.pulseTime * 0.45) % stepDt);
      curr.set(
        start.x + vx * t,
        start.y + vy * t + 0.5 * g * t * t,
        start.z + vz * t
      );

      // Raycast segment against tower blocks for accurate impact reticle!
      segDir.subVectors(curr, prev);
      const segLen = segDir.length();
      if (segLen > 0.001 && towerMeshes.length > 0 && i >= 2) {
        this._raycaster.set(prev, segDir.normalize());
        this._raycaster.far = segLen;
        const hits = this._raycaster.intersectObjects(towerMeshes, false);
        if (hits.length > 0) {
          hitPoint = hits[0].point.clone();
          if (hits[0].face) {
            hitNormal.copy(hits[0].face.normal).transformDirection(hits[0].object.matrixWorld).normalize();
          }
          dot.visible = false;
          continue;
        }
      }

      // Ground stop
      if (curr.y <= 0.08) {
        hitPoint = new THREE.Vector3(curr.x, 0.08, curr.z);
        hitNormal.set(0, 1, 0);
        dot.visible = false;
        continue;
      }

      dot.visible = true;
      dot.position.copy(curr);
      dot.material.color.setHex(accentColor);
      dot.material.opacity = (isAiming ? 0.95 : 0.62) * (1 - (i / TRAJECTORY_DOTS) * 0.62);
      prev.copy(curr);
    }

    if (hitPoint) {
      this.reticleMesh.visible = true;
      this.reticleMesh.position.copy(hitPoint).addScaledVector(hitNormal, 0.08);
      this.reticleMesh.lookAt(hitPoint.clone().add(hitNormal));
      const pulse = 1 + Math.sin(this.pulseTime * 7) * 0.14;
      this.reticleMesh.scale.setScalar((isAiming ? 1.15 : 0.9) * pulse);
      this.reticleMesh.material.color.setHex(accentColor);
      this.reticleMesh.material.opacity = isAiming ? 0.95 : 0.58;
    } else {
      this.reticleMesh.visible = false;
    }
  }

  update(dt) {
    this.pulseTime += dt;
    // Spring-damped barrel recoil recovery
    if (this.recoilOffset > 0.001 || Math.abs(this.recoilVelocity) > 0.001) {
      const spring = -this.recoilOffset * 95;
      const damper = -this.recoilVelocity * 14;
      this.recoilVelocity += (spring + damper) * dt;
      this.recoilOffset += this.recoilVelocity * dt;
      if (this.recoilOffset < 0) {
        this.recoilOffset = 0;
        this.recoilVelocity = 0;
      }
      this.barrelGroup.position.z = this.recoilOffset;
    } else {
      this.barrelGroup.position.z = 0;
    }
  }
}
