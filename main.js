const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, protocol, globalShortcut, clipboard: elClipboard, shell, ShareMenu, powerMonitor, desktopCapturer } = require('electron');
const IS_MAC = process.platform === 'darwin';
const updater = require('./updater');
const { execFile, execFileSync } = require('child_process');
const os = require('os');

protocol.registerSchemesAsPrivileged([{ scheme: 'jy', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const path = require('path');
const fs = require('fs');
const MP_DIR = path.join(__dirname, 'node_modules', '@mediapipe', 'selfie_segmentation');
const MP_TYPES = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.tflite': 'application/octet-stream', '.binarypb': 'application/octet-stream', '.data': 'application/octet-stream' };


const overlays = new Map();
const petHome = { a: null, b: null };
let started = false;

app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
let setupWin = null;
let tray = null;

const configPath = () => path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
}

function daysLeft(cfg) {
  if (!cfg || !cfg.discharge) return null;
  const [y, m, d] = cfg.discharge.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function updateTray() {
  if (!tray) return;
  const cfg = loadConfig();
  const d = daysLeft(cfg);
  const off = (cfg && cfg.enabled === false ? ' (꺼짐)' : '') + fourLabel();
  const label = (d === null ? 'D-?' : d > 0 ? `D-${d}` : d === 0 ? 'D-DAY' : `D+${-d}`) + off;
  if (process.platform === 'darwin') tray.setTitle(label);
  else tray.setToolTip(`전역까지 ${label}`);
}

let changelogWin = null;
let changelogSince = null;
function openChangelog(since) {
  changelogSince = since || null;
  if (changelogWin) {
    changelogWin.reload();
    changelogWin.focus();
    return;
  }
  const mac = process.platform === 'darwin';
  changelogWin = new BrowserWindow({
    width: 480,
    height: 600,
    minWidth: 400,
    minHeight: 420,
    title: '업데이트 내역',
    alwaysOnTop: true,
    show: false,
    ...(mac ? { titleBarStyle: 'hiddenInset', vibrancy: 'under-window', visualEffectState: 'active', backgroundColor: '#00000000' } : {}),
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  changelogWin.loadFile(path.join(__dirname, 'changelog.html'), { search: mac ? 'vibrancy=1' : '' });
  changelogWin.once('ready-to-show', () => changelogWin && changelogWin.show());
  changelogWin.on('closed', () => { changelogWin = null; });
  app.focus({ steal: true });
}
ipcMain.handle('changelog-data', () => {
  let entries = [];
  let log = '';
  try { entries = JSON.parse(fs.readFileSync(path.join(__dirname, 'changelog.json'), 'utf8')); } catch {}
  try { log = fs.readFileSync(path.join(app.getPath('userData'), 'update.log'), 'utf8'); } catch {}
  return { version: updater.version, since: changelogSince, entries, log };
});

function openSetup() {
  if (setupWin) {
    setupWin.focus();
    return;
  }
  setupWin = new BrowserWindow({
    width: 380,
    height: 430,
    resizable: false,
    title: '전역일 설정',
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  setupWin.loadFile(path.join(__dirname, 'setup.html'));
  setupWin.on('closed', () => {
    setupWin = null;
  });
  app.focus({ steal: true });
}

function broadcast(channel, data) {
  for (const w of overlays.values()) if (!w.isDestroyed()) w.webContents.send(channel, data);
  if (typeof settingsWin !== 'undefined' && settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings-refresh');
}

function createOverlay(display) {
  const b = display.bounds;
  const win = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    enableLargerThanScreen: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false },
  });
  win.displayId = display.id;
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'overlay.html'));
  win.webContents.on('render-process-gone', (_e, d) => {
    logPower('overlay gone: ' + (d && d.reason));
    if (overlays.get(display.id) === win) overlays.delete(display.id);
    setTimeout(() => { if (!win.isDestroyed()) win.destroy(); syncOverlays(); }, 500);
  });
  win.webContents.on('unresponsive', () => logPower('overlay unresponsive'));
  overlays.set(display.id, win);
  const cfg0 = loadConfig() || {};
  win.setContentProtection(cfg0.capture === 'work');
  if (cfg0.enabled === false) win.once('ready-to-show', () => win.hide());
}

/* ---------- 잠금, 잠자기 복구 ---------- */
let screenAsleep = false;
const powerLogPath = () => path.join(app.getPath('userData'), 'power.log');
function logPower(msg) {
  try { fs.appendFileSync(powerLogPath(), `${new Date().toISOString()} ${msg}\n`); } catch {}
}
const beats = new Map();
ipcMain.on('overlay-beat', (e, h) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) beats.set(w.id, { at: Date.now(), ...(h || {}) });
});
function kickOverlay(w) {
  if (!w || w.isDestroyed()) return;
  try {
    w.setAlwaysOnTop(true, 'screen-saver');
    w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    w.setIgnoreMouseEvents(true, { forward: true });
    const cfg = loadConfig() || {};
    if (cfg.enabled !== false && !shotHidden.includes(w)) { w.hide(); setTimeout(() => { if (!w.isDestroyed()) w.showInactive(); }, 60); }
    w.webContents.invalidate();
    w.webContents.send('wake');
  } catch (e) { logPower('kick: ' + e.message); }
}
function wakeAll(reason) {
  screenAsleep = false;
  logPower('wake: ' + reason);
  setTimeout(() => {
    syncOverlays();
    for (const w of overlays.values()) kickOverlay(w);
  }, 1200);
  setTimeout(() => checkOverlays(true), 6000);
}
const stalls = new Map();
function checkOverlays(afterWake) {
  if (screenAsleep || !started) return;
  const cfg = loadConfig() || {};
  if (cfg.enabled === false) return;
  for (const [id, w] of overlays) {
    if (w.isDestroyed() || !w.ready || !w.isVisible() || shotHidden.includes(w)) continue;
    const b = beats.get(w.id);
    if (Date.now() - (w.readyAt || 0) < 12000) continue;
    const dead = !b || Date.now() - b.at > 15000;
    const stuck = b && b.frameAge > 4000;
    if (!dead && !stuck) { stalls.delete(id); continue; }
    const n = (stalls.get(id) || 0) + 1;
    stalls.set(id, n);
    if (dead || n >= 2 || afterWake) {
      logPower(`overlay reload: ${dead ? 'no beat' : 'frame ' + b.frameAge + 'ms'}`);
      stalls.delete(id);
      beats.delete(w.id);
      w.ready = false;
      w.webContents.reload();
    } else kickOverlay(w);
  }
}
function watchPower() {
  powerMonitor.on('suspend', () => { screenAsleep = true; logPower('suspend'); });
  powerMonitor.on('lock-screen', () => { screenAsleep = true; logPower('lock'); });
  powerMonitor.on('resume', () => wakeAll('resume'));
  powerMonitor.on('unlock-screen', () => wakeAll('unlock'));
  powerMonitor.on('user-did-become-active', () => { if (screenAsleep) wakeAll('active'); });
  app.on('child-process-gone', (_e, d) => {
    if (d && d.type === 'GPU') {
      logError('gpu gone: ' + d.reason);
      setTimeout(() => { for (const w of overlays.values()) if (!w.isDestroyed()) { w.ready = false; w.webContents.reload(); } }, 1500);
    }
  });
  setInterval(() => checkOverlays(false), 5000);
}

function syncOverlays() {
  if (!started) return;
  const displays = screen.getAllDisplays();
  const ids = new Set(displays.map((d) => d.id));
  const primary = screen.getPrimaryDisplay();
  for (const [id, w] of overlays) {
    if (!ids.has(id)) {
      overlays.delete(id);
      if (!w.isDestroyed()) w.destroy();
    }
  }
  for (const d of displays) {
    const w = overlays.get(d.id);
    if (w) w.setBounds(d.bounds);
    else createOverlay(d);
  }
  for (const slot of Object.keys(petHome)) {
    if (!ids.has(petHome[slot])) {
      petHome[slot] = primary.id;
      const w = overlays.get(primary.id);
      if (w && w.ready) w.webContents.send('spawn', { slot });
    }
  }
  broadcast('screens', overlays.size);
}

function startOverlays() {
  if (started) return;
  started = true;
  const primary = screen.getPrimaryDisplay();
  petHome.a = primary.id;
  petHome.b = primary.id;
  syncOverlays();
}

function pickNeighbor(cur, side) {
  const cb = cur.bounds;
  const others = screen.getAllDisplays().filter((d) => d.id !== cur.id);
  if (!others.length) return cur;
  const cy = cb.y + cb.height / 2;
  const dir = others.filter((d) => (side === 'left' ? d.bounds.x + d.bounds.width <= cb.x + 5 : d.bounds.x >= cb.x + cb.width - 5));
  const pool = dir.length ? dir : others;
  pool.sort((p, q) => Math.abs(p.bounds.y + p.bounds.height / 2 - cy) - Math.abs(q.bounds.y + q.bounds.height / 2 - cy));
  return dir.length ? pool[0] : pool[Math.floor(Math.random() * pool.length)];
}

const SLOT_NAMES = { a: '기타 캐릭터', b: '마이크 캐릭터' };

let faceWin = null;
let faceDraft = null;
const facesDir = () => path.join(app.getPath('userData'), 'faces');

function normFace(f) {
  if (!f) return null;
  return typeof f === 'string' ? { file: f } : f;
}

function fileToDataUrl(file) {
  try {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      return `data:image/${ext === '.png' ? 'png' : 'jpeg'};base64,` + fs.readFileSync(file).toString('base64');
    }
    const img = nativeImage.createFromPath(file);
    return img.isEmpty() ? null : img.toDataURL();
  } catch {
    return null;
  }
}

