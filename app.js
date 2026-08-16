import { products, WEEKS, WAREHOUSES, factories, purchaseOrders, calculateInventory, getStatus, warehousePlan } from './inventory.js';
import { PLANNING_DATES, LINES, planningCalendar, addDays, planningProducts, initialBatches, optimizedBatches, cellConstraint, calculatePlanningInventory } from './planning.js';

const format = value => Number(value).toLocaleString('ja-JP');
const productSelect = document.querySelector('#product-select');
const warehouseSelect = document.querySelector('#warehouse-select');
const canvas = document.querySelector('#inventory-chart');

const kpis = [
  ['供給充足率','96.8','%','+1.2pt','good'],['8週間販売計画数量','48,620','cs','+3.8%','good'],['総在庫数量','18,450','cs','前週比 -2.4%',''],
  ['在庫金額','¥128.6','百万円','予算比 +4.2%','warn'],['欠品リスク商品数','2','商品','要対応','danger'],['過剰在庫商品数','1','商品','九州倉庫','warn'],
  ['要製造商品数','3','商品','計画調整 2件',''],['要発注商品数','2','商品','今週期限 1件','warn'],['工場キャパ不足見込み','1','週','富工場 第6週','danger']
];
document.querySelector('#kpis').innerHTML = kpis.map(([label,value,unit,note,tone]) => `<article class="kpi ${tone}"><span>${label}</span><strong>${value}<small>${unit}</small></strong><em>${note}</em></article>`).join('');

const warehouseData = [
  ['関西倉庫',5030,11840,4280,0,0,72],['関東倉庫',4210,15260,1850,2,0,38],['北海道倉庫',2170,8460,940,1,0,25],['九州倉庫',3040,13060,3920,0,1,84]
];
document.querySelector('#warehouses').innerHTML = warehouseData.map(([name,stock,sales,future,shortage,excess,ratio]) => `<article class="warehouse-card"><div><h3>${name}</h3><span class="${shortage ? 'risk' : excess ? 'excess' : 'stable'}">${shortage ? '要注意' : excess ? '過剰傾向' : '安定'}</span></div><dl><dt>現在庫</dt><dd>${format(stock)}</dd><dt>8週販売計画</dt><dd>${format(sales)}</dd><dt>第8週未来在庫</dt><dd>${format(future)}</dd></dl><div class="meter"><i style="width:${ratio}%"></i></div><p><span>欠品リスク <b class="red">${shortage}</b></span><span>過剰リスク <b class="amber">${excess}</b></span></p></article>`).join('');

const alerts = [
  ['高','冷凍うどん','関東倉庫で第4週に欠品見込み','在庫・供給'],['高','冷凍パスタ','泉工場の第3週キャパ使用率95%','工場キャパ'],['中','冷凍餃子','北海道倉庫で第5週に安全在庫割れ','在庫・供給'],['中','冷凍コロッケ','九州倉庫で過剰在庫見込み','在庫適正化'],['低','豚まん','リードタイムを考慮し次回発注が必要','発注管理']
];
document.querySelector('#alerts').innerHTML = alerts.map(([level,name,text,category]) => `<article class="alert"><b class="level level-${level}">${level}</b><div><strong>${name}</strong><p>${text}</p><small>${category} ・ 詳細を確認 →</small></div></article>`).join('');

productSelect.innerHTML = products.map((product,index) => `<option value="${index}">${product.name}</option>`).join('');
warehouseSelect.innerHTML = WAREHOUSES.map((name,index) => `<option value="${index}">${name}</option>`).join('');
productSelect.value = '0'; warehouseSelect.value = '1';

