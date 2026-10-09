const keyEl = document.getElementById('key');
const budgetEl = document.getElementById('budget');
const statusEl = document.getElementById('status');

async function load() {
  const cfg = await window.api.getConfig();
  if (cfg) {
    keyEl.value = cfg.user_token || '';
    budgetEl.value = cfg.budget || '';
  }
}
load();

document.getElementById('close').addEventListener('click', () => window.api.closeSettings());
document.getElementById('getkey').addEventListener('click', (e) => {
  e.preventDefault();
  window.api.openDeepseek();
});
document.getElementById('save').addEventListener('click', async () => {
  const ok = await window.api.saveConfig(keyEl.value.trim(), parseFloat(budgetEl.value) || 0);
  statusEl.textContent = ok ? '已保存' : '保存失败';
  if (ok) setTimeout(() => window.api.closeSettings(), 600);
});
