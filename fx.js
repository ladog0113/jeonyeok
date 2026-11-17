// 효과음, 큰 글자 모양, 알림 배너, D-day 기념 연출
const SFX = (() => {
  let ctx = null;
  let master = null;
  const on = () => {
    try { return typeof cfg !== 'undefined' && cfg && cfg.sound !== false && cfg.capture !== 'work'; } catch { return false; }
  };
  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function env(g, t0, a, d, v) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  }
  function tone({ type = 'sine', f = 440, f2 = null, t = 0, d = 0.2, v = 0.2, a = 0.006, vib = 0, vibF = 0, lp = 0 }) {
    const c = ac(), t0 = c.currentTime + t;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    if (vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = vibF;
      lg.gain.value = vib;
      l.connect(lg).connect(o.frequency);
      l.start(t0);
      l.stop(t0 + d + 0.05);
    }
    let node = o;
    if (lp) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = lp;
      node = o.connect(fl);
    }
    env(g, t0, a, d, v);
    node.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + d + 0.05);
  }
  let noiseBuf = null;
  function noise({ t = 0, d = 0.3, v = 0.25, type = 'bandpass', f = 1200, f2 = null, q = 0.8, a = 0.005 }) {
    const c = ac(), t0 = c.currentTime + t;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf;
    fl.type = type;
    fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    fl.Q.value = q;
    env(g, t0, a, d, v);
    s.connect(fl).connect(g).connect(master);
    s.start(t0, Math.random());
    s.stop(t0 + d + 0.05);
  }
  const S = {
    honk() {
      tone({ type: 'square', f: 370, d: 0.2, v: 0.09, lp: 1800 });
      tone({ type: 'square', f: 466, d: 0.2, v: 0.08, lp: 1800 });
    },
    whistle() { tone({ type: 'sine', f: 2650, d: 0.16, v: 0.13, vib: 160, vibF: 34 }); },
    pop() { tone({ f: 720, f2: 180, d: 0.13, v: 0.22 }); },
    flip() { noise({ f: 900, f2: 4200, d: 0.22, v: 0.3, q: 1.4 }); },
    tear() { noise({ type: 'highpass', f: 1800, f2: 5200, d: 0.32, v: 0.28 }); noise({ t: 0.12, type: 'highpass', f: 2600, d: 0.2, v: 0.22 }); },
    quack() {
      tone({ type: 'sawtooth', f: 560, f2: 330, d: 0.16, v: 0.16, lp: 1500 });
      tone({ type: 'sawtooth', t: 0.2, f: 520, f2: 300, d: 0.18, v: 0.14, lp: 1400 });
    },
    poof() { noise({ type: 'lowpass', f: 1400, f2: 220, d: 0.42, v: 0.4 }); },
    splat() { noise({ type: 'lowpass', f: 900, f2: 160, d: 0.28, v: 0.45 }); tone({ f: 140, f2: 60, d: 0.2, v: 0.25 }); },
    crash() { noise({ type: 'highpass', f: 1500, d: 0.55, v: 0.32 }); tone({ f: 90, f2: 40, d: 0.3, v: 0.35 }); },
    chime() {
      for (let i = 0; i < 10; i++) tone({ type: 'square', f: i % 2 ? 2350 : 2100, t: i * 0.055, d: 0.05, v: 0.035, lp: 5000 });
      tone({ type: 'triangle', f: 659.3, t: 0.6, d: 0.9, v: 0.16 });
      tone({ type: 'sine', f: 1318.5, t: 0.6, d: 0.6, v: 0.05 });
      tone({ type: 'triangle', f: 523.3, t: 1.05, d: 1.1, v: 0.16 });
      tone({ type: 'sine', f: 1046.5, t: 1.05, d: 0.7, v: 0.05 });
    },
    ding() { tone({ f: 1318.5, d: 0.5, v: 0.08 }); tone({ f: 1975.5, t: 0.08, d: 0.6, v: 0.06 }); },
    sparkle() { [1568, 2093, 2637, 3136, 4186].forEach((f, i) => tone({ f, t: i * 0.06, d: 0.35, v: 0.07 })); },
    boom() { tone({ f: 110, f2: 38, d: 0.8, v: 0.4, a: 0.004 }); noise({ type: 'lowpass', f: 700, f2: 120, d: 0.9, v: 0.35 }); },
    crackle() { for (let i = 0; i < 14; i++) noise({ t: 0.3 + Math.random() * 0.7, type: 'highpass', f: 3000, d: 0.03, v: 0.18 }); },
    whoosh() { noise({ f: 300, f2: 2600, d: 0.5, v: 0.22, q: 0.6, a: 0.2 }); },
    fanfare() {
      const n = [523.25, 659.25, 783.99, 1046.5];
      n.forEach((f, i) => { tone({ type: 'triangle', f, t: i * 0.11, d: 0.3, v: 0.16 }); tone({ type: 'square', f, t: i * 0.11, d: 0.2, v: 0.03, lp: 2400 }); });
      [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone({ type: 'triangle', f, t: 0.5, d: 1.2, v: 0.1 }));
    },
    tick() { tone({ type: 'square', f: 1800, d: 0.03, v: 0.04 }); },
    clap() { noise({ type: 'bandpass', f: 1400, q: 0.9, d: 0.12, v: 0.55, a: 0.002 }); noise({ t: 0.015, type: 'highpass', f: 2500, d: 0.08, v: 0.3, a: 0.002 }); },
  };
  return {
    play(name) { if (on() && S[name]) try { S[name](); } catch {} },
  };
})();

