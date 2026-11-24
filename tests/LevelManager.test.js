import test from 'node:test';
import assert from 'node:assert/strict';
import { LevelManager } from '../src/game/LevelManager.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

function freshManager() {
  store.clear();
  return new LevelManager();
}

test('fresh progress starts at level one with no coins', () => {
  const manager = freshManager();
  assert.equal(manager.getNextPlayableLevelId(), 1);
  assert.equal(manager.getCoins(), 0);
  assert.equal(manager.getMaxStars(), 75);
});

test('wins unlock only the next sequential level and replay does not skip progression', () => {
  const manager = freshManager();
  assert.throws(() => manager.recordLevelWin(2, 5000, 3), RangeError);
  manager.recordLevelWin(1, 5000, 3);
  assert.equal(manager.getNextPlayableLevelId(), 2);
  manager.recordLevelWin(1, 5100, 3);
  assert.equal(manager.getNextPlayableLevelId(), 2);
  assert.equal(manager.getLevelStats(1).bestScore, 5100);
});

test('daily, milestone and boss rewards are awarded once', () => {
  const manager = freshManager();
  for (let level = 1; level <= 15; level++) {
    manager.recordLevelWin(level, 5000, 2);
  }
  const firstCoins = manager.getCoins();
  assert.ok(firstCoins > 0);
  manager.recordLevelWin(15, 6000, 3);
  assert.equal(manager.getCoins(), firstCoins);
  assert.equal(manager.getDailySummary().completed, 3);
});

test('malformed and legacy save data is normalized without crashing', () => {
  store.set('towerblast_progress_v1', JSON.stringify({
    unlockedLevel: 999,
    coins: 'not-a-number',
    levelStats: { 1: { completed: true, stars: 99, bestScore: 'bad' }, 900: { stars: 3 } },
    daily: { date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date()) },
    claimedCampaignRewards: ['bad', 5, 5],
    defeatedBosses: [999],
    settings: { shadowsEnabled: false }
  }));
  const manager = new LevelManager();
  assert.equal(manager.getNextPlayableLevelId(), 2);
  assert.equal(manager.getCoins(), 0);
  assert.equal(manager.getTotalStars(), 3);
  assert.equal(manager.getShadowsEnabled(), false);
  assert.doesNotThrow(() => manager.getDailyMissions());
});

test('invalid level selection is clamped to unlocked progression', () => {
  const manager = freshManager();
  assert.equal(manager.setCurrentLevel(25).id, 1);
  assert.equal(manager.setCurrentLevel(Number.NaN).id, 1);
  manager.recordLevelWin(1, 1000, 1);
  assert.equal(manager.setCurrentLevel(25).id, 2);
});
