import test from 'node:test';
import assert from 'node:assert/strict';
import { planningProducts, initialBatches, cellConstraint, calculatePlanningInventory } from '../planning.js';

test('1品は16時間、2品は清掃時間を考慮して14時間を上限にする', () => {
  assert.deepEqual(cellConstraint([{ hours: 15 }]), { hours: 15, capacity: 16, cleaning: 0, exceeded: 0, violation: false });
  assert.deepEqual(cellConstraint([{ hours: 8 }, { hours: 7 }]), { hours: 15, capacity: 14, cleaning: 2, exceeded: 1, violation: true });
});

test('製造カードを前週へ移すと該当週以降の未来在庫が変わる', () => {
  const product = planningProducts.find(item => item.id === 'udon');
  const before = calculatePlanningInventory(product, initialBatches);
  const moved = initialBatches.map(batch => batch.id === 'b15' ? { ...batch, date: '2026-08-18' } : batch);
  const after = calculatePlanningInventory(product, moved);
  assert.equal(before.inventory[0], -100);
  assert.equal(after.inventory[0], 1100);
  assert.equal(after.weeklyProduction[0], 1200);
});
