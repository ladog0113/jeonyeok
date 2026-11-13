const { app, Notification } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = 'ladog0113/jeonyeok';
const LIVE_ASSET = 'jeonyeok-live.zip';
const FULL_ASSET = 'Jeonyeok-mac.zip';
const VERSION = require('./package.json').version;

let state = { checking: false, latest: null, live: null, full: null, busy: false, error: null };
let onChange = () => {};
let notified = null;

function log(msg) {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'update.log'), `${new Date().toISOString()} ${msg}\n`); } catch {}
}

function newer(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function notify(body) {
  try { if (Notification.isSupported()) new Notification({ title: '전역까지', body }).show(); } catch {}
}

async function check(manual) {
  if (state.checking || state.busy) return;
  state.checking = true;
  state.error = null;
  onChange();
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Jeonyeok' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rel = await res.json();
    const v = String(rel.tag_name || '').replace(/^v/, '');
    const find = (n) => (rel.assets || []).find((a) => a.name === n);
    if (newer(v, VERSION) && (find(LIVE_ASSET) || find(FULL_ASSET))) {
      if (state.latest !== v) log(`check: latest ${v}, running ${VERSION}`);
      state.latest = v;
      state.live = find(LIVE_ASSET) ? find(LIVE_ASSET).browser_download_url : null;
      state.full = find(FULL_ASSET) ? find(FULL_ASSET).browser_download_url : null;
      if (notified !== v) {
        notified = v;
        notify(`새 버전 ${v}이 있습니다. 메뉴바 D-day 숫자 > 업데이트 설치`);
      }
    } else {
      state.latest = null;
      if (manual) notify(`최신 버전입니다 (${VERSION})`);
    }
  } catch (e) {
    state.error = String(e.message || e);
    log('check failed: ' + state.error);
    if (manual) notify('업데이트 확인 실패: 인터넷 연결을 확인하세요');
  } finally {
    state.checking = false;
    onChange();
  }
}

function run(cmd, args) {
  return new Promise((res, rej) => execFile(cmd, args, (err, so, se) => (err ? rej(new Error(`${cmd} ${err.message} ${se || ''}`)) : res())));
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Jeonyeok' } });
  if (!res.ok) throw new Error('download HTTP ' + res.status);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// 앱 번들(.app)은 건드리지 않고 ~/Library/Application Support/Jeonyeok/live 에 새 코드를 풀어 둔 뒤 재시작
async function installLive() {
  const ud = app.getPath('userData');
  const zip = path.join(ud, 'live-download.zip');
  const tmp = path.join(ud, 'live-new');
  const live = path.join(ud, 'live');
  const old = path.join(ud, 'live-old');
  await download(state.live, zip);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  await run('/usr/bin/ditto', ['-xk', zip, tmp]);
  const pj = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8'));
  if (pj.version !== state.latest || !fs.existsSync(path.join(tmp, 'main.js'))) throw new Error('unexpected package ' + pj.version);
  fs.rmSync(old, { recursive: true, force: true });
  if (fs.existsSync(live)) fs.renameSync(live, old);
  fs.renameSync(tmp, live);
  fs.rmSync(old, { recursive: true, force: true });
  fs.rmSync(zip, { force: true });
  log(`installed live ${pj.version}`);
  app.relaunch();
  app.exit(0);
}

async function installFull() {
  const zip = path.join(os.tmpdir(), `jeonyeok-${state.latest}.zip`);
  await download(state.full, zip);
  const target = path.resolve(app.getPath('exe'), '..', '..', '..');
  const work = path.join(os.tmpdir(), `jeonyeok-update-${Date.now()}`);
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const logf = q(path.join(app.getPath('userData'), 'update.log'));
  const script = [
    `exec >>${logf} 2>&1`,
    `while kill -0 ${process.pid} 2>/dev/null; do sleep 0.3; done`,
    `mkdir -p ${q(work)}`,
    `/usr/bin/ditto -xk ${q(zip)} ${q(work)} || exit 1`,
    `rm -rf ${q(target)} && mv ${q(path.join(work, 'Jeonyeok.app'))} ${q(target)}`,
    `/usr/bin/xattr -cr ${q(target)}`,
    `/usr/bin/codesign -f --deep -s - ${q(target)}`,
    `/usr/bin/open ${q(target)}`,
  ].join('\n');
  spawn('/bin/bash', ['-c', script], { detached: true, stdio: 'ignore' }).unref();
  app.quit();
}

async function install() {
  if (!state.latest || state.busy) return;
  state.busy = true;
  state.error = null;
  onChange();
  try {
    if (state.live) await installLive();
    else await installFull();
  } catch (e) {
    state.busy = false;
    state.error = String(e.message || e);
    log('install failed: ' + state.error);
    notify('업데이트 실패: 잠시 뒤 다시 시도하세요');
    onChange();
  }
}

function menuItems() {
  if (state.busy) return [{ label: '업데이트 받는 중…', enabled: false }];
  if (state.latest) return [{ label: `업데이트 설치 (${state.latest})`, click: () => install() }];
  return [{ label: state.checking ? '업데이트 확인 중…' : '업데이트 확인', enabled: !state.checking, click: () => check(true) }];
}

function start(changed) {
  onChange = changed || onChange;
  setTimeout(() => check(false), 8000);
  setInterval(() => check(false), 30 * 60 * 1000);
}

module.exports = { start, check, install, menuItems, version: VERSION, hasUpdate: () => !!state.latest };
