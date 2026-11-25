export class MainMenu {
  constructor(rootEl, handlers) {
    this.rootEl = rootEl;
    this.handlers = handlers;

    this.el = document.createElement('div');
    this.el.className = 'screen main-menu hidden';
    this.el.innerHTML = `
      <div class="menu-topbar">
        <div class="pill stars-pill" id="mm-stars-pill">
          <span class="star-icon">★</span>
          <span id="mm-stars-text">0 / 75</span>
        </div>
        <div class="pill coins-pill">🪙 <span id="mm-coins-text">0</span></div>
        <div class="pill streak-pill" title="Consecutive days played">🔥 <span id="mm-streak-text">0</span></div>
        <button class="icon-btn" id="mm-sound-btn" title="Toggle Sound" aria-label="Toggle Sound">🔊</button>
      </div>

      <div class="menu-center">
        <div class="logo-wrap">
          <div class="logo-badge">3D PHYSICS ARCADE</div>
          <h1 class="game-logo">
            <span class="logo-tower">TOWER</span>
            <span class="logo-blast">BLAST</span>
          </h1>
          <p class="menu-tagline">Aim. Fire. Watch the towers crumble!</p>
        </div>

        <div class="menu-actions">
          <button class="btn btn-primary btn-xl" id="mm-play-btn">
            <span class="btn-icon">▶</span>
            <span id="mm-play-label">PLAY</span>
          </button>
          <div class="menu-secondary-row">
            <button class="btn btn-secondary" id="mm-levels-btn">
              <span class="btn-icon">🗺</span> LEVELS
            </button>
            <button class="btn btn-secondary" id="mm-settings-btn">
              <span class="btn-icon">⚙</span> SETTINGS
            </button>
          </div>
          <button class="btn btn-secondary daily-missions-btn" id="mm-daily-btn">📅 DAILY MISSIONS <span id="mm-daily-count">0/3</span></button>
          <button class="btn btn-secondary daily-challenge-btn" id="mm-challenge-btn">
            🎯 DAILY CHALLENGE <span id="mm-challenge-label">PLAY</span>
          </button>
          <button class="btn btn-secondary workshop-btn" id="mm-workshop-btn">🛠️ WEAPON WORKSHOP</button>
        </div>
      </div>

      <div class="menu-footer">
        Drag to aim • Click or tap to blast • 25 Hand-Crafted Towers
      </div>

      <div class="modal-backdrop hidden" id="mm-daily-modal">
        <div class="modal-card daily-modal-card">
          <div class="modal-header">
            <div><h2>Daily Missions</h2><span class="daily-date" id="mm-daily-date"></span></div>
            <button class="icon-btn small" id="mm-daily-close" aria-label="Close">✕</button>
          </div>
          <p class="daily-intro">Complete today's objectives to earn Siege Coins. Progress resets at midnight Dhaka time.</p>
          <div class="daily-mission-list" id="mm-daily-list"></div>
          <div class="daily-wallet">🪙 Your Siege Coins: <strong id="mm-daily-wallet">0</strong></div>
        </div>
      </div>

      <div class="modal-backdrop hidden" id="mm-workshop-modal">
        <div class="modal-card daily-modal-card">
          <div class="modal-header">
            <div><h2>Weapon Workshop</h2><span class="daily-date">Upgrade your arsenal with Siege Coins</span></div>
            <button class="icon-btn small" id="mm-workshop-close" aria-label="Close">✕</button>
          </div>
          <p class="daily-intro">Each tier adds 5% weapon damage and 2.5% blast force. Upgrades are permanent and capped at tier 3.</p>
          <div class="workshop-list" id="mm-workshop-list"></div>
          <div class="daily-wallet">🪙 Available Siege Coins: <strong id="mm-workshop-wallet">0</strong></div>
        </div>
      </div>
      <div class="modal-backdrop hidden" id="mm-settings-modal">
        <div class="modal-card">
          <div class="modal-header">
            <h2>Settings</h2>
            <button class="icon-btn small" id="mm-settings-close" aria-label="Close">✕</button>
          </div>
          <div class="settings-list">
            <label class="setting-row">
              <span>Sound Effects</span>
              <input type="checkbox" id="set-sfx" class="toggle-switch" checked />
            </label>
            <label class="setting-row">
              <span>Background Music</span>
              <input type="checkbox" id="set-music" class="toggle-switch" checked />
            </label>
            <label class="setting-row">
              <span>Dynamic Shadows</span>
              <input type="checkbox" id="set-shadows" class="toggle-switch" checked />
            </label>
          </div>
          <div class="modal-divider"></div>
          <div class="reset-zone">
            <button class="btn btn-danger btn-sm" id="set-reset-btn">Reset All Progress</button>
            <span class="reset-hint hidden" id="set-reset-confirm">Click again to confirm reset!</span>
          </div>
        </div>
      </div>
    `;

    this.rootEl.appendChild(this.el);

    this.starsText = this.el.querySelector('#mm-stars-text');
    this.coinsText = this.el.querySelector('#mm-coins-text');
    this.streakText = this.el.querySelector('#mm-streak-text');
    this.dailyModal = this.el.querySelector('#mm-daily-modal');
    this.workshopModal = this.el.querySelector('#mm-workshop-modal');
    this.workshopList = this.el.querySelector('#mm-workshop-list');
    this.workshopWallet = this.el.querySelector('#mm-workshop-wallet');
    this.dailyList = this.el.querySelector('#mm-daily-list');
    this.dailyDate = this.el.querySelector('#mm-daily-date');
    this.dailyCount = this.el.querySelector('#mm-daily-count');
    this.dailyWallet = this.el.querySelector('#mm-daily-wallet');
    this.playLabel = this.el.querySelector('#mm-play-label');
    this.soundBtn = this.el.querySelector('#mm-sound-btn');
    this.settingsModal = this.el.querySelector('#mm-settings-modal');
    this.sfxToggle = this.el.querySelector('#set-sfx');
    this.musicToggle = this.el.querySelector('#set-music');
    this.shadowsToggle = this.el.querySelector('#set-shadows');
    this.resetBtn = this.el.querySelector('#set-reset-btn');
    this.resetConfirm = this.el.querySelector('#set-reset-confirm');
    this._resetArmed = false;

    this._bindEvents();
  }

  _bindEvents() {
    this.el.querySelector('#mm-play-btn').addEventListener('click', () => {
      this.handlers.onPlay();
    });
    this.el.querySelector('#mm-levels-btn').addEventListener('click', () => {
      this.handlers.onOpenLevels();
    });
    this.el.querySelector('#mm-challenge-btn').addEventListener('click', () => {
      this.handlers.onDailyChallenge();
    });
    this.el.querySelector('#mm-workshop-btn').addEventListener('click', () => {
      this.workshopModal.classList.remove('hidden');
      this.handlers.onButtonClick();
    });
    this.el.querySelector('#mm-workshop-close').addEventListener('click', () => {
      this.workshopModal.classList.add('hidden');
      this.handlers.onButtonClick();
    });
    this.workshopModal.addEventListener('click', (e) => {
      if (e.target === this.workshopModal) this.workshopModal.classList.add('hidden');
    });
    this.workshopList.addEventListener('click', (e) => {
      const button = e.target.closest('[data-upgrade]');
      if (!button || button.disabled) return;
      this.handlers.onPurchaseUpgrade(button.dataset.upgrade);
    });
    this.el.querySelector('#mm-daily-btn').addEventListener('click', () => {
      this.dailyModal.classList.remove('hidden');
      this.handlers.onButtonClick();
    });
    this.el.querySelector('#mm-daily-close').addEventListener('click', () => {
      this.dailyModal.classList.add('hidden');
      this.handlers.onButtonClick();
    });
    this.dailyModal.addEventListener('click', (e) => {
      if (e.target === this.dailyModal) this.dailyModal.classList.add('hidden');
    });
    this.el.querySelector('#mm-settings-btn').addEventListener('click', () => {
      this._resetArmed = false;
      this.resetConfirm.classList.add('hidden');
      this.settingsModal.classList.remove('hidden');
      this.handlers.onButtonClick();
    });
    this.el.querySelector('#mm-settings-close').addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
    this.dailyModal.classList.add('hidden');
      this.handlers.onButtonClick();
    });
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.settingsModal.classList.add('hidden');
      }
    });
    this.soundBtn.addEventListener('click', () => {
      this.handlers.onToggleMute();
    });

    this.sfxToggle.addEventListener('change', (e) => {
      this.handlers.onToggleSfx(e.target.checked);
    });
    this.musicToggle.addEventListener('change', (e) => {
      this.handlers.onToggleMusic(e.target.checked);
    });
    this.shadowsToggle.addEventListener('change', (e) => {
      this.handlers.onToggleShadows(e.target.checked);
    });

    this.resetBtn.addEventListener('click', () => {
      if (!this._resetArmed) {
        this._resetArmed = true;
        this.resetConfirm.classList.remove('hidden');
        this.handlers.onButtonClick();
      } else {
        this._resetArmed = false;
        this.resetConfirm.classList.add('hidden');
        this.handlers.onResetProgress();
        this.settingsModal.classList.add('hidden');
      }
    });
  }

  update({ totalStars, maxStars, nextLevelId, muted, sfxEnabled, musicEnabled, shadowsEnabled, coins = 0, dailyMissions = [], dailyDate = '', streak = 0, weaponUpgrades = {}, dailyChallenge = null }) {
    this.starsText.textContent = `${totalStars} / ${maxStars}`;
    this.coinsText.textContent = coins.toLocaleString();
    this.streakText.textContent = String(streak);
    const completed = dailyMissions.filter((mission) => mission.claimed).length;
    this.dailyCount.textContent = `${completed}/${dailyMissions.length}`;
    const challengeButton = this.el.querySelector('#mm-challenge-btn');
    const challengeLabel = this.el.querySelector('#mm-challenge-label');
    if (dailyChallenge) {
      challengeLabel.textContent = dailyChallenge.claimed ? 'COMPLETED' : `LVL ${dailyChallenge.levelId}`;
      challengeButton.title = `${dailyChallenge.title}: ${dailyChallenge.description}`;
      challengeButton.disabled = dailyChallenge.claimed;
      challengeButton.classList.toggle('challenge-complete', dailyChallenge.claimed);
    }
    this.dailyDate.textContent = dailyDate ? `Today · ${dailyDate}` : '';
    this.dailyWallet.textContent = coins.toLocaleString();
    this.workshopWallet.textContent = coins.toLocaleString();
    const weapons = [
      ['cannonball', 'Iron Ball', 'Reliable direct-hit damage'],
      ['bomb', 'Mega Bomb', 'Heavy blast damage'],
      ['cluster', 'Scatter Shot', 'Multi-hit damage'],
      ['rocket', 'Power Rocket', 'Armor-piercing damage']
    ];
    this.workshopList.innerHTML = weapons.map(([id, name, description]) => {
      const level = Math.max(0, Math.min(3, Number(weaponUpgrades[id]) || 0));
      const cost = level >= 3 ? null : 100 * (level + 1);
      const disabled = cost === null || coins < cost;
      return `<article class="workshop-item">
        <div class="workshop-copy"><strong>${name}</strong><span>${description}</span><small>Tier ${level}/3 · +${level * 5}% damage</small></div>
        <button class="btn btn-secondary workshop-buy" data-upgrade="${id}" ${disabled ? 'disabled' : ''}>${cost === null ? 'MAXED' : `🪙 ${cost}`}</button>
      </article>`;
    }).join('');
    this.dailyList.innerHTML = dailyMissions.map((mission) => {
      const percent = Math.round((mission.progress / mission.goal) * 100);
      return `<article class="daily-mission ${mission.claimed ? 'claimed' : ''}">
        <div class="daily-mission-icon">${mission.icon}</div>
        <div class="daily-mission-copy">
          <strong>${mission.title}</strong>
          <span>${mission.description}</span>
          <div class="daily-progress"><i style="width:${percent}%"></i></div>
          <small>${mission.progress.toLocaleString()} / ${mission.goal.toLocaleString()}</small>
        </div>
        <div class="daily-reward">${mission.claimed ? '✓ CLAIMED' : `🪙 ${mission.reward}`}</div>
      </article>`;
    }).join('');
    this.playLabel.textContent = nextLevelId > 1 ? `CONTINUE LVL ${nextLevelId}` : 'PLAY NOW';
    this.soundBtn.textContent = muted ? '🔇' : '🔊';
    this.sfxToggle.checked = sfxEnabled;
    this.musicToggle.checked = musicEnabled;
    this.shadowsToggle.checked = shadowsEnabled;
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
    this.settingsModal.classList.add('hidden');
    this.dailyModal.classList.add('hidden');
    this.workshopModal.classList.add('hidden');
  }
}