const BLAST_STYLES = ['pop', 'wave', 'arc', 'burst', 'neon', 'ransom', 'stamp', 'extrude', 'bubble', 'shake'];
const RANSOM_BG = ['#ffe14a', '#ff7fb0', '#7fd8ff', '#b6f28a', '#ffffff', '#ffb35c', '#c9a6ff'];
function styleBlast(d, spans, style) {
  const st = style || BLAST_STYLES[Math.floor(Math.random() * BLAST_STYLES.length)];
  d.classList.add('v-' + st);
  const n = spans.length;
  spans.forEach((sp, i) => {
    const k = n > 1 ? i / (n - 1) - 0.5 : 0;
    if (st === 'arc') { sp.style.rotate = (k * 46).toFixed(1) + 'deg'; sp.style.translate = `0 ${(Math.abs(k) * k * 0 + k * k * 0.9).toFixed(2)}em`; }
    if (st === 'wave') sp.style.setProperty('--wd', (i * 0.08).toFixed(2) + 's');
    if (st === 'ransom') {
      sp.style.background = RANSOM_BG[(i * 3 + Math.floor(Math.random() * 3)) % RANSOM_BG.length];
      sp.style.rotate = (Math.random() * 16 - 8).toFixed(1) + 'deg';
      sp.style.fontSize = (0.82 + Math.random() * 0.3).toFixed(2) + 'em';
    }
    if (st === 'shake') sp.style.setProperty('--sd', (Math.random() * 0.2).toFixed(2) + 's');
  });
  if (st === 'burst') {
    const b = document.createElement('div');
    b.className = 'burst-bg';
    b.style.background = ['#ff4f6d', '#ffcf3f', '#4fd1ff', '#9b6bff'][Math.floor(Math.random() * 4)];
    d.prepend(b);
  }
  return st;
}

function ensureNotes() {
  let box = document.getElementById('mnotes');
  if (!box) {
    box = document.createElement('div');
    box.id = 'mnotes';
    document.body.appendChild(box);
  }
  return box;
}
function showBanner({ title, body, thumb, sound = true }) {
  const box = ensureNotes();
  while (box.children.length >= 3) box.firstChild.remove();
  const n = document.createElement('div');
  n.className = 'mnote';
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  n.innerHTML = `<div class="mn-ic"><span>전역</span></div><div class="mn-tx"><div class="mn-hd"><b>전역까지</b><span>지금</span></div>` +
    `${title ? `<div class="mn-ti">${esc(title)}</div>` : ''}<div class="mn-bd">${esc(body)}</div></div>` +
    (thumb ? `<img class="mn-th" alt="" src="${thumb}">` : '');
  box.appendChild(n);
  requestAnimationFrame(() => n.classList.add('in'));
  if (sound) SFX.play('ding');
  setTimeout(() => { n.classList.remove('in'); n.classList.add('out'); }, 6500);
  setTimeout(() => n.remove(), 7200);
}

