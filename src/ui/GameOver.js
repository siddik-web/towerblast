export class GameOver {
  constructor(rootEl, handlers) {
    this.rootEl = rootEl;
    this.handlers = handlers;

    this.el = document.createElement('div');
    this.el.className = 'screen game-over hidden';
    this.el.innerHTML = `
      <div class="go-card">
        <div class="go-badge" id="go-badge">LEVEL COMPLETE</div>
        <h2 class="go-title" id="go-title">TOWER DEMOLISHED!</h2>
        <p class="go-subtitle" id="go-subtitle">Level 1 — Timber Outpost</p>

        <div class="go-stars" id="go-stars">
          <span class="go-star" data-idx="1">★</span>
          <span class="go-star" data-idx="2">★</span>
          <span class="go-star" data-idx="3">★</span>
        </div>

        <div class="go-new-best hidden" id="go-new-best">🏆 NEW HIGH SCORE!</div>
        <div class="go-combo" id="go-combo">⚡ BEST COMBO x1</div>
        <div class="go-challenge hidden" id="go-challenge"></div>
        <div class="go-rewards hidden" id="go-rewards"></div>

        <div class="go-breakdown" id="go-breakdown">
          <div class="go-row"><span>Destruction</span><strong id="go-destruction">0%</strong></div>
          <div class="go-row"><span>Block Score</span><strong id="go-block-pts">0</strong></div>
          <div class="go-row" id="go-ammo-row"><span>Spare Ammo Bonus</span><strong id="go-ammo-bonus">+0</strong></div>
          <div class="go-row hidden" id="go-total-row"><span>Total Demolition Bonus</span><strong id="go-total-bonus">+1,000</strong></div>
          <div class="go-row go-final"><span>FINAL SCORE</span><strong id="go-final-score">0</strong></div>
        </div>

        <div class="go-actions">
          <button class="btn btn-primary" id="go-next-btn">NEXT LEVEL ▶</button>
          <div class="go-secondary">
            <button class="btn btn-secondary" id="go-retry-btn">↻ RETRY</button>
            <button class="btn btn-secondary" id="go-levels-btn">🗺 LEVELS</button>
            <button class="btn btn-secondary" id="go-menu-btn">🏠 MENU</button>
          </div>
        </div>
      </div>
    `;

    this.rootEl.appendChild(this.el);

    this.badgeEl = this.el.querySelector('#go-badge');
    this.titleEl = this.el.querySelector('#go-title');
    this.subtitleEl = this.el.querySelector('#go-subtitle');
    this.starsEl = this.el.querySelector('#go-stars');
    this.starEls = Array.from(this.el.querySelectorAll('.go-star'));
    this.newBestEl = this.el.querySelector('#go-new-best');
    this.comboEl = this.el.querySelector('#go-combo');
    this.challengeEl = this.el.querySelector('#go-challenge');
    this.rewardsEl = this.el.querySelector('#go-rewards');
    this.destructionEl = this.el.querySelector('#go-destruction');
    this.blockPtsEl = this.el.querySelector('#go-block-pts');
    this.ammoRowEl = this.el.querySelector('#go-ammo-row');
    this.ammoBonusEl = this.el.querySelector('#go-ammo-bonus');
    this.totalRowEl = this.el.querySelector('#go-total-row');
    this.totalBonusEl = this.el.querySelector('#go-total-bonus');
    this.finalScoreEl = this.el.querySelector('#go-final-score');
    this.nextBtn = this.el.querySelector('#go-next-btn');

    this.nextBtn.addEventListener('click', () => this.handlers.onNextLevel());
    this.el.querySelector('#go-retry-btn').addEventListener('click', () => this.handlers.onRetry());
    this.el.querySelector('#go-levels-btn').addEventListener('click', () => this.handlers.onLevelSelect());
    this.el.querySelector('#go-menu-btn').addEventListener('click', () => this.handlers.onMainMenu());
  }

  showResult({
    won,
    levelConfig,
    hasNextLevel,
    nextLevelId,
    destructionPercent,
    blockPoints,
    spareAmmoBonus = 0,
    completeBonus = 0,
    isTotalDemolition = false,
    finalScore = 0,
    stars = 0,
    isNewBest = false,
    rewards = [],
    maxCombo = 1,
    dailyChallengeSuccess = false,
    dailyChallenge = null
  }) {
    this.el.classList.remove('hidden');
    this.badgeEl.className = `go-badge ${won ? 'win' : 'fail'}`;
    this.badgeEl.textContent = won
      ? levelConfig.boss
        ? '👑 BOSS DEFEATED!'
        : isTotalDemolition
          ? 'TOTAL DEMOLITION!'
          : 'LEVEL COMPLETE'
      : 'OUT OF AMMUNITION';

    this.titleEl.textContent = won
      ? hasNextLevel
        ? 'TOWER BLASTED!'
        : 'ALL 25 TOWERS CONQUERED!'
      : 'SO CLOSE!';

    this.subtitleEl.textContent = `Level ${levelConfig.id} — ${levelConfig.name}`;

    // Stars animation
    this.starsEl.classList.toggle('hidden', !won);
    this.starEls.forEach((star, i) => {
      star.classList.remove('earned', 'animate');
      if (won && i < stars) {
        window.setTimeout(() => {
          star.classList.add('earned', 'animate');
        }, 160 + i * 190);
      }
    });

    this.newBestEl.classList.toggle('hidden', !(won && isNewBest));
    this.comboEl.textContent = `⚡ BEST COMBO x${Math.max(1, maxCombo)}`;
    this.comboEl.classList.toggle('hidden', !won);
    const showChallenge = Boolean(dailyChallengeSuccess || dailyChallenge);
    this.challengeEl.classList.toggle('hidden', !showChallenge);
    this.challengeEl.classList.toggle('success', dailyChallengeSuccess);
    this.challengeEl.textContent = dailyChallengeSuccess
      ? '🎯 DAILY CHALLENGE COMPLETE · BONUS REWARDED!'
      : dailyChallenge
        ? `DAILY OBJECTIVE MISSED · ${dailyChallenge.hint}`
        : '';
    const rewardCoins = rewards.reduce((total, reward) => total + reward.coins, 0);
    this.rewardsEl.classList.toggle('hidden', !(won && rewards.length));
    this.rewardsEl.textContent = rewards.length
      ? `🎁 ${rewards.map((reward) => reward.label).join(' · ')}  |  +${rewardCoins} Siege Coins`
      : '';
    this.destructionEl.textContent = `${destructionPercent}% (Target ${Math.round(levelConfig.targetDestruction * 100)}%)`;
    this.blockPtsEl.textContent = blockPoints.toLocaleString();

    this.ammoRowEl.classList.toggle('hidden', !won);
    this.ammoBonusEl.textContent = `+${spareAmmoBonus.toLocaleString()}`;

    this.totalRowEl.classList.toggle('hidden', !(won && completeBonus > 0));
    this.totalBonusEl.textContent = `+${completeBonus.toLocaleString()}`;

    this.finalScoreEl.textContent = finalScore.toLocaleString();

    if (won && hasNextLevel) {
      this.nextBtn.classList.remove('hidden');
      this.nextBtn.textContent = `CONTINUE TO LEVEL (${nextLevelId || levelConfig.id + 1}) ▶`;
    } else {
      this.nextBtn.classList.add('hidden');
    }
  }

  hide() {
    this.el.classList.add('hidden');
  }
}
