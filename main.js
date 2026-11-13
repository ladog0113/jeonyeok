const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, protocol, globalShortcut, clipboard: elClipboard } = require('electron');
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
  if (d === null) tray.setTitle('D-?');
  else if (off) tray.setTitle((d > 0 ? `D-${d}` : d === 0 ? 'D-DAY' : `D+${-d}`) + off);
  else if (d > 0) tray.setTitle(`D-${d}`);
  else if (d === 0) tray.setTitle('D-DAY');
  else tray.setTitle(`D+${-d}`);
}

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
  overlays.set(display.id, win);
  const cfg0 = loadConfig() || {};
  win.setContentProtection(cfg0.capture === 'work');
  if (cfg0.enabled === false) win.once('ready-to-show', () => win.hide());
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
  yellowtop: '옐로 브라톱', halter: '홀터넥', strawberry: '딸기 티 + 스트라이프 팬츠', mintoff: '민트 오프숄더 + 도트 쇼츠', pinkmint: '핑크 민트 레이어드 탱크', y2k: 'Y2K',
};
const ACTIONS = [
  ['한마디 해봐', 'poke'], ['화면 깨기', 'smash'], ['빙글빙글', 'spin'], ['분신술', 'clone'], ['발가락 따봉', 'toe'],
  ['손가락 별', 'star'], ['그립감', 'grip'], ['공중제비', 'flip'], ['낙서하기', 'scribble'], ['사인하기', 'sign'], ['붓글씨', 'brush'], ['앉아서 쉬기', 'rest'], ['기지개', 'stretch'], ['손 흔들기', 'wave'], ['클락션 빵빵', 'horn'], ['빵 뜯기 (포토카드)', 'bread'], ['오리 변신 (20초)', 'morph'], ['슬라임 터뜨리기', 'slime'], ['잠자기', 'sleep'],
];
const DANCE_ITEMS = [
  ['파라파라', 'dance'], ['호루라기 춤', 'whistle'], ['어깨 털기', 'shimmy'], ['하트 춤', 'heart'], ['파워 댄스', 'power'], ['BAD', 'pop'], ['응원 춤', 'cheer'],
];

function patchConfig(patch) {
  const cfg = { ...(loadConfig() || {}), ...patch };
  saveConfig(cfg);
  broadcast('config-updated', cfg);
  applyWindowState();
  buildMenu();
  return cfg;
}

const FRAME_STYLES = { white: '흰색 기본', black: '블랙', pink: '핑크 하트', mint: '민트 별', film: '필름', army: '군대 카모' };
let shortcutState = null;