function cells(values, formatter = format) { return values.map(value => `<td>${formatter(value)}</td>`).join(''); }
function planRow(label, sub, values, status = false) {
  return `<tr><th>${label}<small>${sub}</small></th>${values.map(value => `<td class="${status ? getStatus(value, selected().product.safety) : ''}">${format(value)}${status && value < 0 ? '<small>欠品</small>' : ''}</td>`).join('')}</tr>`;
}
function selected() {
  const product = products[Number(productSelect.value)];
  return { product, plan: warehousePlan(product, Number(warehouseSelect.value)) };
}
function renderSimulation() {
  const { product, plan } = selected();
  const inventory = calculateInventory(plan.currentStock, plan.sales, plan.supply, plan.inbound, plan.outbound);
  document.querySelector('#product-meta').innerHTML = `<div><span>商品コード</span><strong>${product.code}</strong></div><div><span>調達区分</span><strong>${product.type === 'make' ? '自社製造品' : '仕入品'}</strong></div><div><span>現在庫</span><strong>${format(plan.currentStock)} cs</strong></div><div><span>安全在庫</span><strong>${format(product.safety)} cs</strong></div>`;
  document.querySelector('#plan-head').innerHTML = `<tr><th>計画項目</th>${WEEKS.map(week => `<th>${week}</th>`).join('')}</tr>`;
  document.querySelector('#plan-table').innerHTML = planRow('販売計画','出荷予定',plan.sales) + planRow(product.type === 'make' ? '製造計画' : '発注・入荷計画', product.type === 'make' ? '工場から供給' : '仕入先から入荷',plan.supply) + planRow('倉庫間入庫','移動入庫',plan.inbound) + planRow('倉庫間出庫','移動出庫',plan.outbound) + planRow('週末未来在庫','自動計算',inventory,true);
  drawChart(inventory, product.safety);
}

