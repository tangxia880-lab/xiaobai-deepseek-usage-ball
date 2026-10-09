const valueEl = document.getElementById('value');
const ball = document.getElementById('ball');

function fmtMoney(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return '0.00';
  if (n === 0) return '0.00';
  if (Math.abs(n) < 0.01) return n.toFixed(4);
  if (Math.abs(n) < 1) return n.toFixed(3);
  return n.toFixed(2);
}

async function refreshBalance() {
  const u = await window.api.getConsoleUsage();
  if (!u) { valueEl.textContent = '—'; return; }
  if (u.error === 'no-token') { valueEl.textContent = '未配置'; return; }
  if (u.error) { valueEl.textContent = '—'; return; }
  valueEl.textContent = '¥' + fmtMoney(u.balance);
}

refreshBalance();
setInterval(refreshBalance, 300000);

let pressed = false;
let moved = false;
let sx = 0, sy = 0, wx = 0, wy = 0;

ball.addEventListener('mousedown', async (e) => {
  pressed = true;
  moved = false;
  sx = e.screenX;
  sy = e.screenY;
  const p = await window.api.getPosition();
  wx = p[0];
  wy = p[1];
});

window.addEventListener('mousemove', (e) => {
  if (!pressed) return;
  const dx = e.screenX - sx;
  const dy = e.screenY - sy;
  if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
  if (moved) window.api.moveTo(wx + dx, wy + dy);
});

window.addEventListener('mouseup', () => {
  if (pressed && !moved) window.api.togglePanel();
  pressed = false;
  moved = false;
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.api.showMenu();
});

window.api.onRefreshConsole(() => refreshBalance());
