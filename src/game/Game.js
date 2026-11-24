import * as THREE from 'three';
import { GameState, StateMachine } from './GameState.js';
import { LevelManager } from './LevelManager.js';
import { ScoreManager } from './ScoreManager.js';
import { SceneManager } from '../scene/SceneManager.js';
import { Lighting } from '../scene/Lighting.js';
import { Environment } from '../scene/Environment.js';
import { CameraController } from '../scene/CameraController.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { CollisionHandler } from '../physics/CollisionHandler.js';
import { ExplosionSystem } from '../physics/ExplosionSystem.js';
import { TowerManager } from '../tower/TowerManager.js';
import { Cannon } from '../weapons/Cannon.js';
import { WeaponManager } from '../weapons/WeaponManager.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { SoundManager } from '../effects/SoundManager.js';
import { MainMenu } from '../ui/MainMenu.js';
import { LevelSelector } from '../ui/LevelSelector.js';
import { GameHUD } from '../ui/GameHUD.js';
import { GameOver } from '../ui/GameOver.js';
import { WEAPON_ORDER } from '../levels/levelData.js';

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;

    this.stateMachine = new StateMachine(GameState.LOADING);
    this.stateBeforePause = GameState.READY;
    this.levelManager = new LevelManager();
    this.scoreManager = new ScoreManager();
    this.soundManager = new SoundManager();

    // Create loading overlay immediately
    this._createLoadingScreen();

    // 3D Scene & Effects
    this.sceneManager = new SceneManager(canvas);
    this.lighting = new Lighting(this.sceneManager.scene, this.sceneManager.isMobile);
    this.environment = new Environment(this.sceneManager.scene, this.sceneManager);
    this.screenShake = new ScreenShake();
    this.cameraController = new CameraController(this.sceneManager.camera, this.screenShake);
    this.particleSystem = new ParticleSystem(this.sceneManager.scene);

    // Physics & Entities
    this.physicsWorld = new PhysicsWorld();
    this.cannon = new Cannon(this.sceneManager.scene);
    this.cannon.setTrajectoryVisible(false);

    this.towerManager = new TowerManager({
      physicsWorld: this.physicsWorld,
      scene: this.sceneManager.scene,
      particleSystem: this.particleSystem,
      soundManager: this.soundManager,
      onBlockDestroyed: (block, pos, shattered) => this._handleBlockDestroyed(block, pos, shattered),
      onExplosiveDetonate: (pos, matDef) => this._handleExplosiveDetonate(pos, matDef)
    });

    this.explosionSystem = new ExplosionSystem({
      towerManager: this.towerManager,
      particleSystem: this.particleSystem,
      screenShake: this.screenShake,
      soundManager: this.soundManager,
      lighting: this.lighting,
      cameraController: this.cameraController
    });

    this.weaponManager = new WeaponManager({
      scene: this.sceneManager.scene,
      physicsWorld: this.physicsWorld,
      particleSystem: this.particleSystem,
      soundManager: this.soundManager
    });

    this.collisionHandler = new CollisionHandler({
      physicsWorld: this.physicsWorld,
      particleSystem: this.particleSystem,
      soundManager: this.soundManager,
      onProjectileHit: (proj, other) => this._handleProjectileHit(proj, other),
      onBlockImpact: (block, dmg) => this.towerManager.damageBlock(block, dmg, false)
    });

    // Apply persisted graphics settings
    const shadows = this.levelManager.getShadowsEnabled();
    this.sceneManager.setShadowsEnabled(shadows);
    this.lighting.setShadowsEnabled(shadows);

    // UI Screens
    this._initUI();

    // Input & Loop state
    this.pointer = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      dragged: false
    };
    this.keysPressed = new Set();

    this.rafId = null;
    this.lastFrameTime = 0;
    this.shotElapsed = 0;
    this.settleTimer = 0;
    this.winGraceTimer = 0;
    this.winPending = false;
    this.outOfAmmoTimer = 0;
    this.isDisposed = false;

    this._bindInputEvents();
    this._bindLifecycleEvents();
    this._bindStateTransitions();
  }

  _createLoadingScreen() {
    this.loadingEl = document.createElement('div');
    this.loadingEl.className = 'screen loading-screen';
    this.loadingEl.innerHTML = `
      <div class="loading-box">
        <div class="loading-title">TOWER <span>BLAST</span></div>
        <div class="loading-bar-track"><div class="loading-bar-fill" id="loading-fill"></div></div>
        <div class="loading-status" id="loading-status">Initializing 3D Physics Engine...</div>
      </div>
    `;
    this.uiRoot.appendChild(this.loadingEl);
    this.loadingFill = this.loadingEl.querySelector('#loading-fill');
    this.loadingStatus = this.loadingEl.querySelector('#loading-status');
  }

  _initUI() {
    this.mainMenu = new MainMenu(this.uiRoot, {
      onPlay: () => {
        this.soundManager.playButtonClick();
        this.startLevel(this.levelManager.getNextPlayableLevelId());
      },
      onOpenLevels: () => {
        this.soundManager.playButtonClick();
        this.openLevelSelect();
      },
      onToggleMute: () => {
        this.soundManager.unlock();
        this.soundManager.toggleMute();
        this._syncAllAudioUI();
        this.soundManager.playButtonClick();
      },
      onToggleSfx: (enabled) => {
        this.soundManager.unlock();
        this.soundManager.setSfxEnabled(enabled);
        this.soundManager.playButtonClick();
      },
      onToggleMusic: (enabled) => {
        this.soundManager.unlock();
        this.soundManager.setMusicEnabled(enabled);
        this.soundManager.playButtonClick();
      },
      onToggleShadows: (enabled) => {
        this.levelManager.setShadowsEnabled(enabled);
        this.sceneManager.setShadowsEnabled(enabled);
        this.lighting.setShadowsEnabled(enabled);
        this.soundManager.playButtonClick();
      },
      onResetProgress: () => {
        this.levelManager.resetProgress();
        this._syncMainMenuUI();
        this.soundManager.playButtonClick();
      },
      onButtonClick: () => this.soundManager.playButtonClick()
    });

    this.levelSelector = new LevelSelector(this.uiRoot, {
      onBack: () => {
        this.soundManager.playButtonClick();
        this.openMainMenu();
      },
      onSelectLevel: (levelId) => {
        this.soundManager.playButtonClick();
        this.startLevel(levelId);
      }
    });

    this.gameHUD = new GameHUD(this.uiRoot, {
      onSelectWeapon: (weaponId) => {
        if (!this.stateMachine.isAny(GameState.READY, GameState.AIMING)) return;
        if (this.weaponManager.selectWeapon(weaponId)) {
          this._syncHUD();
        }
      },
      onFire: () => {
        this.soundManager.unlock();
        this.fireCannon();
      },
      onPause: () => {
        this.soundManager.playButtonClick();
        this.togglePause();
      },
      onResume: () => {
        this.soundManager.playButtonClick();
        this.resumeGame();
      },
      onRestart: () => {
        this.soundManager.playButtonClick();
        this.startLevel(this.levelManager.currentLevelId);
      },
      onToggleMute: () => {
        this.soundManager.unlock();
        this.soundManager.toggleMute();
        this._syncAllAudioUI();
        this.soundManager.playButtonClick();
      },
      onLevelSelect: () => {
        this.soundManager.playButtonClick();
        this.openLevelSelect();
      },
      onMainMenu: () => {
        this.soundManager.playButtonClick();
        this.openMainMenu();
      }
    });

    this.gameOver = new GameOver(this.uiRoot, {
      onNextLevel: () => {
        this.soundManager.playButtonClick();
        if (this.levelManager.hasNextLevel()) {
          this.startLevel(this.levelManager.currentLevelId + 1);
        } else {
          this.openLevelSelect();
        }
      },
      onRetry: () => {
        this.soundManager.playButtonClick();
        this.startLevel(this.levelManager.currentLevelId);
      },
      onLevelSelect: () => {
        this.soundManager.playButtonClick();
        this.openLevelSelect();
      },
      onMainMenu: () => {
        this.soundManager.playButtonClick();
        this.openMainMenu();
      }
    });
  }

  _bindStateTransitions() {
    this.stateMachine.onChange((next, prev) => {
      // Hide/show screens according to state
      if (next === GameState.MAIN_MENU) {
        this.mainMenu.show();
        this.levelSelector.hide();
        this.gameHUD.hide();
        this.gameOver.hide();
        this.cannon.setTrajectoryVisible(false);
        this.cameraController.setMode('menu');
        this.physicsWorld.setPaused(false);
      } else if (next === GameState.LEVEL_SELECT) {
        this.mainMenu.hide();
        this.levelSelector.render(this.levelManager);
        this.levelSelector.show();
        this.gameHUD.hide();
        this.gameOver.hide();
        this.cannon.setTrajectoryVisible(false);
        this.cameraController.setMode('menu');
        this.physicsWorld.setPaused(false);
      } else if (next === GameState.READY || next === GameState.AIMING) {
        this.mainMenu.hide();
        this.levelSelector.hide();
        this.gameOver.hide();
        this.gameHUD.show();
        this.gameHUD.setPaused(false);
        this.cannon.setTrajectoryVisible(true);
        this.cameraController.setMode('gameplay');
        this.physicsWorld.setPaused(false);
        this._syncHUD();
      } else if (next === GameState.SHOOTING || next === GameState.EXPLOSION) {
        this.cannon.setTrajectoryVisible(false);
        this.physicsWorld.setPaused(false);
        this._syncHUD();
      } else if (next === GameState.PAUSED) {
        this.stateBeforePause = prev;
        this.physicsWorld.setPaused(true);
        this.gameHUD.setPaused(true);
      } else if (next === GameState.LEVEL_COMPLETED) {
        this.cannon.setTrajectoryVisible(false);
        this.cameraController.setMode('victory');
        this.physicsWorld.setPaused(false);
        this._syncHUD();
      } else if (next === GameState.LEVEL_FAILED) {
        this.cannon.setTrajectoryVisible(false);
        this.physicsWorld.setPaused(false);
        this._syncHUD();
      }
    });
  }

  async init() {
    try {
      this.loadingFill.style.width = '35%';
      await this.physicsWorld.init();
      this.loadingFill.style.width = '80%';
      this.loadingStatus.textContent = 'Constructing Tower Arena...';

      // Build showcase level in the live 3D background for the main menu
      const showcaseLevel = this.levelManager.getLevel(this.levelManager.getNextPlayableLevelId());
      this._buildShowcase(showcaseLevel);

      this.loadingFill.style.width = '100%';
      this.loadingStatus.textContent = 'Ready!';

      this._syncMainMenuUI();
      this._syncAllAudioUI();

      // Start render loop
      this.lastFrameTime = performance.now();
      this.rafId = requestAnimationFrame((ts) => this._loop(ts));

      window.setTimeout(() => {
        this.loadingEl.classList.add('fade-out');
        this.stateMachine.setState(GameState.MAIN_MENU);
        window.setTimeout(() => {
          this.loadingEl.classList.add('hidden');
        }, 350);
      }, 220);
    } catch (err) {
      console.error('[TowerBlast] Initialization failed:', err);
      this.loadingStatus.textContent = `Initialization error: ${err.message}`;
    }
  }

  _buildShowcase(levelConfig) {
    this.explosionSystem.clearPending();
    this.weaponManager.clearProjectiles();
    this.particleSystem.clear();
    this.physicsWorld.resetWorld();
    this.environment.applyTheme(levelConfig.skyTheme);
    this.lighting.applyTheme(levelConfig.skyTheme);
    const { towerHeight } = this.towerManager.buildTower(levelConfig);
    this.collisionHandler.setSpawnGrace(0.75);
    this.cameraController.setTowerHeight(towerHeight);
    this.cameraController.setMode('menu');
    this.cameraController.snapToMode();
  }

  openMainMenu() {
    this.winPending = false;
    this.pointer.active = false;
    const showcaseLevel = this.levelManager.getLevel(this.levelManager.getNextPlayableLevelId());
    this._buildShowcase(showcaseLevel);
    this._syncMainMenuUI();
    this.stateMachine.setState(GameState.MAIN_MENU);
  }

  openLevelSelect() {
    this.winPending = false;
    this.pointer.active = false;
    this.stateMachine.setState(GameState.LEVEL_SELECT);
  }

  startLevel(levelId) {
    const levelConfig = this.levelManager.setCurrentLevel(levelId);

    // Cleanly reset world, effects, projectiles, score & timers
    this.winPending = false;
    this.winGraceTimer = 0;
    this.shotElapsed = 0;
    this.settleTimer = 0;
    this.outOfAmmoTimer = 0;
    this.pointer.active = false;

    this.explosionSystem.clearPending();
    this.weaponManager.clearProjectiles();
    this.particleSystem.clear();
    this.screenShake.reset();
    this.scoreManager.reset();

    // Reset Rapier physics world cleanly so no phantom velocities or colliders linger
    this.physicsWorld.resetWorld();
    this.physicsWorld.setPaused(false);

    // Apply atmospheric sky & lighting theme
    this.environment.applyTheme(levelConfig.skyTheme);
    this.lighting.applyTheme(levelConfig.skyTheme);

    // Construct the tower
    const { towerHeight } = this.towerManager.buildTower(levelConfig);
    this.collisionHandler.setSpawnGrace(0.55);

    // Load level ammo & reset cannon aim
    this.weaponManager.loadAmmo(levelConfig.ammo);
    this.cannon.resetAim();

    // Frame camera for this tower height
    this.cameraController.setTowerHeight(towerHeight);
    this.cameraController.setAim(this.cannon.yaw, this.cannon.pitch);
    this.cameraController.setMode('gameplay');
    this.cameraController.snapToMode();

    // Update UI
    this.gameHUD.setLevelInfo(levelConfig);
    this.gameHUD.updateScore(0);
    this.gameHUD.updateProgress(0, levelConfig.targetDestruction);
    this._syncAllAudioUI();

    this.stateMachine.setState(GameState.READY);
    this._syncHUD();
  }

  togglePause() {
    if (this.stateMachine.is(GameState.PAUSED)) {
      this.resumeGame();
    } else if (
      this.stateMachine.isAny(GameState.READY, GameState.AIMING, GameState.SHOOTING, GameState.EXPLOSION)
    ) {
      this.stateMachine.setState(GameState.PAUSED);
    }
  }

  resumeGame() {
    if (!this.stateMachine.is(GameState.PAUSED)) return;
    const target =
      this.stateBeforePause === GameState.AIMING ? GameState.READY : this.stateBeforePause;
    this.stateMachine.setState(target || GameState.READY);
  }

  fireCannon() {
    if (!this.stateMachine.isAny(GameState.READY, GameState.AIMING)) return;
    if (!this.weaponManager.canFire()) return;

    const result = this.weaponManager.fire(this.cannon);
    if (!result) return;

    this.shotElapsed = 0;
    this.settleTimer = 0;
    this.outOfAmmoTimer = 0;
    this.stateMachine.setState(GameState.SHOOTING);
    this._syncHUD();
  }

  _handleProjectileHit(projectile, otherEntity) {
    if (!projectile.active || projectile.hasImpacted) return;
    projectile.hasImpacted = true;

    const hitPos = projectile.getPosition();
    const w = projectile.weaponDef;

    // Direct kinetic hit damage on the struck block
    if (otherEntity.type === 'block' && otherEntity.ref && !otherEntity.ref.destroyed) {
      this.towerManager.damageBlock(otherEntity.ref, w.directDamage, false);
    }

    // Trigger blast shockwave & explosion effects
    const blastColor =
      w.id === 'cluster' ? 0x06b6d4 : w.id === 'cannonball' ? 0xffb703 : 0xff5a1f;

    this.explosionSystem.triggerExplosion(hitPos, {
      radius: w.blastRadius,
      force: w.blastForce,
      damage: w.blastDamage,
      shake: w.shake,
      color: blastColor,
      isChain: false
    });

    projectile.deactivate();

    if (this.stateMachine.is(GameState.SHOOTING)) {
      this.stateMachine.setState(GameState.EXPLOSION);
    }
  }

  _handleExplosiveDetonate(pos, matDef) {
    this.explosionSystem.queueExplosion(
      pos,
      {
        radius: matDef.blastRadius || 5.8,
        force: matDef.blastForce || 64,
        damage: matDef.blastDamage || 115,
        shake: 0.85,
        color: 0xff3b30,
        isChain: true
      },
      0.1
    );
    this.gameHUD.spawnFloatingScore('BOOM! 💥', true);
  }

  _handleBlockDestroyed(block, _pos, shattered) {
    // Only score during active gameplay
    if (
      !this.stateMachine.isAny(
        GameState.READY,
        GameState.AIMING,
        GameState.SHOOTING,
        GameState.EXPLOSION
      )
    ) {
      return;
    }

    const res = this.scoreManager.registerBlockDestruction(block.materialDef.score, shattered);
    this.gameHUD.updateScore(this.scoreManager.score);

    const levelCfg = this.levelManager.getCurrentLevel();
    const ratio = this.towerManager.getDestructionRatio();
    this.gameHUD.updateProgress(ratio, levelCfg.targetDestruction);

    if (res.combo >= 2) {
      this.gameHUD.showCombo(res.combo, res.awarded);
      if (res.combo % 2 === 0 || res.combo >= 5) {
        this.soundManager.playCombo(res.combo);
      }
    } else if (shattered) {
      this.gameHUD.spawnFloatingScore(`+${res.awarded}`);
    }

    // Arm victory countdown once target destruction percentage is achieved
    if (!this.winPending && ratio >= levelCfg.targetDestruction) {
      this.winPending = true;
      this.winGraceTimer = 1.05;
      this.cannon.setTrajectoryVisible(false);
      this._syncHUD();
    }
  }

  _completeLevel() {
    if (this.stateMachine.is(GameState.LEVEL_COMPLETED)) return;
    this.winPending = false;

    const levelCfg = this.levelManager.getCurrentLevel();
    const ratio = this.towerManager.getDestructionRatio();
    const remainingAmmo = this.weaponManager.getTotalAmmo();

    const summary = this.scoreManager.finalizeLevel(levelCfg, ratio, remainingAmmo);
    const { isNewBest, rewards } = this.levelManager.recordLevelWin(
      levelCfg.id,
      summary.finalScore,
      summary.stars,
      summary
    );

    this._syncMainMenuUI();
    this.gameHUD.updateScore(summary.finalScore);
    this.gameHUD.updateProgress(ratio, levelCfg.targetDestruction);
    this.soundManager.playLevelComplete();

    this.stateMachine.setState(GameState.LEVEL_COMPLETED);
    this.gameOver.showResult({
      won: true,
      levelConfig: levelCfg,
      hasNextLevel: this.levelManager.hasNextLevel(),
      nextLevelId: this.levelManager.getNextPlayableLevelId(),
      isNewBest,
      ...summary,
      rewards
    });
  }

  _failLevel() {
    if (this.stateMachine.is(GameState.LEVEL_FAILED)) return;
    const levelCfg = this.levelManager.getCurrentLevel();
    const ratio = this.towerManager.getDestructionRatio();

    this.soundManager.playLevelFail();
    this.stateMachine.setState(GameState.LEVEL_FAILED);
    this.gameOver.showResult({
      won: false,
      levelConfig: levelCfg,
      hasNextLevel: false,
      destructionPercent: Math.round(ratio * 100),
      blockPoints: this.scoreManager.blockPoints,
      finalScore: this.scoreManager.score,
      stars: 0
    });
  }

  _syncHUD() {
    const canFire =
      this.stateMachine.isAny(GameState.READY, GameState.AIMING) && !this.winPending;
    this.gameHUD.updateWeapons(
      this.weaponManager.ammo,
      this.weaponManager.selectedWeaponId,
      canFire
    );
  }

  _syncMainMenuUI() {
    this.mainMenu.update({
      totalStars: this.levelManager.getTotalStars(),
      maxStars: this.levelManager.getMaxStars(),
      nextLevelId: this.levelManager.getNextPlayableLevelId(),
      muted: this.soundManager.muted,
      sfxEnabled: this.soundManager.sfxEnabled,
      musicEnabled: this.soundManager.musicEnabled,
      shadowsEnabled: this.levelManager.getShadowsEnabled(),
      coins: this.levelManager.getCoins(),
      dailyMissions: this.levelManager.getDailyMissions(),
      dailyDate: this.levelManager.getDailySummary().date
    });
  }

  _syncAllAudioUI() {
    this.gameHUD.updateSound(this.soundManager.muted);
    this._syncMainMenuUI();
  }

  _bindInputEvents() {
    // Pointer aiming & tap/click shooting on the 3D canvas
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      this.soundManager.unlock();
      if (!this.stateMachine.isAny(GameState.READY, GameState.AIMING)) return;

      this.pointer.active = true;
      this.pointer.pointerId = e.pointerId;
      this.pointer.startX = e.clientX;
      this.pointer.startY = e.clientY;
      this.pointer.lastX = e.clientX;
      this.pointer.lastY = e.clientY;
      this.pointer.dragged = false;

      if (this.canvas.setPointerCapture) {
        try {
          this.canvas.setPointerCapture(e.pointerId);
        } catch {
          // Ignore capture errors on synthetic events
        }
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.pointer.active || e.pointerId !== this.pointer.pointerId) return;
      if (!this.stateMachine.isAny(GameState.READY, GameState.AIMING)) return;

      const dx = e.clientX - this.pointer.lastX;
      const dy = e.clientY - this.pointer.lastY;
      const totalDist = Math.hypot(
        e.clientX - this.pointer.startX,
        e.clientY - this.pointer.startY
      );

      if (totalDist > 6) {
        this.pointer.dragged = true;
        if (this.stateMachine.is(GameState.READY)) {
          this.stateMachine.setState(GameState.AIMING);
        }
      }

      if (this.pointer.dragged) {
        // Intuitive aiming: drag right aims right, drag up aims higher
        const sensX = 0.0026;
        const sensY = 0.0024;
        this.cannon.adjustAim(-dx * sensX, -dy * sensY);
        this.cameraController.setAim(this.cannon.yaw, this.cannon.pitch);
      }

      this.pointer.lastX = e.clientX;
      this.pointer.lastY = e.clientY;
    });

    const handlePointerEnd = (e) => {
      if (!this.pointer.active || e.pointerId !== this.pointer.pointerId) return;
      const wasDrag = this.pointer.dragged;
      this.pointer.active = false;
      this.pointer.pointerId = null;

      if (!this.stateMachine.isAny(GameState.READY, GameState.AIMING)) return;

      if (!wasDrag) {
        // Quick click / tap shoots!
        this.fireCannon();
      } else if (this.stateMachine.is(GameState.AIMING)) {
        this.stateMachine.setState(GameState.READY);
      }
    };

    this.canvas.addEventListener('pointerup', handlePointerEnd);
    this.canvas.addEventListener('pointercancel', (e) => {
      if (!this.pointer.active || e.pointerId !== this.pointer.pointerId) return;
      this.pointer.active = false;
      this.pointer.pointerId = null;
      this.pointer.dragged = false;
      if (this.stateMachine.is(GameState.AIMING)) {
        this.stateMachine.setState(GameState.READY);
      }
    });

    // Prevent accidental scroll/pinch gestures on mobile canvas
    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        if (this.stateMachine.isAny(GameState.READY, GameState.AIMING, GameState.SHOOTING, GameState.EXPLOSION)) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      this.keysPressed.add(e.code);

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (
          this.stateMachine.isAny(
            GameState.READY,
            GameState.AIMING,
            GameState.SHOOTING,
            GameState.EXPLOSION,
            GameState.PAUSED
          )
        ) {
          e.preventDefault();
          this.togglePause();
        }
        return;
      }

      if (e.code === 'KeyR') {
        if (
          this.stateMachine.isAny(
            GameState.READY,
            GameState.AIMING,
            GameState.SHOOTING,
            GameState.EXPLOSION,
            GameState.PAUSED,
            GameState.LEVEL_FAILED,
            GameState.LEVEL_COMPLETED
          )
        ) {
          e.preventDefault();
          this.soundManager.playButtonClick();
          this.startLevel(this.levelManager.currentLevelId);
        }
        return;
      }

      if (e.code === 'Space' && this.stateMachine.isAny(GameState.READY, GameState.AIMING)) {
        e.preventDefault();
        this.soundManager.unlock();
        this.fireCannon();
        return;
      }

      // Weapon hotkeys 1-4
      const digitMap = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
      if (e.code in digitMap && this.stateMachine.isAny(GameState.READY, GameState.AIMING)) {
        const wId = WEAPON_ORDER[digitMap[e.code]];
        if (this.weaponManager.selectWeapon(wId)) {
          this._syncHUD();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
    });
  }

  _bindLifecycleEvents() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.physicsWorld.setPaused(true);
      } else if (!this.stateMachine.is(GameState.PAUSED)) {
        this.physicsWorld.setPaused(false);
        this.lastFrameTime = performance.now();
      }
    });
  }

  _handleKeyboardAim(dt) {
    if (!this.stateMachine.isAny(GameState.READY, GameState.AIMING)) return;
    let dYaw = 0;
    let dPitch = 0;
    const speed = 0.72;
    if (this.keysPressed.has('ArrowLeft') || this.keysPressed.has('KeyA')) dYaw += speed * dt;
    if (this.keysPressed.has('ArrowRight') || this.keysPressed.has('KeyD')) dYaw -= speed * dt;
    if (this.keysPressed.has('ArrowUp') || this.keysPressed.has('KeyW')) dPitch += speed * dt;
    if (this.keysPressed.has('ArrowDown') || this.keysPressed.has('KeyS')) dPitch -= speed * dt;
    if (dYaw !== 0 || dPitch !== 0) {
      this.cannon.adjustAim(dYaw, dPitch);
      this.cameraController.setAim(this.cannon.yaw, this.cannon.pitch);
    }
  }

  _updateGameplayFlow(dt) {
    const state = this.stateMachine.current;
    if (state === GameState.PAUSED) return;

    this.scoreManager.update(dt);
    this._handleKeyboardAim(dt);

    // Handle pending victory grace window so chain combos & falling blocks finish awarding points
    if (this.winPending && this.stateMachine.isAny(GameState.READY, GameState.AIMING, GameState.SHOOTING, GameState.EXPLOSION)) {
      this.winGraceTimer -= dt;
      if (
        this.winGraceTimer <= 0 &&
        this.explosionSystem.pendingChains.length === 0 &&
        !this.weaponManager.hasActiveProjectiles()
      ) {
        this._completeLevel();
        return;
      }
      // Cap maximum grace delay even if a stray pellet is still flying
      if (this.winGraceTimer <= -1.6) {
        this._completeLevel();
        return;
      }
    }

    // Track shot flight & post-explosion readiness / failure evaluation
    if (state === GameState.SHOOTING || state === GameState.EXPLOSION) {
      this.shotElapsed += dt;
      const activeProjs = this.weaponManager.hasActiveProjectiles();
      const pendingChains = this.explosionSystem.pendingChains.length > 0;

      if (!activeProjs && !pendingChains && !this.winPending) {
        const remainingAmmo = this.weaponManager.getTotalAmmo();

        if (remainingAmmo > 0) {
          this.settleTimer += dt;
          if (this.settleTimer >= 0.45) {
            this.stateMachine.setState(GameState.READY);
          }
        } else {
          // Out of ammo: wait for tumbling rubble to settle before declaring defeat
          this.outOfAmmoTimer += dt;
          if (this.towerManager.isSettled()) {
            this.settleTimer += dt;
          } else {
            this.settleTimer = 0;
          }

          if (this.settleTimer >= 0.85 || this.outOfAmmoTimer >= 4.2) {
            const levelCfg = this.levelManager.getCurrentLevel();
            if (this.towerManager.getDestructionRatio() >= levelCfg.targetDestruction) {
              this._completeLevel();
            } else {
              this._failLevel();
            }
          }
        }
      }
    }
  }

  _loop(timestamp) {
    if (this.isDisposed) return;
    this.rafId = requestAnimationFrame((ts) => this._loop(ts));

    const dt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastFrameTime) / 1000));
    this.lastFrameTime = timestamp;

    const isPaused = this.stateMachine.is(GameState.PAUSED) || document.hidden;

    if (!isPaused) {
      // 1. Step Rapier 3D rigid-body physics & process real collision events
      this.collisionHandler.update(dt);
      this.physicsWorld.step(dt, (eq) => this.collisionHandler.processEvents(eq));

      // 2. Update delayed chain explosions
      this.explosionSystem.update(dt);

      // 3. Sync tower blocks & projectiles with physics
      const checkDestruction = this.stateMachine.isAny(
        GameState.READY,
        GameState.AIMING,
        GameState.SHOOTING,
        GameState.EXPLOSION
      );
      this.towerManager.update(dt, checkDestruction);
      this.weaponManager.update(dt);

      // 4. Update cannon recoil & trajectory arc prediction
      this.cannon.update(dt);
      if (this.stateMachine.isAny(GameState.READY, GameState.AIMING)) {
        this.cannon.updateTrajectory(
          this.weaponManager.getSelectedWeapon(),
          this.physicsWorld.gravity.y,
          this.towerManager.getActiveMeshes(),
          this.stateMachine.is(GameState.AIMING)
        );
      }

      // 5. Update visuals, particles, lighting & environment
      this.particleSystem.update(dt);
      this.lighting.update(dt);
      this.environment.update(dt);

      // 6. Gameplay state evaluation
      this._updateGameplayFlow(dt);
    }

    // Smooth camera update & render
    this.cameraController.update(isPaused ? 0 : dt);
    this.sceneManager.render();
  }

  dispose() {
    this.isDisposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.towerManager.clearTower();
    this.weaponManager.dispose();
    this.particleSystem.dispose();
    this.physicsWorld.dispose();
    this.soundManager.dispose();
    this.sceneManager.dispose();
  }
}
