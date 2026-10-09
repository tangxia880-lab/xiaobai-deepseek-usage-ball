const { app, BrowserWindow, ipcMain, screen, Menu, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

// Electron 的所有数据（缓存、GPU 缓存等）都存到项目目录内，避免写入 ~/Library
app.setPath('userData', path.join(__dirname, 'userData'));

let ballWin = null;
let panelWin = null;
let settingsWin = null;
let loginWin = null;
let config = { user_token: '', budget: 0 };
let snapshot = {
  day: { calls: 0, cache_hit_tokens: 0, cache_miss_tokens: 0, completion_tokens: 0, cost: 0 },
  week: { calls: 0, cache_hit_tokens: 0, cache_miss_tokens: 0, completion_tokens: 0, cost: 0 },
  month: { calls: 0, cache_hit_tokens: 0, cache_miss_tokens: 0, completion_tokens: 0, cost: 0 },
  by_model: [],
  daily: [],
};
let consoleUsage = { balance: '0', bonus: '0', totalCost: '0', today: 0, week: 0, month: 0, budget: 0 };

const CONFIG_PATH = path.join(__dirname, 'config.json');
const QUERY_PY = path.join(__dirname, 'query.py');
const BASE = 'https://platform.deepseek.com';
const LOGIN_URL = 'https://platform.deepseek.com/sign_in';
const TZ = 28800; // GMT+8

function loadConfig() {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    config = { user_token: '', budget: 0 };
  }
}

// ---------- 控制台用量接口 ----------
function authHeaders() {
  return {
    Authorization: 'Bearer ' + (config.user_token || ''),
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://platform.deepseek.com/usage',
  };
}

function hasValidToken() {
  const t = (config.user_token || '').trim();
  if (!t) return false;
  if (/[{}]/.test(t)) return false; // 序列化空值 / 非法 token
  return true;
}

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000); }
function startOfWeek() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Math.floor(d.getTime() / 1000); }
function startOfMonth() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return Math.floor(d.getTime() / 1000); }
function endOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return Math.floor(d.getTime() / 1000); }

function sumCost(json) {
  let total = 0;
  const biz = json && json.data && json.data.biz_data;
  if (!biz || !Array.isArray(biz.data)) return 0;
  for (const group of biz.data) {
    for (const series of (group.series || [])) {
      for (const b of (series.buckets || [])) {
        total += parseFloat(b.cost) || 0;
      }
    }
  }
  return total;
}

