(function () {
  const qs = new URLSearchParams(location.search);
  if (qs.get('vibrancy') === '1') document.documentElement.classList.add('vibrant');
  const TABS = [
    ['general', '일반', '#8e8e93', '⚙︎'],
    ['character', '캐릭터', '#ff9f0a', '얼'],
    ['actions', '동작', '#ff375f', '▶︎'],
    ['capture', '캡쳐', '#5e5ce6', '◎'],
    ['frame', '포토이즘 프레임', '#30b0c7', '▦'],
    ['cards', '포토카드 도감', '#ff6fb5', '♥︎'],
    ['update', '업데이트', '#34c759', '↻'],
  ];
  const SWATCH = { white: '#fffaf2', black: '#151517', pink: '#ffd3e3', mint: '#c9f1df', film: '#3a3a3a', army: '#5f6b3a' };
  const RANK = { N: 0, R: 1, SR: 2, SSR: 3 };
  let tab = qs.get('tab') || 'general';
  let D = null;
  let cards = null;
  let cardFilter = 'all';
  let cutN = null;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const api = window.api;

  function nav() {
    $('nav').innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}" aria-current="${k === tab}">${l}</button>`).join('');
    $('nav').querySelectorAll('button').forEach((b) => (b.onclick = () => go(b.dataset.tab)));
  }
  function go(t) {
    tab = t;
    nav();
    render();
  }
  const sw = (key, on) => `<label class="sw"><input type="checkbox" data-sw="${key}" ${on ? 'checked' : ''}><span></span></label>`;
  const seg = (key, opts, cur) => `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" aria-pressed="${v === cur}">${l}</button>`).join('')}</div>`;
  const row = (label, right) => `<div class="row"><div class="lb">${label}</div>${right}</div>`;
  const btn = (cmd, label, arg, cls) => `<button class="btn ${cls || ''}" data-do="${cmd}" ${arg != null ? `data-arg="${esc(arg)}"` : ''}>${label}</button>`;

  function dateLabel(iso) {
    if (!iso) return '미설정';
    const [y, m, d] = iso.split('-');
    return `${y}년 ${Number(m)}월 ${Number(d)}일`;
  }

  const views = {
    general() {
      const c = D.cfg;
      const dl = D.days == null ? '' : D.days > 0 ? `D-${D.days}` : D.days === 0 ? 'D-DAY' : `D+${-D.days}`;
      return `<div class="sec-h">캐릭터</div><div class="group">
        ${row('캐릭터 켜기', sw('enabled', c.enabled !== false))}
        ${row('움직임', seg('mode', [['walk', '걷기'], ['fairy', '요정']], c.mode === 'fairy' ? 'fairy' : 'walk'))}
        ${row('로그인 시 자동 실행', sw('login', D.login))}
      </div>
      <div class="sec-h">전역일</div><div class="group">
        ${row(`${dateLabel(c.discharge)} <span class="val">${dl}</span>`, btn('setup', '변경'))}
      </div>
      <div class="sec-h">효과</div><div class="group">
        ${row('효과음', sw('sound', c.sound !== false))}
        ${row('알림 배너', sw('banners', c.banners !== false))}
        ${row('알림 배너 빈도', seg('bannerFreq', [['low', '적게'], ['normal', '보통'], ['high', '자주']], c.bannerFreq || 'normal'))}
        ${row('알림 배너 지금 보기', btn('banner', '보기'))}
        ${row('남은 것 영수증', btn('action', '보기', 'receipt'))}
      </div>
      <div class="sec-h">D-day 기념 연출</div><div class="group">
        ${row(`<select id="ms">${D.milestones.map((m) => `<option value="${m}">${m === 0 ? 'D-DAY' : 'D-' + m}</option>`).join('')}</select>`, `<button class="btn" id="ms-go">미리보기</button>`)}
      </div>`;
    },
    character() {
      const c = D.cfg;
      const o = c.outfits || {};
      const opts = (s) => Object.entries(D.outfits).map(([k, v]) => `<option value="${k}" ${(o[s] || 'military') === k ? 'selected' : ''}>${esc(v)}</option>`).join('');
      return ['a', 'b'].map((s) => `<div class="sec-h">${esc(D.slots[s])}</div><div class="group">
        ${row('옷', `<select data-outfit="${s}">${opts(s)}</select>`)}
        ${row(`<span style="display:flex;align-items:center;gap:10px"><img class="thumb" data-face="${s}" alt="">얼굴</span>`, `<div class="btns">${btn('pickFace', '사진 고르기', s)}${btn('adjustFace', '위치 맞추기', s)}</div>`)}
      </div>`).join('') + `<div class="group" style="margin-top:14px">${row('두 캐릭터 원래 얼굴로', btn('resetFace', '되돌리기'))}</div>`;
    },
    actions() {
      const g = (list) => `<div class="group"><div class="grid">${list.map(([l, k]) => btn('action', esc(l), k)).join('')}</div></div>`;
      return `<div class="sec-h">동작</div>${g(D.actions)}<div class="sec-h">춤</div>${g(D.dances)}`;
    },
    capture() {
      const cur = D.cfg.capture || 'normal';
      const r = (v, l) => `<div class="row radio" role="radio" data-capture="${v}" aria-checked="${cur === v}"><i></i><div class="lb">${l}</div></div>`;
      return `<div class="sec-h">캡쳐 모드</div><div class="group">${r('normal', '일반 모드')}${r('work', '업무 모드')}${r('photo', '포토이즘 모드')}</div>
      ${D.shortcutState === 0 && cur === 'work' ? '<div class="note">스크린샷 단축키를 가져오지 못함. 시스템 설정의 스크린샷 단축키를 끄면 동작</div>' : ''}
      <div class="sec-h">캡쳐</div><div class="group">
        ${row('캐릭터 빼고 지금 캡쳐', btn('capture', '캡쳐'))}
        ${row('네컷 완성 후 공유 창 띄우기', sw('shareWindow', D.cfg.shareWindow !== false))}
      </div>`;
    },
    frame() {
      const c = D.cfg;
      const lay = c.frameLayout || 'single';
      const curN = cutN || (lay === 'single' ? 1 : lay === 'two' ? 2 : /^c1-/.test(lay) ? 1 : /^c2-/.test(lay) ? 2 : 4);
      cutN = curN;
      const keyFor = (k) => (k === 'basic' ? (curN === 1 ? 'single' : curN === 2 ? 'two' : null) : curN === 4 ? D.fourOf[k] : `c${curN}-${k}`);
      let items = D.cutStyles.map(([k, v]) => [keyFor(k), k === 'basic' ? '기본 색' : v]).filter(([k]) => k);
      if (curN === 4) items = [['strip', '기본 색 세로'], ['grid', '기본 색 2x2'], ...items];
      const r = ([k, l]) => `<div class="radio" role="radio" data-layout="${k}" aria-checked="${lay === k}"><i></i><span>${esc(l)}</span></div>`;
      return `<div class="sec-h">기본 색</div><div class="group">${row('색', `<div class="swatches">${Object.entries(D.frameStyles).map(([k, v]) => `<button title="${esc(v)}" aria-label="${esc(v)}" data-fstyle="${k}" style="background:${SWATCH[k]}" aria-pressed="${(c.frameStyle || 'white') === k}"></button>`).join('')}</div>`)}
        ${row('내 프레임 이미지', `<div class="btns">${c.frameFile ? `<button class="btn" data-fstyle="custom" aria-pressed="${c.frameStyle === 'custom'}">${c.frameStyle === 'custom' ? '사용 중' : '사용'}</button>` : ''}${btn('pickFrame', '고르기')}</div>`)}
      </div>
      <div class="sec-h">컷</div><div class="group">
        ${row('컷 수', `<div class="seg" id="cutn">${[1, 2, 4].map((n) => `<button data-n="${n}" aria-pressed="${n === curN}">${n === 1 ? '한 컷' : n === 2 ? '두 컷' : '네 컷'}</button>`).join('')}</div>`)}
        <div class="styles">${items.map(r).join('')}</div>
      </div>
      <div class="sec-h">기타</div><div class="group">
        ${row('화면에도 프레임 표시', sw('frameOnScreen', !!c.frameOnScreen))}
        ${row(`모은 사진 ${D.queue}장`, btn('resetQueue', '버리기'))}
      </div>`;
    },
    cards() {
      if (!cards) return '<div class="note">불러오는 중</div>';
      const got = cards.filter((c) => c.n);
      const best = (r) => got.filter((c) => c.best === r).length;
      const total = got.reduce((a, c) => a + c.n, 0);
      const list = cards.filter((c) => (cardFilter === 'got' ? c.n : cardFilter === 'miss' ? !c.n : true));
      const pct = cards.length ? Math.round((got.length / cards.length) * 100) : 0;
      return `<div class="cards-top"><div class="stat"><b>${got.length}</b><span>/ ${cards.length}장, 뽑은 횟수 ${total}번, SSR ${best('SSR')}, SR ${best('SR')}</span><div class="bar"><i style="width:${pct}%"></i></div></div>
        ${seg('cardFilter', [['all', '전체'], ['got', '모음'], ['miss', '못 모음']], cardFilter)}${btn('addCards', '사진 추가')}${btn('action', '빵 뜯기', 'bread', 'primary')}</div>
        <div class="album">${list.map((c) => (c.n
          ? `<div class="pc" data-big="${c.id}"><img src="${c.url}" alt=""><span class="rk ${c.best}">${c.best}</span>${c.n > 1 ? `<span class="cnt">×${c.n}</span>` : ''}</div>`
          : '<div class="pc locked"><span>?</span></div>')).join('')}</div>`;
    },
    update() {
      const u = D.update;
      const st = u.busy ? '받는 중' : u.checking ? '확인 중' : u.latest ? `새 버전 ${u.latest}` : '최신 버전';
      return `<div class="sec-h">버전</div><div class="group">
        ${row(`설치된 버전 <span class="val">${esc(D.version)}</span>`, `<span class="val">${st}</span>`)}
        ${row('업데이트', u.latest ? btn('installUpdate', `${esc(u.latest)} 설치`, null, 'primary') : btn('checkUpdate', '확인'))}
        ${row('업데이트 내역', btn('changelog', '보기'))}
      </div>
      <div class="sec-h">문제 보내기</div><div class="group">
        ${row('버전, 설정, 오류 기록 복사', `<button class="btn" id="diag">복사</button>`)}
        ${row('기록 폴더', btn('logs', 'Finder에서 열기'))}
      </div>`;
    },
  };

  async function render() {
    $('title').textContent = TABS.find((t) => t[0] === tab)[1];
    if (tab === 'cards' && !cards) cards = await api.cardCollection();
    const body = $('body');
    const keep = body.scrollTop;
    body.innerHTML = views[tab]();
    body.scrollTop = keep;
    bind(body);
  }

  function bind(root) {
    root.querySelectorAll('[data-sw]').forEach((el) => (el.onchange = () => {
      const k = el.dataset.sw;
      if (k === 'login') api.settingsDo('login', el.checked);
      else api.settingsPatch({ [k]: el.checked });
    }));
    root.querySelectorAll('[data-seg]').forEach((g) => g.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      const k = g.dataset.seg;
      if (k === 'cardFilter') { cardFilter = b.dataset.v; render(); return; }
      api.settingsPatch({ [k]: b.dataset.v });
    })));
    root.querySelectorAll('[data-do]').forEach((b) => (b.onclick = () => api.settingsDo(b.dataset.do, b.dataset.arg)));
    root.querySelectorAll('[data-outfit]').forEach((s) => (s.onchange = () => api.settingsPatch({ outfits: { ...(D.cfg.outfits || {}), [s.dataset.outfit]: s.value } })));
    root.querySelectorAll('[data-face]').forEach(async (img) => {
      const u = await api.settingsDo('faceThumb', img.dataset.face);
      if (u && u !== true) img.src = u;
    });
    root.querySelectorAll('[data-capture]').forEach((r) => (r.onclick = () => api.settingsPatch({ capture: r.dataset.capture })));
    root.querySelectorAll('[data-fstyle]').forEach((b) => (b.onclick = () => api.settingsPatch({ frameStyle: b.dataset.fstyle, capture: 'photo' })));
    root.querySelectorAll('[data-layout]').forEach((r) => (r.onclick = () => { api.settingsDo('resetQueue'); api.settingsPatch({ frameLayout: r.dataset.layout, capture: 'photo' }); }));
    const cn = root.querySelector('#cutn');
    if (cn) cn.querySelectorAll('button').forEach((b) => (b.onclick = () => { cutN = Number(b.dataset.n); render(); }));
    const ms = root.querySelector('#ms-go');
    if (ms) ms.onclick = () => api.settingsDo('milestone', Number(root.querySelector('#ms').value));
    const dg = root.querySelector('#diag');
    if (dg) dg.onclick = async () => { await api.settingsDo('diag'); dg.textContent = '복사됨'; setTimeout(() => (dg.textContent = '복사'), 1600); };
    root.querySelectorAll('[data-big]').forEach((p) => (p.onclick = () => {
      $('lb-img').src = p.querySelector('img').src;
      $('lb').hidden = false;
    }));
  }
  $('lb').onclick = () => ($('lb').hidden = true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!$('lb').hidden) $('lb').hidden = true; else window.close(); }
  });

  async function load() {
    D = await api.settingsData();
    if (tab === 'cards') cards = await api.cardCollection();
    render();
  }
  api.on('settings-refresh', () => { cards = null; load(); });
  api.on('settings-tab', (t) => go(t));
  nav();
  load();
})();
