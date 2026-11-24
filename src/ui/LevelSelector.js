export class LevelSelector {
  constructor(rootEl, handlers) {
    this.rootEl = rootEl;
    this.handlers = handlers;

    this.el = document.createElement('div');
    this.el.className = 'screen level-select hidden';
    this.el.innerHTML = `
      <div class="ls-container">
        <div class="ls-header">
          <button class="btn btn-secondary btn-sm" id="ls-back-btn">← BACK</button>
          <div class="ls-title-block">
            <h2>SELECT LEVEL</h2>
            <span class="ls-subtitle" id="ls-stars-summary">0 / 75 Stars</span>
          </div>
          <div style="width: 78px;"></div>
        </div>
        <div class="ls-scroll" id="ls-grid-container"></div>
      </div>
    `;

    this.rootEl.appendChild(this.el);
    this.gridContainer = this.el.querySelector('#ls-grid-container');
    this.starsSummary = this.el.querySelector('#ls-stars-summary');

    this.el.querySelector('#ls-back-btn').addEventListener('click', () => {
      this.handlers.onBack();
    });
  }

  render(levelManager) {
    const levels = levelManager.getAllLevels();
    this.starsSummary.textContent = `★ ${levelManager.getTotalStars()} / ${levelManager.getMaxStars()} Stars`;

    // Group levels by tier
    const tiers = new Map();
    for (const lvl of levels) {
      if (!tiers.has(lvl.tier)) tiers.set(lvl.tier, []);
      tiers.get(lvl.tier).push(lvl);
    }

    this.gridContainer.innerHTML = '';

    const milestones = levelManager.getCampaignMilestones();
    const campaign = document.createElement('section');
    campaign.className = 'campaign-map';
    const campaignHeader = document.createElement('div');
    campaignHeader.className = 'campaign-map-header';
    campaignHeader.innerHTML = `<div><strong>CAMPAIGN MAP</strong><span>Follow the route. Beat the bosses. Claim milestone rewards.</span></div><div class="campaign-wallet">🪙 ${levelManager.getCoins().toLocaleString()}</div>`;
    campaign.appendChild(campaignHeader);

    const route = document.createElement('div');
    route.className = 'campaign-route';
    for (const lvl of levels) {
      const unlocked = levelManager.isUnlocked(lvl.id);
      const stats = levelManager.getLevelStats(lvl.id);
      const milestone = milestones.find((item) => item.level === lvl.id);
      const node = document.createElement('button');
      node.className = `campaign-node ${unlocked ? 'unlocked' : 'locked'} ${stats.completed ? 'completed' : ''} ${lvl.boss ? 'boss-node' : ''} ${milestone?.claimed ? 'reward-claimed' : ''}`;
      node.disabled = !unlocked;
      node.innerHTML = `<span class="campaign-node-number">${unlocked ? lvl.id : '🔒'}</span><span class="campaign-node-name">${lvl.boss ? '👑 BOSS' : lvl.name}</span>${milestone ? `<span class="campaign-node-reward">${milestone.claimed ? '✓ REWARD' : `🎁 ${milestone.coins}`}</span>` : ''}`;
      if (unlocked) node.addEventListener('click', () => this.handlers.onSelectLevel(lvl.id));
      route.appendChild(node);
    }
    campaign.appendChild(route);
    const bossLegend = document.createElement('div');
    bossLegend.className = 'campaign-legend';
    bossLegend.textContent = '👑 Boss encounters: Levels 15, 20 and 25 · First victory grants a unique medal and Siege Coins';
    campaign.appendChild(bossLegend);
    this.gridContainer.appendChild(campaign);

    for (const [tierName, tierLevels] of tiers.entries()) {
      const section = document.createElement('div');
      section.className = 'ls-tier-section';

      const heading = document.createElement('div');
      heading.className = `ls-tier-heading tier-${tierLevels[0].tierIndex}`;
      heading.textContent = tierName;
      section.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'ls-grid';

      for (const lvl of tierLevels) {
        const unlocked = levelManager.isUnlocked(lvl.id);
        const stats = levelManager.getLevelStats(lvl.id);

        const card = document.createElement('button');
        card.className = `level-card ${unlocked ? 'unlocked' : 'locked'} ${stats.completed ? 'completed' : ''}`;
        card.disabled = !unlocked;

        const starsHtml = [1, 2, 3]
          .map((s) => `<span class="mini-star ${s <= stats.stars ? 'lit' : ''}">★</span>`)
          .join('');

        card.innerHTML = `
          <div class="lc-num">${unlocked ? lvl.id : '🔒'} ${lvl.boss ? '👑' : ''}</div>
          <div class="lc-name">${lvl.name}</div>
          <div class="lc-stars">${starsHtml}</div>
          <div class="lc-best">${stats.bestScore > 0 ? stats.bestScore.toLocaleString() : (unlocked ? 'READY' : 'LOCKED')}</div>
        `;

        if (unlocked) {
          card.addEventListener('click', () => {
            this.handlers.onSelectLevel(lvl.id);
          });
        }

        grid.appendChild(card);
      }

      section.appendChild(grid);
      this.gridContainer.appendChild(section);
    }
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }
}
