const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getData: () => ipcRenderer.invoke('get-data'),
    updatePoints: points => ipcRenderer.invoke('update-points', points),
    updateSettings: settings => ipcRenderer.invoke('update-settings', settings),
    showPointsDialog: () => ipcRenderer.invoke('show-points-dialog'),
    startDrag: () => ipcRenderer.invoke('start-drag'),
    moveWindow: offset => ipcRenderer.invoke('move-window', offset),
    clearSetupCache: () => ipcRenderer.invoke('clear-setup-cache')
});