function drawChart(values, safety) {
  const ratio = window.devicePixelRatio || 1, width = canvas.clientWidth, height = canvas.clientHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
  const pad = {left:48,right:20,top:25,bottom:38};
  const max = Math.ceil(Math.max(...values,safety) / 100) * 100 + 100, min = Math.min(0,Math.floor(Math.min(...values)/100)*100);
  const x=i=>pad.left+i*(width-pad.left-pad.right)/7, y=v=>pad.top+(max-v)*(height-pad.top-pad.bottom)/(max-min);
  ctx.font='11px sans-serif'; ctx.fillStyle='#718095'; ctx.textAlign='right';
  for(let i=0;i<5;i++){const v=min+(max-min)*i/4,py=y(v);ctx.beginPath();ctx.strokeStyle='#e6eaf0';ctx.moveTo(pad.left,py);ctx.lineTo(width-pad.right,py);ctx.stroke();ctx.fillText(Math.round(v),pad.left-10,py+4);}
  ctx.textAlign='center'; WEEKS.forEach((w,i)=>ctx.fillText(w,x(i),height-12));
  ctx.setLineDash([6,5]);ctx.beginPath();ctx.strokeStyle='#e4a72d';ctx.lineWidth=2;ctx.moveTo(x(0),y(safety));ctx.lineTo(x(7),y(safety));ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.strokeStyle='#2563a9';ctx.lineWidth=3;values.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();
  values.forEach((v,i)=>{ctx.beginPath();ctx.fillStyle=getStatus(v,safety)==='shortage'?'#d74747':'#2563a9';ctx.arc(x(i),y(v),4.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=2;ctx.stroke();});
}

document.querySelector('#purchases').innerHTML = purchaseOrders.map(order => `<article><div><strong>${order.product}</strong><span class="po-${order.level}">${order.alert}</span></div><dl><dt>発注予定数量</dt><dd>${format(order.quantity)} cs</dd><dt>入荷予定週</dt><dd>${order.arrival}</dd><dt>リードタイム</dt><dd>${order.lead}</dd></dl></article>`).join('');
function capacityClass(rate){return rate>100?'over':rate>=95?'heavy':rate>=80?'care':'ok';}
document.querySelector('#factories').innerHTML = factories.map(factory => `<article><div class="factory-head"><div><h3>${factory.name}</h3><span>${factory.products}</span></div><strong>最大能力 ${format(factory.capacity)} cs/週</strong></div><div class="capacity-weeks">${factory.plan.map((value,i)=>{const rate=Math.round(value/factory.capacity*100);return `<div><span>${WEEKS[i]}</span><div class="capbar"><i class="${capacityClass(rate)}" style="height:${Math.min(rate,110)*.7}%"></i></div><strong class="${capacityClass(rate)}-text">${rate}%</strong><small>${format(value)}</small></div>`}).join('')}</div></article>`).join('');

[productSelect,warehouseSelect].forEach(select=>select.addEventListener('change',renderSimulation));
window.addEventListener('resize',renderSimulation);
const views = { executive: document.querySelector('#executive-view'), planning: document.querySelector('#planning-view'), simple: document.querySelector('#simple-view') };
function showView(name) {
  Object.values(views).forEach(view => { view.hidden = true; view.classList.remove('active-view'); });
  const target = name === 'planning' ? views.planning : name === 'executive' ? views.executive : views.simple;
  target.hidden = false; target.classList.add('active-view');
  if (name === 'simulation') {
    document.querySelector('#simple-eyebrow').textContent = 'SUPPLY & DEMAND SIMULATION';
    document.querySelector('#simple-title').textContent = '需給シミュレーション';
    document.querySelector('#simple-copy').textContent = '商品・倉庫別の8週間需給計画は、経営ダッシュボード内の詳細シミュレーションで確認できます。';
    document.querySelector('#simple-action').textContent = '需給シミュレーションを開く';
    document.querySelector('#simple-action').onclick = () => { showView('executive'); document.querySelector('[data-view="executive"]').click(); document.querySelector('#operations').scrollIntoView({ behavior: 'smooth' }); };
  } else if (name === 'materials') {
    document.querySelector('#simple-eyebrow').textContent = 'MATERIAL REQUIREMENTS / NEXT PHASE';
    document.querySelector('#simple-title').textContent = '資材・発注計画';
    document.querySelector('#simple-copy').textContent = '製造計画から原材料・包材の所要量を展開し、不足資材と発注提案につなげる次期機能です。';
    document.querySelector('#simple-action').textContent = 'AI製造計画を確認';
    document.querySelector('#simple-action').onclick = () => document.querySelector('[data-view="planning"]').click();
  }
  if (name === 'planning') requestAnimationFrame(renderPlanner);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.nav-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.nav-tabs button').forEach(b=>b.classList.remove('active'));button.classList.add('active');showView(button.dataset.view);}));

let productionPlan = initialBatches.map(batch => ({ ...batch }));
const productById = Object.fromEntries(planningProducts.map(product => [product.id, product]));
const formatDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
const formatFullDate = date => date.replaceAll('-', '/');
const weekDay = date => ['日','月','火','水','木','金','土'][new Date(`${date}T00:00:00Z`).getUTCDay()];
const planningWeekLabels = planningCalendar.weeks.map(week => `${formatDate(week.start)}〜${formatDate(week.end)}`);
function plannerStatus(value, safety) { return value < 0 ? 'shortage' : value < safety ? 'warning' : 'normal'; }

function renderPlanner() {
  document.querySelector('#planning-basis').textContent = `計画基準日：${formatFullDate(planningCalendar.basisDate)}`;
  document.querySelector('#planning-period').textContent = `${formatFullDate(planningCalendar.startDate)} — ${formatFullDate(planningCalendar.endDate)}`;
  const board = document.querySelector('#schedule-board');
  board.innerHTML = `<div class="schedule-corner"><small>DATE / LINE</small><strong>日付</strong></div>${LINES.map(line => `<div class="line-heading"><small>${line.factory}</small><strong>${line.line}</strong><span>最大 16.0h / 日</span></div>`).join('')}` + PLANNING_DATES.map(date => {
    const isWeekend = [0,6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
    const isToday = date === planningCalendar.basisDate;
    return `<div class="date-heading ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}"><small>${date.slice(0,4)}</small><strong>${formatDate(date)}</strong><span>${weekDay(date)}</span>${isToday ? '<b>今日</b>' : ''}</div>` + LINES.map(line => renderScheduleCell(date, line.id));
  }).join('');
  bindPlannerDragAndDrop();
  renderFutureInventory();
  const total = productionPlan.reduce((sum, batch) => sum + batch.quantity, 0);
  const violations = PLANNING_DATES.flatMap(date => LINES.map(line => cellConstraint(productionPlan.filter(batch => batch.date === date && batch.lineId === line.id)))).filter(item => item.violation).length;
  document.querySelector('#total-production').textContent = `${format(total)} cs`;
  document.querySelector('#violation-count').innerHTML = `<span class="${violations ? 'red' : 'green'}">${violations} セル</span>`;
}

function renderScheduleCell(date, lineId) {
  const batches = productionPlan.filter(batch => batch.date === date && batch.lineId === lineId);
  const constraint = cellConstraint(batches);
  const cards = batches.map(batch => { const product = productById[batch.productId]; return `<article class="product-card" draggable="true" data-batch-id="${batch.id}" style="--product-color:${product.color}"><div><i></i><strong>${product.name}</strong><span class="drag-handle">⠿</span></div><p>${format(batch.quantity)} <small>cs</small><b>${batch.hours.toFixed(1)}h</b></p></article>`; }).join('');
  const warning = constraint.violation ? `<div class="constraint-alert"><strong>● 制約違反</strong><span>2商品切替・清掃2hが必要</span><span>必要 ${constraint.hours.toFixed(1)}h / 使用可能 ${constraint.capacity.toFixed(1)}h</span><b>${constraint.exceeded.toFixed(1)}h 超過</b></div>` : batches.length ? `<div class="cell-capacity"><span>${constraint.hours.toFixed(1)} / ${constraint.capacity.toFixed(1)}h</span><i><b style="width:${Math.min(100, constraint.hours / constraint.capacity * 100)}%"></b></i></div>` : '<span class="drop-hint">ここへドロップ</span>';
  return `<div class="schedule-cell ${constraint.violation ? 'cell-violation' : ''}" data-date="${date}" data-line-id="${lineId}">${cards}${warning}</div>`;
}

function bindPlannerDragAndDrop() {
  document.querySelectorAll('.product-card').forEach(card => card.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', card.dataset.batchId); event.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); }));
  document.querySelectorAll('.schedule-cell').forEach(cell => {
    cell.addEventListener('dragover', event => { event.preventDefault(); cell.classList.add('drag-over'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', event => { event.preventDefault(); const batch = productionPlan.find(item => item.id === event.dataTransfer.getData('text/plain')); if (!batch) return; batch.date = cell.dataset.date; batch.lineId = cell.dataset.lineId; showPlannerToast(`${productById[batch.productId].name}を ${formatDate(batch.date)} に移動し、未来在庫を再計算しました`); renderPlanner(); });
  });
}

function renderFutureInventory() {
  const results = planningProducts.map(product => ({ product, ...calculatePlanningInventory(product, productionPlan) }));
  document.querySelector('#future-head').innerHTML = `<tr><th>商品 / リスク</th><th>現在庫</th>${planningWeekLabels.map((range,index) => `<th>第${index + 1}週<small>${range}<br>販売 / 製造 / 週末</small></th>`).join('')}<th>安全在庫</th></tr>`;
  document.querySelector('#future-body').innerHTML = results.map(({ product, weeklyProduction, inventory }) => { const worst = inventory.some(value => value < 0) ? 'shortage' : inventory.some(value => value < product.safety) ? 'warning' : 'normal'; const labels = {normal:'正常',warning:'安全在庫割れ',shortage:'欠品'}; return `<tr><th><i class="product-dot" style="background:${product.color}"></i>${product.name}<span class="risk-pill ${worst}">● ${labels[worst]}</span></th><td><strong>${format(product.currentStock)}</strong></td>${inventory.map((stock,index) => `<td class="${plannerStatus(stock,product.safety)}"><span>${format(product.weeklySales[index])}</span><span class="production">+${format(weeklyProduction[index])}</span><strong>${format(stock)}</strong></td>`).join('')}<td>${format(product.safety)}</td></tr>`; }).join('');
  const shortageCount = results.filter(({inventory}) => inventory.some(value => value < 0)).length;
  const warningCount = results.filter(({product,inventory}) => !inventory.some(value => value < 0) && inventory.some(value => value < product.safety)).length;
  const originalDate = addDays(planningCalendar.startDate, 7), suggestedDate = addDays(planningCalendar.startDate, 1);
  document.querySelector('#ai-analysis').innerHTML = `<section><small>AI ANALYSIS</small><h3>現在の製造計画</h3><div class="risk-counts"><div><b class="red">${shortageCount}</b><span>欠品リスク</span></div><div><b class="amber">${warningCount}</b><span>安全在庫割れ</span></div></div></section><section><small>RECOMMENDED ACTION</small><h3>推奨対応</h3><p><strong>冷凍うどん</strong>の製造を${formatDate(originalDate)}から${formatDate(suggestedDate)}へ前倒しすると、第1週の欠品を回避できます。</p><div class="suggestion-route"><span>${formatDate(originalDate)}<br><b>泉 L1</b></span><i>→</i><span>${formatDate(suggestedDate)}<br><b>泉 L1</b></span></div></section>`;
  drawPlannerChart(results.slice(0, 5));
}

function drawPlannerChart(results) {
  const chart = document.querySelector('#planner-inventory-chart'), ratio = window.devicePixelRatio || 1, width = chart.clientWidth, height = chart.clientHeight;
  if (!width) return; chart.width = width * ratio; chart.height = height * ratio; const ctx = chart.getContext('2d'); ctx.scale(ratio,ratio); ctx.clearRect(0,0,width,height);
  const pad={left:46,right:105,top:18,bottom:30}, values=results.flatMap(item=>item.inventory), max=Math.max(...values,1000), min=Math.min(...values,-200), x=i=>pad.left+i*(width-pad.left-pad.right)/7, y=v=>pad.top+(max-v)*(height-pad.top-pad.bottom)/(max-min);
  ctx.font='10px sans-serif'; ctx.fillStyle='#718095'; ctx.textAlign='right'; for(let i=0;i<4;i++){const v=min+(max-min)*i/3,py=y(v);ctx.strokeStyle='#e6eaf0';ctx.beginPath();ctx.moveTo(pad.left,py);ctx.lineTo(width-pad.right,py);ctx.stroke();ctx.fillText(Math.round(v),pad.left-8,py+3);} ctx.textAlign='center'; planningWeekLabels.forEach((week,i)=>ctx.fillText(week,x(i),height-9));
  results.forEach(({product,inventory},ri)=>{ctx.beginPath();ctx.strokeStyle=product.color;ctx.lineWidth=2;inventory.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();ctx.fillStyle=product.color;ctx.textAlign='left';ctx.fillText(product.name,width-pad.right+12,25+ri*20);});
}

function showPlannerToast(message) { const toast=document.querySelector('#planner-toast'); toast.textContent=`✓ ${message}`; toast.classList.add('show'); clearTimeout(showPlannerToast.timer); showPlannerToast.timer=setTimeout(()=>toast.classList.remove('show'),4000); }
document.querySelector('#apply-ai-suggestion').addEventListener('click',()=>{const batch=productionPlan.find(item=>item.id==='b15');batch.date=addDays(planningCalendar.startDate,1);batch.lineId='izumi-l1';showPlannerToast('AI提案を適用しました。冷凍うどんの欠品リスクが解消されました');renderPlanner();});
document.querySelector('#create-ai-plan').addEventListener('click',()=>{productionPlan=optimizedBatches.map(batch=>({...batch}));showPlannerToast('販売計画・現在庫・安全在庫・ライン能力をもとにAIが製造計画案を作成しました');renderPlanner();});
window.addEventListener('resize',()=>{if(!views.planning.hidden) renderFutureInventory();});
renderSimulation();
