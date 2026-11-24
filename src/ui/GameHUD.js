import { WEAPON_ORDER, WEAPON_TYPES } from '../levels/levelData.js';

export class GameHUD {
  constructor(rootEl, handlers) {
    this.rootEl = rootEl;
    this.handlers = handlers;

    this.el = document.createElement('div');
    this.el.className = 'screen game-hud hidden';
    this.el.innerHTML = `
      <div class="hud-top">
        <div class="hud-left">
          <div class="hud-pill level-pill">
            <span class="hud-label" id="hud-level-num">LVL 1</span>
            <span class="hud-level-name" id="hud-level-name">Timber Outpost</span>
          </div>
          <div class="hud-pill score-pill">
            <span class="hud-label">SCORE</span>
            <span class="hud-value" id="hud-score">0</span>
          </div>
        </div>

        <div class="hud-center">
          <div class="progress-card">
            <div class="progress-header">
              <span>DESTRUCTION</span>
              <span id="hud-progress-pct">0%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" id="hud-progress-fill"></div>
              <div class="progress-target" id="hud-progress-target" title="Target"></div>
            </div>
          </div>
        </div>

        <div class="hud-right">
          <button class="icon-btn" id="hud-mute-btn" title="Mute / Unmute" aria-label="Sound">🔊</button>
          <button class="icon-btn" id="hud-restart-btn" title="Restart (R)" aria-label="Restart">↻</button>
          <button class="icon-btn" id="hud-pause-btn" title="Pause (P / Esc)" aria-label="Pause">⏸</button>
        </div>
      </div>

      <div class="hud-callouts" id="hud-callouts">
        <div class="combo-badge hidden" id="hud-combo-badge">COMBO x2!</div>
        <div class="level-tip hidden" id="hud-level-tip"></div>
      </div>

      <div class="hud-bottom">
        <div class="weapon-dock-wrap">
          <div class="ammo-summary">
            <span>SHOTS LEFT:</span>
            <strong id="hud-total-ammo">5</strong>
          </div>
          <div class="weapon-dock" id="hud-weapon-dock"></div>
        </div>

        <div class="fire-zone">
          <button class="btn-fire" id="hud-fire-btn" aria-label="Fire Cannon">
            <span class="fire-icon">💥</span>
            <span class="fire-text">FIRE!</span>
          </button>
          <div class="controls-hint" id="hud-controls-hint">Drag to aim • Tap or Space to shoot</div>
        </div>
      </div>

      <div class="modal-backdrop hidden" id="hud-pause-modal">
        <div class="modal-card pause-card">
          <h2>PAUSED</h2>
          <p class="pause-sub" id="pause-level-label">Level 1 — Timber Outpost</p>
          <div class="pause-actions">
            <button class="btn btn-primary" id="pause-resume-btn">▶ RESUME</button>
            <button class="btn btn-secondary" id="pause-restart-btn">↻ RESTART LEVEL</button>
            <button class="btn btn-secondary" id="pause-sound-btn">🔊 SOUND: ON</button>
            <button class="btn btn-secondary" id="pause-levels-btn">🗺 LEVEL SELECT</button>
            <button class="btn btn-danger-outline" id="pause-menu-btn">🏠 MAIN MENU</button>
          </div>
        </div>
      </div>
    `;

    this.rootEl.appendChild(this.el);

    this.levelNumEl = this.el.querySelector('#hud-level-num');
    this.levelNameEl = this.el.querySelector('#hud-level-name');
    this.scoreEl = this.el.querySelector('#hud-score');
    this.progressPctEl = this.el.querySelector('#hud-progress-pct');
    this.progressFillEl = this.el.querySelector('#hud-progress-fill');
    this.progressTargetEl = this.el.querySelector('#hud-progress-target');
    this.totalAmmoEl = this.el.querySelector('#hud-total-ammo');
    this.weaponDockEl = this.el.querySelector('#hud-weapon-dock');
    this.fireBtn = this.el.querySelector('#hud-fire-btn');
    this.muteBtn = this.el.querySelector('#hud-mute-btn');
    this.comboBadge = this.el.querySelector('#hud-combo-badge');
    this.levelTip = this.el.querySelector('#hud-level-tip');
    this.calloutsEl = this.el.querySelector('#hud-callouts');
    this.pauseModal = this.el.querySelector('#hud-pause-modal');
    this.pauseLevelLabel = this.el.querySelector('#pause-level-label');
    this.pauseSoundBtn = this.el.querySelector('#pause-sound-btn');

    this._weaponButtons = new Map();
    this._comboTimeout = null;
    this._tipTimeout = null;

    this._buildWeaponButtons();
    this._bindEvents();
  }

