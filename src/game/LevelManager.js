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
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function createDailyState(date = getDhakaDateKey()) {
  return { date, levelsCleared: 0, starsEarned: 0, bestScore: 0, claimed: [] };
}

const DAILY_MISSIONS = [
  { id: 'daily-clear', title: 'First Demolition', description: 'Win any level today', metric: 'levelsCleared', goal: 1, reward: 50, icon: '💥' },
  { id: 'daily-score', title: 'Score Chaser', description: 'Score 4,500 or more in one run', metric: 'bestScore', goal: 4500, reward: 75, icon: '🎯' },
  { id: 'daily-stars', title: 'Star Collector', description: 'Earn 2 or more stars in one run', metric: 'bestStars', goal: 2, reward: 100, icon: '⭐' }
];

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
      settings: { shadowsEnabled: true }
    };
  }

  _loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return this._defaultProgress();
      const parsed = JSON.parse(raw);
      return {
        unlockedLevel: Math.max(1, Math.min(this.levels.length, parsed.unlockedLevel || 1)),
        levelStats: parsed.levelStats || {},
        coins: Math.max(0, Number(parsed.coins) || 0),
        claimedCampaignRewards: Array.isArray(parsed.claimedCampaignRewards) ? parsed.claimedCampaignRewards : [],
        defeatedBosses: Array.isArray(parsed.defeatedBosses) ? parsed.defeatedBosses : [],
        daily: parsed.daily || createDailyState(),
        settings: { shadowsEnabled: parsed.settings?.shadowsEnabled ?? true }
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
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.progress));
    } catch {
      // Ignore storage quota errors without interrupting a game session.
    }
  }

  getAllLevels() { return this.levels; }
  getLevelCount() { return this.levels.length; }
  getLevel(id) { return this.levels.find((level) => level.id === id) || this.levels[0]; }
  getCurrentLevel() { return this.getLevel(this.currentLevelId); }

  setCurrentLevel(id) {
    this.currentLevelId = Math.max(1, Math.min(this.levels.length, id));
    return this.getCurrentLevel();
  }

  getNextPlayableLevelId() { return Math.min(this.levels.length, this.progress.unlockedLevel); }
  hasNextLevel() { return this.currentLevelId < this.levels.length; }
  isUnlocked(levelId) { return levelId <= this.progress.unlockedLevel; }

  getLevelStats(levelId) {
    return this.progress.levelStats[levelId] || { stars: 0, bestScore: 0, completed: false };
  }

  getTotalStars() {
    return Object.values(this.progress.levelStats).reduce((total, stat) => total + (stat.stars || 0), 0);
  }

  getMaxStars() { return this.levels.length * 3; }
  getCoins() { return this.progress.coins || 0; }

  getDailyMissions() {
    this._refreshDailyState();
    return DAILY_MISSIONS.map((mission) => {
      const value = mission.metric === 'bestStars'
        ? (this.progress.daily.bestStars || 0)
        : (this.progress.daily[mission.metric] || 0);
      const completed = value >= mission.goal;
      return {
        ...mission,
        progress: Math.min(value, mission.goal),
        completed,
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
    this._refreshDailyState();
    const existing = this.getLevelStats(levelId);
    const isNewBest = score > (existing.bestScore || 0);
    this.progress.levelStats[levelId] = {
      completed: true,
      stars: Math.max(existing.stars || 0, stars),
      bestScore: Math.max(existing.bestScore || 0, score)
    };

    if (levelId >= this.progress.unlockedLevel && levelId < this.levels.length) {
      this.progress.unlockedLevel = levelId + 1;
    }

    const rewards = [];
    this.progress.daily.levelsCleared += 1;
    this.progress.daily.bestScore = Math.max(this.progress.daily.bestScore || 0, score);
    this.progress.daily.bestStars = Math.max(this.progress.daily.bestStars || 0, stars);

    const level = this.getLevel(levelId);
    if (level.boss && !this.progress.defeatedBosses.includes(levelId)) {
      this.progress.defeatedBosses.push(levelId);
      this.progress.coins += level.boss.rewardCoins;
      rewards.push({ label: level.boss.rewardTitle, coins: level.boss.rewardCoins });
    }

    const milestone = CAMPAIGN_REWARDS.find((item) => item.level === levelId);
    if (milestone && !this.progress.claimedCampaignRewards.includes(levelId)) {
      this.progress.claimedCampaignRewards.push(levelId);
      this.progress.coins += milestone.coins;
      rewards.push({ label: milestone.title, coins: milestone.coins });
    }

    rewards.push(...this._claimDailyRewards());
    this._saveProgress();
    return {
      isNewBest,
      bestScore: this.progress.levelStats[levelId].bestScore,
      rewards,
      coins: this.progress.coins,
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
