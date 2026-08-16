import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInventory, getStatus } from '../inventory.js';

test('現在庫から8週間の週末在庫を順番に計算する', () => {
  assert.deepEqual(calculateInventory(100, [30, 40, 50], [20, 60, 10]), [90, 110, 70]);
});

test('製造計画の変更は変更週以降の在庫に反映される', () => {
  const before = calculateInventory(100, [30, 30, 30], [30, 30, 30]);
  const after = calculateInventory(100, [30, 30, 30], [30, 50, 30]);
  assert.deepEqual(before, [100, 100, 100]);
  assert.deepEqual(after, [100, 120, 120]);
});

test('安全在庫未満と欠品を正しく判定する', () => {
  assert.equal(getStatus(300, 300), 'normal');
  assert.equal(getStatus(299, 300), 'warning');
  assert.equal(getStatus(-1, 300), 'shortage');
});

test('倉庫間入出庫を含む在庫計算を行う', () => {
  assert.deepEqual(
    calculateInventory(100, [40, 50], [30, 20], [10, 5], [5, 15]),
    [95, 55]
  );
});