async function pickFace(slot) {
  app.focus({ steal: true });
  const res = await dialog.showOpenDialog({
    title: `${SLOT_NAMES[slot]} 얼굴 사진 선택`,
    properties: ['openFile'],
    filters: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'heic', 'heif', 'gif', 'webp', 'bmp', 'tif', 'tiff'] }],
  });
  if (res.canceled || !res.filePaths.length) return;
  let img = nativeImage.createFromPath(res.filePaths[0]);
  if (img.isEmpty()) {
    dialog.showMessageBox({ type: 'warning', message: '이 사진은 읽을 수 없어요. JPG나 PNG로 다시 골라 주세요.' });
    return;
  }
  const { width, height } = img.getSize();
  const max = 720;
  if (Math.max(width, height) > max) img = img.resize(width >= height ? { width: max, quality: 'best' } : { height: max, quality: 'best' });
  fs.mkdirSync(facesDir(), { recursive: true });
  const draft = path.join(facesDir(), `draft_${slot}.jpg`);
  fs.writeFileSync(draft, img.toJPEG(92));
  openFaceEditor({ slot, file: draft, draft: true, params: null });
}

function adjustFace(slot) {
  const f = normFace(((loadConfig() || {}).faces || {})[slot]);
  if (!f) return pickFace(slot);
  openFaceEditor({ slot, file: f.file, draft: false, params: f.s != null ? { x: f.x, y: f.y, s: f.s, r: f.r || 0, pts: f.pts } : null });
}

function openFaceEditor(d) {
  faceDraft = d;
  if (faceWin) {
    faceWin.webContents.reload();
    faceWin.focus();
    return;
  }
  faceWin = new BrowserWindow({
    width: 420,
    height: 580,
    resizable: false,
    title: '얼굴 맞추기',
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  faceWin.loadFile(path.join(__dirname, 'face.html'));
  faceWin.on('closed', () => {
    faceWin = null;
    if (faceDraft && faceDraft.draft) fs.rmSync(faceDraft.file, { force: true });
    faceDraft = null;
  });
  app.focus({ steal: true });
}

function setFace(slot, face) {
  const cfg = loadConfig() || {};
  cfg.faces = cfg.faces || {};
  if (face) cfg.faces[slot] = face;
  else delete cfg.faces[slot];
  delete cfg.skins;
  saveConfig(cfg);
  broadcast('config-updated', cfg);
}


const OUTFIT_NAMES = {
  military: '군복', gyaru: '갸루', idol: '아이돌 무대의상', school: '교복', animal: '동물 잠옷',
  trot: '트로트 무대의상', skydress: '소라색 민소매 원피스', cheer: '응원단 유니폼', pajama: '잠옷',
  girlgroup: '걸그룹 무대의상', cheerleader: '응원단장복', sailor: '세일러 교복', tennis: '테니스룩', kimono: '검정 기모노',
  hoodie: '후드티', denim: '청자켓', cardigan: '니트 가디건 + 플리츠', suit: '정장', tracksuit: '트레이닝복', hanbok: '한복', padding: '롱패딩',
  angel: '천사', princess: '공주', office: '안경 오피스', selfie: '거울 셀카',
  yellowtop: '옐로 브라톱', halter: '홀터넥', strawberry: '딸기 티 + 스트라이프 팬츠', mintoff: '민트 오프숄더 + 도트 쇼츠', pinkmint: '핑크 민트 레이어드 탱크', y2k: 'Y2K',
};
const ACTIONS = [
  ['한마디 해봐', 'poke'], ['화면 깨기', 'smash'], ['빙글빙글', 'spin'], ['분신술', 'clone'], ['발가락 따봉', 'toe'],
  ['손가락 별', 'star'], ['그립감', 'grip'], ['공중제비', 'flip'], ['낙서하기', 'scribble'], ['사인하기', 'sign'], ['붓글씨', 'brush'], ['앉아서 쉬기', 'rest'], ['기지개', 'stretch'], ['손 흔들기', 'wave'], ['클락션 빵빵', 'horn'], ['정각 알림', 'chime'], ['오늘의 아크릴', 'acryl'], ['밥 주기', 'feed'], ['쓰다듬기', 'petpet'], ['커서 훔치기', 'steal'], ['쓰레기 줍기', 'trash'], ['남은 것 영수증', 'receipt'], ['숨바꼭질', 'hide'], ['짬밥 받기', 'game'], ['진급 연출', 'promote'], ['물 마시기', 'water'], ['같이 스트레칭', 'stretchCall'], ['오늘 일기', 'diary'], ['둘이 수다', 'talk'], ['둘이 하이파이브', 'hi5'], ['둘이 가위바위보', 'rps'], ['둘이 술래잡기', 'tag'], ['둘이 낮잠', 'nap'], ['빵 뜯기 (포토카드)', 'bread'], ['조나단 변신 (20초)', 'morph'], ['슬라임 터뜨리기', 'slime'], ['잠자기', 'sleep'],
];
const DANCE_ITEMS = [
  ['파라파라', 'dance'], ['호루라기 춤', 'whistle'], ['어깨 털기', 'shimmy'], ['하트 춤', 'heart'], ['파워 댄스', 'power'], ['BAD', 'pop'], ['응원 춤', 'cheer'],
];

function patchConfig(patch) {
  if ('city' in patch || 'weather' in patch) setTimeout(fetchWeather, 100);
  const cfg = { ...(loadConfig() || {}), ...patch };
  saveConfig(cfg);
  broadcast('config-updated', cfg);
  applyWindowState();
  buildMenu();
  return cfg;
}

const FRAME_STYLES = { white: '흰색 기본', black: '블랙', pink: '핑크 하트', mint: '민트 별', film: '필름', army: '군대 카모', gold: '골드 (세트 보상)' };
let shortcutState = null;

function shotDir() {
  if (!IS_MAC) {
    const dir = path.join(app.getPath('pictures'), 'Screenshots');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    return dir;
  }
  try {
    const out = execFileSync('defaults', ['read', 'com.apple.screencapture', 'location']).toString().trim().replace(/^~/, os.homedir());
    if (out && fs.existsSync(out)) return out;
  } catch {}
  return path.join(os.homedir(), 'Desktop');
}

function shotName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const h = d.getHours();
  return `스크린샷 ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}.${p(d.getMinutes())}.${p(d.getSeconds())}.png`;
}

let ownCapture = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runCapture = (args) => new Promise((res) => execFile('/usr/sbin/screencapture', args, () => res()));

/* ---------- Windows, Linux 캡쳐 ---------- */
let selectJob = null;
async function grabDisplay(display, exclude) {
  const wins = exclude ? [...overlays.values()].filter((w) => !w.isDestroyed() && w.isVisible()) : [];
  if (process.platform === 'linux') wins.forEach((w) => w.hide());
  else wins.forEach((w) => w.setOpacity(0));
  await sleep(wins.length ? 140 : 0);
  const sf = display.scaleFactor || 1;
  let sources = [];
  try {
    sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(display.size.width * sf), height: Math.round(display.size.height * sf) } });
  } finally {
    if (process.platform === 'linux') wins.forEach((w) => { if (!w.isDestroyed()) w.showInactive(); });
    else wins.forEach((w) => { if (!w.isDestroyed()) w.setOpacity(1); });
  }
  const idx = screen.getAllDisplays().findIndex((d) => d.id === display.id);
  const src = sources.find((s) => s.display_id && s.display_id === String(display.id)) || sources[idx] || sources[0];
  return src ? src.thumbnail : null;
}
function pickRegion(display, img) {
  return new Promise((resolve) => {
    const b = display.bounds;
    const win = new BrowserWindow({
      x: b.x, y: b.y, width: b.width, height: b.height, frame: false, resizable: false, movable: false,
      skipTaskbar: true, alwaysOnTop: true, show: false, enableLargerThanScreen: true, backgroundColor: '#000000',
      webPreferences: { preload: path.join(__dirname, 'preload.js') },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    selectJob = { win, img: img.toDataURL(), resolve: (r) => { selectJob = null; if (!win.isDestroyed()) win.destroy(); resolve(r); } };
    win.on('closed', () => { if (selectJob && selectJob.win === win) selectJob.resolve(null); });
    win.loadFile(path.join(__dirname, 'select.html'));
    win.once('ready-to-show', () => { win.setBounds(b); win.show(); win.focus(); });
  });
}
ipcMain.handle('select-init', () => (selectJob ? { img: selectJob.img } : null));
ipcMain.on('select-done', (_e, r) => { if (selectJob) selectJob.resolve(r); });

// opts: { region, exclude, clip, rect }
async function ownShot(opts) {
  if (ownCapture || selectJob) return null;
  ownCapture = true;
  try {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const exclude = opts.exclude != null ? opts.exclude : captureMode === 'work';
    const img = await grabDisplay(display, exclude);
    if (!img || img.isEmpty()) return null;
    let out = img;
    let r = opts.rect || null;
    if (opts.region && !r) {
      r = await pickRegion(display, img);
      if (!r) return null;
      if (r.full) r = null;
    }
    if (r) {
      const k = img.getSize().width / display.size.width;
      out = img.crop({ x: Math.round(r.x * k), y: Math.round(r.y * k), width: Math.max(1, Math.round(r.width * k)), height: Math.max(1, Math.round(r.height * k)) });
    }
    captureAt = Date.now();
    const file = path.join(shotDir(), shotName());
    fs.writeFileSync(file, out.toPNG());
    if (opts.clip !== false) elClipboard.writeImage(out);
    if (captureMode === 'photo' && !opts.noFrame) setTimeout(() => frameShot(file), 300);
    else if (!opts.quiet) sendPrimary('banner', { title: '스크린샷 저장', body: `${path.basename(file)}. 클립보드에도 복사됨` });
    return file;
  } finally {
    setTimeout(() => { ownCapture = false; }, 300);
  }
}

// 캐릭터를 아주 잠깐(약 0.2초) 숨긴 채로 조용히 다시 찍음
async function blinkCapture(args) {
  const wins = [...overlays.values()].filter((w) => !w.isDestroyed() && w.isVisible());
  wins.forEach((w) => w.setOpacity(0));
  await sleep(90);
  await runCapture(['-x', ...args]);
  wins.forEach((w) => { if (!w.isDestroyed()) w.setOpacity(1); });
}

function deliver(tmpFiles, toClipboard) {
  if (toClipboard) {
    const img = nativeImage.createFromPath(tmpFiles[0]);
    if (!img.isEmpty()) elClipboard.writeImage(img);
  } else {
    tmpFiles.forEach((f, i) => {
      const name = shotName().replace(/\.png$/, tmpFiles.length > 1 ? ` (${i + 1}).png` : '.png');
      try { fs.copyFileSync(f, path.join(shotDir(), name)); } catch {}
    });
  }
  tmpFiles.forEach((f) => fs.rm(f, () => {}));
}

// 업무 모드 캡쳐: 고르는 동안 캐릭터는 그대로 보이고, 저장되는 결과물에서만 빠짐
async function hiddenCapture(args, toClipboard) {
  if (!IS_MAC) return ownShot({ region: args.length > 0, exclude: true, clip: true });
  if (ownCapture) return;
  ownCapture = true;
  captureAt = Date.now();
  const tmpDir = app.getPath('temp');
  const stamp = Date.now();
  try {
    if (!args.length) {
      const files = screen.getAllDisplays().map((_, i) => path.join(tmpDir, `jy-full-${stamp}-${i}.png`));
      await blinkCapture(toClipboard ? [files[0]] : files);
      deliver((toClipboard ? [files[0]] : files).filter((f) => fs.existsSync(f)), toClipboard);
      return;
    }
    const tmp = path.join(tmpDir, `jy-sel-${stamp}.png`);
    const trail = [];
    const tick = setInterval(() => trail.push(screen.getCursorScreenPoint()), 15);
    await runCapture([...args, tmp]);
    clearInterval(tick);
    trail.push(screen.getCursorScreenPoint());
    if (!fs.existsSync(tmp)) return;
    const img = nativeImage.createFromPath(tmp);
    const { width: pw, height: ph } = img.getSize();
    const bmp = img.toBitmap();
    const windowShot = bmp.length >= 4 && bmp[3] < 250;
    if (windowShot) { deliver([tmp], toClipboard); return; }
    const end = trail[trail.length - 1];
    const sf = screen.getDisplayNearestPoint(end).scaleFactor || 1;
    const w = pw / sf, h = ph / sf;
    let best = null;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const st = { x: end.x + sx * w, y: end.y + sy * h };
        const d = Math.min(...trail.map((p) => Math.hypot(p.x - st.x, p.y - st.y)));
        if (!best || d < best.d) best = { d, st };
      }
    }
    const x = Math.round(Math.min(end.x, best.st.x)), y = Math.round(Math.min(end.y, best.st.y));
    const clean = path.join(tmpDir, `jy-clean-${stamp}.png`);
    await blinkCapture(['-R', `${x},${y},${Math.round(w)},${Math.round(h)}`, clean]);
    if (fs.existsSync(clean)) { fs.rm(tmp, () => {}); deliver([clean], toClipboard); }
    else deliver([tmp], toClipboard);
  } finally {
    setTimeout(() => { ownCapture = false; }, 400);
  }
}

