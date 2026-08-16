export const PLANNING_DATES = Array.from({ length: 12 }, (_, index) => `2026-08-${String(17 + index).padStart(2, '0')}`);
export const LINES = [
  { id: 'izumi-l1', factory: '泉工場', line: 'L1' },
  { id: 'izumi-l2', factory: '泉工場', line: 'L2' },
  { id: 'tondabayashi-l1', factory: '富田林工場', line: 'L1' },
  { id: 'tondabayashi-l2', factory: '富田林工場', line: 'L2' }
];

const productSeed = [
  ['udon','冷凍うどん',700,500,[800,620,600,590,610,630,620,600],'#2673c5'],
  ['soba','冷凍そば',920,430,[520,540,530,550,540,560,550,540],'#387e96'],
  ['napoli','ナポリタン',780,360,[440,460,450,470,480,460,470,450],'#d66d45'],
  ['carbonara','カルボナーラ',650,340,[410,420,430,440,430,450,440,420],'#8d68b8'],
  ['bolognese','ボロネーゼ',740,350,[390,410,420,400,430,420,410,400],'#b65367'],
  ['yakisoba','焼そば',860,400,[500,520,510,530,520,540,530,510],'#b48535'],
  ['shoyu','醤油ラーメン',810,380,[460,480,490,470,500,490,480,470],'#4d82b8'],
  ['miso','味噌ラーメン',760,370,[450,460,470,480,470,490,480,460],'#98703c'],
  ['chanpon','ちゃんぽん',680,330,[380,400,410,390,420,410,400,390],'#3f8e73'],
  ['tantan','担々麺',620,310,[350,370,380,390,380,400,390,370],'#b64f3f']
];

export const planningProducts = productSeed.map(([id,name,currentStock,safety,sales,color]) => ({
  id, name, currentStock, safety, weeklySales: sales, color
}));

export const initialBatches = [
  ['b01','soba',900,9,'2026-08-17','izumi-l1'],['b02','napoli',800,8,'2026-08-17','izumi-l2'],
  ['b03','shoyu',850,8.5,'2026-08-17','tondabayashi-l1'],['b04','miso',800,8,'2026-08-17','tondabayashi-l2'],
  ['b05','carbonara',700,7,'2026-08-18','izumi-l1'],['b06','bolognese',700,7.5,'2026-08-18','izumi-l2'],
  ['b07','yakisoba',900,9,'2026-08-18','tondabayashi-l1'],['b08','chanpon',720,7.5,'2026-08-18','tondabayashi-l2'],
  ['b09','tantan',650,7,'2026-08-19','izumi-l1'],['b10','soba',850,8.5,'2026-08-19','izumi-l2'],
  ['b11','napoli',650,6.5,'2026-08-20','tondabayashi-l1'],['b12','shoyu',700,7,'2026-08-20','tondabayashi-l2'],
  ['b13','miso',750,7.5,'2026-08-21','izumi-l1'],['b14','carbonara',680,7,'2026-08-21','izumi-l2'],
  ['b15','udon',1200,12,'2026-08-24','izumi-l1'],['b16','yakisoba',850,8.5,'2026-08-24','tondabayashi-l1'],
  ['b17','bolognese',720,7.5,'2026-08-25','izumi-l2'],['b18','chanpon',700,7,'2026-08-25','tondabayashi-l2'],
  ['b19','tantan',650,7,'2026-08-26','izumi-l1'],['b20','shoyu',800,8,'2026-08-27','tondabayashi-l1']
].map(([id,productId,quantity,hours,date,lineId]) => ({ id, productId, quantity, hours, date, lineId }));

export const optimizedBatches = initialBatches.map(batch => batch.id === 'b15'
  ? { ...batch, date: '2026-08-18', lineId: 'izumi-l1' }
  : { ...batch });

export function cellConstraint(batches) {
  const hours = batches.reduce((sum, batch) => sum + batch.hours, 0);
  const capacity = batches.length > 1 ? 14 : 16;
  return { hours, capacity, cleaning: batches.length > 1 ? 2 : 0, exceeded: Math.max(0, hours - capacity), violation: hours > capacity };
}

export function calculatePlanningInventory(product, batches) {
  const weeklyProduction = Array(8).fill(0);
  batches.filter(batch => batch.productId === product.id).forEach(batch => {
    const dateIndex = Math.max(0, Math.floor((Number(batch.date.slice(-2)) - 17) / 7));
    weeklyProduction[Math.min(dateIndex, 7)] += batch.quantity;
  });
  let stock = product.currentStock;
  const inventory = product.weeklySales.map((sales, index) => {
    stock += weeklyProduction[index] - sales;
    return stock;
  });
  return { weeklyProduction, inventory };
}
