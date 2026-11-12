const { app, Notification } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = 'ladog0113/jeonyeok';
const ASSET = 'Jeonyeok-mac.zip';

let state = { checking: false, latest: null, url: null, busy: false, error: null };
let onChange = () => {};
let notified = null;

function newer(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function bundlePath() {
  return path.resolve(app.getPath('exe'), '..', '..', '..');
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
    const asset = (rel.assets || []).find((a) => a.name === ASSET);
    const v = String(rel.tag_name || '').replace(/^v/, '');
    if (asset && newer(v, app.getVersion())) {
      state.latest = v;
      state.url = asset.browser_download_url;
      if (notified !== v && Notification.isSupported()) {
        notified = v;
        new Notification({ title: '전역까지 업데이트', body: `새 버전 ${v}이 있습니다. 메뉴바 D-day 숫자 > 업데이트 설치` }).show();
      }
    } else {
      state.latest = null;
      state.url = null;
      if (manual && Notification.isSupported()) new Notification({ title: '전역까지', body: `최신 버전입니다 (${app.getVersion()})` }).show();
    }
  } catch (e) {
    state.error = String(e.message || e);
    if (manual && Notification.isSupported()) new Notification({ title: '전역까지', body: '업데이트 확인 실패: 인터넷 연결을 확인하세요' }).show();
  } finally {
    state.checking = false;
    onChange();
  }
}

async function install() {
  if (!state.url || state.busy) return;
  state.busy = true;
  state.error = null;
  onChange();
  try {
    const res = await fetch(state.url, { redirect: 'follow', headers: { 'User-Agent': 'Jeonyeok' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const zip = path.join(os.tmpdir(), `jeonyeok-${state.latest}.zip`);
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    const target = bundlePath();
    const work = path.join(os.tmpdir(), `jeonyeok-update-${Date.now()}`);
    const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
    const script = [
      `while kill -0 ${process.pid} 2>/dev/null; do sleep 0.3; done`,
      `mkdir -p ${q(work)}`,
      `/usr/bin/ditto -xk ${q(zip)} ${q(work)} || exit 1`,
      `[ -d ${q(path.join(work, 'Jeonyeok.app'))} ] || exit 1`,
      `rm -rf ${q(target)}`,
      `mv ${q(path.join(work, 'Jeonyeok.app'))} ${q(target)}`,
      `/usr/bin/xattr -cr ${q(target)}`,
      `/usr/bin/codesign -f --deep -s - ${q(target)}`,
      `rm -rf ${q(work)} ${q(zip)}`,
      `/usr/bin/open ${q(target)}`,
    ].join('\n');
    spawn('/bin/bash', ['-c', script], { detached: true, stdio: 'ignore' }).unref();
    app.quit();
  } catch (e) {
    state.busy = false;
    state.error = String(e.message || e);
    if (Notification.isSupported()) new Notification({ title: '전역까지', body: '업데이트 내려받기 실패: 잠시 뒤 다시 시도하세요' }).show();
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
  setInterval(() => check(false), 6 * 60 * 60 * 1000);
}

module.exports = { start, check, install, menuItems, hasUpdate: () => !!state.latest };
