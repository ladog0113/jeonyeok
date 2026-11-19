// 포토카드 꾸미기: 스티커와 글씨를 올리고 이미지로 저장
(function () {
  const root = document.getElementById('deco');
  const STICKERS = [
    ['heart', '하트'], ['star', '별'], ['crown', '왕관'], ['ribbon', '리본'],
    ['sparkle', '반짝이'], ['bubble', '말풍선'], ['stamp', 'D-day 도장'], ['tape', '마스킹 테이프'],
  ];
  const COLORS = ['#ff4f8b', '#ff9f0a', '#ffd60a', '#34c759', '#0a84ff', '#bf5af2', '#ffffff', '#1d1d1f'];
  let img = null, items = [], sel = -1, color = COLORS[0], dday = null, drag = null;
  let cv, ctx, W = 550, H = 850;

  function star(c, r, n, inner) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI / n) * i - Math.PI / 2;
      const rr = i % 2 ? r * inner : r;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
  }
  function heart(c, r) {
    c.beginPath();
    c.moveTo(0, r * 0.9);
    c.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45);
    c.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9);
    c.closePath();
  }
  const INK = '#1d1d1f';
  function drawItem(c, it) {
    c.save();
    c.translate(it.x, it.y);
    c.rotate(it.rot || 0);
    const r = 40 * it.s;
    c.lineJoin = 'round';
    c.lineWidth = Math.max(2, 3 * it.s);
    c.strokeStyle = INK;
    c.fillStyle = it.color;
    if (it.type === 'heart') { heart(c, r); c.fill(); c.stroke(); }
    else if (it.type === 'star') { star(c, r, 5, 0.48); c.fill(); c.stroke(); }
    else if (it.type === 'sparkle') { star(c, r, 4, 0.22); c.fill(); c.stroke(); c.save(); c.translate(r * 0.9, -r * 0.8); star(c, r * 0.35, 4, 0.25); c.fill(); c.stroke(); c.restore(); }
    else if (it.type === 'crown') {
      c.beginPath();
      c.moveTo(-r, r * 0.5); c.lineTo(-r, -r * 0.4); c.lineTo(-r * 0.5, r * 0.05); c.lineTo(0, -r * 0.6); c.lineTo(r * 0.5, r * 0.05); c.lineTo(r, -r * 0.4); c.lineTo(r, r * 0.5); c.closePath();
      c.fill(); c.stroke();
      c.fillStyle = '#fff';
      for (const x of [-r, 0, r]) { c.beginPath(); c.arc(x, x === 0 ? -r * 0.6 : -r * 0.4, r * 0.13, 0, 7); c.fill(); c.stroke(); }
    } else if (it.type === 'ribbon') {
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-r * 0.6, -r * 0.8, -r * 1.3, -r * 0.4, -r * 1.1, r * 0.2); c.bezierCurveTo(-r * 0.9, r * 0.6, -r * 0.3, r * 0.3, 0, 0); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(r * 0.6, -r * 0.8, r * 1.3, -r * 0.4, r * 1.1, r * 0.2); c.bezierCurveTo(r * 0.9, r * 0.6, r * 0.3, r * 0.3, 0, 0); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-r * 0.1, r * 0.1); c.lineTo(-r * 0.5, r * 1.1); c.lineTo(-r * 0.2, r * 0.95); c.lineTo(0, r * 0.15); c.lineTo(r * 0.2, r * 0.95); c.lineTo(r * 0.5, r * 1.1); c.lineTo(r * 0.1, r * 0.1); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, 0, r * 0.22, 0, 7); c.fill(); c.stroke();
    } else if (it.type === 'bubble' || it.type === 'text') {
      const t = it.text || '';
      const fs = Math.round(34 * it.s);
      c.font = `800 ${fs}px -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const tw = Math.max(fs, c.measureText(t).width);
      if (it.type === 'bubble') {
        const w = tw + fs * 1.2, h = fs * 1.9;
        c.fillStyle = '#fff';
        c.beginPath();
        c.roundRect(-w / 2, -h / 2, w, h, h / 2);
        c.moveTo(-w * 0.15, h / 2 - 2); c.lineTo(-w * 0.3, h / 2 + fs * 0.6); c.lineTo(-w * 0.02, h / 2 - 2);
        c.fill(); c.stroke();
        c.fillStyle = it.color === '#ffffff' ? INK : it.color;
        c.fillText(t, 0, 2);
      } else {
        c.lineWidth = Math.max(4, fs * 0.22);
        c.strokeStyle = it.color === '#1d1d1f' ? '#fff' : INK;
        c.strokeText(t, 0, 0);
        c.fillStyle = it.color;
        c.fillText(t, 0, 0);
      }
    } else if (it.type === 'stamp') {
      c.globalAlpha = 0.88;
      c.strokeStyle = it.color === '#ffffff' ? '#d70015' : it.color;
      c.fillStyle = c.strokeStyle;
      c.lineWidth = 4 * it.s;
      c.beginPath(); c.arc(0, 0, r * 1.25, 0, 7); c.stroke();
      c.lineWidth = 2 * it.s;
      c.beginPath(); c.arc(0, 0, r * 1.05, 0, 7); c.stroke();
      c.font = `900 ${Math.round(r * 0.62)}px -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(dday == null ? 'D-DAY' : dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${-dday}`, 0, -r * 0.12);
      c.font = `800 ${Math.round(r * 0.3)}px -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
      c.fillText('전역까지', 0, r * 0.5);
    } else if (it.type === 'tape') {
      c.globalAlpha = 0.78;
      c.fillStyle = it.color;
      c.beginPath();
      const w = r * 3.2, h = r * 0.8;
      c.moveTo(-w / 2, -h / 2);
      for (let i = 0; i <= 8; i++) c.lineTo(-w / 2 + (w / 8) * i, -h / 2 + (i % 2 ? 3 : 0));
      c.lineTo(w / 2, h / 2);
      for (let i = 8; i >= 0; i--) c.lineTo(-w / 2 + (w / 8) * i, h / 2 - (i % 2 ? 3 : 0));
      c.closePath();
      c.fill();
      c.globalAlpha = 0.25;
      c.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) c.fillRect(-w / 2 + (w / 6) * i + 4, -h / 2, w / 18, h);
    }
    c.restore();
  }
  function bounds(it) {
    const r = 40 * it.s;
    if (it.type === 'tape') return r * 1.7;
    if (it.type === 'text' || it.type === 'bubble') return Math.max(r, (it.text || '').length * 17 * it.s + 20);
    if (it.type === 'stamp') return r * 1.3;
    return r * 1.2;
  }
  function draw(forExport) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    items.forEach((it) => drawItem(ctx, it));
    if (!forExport && items[sel]) {
      const it = items[sel], b = bounds(it);
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0a84ff';
      ctx.strokeRect(it.x - b, it.y - b, b * 2, b * 2);
      ctx.restore();
    }
  }
  function toCanvas(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  function hit(p) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i], b = bounds(it);
      if (Math.abs(p.x - it.x) < b && Math.abs(p.y - it.y) < b) return i;
    }
    return -1;
  }
  function add(type, text) {
    items.push({ type, text, x: W * (0.22 + Math.random() * 0.56), y: H * (0.15 + Math.random() * 0.7), s: type === 'tape' ? 1 : 1.1, rot: type === 'tape' ? -0.25 : (Math.random() - 0.5) * 0.4, color: type === 'stamp' ? '#d70015' : type === 'tape' ? '#ffd60a' : color });
    sel = items.length - 1;
    syncPanel();
    draw();
  }
  function syncPanel() {
    const it = items[sel];
    root.querySelector('#d-size').disabled = !it;
    root.querySelector('#d-rot').disabled = !it;
    root.querySelector('#d-del').disabled = !it;
    if (it) {
      root.querySelector('#d-size').value = it.s;
      root.querySelector('#d-rot').value = it.rot;
    }
    root.querySelectorAll('[data-col]').forEach((b) => b.setAttribute('aria-pressed', String((it ? it.color : color) === b.dataset.col)));
  }
  function close() { root.hidden = true; root.innerHTML = ''; img = null; }
  window.decoOpen = () => { if (root.hidden) return false; close(); return true; };
  window.openDeco = (src, days) => {
    dday = days;
    items = [];
    sel = -1;
    root.innerHTML = `<div class="deco-in">
      <div class="deco-stage"><canvas id="d-cv" width="${W}" height="${H}"></canvas></div>
      <div class="deco-side">
        <div class="sec-h">스티커</div>
        <div class="deco-grid">${STICKERS.map(([k, l]) => `<button class="btn" data-st="${k}">${l}</button>`).join('')}</div>
        <div class="sec-h">글씨</div>
        <div class="deco-row"><input type="text" id="d-text" maxlength="16" placeholder="글씨 입력"><button class="btn" id="d-add">추가</button></div>
        <label class="deco-chk"><input type="checkbox" id="d-bub"> 말풍선에 넣기</label>
        <div class="sec-h">색</div>
        <div class="deco-cols">${COLORS.map((c) => `<button data-col="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
        <div class="sec-h">선택한 것</div>
        <label class="deco-sl">크기<input type="range" id="d-size" min="0.4" max="3" step="0.05"></label>
        <label class="deco-sl">회전<input type="range" id="d-rot" min="-3.14" max="3.14" step="0.02"></label>
        <button class="btn" id="d-del">지우기</button>
        <div class="deco-foot">
          <button class="btn" id="d-close">닫기</button>
          <button class="btn" id="d-copy">복사</button>
          <button class="btn primary" id="d-save">저장</button>
        </div>
        <div class="deco-msg" id="d-msg"></div>
      </div>
    </div>`;
    root.hidden = false;
    cv = root.querySelector('#d-cv');
    ctx = cv.getContext('2d');
    img = new Image();
    img.onload = () => { W = 550; H = Math.round((550 * img.naturalHeight) / img.naturalWidth) || 850; cv.width = W; cv.height = H; draw(); };
    img.src = src;
    root.querySelectorAll('[data-st]').forEach((b) => (b.onclick = () => add(b.dataset.st, b.dataset.st === 'bubble' ? '전역까지 버텨' : undefined)));
    const addText = () => {
      const t = root.querySelector('#d-text').value.trim();
      if (!t) return;
      add(root.querySelector('#d-bub').checked ? 'bubble' : 'text', t);
      root.querySelector('#d-text').value = '';
    };
    root.querySelector('#d-add').onclick = addText;
    root.querySelector('#d-text').onkeydown = (e) => { if (e.key === 'Enter') addText(); };
    root.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => {
      color = b.dataset.col;
      if (items[sel]) items[sel].color = color;
      syncPanel();
      draw();
    }));
    root.querySelector('#d-size').oninput = (e) => { if (items[sel]) { items[sel].s = Number(e.target.value); draw(); } };
    root.querySelector('#d-rot').oninput = (e) => { if (items[sel]) { items[sel].rot = Number(e.target.value); draw(); } };
    root.querySelector('#d-del').onclick = () => { if (items[sel]) { items.splice(sel, 1); sel = -1; syncPanel(); draw(); } };
    root.querySelector('#d-close').onclick = close;
    const out = () => { draw(true); const u = cv.toDataURL('image/png'); draw(); return u; };
    const msg = (t) => { const m = root.querySelector('#d-msg'); m.textContent = t; setTimeout(() => { if (m.textContent === t) m.textContent = ''; }, 2500); };
    root.querySelector('#d-save').onclick = async () => { const f = await window.api.settingsDo('saveCard', out()); msg(f ? '다운로드 폴더의 전역까지 꾸민 카드에 저장됨' : '저장 실패'); };
    root.querySelector('#d-copy').onclick = async () => { const ok = await window.api.settingsDo('copyCard', out()); msg(ok ? '복사됨' : '복사 실패'); };
    cv.onpointerdown = (e) => {
      const p = toCanvas(e);
      sel = hit(p);
      if (sel >= 0) {
        const it = items.splice(sel, 1)[0];
        items.push(it);
        sel = items.length - 1;
        drag = { dx: p.x - it.x, dy: p.y - it.y };
        cv.setPointerCapture(e.pointerId);
      }
      syncPanel();
      draw();
    };
    cv.onpointermove = (e) => {
      if (!drag || !items[sel]) return;
      const p = toCanvas(e);
      items[sel].x = p.x - drag.dx;
      items[sel].y = p.y - drag.dy;
      draw();
    };
    cv.onpointerup = () => { drag = null; };
    cv.onwheel = (e) => {
      if (!items[sel]) return;
      e.preventDefault();
      items[sel].s = Math.min(3, Math.max(0.4, items[sel].s * (e.deltaY < 0 ? 1.06 : 0.94)));
      syncPanel();
      draw();
    };
    syncPanel();
  };
})();
