const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateStatusChanged: (callback) => {
    ipcRenderer.on('update-status-changed', (event, status) => callback(status))
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, percent) => callback(percent))
  }
})
