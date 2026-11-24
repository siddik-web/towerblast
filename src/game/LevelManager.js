import { LEVELS } from '../levels/levelData.js';

const PROGRESS_KEY = 'towerblast_progress_v1';
const CAMPAIGN_REWARDS = [
  { level: 5, coins: 100, title: 'Trailblazer Crest' },
  { level: 10, coins: 150, title: 'Skybreaker Medal' },
  { level: 15, coins: 200, title: 'Citadel Champion' },
  { level: 20, coins: 300, title: 'Steel Warden' },
  { level: 25, coins: 500, title: 'Worldbreaker Trophy' }
];

function getDhakaDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function createDailyState(date = getDhakaDateKey()) {
  return { date, levelsCleared: 0, bestScore: 0, bestStars: 0, claimed: [] };
}

const DAILY_MISSIONS = [
  { id: 'daily-clear', title: 'First Demolition', description: 'Win any level today', metric: 'levelsCleared', goal: 1, reward: 50, icon: '💥' },
  { id: 'daily-score', title: 'Score Chaser', description: 'Score 4,500 or more in one run', metric: 'bestScore', goal: 4500, reward: 75, icon: '🎯' },
  { id: 'daily-stars', title: 'Star Collector', description: 'Earn 2 or more stars in one run', metric: 'bestStars', goal: 2, reward: 100, icon: '⭐' }
];

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export class LevelManager {
  constructor() {
    this.levels = LEVELS;
    this.currentLevelId = 1;
    this.progress = this._loadProgress();
    this._refreshDailyState();
  }

  _defaultProgress() {
    return {
      unlockedLevel: 1,
      levelStats: {},
      coins: 0,
      claimedCampaignRewards: [],
      defeatedBosses: [],
      daily: createDailyState(),
      streak: { count: 0, lastDate: '' },
      achievementClaims: [],
      settings: { shadowsEnabled: true }
    };
  }

  _loadProgress() {
    try {
      const raw = globalThis.localStorage?.getItem(PROGRESS_KEY);
      if (!raw) return this._defaultProgress();
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed)) return this._defaultProgress();

      const levelStats = {};
      if (isRecord(parsed.levelStats)) {
        for (const level of this.levels) {
          const stat = parsed.levelStats[level.id];
          if (!isRecord(stat)) continue;
          levelStats[level.id] = {
            completed: Boolean(stat.completed),
            stars: Math.max(0, Math.min(3, Math.floor(finiteNumber(stat.stars)))),
            bestScore: Math.max(0, finiteNumber(stat.bestScore))
          };
        }
      }

      const daily = isRecord(parsed.daily) ? parsed.daily : {};
      const today = getDhakaDateKey();
      const normalizedDaily = daily.date === today
        ? {
            date: today,
            levelsCleared: Math.max(0, Math.floor(finiteNumber(daily.levelsCleared))),
            bestScore: Math.max(0, finiteNumber(daily.bestScore)),
            bestStars: Math.max(0, Math.min(3, Math.floor(finiteNumber(daily.bestStars)))),
            claimed: Array.isArray(daily.claimed)
              ? [...new Set(daily.claimed.filter((id) => DAILY_MISSIONS.some((mission) => mission.id === id)))]
              : []
          }
        : createDailyState(today);

      const highestCompleted = Math.max(1, ...Object.entries(levelStats)
        .filter(([, stat]) => stat.completed)
        .map(([id]) => Number(id) + 1));
      const storedUnlocked = Math.floor(finiteNumber(parsed.unlockedLevel, 1));

      return {
        unlockedLevel: Math.max(1, Math.min(this.levels.length, storedUnlocked, highestCompleted)),
        levelStats,
        coins: Math.max(0, Math.floor(finiteNumber(parsed.coins))),
        claimedCampaignRewards: Array.isArray(parsed.claimedCampaignRewards)
          ? [...new Set(parsed.claimedCampaignRewards.filter((id) => CAMPAIGN_REWARDS.some((item) => item.level === id)))]
          : [],
        defeatedBosses: Array.isArray(parsed.defeatedBosses)
          ? [...new Set(parsed.defeatedBosses.filter((id) => this.levels.some((level) => level.id === id && level.boss)))]
          : [],
        daily: normalizedDaily,
        streak: isRecord(parsed.streak) ? { count: Math.max(0, Math.floor(finiteNumber(parsed.streak.count))), lastDate: typeof parsed.streak.lastDate === 'string' ? parsed.streak.lastDate : '' } : { count: 0, lastDate: '' },
        achievementClaims: Array.isArray(parsed.achievementClaims) ? [...new Set(parsed.achievementClaims.filter((id) => ['first-clear','campaign-10','star-hunter','combo-master'].includes(id)))] : [],
        settings: { shadowsEnabled: typeof parsed.settings?.shadowsEnabled === 'boolean' ? parsed.settings.shadowsEnabled : true }
      };
    } catch {
      return this._defaultProgress();
    }
  }

  _refreshDailyState() {
    const today = getDhakaDateKey();
    if (this.progress.daily?.date !== today) {
      this.progress.daily = createDailyState(today);
      this._saveProgress();
    }
  }

  _saveProgress() {
    try {
      globalThis.localStorage?.setItem(PROGRESS_KEY, JSON.stringify(this.progress));
    } catch {
      // Storage may be unavailable or full; keep the current session playable.
    }
  }

  getAllLevels() { return this.levels; }
  getLevelCount() { return this.levels.length; }
  getLevel(id) { return this.levels.find((level) => level.id === id) || this.levels[0]; }
  getCurrentLevel() { return this.getLevel(this.currentLevelId); }

  setCurrentLevel(id) {
    const requested = Math.floor(finiteNumber(id, 1));
    this.currentLevelId = Math.max(1, Math.min(this.progress.unlockedLevel, this.levels.length, requested));
    return this.getCurrentLevel();
  }

  getNextPlayableLevelId() { return Math.min(this.levels.length, this.progress.unlockedLevel); }
  hasNextLevel() { return this.currentLevelId < this.levels.length; }
  isUnlocked(levelId) {
    const id = Number(levelId);
    return Number.isInteger(id) && id >= 1 && id <= this.progress.unlockedLevel;
  }

  getLevelStats(levelId) {
    return this.progress.levelStats[levelId] || { stars: 0, bestScore: 0, completed: false };
  }

  getTotalStars() {
    return Object.values(this.progress.levelStats).reduce((total, stat) => total + stat.stars, 0);
  }

  getMaxStars() { return this.levels.length * 3; }
  getCoins() { return this.progress.coins; }
  getDailyStreak() { return this.progress.streak.count; }

  getDailyMissions() {
    this._refreshDailyState();
    return DAILY_MISSIONS.map((mission) => {
      const value = this.progress.daily[mission.metric] || 0;
      return {
        ...mission,
        progress: Math.min(value, mission.goal),
        completed: value >= mission.goal,
        claimed: this.progress.daily.claimed.includes(mission.id)
      };
    });
  }

  getDailySummary() {
    const missions = this.getDailyMissions();
    return {
      date: this.progress.daily.date,
      completed: missions.filter((mission) => mission.claimed).length,
      total: missions.length,
      reward: missions.filter((mission) => mission.claimed).reduce((sum, mission) => sum + mission.reward, 0)
    };
  }

  getCampaignMilestones() {
    return CAMPAIGN_REWARDS.map((milestone) => ({
      ...milestone,
      unlocked: this.progress.unlockedLevel > milestone.level || Boolean(this.progress.levelStats[milestone.level]?.completed),
      claimed: this.progress.claimedCampaignRewards.includes(milestone.level)
    }));
  }

  _claimDailyRewards() {
    const rewards = [];
    for (const mission of this.getDailyMissions()) {
      if (mission.completed && !mission.claimed) {
        this.progress.daily.claimed.push(mission.id);
        this.progress.coins += mission.reward;
        rewards.push({ label: mission.title, coins: mission.reward });
      }
    }
    return rewards;
  }

  recordLevelWin(levelId, score, stars, summary = {}) {
    const id = Number(levelId);
    const level = this.levels.find((item) => item.id === id);
    if (!level || !this.isUnlocked(id)) {
      throw new RangeError('Cannot record a win for an unknown or locked level.');
    }

    const safeScore = Math.max(0, finiteNumber(score));
    const safeStars = Math.max(1, Math.min(3, Math.floor(finiteNumber(stars, 1))));
    this._refreshDailyState();
    const existing = this.getLevelStats(id);
    const isNewBest = safeScore > existing.bestScore;
    this.progress.levelStats[id] = {
      completed: true,
      stars: Math.max(existing.stars, safeStars),
      bestScore: Math.max(existing.bestScore, safeScore)
    };

    if (id === this.progress.unlockedLevel && id < this.levels.length) {
      this.progress.unlockedLevel = id + 1;
    }

    const rewards = [];
    const today = getDhakaDateKey();
    if (this.progress.streak.lastDate !== today) {
      const previous = this.progress.streak.lastDate;
      const yesterday = new Date(new Date(`${today}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
      this.progress.streak.count = previous === yesterday ? this.progress.streak.count + 1 : 1;
      this.progress.streak.lastDate = today;
    }
    this.progress.daily.levelsCleared += 1;
    this.progress.daily.bestScore = Math.max(this.progress.daily.bestScore, safeScore);
    this.progress.daily.bestStars = Math.max(this.progress.daily.bestStars, safeStars);

    if (level.boss && !this.progress.defeatedBosses.includes(id)) {
      this.progress.defeatedBosses.push(id);
      this.progress.coins += level.boss.rewardCoins;
      rewards.push({ label: level.boss.rewardTitle, coins: level.boss.rewardCoins });
    }

    const milestone = CAMPAIGN_REWARDS.find((item) => item.level === id);
    if (milestone && !this.progress.claimedCampaignRewards.includes(id)) {
      this.progress.claimedCampaignRewards.push(id);
      this.progress.coins += milestone.coins;
      rewards.push({ label: milestone.title, coins: milestone.coins });
    }

    // Reward replay mastery, not repetitive farming: coins only for a new personal best.
    if (isNewBest && existing.completed) {
      this.progress.coins += 20;
      rewards.push({ label: 'Personal Best Bonus', coins: 20 });
    }
    const achievements = [
      { id: 'first-clear', test: () => Object.values(this.progress.levelStats).some((stat) => stat.completed), label: 'First Demolition', coins: 50 },
      { id: 'campaign-10', test: () => Object.values(this.progress.levelStats).filter((stat) => stat.completed).length >= 10, label: 'Veteran Demolisher', coins: 150 },
      { id: 'star-hunter', test: () => this.getTotalStars() >= 25, label: 'Star Hunter', coins: 125 },
      { id: 'combo-master', test: () => finiteNumber(summary.maxCombo) >= 5, label: 'Combo Master', coins: 100 }
    ];
    for (const achievement of achievements) {
      if (!this.progress.achievementClaims.includes(achievement.id) && achievement.test()) {
        this.progress.achievementClaims.push(achievement.id);
        this.progress.coins += achievement.coins;
        rewards.push({ label: achievement.label, coins: achievement.coins });
      }
    }
    rewards.push(...this._claimDailyRewards());
    this._saveProgress();
    return {
      isNewBest,
      bestScore: this.progress.levelStats[id].bestScore,
      rewards,
      coins: this.progress.coins,
      streak: this.progress.streak.count,
      dailyMissions: this.getDailyMissions()
    };
  }

  getShadowsEnabled() { return this.progress.settings.shadowsEnabled; }

  setShadowsEnabled(enabled) {
    this.progress.settings.shadowsEnabled = Boolean(enabled);
    this._saveProgress();
  }

  resetProgress() {
    const shadows = this.progress.settings.shadowsEnabled;
    this.progress = this._defaultProgress();
    this.progress.settings.shadowsEnabled = shadows;
    this.currentLevelId = 1;
    this._saveProgress();
  }
}
