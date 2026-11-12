const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  init: () => ipcRenderer.invoke('overlay-init'),
  faceData: (slot) => ipcRenderer.invoke('face-data', slot),
  frameData: () => ipcRenderer.invoke('frame-data'),
  setIgnore: (ignore) => ipcRenderer.send('set-ignore', ignore),
  petExit: (info) => ipcRenderer.send('pet-exit', info),
  editorInit: () => ipcRenderer.invoke('face-editor-init'),
  editorSave: (p, cutUrl) => ipcRenderer.invoke('face-editor-save', p, cutUrl),
  editorCancel: () => ipcRenderer.invoke('face-editor-cancel'),
  editorRepick: () => ipcRenderer.invoke('face-editor-repick'),
  on: (channel, fn) => {
    if (['poke', 'smash', 'spin', 'dance', 'neon', 'whistle', 'shimmy', 'heart', 'power', 'cheer', 'sign', 'slime', 'sleep', 'brush', 'flip', 'pop', 'rest', 'stretch', 'wave', 'horn', 'clone', 'toe', 'star', 'grip', 'scribble', 'spawn', 'screens', 'config-updated'].includes(channel)) {
      ipcRenderer.on(channel, (_e, data) => fn(data));
    }
  },
});
