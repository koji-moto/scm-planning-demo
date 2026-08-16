export const WEEKS = Array.from({ length: 8 }, (_, index) => `第${index + 1}週`);
export const WAREHOUSES = ['関西倉庫', '関東倉庫', '北海道倉庫', '九州倉庫'];

const plans = {
  '冷凍うどん': { code: 'M-UDN-01', type: 'make', safety: 420, stocks: [1280, 980, 620, 710], sales: [390,420,450,510,480,470,450,430], supply: [430,440,460,380,520,480,460,450] },
  '冷凍ラーメン': { code: 'M-RMN-02', type: 'make', safety: 360, stocks: [1020, 850, 540, 630], sales: [340,360,380,390,410,400,380,370], supply: [380,390,400,410,420,400,390,380] },
  '冷凍パスタ': { code: 'M-PST-03', type: 'make', safety: 380, stocks: [1100, 920, 590, 680], sales: [350,380,410,430,420,440,410,390], supply: [400,420,380,450,460,430,420,410] },
  '冷凍餃子': { code: 'P-GYZ-11', type: 'buy', safety: 330, stocks: [890, 760, 410, 550], sales: [300,320,340,350,370,360,340,330], supply: [320,340,300,360,400,360,350,340] },
  '冷凍コロッケ': { code: 'P-CRQ-12', type: 'buy', safety: 300, stocks: [940, 880, 620, 1120], sales: [270,280,300,310,320,310,300,290], supply: [300,310,320,320,330,310,300,290] },
  '豚まん': { code: 'P-BUN-13', type: 'buy', safety: 280, stocks: [760, 650, 390, 480], sales: [260,280,300,330,340,320,300,280], supply: [280,300,260,300,380,330,300,290] }
};

export const products = Object.entries(plans).map(([name, plan]) => ({ name, ...plan }));

/** 前週末在庫に供給・移動入庫を足し、販売・移動出庫を引いて週末在庫を算出する。 */
export function calculateInventory(currentStock, sales, supply, inbound = [], outbound = []) {
  let stock = currentStock;
  return sales.map((amount, index) => {
    stock += (supply[index] || 0) + (inbound[index] || 0) - amount - (outbound[index] || 0);
    return stock;
  });
}

export function getStatus(stock, safetyStock) {
  if (stock < 0) return 'shortage';
  if (stock < safetyStock) return 'warning';
  return 'normal';
}

export function warehousePlan(product, warehouseIndex) {
  const factors = [0.32, 0.38, 0.13, 0.17];
  const factor = factors[warehouseIndex];
  const sales = product.sales.map(value => Math.round(value * factor));
  const supply = product.supply.map(value => Math.round(value * factor));
  // PoCのリスク表示用に、関東うどんと北海道餃子の供給を意図的に絞る。
  if (product.name === '冷凍うどん' && warehouseIndex === 1) supply.splice(2, 3, 40, 30, 110);
  if (product.name === '冷凍餃子' && warehouseIndex === 2) supply.splice(3, 2, 5, 15);
  return { currentStock: product.stocks[warehouseIndex], sales, supply, inbound: Array(8).fill(0), outbound: Array(8).fill(0) };
}

export const factories = [
  { name: '泉工場', products: '冷凍うどん・冷凍パスタ', capacity: 1900, plan: [1510,1640,1805,1720,1870,1810,1660,1580] },
  { name: '富工場', products: '冷凍ラーメン・冷凍パスタ', capacity: 1600, plan: [1160,1240,1310,1480,1540,1625,1390,1280] }
];

export const purchaseOrders = [
  { product: '冷凍餃子', quantity: 2400, arrival: '第3週', lead: '14日', alert: '第2週までに発注', level: 'high' },
  { product: '冷凍コロッケ', quantity: 1200, arrival: '第6週', lead: '10日', alert: '発注保留（在庫過多）', level: 'low' },
  { product: '豚まん', quantity: 1800, arrival: '第4週', lead: '21日', alert: '今週中に発注必要', level: 'high' }
];
