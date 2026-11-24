import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  constructor() {
    this.RAPIER = null;
    this.world = null;
    this.eventQueue = null;
    this.colliderMap = new Map();
    this.paused = false;
    this.gravity = { x: 0, y: -18.5, z: 0 };
    this.fixedDt = 1 / 60;
    this.accumulator = 0;
  }

  async init() {
    await RAPIER.init();
    this.RAPIER = RAPIER;
    this.resetWorld();
  }

  resetWorld() {
    if (this.eventQueue) {
      this.eventQueue.free();
      this.eventQueue = null;
    }
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.colliderMap.clear();
    this.accumulator = 0;

    this.world = new this.RAPIER.World(this.gravity);
    // Slightly tune solver for crisp tower stacking stability
    this.world.integrationParameters.numSolverIterations = 8;
    this.eventQueue = new this.RAPIER.EventQueue(true);

    this.createArenaColliders();
  }

  createArenaColliders() {
    const R = this.RAPIER;

    // Main circular/octagonal tower pedestal (top surface strictly at y = 0)
    const pedestalBody = this.world.createRigidBody(
      R.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)
    );
    const pedestalCol = this.world.createCollider(
      R.ColliderDesc.cylinder(0.5, 7.2)
        .setFriction(0.85)
        .setRestitution(0.1)
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      pedestalBody
    );
    this.colliderMap.set(pedestalCol.handle, { type: 'ground', name: 'pedestal', ref: null });

    // Lower surrounding grass island ring (top at y = -1.25) so fallen blocks bounce off the edge naturally
    const islandBody = this.world.createRigidBody(
      R.RigidBodyDesc.fixed().setTranslation(0, -2.25, 0)
    );
    const islandCol = this.world.createCollider(
      R.ColliderDesc.cylinder(1.0, 14.0)
        .setFriction(0.75)
        .setRestitution(0.12)
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      islandBody
    );
    this.colliderMap.set(islandCol.handle, { type: 'ground', name: 'island', ref: null });
  }

  createBlockBody({ x, y, z, w, h, d, shape = 'box', density, friction, restitution, ref }) {
    const R = this.RAPIER;
    const bodyDesc = R.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(0.08)
      .setAngularDamping(0.14)
      .setCanSleep(true);

    const body = this.world.createRigidBody(bodyDesc);

    const colDesc =
      shape === 'cylinder'
        ? R.ColliderDesc.cylinder(h / 2, Math.min(w, d) / 2)
        : R.ColliderDesc.cuboid(w / 2, h / 2, d / 2);

    colDesc
      .setDensity(density)
      .setFriction(friction)
      .setRestitution(restitution)
      .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS | R.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(12.0);

    const collider = this.world.createCollider(colDesc, body);
    this.colliderMap.set(collider.handle, { type: 'block', ref });
    return { body, collider };
  }

  createProjectileBody({ x, y, z, vx, vy, vz, radius, mass, gravityScale = 1.0, ref }) {
    const R = this.RAPIER;
    const bodyDesc = R.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinvel(vx, vy, vz)
      .setGravityScale(gravityScale)
      .setCcdEnabled(true)
      .setLinearDamping(0.01)
      .setAngularDamping(0.04);

    const body = this.world.createRigidBody(bodyDesc);

    const colDesc = R.ColliderDesc.ball(radius)
      .setMass(mass)
      .setFriction(0.4)
      .setRestitution(0.28)
      .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);

    const collider = this.world.createCollider(colDesc, body);
    this.colliderMap.set(collider.handle, { type: 'projectile', ref });
    return { body, collider };
  }

  removeBody(body, collider) {
    if (!this.world) return;
    if (collider) {
      this.colliderMap.delete(collider.handle);
    }
    if (body && this.world.bodies.contains(body.handle)) {
      this.world.removeRigidBody(body);
    }
  }

  getEntityByCollider(handle) {
    return this.colliderMap.get(handle) || null;
  }

  step(deltaSeconds, onStepCallback = null) {
    if (this.paused || !this.world) return;
    const clamped = Math.min(deltaSeconds, 0.05);
    this.accumulator += clamped;

    let steps = 0;
    const maxSteps = 3;
    while (this.accumulator >= this.fixedDt && steps < maxSteps) {
      this.world.step(this.eventQueue);
      if (onStepCallback) {
        onStepCallback(this.eventQueue);
      }
      this.accumulator -= this.fixedDt;
      steps++;
    }
  }

  setPaused(paused) {
    this.paused = paused;
  }

  dispose() {
    if (this.eventQueue) {
      this.eventQueue.free();
      this.eventQueue = null;
    }
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.colliderMap.clear();
  }
}
