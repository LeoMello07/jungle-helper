const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('overlay', {
  onHotkey: cb => ipcRenderer.on('hotkey', (_e, msg) => cb(msg)),
  setInteractive: on => ipcRenderer.send('interactive', !!on),
  copy: text => ipcRenderer.send('copy', text),
})