async function fetchCost(start, end) {
  const url = `${BASE}/api/v0/usage/by_api_key/cost?start=${start}&end=${end}&tz=${TZ}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) {
    const err = new Error('unauthorized');
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  return sumCost(json);
}

async function fetchConsoleUsage() {
  if (!hasValidToken()) return { error: 'no-token' };
  try {
    const sRes = await fetch(`${BASE}/api/v0/users/get_user_summary`, { headers: authHeaders() });
    if (sRes.status === 401 || sRes.status === 403) return { error: 'no-token' };
    const s = await sRes.json();
    const biz = (s && s.data && s.data.biz_data) || {};
    const balance = (biz.normal_wallets && biz.normal_wallets[0] && biz.normal_wallets[0].balance) || '0';
    const bonus = (biz.bonus_wallets && biz.bonus_wallets[0] && biz.bonus_wallets[0].balance) || '0';
    const totalCost = (biz.total_costs && biz.total_costs[0] && biz.total_costs[0].amount) || '0';

    const end = endOfDay();
    const [today, week, month] = await Promise.all([
      fetchCost(startOfDay(), end),
      fetchCost(startOfWeek(), end),
      fetchCost(startOfMonth(), end),
    ]);

    return { balance, bonus, totalCost, today, week, month };
  } catch (e) {
    if (e && (e.status === 401 || e.status === 403)) return { error: 'no-token' };
    console.log('[fetchConsoleUsage ERR]', e && e.message);
    return { error: 'network' };
  }
}

function refreshConsole() {
  fetchConsoleUsage().then((u) => {
    if (u && !u.error) {
      u.budget = config.budget;
    }
    consoleUsage = u; // 无错误保存数据，有错误保存 error 供渲染层显示「未配置」
    for (const w of [ballWin, panelWin]) {
      if (w && !w.isDestroyed()) w.webContents.send('refresh-console');
    }
  });
}

function refreshSnapshot() {
  execFile('python3', [QUERY_PY], { timeout: 5000 }, (err, stdout) => {
    if (err) return;
    try { snapshot = JSON.parse(stdout); } catch (e) {}
  });
}

function createBall() {
  ballWin = new BrowserWindow({
    width: 80,
    height: 80,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  ballWin.setAlwaysOnTop(true);
  ballWin.loadFile(path.join(__dirname, 'renderer', 'ball.html'));
  ballWin.once('ready-to-show', () => ballWin.show());
}

function createPanel() {
  panelWin = new BrowserWindow({
    width: 340,
    height: 360,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  panelWin.setAlwaysOnTop(true);
  panelWin.loadFile(path.join(__dirname, 'renderer', 'panel.html'));
}

function createSettings() {
  settingsWin = new BrowserWindow({
    width: 340,
    height: 320,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.setAlwaysOnTop(true);
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
}

function openSettings() {
  if (!settingsWin) return;
  if (settingsWin.isVisible()) {
    settingsWin.focus();
    return;
  }
  settingsWin.center();
  settingsWin.show();
  settingsWin.focus();
}

const TOKEN_SCRIPT = `
  (function () {
    var keys = ['userToken', 'token', 'user_token'];
    for (var i = 0; i < keys.length; i++) {
      var v = localStorage.getItem(keys[i]);
      if (v) return { key: keys[i], value: v };
    }
    return null;
  })()
`;

async function openSwitchAccount() {
  if (loginWin && !loginWin.isDestroyed()) {
    loginWin.show();
    loginWin.focus();
    return;
  }

  // 直连绕过系统代理，避免 HTTPS 握手失败
  const loginSession = session.defaultSession;
  try {
    await loginSession.setProxy({ mode: 'direct' });
  } catch (e) {}
  // 清除已有登录态，强制回到扫码登录页
  try {
    await loginSession.clearStorageData({ origin: BASE, storages: ['cookies', 'localstorage'] });
  } catch (e) {}

  loginWin = new BrowserWindow({
    width: 460,
    height: 600,
    title: '切换账号 - 扫码登录',
    autoHideMenuBar: true,
    resizable: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  loginWin.setMenuBarVisibility(false);
  loginWin.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.log('[login did-fail-load]', code, desc, url);
  });
  loginWin.loadURL(LOGIN_URL);

  let initialToken = null;

  const timer = setInterval(() => {
    if (!loginWin || loginWin.isDestroyed()) {
      clearInterval(timer);
      return;
    }
    loginWin.webContents.executeJavaScript(TOKEN_SCRIPT)
      .then((r) => {
        const token = (r && r.value) || null;
        // 首次读取仅记录当前值（登录页可能预置了临时 token），不能当作登录成功
        if (initialToken === null) {
          initialToken = token;
          return;
        }
        // token 发生变化才说明用户完成了扫码登录
        if (token && token !== initialToken) {
          config.user_token = token;
          try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
          } catch (e) {}
          refreshConsole();
          for (const w of [ballWin, panelWin]) {
            if (w && !w.isDestroyed()) w.webContents.send('refresh-console');
          }
          clearInterval(timer);
          if (loginWin && !loginWin.isDestroyed()) loginWin.close();
          loginWin = null;
        }
      })
      .catch(() => {});
  }, 1500);

  loginWin.on('closed', () => {
    clearInterval(timer);
    loginWin = null;
  });
}

function togglePanel() {
  if (!panelWin) return;
  if (panelWin.isVisible()) {
    panelWin.hide();
    return;
  }
  const b = ballWin.getBounds();
  const display = screen.getDisplayNearestPoint({ x: b.x, y: b.y });
  const wa = display.workArea;
  const pw = panelWin.getBounds().width;
  const ph = panelWin.getBounds().height;
  let x = b.x - pw - 12;
  if (x < wa.x) x = b.x + b.width + 12;
  let y = b.y;
  if (y + ph > wa.y + wa.height) y = wa.y + wa.height - ph;
  panelWin.setPosition(Math.round(x), Math.round(y));
  panelWin.show();
  panelWin.focus();
}

function registerIpc() {
  ipcMain.handle('get-console-usage', () => consoleUsage);
  ipcMain.handle('get-snapshot', () => snapshot);
  ipcMain.handle('get-position', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    return win ? win.getPosition() : [0, 0];
  });
  ipcMain.handle('move-to', (e, x, y) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) win.setPosition(Math.round(x), Math.round(y));
  });
  ipcMain.handle('toggle-panel', () => togglePanel());
  ipcMain.handle('hide-panel', () => { if (panelWin) panelWin.hide(); });
  ipcMain.handle('open-settings', () => openSettings());
  ipcMain.handle('close-settings', () => { if (settingsWin) settingsWin.hide(); });
  ipcMain.handle('open-deepseek', () => shell.openExternal('https://platform.deepseek.com/usage'));
  ipcMain.handle('get-config', () => config);
  ipcMain.handle('save-config', (e, userToken, budget) => {
    config.user_token = userToken;
    config.budget = budget;
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      refreshConsole();
      for (const w of [ballWin, panelWin]) {
        if (w && !w.isDestroyed()) w.webContents.send('refresh-console');
      }
      return true;
    } catch (err) {
      return false;
    }
  });
  ipcMain.handle('show-menu', (e) => {
    const menu = Menu.buildFromTemplate([
      { label: '设置', click: () => openSettings() },
      { label: '去平台登录', click: () => shell.openExternal('https://platform.deepseek.com/usage') },
      { type: 'separator' },
      { label: '刷新', click: () => refreshConsole() },
      { type: 'separator' },
      { label: '切换账号', click: () => openSwitchAccount() },
      { label: '退出', click: () => app.quit() },
    ]);
    menu.popup({ window: BrowserWindow.fromWebContents(e.sender) });
  });
}

app.whenReady().then(() => {
  loadConfig();
  createBall();
  createPanel();
  createSettings();
  registerIpc();
  refreshSnapshot();
  setInterval(refreshSnapshot, 5000);
  refreshConsole();
  setInterval(refreshConsole, 300000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