  _buildWeaponButtons() {
    this.weaponDockEl.innerHTML = '';
    for (const id of WEAPON_ORDER) {
      const w = WEAPON_TYPES[id];
      const btn = document.createElement('button');
      btn.className = 'weapon-btn';
      btn.dataset.weapon = id;
      btn.title = `${w.name} (${w.hotkey}) — ${w.description}`;
      btn.innerHTML = `
        <span class="w-hotkey">${w.hotkey}</span>
        <span class="w-icon">${w.icon}</span>
        <span class="w-name">${w.shortName}</span>
        <span class="w-count" id="w-count-${id}">0</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlers.onSelectWeapon(id);
      });
      this.weaponDockEl.appendChild(btn);
      this._weaponButtons.set(id, btn);
    }
  }

  _bindEvents() {
    this.fireBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handlers.onFire();
    });
    this.el.querySelector('#hud-pause-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.handlers.onPause();
    });
    this.el.querySelector('#hud-restart-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.handlers.onRestart();
    });
    this.muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handlers.onToggleMute();
    });

    this.el.querySelector('#pause-resume-btn').addEventListener('click', () => this.handlers.onResume());
    this.el.querySelector('#pause-restart-btn').addEventListener('click', () => this.handlers.onRestart());
    this.el.querySelector('#pause-sound-btn').addEventListener('click', () => this.handlers.onToggleMute());
    this.el.querySelector('#pause-levels-btn').addEventListener('click', () => this.handlers.onLevelSelect());
    this.el.querySelector('#pause-menu-btn').addEventListener('click', () => this.handlers.onMainMenu());
  }

  setLevelInfo(levelConfig) {
    this.levelNumEl.textContent = `LVL ${levelConfig.id}`;
    this.levelNameEl.textContent = levelConfig.name;
    this.pauseLevelLabel.textContent = `Level ${levelConfig.id} — ${levelConfig.name}`;
    this.progressTargetEl.style.left = `${Math.round(levelConfig.targetDestruction * 100)}%`;

    // Show brief level hint toast
    if (levelConfig.description) {
      clearTimeout(this._tipTimeout);
      this.levelTip.textContent = levelConfig.description;
      this.levelTip.classList.remove('hidden');
      this._tipTimeout = window.setTimeout(() => {
        this.levelTip.classList.add('hidden');
      }, 4500);
    }
  }

  updateScore(score) {
    this.scoreEl.textContent = score.toLocaleString();
  }

  updateProgress(ratio, targetRatio) {
    const pct = Math.min(100, Math.round(ratio * 100));
    this.progressPctEl.textContent = `${pct}%`;
    this.progressFillEl.style.width = `${pct}%`;
    if (ratio >= targetRatio) {
      this.progressFillEl.classList.add('complete');
    } else {
      this.progressFillEl.classList.remove('complete');
    }
  }

  updateWeapons(ammo, selectedWeaponId, canFireNow) {
    let total = 0;
    for (const id of WEAPON_ORDER) {
      const count = ammo[id] || 0;
      total += count;
      const btn = this._weaponButtons.get(id);
      if (!btn) continue;
      btn.querySelector(`#w-count-${id}`).textContent = String(count);
      btn.classList.toggle('active', id === selectedWeaponId && count > 0);
      btn.classList.toggle('empty', count <= 0);
      btn.disabled = count <= 0;
    }
    this.totalAmmoEl.textContent = String(total);
    this.fireBtn.disabled = !canFireNow || total <= 0;
    this.fireBtn.classList.toggle('disabled', !canFireNow || total <= 0);
  }

  updateSound(muted) {
    this.muteBtn.textContent = muted ? '🔇' : '🔊';
    this.pauseSoundBtn.textContent = muted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
  }

  showCombo(combo, pointsAwarded) {
    if (combo >= 2) {
      clearTimeout(this._comboTimeout);
      this.comboBadge.textContent = `COMBO x${combo}!  +${pointsAwarded}`;
      this.comboBadge.classList.remove('hidden', 'pop');
      // Force CSS animation restart
      void this.comboBadge.offsetWidth;
      this.comboBadge.classList.add('pop');
      this._comboTimeout = window.setTimeout(() => {
        this.comboBadge.classList.add('hidden');
      }, 1500);
    }
  }

  spawnFloatingScore(text, isBig = false) {
    const floater = document.createElement('div');
    floater.className = `score-floater ${isBig ? 'big' : ''}`;
    floater.textContent = text;
    floater.style.left = `${44 + Math.random() * 12}%`;
    floater.style.top = `${30 + Math.random() * 14}%`;
    this.calloutsEl.appendChild(floater);
    window.setTimeout(() => floater.remove(), 950);
  }

  setPaused(isPaused) {
    this.pauseModal.classList.toggle('hidden', !isPaused);
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
  }
}
