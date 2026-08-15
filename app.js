import { products, calculateInventory, getStatus } from './inventory.js';

let selectedIndex = 0;
const tabs = document.querySelector('#product-tabs');
const meta = document.querySelector('#product-meta');
const table = document.querySelector('#plan-table');
const canvas = document.querySelector('#inventory-chart');

function formatNumber(value) { return Number(value).toLocaleString('ja-JP'); }

function renderTabs() {
  tabs.innerHTML = products.map((product, index) => `
    <button role="tab" aria-selected="${index === selectedIndex}" data-index="${index}">
      <small>${product.code}</small>${product.name}
    </button>`).join('');
  tabs.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    selectedIndex = Number(button.dataset.index);
    render();
  }));
}

function row(label, detail, cells, className = '') {
  return `<tr class="${className}"><th><strong>${label}</strong><small>${detail}</small></th>${cells.join('')}</tr>`;
}

function renderTable() {
  const product = products[selectedIndex];
  const inventory = calculateInventory(product.currentStock, product.sales, product.production);
  meta.innerHTML = `<div><span>商品コード</span><strong>${product.code}</strong></div><div><span>現在庫</span><strong>${formatNumber(product.currentStock)}<small> 個</small></strong></div><div><span>安全在庫</span><strong>${formatNumber(product.safetyStock)}<small> 個</small></strong></div>`;
  const salesCells = product.sales.map(value => `<td>${formatNumber(value)}</td>`);
  const productionCells = product.production.map((value, i) => `<td><label class="sr-only" for="production-${i}">${i + 1}週目の製造計画</label><input id="production-${i}" type="number" min="0" step="10" value="${value}" data-week="${i}"></td>`);
  const inventoryCells = inventory.map(value => {
    const status = getStatus(value, product.safetyStock);
    return `<td class="stock ${status}"><strong>${formatNumber(value)}</strong>${status === 'shortage' ? '<small>欠品</small>' : status === 'warning' ? '<small>注意</small>' : ''}</td>`;
  });
  table.innerHTML = row('販売計画', '出荷予定数', salesCells) + row('製造計画', '入力できます', productionCells, 'production-row') + row('週末在庫', '自動計算', inventoryCells, 'inventory-row');
  table.querySelectorAll('input').forEach(input => input.addEventListener('input', event => {
    products[selectedIndex].production[Number(event.target.dataset.week)] = Math.max(0, Number(event.target.value) || 0);
    renderTable(); renderSummary(); drawChart();
    document.querySelector(`#production-${event.target.dataset.week}`)?.focus();
  }));
}

function renderSummary() {
  let shortages = 0, warnings = 0;
  products.forEach(product => calculateInventory(product.currentStock, product.sales, product.production).forEach(stock => {
    const status = getStatus(stock, product.safetyStock);
    if (status === 'shortage') shortages++; else if (status === 'warning') warnings++;
  }));
  document.querySelector('#shortage-count').innerHTML = `${shortages}<small>件</small>`;
  document.querySelector('#warning-count').innerHTML = `${warnings}<small>件</small>`;
}

function drawChart() {
  const product = products[selectedIndex];
  const values = calculateInventory(product.currentStock, product.sales, product.production);
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
  const pad = { left: 54, right: 24, top: 26, bottom: 42 };
  const max = Math.max(800, Math.ceil(Math.max(...values, product.safetyStock) / 100) * 100);
  const min = Math.min(0, Math.floor(Math.min(...values) / 100) * 100);
  const x = i => pad.left + i * (width - pad.left - pad.right) / 7;
  const y = v => pad.top + (max - v) * (height - pad.top - pad.bottom) / (max - min);
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#718078'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const value = min + (max - min) * i / 4, py = y(value);
    ctx.beginPath(); ctx.strokeStyle = '#dfe5e1'; ctx.lineWidth = 1; ctx.moveTo(pad.left, py); ctx.lineTo(width - pad.right, py); ctx.stroke();
    ctx.fillText(Math.round(value), pad.left - 12, py + 4);
  }
  ctx.textAlign = 'center'; values.forEach((_, i) => ctx.fillText(`${i + 1}週目`, x(i), height - 15));
  ctx.beginPath(); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#e3a33d'; ctx.lineWidth = 2; ctx.moveTo(x(0), y(product.safetyStock)); ctx.lineTo(x(7), y(product.safetyStock)); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.strokeStyle = '#176b4d'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; values.forEach((v, i) => i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))); ctx.stroke();
  values.forEach((v, i) => { ctx.beginPath(); ctx.fillStyle = getStatus(v, product.safetyStock) === 'shortage' ? '#d55245' : '#176b4d'; ctx.arc(x(i), y(v), 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); });
}

function render() { renderTabs(); renderTable(); renderSummary(); drawChart(); }
window.addEventListener('resize', drawChart);
render();
