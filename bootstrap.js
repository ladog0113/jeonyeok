// 앱 번들은 그대로 두고, 업데이트로 받은 코드(~/Library/Application Support/Jeonyeok/live)가 더 새 버전이면 그쪽을 실행
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

function newer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function log(msg) {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'update.log'), `${new Date().toISOString()} ${msg}\n`); } catch {}
}

let started = false;
try {
  const live = path.join(app.getPath('userData'), 'live');
  const pj = JSON.parse(fs.readFileSync(path.join(live, 'package.json'), 'utf8'));
  const bundled = require('./package.json').version;
  if (newer(pj.version, bundled) && fs.existsSync(path.join(live, 'main.js'))) {
    require(path.join(live, 'main.js'));
    started = true;
  }
} catch (e) {
  if (e && e.code !== 'ENOENT') log('live start failed: ' + (e.stack || e));
}
if (!started) require('./main.js');