const MILESTONES = [800, 700, 600, 500, 400, 300, 200, 100, 50, 30, 10, 7, 3, 1, 0];
const MILESTONE_TEXT = {
  800: ['800일 남았다', '아직 시작도 안 했다'], 700: ['700일 돌파', '이제 겨우 몸풀기'], 600: ['600일 돌파', '군대리아 아직 많이 남음'],
  500: ['500일 돌파', '반의 반은 왔다고 우기는 중'], 400: ['400일 돌파', '짬 냄새 나기 시작'], 300: ['300일 돌파', '이제 후임이 생겼다'],
  200: ['200일 돌파', '말년 냄새 솔솔'], 100: ['100일 남았다', '백일 축하합니다. 군대 백일'], 50: ['50일 남았다', '반백일. 버티면 된다'],
  30: ['한 달 남았다', '사회 적응 준비 시작'], 10: ['10일 남았다', '떨어지는 낙엽도 조심'], 7: ['일주일 남았다', '전역 일주일 전'],
  3: ['3일 남았다', '전투화 닦을 시간'], 1: ['내일 전역', '오늘 밤 잠 못 잠'], 0: ['전역 축하합니다', '진짜 끝. 수고했다'],
};
const FW_COLORS = [['#ffd86b', '#fff3c4', '#ffb020'], ['#ff6fb5', '#ffd1ea', '#ff3d8b'], ['#6fe3ff', '#e0fbff', '#2bb8ff'], ['#b48cff', '#efe3ff', '#7a4dff'], ['#8dff9a', '#eaffec', '#3ddc5a']];

