(function () {
  const SMIN = Math.log(0.25), SMAX = Math.log(6);
  window.mountFaceEditor = function (root, o) {
    root.innerHTML = `
      <div class="fe">
        <div class="fe-head">${o.name} 얼굴</div>
        <div class="fe-stage"></div>
        <label class="fe-row"><span>크기</span><input class="fe-s" type="range" min="${SMIN}" max="${SMAX}" step="0.01"></label>
        <label class="fe-row"><span>회전</span><input class="fe-r" type="range" min="-40" max="40" step="0.5"></label>
        <div class="fe-btns">
          <button class="fe-auto" type="button">자동 맞춤</button>
          <button class="fe-pick" type="button">다른 사진</button>
          <span class="fe-sp"></span>
          <button class="fe-cancel" type="button">취소</button>
          <button class="fe-save" type="button">저장</button>
        </div>
      </div>`;
    const $ = (s) => root.querySelector(s);
    const stageEl = $('.fe-stage');
    const sIn = $('.fe-s'), rIn = $('.fe-r');
    const rig = new CharRig(o.slot, { ghost: true });
    stageEl.appendChild(rig.svg);
    rig.pose({});
    let pr = null;
    let drag = null;

    const NS = 'http://www.w3.org/2000/svg';
    const hg = document.createElementNS(NS, 'g');
    rig.svg.appendChild(hg);
    let hDrag = null;
    const drawHandles = () => {
      hg.innerHTML = '';
      if (pr && pr.cut) return;
      (rig.contourUnits || []).forEach(([X, Y], i) => {
        const hit = document.createElementNS(NS, 'circle');
        hit.setAttribute('cx', X); hit.setAttribute('cy', Y); hit.setAttribute('r', 4.2);
        hit.setAttribute('fill', 'transparent');
        hit.setAttribute('class', 'fe-hit');
        hit.dataset.i = i;
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', X); dot.setAttribute('cy', Y); dot.setAttribute('r', 1.9);
        dot.setAttribute('fill', '#fff'); dot.setAttribute('stroke', '#2b2a24'); dot.setAttribute('stroke-width', '0.7');
        dot.setAttribute('pointer-events', 'none');
        hg.append(hit, dot);
      });
    };
    const render = () => { rig.place(pr); if (!pr.cut) pr.pts = rig.params.pts; drawHandles(); };
    const sync = () => {
      render();
      sIn.value = Math.log(pr.s);
      rIn.value = pr.r;
    };
    hg.addEventListener('pointerdown', (e) => {
      const i = e.target.dataset && e.target.dataset.i;
      if (i == null) return;
      e.stopPropagation();
      hg.setPointerCapture(e.pointerId);
      hDrag = Number(i);
    });
    hg.addEventListener('pointermove', (e) => {
      if (hDrag == null) return;
      const m = rig.svg.getScreenCTM().inverse();
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
      pr.pts = pr.pts.slice();
      pr.pts[hDrag] = rig.imgFromUnit(p.x, p.y);
      render();
    });
    const hEnd = () => { hDrag = null; };
    hg.addEventListener('pointerup', hEnd);
    hg.addEventListener('pointercancel', hEnd);
    const zoom = (f) => {
      const ns = Math.min(Math.exp(SMAX), Math.max(Math.exp(SMIN), pr.s * f));
      const k = ns / pr.s;
      pr.x *= k;
      pr.y *= k;
      pr.s = ns;
      sync();
    };

    let cutUrl = null;
    const statusEl = document.createElement('div');
    statusEl.className = 'fe-status';
    stageEl.appendChild(statusEl);
    (async () => {
      let img = await rig.setPhoto(o.url);
      if (o.params) {
        pr = { ...o.params };
      } else if (window.Cutout && Cutout.available()) {
        statusEl.textContent = '배경 지우는 중';
        try {
          const r = await Cutout.run(img);
          cutUrl = r.url;
          img = await rig.setPhoto(cutUrl);
          pr = r.params;
          statusEl.textContent = '';
        } catch (e) {
          statusEl.textContent = '사람을 찾지 못해서 윤곽으로 맞췄어요';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
          pr = await CharFit(img);
        }
      } else {
        pr = await CharFit(img);
      }
      sync();
    })();

    stageEl.addEventListener('pointerdown', (e) => {
      if (!pr) return;
      stageEl.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, px: pr.x, py: pr.y };
      stageEl.classList.add('grabbing');
    });
    stageEl.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const u = 100 / rig.svg.getBoundingClientRect().width;
      pr.x = drag.px + (e.clientX - drag.x) * u;
      pr.y = drag.py + (e.clientY - drag.y) * u;
      render();
    });
    const end = () => { drag = null; stageEl.classList.remove('grabbing'); };
    stageEl.addEventListener('pointerup', end);
    stageEl.addEventListener('pointercancel', end);
    stageEl.addEventListener('wheel', (e) => {
      if (!pr) return;
      e.preventDefault();
      zoom(Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    sIn.addEventListener('input', () => pr && zoom(Math.exp(Number(sIn.value)) / pr.s));
    rIn.addEventListener('input', () => { if (!pr) return; pr.r = Number(rIn.value); render(); });
    $('.fe-auto').addEventListener('click', async () => { if (!rig.photoImg) return; pr = pr && pr.cut ? Cutout.fitFromImage(rig.photoImg) : await CharFit(rig.photoImg); sync(); });
    $('.fe-pick').addEventListener('click', () => o.onRepick());
    $('.fe-cancel').addEventListener('click', () => o.onCancel());
    $('.fe-save').addEventListener('click', () => { if (pr) o.onSave({ ...pr, pts: pr.pts ? pr.pts.map((p) => [Number(p[0].toFixed(4)), Number(p[1].toFixed(4))]) : null }, cutUrl); });
  };
})();
