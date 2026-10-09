function fmtMoney(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return '¥0';
  if (n === 0) return '¥0';
  if (Math.abs(n) < 0.01) return '¥' + n.toFixed(4);
  if (Math.abs(n) < 1) return '¥' + n.toFixed(3);
  return '¥' + n.toFixed(2);
}

async function refreshConsole() {
  const u = await window.api.getConsoleUsage();
  if (!u) return;
  if (u.error === 'no-token') {
    document.getElementById('balance').textContent = '未配置';
    return;
  }
  if (u.error) {
    document.getElementById('balance').textContent = '—';
    return;
  }
  document.getElementById('balance').textContent = fmtMoney(u.balance);
  document.getElementById('bonus').textContent = fmtMoney(u.bonus);
  document.getElementById('total_cost').textContent = fmtMoney(u.totalCost);
  document.getElementById('today').textContent = fmtMoney(u.today);
  document.getElementById('week').textContent = fmtMoney(u.week);
  document.getElementById('month').textContent = fmtMoney(u.month);
}

document.getElementById('close').addEventListener('click', () => window.api.hidePanel());
window.api.onRefreshConsole(() => refreshConsole());

refreshConsole();
setInterval(refreshConsole, 300000);