let celebrating = false;
function runMilestone(d) {
  if (celebrating) return;
  celebrating = true;
  const w = W(), h = H();
  const root = document.createElement('div');
  root.className = 'ms-root';
  const cv = document.createElement('canvas');
  cv.className = 'ms-cv';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * dpr;
  cv.height = h * dpr;
  root.appendChild(cv);
  const idx = MILESTONES.indexOf(d);
  const from = idx > 0 ? MILESTONES[idx - 1] : d + 100;
  const [head, sub] = MILESTONE_TEXT[d] || [`D-${d}`, ''];
  const label = d === 0 ? 'D-DAY' : `D-${d}`;
  const startLabel = `D-${from}`;
  const odo = document.createElement('div');
  odo.className = 'ms-odo';
  const target = [...label];
  const start = [...startLabel.padStart(label.length, ' ')].slice(-label.length);
  odo.innerHTML = target.map((ch, i) => {
    if (!/\d/.test(ch) || !/\d/.test(start[i] || '')) return `<span class="ms-ch">${ch}</span>`;
    const a = Number(start[i]), b = Number(ch);
    const seq = [];
    let v = a;
    const steps = 10 + ((b - a + 10) % 10) + i * 3;
    for (let s = 0; s <= steps; s++) seq.push((a - s + 100) % 10);
    seq[seq.length - 1] = b;
    v = seq;
    return `<span class="ms-col" style="--n:${v.length - 1};--dl:${(0.15 * i).toFixed(2)}s"><span class="ms-reel">${v.map((x) => `<span>${x}</span>`).join('')}</span></span>`;
  }).join('');
  const box = document.createElement('div');
  box.className = 'ms-box';
  box.innerHTML = `<div class="ms-kicker">${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}</div>`;
  box.appendChild(odo);
  const rib = document.createElement('div');
  rib.className = 'ms-ribbon';
  rib.innerHTML = `<span>${head}</span>`;
  box.appendChild(rib);
  const sb = document.createElement('div');
  sb.className = 'ms-sub';
  sb.textContent = sub;
  box.appendChild(sb);
  root.appendChild(box);
  document.body.appendChild(root);
  if (d === 0) root.classList.add('dday');
  SFX.play('whoosh');

  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const rockets = [], parts = [], conf = [];
  const R = (a, b) => a + Math.random() * (b - a);
  function launch() {
    const pal = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    rockets.push({ x: R(w * 0.12, w * 0.88), y: h + 10, vx: R(-40, 40), vy: -R(h * 0.95, h * 1.25), ty: R(h * 0.12, h * 0.42), pal, kind: ['peony', 'ring', 'willow', 'crossette'][Math.floor(Math.random() * 4)], trail: [] });
  }
  function explode(r) {
    SFX.play('boom');
    if (Math.random() < 0.5) SFX.play('crackle');
    const n = r.kind === 'ring' ? 70 : r.kind === 'willow' ? 90 : 110;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R(-0.05, 0.05);
      const sp = r.kind === 'ring' ? 260 : R(60, 330);
      parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: r.kind === 'willow' ? R(2.2, 3) : R(1.1, 1.8), c: r.pal[Math.floor(Math.random() * 3)], g: r.kind === 'willow' ? 90 : 160, drag: r.kind === 'willow' ? 1.6 : 2.2, sparkle: Math.random() < 0.35, split: r.kind === 'crossette' && i % 10 === 0 });
    }
    flash = 0.35;
  }
  function confetti(k) {
    for (let i = 0; i < k; i++) {
      conf.push({ x: R(0, w), y: R(-h * 0.3, -10), vx: R(-30, 30), vy: R(80, 180), r: R(0, 6.28), vr: R(-6, 6), s: R(6, 12), c: ['#ffd86b', '#ff6fb5', '#6fe3ff', '#b48cff', '#ffffff', '#8dff9a'][i % 6], wob: R(0, 6.28) });
    }
  }
  let flash = 0;
  const T0 = performance.now();
  const DUR = d === 0 ? 16000 : 11500;
  let last = T0, nextLaunch = 0, fanfared = false;
  function frame(now) {
    const t = now - T0, dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    if (t < DUR - 1800 && t > nextLaunch) {
      const burst = t < 1200 ? 2 : 1;
      for (let i = 0; i < burst; i++) launch();
      nextLaunch = t + R(260, d === 0 ? 420 : 620);
    }
    if (!fanfared && t > 2300) { fanfared = true; SFX.play('fanfare'); confetti(d === 0 ? 260 : 160); root.classList.add('landed'); }
    if (d === 0 && t > 7000 && t < 7100) confetti(220);
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.vy += 520 * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.trail.push([r.x, r.y]);
      if (r.trail.length > 10) r.trail.shift();
      ctx.strokeStyle = r.pal[1];
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      r.trail.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      if (r.vy > -60 || r.y < r.ty) { explode(r); rockets.splice(i, 1); }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life > p.max) {
        if (p.split) for (let k = 0; k < 4; k++) parts.push({ x: p.x, y: p.y, vx: Math.cos(k * 1.57 + 0.78) * 120, vy: Math.sin(k * 1.57 + 0.78) * 120, life: 0, max: 0.7, c: '#ffffff', g: 120, drag: 2, sparkle: true });
        parts.splice(i, 1);
        continue;
      }
      const f = Math.exp(-p.drag * dt);
      p.vx *= f;
      p.vy = p.vy * f + p.g * dt;
      const px = p.x, py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const al = Math.max(0, 1 - p.life / p.max);
      ctx.globalAlpha = p.sparkle && Math.random() < 0.3 ? 0 : al;
      ctx.strokeStyle = p.c;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = conf.length - 1; i >= 0; i--) {
      const c = conf[i];
      c.wob += dt * 4;
      c.x += (c.vx + Math.sin(c.wob) * 40) * dt;
      c.y += c.vy * dt;
      c.r += c.vr * dt;
      if (c.y > h + 20) { conf.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = t > DUR - 1500 ? Math.max(0, (DUR - t) / 1500) : 1;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.scale(1, Math.cos(c.wob * 1.3));
      ctx.fillStyle = c.c;
      ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
      ctx.restore();
    }
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.25;
      ctx.fillStyle = '#fff6d8';
      ctx.fillRect(0, 0, w, h);
      flash = Math.max(0, flash - dt * 1.6);
    }
    ctx.globalAlpha = 1;
    if (t < DUR) requestAnimationFrame(frame);
    else { root.remove(); celebrating = false; }
  }
  requestAnimationFrame(frame);
  setTimeout(() => root.classList.add('out'), DUR - 1300);
  setTimeout(() => {
    try {
      list().forEach((p, i) => {
        if (p.morphed) p.unmorph();
        p.state = 'idle';
        p.walkTo(w / 2 - 70 + i * 90, Math.min(h - 140, h * 0.72));
        p.onArrive = () => { p.dance(d === 0 ? 'cheer' : 'power'); };
        p.say(d === 0 ? '전역이다!!!' : `${label}!!`, 2600);
      });
    } catch {}
  }, 900);
}
