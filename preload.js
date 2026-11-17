const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  init: () => ipcRenderer.invoke('overlay-init'),
  faceData: (slot) => ipcRenderer.invoke('face-data', slot),
  frameData: () => ipcRenderer.invoke('frame-data'),
  cardList: () => ipcRenderer.invoke('card-list'),
  changelogData: () => ipcRenderer.invoke('changelog-data'),
  recordCard: (id, rare) => ipcRenderer.invoke('card-record', id, rare),
  logError: (msg) => ipcRenderer.send('log-error', msg),
  careGet: () => ipcRenderer.invoke('care-get'),
  careSet: (slot, v) => ipcRenderer.send('care-set', slot, v),
  weatherNow: () => ipcRenderer.invoke('weather-now'),
  settingsData: () => ipcRenderer.invoke('settings-data'),
  settingsPatch: (p) => ipcRenderer.invoke('settings-patch', p),
  settingsDo: (cmd, arg) => ipcRenderer.invoke('settings-do', cmd, arg),
  cardCollection: () => ipcRenderer.invoke('card-collection'),
  shareData: () => ipcRenderer.invoke('share-data'),
  shareDo: (cmd) => ipcRenderer.invoke('share-do', cmd),
  setIgnore: (ignore) => ipcRenderer.send('set-ignore', ignore),
  petExit: (info) => ipcRenderer.send('pet-exit', info),
  beat: (h) => ipcRenderer.send('overlay-beat', h),
  editorInit: () => ipcRenderer.invoke('face-editor-init'),
  editorSave: (p, cutUrl) => ipcRenderer.invoke('face-editor-save', p, cutUrl),
  editorCancel: () => ipcRenderer.invoke('face-editor-cancel'),
  editorRepick: () => ipcRenderer.invoke('face-editor-repick'),
  on: (channel, fn) => {
    if (['poke', 'smash', 'spin', 'dance', 'neon', 'whistle', 'shimmy', 'heart', 'power', 'cheer', 'sign', 'slime', 'sleep', 'brush', 'flip', 'pop', 'rest', 'stretch', 'wave', 'horn', 'chime', 'bread', 'morph', 'receipt', 'talk', 'hi5', 'rps', 'tag', 'nap', 'life', 'acryl', 'feed', 'petpet', 'steal', 'trash', 'weather', 'clone', 'toe', 'star', 'grip', 'scribble', 'spawn', 'wake', 'screens', 'config-updated', 'cards-updated', 'milestone', 'banner', 'settings-refresh', 'settings-tab'].includes(channel)) {
      ipcRenderer.on(channel, (_e, data) => fn(data));
    }
  },
});
