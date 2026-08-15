export const products = [
  { code: 'FP-101', name: '冷凍パスタA', currentStock: 620, safetyStock: 300, sales: [420, 450, 480, 460, 520, 550, 510, 540], production: [500, 500, 400, 500, 600, 500, 550, 550] },
  { code: 'FU-202', name: '冷凍うどんB', currentStock: 480, safetyStock: 250, sales: [360, 380, 410, 430, 450, 420, 440, 460], production: [400, 400, 400, 450, 400, 450, 450, 500] },
  { code: 'FR-303', name: '冷凍ラーメンC', currentStock: 350, safetyStock: 200, sales: [300, 340, 380, 400, 420, 450, 430, 460], production: [350, 300, 350, 400, 400, 450, 400, 500] }
];

/** 現在庫を起点に、各週の「前週在庫 + 製造 - 販売」を順番に計算します。 */
export function calculateInventory(currentStock, sales, production) {
  let stock = currentStock;
  return sales.map((amount, index) => {
    stock += production[index] - amount;
    return stock;
  });
}

export function getStatus(stock, safetyStock) {
  if (stock < 0) return 'shortage';
  if (stock < safetyStock) return 'warning';
  return 'normal';
}
