const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(dateKey, days) {
  return toDateKey(new Date(fromDateKey(dateKey).getTime() + days * DAY_MS));
}

/** 実行環境のタイムゾーンに依存せず、Asia/Tokyo のカレンダー日付を返す。 */
export function getTokyoToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** 今日を含む週の月曜日を起点に、8週間分の共通計画カレンダーを生成する。 */
export function getPlanningCalendar(now = new Date()) {
  const basisDate = getTokyoToday(now);
  const basis = fromDateKey(basisDate);
  const weekday = basis.getUTCDay();
  const startDate = addDays(basisDate, -(weekday === 0 ? 6 : weekday - 1));
  const dates = Array.from({ length: 56 }, (_, index) => addDays(startDate, index));
  const weeks = Array.from({ length: 8 }, (_, index) => ({
    index,
    start: addDays(startDate, index * 7),
    end: addDays(startDate, index * 7 + 6)
  }));
  return { basisDate, startDate, endDate: dates[dates.length - 1], dates, weeks };
}

export const planningCalendar = getPlanningCalendar();
export const PLANNING_DATES = planningCalendar.dates;
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
  ['b01','soba',900,9,0,'izumi-l1'],['b02','napoli',800,8,0,'izumi-l2'],
  ['b03','shoyu',850,8.5,0,'tondabayashi-l1'],['b04','miso',800,8,0,'tondabayashi-l2'],
  ['b05','carbonara',700,7,1,'izumi-l1'],['b06','bolognese',700,7.5,1,'izumi-l2'],
  ['b07','yakisoba',900,9,1,'tondabayashi-l1'],['b08','chanpon',720,7.5,1,'tondabayashi-l2'],
  ['b09','tantan',650,7,2,'izumi-l1'],['b10','soba',850,8.5,2,'izumi-l2'],
  ['b11','napoli',650,6.5,3,'tondabayashi-l1'],['b12','shoyu',700,7,3,'tondabayashi-l2'],
  ['b13','miso',750,7.5,4,'izumi-l1'],['b14','carbonara',680,7,4,'izumi-l2'],
  ['b15','udon',1200,12,7,'izumi-l1'],['b16','yakisoba',850,8.5,7,'tondabayashi-l1'],
  ['b17','bolognese',720,7.5,8,'izumi-l2'],['b18','chanpon',700,7,8,'tondabayashi-l2'],
  ['b19','tantan',650,7,9,'izumi-l1'],['b20','shoyu',800,8,10,'tondabayashi-l1']
].map(([id,productId,quantity,hours,dayOffset,lineId]) => ({ id, productId, quantity, hours, date: addDays(planningCalendar.startDate, dayOffset), lineId }));

export const optimizedBatches = initialBatches.map(batch => batch.id === 'b15'
  ? { ...batch, date: addDays(planningCalendar.startDate, 1), lineId: 'izumi-l1' }
  : { ...batch });

export function cellConstraint(batches) {
  const hours = batches.reduce((sum, batch) => sum + batch.hours, 0);
  const capacity = batches.length > 1 ? 14 : 16;
  return { hours, capacity, cleaning: batches.length > 1 ? 2 : 0, exceeded: Math.max(0, hours - capacity), violation: hours > capacity };
}

export function calculatePlanningInventory(product, batches) {
  const weeklyProduction = Array(8).fill(0);
  batches.filter(batch => batch.productId === product.id).forEach(batch => {
    const dayOffset = Math.round((fromDateKey(batch.date) - fromDateKey(planningCalendar.startDate)) / DAY_MS);
    const weekIndex = Math.floor(dayOffset / 7);
    if (weekIndex >= 0 && weekIndex < weeklyProduction.length) weeklyProduction[weekIndex] += batch.quantity;
  });
  let stock = product.currentStock;
  const inventory = product.weeklySales.map((sales, index) => {
    stock += weeklyProduction[index] - sales;
    return stock;
  });
  return { weeklyProduction, inventory };
}
