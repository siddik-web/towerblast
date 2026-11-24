import { LEVELS } from '../levels/levelData.js';

const PROGRESS_KEY = 'towerblast_progress_v1';

export class LevelManager {
  constructor() {
    this.levels = LEVELS;
    this.currentLevelId = 1;
    this.progress = this._loadProgress();
  }

  _defaultProgress() {
    return {
      unlockedLevel: 1,
      levelStats: {},
      settings: {
        shadowsEnabled: true
      }
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
        settings: {
          shadowsEnabled: parsed.settings?.shadowsEnabled ?? true
        }
      };
    } catch {
      return this._defaultProgress();
    }
  }

  _saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.progress));
    } catch {
      // Ignore storage quota errors
    }
  }

  getAllLevels() {
    return this.levels;
  }

  getLevelCount() {
    return this.levels.length;
  }

  getLevel(id) {
    return this.levels.find((l) => l.id === id) || this.levels[0];
  }

  getCurrentLevel() {
    return this.getLevel(this.currentLevelId);
  }

  setCurrentLevel(id) {
    const clamped = Math.max(1, Math.min(this.levels.length, id));
    this.currentLevelId = clamped;
    return this.getCurrentLevel();
  }

  getNextPlayableLevelId() {
    return Math.min(this.levels.length, this.progress.unlockedLevel);
  }

  hasNextLevel() {
    return this.currentLevelId < this.levels.length;
  }

  isUnlocked(levelId) {
    return levelId <= this.progress.unlockedLevel;
  }

  getLevelStats(levelId) {
    return this.progress.levelStats[levelId] || { stars: 0, bestScore: 0, completed: false };
  }

  getTotalStars() {
    let total = 0;
    for (const stat of Object.values(this.progress.levelStats)) {
      total += stat.stars || 0;
    }
    return total;
  }

  getMaxStars() {
    return this.levels.length * 3;
  }

  recordLevelWin(levelId, score, stars) {
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

    this._saveProgress();
    return { isNewBest, bestScore: this.progress.levelStats[levelId].bestScore };
  }

  getShadowsEnabled() {
    return this.progress.settings.shadowsEnabled;
  }

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
