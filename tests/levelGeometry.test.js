import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels/levelData.js';

function overlaps(a, b, axis, tolerance = 0.015) {
  const halfA = a[axis === 'x' ? 'w' : axis === 'y' ? 'h' : 'd'] / 2;
  const halfB = b[axis === 'x' ? 'w' : axis === 'y' ? 'h' : 'd'] / 2;
  return Math.min(a[axis] + halfA, b[axis] + halfB) -
    Math.max(a[axis] - halfA, b[axis] - halfB) > tolerance;
}

function hasVolumeOverlap(a, b) {
  return overlaps(a, b, 'x') && overlaps(a, b, 'y') && overlaps(a, b, 'z');
}

test('advanced campaign towers spawn without intersecting rigid-body colliders', () => {
  for (const level of LEVELS.filter(({ id }) => id >= 16)) {
    const blocks = level.build();
    assert.ok(blocks.length > 0, `Level ${level.id} has no blocks`);
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        assert.equal(
          hasVolumeOverlap(blocks[i], blocks[j]),
          false,
          `Level ${level.id}: blocks ${i} and ${j} overlap in their initial positions`
        );
      }
    }
  }
});

test('all level blueprints contain finite, positive dimensions and valid materials', () => {
  const validMaterials = new Set(['wood', 'glass', 'explosive', 'stone', 'concrete', 'steel']);
  for (const level of LEVELS) {
    for (const [index, block] of level.build().entries()) {
      for (const key of ['x', 'y', 'z', 'w', 'h', 'd']) {
        assert.ok(Number.isFinite(block[key]), `Level ${level.id} block ${index}: invalid ${key}`);
      }
      assert.ok(block.w > 0 && block.h > 0 && block.d > 0, `Level ${level.id} block ${index}: non-positive size`);
      assert.ok(validMaterials.has(block.material), `Level ${level.id} block ${index}: unknown material`);
    }
  }
});
