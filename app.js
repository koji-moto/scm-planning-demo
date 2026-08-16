import { products, WEEKS, WAREHOUSES, factories, purchaseOrders, calculateInventory, getStatus, warehousePlan } from './inventory.js';

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
document.querySelectorAll('.nav-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.nav-tabs button').forEach(b=>b.classList.remove('active'));button.classList.add('active');if(button.dataset.view==='operations')document.querySelector('#operations').scrollIntoView({behavior:'smooth'});}));
renderSimulation();
