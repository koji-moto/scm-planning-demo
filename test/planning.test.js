import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, getTokyoDate, getPlanningStart, PLAN_START_DATE, planningProducts, initialBatches, cellConstraint, calculatePlanningInventory } from '../planning.js';

test('日本時間の現在日付と、今日以降で最初の月曜日を基準日にする', () => {
  assert.equal(getTokyoDate(new Date('2026-12-31T15:30:00Z')), '2027-01-01');
  assert.equal(getPlanningStart('2027-01-01'), '2027-01-04');
  assert.equal(getPlanningStart('2026-08-16'), '2026-08-17');
  assert.equal(getPlanningStart('2026-08-17'), '2026-08-17');
});

test('日付加算は月またぎと年またぎを正しく処理する', () => {
  assert.equal(addDays('2026-12-28', 55), '2027-02-21');
  assert.equal(addDays('2027-02-27', 2), '2027-03-01');
});

test('1品は16時間、2品は清掃時間を考慮して14時間を上限にする', () => {
  assert.deepEqual(cellConstraint([{ hours: 15 }]), { hours: 15, capacity: 16, cleaning: 0, exceeded: 0, violation: false });
  assert.deepEqual(cellConstraint([{ hours: 8 }, { hours: 7 }]), { hours: 15, capacity: 14, cleaning: 2, exceeded: 1, violation: true });
});

test('製造カードを前週へ移すと該当週以降の未来在庫が変わる', () => {
  const product = planningProducts.find(item => item.id === 'udon');
  const before = calculatePlanningInventory(product, initialBatches);
  const moved = initialBatches.map(batch => batch.id === 'b15' ? { ...batch, date: addDays(PLAN_START_DATE, 1) } : batch);
  const after = calculatePlanningInventory(product, moved);
  assert.equal(before.inventory[0], -100);
  assert.equal(after.inventory[0], 1100);
  assert.equal(after.weeklyProduction[0], 1200);
});