let captureAt = 0;
let captureMode = 'normal';
let dirWatcher = null;
let framerWin = null;
const framed = new Set();

function getFramer() {
  if (framerWin && !framerWin.isDestroyed()) return Promise.resolve(framerWin);
  framerWin = new BrowserWindow({ show: false, width: 200, height: 200 });
  return framerWin.loadFile(path.join(__dirname, 'framer.html')).then(() => framerWin);
}

function ddayText(cfg) {
  const d = daysLeft(cfg);
  return d === null ? 'D-?' : d > 0 ? `D-${d}` : d === 0 ? 'D-DAY' : `D+${-d}`;
}

let fourQueue = [];
const THEME4 = ['doodle', 'greenstrip', 'holo', 'rescene', 'rsnight', 'rsdiary', 'rsfilm', 'rssweater', 'gystrip', 'gygrid', 'gybig', 'gyscatter', 'rspulse', 'rsstage', 'rstrot'];
function cutCount(layout) {
  if (!layout || layout === 'single') return 0;
  if (layout === 'two') return 2;
  const m = /^c([12])-/.exec(layout);
  return m ? Number(m[1]) : 4;
}
function fourLabel() {
  const cfg = loadConfig() || {};
  const n = cfg.capture === 'photo' ? cutCount(cfg.frameLayout) : 0;
  return n > 1 ? ` ${n === 2 ? '두컷' : '네컷'} ${fourQueue.length}/${n}` : '';
}
function frameAssets() {
  const assets = {};
  for (const d of ['rs', 'gy']) {
    const dir = path.join(__dirname, 'frames', d);
    for (const n of fs.readdirSync(dir)) assets[n] = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, n)).toString('base64');
  }
  return assets;
}

