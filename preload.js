const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConsoleUsage: () => ipcRenderer.invoke('get-console-usage'),
  getSnapshot: () => ipcRenderer.invoke('get-snapshot'),
  getPosition: () => ipcRenderer.invoke('get-position'),
  moveTo: (x, y) => ipcRenderer.invoke('move-to', x, y),
  togglePanel: () => ipcRenderer.invoke('toggle-panel'),
  hidePanel: () => ipcRenderer.invoke('hide-panel'),
  showMenu: () => ipcRenderer.invoke('show-menu'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  saveConfig: (userToken, budget) => ipcRenderer.invoke('save-config', userToken, budget),
  getConfig: () => ipcRenderer.invoke('get-config'),
  openDeepseek: () => ipcRenderer.invoke('open-deepseek'),
  onRefreshConsole: (cb) => ipcRenderer.on('refresh-console', () => cb()),
});
