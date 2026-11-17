// 오늘의 아크릴, 키우기, 마우스 장난, 날씨와 계절
(function () {
  const api = window.petEnv || {};
  const now = () => performance.now();

  /* ---------- 오늘의 아크릴 ---------- */
  function seeded(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  }
  const MOOD = [
    ['맑음', '결재 올리기 좋은 날. 오전 중에 처리 권장'],
    ['구름 조금', '대체로 무난. 점심 전 질문은 피할 것'],
    ['흐림', '말수 적음. 보고는 짧게, 결론부터'],
    ['소나기', '갑작스러운 호출 가능. 메신저 알림 켜 둘 것'],
    ['천둥번개', '회의실 근처 접근 주의. 조용히 일하는 척'],
    ['짙은 안개', '무슨 생각인지 알 수 없음. 눈치 레벨 최대'],
    ['폭염', '일정 압박 강함. 마감 날짜부터 다시 확인'],
    ['한파', '칭찬 기대 금지. 실수만 안 하면 성공'],
    ['무지개', '드물게 기분 최고. 연차 얘기 꺼낼 타이밍'],
  ];
  const MEETING = ['회의 0건. 몰입 가능', '회의 1건. 무난', '회의 2건. 오후 집중 어려움', '회의 연속. 체력 안배 필요', '갑자기 잡히는 회의 1건 예상'];
  const LUNCH = ['국밥', '돈까스', '제육볶음', '김치찌개', '쌀국수', '마라탕', '샐러드', '편의점 도시락', '냉면', '초밥', '햄버거', '짜장면'];
  const TODO = ['메일함 정리', '파일 이름 정리', '책상 정리', '물 2L 마시기', '스트레칭 3번', '오후 3시 간식', '일정표 내일 것까지 확인'];
  function showAcryl(weather) {
    const n = new Date();
    const key = n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate();
    const R = seeded(key * 31 + 7);
    const mood = MOOD[Math.floor(R() * MOOD.length)];
    const meet = MEETING[Math.floor(R() * MEETING.length)];
    const lunch = LUNCH[Math.floor(R() * LUNCH.length)];
    const todo = TODO[Math.floor(R() * TODO.length)];
    const ontime = Math.floor(R() * 70) + 25;
    const s = stats();
    document.querySelectorAll('.acryl').forEach((e) => e.remove());
    const d = document.createElement('div');
    d.className = 'acryl';
    const wd = ['일', '월', '화', '수', '목', '금', '토'][n.getDay()];
    const wtxt = weather ? `${weather.city} ${weather.temp}도 ${({ clear: '맑음', cloud: '흐림', rain: '비', snow: '눈', thunder: '뇌우', fog: '안개' })[weather.kind] || ''}` : '';
    const dl = s.d > 0 ? `D-${s.d}` : s.d === 0 ? 'D-DAY' : `D+${-s.d}`;
    d.innerHTML = `<div class="ac-top"><div class="ac-k">오늘의 아크릴</div><div class="ac-date">${n.getMonth() + 1}월 ${n.getDate()}일 ${wd}요일${wtxt ? `, ${wtxt}` : ''}</div></div>
      <div class="ac-main"><div class="ac-l">상사 기분</div><div class="ac-big">${mood[0]}</div><div class="ac-desc">${mood[1]}</div></div>
      <div class="ac-grid">
        <div><span>회의 예보</span><b>${meet}</b></div>
        <div><span>정시 퇴근 가능성</span><b>${ontime}%</b></div>
        <div><span>점심 추천</span><b>${lunch}</b></div>
        <div><span>오늘 할 일</span><b>${todo}</b></div>
        <div><span>다음 월급</span><b>${s.payDate} (${s.payText})</b></div>
        <div><span>전역까지</span><b>${dl}</b></div>
      </div>`;
    stage.appendChild(d);
    requestAnimationFrame(() => d.classList.add('in'));
    SFX.play('ding');
    const p = list()[0];
    if (p) p.say(`오늘 상사 기분 ${mood[0]}`, 3000);
    setTimeout(() => d.classList.add('out'), 12000);
    setTimeout(() => d.remove(), 12800);
  }

  /* ---------- 키우기 ---------- */
  const care = {};
  const FOOD_DECAY = 100 / (24 * 60);
  const MOOD_DECAY = 100 / (10 * 60);
  function decay(v) {
    const mins = (Date.now() - (v.t || Date.now())) / 60000;
    return { food: Math.max(0, (v.food ?? 80) - mins * FOOD_DECAY), mood: Math.max(0, (v.mood ?? 80) - mins * MOOD_DECAY), t: Date.now() };
  }
  async function loadCare() {
    let all = {};
    try { all = (api.careGet ? await api.careGet() : JSON.parse(localStorage.getItem('jy-care') || '{}')) || {}; } catch {}
    for (const p of list()) care[p.slot] = decay(all[p.slot] || {});
  }
  function saveCare(slot) {
    const v = care[slot];
    if (!v) return;
    v.t = Date.now();
    if (api.careSet) api.careSet(slot, v);
    else try { const all = JSON.parse(localStorage.getItem('jy-care') || '{}'); all[slot] = v; localStorage.setItem('jy-care', JSON.stringify(all)); } catch {}
  }
  function bump(p, food, mood) {
    const v = care[p.slot] || (care[p.slot] = decay({}));
    v.food = Math.min(100, v.food + food);
    v.mood = Math.min(100, v.mood + mood);
    if (p.sulk && v.mood >= 35) { p.sulk = false; p.say(pick(['풀렸다', '이번만 봐줌', '헤헤']), 1800); }
    saveCare(p.slot);
  }
  function hearts(p, n) {
    for (let i = 0; i < n; i++) setTimeout(() => makeHeart(p.x + PW / 2 + rand(-24, 24), p.y + rand(0, 20)), i * 120);
  }
  function feed(p) {
    if (!p || p.morphed) return;
    if (p.busy()) p.state = 'idle';
    const f = document.createElement('div');
    f.className = 'food';
    f.innerHTML = '<div class="bun-t"></div><div class="lettuce"></div><div class="patty"></div><div class="bun-b"></div>';
    const fx = p.x + PW / 2;
    f.style.left = fx - 22 + 'px';
    f.style.top = '-60px';
    stage.appendChild(f);
    p.say(pick(['밥이다', '군대리아다', '냠']), 1400);
    requestAnimationFrame(() => { f.style.transition = 'top .9s cubic-bezier(.4,0,.8,1)'; f.style.top = p.y - 10 + 'px'; });
    setTimeout(() => {
      SFX.play('pop');
      let bites = 0;
      const it = setInterval(() => {
        bites++;
        f.style.clipPath = `inset(0 ${bites * 22}% 0 0 round 6px)`;
        makeBlast(p.x + PW / 2 + 40, p.y - 10, pick(['냠', '쩝', '냠냠']), 'bubble', 0.18);
        SFX.play('tick');
        if (bites >= 4) {
          clearInterval(it);
          f.remove();
          bump(p, 45, 12);
          p.say(pick(['배부르다', '잘 먹었다', '전역할 때까지 먹을 거임']), 2000);
          hearts(p, 3);
        }
      }, 380);
    }, 950);
  }
  function petpet(p) {
    if (!p) return;
    hearts(p, 6);
    SFX.play('sparkle');
    bump(p, 0, 18);
    p.say(pick(['헤헤', '더 해줘', '좋다', '기분 좋아짐']), 1600);
  }
  const rub = { slot: null, dirs: [], lastX: 0, lastDir: 0, at: 0, cool: 0 };
  function watchRub() {
    const t = now();
    const p = list().find((q) => mouse.x > q.x - 4 && mouse.x < q.x + PW + 4 && mouse.y > q.y - 4 && mouse.y < q.y + PH + 4);
    if (!p || t < rub.cool) { rub.dirs = []; return; }
    if (rub.slot !== p.slot) { rub.slot = p.slot; rub.dirs = []; rub.lastX = mouse.x; }
    const dx = mouse.x - rub.lastX;
    if (Math.abs(dx) > 6) {
      const dir = Math.sign(dx);
      if (dir !== rub.lastDir) rub.dirs.push(t);
      rub.lastDir = dir;
      rub.lastX = mouse.x;
    }
    rub.dirs = rub.dirs.filter((x) => t - x < 1600);
    if (rub.dirs.length >= 5) { rub.dirs = []; rub.cool = t + 3000; petpet(p); }
  }
  let careTick = 0;
  function careLoop() {
    for (const p of list()) {
      const v = care[p.slot];
      if (!v) continue;
      const nv = decay(v);
      v.food = nv.food;
      v.mood = nv.mood;
      v.t = nv.t;
      if (!p.sulk && v.mood < 20 && !p.busy()) { p.sulk = true; p.say(pick(['흥', '관심 좀 줘', '삐졌음']), 2400); }
      if (p.sulk && !p.morphed && p.state === 'idle') {
        p.state = 'rest';
        p.actT = 0;
        p.actDur = 7;
        if (Math.random() < 0.35) p.say(pick(['흥', '말 걸지 마', '쓰다듬어 주면 풀림']), 2000);
      }
      if (v.food < 25 && Math.random() < 0.04 && !p.busy()) p.say(pick(['배고파', '밥 줘', '군대리아 먹고 싶다']), 2000);
      if (!p.baseSpeed) p.baseSpeed = p.maxSpeed;
      if (!p.fast) p.maxSpeed = p.baseSpeed * (v.food < 10 ? 0.6 : 1);
    }
    if (++careTick % 60 === 0) for (const p of list()) saveCare(p.slot);
  }
  const origBusy = Pet.prototype.busy;
  Pet.prototype.busy = function () { return origBusy.call(this) || !!this.sulk; };

  /* ---------- 마우스 장난 ---------- */
  function stealCursor(p) {
    if (!p || p.busy() || !mouse.seen) return;
    p.say(pick(['커서 압수', '이거 내 거', '잠깐 빌린다']), 1600);
    p.walkTo(mouse.x - PW / 2, mouse.y - PH / 2);
    p.onArrive = () => {
      const c = document.createElement('div');
      c.className = 'fake-cursor';
      c.innerHTML = '<svg viewBox="0 0 16 24" width="22" height="33"><path d="M1 1 L1 19 L5.5 14.8 L8.6 22 L11.4 20.8 L8.4 13.8 L14.5 13.8 Z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>';
      p.flipper.appendChild(c);
      SFX.play('pop');
      p.say(pick(['가져간다', '메롱', '잡아봐']), 1500);
      const corner = Math.random() < 0.5 ? 20 : W() - PW - 20;
      p.fast = true;
      p.maxSpeed = (p.baseSpeed || 80) * 2.4;
      p.walkTo(corner, H() - PH - 20);
      p.onArrive = () => {
        p.fast = false;
        p.maxSpeed = p.baseSpeed || 80;
        p.say(pick(['돌려줄게', '재미없다', '여기 있다']), 1500);
        setTimeout(() => {
          const r = c.getBoundingClientRect();
          c.remove();
          const fly = c.cloneNode(true);
          fly.className = 'fake-cursor flying';
          fly.style.left = r.left + 'px';
          fly.style.top = r.top + 'px';
          stage.appendChild(fly);
          requestAnimationFrame(() => { fly.style.left = mouse.x + 'px'; fly.style.top = mouse.y + 'px'; fly.style.opacity = '0'; });
          SFX.play('whoosh');
          setTimeout(() => fly.remove(), 900);
        }, 1600);
      };
    };
  }
  const idle = { x: 0, y: 0, since: 0, done: false };
  function watchIdleCursor() {
    const t = now();
    if (Math.hypot(mouse.x - idle.x, mouse.y - idle.y) > 4) { idle.x = mouse.x; idle.y = mouse.y; idle.since = t; idle.done = false; return; }
    if (idle.done || !mouse.seen || t - idle.since < 6000) return;
    idle.done = true;
    if (Math.random() > 0.35) return;
    const p = list().find((q) => !q.busy() && !q.morphed);
    if (!p) return;
    p.walkTo(idle.x - PW / 2, idle.y + 40);
    p.onArrive = () => { p.say(pick(['뭐 보는 중?', '이거 뭔데', '나도 보여줘', '일 안 하네']), 2200); p.tilt = -12; };
  }
  function trashRun(p) {
    if (!p || p.busy()) return;
    const n = 5;
    const bits = [];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'trash';
      b.style.left = rand(60, W() - 80) + 'px';
      b.style.top = rand(H() * 0.55, H() - 60) + 'px';
      b.style.setProperty('--r', rand(0, 360).toFixed(0) + 'deg');
      stage.appendChild(b);
      bits.push(b);
    }
    p.say(pick(['청소 시간', '누가 버렸냐', '줍줍']), 1600);
    let i = 0;
    const next = () => {
      if (i >= bits.length) {
        makeBlast(p.x + PW / 2, p.y - 20, '청소 끝!', 'stamp', 0.4);
        SFX.play('sparkle');
        bump(p, 0, 8);
        return;
      }
      const b = bits[i++];
      const r = b.getBoundingClientRect();
      p.walkTo(r.left - PW / 2, r.top - PH + 20);
      p.onArrive = () => { b.classList.add('got'); SFX.play('pop'); setTimeout(() => b.remove(), 300); setTimeout(next, 250); };
    };
    next();
  }

  /* ---------- 날씨와 계절 ---------- */
  let weather = null;
  let wcv = null, wctx = null, drops = [];
  function season() {
    const n = new Date();
    const m = n.getMonth() + 1, d = n.getDate();
    if (m === 12 && d >= 18 && d <= 26) return 'xmas';
    if ((m === 12 && d === 31) || (m === 1 && d <= 2)) return 'newyear';
    return null;
  }
  function weatherKind() {
    if (cfg && cfg.weather === false) return null;
    const w = weather && weather.kind;
    if (w === 'rain' || w === 'thunder' || w === 'snow') return w;
    if (season() === 'xmas') return 'snow-light';
    return null;
  }
  function ensureCanvas() {
    if (wcv) return;
    wcv = document.createElement('canvas');
    wcv.className = 'wx';
    document.body.appendChild(wcv);
    wctx = wcv.getContext('2d');
  }
  function weatherLoop() {
    const k = weatherKind();
    if (!k) { if (wcv) { wcv.remove(); wcv = null; drops = []; } }
    else {
      ensureCanvas();
      if (wcv.width !== W() || wcv.height !== H()) { wcv.width = W(); wcv.height = H(); }
      const snow = k.startsWith('snow');
      const target = k === 'snow-light' ? 40 : snow ? 90 : 120;
      while (drops.length < target) drops.push({ x: Math.random() * W(), y: Math.random() * -H(), v: snow ? rand(30, 70) : rand(500, 700), s: snow ? rand(1.5, 3.6) : rand(9, 16), w: rand(0, 6) });
      wctx.clearRect(0, 0, W(), H());
      const dt = 1 / 30;
      wctx.fillStyle = 'rgba(255,255,255,.85)';
      wctx.strokeStyle = 'rgba(150,180,220,.55)';
      wctx.lineWidth = 1.2;
      for (const d of drops) {
        d.y += d.v * dt;
        if (snow) { d.w += dt; d.x += Math.sin(d.w) * 0.6; wctx.beginPath(); wctx.arc(d.x, d.y, d.s, 0, 6.28); wctx.fill(); }
        else { d.x -= 1.5; wctx.beginPath(); wctx.moveTo(d.x, d.y); wctx.lineTo(d.x + 2, d.y - d.s); wctx.stroke(); }
        if (d.y > H() + 10) { d.y = -10; d.x = Math.random() * W(); }
      }
      if (k === 'thunder' && Math.random() < 0.002) {
        const f = document.createElement('div');
        f.className = 'flash';
        document.body.appendChild(f);
        setTimeout(() => f.remove(), 500);
        setTimeout(() => SFX.play('boom'), 300);
      }
    }
    for (const p of list()) {
      let gear = null;
      if (k === 'rain' || k === 'thunder') gear = 'umbrella';
      else if (season() === 'xmas') gear = 'santa';
      else if (season() === 'newyear') gear = 'party';
      if (p.gear !== gear) {
        if (p.gearEl) { p.gearEl.remove(); p.gearEl = null; }
        p.gear = gear;
        if (gear) {
          const g = document.createElement('div');
          g.className = 'gear gear-' + gear;
          g.innerHTML = gear === 'umbrella'
            ? '<svg viewBox="0 0 60 50" width="100%" height="100%"><path d="M2 26 Q30 -6 58 26 Q51 21 44 26 Q37 21 30 26 Q23 21 16 26 Q9 21 2 26 Z" fill="#ff6fa8" stroke="#2b2622" stroke-width="2"/><path d="M30 26 L30 46 Q30 50 26 49" fill="none" stroke="#2b2622" stroke-width="2.4" stroke-linecap="round"/></svg>'
            : gear === 'santa'
              ? '<svg viewBox="0 0 60 44" width="100%" height="100%"><path d="M8 34 Q14 6 38 4 Q52 6 56 22 Q48 14 44 18 Q40 26 46 34 Z" fill="#e0262d" stroke="#2b2622" stroke-width="2"/><rect x="4" y="30" width="46" height="10" rx="5" fill="#fff" stroke="#2b2622" stroke-width="2"/><circle cx="54" cy="24" r="5" fill="#fff" stroke="#2b2622" stroke-width="2"/></svg>'
              : '<svg viewBox="0 0 40 50" width="100%" height="100%"><path d="M20 2 L36 44 L4 44 Z" fill="#7a5cff" stroke="#2b2622" stroke-width="2"/><path d="M12 24 L28 24 M8 34 L32 34" stroke="#ffd54a" stroke-width="3"/><circle cx="20" cy="3" r="3.5" fill="#ffd54a" stroke="#2b2622" stroke-width="1.5"/></svg>';
          p.flipper.appendChild(g);
          p.gearEl = g;
        }
      }
      if (p.gearEl && p.gear !== 'umbrella') {
        const ht = p.rig.headTop() * (PW / 100);
        p.gearEl.style.top = (ht - (p.gear === 'santa' ? 26 : 34)) + 'px';
      }
    }
  }
  function snowman() {
    if (weatherKind() !== 'snow' && weatherKind() !== 'snow-light') return;
    const p = list().find((q) => !q.busy());
    if (!p) return;
    const s = document.createElement('div');
    s.className = 'snowman';
    s.innerHTML = '<svg viewBox="0 0 60 80" width="60" height="80"><circle cx="30" cy="58" r="20" fill="#fff" stroke="#9fb3c8" stroke-width="2"/><circle cx="30" cy="26" r="14" fill="#fff" stroke="#9fb3c8" stroke-width="2"/><circle cx="25" cy="23" r="1.8" fill="#2b2622"/><circle cx="35" cy="23" r="1.8" fill="#2b2622"/><path d="M30 27 L40 29 L30 30 Z" fill="#ff8a2a"/><path d="M18 38 Q30 44 42 38" fill="none" stroke="#e0262d" stroke-width="4"/></svg>';
    s.style.left = clamp(p.x + PW + 10, 10, W() - 70) + 'px';
    s.style.top = clamp(p.y + PH - 80, 0, H() - 82) + 'px';
    stage.appendChild(s);
    p.say('눈사람 완성', 2000);
    SFX.play('sparkle');
    setTimeout(() => { s.classList.add('melt'); setTimeout(() => s.remove(), 1500); }, 40000);
  }


  /* ---------- 캐릭터끼리 대화 ---------- */
  const TALK = [
    // [조건, 대본] 대본은 번갈아 말함. {키}는 stats 값
    [(c) => c.s.payIn === 0, [
      ['오늘 월급날이다', '들어왔냐', '들어왔다 나갔다', '카드값이 먼저 알았네'],
      ['월급 들어옴', '치킨?', '치킨은 전역날 먹기로 했잖아', '오늘도 전역날이라 치자'],
    ]],
    [(c) => c.s.payIn > 0 && c.s.payIn <= 5, [
      ['월급 언제냐', '{payText}', '{payIn}일을 어떻게 버티냐', '버티는 건 전역까지 {d}일로 단련됨'],
      ['통장 잔고 봤냐', '안 봄. 무서움', '{payText}면 들어온다', '그때까지 숨만 쉬자'],
    ]],
    [(c) => c.wd === 5 && c.h >= 12 && c.h < 17, [
      ['오늘 금요일이다', '퇴근까지 {offText}', '주말 계획 있냐', '누워 있기', '완벽한 계획이다'],
      ['불금이다', '불은 무슨 퇴근이나 하자', '퇴근까지 {offText}', '그 시간 동안 일하는 척 가능?', '프로라서 가능'],
    ]],
    [(c) => c.wd === 1 && c.h < 12, [
      ['월요일이네', '말 걸지 마', '남은 주말 {weekends}번', '그 말 들으니 좀 살 것 같다'],
      ['주말 순삭', '원래 주말은 압축 파일임', '풀면 다시 월요일', '전역하면 매일 주말'],
    ]],
    [(c) => c.wd >= 1 && c.wd <= 5 && c.s.offMins > 0 && c.s.offMins <= 60, [
      ['퇴근까지 {offText}', '가방 싸도 되냐', '아직 이르다', '마음은 이미 지하철'],
      ['몇 분 남았지', '{offText}', '시계 고장 난 거 아니냐', '시계는 멀쩡함. 시간이 느린 거임'],
    ]],
    [(c) => c.wd >= 1 && c.wd <= 5 && c.s.offMins <= 0 && c.h < 22, [
      ['아직 회사냐', '퇴근했다 치자', '불 꺼라', '남은 퇴근 {workdays}번'],
    ]],
    [(c) => c.wd >= 1 && c.wd <= 5 && c.h * 60 + c.m >= 690 && c.h < 13, [
      ['점심 뭐 먹냐', '군대리아', '여기 회사임', '그럼 김치찌개'],
      ['배고프다', '남은 짬밥 {meals}끼', '그거 다 먹으면 전역?', '그거 다 먹으면 전역'],
    ]],
    [(c) => c.h >= 6 && c.h < 10 && c.wd >= 1 && c.wd <= 5, [
      ['굿모닝', '모닝은 굿하지 않음', '전역까지 {d}일', '그건 좀 굿하네'],
      ['커피 마셨냐', '두 잔', '심장 괜찮냐', '퇴근까지 버티라고 뛰는 중'],
    ]],
    [(c) => c.h >= 22 || c.h < 5, [
      ['이 시간에 뭐 하냐', '너는', '야근', '나도', '같이 퇴근하자'],
      ['자야 되는데', '내일 출근', '전역까지 {d}일', '그럼 진짜 자야 됨'],
    ]],
    [(c) => c.wx === 'rain' || c.wx === 'thunder', [
      ['비 온다', '우산 챙겼냐', '들고 있잖아', '그거 내 거 아니냐'],
      ['비 오니까 퇴근하기 싫다', '출근은 하고 싶었냐', '그건 아님', '그럼 그냥 다 싫은 거네'],
    ]],
    [(c) => c.wx === 'snow', [
      ['눈 온다', '눈사람 만들까', '전역하고 만들자', '{d}일 뒤에 눈 안 올 수도 있음', '그럼 지금 만들자'],
    ]],
    [(c) => c.hungry, [
      ['배고프다', '밥 달라고 해', '누구한테', '화면 앞에 있는 사람한테', '밥 주세요'],
    ]],
    [(c) => c.sulky, [
      ['왜 그러냐', '흥', '쓰다듬어 달라고 해봐', '안 해. 알아서 해줘야지'],
    ]],
    [(c) => c.s.d > 0 && c.s.d % 100 <= 3 && c.s.d > 3, [
      ['곧 D-{round}다', '{d}일 남았는데', '반올림하면 {round}', '반올림 금지'],
    ]],
    [(c) => c.s.d > 0, [
      ['전역까지 며칠이냐', '{d}일', '어제도 물어봤는데', '어제는 하루 더 많았지'],
      ['전역하면 뭐 할 거냐', '늦잠', '그 다음은', '또 늦잠'],
      ['우리 몇 번 퇴근하면 되냐', '{workdays}번', '주말은', '{weekends}번', '숫자로 들으니까 할 만한데'],
      ['남은 월급 {paydays}번', '그걸로 전역 선물 사자', '뭐 살 건데', '퇴사 선물'],
      ['너 오늘 뭐 했냐', '화면 깼다', '그거 일이냐', '내 업무임'],
      ['포토카드 몇 장 모았냐', '비밀', '나 SSR 있음', '거짓말'],
      ['정각마다 소리 지르는 거 너냐', '시계 들고 있으면 나도 모르게', '다음 정각엔 내가 할게', '시계는 내 거임'],
    ]],
  ];
  function talkCtx() {
    const n = new Date();
    const s = stats();
    const ps = list();
    const cs = ps.map((p) => care[p.slot]).filter(Boolean);
    return {
      s: { ...s, round: Math.round(s.d / 100) * 100 },
      h: n.getHours(), m: n.getMinutes(), wd: n.getDay(),
      wx: weather && weather.kind,
      hungry: cs.some((c) => c.food < 25),
      sulky: cs.some((c) => c.mood < 20),
    };
  }
  let lastTalk = '';
  function pickTalk() {
    const c = talkCtx();
    const hits = TALK.filter(([cond]) => { try { return cond(c); } catch { return false; } });
    if (!hits.length) return null;
    // 상황에 맞는 대본을 먼저, 일반 대본은 가끔
    const special = hits.filter((h) => h !== TALK[TALK.length - 1]);
    const pool = special.length && Math.random() < 0.75 ? special : hits;
    const scripts = pick(pool)[1].filter((sc) => sc[0] !== lastTalk);
    const sc = pick(scripts.length ? scripts : pick(pool)[1]);
    lastTalk = sc[0];
    return sc.map((t) => fill(t, c.s));
  }
  function runTalk(l, r) {
    const lines = pickTalk();
    if (!lines) return;
    const first = Math.random() < 0.5 ? l : r;
    const second = first === l ? r : l;
    const both = [first, second];
    const n0 = performance.now();
    both.forEach((p) => { p.state = 'idle'; p.vx = p.vy = 0; p.talking = true; p.until = n0 + lines.length * 2500 + 1500; });
    setTimeout(() => both.forEach((p) => { p.talking = false; if (p.state === 'idle') p.until = performance.now() + 1200; }), lines.length * 2500 + 300);
    lines.forEach((t, i) => {
      setTimeout(() => {
        const sp = both[i % 2], other = both[(i + 1) % 2];
        if (!sp.el.isConnected || sp.state === 'drag' || other.state === 'drag' || sp.state === 'leave') return;
        sp.facing = other.x > sp.x ? 1 : -1;
        other.facing = -sp.facing;
        sp.say(t, 2300);
      }, i * 2500);
    });
  }
  window.jyTalk = runTalk;

  /* ---------- 연결 ---------- */
  const W0 = window.petWorld;
  Object.assign(W0, {
    acryl: (w) => showAcryl(w && w.kind ? w : weather),
    feed: (slot) => feed(pickPet(slot)),
    petpet: (slot) => petpet(pickPet(slot)),
    steal: (slot) => stealCursor(pickPet(slot)),
    trash: (slot) => trashRun(pickPet(slot)),
    weather: (w) => { weather = w; },
    careOf: () => care,
    talk: () => duoAct('talk'),
  });
  const origStart = W0.start;
  W0.start = function (...args) {
    const r = origStart.apply(this, args);
    loadCare();
    if (api.weatherNow) api.weatherNow().then((w) => { if (w) weather = w; });
    setInterval(careLoop, 1000);
    setInterval(watchRub, 60);
    setInterval(watchIdleCursor, 500);
    setInterval(weatherLoop, 33);
    setInterval(() => {
      const r2 = Math.random();
      const p = list().find((q) => !q.busy() && !q.morphed);
      if (!p) return;
      if (r2 < 0.15) stealCursor(p);
      else if (r2 < 0.3) trashRun(p);
      else if (r2 < 0.45) snowman();
    }, 4 * 60000);
    return r;
  };
  const origSpawn = W0.spawn;
  if (origSpawn) W0.spawn = function (...a) { const r = origSpawn.apply(this, a); setTimeout(loadCare, 200); return r; };
})();