async function frameShot(file) {
  if (framed.has(file) || !fs.existsSync(file)) return;
  framed.add(file);
  try {
    const st = fs.statSync(file);
    if (st.mtimeMs < captureAt - 3000) return;
    const cfg = loadConfig() || {};
    const need = cutCount(cfg.frameLayout);
    if (need > 0) {
      fourQueue.push(file);
      updateTray();
      if (fourQueue.length < need) return;
      const files = fourQueue.slice(0, need);
      fourQueue = [];
      updateTray();
      const n4 = new Date();
      const p2 = (x) => String(x).padStart(2, '0');
      const shots = files.map((f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
      const custom4 = cfg.frameStyle === 'custom' && cfg.frameFile ? fileToDataUrl(cfg.frameFile) : null;
      const w4 = await getFramer();
      const job = { shots, layout: cfg.frameLayout, style: cfg.frameStyle || 'white', dday: ddayText(cfg), date: `${n4.getFullYear()}.${p2(n4.getMonth() + 1)}.${p2(n4.getDate())}`, custom: custom4 };
      const isTheme = THEME4.includes(cfg.frameLayout) || /^c[12]-/.test(cfg.frameLayout);
      const url4 = await w4.webContents.executeJavaScript(isTheme ? `frameTheme(${JSON.stringify(Object.assign(job, { theme: cfg.frameLayout, assets: frameAssets() }))})` : `frameFour(${JSON.stringify(job)})`);
      const label = need === 1 ? '한컷' : need === 2 ? '두컷' : '네컷';
      const out4 = path.join(path.dirname(files[files.length - 1]), `${label} ${n4.getFullYear()}-${p2(n4.getMonth() + 1)}-${p2(n4.getDate())} ${p2(n4.getHours())}.${p2(n4.getMinutes())}.${p2(n4.getSeconds())}.png`);
      framed.add(out4);
      fs.writeFileSync(out4, Buffer.from(url4.split(',')[1], 'base64'));
      openShare(out4);
      return;
    }
    const n = new Date();
    const date = `${n.getFullYear()}.${String(n.getMonth() + 1).padStart(2, '0')}.${String(n.getDate()).padStart(2, '0')}`;
    const shot = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
    const custom = cfg.frameStyle === 'custom' && cfg.frameFile ? fileToDataUrl(cfg.frameFile) : null;
    const w = await getFramer();
    const job = JSON.stringify({ shot, style: cfg.frameStyle || 'white', dday: ddayText(cfg), date, custom });
    const url = custom
      ? await w.webContents.executeJavaScript(`frameFixed(${JSON.stringify({ shots: [shot], layout: 'single', style: 'white', dday: ddayText(cfg), date, custom })})`)
      : await w.webContents.executeJavaScript(`frameImage(${job})`);
    const out = file.replace(/\.png$/i, ' 포토이즘.png');
    framed.add(out);
    fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
    openShare(out);
  } catch (e) {
    // 원본 스크린샷은 그대로 둠
  }
}

function watchShotDir(on) {
  if (!on) {
    if (dirWatcher) dirWatcher.close();
    dirWatcher = null;
    return;
  }
  if (dirWatcher) return;
  const dir = shotDir();
  try {
    dirWatcher = fs.watch(dir, (ev, name) => {
      if (!name || name.startsWith('.') || !/\.png$/i.test(name) || name.includes('포토이즘') || /^(한컷|두컷|네컷) /.test(name)) return;
      if (Date.now() - captureAt > 30000) return;
      const file = path.join(dir, name);
      setTimeout(() => frameShot(file), 800);
    });
  } catch {
    dirWatcher = null;
  }
}

let shotWatch = null;
let shotHidden = [];
function watchScreenshotUI(on) {
  if (!on) {
    if (shotWatch) clearInterval(shotWatch);
    shotWatch = null;
    shotHidden.forEach((w) => { if (!w.isDestroyed()) w.showInactive(); });
    shotHidden = [];
    return;
  }
  if (shotWatch || process.platform !== 'darwin') return;
  let busy = false;
  shotWatch = setInterval(() => {
    if (busy) return;
    busy = true;
    execFile('/usr/bin/pgrep', ['-x', 'screencapture'], (err, out) => {
      busy = false;
      const running = !err && String(out).trim().length > 0;
      if (running) captureAt = Date.now();
      if (captureMode !== 'work' || ownCapture) return;
      if (running && !shotHidden.length) {
        shotHidden = [...overlays.values()].filter((w) => !w.isDestroyed() && w.isVisible());
        shotHidden.forEach((w) => w.hide());
      } else if (!running && shotHidden.length) {
        const ws = shotHidden;
        shotHidden = [];
        setTimeout(() => ws.forEach((w) => { if (!w.isDestroyed()) w.showInactive(); }), 300);
      }
    });
  }, 80);
}

function applyShortcuts() {
  const cfgW = loadConfig() || {};
  captureMode = cfgW.capture || 'normal';
  if (captureMode !== 'work' && shotHidden.length) {
    shotHidden.forEach((w) => { if (!w.isDestroyed()) w.showInactive(); });
    shotHidden = [];
  }
  watchScreenshotUI((captureMode === 'work' && cfgW.enabled !== false) || captureMode === 'photo');
  watchShotDir(captureMode === 'photo');
  globalShortcut.unregisterAll();
  const cfg = loadConfig() || {};
  if (!IS_MAC) {
    let ok = 0;
    for (const [acc, region] of [['Control+Shift+4', true], ['Control+Shift+3', false], ['PrintScreen', true]]) {
      try { if (globalShortcut.register(acc, () => ownShot({ region }))) ok++; } catch {}
    }
    shortcutState = ok;
    return;
  }
  if (cfg.capture !== 'work' || cfg.enabled === false) { shortcutState = null; return; }
  const map = {
    'Command+Shift+3': [[], false],
    'Command+Shift+4': [['-i'], false],
    'Command+Shift+5': [['-iU'], false],
    'Command+Control+Shift+3': [[], true],
    'Command+Control+Shift+4': [['-i'], true],
  };
  let ok = 0;
  for (const [acc, [args, clip]] of Object.entries(map)) {
    try { if (globalShortcut.register(acc, () => hiddenCapture(args, clip))) ok++; } catch {}
  }
  shortcutState = ok;
}

function applyWindowState() {
  const cfg = loadConfig() || {};
  const on = cfg.enabled !== false;
  for (const w of overlays.values()) {
    if (w.isDestroyed()) continue;
    w.setContentProtection(cfg.capture === 'work');
    if (on && !w.isVisible()) w.showInactive();
    if (!on && w.isVisible()) w.hide();
  }
  applyShortcuts();
  updateTray();
}

async function pickFrame() {
  app.focus({ steal: true });
  const res = await dialog.showOpenDialog({
    title: '포토이즘 프레임 이미지 선택 (가운데가 투명한 PNG)',
    properties: ['openFile'],
    filters: [{ name: '이미지', extensions: ['png', 'webp', 'gif', 'jpg', 'jpeg'] }],
  });
  if (res.canceled || !res.filePaths.length) return;
  const dir = path.join(app.getPath('userData'), 'frames');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
  const dest = path.join(dir, `frame_${Date.now()}${path.extname(res.filePaths[0]).toLowerCase()}`);
  fs.copyFileSync(res.filePaths[0], dest);
  patchConfig({ frameFile: dest, frameStyle: 'custom', capture: 'photo' });
}

const CUT_STYLES = [['basic', '기본 색 (위에서 고른 색)'], ['doodle', '연두 낙서'], ['greenstrip', '초록 스트립'], ['sign', '핑크 홀로 사인'], ['holo', '리센느 사진'], ['night', '리센느 블루 나이트'], ['diary', '리센느 다이어리'], ['film', '리센느 필름'], ['sweater', '리센느 겨울 니트'], ['pulse', '리센느 펄스'], ['stage', '리센느 무대'], ['trot', '리센느 트로트'], ['leopard', '호피'], ['gypink', '핑크 호피'], ['gywhite', '화이트 호피'], ['gypolaroid', '호피 폴라로이드']];
const FOUR_OF = { doodle: 'doodle', greenstrip: 'greenstrip', sign: 'holo', holo: 'rescene', night: 'rsnight', diary: 'rsdiary', film: 'rsfilm', sweater: 'rssweater', pulse: 'rspulse', stage: 'rsstage', trot: 'rstrot', leopard: 'gystrip', gypink: 'gygrid', gywhite: 'gybig', gypolaroid: 'gyscatter' };
const LAYOUT_NAMES = { single: '한 컷 기본 색', two: '두 컷 기본 색', strip: '네 컷 기본 색 세로', grid: '네 컷 기본 색 2x2' };
for (const [k, v] of CUT_STYLES) {
  if (k === 'basic') continue;
  LAYOUT_NAMES[`c1-${k}`] = `한 컷 ${v}`;
  LAYOUT_NAMES[`c2-${k}`] = `두 컷 ${v}`;
  LAYOUT_NAMES[FOUR_OF[k]] = `네 컷 ${v}`;
}
function layoutName(k) { return LAYOUT_NAMES[k || 'single'] || k; }
function setLayout(k) { fourQueue = []; patchConfig({ frameLayout: k, capture: 'photo' }); }
function layoutItem(k, v) {
  const cfg = loadConfig() || {};
  return { label: v, type: 'checkbox', checked: cfg.frameLayout === k, click: () => setLayout(k) };
}

function buildMenu() {
  if (!tray) return;
  const cfg = loadConfig() || {};
  const outfits = cfg.outfits || {};
  const outfitMenu = (slot) => Object.entries(OUTFIT_NAMES).map(([k, v]) => ({
    label: v, type: 'radio', checked: (outfits[slot] || 'military') === k,
    click: () => patchConfig({ outfits: { ...((loadConfig() || {}).outfits || {}), [slot]: k } }),
  }));
  const menu = Menu.buildFromTemplate([
    { label: '캐릭터 켜기', type: 'checkbox', checked: cfg.enabled !== false, click: (i) => patchConfig({ enabled: i.checked }) },
    { type: 'separator' },
    { label: '동작', submenu: [...ACTIONS.map(([l, k]) => ({ label: l, click: () => sendToPet(k) })), { type: 'separator' }, ...DANCE_ITEMS.map(([l, k]) => ({ label: l, click: () => sendToPet(k) }))] },
    {
      label: '캡쳐 모드',
      submenu: [
        { label: '일반 모드', type: 'radio', checked: (cfg.capture || 'normal') === 'normal', click: () => patchConfig({ capture: 'normal' }) },
        { label: '업무 모드', type: 'radio', checked: cfg.capture === 'work', click: () => patchConfig({ capture: 'work' }) },
        { label: '포토이즘 모드', type: 'radio', checked: cfg.capture === 'photo', click: () => patchConfig({ capture: 'photo' }) },
        { type: 'separator' },
        { label: '캐릭터 빼고 지금 캡쳐', click: () => hiddenCapture(['-i'], false) },
      ],
    },
    { label: '포토카드 도감', click: () => openSettings('cards') },
    { label: '설정…', accelerator: 'CmdOrCtrl+,', click: () => openSettings() },
    { type: 'separator' },
    ...updater.menuItems(),
    { label: '업데이트 내역', click: () => openChangelog() },
    { label: `버전 ${updater.version}`, enabled: false },
    { label: '종료', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  if (process.platform === 'darwin') tray = new Tray(nativeImage.createEmpty());
  else {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'frames', 'icon', 'tray.png')));
    tray.on('click', () => tray.popUpContextMenu());
  }
  buildMenu();
  updateTray();
  setInterval(updateTray, 60 * 1000);
}

function sendToPet(channel) {
  if (channel === 'diary') { sendDiary(); return; }
  const slot = Math.random() < 0.5 ? 'a' : 'b';
  const w = overlays.get(petHome[slot]);
  if (w && !w.isDestroyed()) w.webContents.send(channel, slot);
}

ipcMain.handle('frame-data', () => {
  const cfg = loadConfig() || {};
  return cfg.frameFile ? fileToDataUrl(cfg.frameFile) : null;
});

ipcMain.handle('face-data', (_e, slot) => {
  const f = normFace(((loadConfig() || {}).faces || {})[slot]);
  return f ? fileToDataUrl(f.file) : null;
});

ipcMain.handle('face-editor-init', () => {
  const d = faceDraft;
  if (!d) return null;
  return { slot: d.slot, name: SLOT_NAMES[d.slot], dataUrl: fileToDataUrl(d.file), params: d.params };
});

ipcMain.handle('face-editor-save', (_e, p, cutUrl) => {
  const d = faceDraft;
  if (!d) return false;
  let file = d.file;
  if (d.draft && !cutUrl) {
    for (const f of fs.readdirSync(facesDir())) {
      if (f.startsWith(d.slot + '_')) fs.rmSync(path.join(facesDir(), f), { force: true });
    }
    file = path.join(facesDir(), `${d.slot}_${Date.now()}.jpg`);
    fs.renameSync(d.file, file);
  }
  faceDraft = null;
  if (cutUrl) {
    for (const f of fs.readdirSync(facesDir())) {
      if (f.startsWith(d.slot + '_')) fs.rmSync(path.join(facesDir(), f), { force: true });
    }
    if (d.draft) fs.rmSync(d.file, { force: true });
    file = path.join(facesDir(), `${d.slot}_${Date.now()}.png`);
    fs.writeFileSync(file, Buffer.from(cutUrl.split(',')[1], 'base64'));
  }
  setFace(d.slot, { file, x: p.x, y: p.y, s: p.s, r: p.r || 0, pts: p.pts, cut: !!p.cut });
  if (faceWin) faceWin.close();
  return true;
});

ipcMain.handle('face-editor-cancel', () => {
  if (faceWin) faceWin.close();
});

ipcMain.handle('face-editor-repick', () => {
  if (faceDraft) pickFace(faceDraft.slot);
});

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('overlay-init', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win.ready = true;
  win.readyAt = Date.now();
  return {
    cfg: loadConfig(),
    screens: overlays.size,
    pets: Object.keys(petHome).filter((s) => petHome[s] === win.displayId),
  };
});

ipcMain.handle('save-config', (_e, input) => {
  const cfg = { ...(loadConfig() || {}), ...input };
  saveConfig(cfg);
  updateTray();
  if (setupWin) setupWin.close();
  if (!started) startOverlays();
  else broadcast('config-updated', cfg);
  buildMenu();
  return true;
});

ipcMain.on('set-ignore', (e, ignore) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on('pet-exit', (e, info) => {
  const from = BrowserWindow.fromWebContents(e.sender);
  if (!from) return;
  const cur = screen.getAllDisplays().find((d) => d.id === from.displayId) || screen.getPrimaryDisplay();
  const cb = cur.bounds;
  let target;
  let payload;
  if (info.side) {
    target = pickNeighbor(cur, info.side);
    const tb = target.bounds;
    const ratio = Math.max(0, Math.min(1, info.y / cb.height));
    payload = { slot: info.slot, y: ratio * tb.height, enter: info.side === 'left' ? 'right' : 'left' };
    if (target.id === cur.id) payload.enter = info.side === 'left' ? 'left' : 'right';
  } else {
    const gx = cb.x + info.px;
    const gy = cb.y + info.py;
    target = screen.getDisplayNearestPoint({ x: Math.round(gx), y: Math.round(gy) });
    const tb = target.bounds;
    payload = { slot: info.slot, x: cb.x + info.x - tb.x, y: cb.y + info.y - tb.y, dragged: true };
    payload.x = Math.max(0, Math.min(tb.width - 90, payload.x));
  }
  petHome[info.slot] = target.id;
  const w = overlays.get(target.id);
  if (w && !w.isDestroyed() && w.ready) w.webContents.send('spawn', payload);
});

const cardsDir = () => path.join(app.getPath('userData'), 'cards');
ipcMain.handle('card-list', () => {
  const out = [];
  const add = (dir, prefix) => {
    try {
      for (const n of fs.readdirSync(dir).sort()) {
        if (!/\.(jpe?g|png|webp|gif|heic)$/i.test(n)) continue;
        out.push({ id: prefix + n, url: fileToDataUrl(path.join(dir, n)) });
      }
    } catch {}
  };
  add(path.join(__dirname, 'frames', 'cards'), 'b:');
  add(cardsDir(), 'u:');
  return out;
});
async function addCards() {
  const r = await dialog.showOpenDialog({ title: '포토카드로 쓸 사진 고르기', properties: ['openFile', 'multiSelections'], filters: [{ name: '이미지', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'] }] });
  if (r.canceled || !r.filePaths.length) return;
  fs.mkdirSync(cardsDir(), { recursive: true });
  for (const f of r.filePaths) {
    try {
      let img = nativeImage.createFromPath(f);
      if (img.isEmpty()) continue;
      const s = img.getSize();
      if (s.height > 1000) img = img.resize({ height: 1000 });
      fs.writeFileSync(path.join(cardsDir(), `${Date.now()}-${path.basename(f).replace(/\.[^.]+$/, '')}.jpg`), img.toJPEG(86));
    } catch {}
  }
  for (const w of overlays.values()) if (!w.isDestroyed()) w.webContents.send('cards-updated');
}

/* ---------- 포토카드 세트 ---------- */
const CARD_SETS = [
  { id: 'angel', name: '천사 날개', cards: [28, 34, 45], reward: { type: 'outfit', key: 'angel', label: '천사 옷 (날개와 링)' } },
  { id: 'princess', name: '왕관', cards: [30, 38], reward: { type: 'outfit', key: 'princess', label: '공주 옷 (왕관)' } },
  { id: 'office', name: '안경', cards: [29, 31], reward: { type: 'outfit', key: 'office', label: '안경 오피스 옷' } },
  { id: 'selfie', name: '거울 셀카', cards: [19, 42, 43, 47, 49], reward: { type: 'outfit', key: 'selfie', label: '거울 셀카 옷 (휴대폰)' } },
  { id: 'group', name: '다섯 명 단체', cards: [11, 12, 15, 16, 17, 21], reward: { type: 'frame', key: 'gold', label: '골드 프레임' } },
].map((s) => ({ ...s, ids: s.cards.map((n) => `b:card${String(n).padStart(2, '0')}.jpg`) }));
function setProgress(cfg) {
  const seen = (cfg && cfg.cards) || {};
  return CARD_SETS.map((s) => ({ id: s.id, name: s.name, reward: s.reward, total: s.ids.length, got: s.ids.filter((i) => seen[i]).length, done: s.ids.every((i) => seen[i]) }));
}
function unlocked(cfg) {
  const u = {};
  for (const s of setProgress(cfg)) if (s.done) u[s.reward.key] = true;
  return u;
}

/* ---------- 날씨 ---------- */
const CITIES = { seoul: ['서울', 37.5145, 127.1059], busan: ['부산', 35.1796, 129.0756], incheon: ['인천', 37.4563, 126.7052], daegu: ['대구', 35.8714, 128.6014], daejeon: ['대전', 36.3504, 127.3845], gwangju: ['광주', 35.1595, 126.8526], jeju: ['제주', 33.4996, 126.5312] };
let weatherNow = null;
let weatherErr = null;
function wkind(code) {
  if ([95, 96, 99].includes(code)) return 'thunder';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 2) return 'cloud';
  return 'clear';
}
async function fetchWeather() {
  const cfg = loadConfig() || {};
  if (cfg.weather === false) { weatherNow = null; broadcast('weather', null); return; }
  const [name, lat, lon] = CITIES[cfg.city] || CITIES.seoul;
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FSeoul`);
    const j = await r.json();
    weatherNow = { city: name, temp: Math.round(j.current.temperature_2m), code: j.current.weather_code, kind: wkind(j.current.weather_code) };
  } catch (e) {
    weatherErr = e.message;
  }
  if (weatherNow) broadcast('weather', weatherNow);
}
ipcMain.handle('weather-now', () => weatherNow);

/* ---------- 키우기 (배고픔, 기분) ---------- */
ipcMain.handle('care-get', () => ((loadConfig() || {}).care) || {});
ipcMain.on('care-set', (_e, slot, v) => {
  const cfg = loadConfig() || {};
  saveConfig({ ...cfg, care: { ...(cfg.care || {}), [slot]: v } });
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings-refresh');
});

/* ---------- 설정 창 ---------- */
let settingsWin = null;
let settingsTab = 'general';
function openSettings(tab) {
  settingsTab = tab || settingsTab || 'general';
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.webContents.send('settings-tab', settingsTab);
    settingsWin.show();
    settingsWin.focus();
    app.focus({ steal: true });
    return;
  }
  const mac = process.platform === 'darwin';
  settingsWin = new BrowserWindow({
    width: 820,
    height: 600,
    minWidth: 700,
    minHeight: 480,
    title: '설정',
    show: false,
    ...(mac ? { titleBarStyle: 'hiddenInset', vibrancy: 'sidebar', visualEffectState: 'active', backgroundColor: '#00000000' } : {}),
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  settingsWin.loadFile(path.join(__dirname, 'settings.html'), { search: `tab=${settingsTab}${mac ? '&vibrancy=1' : ''}` });
  settingsWin.once('ready-to-show', () => settingsWin && settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
  app.focus({ steal: true });
}
function primaryOverlay() {
  const id = screen.getPrimaryDisplay().id;
  const w = overlays.get(id) || [...overlays.values()][0];
  return w && !w.isDestroyed() ? w : null;
}
function sendPrimary(ch, data) {
  const w = primaryOverlay();
  if (w) w.webContents.send(ch, data);
}
function sendAction(k) {
  if (k === 'diary') { sendDiary(); return; }
  const slot = Math.random() < 0.5 ? 'a' : 'b';
  const w = overlays.get(petHome[slot]) || primaryOverlay();
  if (w && !w.isDestroyed()) w.webContents.send(k, slot);
}
ipcMain.handle('settings-data', () => ({
  cfg: loadConfig() || {},
  version: updater.version,
  update: updater.status(),
  login: app.getLoginItemSettings().openAtLogin,
  slots: SLOT_NAMES,
  outfits: OUTFIT_NAMES,
  actions: ACTIONS,
  dances: DANCE_ITEMS,
  frameStyles: FRAME_STYLES,
  cutStyles: CUT_STYLES,
  fourOf: FOUR_OF,
  layoutNames: LAYOUT_NAMES,
  queue: fourQueue.length,
  shortcutState,
  days: daysLeft(loadConfig()),
  diaries: diaryList(),
  milestones: [800, 700, 600, 500, 400, 300, 200, 100, 50, 30, 10, 7, 3, 1, 0],
  sets: setProgress(loadConfig()),
  unlocked: unlocked(loadConfig()),
  cities: Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, v[0]])),
  weather: weatherNow,
}));
ipcMain.handle('settings-patch', (_e, patch) => { patchConfig(patch); return true; });
ipcMain.handle('settings-do', async (_e, cmd, arg) => {
  switch (cmd) {
    case 'action': sendAction(arg); break;
    case 'pickFace': pickFace(arg); break;
    case 'adjustFace': adjustFace(arg); break;
    case 'resetFace': setFace('a', null); setFace('b', null); break;
    case 'setup': openSetup(); break;
    case 'pickFrame': pickFrame(); break;
    case 'addCards': await addCards(); break;
    case 'capture': hiddenCapture(['-i'], false); break;
    case 'checkUpdate': updater.check(true); break;
    case 'installUpdate': updater.install(); break;
    case 'changelog': openChangelog(); break;
    case 'resetQueue': fourQueue = []; updateTray(); buildMenu(); break;
    case 'login': app.setLoginItemSettings({ openAtLogin: !!arg }); buildMenu(); break;
    case 'diag': elClipboard.writeText(diagnostics()); return true;
    case 'saveCard': {
      const m2 = /^data:image\/png;base64,(.+)$/.exec(String(arg || ''));
      if (!m2) return false;
      const dir = path.join(app.getPath('downloads'), '전역까지 꾸민 카드');
      fs.mkdirSync(dir, { recursive: true });
      const n = new Date();
      const f = path.join(dir, `카드 ${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}-${String(n.getHours()).padStart(2, '0')}${String(n.getMinutes()).padStart(2, '0')}${String(n.getSeconds()).padStart(2, '0')}.png`);
      fs.writeFileSync(f, Buffer.from(m2[1], 'base64'));
      shell.showItemInFolder(f);
      return f;
    }
    case 'copyCard': {
      const img = nativeImage.createFromDataURL(String(arg || ''));
      if (img.isEmpty()) return false;
      elClipboard.writeImage(img);
      return true;
    }
    case 'logs': shell.openPath(app.getPath('userData')); break;
    case 'milestone': sendPrimary('milestone', arg); break;
    case 'banner': sendPrimary('banner', { kind: 'random' }); break;
    case 'acryl': sendPrimary('acryl', weatherNow); break;
    case 'weather': fetchWeather(); break;
    case 'slotAct': {
      const [k, slot] = String(arg).split(':');
      const w = overlays.get(petHome[slot]) || primaryOverlay();
      if (w && !w.isDestroyed()) w.webContents.send(k, slot);
      break;
    }
    case 'faceThumb': {
      const f = normFace(((loadConfig() || {}).faces || {})[arg]);
      return f ? fileToDataUrl(f.file) : null;
    }
    default: break;
  }
  return true;
});
ipcMain.handle('card-collection', async () => {
  const cfg = loadConfig() || {};
  const seen = cfg.cards || {};
  const all = [];
  const add = (dir, prefix) => {
    try {
      for (const n of fs.readdirSync(dir).sort()) {
        if (!/\.(jpe?g|png|webp|gif)$/i.test(n)) continue;
        const id = prefix + n;
        const s = seen[id];
        all.push({ id, n: s ? s.n : 0, best: s ? s.best : null, first: s ? s.first : null, url: s ? fileToDataUrl(path.join(dir, n)) : null });
      }
    } catch {}
  };
  add(path.join(__dirname, 'frames', 'cards'), 'b:');
  add(cardsDir(), 'u:');
  return all;
});
const RANK = { N: 0, R: 1, SR: 2, SSR: 3 };
ipcMain.handle('card-record', (_e, id, rare) => {
  const cfg = loadConfig() || {};
  const cards = { ...(cfg.cards || {}) };
  const prev = cards[id];
  cards[id] = { n: (prev ? prev.n : 0) + 1, best: prev && RANK[prev.best] >= RANK[rare] ? prev.best : rare, first: prev ? prev.first : Date.now() };
  const before = setProgress(cfg).filter((s) => s.done).map((s) => s.id);
  saveConfig({ ...cfg, cards });
  diaryAdd('cards');
  const after = setProgress({ cards });
  const fresh = after.filter((s) => s.done && !before.includes(s.id));
  for (const s of fresh) setTimeout(() => sendPrimary('banner', { title: `${s.name} 세트 완성`, body: `보상: ${s.reward.label}. 설정에서 바로 쓸 수 있음` }), 3200);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings-refresh');
  return { isNew: !prev, count: Object.keys(cards).length, set: fresh.length ? fresh[0].name : null };
});

/* ---------- 네컷 결과 공유 창 ---------- */
let shareWin = null;
let shareFile = null;
function openShare(file) {
  const cfg = loadConfig() || {};
  if (cfg.shareWindow === false || process.env.JY_SELFTEST) return;
  shareFile = file;
  if (shareWin && !shareWin.isDestroyed()) { shareWin.reload(); shareWin.showInactive(); return; }
  const wa = screen.getPrimaryDisplay().workArea;
  const mac = process.platform === 'darwin';
  shareWin = new BrowserWindow({
    width: 300,
    height: 420,
    x: wa.x + wa.width - 316,
    y: wa.y + 12,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: '',
    show: false,
    ...(mac ? { titleBarStyle: 'hiddenInset', vibrancy: 'popover', visualEffectState: 'active', backgroundColor: '#00000000' } : {}),
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  shareWin.loadFile(path.join(__dirname, 'share.html'), { search: mac ? 'vibrancy=1' : '' });
  shareWin.once('ready-to-show', () => shareWin && shareWin.showInactive());
  shareWin.on('closed', () => { shareWin = null; });
}
ipcMain.handle('share-data', () => (shareFile ? { name: path.basename(shareFile), url: fileToDataUrl(shareFile) } : null));
ipcMain.handle('share-do', (e, cmd) => {
  if (!shareFile) return false;
  if (cmd === 'copy') { elClipboard.writeImage(nativeImage.createFromPath(shareFile)); return true; }
  if (cmd === 'finder') { shell.showItemInFolder(shareFile); return true; }
  if (cmd === 'share' && ShareMenu) {
    const w = BrowserWindow.fromWebContents(e.sender);
    new ShareMenu({ filePaths: [shareFile] }).popup({ window: w });
    return true;
  }
  if (cmd === 'open') { shell.openPath(shareFile); return true; }
  if (cmd === 'close' && shareWin) shareWin.close();
  return true;
});

/* ---------- 문제 보내기용 정보 ---------- */
const errLogPath = () => path.join(app.getPath('userData'), 'error.log');
function logError(msg) {
  try { fs.appendFileSync(errLogPath(), `${new Date().toISOString()} ${String(msg).slice(0, 2000)}\n`); } catch {}
}
process.on('uncaughtException', (e) => logError('main: ' + (e && e.stack || e)));
process.on('unhandledRejection', (e) => logError('main: ' + (e && e.stack || e)));
ipcMain.on('log-error', (_e, msg) => logError(msg));
function tail(file, n) {
  try { return fs.readFileSync(file, 'utf8').trim().split('\n').slice(-n).join('\n'); } catch { return '(없음)'; }
}
function diagnostics() {
  const cfg = loadConfig() || {};
  const safe = { discharge: cfg.discharge, mode: cfg.mode, capture: cfg.capture, frameStyle: cfg.frameStyle, frameLayout: cfg.frameLayout, enabled: cfg.enabled, sound: cfg.sound, banners: cfg.banners, outfits: cfg.outfits, faces: Object.keys(cfg.faces || {}), cards: Object.keys(cfg.cards || {}).length };
  return [
    `전역까지 ${updater.version} (번들 ${require('./package.json').version}, 경로 ${__dirname.includes('live') ? 'live' : 'bundle'})`,
    `macOS ${process.getSystemVersion ? process.getSystemVersion() : os.release()} ${process.arch}, Electron ${process.versions.electron}`,
    `모니터 ${screen.getAllDisplays().length}대, 업무 모드 단축키 ${shortcutState}`,
    `설정 ${JSON.stringify(safe)}`,
    '', '[오류 기록]', tail(errLogPath(), 40),
    '', '[업데이트 기록]', tail(path.join(app.getPath('userData'), 'update.log'), 20),
    '', '[잠금, 잠자기 기록]', tail(powerLogPath(), 30),
  ].join('\n');
}

/* ---------- D-day 기념일, 알림 배너 ---------- */
const MILESTONE_DAYS = [800, 700, 600, 500, 400, 300, 200, 100, 50, 30, 10, 7, 3, 1, 0];
function todayKey() { const n = new Date(); return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`; }
function checkMilestone() {
  const cfg = loadConfig() || {};
  if (cfg.enabled === false || !started) return;
  const d = daysLeft(cfg);
  if (d === null || !MILESTONE_DAYS.includes(d)) return;
  const key = `${cfg.discharge}:${d}`;
  if (cfg.milestoneDone === key) return;
  saveConfig({ ...cfg, milestoneDone: key });
  sendPrimary('milestone', d);
}
function greetToday() {
  const cfg = loadConfig() || {};
  if (cfg.enabled === false || cfg.banners === false || !started) return;
  if (cfg.lastGreet === todayKey()) return;
  saveConfig({ ...cfg, lastGreet: todayKey() });
  const d = daysLeft(cfg);
  if (d === null) return;
  sendPrimary('acryl', weatherNow);
}
/* ---------- 진급, 일기, 물, 스트레칭 ---------- */
const RANK_NAMES = ['이병', '일병', '상병', '병장'];
function rankOfDays(d) { return d > 480 ? 0 : d > 300 ? 1 : d > 120 ? 2 : 3; }
function checkPromotion() {
  const cfg = loadConfig() || {};
  if (cfg.enabled === false || !started) return;
  const d = daysLeft(cfg);
  if (d === null) return;
  const rk = rankOfDays(d);
  const key = `${cfg.discharge}:${rk}`;
  if (cfg.rankSeen === key) return;
  const prev = cfg.rankSeen && cfg.rankSeen.startsWith(cfg.discharge + ':') ? Number(cfg.rankSeen.split(':')[1]) : null;
  saveConfig({ ...cfg, rankSeen: key });
  if (prev !== null && rk > prev) {
    sendPrimary('promote', rk);
    diaryAdd('promote');
  }
}
function diaryAdd(k, n = 1) {
  const cfg = loadConfig() || {};
  const day = todayKey();
  const diary = { ...(cfg.diary || {}) };
  diary[day] = { ...(diary[day] || {}), [k]: ((diary[day] || {})[k] || 0) + n };
  const keys = Object.keys(diary).sort((a, b) => new Date(a) - new Date(b));
  while (keys.length > 90) delete diary[keys.shift()];
  saveConfig({ ...cfg, diary });
}
function diaryList() {
  const cfg = loadConfig() || {};
  const saved = cfg.diaryText || {};
  const days = new Set([...Object.keys(saved), ...Object.keys(cfg.diary || {}), todayKey()]);
  return [...days].sort((a, b) => new Date(b) - new Date(a)).map((d) => saved[d] || { ...diaryEntry(d), draft: d === todayKey() });
}
ipcMain.on('diary-add', (_e, k, n) => {
  if (typeof k !== 'string' || k.length > 20) return;
  if (k === 'gameScore') {
    const cfg = loadConfig() || {};
    const day = todayKey();
    const cur = ((cfg.diary || {})[day] || {}).gameBest || 0;
    if (Number(n) > cur) diaryAdd('gameBest', Number(n) - cur);
    return;
  }
  diaryAdd(k, Number(n) || 1);
});
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const WX_WORD = { clear: '맑음', cloud: '흐림', rain: '비', snow: '눈', thunder: '천둥', fog: '안개' };
function diaryEntry(day, slotName) {
  const cfg = loadConfig() || {};
  const c = (cfg.diary || {})[day] || {};
  const [y, mo, dd] = day.split('-').map(Number);
  const dt = new Date(y, mo - 1, dd);
  const wx = weatherNow && day === todayKey() ? ` ${WX_WORD[weatherNow.kind] || ''}` : '';
  const title = `${mo}월 ${dd}일 ${WEEK[dt.getDay()]}요일${wx}`;
  const ev = [];
  if (c.promote) ev.push([9, `오늘 ${RANK_NAMES[rankOfDays(daysLeft(cfg) ?? 999)]}으로 진급했다. 계급장이 무겁다.`]);
  if (c.angry) ev.push([8, c.angry > 1 ? `오늘 ${c.angry}번 화났다. 누가 자꾸 눌렀다.` : '오늘 한 번 화났다. 열 번 누른 사람 기억함.']);
  if (c.hideFound) ev.push([7, `숨바꼭질에서 ${c.hideFound}번 들켰다. 다음엔 더 잘 숨는다.`]);
  if (c.hideMiss && !c.hideFound) ev.push([6, '숨바꼭질 했는데 아무도 못 찾았다. 좀 서운하다.']);
  if (c.game) ev.push([6, c.gameBest >= 20 ? `짬밥 받기에서 ${c.gameBest}점 받았다. 오늘 컨디션 최고.` : `짬밥 받기 ${c.game}판 했다. 최고 ${c.gameBest || 0}점.`]);
  if (c.cards) ev.push([5, `포토카드 ${c.cards}장 뽑았다.`]);
  if (c.fed) ev.push([4, c.fed >= 3 ? `밥을 ${c.fed}번이나 먹었다. 배부르다.` : `밥은 ${c.fed}번 먹었다.`]);
  else ev.push([3, '오늘 밥을 못 먹었다. 서럽다.']);
  if (c.water) ev.push([4, `물은 ${c.water}번 같이 마셨다.`]);
  if (c.stretch) ev.push([4, `기지개를 ${c.stretch}번 같이 켰다. 허리가 조금 펴졌다.`]);
  if (c.talks) ev.push([3, `둘이 ${c.talks}번 수다 떨었다.`]);
  if (c.petted) ev.push([3, `쓰다듬어 준 게 ${c.petted}번. 기분 좋았다.`]);
  if (c.chime) ev.push([2, `정각마다 시계 들고 ${c.chime}번 외쳤다. 목 아프다.`]);
  ev.sort((a, b) => b[0] - a[0]);
  const d = daysLeft(cfg);
  const close = d > 0 ? `전역까지 ${d}일. 내일도 버틴다.` : d === 0 ? '오늘 전역했다.' : `전역한 지 ${-d}일.`;
  const lines = [...ev.slice(0, 2).map((e) => e[1]), close];
  return { day, title, lines, by: slotName || null };
}
function sendDiary() {
  const cfg = loadConfig() || {};
  const day = todayKey();
  const e = diaryEntry(day);
  const texts = { ...(cfg.diaryText || {}), [day]: e };
  const keys = Object.keys(texts).sort((a, b) => new Date(a) - new Date(b));
  while (keys.length > 90) delete texts[keys.shift()];
  saveConfig({ ...(loadConfig() || {}), diaryText: texts });
  sendPrimary('diary', e);
}
let activeSec = 0;
function careTick() {
  const cfg = loadConfig() || {};
  if (!started || cfg.enabled === false) return;
  const n = new Date();
  const h = n.getHours();
  let idle = 0;
  try { idle = powerMonitor.getSystemIdleTime(); } catch {}
  if (idle < 120) activeSec += 30;
  else if (idle > 300) activeSec = 0;
  if (cfg.water !== false && h >= 9 && h < 19 && idle < 120) {
    const last = cfg.lastWater || 0;
    if (Date.now() - last >= 2 * 3600000) {
      saveConfig({ ...cfg, lastWater: Date.now() });
      if (last) sendPrimary('water');
    }
  }
  if (cfg.stretch !== false && h >= 8 && h < 23 && activeSec >= 50 * 60) {
    activeSec = 0;
    sendPrimary('stretchCall');
  }
  const day = todayKey();
  if (h >= 17 && (loadConfig() || {}).diaryShown !== day) {
    saveConfig({ ...(loadConfig() || {}), diaryShown: day });
    setTimeout(sendDiary, n.getDay() >= 1 && n.getDay() <= 5 && h === 17 && n.getMinutes() < 2 ? 25000 : 3000);
  }
}

function lifeTick() {
  const cfg = loadConfig() || {};
  if (!started || cfg.enabled === false) return;
  const n = new Date();
  const wd = n.getDay();
  const key = todayKey();
  const ev = cfg.lifeDone || {};
  const fire = (k) => {
    if (ev[k] === key) return;
    saveConfig({ ...(loadConfig() || {}), lifeDone: { ...ev, [k]: key } });
    ev[k] = key;
    sendPrimary('life', k);
  };
  const hm = n.getHours() * 60 + n.getMinutes();
  if (cfg.chime !== false && n.getMinutes() === 0) {
    const hk = 'chime' + n.getHours();
    if (ev[hk] !== key) {
      saveConfig({ ...(loadConfig() || {}), lifeDone: { ...ev, [hk]: key } });
      ev[hk] = key;
      sendPrimary('chime', n.getHours());
    }
  }
  if (wd >= 1 && wd <= 5) {
    if (hm >= 16 * 60 + 50 && hm < 17 * 60) fire('offsoon');
    if (hm >= 17 * 60 && hm < 17 * 60 + 15) fire('offwork');
  }
  const pd = new Date(n.getFullYear(), n.getMonth(), 25);
  if (pd.getDay() === 6) pd.setDate(24);
  if (pd.getDay() === 0) pd.setDate(23);
  if (n.getDate() === pd.getDate() && n.getHours() >= 9) fire('payday');
}

function scheduleBanner() {
  const cfg = loadConfig() || {};
  const freq = cfg.bannerFreq || 'normal';
  const mins = freq === 'low' ? [45, 90] : freq === 'high' ? [8, 18] : [20, 40];
  setTimeout(() => {
    const c = loadConfig() || {};
    if (started && c.enabled !== false && c.banners !== false) sendPrimary('banner', { kind: 'random' });
    scheduleBanner();
  }, (mins[0] + Math.random() * (mins[1] - mins[0])) * 60000);
}

/* ---------- 실제 Mac 자동 점검 (GitHub Actions) ---------- */
async function runSelftest() {
  const out = process.env.JY_OUT || path.join(os.tmpdir(), 'jy-selftest');
  fs.mkdirSync(out, { recursive: true });
  const res = { version: updater.version, path: __dirname, errors: [], checks: {} };
  const done = (code) => { fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(res, null, 2)); app.exit(code); };
  setTimeout(() => { res.errors.push('timeout'); done(1); }, 280000);
  if (process.env.JY_SELFTEST === 'version') return done(0);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cap = async (w, name) => { const img = await w.webContents.capturePage(); fs.writeFileSync(path.join(out, name + '.png'), img.toPNG()); };
  try {
    for (let i = 0; i < 60 && ![...overlays.values()].some((w) => w.ready); i++) await wait(500);
    let ov = primaryOverlay();
    res.checks.overlay = !!(ov && ov.ready);
    for (const w of overlays.values()) w.webContents.on('console-message', (_e, level, msg) => { if (level >= 3) res.errors.push('overlay console: ' + msg); });
    await wait(2500);
    await cap(ov, 'overlay');
    for (const [k, t] of [['bread', 3200], ['chime', 1300], ['horn', 2400], ['morph', 1800], ['feed', 3000], ['acryl', 1500], ['hi5', 5000], ['talk', 4500], ['hide', 3500], ['promote', 4200], ['water', 1500], ['stretchCall', 1500], ['game', 6000], ['receipt', 1600]]) { ov.webContents.send(k, 'a'); await wait(t); await cap(ov, 'act-' + k); }
    sendDiary();
    await wait(1500);
    await cap(ov, 'act-diary');
    if (!IS_MAC) {
      // 자체 캡쳐: 영역 고정
      const f1 = await ownShot({ rect: { x: 100, y: 100, width: 300, height: 200 }, exclude: true, clip: false, quiet: true, noFrame: true }).catch((e) => 'err ' + e.message);
      const ok1 = typeof f1 === 'string' && fs.existsSync(f1) && !nativeImage.createFromPath(f1).isEmpty();
      if (ok1) fs.copyFileSync(f1, path.join(out, 'own-rect.png'));
      // 영역 선택 화면
      await wait(500);
      const p2 = ownShot({ region: true, exclude: false, clip: false, quiet: true, noFrame: true });
      for (let i = 0; i < 40 && !(selectJob && selectJob.win && !selectJob.win.webContents.isLoading()); i++) await wait(150);
      let ok2 = false;
      if (selectJob) {
        await wait(600);
        await cap(selectJob.win, 'own-select').catch(() => {});
        await selectJob.win.webContents.executeJavaScript('window.api.selectDone({ x: 40, y: 40, width: 260, height: 160 })').catch(() => {});
        const f2 = await p2;
        ok2 = typeof f2 === 'string' && fs.existsSync(f2);
        if (ok2) fs.copyFileSync(f2, path.join(out, 'own-region.png'));
      }
      res.checks.ownShot = ok1 && ok2;
      if (!res.checks.ownShot) res.errors.push(`own capture: rect ${ok1}, region ${ok2}`);
    }
    // 잠금 해제 복구
    wakeAll('selftest');
    await wait(4000);
    const bw = beats.get(ov.id);
    res.checks.wake = !!(bw && Date.now() - bw.at < 8000 && bw.pets > 0);
    if (!res.checks.wake) res.errors.push('wake: ' + JSON.stringify(bw || null));
    // 화면 프로세스가 죽었을 때 다시 뜨는지
    const dispId = ov.displayId;
    ov.webContents.forcefullyCrashRenderer();
    let ov2 = null;
    for (let i = 0; i < 70; i++) { await wait(500); ov2 = overlays.get(dispId); if (ov2 && ov2 !== ov && ov2.ready && beats.get(ov2.id)) break; }
    const b2 = ov2 && beats.get(ov2.id);
    res.checks.crashRecover = !!(ov2 && ov2 !== ov && b2 && b2.pets > 0);
    if (!res.checks.crashRecover) res.errors.push('crash recover failed');
    ov = ov2 || primaryOverlay();
    await cap(ov, 'after-crash');
    ov.webContents.send('banner', { title: '자동 점검', body: '알림 배너 표시 확인' });
    await wait(900);
    await cap(ov, 'banner');
    ov.webContents.send('milestone', 700);
    await wait(3600);
    await cap(ov, 'milestone');
    await wait(9000);
    const f = await getFramer();
    const shotDirs = path.join(__dirname, 'frames', 'cards');
    const shots = fs.readdirSync(shotDirs).slice(0, 4).map((n) => fileToDataUrl(path.join(shotDirs, n)));
    const assets = frameAssets();
    const themes = ['c1-trot', 'c2-holo', 'rescene', 'gystrip', 'rspulse', 'rsstage'];
    for (const th of themes) {
      const url = await f.webContents.executeJavaScript(`frameTheme(${JSON.stringify({ shots, theme: th, assets, dday: 'D-180', date: '2026.11.17' })})`);
      fs.writeFileSync(path.join(out, `frame-${th}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
    const u2 = await f.webContents.executeJavaScript(`frameFour(${JSON.stringify({ shots, layout: 'strip', style: 'pink', dday: 'D-180', date: '2026.11.17' })})`);
    fs.writeFileSync(path.join(out, 'frame-strip.png'), Buffer.from(u2.split(',')[1], 'base64'));
    res.checks.frames = themes.length + 1;
    openSettings('general');
    await wait(2500);
    for (const tab of ['general', 'character', 'frame', 'cards', 'diary', 'update']) { settingsWin.webContents.send('settings-tab', tab); await wait(900); await cap(settingsWin, 'settings-' + tab); }
    settingsWin.webContents.send('settings-tab', 'cards');
    await wait(900);
    res.checks.deco = await settingsWin.webContents.executeJavaScript(`(async () => {
      const im = document.querySelector('.pc img');
      if (!im) return 'no card';
      window.openDeco(im.src, 196);
      await new Promise((r) => setTimeout(r, 400));
      for (const k of ['heart', 'crown', 'stamp', 'tape']) document.querySelector('[data-st="' + k + '"]').click();
      document.querySelector('#d-text').value = '전역 축하';
      document.querySelector('#d-add').click();
      return document.querySelector('#d-cv').toDataURL().length > 1000;
    })()`).catch((e) => 'err ' + e.message);
    await wait(500);
    await cap(settingsWin, 'settings-deco');
    await settingsWin.webContents.executeJavaScript('window.decoOpen && window.decoOpen()').catch(() => {});
    openChangelog();
    await wait(1800);
    await cap(changelogWin, 'changelog');
    shareFile = path.join(out, 'frame-strip.png');
    process.env.JY_SELFTEST_SHARE = '1';
    const keep = process.env.JY_SELFTEST;
    delete process.env.JY_SELFTEST;
    openShare(shareFile);
    process.env.JY_SELFTEST = keep;
    await wait(1800);
    if (shareWin) await cap(shareWin, 'share');
    res.checks.diagnostics = diagnostics().split('\n')[0];
    try { res.errorLog = fs.readFileSync(errLogPath(), 'utf8'); } catch {}
    done(res.errors.length || res.errorLog ? 1 : 0);
  } catch (e) {
    res.errors.push(String(e && e.stack || e));
    done(1);
  }
}

app.whenReady().then(() => {
  updater.start(() => buildMenu());
  {
    const c0 = loadConfig();
    if (c0 && c0.lastVersion !== updater.version) {
      setTimeout(() => openChangelog(c0.lastVersion || '2.8.0'), 2500);
      patchConfig({ lastVersion: updater.version });
    }
  }
  protocol.handle('jy', (req) => {
    const name = path.basename(new URL(req.url).pathname);
    const file = path.join(MP_DIR, name);
    if (!file.startsWith(MP_DIR) || !fs.existsSync(file)) return new Response('not found', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': MP_TYPES[path.extname(name)] || 'application/octet-stream', 'access-control-allow-origin': '*' } });
  });
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  createTray();
  watchPower();
  screen.on('display-added', syncOverlays);
  screen.on('display-removed', syncOverlays);
  screen.on('display-metrics-changed', syncOverlays);
  const cfg = loadConfig();
  if (cfg && cfg.discharge) startOverlays();
  else openSetup();
  applyShortcuts();
  buildMenu();
  setTimeout(() => { greetToday(); checkMilestone(); }, 7000);
  setInterval(checkMilestone, 30 * 60000);
  setInterval(lifeTick, 30000);
  setInterval(careTick, 30000);
  setInterval(checkPromotion, 10 * 60000);
  setTimeout(checkPromotion, 12000);
  setTimeout(fetchWeather, 3000);
  setInterval(fetchWeather, 30 * 60000);
  setTimeout(lifeTick, 9000);
  scheduleBanner();
  if (process.env.JY_SELFTEST) runSelftest();
});

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
