const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('stage', {
  getState: () => ipcRenderer.invoke('state'),
  command: (command, payload) => ipcRenderer.invoke('command', command, payload),
  filePath: file => webUtils.getPathForFile(file),
  readPdf: id => ipcRenderer.invoke('pdf:read', id),
  pdfRendered: (id, modified, image, total) => ipcRenderer.invoke('pdf:thumbnail', id, modified, image, total),
  pdfPosition: (page, total) => ipcRenderer.send('pdf:position', page, total),
  pdfFailed: message => ipcRenderer.send('pdf:failed', message),
  onState: callback => { const handler = (_, s) => callback(s); ipcRenderer.on('state', handler); return () => ipcRenderer.removeListener('state', handler); },
  onPdfCommand: callback => ipcRenderer.on('pdf:command', (_, msg) => callback(msg))
});
