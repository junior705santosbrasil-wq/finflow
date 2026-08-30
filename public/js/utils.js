function fmtMoney(v) {
  const num = Number(v) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtMoneyCompact(v) {
  const num = Number(v) || 0;
  const abs = Math.abs(num);
  if (abs >= 1000000) return (num / 1000000).toFixed(1).replace('.', ',') + 'M';
  if (abs >= 1000) return (num / 1000).toFixed(1).replace('.', ',') + 'k';
  return fmtMoney(num);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function hojeISO() {
  const d = new Date();
  return toISO(d);
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function thisMonthKey() {
  return hojeISO().slice(0, 7);
}

function monthKeyOf(iso) {
  return (iso || '').slice(0, 7);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'success' ? '' : type);
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function lerpColor(color1, color2, t) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  const r = Math.round(((c1 >> 16) & 255) * (1 - t) + ((c2 >> 16) & 255) * t);
  const g = Math.round(((c1 >> 8) & 255) * (1 - t) + ((c2 >> 8) & 255) * t);
  const b = Math.round((c1 & 255) * (1 - t) + (c2 & 255) * t);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const CHART_GREENS = ['#16a34a', '#22c55e', '#4ade80', '#15803d', '#65a30d'];
const CHART_REDS = ['#dc2626', '#f43f5e', '#fb923c', '#b91c1c', '#ef4444'];

function chartTextColor() {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' ? '#aab3c4' : '#5b6472';
}

function chartGridColor() {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' ? '#232e45' : '#e7ebf3';
}

function destroyChart(key) {
  if (window.__charts && window.__charts[key]) {
    window.__charts[key].destroy();
    delete window.__charts[key];
  }
}

function makeChart(key, ctx, config) {
  if (window.__charts && window.__charts[key]) {
    window.__charts[key].destroy();
  }
  if (!window.__charts) window.__charts = {};
  window.__charts[key] = new Chart(ctx, config);
}
