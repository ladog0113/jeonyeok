(function () {
  let segPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.SelfieSegmentation) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('script load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  function getSeg() {
    if (segPromise) return segPromise;
    segPromise = (async () => {
      const base = window.CUTOUT_BASE;
      const b64 = window.CUTOUT_B64 || {};
      const bufs = {};
      for (const [name, file] of Object.entries(b64)) {
        const txt = await (await fetch(base + file)).text();
        const bin = atob(txt.trim());
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        bufs[name] = arr.buffer;
      }
      if (Object.keys(bufs).length && !window.__cutoutFetchWrapped) {
        window.__cutoutFetchWrapped = true;
        const orig = window.fetch.bind(window);
        window.fetch = (input, init) => {
          const url = typeof input === 'string' ? input : input && input.url;
          if (url) {
            for (const name of Object.keys(bufs)) {
              if (url.endsWith(name)) return Promise.resolve(new Response(bufs[name].slice(0), { status: 200 }));
            }
          }
          return orig(input, init);
        };
      }
      await loadScript(base + 'selfie_segmentation.js');
      const map = window.CUTOUT_MAP || {};
      const seg = new window.SelfieSegmentation({ locateFile: (f) => base + (map[f] || f) });
      seg.setOptions({ modelSelection: 0 });
      let pending = null;
      seg.onResults((r) => {
        if (pending) {
          const p = pending;
          pending = null;
          p(r);
        }
      });
      await seg.initialize();
      return {
        run: (img) => new Promise((res) => {
          pending = res;
          seg.send({ image: img });
        }),
      };
    })();
    segPromise.catch(() => { segPromise = null; });
    return segPromise;
  }

  function maskValues(mask, w, h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(mask, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let maxR = 0, maxA = 0, minA = 255;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > maxR) maxR = d[i];
      if (d[i + 3] > maxA) maxA = d[i + 3];
      if (d[i + 3] < minA) minA = d[i + 3];
    }
    const useAlpha = maxA - minA > maxR;
    const m = new Float32Array(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) m[j] = (useAlpha ? d[i + 3] : d[i]) / 255;
    return m;
  }

  function headRegion(m, w, h) {
    const rows = [];
    for (let y = 0; y < h; y++) {
      let l = -1, r = -1, sum = 0, n = 0;
      for (let x = 0; x < w; x++) {
        if (m[y * w + x] > 0.5) {
          if (l < 0) l = x;
          r = x;
          sum += x;
          n++;
        }
      }
      rows.push(n > 2 ? { l, r, w: r - l, cx: sum / n, n } : null);
    }
    let top = rows.findIndex((r) => r && r.w > w * 0.04);
    if (top < 0) return null;
    let maxW = 0, maxY = top, neck = -1;
    for (let y = top; y < h; y++) {
      const r = rows[y];
      if (!r) continue;
      if (y - top < (maxW || w * 0.1) * 1.4) {
        if (r.w > maxW) { maxW = r.w; maxY = y; }
        continue;
      }
      if (r.w > maxW * 1.45) { neck = y; break; }
    }
    if (neck < 0) neck = Math.min(h - 1, Math.round(top + maxW * 1.35));
    let minW = Infinity, chin = neck;
    for (let y = maxY; y < neck; y++) {
      const r = rows[y];
      if (r && r.w < minW) { minW = r.w; chin = y; }
    }
    const cut = Math.max(maxY + maxW * 0.45, chin - maxW * 0.05);
    let sx = 0, sn = 0, l = w, rr = 0;
    for (let y = top; y < cut; y++) {
      const r = rows[y];
      if (!r) continue;
      sx += r.cx; sn++;
      l = Math.min(l, r.l);
      rr = Math.max(rr, r.r);
    }
    return { top, cut: Math.round(cut), cx: sx / Math.max(1, sn), l, r: rr, headW: maxW };
  }

  async function cutoutHead(img) {
    const seg = await getSeg();
    const w = img.naturalWidth, h = img.naturalHeight;
    const res = await seg.run(img);
    const m = maskValues(res.segmentationMask, w, h);
    const hr = headRegion(m, w, h);
    if (!hr || hr.headW < w * 0.05) throw new Error('no person found');
    const pad = Math.round(hr.headW * 0.06);
    const x0 = Math.max(0, hr.l - pad), x1 = Math.min(w, hr.r + pad);
    const y0 = Math.max(0, hr.top - pad), y1 = Math.min(h, hr.cut + 2);
    const cw = x1 - x0, ch = y1 - y0;
    const src = document.createElement('canvas');
    src.width = w;
    src.height = h;
    const sctx = src.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(img, 0, 0);
    const pix = sctx.getImageData(x0, y0, cw, ch);
    const fade = Math.max(3, hr.headW * 0.07);
    for (let y = 0; y < ch; y++) {
      const gy = y + y0;
      const below = gy - (hr.cut - fade);
      const fy = below > 0 ? Math.max(0, 1 - below / fade) : 1;
      for (let x = 0; x < cw; x++) {
        const gx = x + x0;
        const v = m[gy * w + gx];
        const a = Math.max(0, Math.min(1, (v - 0.35) / 0.3)) * fy;
        pix.data[(y * cw + x) * 4 + 3] = Math.round(a * 255);
      }
    }
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d').putImageData(pix, 0, 0);
    return {
      url: out.toDataURL('image/png'),
      width: cw,
      height: ch,
      headW: hr.headW,
      cx: hr.cx - x0,
    };
  }

  function fitCut(cut) {
    const FACE_W = 40.4, FACE_H = 42.8;
    const kc = Math.max(FACE_W / cut.width, FACE_H / cut.height);
    const k = Math.min(50 / cut.height, 48 / cut.width, 40 / cut.headW);
    const s = k / kc;
    const icx = 50 + (cut.width / 2 - cut.cx) * k;
    const topY = 64 - cut.height * k;
    const icy = topY + (cut.height * k) / 2;
    return { x: icx - 50, y: icy - 44.5, s, r: 0, cut: true };
  }

  window.Cutout = {
    available: () => !!window.CUTOUT_BASE,
    async run(img) {
      const cut = await cutoutHead(img);
      return { url: cut.url, params: fitCut(cut) };
    },
    fitFromImage(img) {
      return fitCut({ width: img.naturalWidth, height: img.naturalHeight, headW: img.naturalWidth * 0.88, cx: img.naturalWidth / 2 });
    },
  };
})();
