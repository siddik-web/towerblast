import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels/levelData.js';

const totalShots = (ammo) => Object.values(ammo).reduce((sum, count) => sum + count, 0);

test('campaign levels require meaningful destruction and bounded ammunition', () => {
  for (const level of LEVELS) {
    assert.ok(level.targetDestruction >= 0.86, `Level ${level.id} target is too forgiving`);
    assert.ok(level.targetDestruction <= 0.97, `Level ${level.id} target is unreasonable`);
    assert.ok(totalShots(level.ammo) >= 2, `Level ${level.id} has too few shots`);
    assert.ok(totalShots(level.ammo) <= 7, `Level ${level.id} has too many shots`);
  }
});

test('campaign pressure increases from the opening tutorial to the final boss', () => {
  const first = LEVELS.find((level) => level.id === 1);
  const mid = LEVELS.find((level) => level.id === 10);
  const final = LEVELS.find((level) => level.id === 25);

  assert.equal(totalShots(first.ammo), 4);
  assert.ok(mid.targetDestruction >= 0.92);
  assert.ok(final.targetDestruction >= 0.97);
  assert.ok(totalShots(final.ammo) <= 5);
});

test('advanced precision trials retain small, deliberate shot budgets', () => {
  for (const level of LEVELS.filter(({ id }) => id >= 16)) {
    assert.ok(level.targetDestruction >= 0.94, `Level ${level.id} is not an expert challenge`);
    assert.ok(totalShots(level.ammo) <= 5, `Level ${level.id} has a loose shot budget`);
  }
});
