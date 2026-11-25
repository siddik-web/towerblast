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

test('daily challenge always selects an unlocked campaign level and a clear objective', () => {
  const manager = freshManager();
  const challenge = manager.getDailyChallenge();

  assert.ok(challenge.levelId >= 1);
  assert.ok(challenge.levelId <= manager.getNextPlayableLevelId());
  assert.ok(['precision', 'efficiency', 'combo'].includes(challenge.id));
  assert.ok(challenge.reward > 0);
  assert.equal(challenge.claimed, false);
});

test('daily challenge awards its bonus only once when the objective is met', () => {
  const manager = freshManager();
  const challenge = manager.getDailyChallenge();
  const level = manager.getLevel(challenge.levelId);
  const summary = {
    destructionRatio: challenge.id === 'precision' ? Math.min(0.99, level.targetDestruction + 0.05) : level.targetDestruction,
    remainingAmmo: challenge.id === 'efficiency' ? 2 : 0,
    maxCombo: challenge.id === 'combo' ? 4 : 1
  };

  const before = manager.getCoins();
  const result = manager.recordDailyChallengeWin(summary);

  assert.equal(result.success, true);
  assert.equal(result.reward, challenge.reward);
  assert.equal(manager.getCoins(), before + challenge.reward);
  assert.equal(manager.getDailyChallenge().claimed, true);

  const repeated = manager.recordDailyChallengeWin(summary);
  assert.equal(repeated.success, false);
  assert.equal(manager.getCoins(), before + challenge.reward);
});

test('daily challenge does not reward a cleared level when its special objective is missed', () => {
  const manager = freshManager();
  const challenge = manager.getDailyChallenge();
  const result = manager.recordDailyChallengeWin({
    destructionRatio: 0,
    remainingAmmo: 0,
    maxCombo: 1
  });

  if (challenge.id === 'precision') assert.equal(result.success, false);
  if (challenge.id === 'efficiency') assert.equal(result.success, false);
  if (challenge.id === 'combo') assert.equal(result.success, false);
  assert.equal(manager.getDailyChallenge().claimed, false);
});
