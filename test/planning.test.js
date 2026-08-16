import test from 'node:test';
import assert from 'node:assert/strict';
import { planningProducts, planningCalendar, initialBatches, addDays, getTokyoToday, getPlanningCalendar, cellConstraint, calculatePlanningInventory } from '../planning.js';

test('日本時間の現在日付から今日を含む月曜日始まりの8週間を生成する', () => {
  const calendar = getPlanningCalendar(new Date('2026-08-16T16:00:00Z'));
  assert.equal(calendar.basisDate, '2026-08-17');
  assert.equal(calendar.startDate, '2026-08-17');
  assert.equal(calendar.endDate, '2026-10-11');
  assert.equal(calendar.dates.length, 56);
  assert.equal(calendar.weeks.length, 8);
});

test('日本時間への変換と8週間の日付計算は年またぎに対応する', () => {
  const now = new Date('2026-12-31T15:30:00Z');
  assert.equal(getTokyoToday(now), '2027-01-01');
  const calendar = getPlanningCalendar(now);
  assert.equal(calendar.startDate, '2026-12-28');
  assert.equal(calendar.endDate, '2027-02-21');
});

test('日曜日でも計画開始日は同じ週の月曜日になり、月またぎを保持する', () => {
  const calendar = getPlanningCalendar(new Date('2026-05-31T03:00:00Z'));
  assert.equal(calendar.basisDate, '2026-05-31');
  assert.equal(calendar.startDate, '2026-05-25');
  assert.equal(calendar.weeks[1].start, '2026-06-01');
  assert.equal(calendar.dates[6], '2026-05-31');
});

test('1品は16時間、2品は清掃時間を考慮して14時間を上限にする', () => {
  assert.deepEqual(cellConstraint([{ hours: 15 }]), { hours: 15, capacity: 16, cleaning: 0, exceeded: 0, violation: false });
  assert.deepEqual(cellConstraint([{ hours: 8 }, { hours: 7 }]), { hours: 15, capacity: 14, cleaning: 2, exceeded: 1, violation: true });
});

test('製造カードを前週へ移すと該当週以降の未来在庫が変わる', () => {
  const product = planningProducts.find(item => item.id === 'udon');
  const before = calculatePlanningInventory(product, initialBatches);
  const moved = initialBatches.map(batch => batch.id === 'b15' ? { ...batch, date: addDays(planningCalendar.startDate, 1) } : batch);
  const after = calculatePlanningInventory(product, moved);
  assert.equal(before.inventory[0], -100);
  assert.equal(after.inventory[0], 1100);
  assert.equal(after.weeklyProduction[0], 1200);
});
