import * as THREE from 'three';

const sphereGeo = new THREE.SphereGeometry(1, 14, 12);
const rocketBodyGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.5, 10);
const rocketNoseGeo = new THREE.ConeGeometry(0.32, 0.62, 10);
const rocketFinGeo = new THREE.BoxGeometry(0.08, 0.48, 0.42);
const fuseGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.35, 8);
const sparkGeo = new THREE.OctahedronGeometry(0.16, 0);

function buildProjectileVisual(weaponId) {
  const group = new THREE.Group();

  if (weaponId === 'cannonball') {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x262d38,
      roughness: 0.34,
      metalness: 0.78
    });
    const ball = new THREE.Mesh(sphereGeo, mat);
    ball.scale.setScalar(0.42);
    ball.castShadow = true;
    group.add(ball);
  } else if (weaponId === 'bomb') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a181c,
      roughness: 0.38,
      metalness: 0.6
    });
    const ball = new THREE.Mesh(sphereGeo, bodyMat);
    ball.scale.setScalar(0.54);
    ball.castShadow = true;
    group.add(ball);

    const bandGeo = new THREE.TorusGeometry(0.53, 0.06, 8, 16);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, roughness: 0.4 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    group.add(band);

    const capMat = new THREE.MeshStandardMaterial({ color: 0xf4b942, metalness: 0.7, roughness: 0.3 });
    const cap = new THREE.Mesh(fuseGeo, capMat);
    cap.position.y = 0.52;
    group.add(cap);

    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.y = 0.78;
    group.add(spark);
  } else if (weaponId === 'cluster') {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.35
    });
    const ball = new THREE.Mesh(sphereGeo, mat);
    ball.scale.setScalar(0.28);
    ball.castShadow = true;
    group.add(ball);
  } else if (weaponId === 'rocket') {
    // Oriented along -Z forward
    const inner = new THREE.Group();
    inner.rotation.x = -Math.PI / 2;
    group.add(inner);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.25 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, metalness: 0.2 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });

    const body = new THREE.Mesh(rocketBodyGeo, bodyMat);
    body.castShadow = true;
    inner.add(body);

    const nose = new THREE.Mesh(rocketNoseGeo, redMat);
    nose.position.y = 1.05;
    nose.castShadow = true;
    inner.add(nose);

    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(rocketFinGeo, redMat);
      const a = (i * Math.PI) / 2;
      fin.position.set(Math.sin(a) * 0.34, -0.52, Math.cos(a) * 0.34);
      fin.rotation.y = a;
      inner.add(fin);
    }

    const flame = new THREE.Mesh(sparkGeo, glowMat);
    flame.scale.set(1.2, 2.2, 1.2);
    flame.position.y = -0.95;
    inner.add(flame);
  }

  return group;
}

export class Projectile {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.active = false;
    this.weaponDef = null;
    this.body = null;
    this.collider = null;
    this.life = 0;
    this.maxLife = 5.5;
    this.trailTimer = 0;
    this.hasImpacted = false;

    // Pre-build visual variants for zero-allocation pooling
    this.root = new THREE.Group();
    this.root.visible = false;
    this.scene.add(this.root);

    this.visuals = {
      cannonball: buildProjectileVisual('cannonball'),
      bomb: buildProjectileVisual('bomb'),
      cluster: buildProjectileVisual('cluster'),
      rocket: buildProjectileVisual('rocket')
    };
    for (const v of Object.values(this.visuals)) {
      v.visible = false;
      this.root.add(v);
    }

    this._velVec = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
  }

  spawn(weaponDef, startPos, velocity) {
    this.deactivate();

    this.weaponDef = weaponDef;
    this.active = true;
    this.hasImpacted = false;
    this.life = 0;
    this.trailTimer = 0;

    for (const [id, mesh] of Object.entries(this.visuals)) {
      mesh.visible = id === weaponDef.id;
    }

    this.root.position.copy(startPos);
    this.root.visible = true;

    const { body, collider } = this.physicsWorld.createProjectileBody({
      x: startPos.x,
      y: startPos.y,
      z: startPos.z,
      vx: velocity.x,
      vy: velocity.y,
      vz: velocity.z,
      radius: weaponDef.radius,
      mass: weaponDef.mass,
      gravityScale: weaponDef.gravityScale,
      ref: this
    });

    this.body = body;
    this.collider = collider;
  }

  getPosition(target = new THREE.Vector3()) {
    if (this.body) {
      const t = this.body.translation();
      return target.set(t.x, t.y, t.z);
    }
    return target.copy(this.root.position);
  }

  update(dt, particleSystem) {
    if (!this.active || !this.body) return false;

    this.life += dt;
    const t = this.body.translation();
    const r = this.body.rotation();
    this.root.position.set(t.x, t.y, t.z);

    if (this.weaponDef.id === 'rocket') {
      const v = this.body.linvel();
      this._velVec.set(v.x, v.y, v.z);
      if (this._velVec.lengthSq() > 0.2) {
        this._lookTarget.copy(this.root.position).add(this._velVec);
        this.root.lookAt(this._lookTarget);
      }
    } else {
      this.root.quaternion.set(r.x, r.y, r.z, r.w);
    }

    // Flight trail effects
    this.trailTimer += dt;
    const interval = this.weaponDef.id === 'rocket' ? 0.018 : this.weaponDef.id === 'bomb' ? 0.032 : 0.045;
    if (particleSystem && this.trailTimer >= interval) {
      this.trailTimer = 0;
      const trailColor =
        this.weaponDef.id === 'rocket'
          ? 0xff7b00
          : this.weaponDef.id === 'bomb'
            ? 0xffb703
            : this.weaponDef.id === 'cluster'
              ? 0x38e8ff
              : 0xdbe2ec;
      particleSystem.spawnTrailPuff(
        this.root.position,
        trailColor,
        this.weaponDef.id === 'rocket' ? 0.36 : 0.22
      );
    }

    // Out-of-bounds or expired safety cleanup
    if (this.life >= this.maxLife || t.y < -12 || Math.hypot(t.x, t.z) > 65) {
      this.deactivate();
      return false;
    }

    return true;
  }

  deactivate() {
    this.active = false;
    this.root.visible = false;
    if (this.body || this.collider) {
      this.physicsWorld.removeBody(this.body, this.collider);
      this.body = null;
      this.collider = null;
    }
  }

  dispose() {
    this.deactivate();
    this.scene.remove(this.root);
  }
}