function shotDir() {
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
    { label: '동작', submenu: ACTIONS.map(([l, k]) => ({ label: l, click: () => sendToPet(k) })) },
    { label: '춤', submenu: DANCE_ITEMS.map(([l, k]) => ({ label: l, click: () => sendToPet(k) })) },
    {
      label: '모드',
      submenu: [
        { label: '걷기 모드', type: 'radio', checked: (cfg.mode || 'walk') !== 'fairy', click: () => patchConfig({ mode: 'walk' }) },
        { label: '요정 모드', type: 'radio', checked: cfg.mode === 'fairy', click: () => patchConfig({ mode: 'fairy' }) },
      ],
    },
    {
      label: '캡쳐 모드',
      submenu: [
        { label: '일반 모드', type: 'radio', checked: (cfg.capture || 'normal') === 'normal', click: () => patchConfig({ capture: 'normal' }) },
        { label: '업무 모드 (캡쳐에 안 찍힘)', type: 'radio', checked: cfg.capture === 'work', click: () => patchConfig({ capture: 'work' }) },
        { label: '포토이즘 모드 (캡쳐에 프레임)', type: 'radio', checked: cfg.capture === 'photo', click: () => patchConfig({ capture: 'photo' }) },
        { type: 'separator' },
        { label: '캐릭터 빼고 지금 캡쳐', click: () => hiddenCapture(['-i'], false) },
        ...(cfg.capture === 'work' && shortcutState === 0 ? [{ label: '단축키를 못 가져옴: 시스템 스크린샷 단축키를 끄면 동작', enabled: false }] : []),
      ],
    },
    {
      label: '포토이즘 프레임',
      submenu: [
        ...Object.entries(FRAME_STYLES).map(([k, v]) => ({
          label: v, type: 'radio', checked: (cfg.frameStyle || 'white') === k,
          click: () => patchConfig({ frameStyle: k, capture: 'photo' }),
        })),
        { label: '내 이미지', type: 'radio', enabled: !!cfg.frameFile, checked: cfg.frameStyle === 'custom', click: () => patchConfig({ frameStyle: 'custom', capture: 'photo' }) },
        { type: 'separator' },
        { label: '한 컷', submenu: CUT_STYLES.map(([k, v]) => layoutItem(k === 'basic' ? 'single' : `c1-${k}`, v)) },
        { label: '두 컷', submenu: CUT_STYLES.map(([k, v]) => layoutItem(k === 'basic' ? 'two' : `c2-${k}`, v)) },
        { label: '네 컷', submenu: [['strip', '기본 색 세로'], ['grid', '기본 색 2x2'], ...CUT_STYLES.filter(([k]) => k !== 'basic').map(([k, v]) => [FOUR_OF[k], v])].map(([k, v]) => layoutItem(k, v)) },
        { label: `현재: ${layoutName(cfg.frameLayout)}`, enabled: false },
        { label: '모은 사진 버리고 처음부터', enabled: fourQueue.length > 0, click: () => { fourQueue = []; updateTray(); buildMenu(); } },
        { type: 'separator' },
        { label: '화면에도 프레임 표시', type: 'checkbox', checked: !!cfg.frameOnScreen, click: (i) => patchConfig({ frameOnScreen: i.checked }) },
        { label: '내 프레임 이미지 고르기', click: pickFrame },
      ],
    },
    { label: `${SLOT_NAMES.a} 옷`, submenu: outfitMenu('a') },
    { label: `${SLOT_NAMES.b} 옷`, submenu: outfitMenu('b') },
    { label: '포토카드 사진 추가', click: () => addCards() },
    {
      label: '얼굴 바꾸기',
      submenu: [
        { label: `${SLOT_NAMES.a} 사진 고르기`, click: () => pickFace('a') },
        { label: `${SLOT_NAMES.a} 얼굴 위치 맞추기`, click: () => adjustFace('a') },
        { type: 'separator' },
        { label: `${SLOT_NAMES.b} 사진 고르기`, click: () => pickFace('b') },
        { label: `${SLOT_NAMES.b} 얼굴 위치 맞추기`, click: () => adjustFace('b') },
        { type: 'separator' },
        { label: '원래 얼굴로 되돌리기', click: () => { setFace('a', null); setFace('b', null); } },
      ],
    },
    { label: '전역일 변경', click: openSetup },
    { type: 'separator' },
    {
      label: '로그인 시 자동 실행',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    ...updater.menuItems(),
    { label: `버전 ${updater.version}`, enabled: false },
    { label: '종료', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  buildMenu();
  updateTray();
  setInterval(updateTray, 60 * 1000);
}

function sendToPet(channel) {
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

app.whenReady().then(() => {
  updater.start(() => buildMenu());
  protocol.handle('jy', (req) => {
    const name = path.basename(new URL(req.url).pathname);
    const file = path.join(MP_DIR, name);
    if (!file.startsWith(MP_DIR) || !fs.existsSync(file)) return new Response('not found', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': MP_TYPES[path.extname(name)] || 'application/octet-stream', 'access-control-allow-origin': '*' } });
  });
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  createTray();
  screen.on('display-added', syncOverlays);
  screen.on('display-removed', syncOverlays);
  screen.on('display-metrics-changed', syncOverlays);
  const cfg = loadConfig();
  if (cfg && cfg.discharge) startOverlays();
  else openSetup();
  applyShortcuts();
  buildMenu();
});

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
