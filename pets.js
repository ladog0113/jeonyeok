const PW = 92, PH = 114;
const stage = document.getElementById('stage');
const crackLayer = document.getElementById('cracks');
const W = () => window.innerWidth;
const H = () => window.innerHeight;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const env = window.petEnv;
let cfg = null;
let fairy = false;

function stats() {
  const [y, m, d] = cfg.discharge.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const left = Math.round((target - today) / 86400000);
  const s = {
    d: left,
    name: cfg.name || '너',
    meals: Math.max(left, 0) * 3,
    hours: Math.max(0, Math.floor((target - now) / 3600000)),
    weeks: Math.floor(Math.max(left, 0) / 7),
    weekends: Math.floor(Math.max(left, 0) / 7),
    pct: null, rpct: null, done: null,
  };
  if (cfg.enlist) {
    const [ey, em, ed] = cfg.enlist.split('-').map(Number);
    const start = new Date(ey, em - 1, ed);
    const total = (target - start) / 86400000;
    const done = (today - start) / 86400000;
    const p = Math.min(100, Math.max(0, (done / total) * 100));
    s.pct = p.toFixed(1);
    s.rpct = (100 - p).toFixed(1);
    s.done = Math.max(0, Math.round(done));
  }
  return s;
}

function fill(t, s) {
  return t.replace(/\{(\w+)\}/g, (_, k) => (s[k] ?? ''));
}


const SOLO = [
  '주저하는 연인들을 위해? 주저하는 이병을 위해. 아직 {d}일',
  '뜨거운 여름밤은 가고 남은 건 {d}일',
  '꿈과 책과 힘과 벽. {name} 지금 벽 단계',
  '가을밤에 든 생각: {d}일은 너무 길다',
  '작전명 청-춘! 작전 기간 {d}일 남음',
  '슬픔이여 이제 안녕? {d}일 남았는데 무슨 안녕',
  '외딴섬 로맨틱? 여긴 외딴 부대, 남은 건 {d}일',
  '전설은 {d}일 뒤에나 써라',
  '뜨거운 여름밤은 갔고 추운 근무는 {d}일 남음',
  '가을밤에 든 생각 하나 더. 짬밥 {meals}끼 남음',
  '꿈과 책과 힘과 벽, 그리고 {d}일',
  '주저하지 말고 {hours}시간만 버텨',
  '슬픔이여 이제 안녕은 {weeks}주 뒤에',
  'D-{d}. 국방부 시계 오늘도 정상 작동 중',
  '{d}일 남은 사람 표정이 그게 뭐냐',
  '전역까지 {d}일. 난리자베스',
  '아직 {d}일 남았자베스',
  '{name} 전역? 딸깍으로 안 됨. {d}일 버텨야 됨',
  '짬밥 {meals}끼 남음. 오이쉬에?',
  '남은 시간 {hours}시간 습득하는 몬스터',
  '전역하면 쉬었음 청년 예약',
  '전역하면 전업자녀 각',
  '반모 신청함. 어차피 {d}일 동안 못 도망감',
  '전역까지 {d}일. 야호는 그때 하자',
  '{d}일 남았는데 벌써 야호?',
  '오이데 오이데. 전역은 {d}일 뒤에 오이데',
  '심심하면 파라파라나 춰야지. {d}일 남았으니까',
  '맛떼루요. {d}일만 맛떼',
  '전역하겠어. 칼복귀는 안 하겠어. {d}일 버티겠어',
  '나 왜 군생활이 영원할 거 같지? {d}일',
  '{d}일... 영원할 건가 보다',
  '짬밥 {meals}끼라는 게 숨긴다고 숨겨지는 것도 아니고',
  '{name} 지금 분명 달력 보고 있을 것',
  '전역일 정보 좀요. 아 {d}일 뒤',
  '휴가 연락 없네. 잘 살아',
  '일하기 전 제 모습이고요. 전역은 {d}일 뒤고요',
  '{d}일 남은 거 무례하지 않게 말해 주세요',
  '아직 {d}일삐. 전역삐는 멀었삐',
  '또 꿀빨아?!?!?!?!?',
  '{d}일 남았는데 또 꿀빨아?!?!?!?!?',
  '굶어라. 전역까지 {d}일',
  '라잌 원이↗',
  '저 덕연이 딸인데여',
  '니가 뭔데 {d}일이나 남았어',
];
const SOLO_PCT = [
  '작전명 청-춘! 진행률 겨우 {pct}%',
  '꿈과 책과 힘과 벽 중에 {pct}% 왔다. 남은 건 벽',
  '남은 {rpct}%가 진짜 전설',
];
const DUO = [
  ['주저하는 연인들을 위해 불러줄까', '{name} 위해서 불러. {d}일 남았대'],
  ['뜨거운 여름밤은 가고', '남은 건 {d}일...'],
  ['꿈과 책과 힘과', '벽. {d}일짜리 벽'],
  ['작전명!', '청-춘! 작전 종료까지 {d}일'],
  ['슬픔이여', '안녕하기엔 {d}일 이르다'],
  ['가을밤에 든 생각 있어?', '{name} 전역 아직 {d}일'],
  ['외딴섬 로맨틱 가고 싶다', '{d}일 뒤에 가'],
  ['전역 며칠 남았냐', '{d}일. 난리자베스'],
  ['이거 딸깍으로 안 되냐', '{d}일 동안 매일 딸깍하면 됨'],
  ['반모 할까', '{d}일 남은 애랑은 반모 불가'],
  ['전역하고 싶어?', '너도? 나도!'],
  ['{d}일 남았대', '너도? 나도! 둘 다 {d}일'],
  ['짬밥 맛있냐', '오이쉬에... 는 아니고'],
  ['전역하면 뭐 할 거야', '거제 가서 야호'],
  ['심심하다', '파라파라나 춰야지'],
  ['전역 정보 좀요', '{d}일 뒤. 정보 끝'],
  ['나 왜 {d}일이 영원할 거 같지?', '영원할 건가 보다'],
  ['휴가 연락 없네', '잘 살아. {d}일 뒤에 보자'],
  ['칼전역하겠어', '{d}일 남았는데 뭘 하겠어'],
  ['따봉 하나 줘', '손은 바빠서 발가락으로'],
  ['나 모함하지 마', '모함? 항공모함?'],
  ['전역 축하해 줘', '니가 뭔데'],
  ['오늘 좀 쉬어야겠다', '또 꿀빨아?!?!?!?!?'],
  ['짬밥 남겨도 돼?', '굶어라'],
  ['전역하면 뭐 함?', '쉬었음 청년자베스'],
];
const DUO_PCT = [
  ['전설까지 몇 % 왔냐', '{pct}%. 전설 되려면 한참'],
];
const SOON = ['슬픔이여 이제 안녕, 연습 시작해도 됨. {d}일', '작전명 청-춘! 마지막 {d}일', 'D-{d}. 이제 좀 사람 같네'];
const DDAY = ['슬픔이여 이제 안녕! {name} 전역 축하', '작전명 청-춘! 작전 종료', '오늘 전역. 이제 전설 써도 됨'];
const AFTER = ['뜨거운 여름밤은 가고 남은 건 예비군', '민간인 {ad}일차. 예비군 통지서 옴?', '전설 쓰는 중? 전역한 지 {ad}일'];
const DRAG = ['놔라 놔라', '탈영 아님!', '주저하지 말고 내려놔', '어디 데려가', '놔라자베스', '오이데 오이데 아님!'];
const DROP = ['아 허리야', '전역 전에 다치면 안 되는데', '복귀 완료', '야호 착지'];
const SMASH = ['외딴섬 로맨틱 말고 깨진 화면 로맨틱', '앗 화면 깼다. 그래도 {d}일 남음', '꿈과 책과 힘과 벽... 화면도 벽이었네', '화면 난리자베스', '딸깍 말고 쾅'];
const FAIRY = ['요정이 소원 하나 들어줌. 전역 날짜 빼고', '날아다녀도 {d}일 남음', '요정 모드 켜도 국방부 시계는 그대로', '하늘에서 봐도 {d}일 남은 거 보임', '날아서 가면 빠를 줄 알았지? {d}일'];


function line(type) {
  const s = stats();
  if (s.d < 0) { s.ad = -s.d; return fill(pick(AFTER), s); }
  if (s.d === 0) return fill(pick(DDAY), s);
  if (type === 'drag') return fill(pick(DRAG), s);
  if (type === 'drop') return fill(pick(DROP), s);
  if (type === 'smash') return fill(pick(SMASH), s);
  if (s.d <= 30 && Math.random() < 0.4) return fill(pick(SOON), s);
  if (fairy && Math.random() < 0.3) return fill(pick(FAIRY), s);
  const pool = s.pct !== null ? SOLO.concat(SOLO_PCT) : SOLO;
  return fill(pick(pool), s);
}

function duo() {
  const s = stats();
  if (s.d <= 0) return null;
  const pool = s.pct !== null ? DUO.concat(DUO_PCT) : DUO;
  return pick(pool).map((t) => fill(t, s));
}

const ARRIVE = ['여기도 모니터 있네', '옆 화면 순찰 왔다', '여기서도 {d}일 남음', '도망 와도 전역일은 그대로'];


function makeCrack(x, y) {
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'crack');
  const paths = [];
  const rays = Math.floor(rand(7, 11));
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + rand(-0.25, 0.25);
    let px = x, py = y, d = `M${x} ${y}`;
    const segs = Math.floor(rand(3, 6));
    let ang = a;
    for (let j = 0; j < segs; j++) {
      ang += rand(-0.4, 0.4);
      const len = rand(18, 48);
      px += Math.cos(ang) * len;
      py += Math.sin(ang) * len;
      d += ` L${px.toFixed(1)} ${py.toFixed(1)}`;
      if (Math.random() < 0.35) {
        const ba = ang + rand(-1, 1);
        const bl = rand(12, 30);
        paths.push(`M${px.toFixed(1)} ${py.toFixed(1)} L${(px + Math.cos(ba) * bl).toFixed(1)} ${(py + Math.sin(ba) * bl).toFixed(1)}`);
      }
    }
    paths.push(d);
  }
  for (let r = 1; r <= 2; r++) {
    let d = '';
    const rad = 22 * r + rand(-5, 5);
    for (let i = 0; i <= rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const rr = rad + rand(-6, 6);
      d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)} `;
    }
    paths.push(d);
  }
  for (const [stroke, width] of [['rgba(255,255,255,.85)', 4], ['#141414', 1.8]]) {
    for (const d of paths) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', stroke);
      p.setAttribute('stroke-width', width);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      g.appendChild(p);
    }
  }
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 6);
  dot.setAttribute('fill', '#141414');
  g.appendChild(dot);
  crackLayer.appendChild(g);
  setTimeout(() => { g.style.opacity = '0'; }, 9000);
  setTimeout(() => g.remove(), 10500);
}


const SPIN = ['빙글빙글 {d}일', '어지러운데 전역은 아직 {d}일', '돌아도 날짜는 안 돌아감'];
const SCRIBBLE = ['D-{d}', '전역 언제 옴', '{d}일 남음', '야호', '난리자베스', '{name} 아직 {d}일'];
const DANCE = ['파라파라나 춰야지', '전역 축하 파라파라 연습. {d}일 뒤 실전', '파라파라 춰도 {d}일'];
const TOE = ['발가락 따봉. {d}일 버티는 거 인정', '손은 바빠서 발가락 따봉', '전역까지 {d}일, 따봉은 발가락으로'];
const STAR = ['손가락 별. {d}일 남은 너한테', '별 하나에 하루씩. 아직 {d}개', '손가락 별 받고 {d}일 버텨'];
const GRIP = ['그립감이 좋다', '마우스 그립감이 좋다. 전역은 {d}일 뒤', '그립감 좋은데 {d}일 동안 안 놔줌'];
const NEON = ['네온 모드 켜짐. 전역까지 {d}일', '번쩍번쩍해도 {d}일', '불빛은 화려한데 남은 날은 {d}일'];
const WHISTLE = ['{name} 체포! 전역까지 {d}일 구금', '삐익! 탈영 금지', '호루라기 불어도 {d}일 남음', '정지! 전역은 {d}일 뒤'];
const BLASTS = ['삑삑삑삑삑!', '삑!', '삑삑삑삑삑!'];
const PN = [[-110, 110], [-150, 70], [-70, 150], [-130, 130], [-95, 160], [-160, 95], [-120, 60], [-60, 120], [-140, 140], [-100, 100], [-165, 30], [-30, 165]];
const PW_ = [[95, -15], [15, -95], [165, -20], [20, -165], [-45, 45], [95, -95], [140, -40], [40, -140]];
const REPEAT_LINE = '강조되고 반복되는 소리는 강아지를 불안하게 만들어요.';
const SLEEP = ['{d}일 남았으니까 좀 잔다', '깨우지 마. 전역하면 깨워', '꿈에서는 벌써 전역함'];
const SIGN = ['사인 해 줄게', '팬서비스 들어간다', '전역 기념 한정판'];
const SIGN_TEXTS = [['원이', 'p.s. 행복하세요'], ['미나미', 'p.s. 행복하세요'], ['제나', 'p.p. 행복하세요'], ['메이', 'p.s. 행복하세요'], ['리브', 'p.s. 행복하세요']];
const BRUSH = ['붓글씨 한 장 갑니다', '먹 갈았다', '정신 집중'];
const FLIP = ['공중제비!', '착지 성공. 전역은 {d}일 뒤', '한 바퀴 돌아도 {d}일'];
const POP = ['가슴 튕기기', '한 번 튕기면 끝남', '각 잡고 튕긴다'];
const PPOP = [[20, -20], [20, -20], [-115, 115], [20, -20], [30, -150], [20, -20], [-115, 115], [150, -30]];
const SLIME = ['말랑말랑... 어?', '이거 터지는 거 아니지?', '슬라임 만지는 중'];
const SHIMMY = ['어깨 털고 {d}일 털자', '어깨춤 나온다', '털어도 {d}일'];
const HEARTS = ['전역까지 {d}일, 하트 받아', '하트 줄 테니 {d}일 버텨', '하트 발사'];
const POWER = ['파워 댄스. 남은 {d}일 다 부숨', '힘 줘서 {d}일', '각 잡고 간다'];
const CHEER = ['응원단 출동. 전역까지 {d}일', '{name} 힘내라 {d}일', '목 쉬어도 응원함'];
const CHEER_SHOUTS = ['파이팅!!!', '{d}일 가자!!!', '전역까지 달려!!!'];
const PS = [[45, -45], [25, -25]];
const PHEART = [[150, -150], [165, -165], [150, -150], [110, -110], [160, -20], [20, -160], [150, -150], [165, -165]];
const PPW = [[-60, 60], [100, -100], [170, -20], [20, -170], [-40, -90], [90, 40], [130, -130], [-60, 60]];
const PC = [[170, -20], [20, -170], [150, -150], [60, -60], [170, -170], [-50, 50], [160, -160], [30, -30]];
const SLIME_COLORS = ['#9be7c4', '#ffb3d9', '#b9a7ff', '#ffe08a', '#8fd3f4'];

function makeHeart(x, y) {
  const d = document.createElement('div');
  d.className = 'fstar';
  d.style.left = x.toFixed(0) + 'px';
  d.style.top = y.toFixed(0) + 'px';
  d.innerHTML = '<svg viewBox="-12 -12 24 24" width="34" height="34"><path d="M0 9 C-12 1 -10 -9 -4.5 -9 C-1.8 -9 0 -6.5 0 -5 C0 -6.5 1.8 -9 4.5 -9 C10 -9 12 1 0 9 Z" fill="#ff5c8a" stroke="#2b2622" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  stage.appendChild(d);
  setTimeout(() => d.remove(), 1700);
}

function makeZzz(cx, cy) {
  const text = 'Zzz';
  const fs = Math.sqrt((W() * H() * 0.25) / (text.length * 0.9));
  const d = document.createElement('div');
  d.className = 'zzz';
  [...text].forEach((ch, i) => {
    const sp = document.createElement('span');
    sp.textContent = ch;
    sp.style.animationDelay = (i * 0.35).toFixed(2) + 's';
    sp.style.fontSize = (1 - i * 0.16).toFixed(2) + 'em';
    d.appendChild(sp);
  });
  d.style.fontSize = fs.toFixed(0) + 'px';
  const bw = fs * text.length * 0.8, bh = fs * 1.1;
  d.style.left = clamp(cx, bw / 2 + 8, W() - bw / 2 - 8).toFixed(0) + 'px';
  d.style.top = clamp(cy, bh / 2 + 8, H() - bh / 2 - 8).toFixed(0) + 'px';
  stage.appendChild(d);
  return d;
}

function makeSign(x, y, lines) {
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'sign');
  g.setAttribute('transform', `rotate(${rand(-9, -3).toFixed(1)} ${x} ${y})`);
  lines.forEach((ln, i) => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x + i * 26);
    t.setAttribute('y', y + i * 52);
    t.setAttribute('class', i ? 'sign-sub' : 'sign-main');
    t.style.animationDelay = (i * 0.9).toFixed(1) + 's';
    t.textContent = ln;
    g.appendChild(t);
  });
  crackLayer.appendChild(g);
  setTimeout(() => { g.style.opacity = '0'; }, 12000);
  setTimeout(() => g.remove(), 13500);
}

function makeBrushWriting(cx, cy, text) {
  const fs = Math.min(W() * 0.13, H() * 0.22, 170);
  const d = document.createElement('div');
  d.className = 'paper';
  d.style.fontSize = fs.toFixed(0) + 'px';
  const w = fs * (text.length * 1.05 + 0.9), h = fs * 1.7;
  d.style.left = clamp(cx - w / 2, 10, W() - w - 10).toFixed(0) + 'px';
  d.style.top = clamp(cy - h / 2, 10, H() - h - 10).toFixed(0) + 'px';
  d.innerHTML = `<span>${text}</span>`;
  stage.appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; }, 12000);
  setTimeout(() => d.remove(), 13300);
}

function blobPath(cx, cy, r, n, jit) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + rand(-jit, jit));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (!i) d += `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

function makeSlimeBlob(x, y, color) {
  const d = document.createElement('div');
  d.className = 'slime';
  d.style.left = x.toFixed(0) + 'px';
  d.style.top = y.toFixed(0) + 'px';
  d.innerHTML = `<svg viewBox="0 0 80 56" width="80" height="56"><path d="M6 50 C2 30 18 8 40 8 C62 8 78 30 74 50 Z" fill="${color}" stroke="#2b2622" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<ellipse cx="30" cy="22" rx="8" ry="4" fill="#fff" opacity=".6"/><circle cx="32" cy="34" r="2.6" fill="#2b2622"/><circle cx="48" cy="34" r="2.6" fill="#2b2622"/>` +
    `<path d="M36 41 Q40 44 44 41" fill="none" stroke="#2b2622" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  stage.appendChild(d);
  return d;
}

function makeSplats(cx, cy, color) {
  const NS = 'http://www.w3.org/2000/svg';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const near = i < 3;
    const x = near ? cx + rand(-90, 90) : rand(40, W() - 40);
    const y = near ? cy + rand(-70, 40) : rand(40, H() - 40);
    const r = near ? rand(18, 34) : rand(22, 60);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'splat');
    g.style.transformOrigin = `${x}px ${y}px`;
    g.style.animationDelay = (near ? 0 : rand(0.05, 0.35)).toFixed(2) + 's';
    const body = document.createElementNS(NS, 'path');
    body.setAttribute('d', blobPath(x, y, r, 11, 0.35));
    body.setAttribute('fill', color);
    body.setAttribute('fill-opacity', '.88');
    body.setAttribute('stroke', '#2b2622');
    body.setAttribute('stroke-opacity', '.35');
    body.setAttribute('stroke-width', '2');
    g.appendChild(body);
    const drips = Math.floor(rand(1, 4));
    for (let k = 0; k < drips; k++) {
      const dx = x + rand(-r * 0.6, r * 0.6);
      const len = rand(r * 0.6, r * 2);
      const drip = document.createElementNS(NS, 'path');
      drip.setAttribute('d', `M${dx} ${y} V${y + len}`);
      drip.setAttribute('stroke', color);
      drip.setAttribute('stroke-width', rand(6, 11).toFixed(1));
      drip.setAttribute('stroke-linecap', 'round');
      drip.setAttribute('class', 'drip');
      drip.style.setProperty('--len', len.toFixed(0));
      g.appendChild(drip);
    }
    const shine = document.createElementNS(NS, 'ellipse');
    shine.setAttribute('cx', x - r * 0.3);
    shine.setAttribute('cy', y - r * 0.3);
    shine.setAttribute('rx', r * 0.25);
    shine.setAttribute('ry', r * 0.13);
    shine.setAttribute('fill', '#fff');
    shine.setAttribute('opacity', '.55');
    g.appendChild(shine);
    crackLayer.appendChild(g);
    setTimeout(() => { g.style.transition = 'opacity 1.5s'; g.style.opacity = '0'; }, 10000);
    setTimeout(() => g.remove(), 11600);
  }
}

const DANCES = {
  para: { pat: null, beat: 0.19, dur: 5.2, lines: null },
  neon: { pat: PN, beat: 0.34, dur: 6.2, lines: NEON },
  whistle: { pat: PW_, beat: 0.32, dur: 5.3, lines: WHISTLE },
  shimmy: { pat: PS, beat: 0.13, dur: 4, lines: SHIMMY },
  heart: { pat: PHEART, beat: 0.4, dur: 4.8, lines: HEARTS },
  power: { pat: PPW, beat: 0.28, dur: 5.2, lines: POWER },
  cheer: { pat: PC, beat: 0.3, dur: 5.6, lines: CHEER },
  pop: { pat: [[18, -18]], beat: 0.5, dur: 6, lines: POP },
};
const NEON_COLORS = ['#ff3df2', '#39f3ff', '#7dff4a', '#ffe14a', '#ff7a3d'];

const MORPH_BASE = (window.petEnv && window.petEnv.morphBase) || 'frames/morph/';
let pendingMorph = null;
function scheduleMorph() {
  setTimeout(() => {
    const ps = list().filter((p) => !p.morphed);
    if (ps.length && !pendingMorph) pendingMorph = pick(ps);
    scheduleMorph();
  }, rand(4, 9) * 60000);
}

function makePoof(cx, cy) {
  for (let i = 0; i < 14; i++) {
    const d = document.createElement('div');
    d.className = 'poof';
    const a = (i / 14) * Math.PI * 2;
    d.style.left = cx + 'px';
    d.style.top = cy + 'px';
    d.style.setProperty('--dx', (Math.cos(a) * rand(40, 80)).toFixed(0) + 'px');
    d.style.setProperty('--dy', (Math.sin(a) * rand(40, 80)).toFixed(0) + 'px');
    stage.appendChild(d);
    setTimeout(() => d.remove(), 800);
  }
}

let cardPool = null;
async function loadCards() {
  if (!cardPool) {
    try { cardPool = (await env.cardList()) || []; } catch { cardPool = []; }
  }
  return cardPool;
}
function cardSeen() {
  try { return new Set(JSON.parse(localStorage.getItem('jy-cards') || '[]')); } catch { return new Set(); }
}
async function showCard() {
  const pool = await loadCards();
  if (!pool.length) return;
  const idx = Math.floor(Math.random() * pool.length);
  const r = Math.random();
  const rare = r < 0.04 ? 'SSR' : r < 0.16 ? 'SR' : r < 0.4 ? 'R' : 'N';
  const seen = cardSeen();
  const isNew = !seen.has(pool[idx].id);
  seen.add(pool[idx].id);
  try { localStorage.setItem('jy-cards', JSON.stringify([...seen])); } catch {}
  document.querySelectorAll('.pcard-wrap').forEach((e) => e.remove());
  const wrap = document.createElement('div');
  wrap.className = 'pcard-wrap';
  const h = Math.min(H() * 0.62, 520);
  wrap.style.setProperty('--ch', h.toFixed(0) + 'px');
  wrap.innerHTML = `<div class="pcard rare-${rare}"><div class="face back"><div class="back-in"><b>전역</b><span>PHOTO CARD</span></div></div>` +
    `<div class="face front"><img alt=""><div class="shine"></div><div class="tagline"><span class="rk">${rare}</span><span>${fill('D-{d}', stats())}</span></div></div></div>` +
    `<div class="pcount">${isNew ? 'NEW ' : ''}${seen.size}/${pool.length}</div>`;
  wrap.querySelector('img').src = pool[idx].url;
  stage.appendChild(wrap);
  if (rare === 'SSR' || rare === 'SR') makeBlast(W() / 2, H() / 2 - h * 0.62, rare + '!');
  setTimeout(() => wrap.classList.add('out'), 5200);
  setTimeout(() => wrap.remove(), 6000);
}

function makeBlast(cx, cy, text) {
  const chars = [...text];
  const fs = Math.sqrt((W() * H() * 0.2) / (chars.length * 0.95));
  const bw = fs * chars.length * 0.92, bh = fs * 1.1;
  const d = document.createElement('div');
  d.className = 'blast';
  chars.forEach((ch, i) => {
    const sp = document.createElement('span');
    sp.textContent = ch;
    sp.style.animationDelay = (i * 0.09).toFixed(2) + 's';
    d.appendChild(sp);
  });
  d.style.fontSize = fs.toFixed(0) + 'px';
  d.style.left = clamp(cx, bw / 2 + 8, W() - bw / 2 - 8).toFixed(0) + 'px';
  d.style.top = clamp(cy, bh / 2 + 8, H() - bh / 2 - 8).toFixed(0) + 'px';
  d.style.setProperty('--r', rand(-8, 8).toFixed(1) + 'deg');
  stage.appendChild(d);
  setTimeout(() => d.remove(), 1300 + chars.length * 90);
}

const PP = [[160, -160], [130, -160], [160, -130], [150, -150], [60, -60], [-55, 55], [-55, 55], [110, -15], [15, -110], [150, -30], [30, -150], [95, -95], [95, -95], [170, -40], [40, -170], [160, -160]];
const CLONE = ['분신술! 그래도 {d}일', '우리가 늘어나도 날짜는 안 줄어듦', '분신 다 합쳐도 {d}일'];
const easeIO = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

function makeSpark(x, y) {
  const d = document.createElement('div');
  d.className = 'spark';
  d.style.left = x.toFixed(0) + 'px';
  d.style.top = y.toFixed(0) + 'px';
  stage.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

function makeStar(x, y) {
  const d = document.createElement('div');
  d.className = 'fstar';
  d.style.left = x.toFixed(0) + 'px';
  d.style.top = y.toFixed(0) + 'px';
  d.innerHTML = '<svg viewBox="-12 -12 24 24" width="30" height="30"><path d="M0 -10 L2.9 -3.1 L10 -3.1 L4.3 1.4 L6.4 8.6 L0 4.3 L-6.4 8.6 L-4.3 1.4 L-10 -3.1 L-2.9 -3.1 Z" fill="#ffd84a" stroke="#2b2622" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  stage.appendChild(d);
  for (let i = 0; i < 5; i++) setTimeout(() => makeSpark(x + rand(-18, 18), y + rand(-18, 18)), i * 90);
  setTimeout(() => d.remove(), 1700);
}

function makeScribble(x, y, text) {
  const NS = 'http://www.w3.org/2000/svg';
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', x);
  t.setAttribute('y', y);
  t.setAttribute('class', 'scribble');
  t.setAttribute('transform', `rotate(${rand(-9, 9).toFixed(1)} ${x} ${y})`);
  t.textContent = text;
  crackLayer.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; }, 13000);
  setTimeout(() => t.remove(), 14500);
}

class Pet {
  constructor(slot, x, y, opts = {}) {
    this.slot = slot;
    this.clone = !!opts.clone;
    this.w = PW;
    this.rig = new CharRig(slot, { outfit: ((cfg && cfg.outfits) || {})[slot] });
    this.el = document.createElement('div');
    this.el.className = 'pet' + (this.clone ? ' clone' : '');
    this.swingEl = document.createElement('div');
    this.swingEl.className = 'swing';
    this.flipper = document.createElement('div');
    this.flipper.className = 'flipper';
    this.flipper.appendChild(this.rig.svg);
    this.swingEl.appendChild(this.flipper);
    this.el.appendChild(this.swingEl);
    this.bubble = document.createElement('div');
    this.bubble.className = 'bubble';
    this.el.appendChild(this.bubble);
    this.tag = document.createElement('div');
    this.tag.className = 'tag';
    if (!this.clone) this.el.appendChild(this.tag);
    stage.appendChild(this.el);
    const now = performance.now();
    Object.assign(this, {
      x, y, tx: x, ty: y, vx: 0, vy: 0, state: 'idle', phase: 0, amp: 0, facing: 1,
      t: rand(0, 10), tilt: 0, tiltTarget: 0, swingA: 0, swingV: 0, dragVX: 0, squash: 0,
      smashT: -1, spinT: -1, spinTurns: 2, actT: 0, actDur: 0, chaseUntil: 0, orbitUntil: 0, talkUntil: 0,
      faceKey: null, last: now, onArrive: null, sparkAt: 0, scale: 1, dieAt: opts.life ? now + opts.life : 0,
      until: now + rand(1000, 3000), blinkAt: now + rand(800, 3000), blinkT: -1, tiltAt: now + rand(1500, 3000),
    });
    this.maxSpeed = this.clone ? rand(150, 210) : rand(70, 92);
    this.bubbleTimer = null;
    if (!this.clone) this.el.addEventListener('mousedown', (e) => this.startDrag(e));
    this.rig.setFairy(fairy);
    this.tick(now);
  }
  destroy() {
    clearTimeout(this.bubbleTimer);
    this.el.remove();
  }
  say(text, ms = 4500) {
    this.bubble.textContent = text;
    this.bubble.classList.add('show');
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.bubble.classList.remove('show'), ms);
    this.talkUntil = performance.now() + Math.min(ms - 300, 500 + text.length * 75);
  }
  setTag(text) { this.tag.textContent = text; }
  busy() {
    return ['drag', 'leave', 'smash', 'dance', 'write', 'toe', 'star', 'grip', 'grip-go', 'sleep', 'sign', 'slime', 'brush', 'flip', 'rest', 'stretch', 'wave', 'horn', 'bread'].includes(this.state) || this.spinT >= 0 || this.morphed;
  }
  walkTo(x, y) {
    this.tx = clamp(x, 10, W() - PW - 10);
    const framed = cfg && cfg.capture === 'photo' && !!cfg.frameOnScreen;
    this.ty = clamp(y, fairy ? (framed ? 60 : 50) : 120, H() - PH - (framed ? 70 : 8));
    this.tx = clamp(this.tx, framed ? 24 : 10, W() - PW - (framed ? 24 : 10));
    this.state = 'walk';
  }
  leave(side) {
    this.exitSide = side;
    this.tx = side === 'left' ? -PW - 6 : W() + 6;
    this.ty = this.y;
    this.state = 'leave';
  }
  startDrag(e) {
    e.preventDefault();
    this.state = 'drag';
    this.smashT = -1;
    this.onArrive = null;
    this.offX = e.clientX - this.x;
    this.offY = e.clientY - this.y;
    this.dragVX = 0;
    this.el.classList.add('dragging');
    this.say(line('drag'), 2000);
    dragging = this;
  }
  endDrag() {
    this.el.classList.remove('dragging');
    this.state = 'idle';
    this.vx = this.vy = 0;
    this.until = performance.now() + 1500;
    this.squash = 1;
    this.say(line('drop'), 2500);
  }
  smash() {
    if (this.busy()) return;
    this.state = 'smash';
    this.smashT = 0;
  }
  spin() {
    if (this.state === 'drag') return;
    this.spinT = 0;
    this.spinTurns = fairy ? 3 : 2;
    if (!this.clone) this.say(fill(pick(SPIN), stats()), 2600);
  }
  dance(kind = 'para') {
    if (this.busy()) return;
    const D = DANCES[kind] || DANCES.para;
    this.state = 'dance';
    this.danceKind = kind;
    this.actT = 0;
    this.actDur = D.dur;
    this.blasts = 0;
    this.say(fill(pick(D.lines || DANCE), stats()), 3500);
  }
  sleep() {
    if (this.busy()) return;
    this.state = 'sleep';
    this.actT = 0;
    this.actDur = 12;
    this.say('하아암', 1600);
    this.zzz = null;
  }
  rest() {
    if (this.busy()) return;
    this.state = 'rest';
    this.actT = 0;
    this.actDur = rand(5, 8);
    if (Math.random() < 0.5) this.say(pick(['좀 앉았다 가자', '다리 아프다', fill('{d}일 남았는데 벌써 지침', stats())]), 2200);
  }
  stretch() {
    if (this.busy()) return;
    this.state = 'stretch';
    this.actT = 0;
    this.actDur = 1.8;
  }
  wave() {
    if (this.busy()) return;
    this.state = 'wave';
    this.actT = 0;
    this.actDur = 1.6;
    if (mouse.seen) this.facing = mouse.x > this.x + PW / 2 ? 1 : -1;
    if (Math.random() < 0.6) this.say(pick(['안녕', '오 왔어?', '일 안 해?', fill('D-{d}', stats())]), 1800);
  }
  bread() {
    if (this.busy()) return;
    this.state = 'bread';
    this.actT = 0;
    this.actDur = 2.6;
    this.torn = false;
    if (!this.breadEl) {
      this.breadEl = document.createElement('div');
      this.breadEl.className = 'bread';
      this.breadEl.innerHTML = '<div class="bh l"><span>전역</span></div><div class="bh r"><span>빵</span></div><div class="bun"></div>';
      this.flipper.appendChild(this.breadEl);
    }
    this.breadEl.className = 'bread on';
    this.say(pick(['포카 뭐 나오지', '제발 SSR', '빵은 안 먹음', '띠부씰 말고 포카']), 1800);
  }
  morph() {
    if (this.morphed || this.clone) return;
    this.morphed = true;
    this.morphUntil = performance.now() + 20000;
    this.state = 'idle';
    this.until = performance.now() + 600;
    if (!this.morphEl) {
      this.morphEl = document.createElement('img');
      this.morphEl.className = 'morph';
      this.morphEl.alt = '';
      this.flipper.appendChild(this.morphEl);
    }
    this.morphView = '';
    this.rig.svg.style.visibility = 'hidden';
    this.morphEl.style.display = 'block';
    for (const el of [this.wheel, this.breadEl]) if (el) el.className = el.className.replace(/ on| press/g, '');
    makePoof(this.x + PW / 2, this.y + PH / 2);
    this.say(pick(['꽥', '20초만 오리할게', '나 지금 변신 중', '왕관 썼다 꽥']), 2200);
  }
  unmorph() {
    this.morphed = false;
    this.rig.svg.style.visibility = '';
    if (this.morphEl) this.morphEl.style.display = 'none';
    makePoof(this.x + PW / 2, this.y + PH / 2);
    this.say(pick(['원래대로', '변신 끝', fill('D-{d} 다시 시작', stats())]), 1800);
  }
  horn() {
    if (this.busy()) return;
    this.state = 'horn';
    this.actT = 0;
    this.actDur = 2.8;
    this.honks = 0;
    if (!this.wheel) {
      this.wheel = document.createElement('div');
      this.wheel.className = 'wheel';
      this.wheel.innerHTML = '<svg viewBox="-12 -12 24 24" width="100%" height="100%"><circle r="10" fill="none" stroke="#2b2622" stroke-width="3.4"/><circle r="10" fill="none" stroke="#5b5f66" stroke-width="2"/><path d="M-9.5 0 H9.5 M0 0 V9.5" stroke="#5b5f66" stroke-width="2.4" stroke-linecap="round"/><circle r="3.6" fill="#d9473a" stroke="#2b2622" stroke-width="1.2"/></svg>';
      this.flipper.appendChild(this.wheel);
    }
    this.wheel.classList.add('on');
    if (Math.random() < 0.6) this.say(pick(['비켜!', '전역 차 지나간다', '빵빵 비켜라', fill('D-{d} 남았다 빵빵', stats())]), 2200);
  }
  sign() {
    if (this.busy()) return;
    this.state = 'sign';
    this.actT = 0;
    this.actDur = 2.4;
    this.signed = false;
    this.say(fill(pick(SIGN), stats()), 3000);
  }
  slime() {
    if (this.busy()) return;
    this.state = 'slime';
    this.actT = 0;
    this.actDur = 3.4;
    this.pokes = 0;
    this.slimeColor = pick(SLIME_COLORS);
    const bx = this.facing > 0 ? this.x + PW - 6 : this.x - 74;
    this.slimeEl = makeSlimeBlob(clamp(bx, 0, W() - 80), this.y + PH - 56, this.slimeColor);
    this.say(pick(SLIME), 2500);
  }
  brush() {
    if (this.busy()) return;
    this.state = 'brush';
    this.actT = 0;
    this.actDur = 3.6;
    this.written = false;
    this.prevOutfit = this.rig.outfit;
    this.rig.setOutfit('kimono');
    this.say(pick(BRUSH), 2500);
  }
  flip() {
    if (this.busy()) return;
    this.state = 'flip';
    this.actT = 0;
    this.actDur = fairy ? 1.6 : 1.15;
    this.flipTurns = fairy ? 2 : 1;
    this.squash = 0.8;
  }
  sayRepeat(text, times) {
    let i = 0;
    const next = () => {
      if (i >= times || !this.el.isConnected) return;
      this.say(text, 2300);
      i++;
      setTimeout(next, 2200);
    };
    next();
  }
  toeUp() {
    if (this.busy()) return;
    this.state = 'toe';
    this.actT = 0;
    this.actDur = 3;
    this.say(fill(pick(TOE), stats()), 3000);
  }
  fingerStar() {
    if (this.busy()) return;
    this.state = 'star';
    this.actT = 0;
    this.actDur = 2.2;
    this.starDone = false;
    this.say(fill(pick(STAR), stats()), 3000);
  }
  grip() {
    if (this.busy() || !mouse.seen) return;
    this.state = 'grip-go';
    this.say('그립감 확인하러 감', 1800);
  }
  orbit() {
    if (this.busy()) return;
    this.orbitUntil = performance.now() + 6000;
    this.say(pick(['빙글빙글 감시 중', '마우스 포위 완료', `${stats().d}일 동안 따라다님`]), 3000);
  }
  scribble() {
    if (this.busy()) return;
    const s = stats();
    const text = fill(pick(SCRIBBLE), s);
    this.walkTo(rand(80, W() - 260), rand(fairy ? 90 : 160, H() - PH - 20));
    this.onArrive = () => {
      this.state = 'write';
      this.actT = 0;
      this.actDur = 1.6;
      makeScribble(this.x + (this.facing > 0 ? PW + 6 : -150), this.y + PH * 0.45, text);
      this.say('낙서 완료', 1800);
    };
  }
  tick(now) {
    const dt = clamp((now - this.last) / 1000, 0, 0.05);
    this.last = now;
    this.t += dt;
    let propA = 0;
    let hop = 0;
    let danceArm = null, danceLean = 0, danceLegs = null, darm = null, toe = null, toeLeg = null, gunOn = false, wide = false, crab = null, lie = 0, popAmt = 0, brushOn = false, jumpY = 0, flipA = 0, tuck = false, danceTilt = null, bentArms = null, profile = false, sit = 0, restLegs = null, mouthOpen = false, nodOverride = null, breatheOverride = null, blinkOverride = null;
    const fly = fairy;
    if (this.state === 'drag') {
      const nx = mouse.x - this.offX, ny = mouse.y - this.offY;
      const v = dt > 0 ? (nx - this.x) / dt : 0;
      this.x = nx;
      this.y = ny;
      this.dragVX = lerp(this.dragVX, v, Math.min(1, dt * 10));
      const target = clamp(-this.dragVX * 0.035, -40, 40);
      this.swingV += ((target - this.swingA) * 90 - this.swingV * 9) * dt;
      this.swingA += this.swingV * dt;
      this.phase += dt * 13;
      this.amp = lerp(this.amp, 0.9, Math.min(1, dt * 8));
      if (Math.abs(this.dragVX) > 60) this.facing = this.dragVX > 0 ? 1 : -1;
    } else {
      this.swingV += (-this.swingA * 90 - this.swingV * 9) * dt;
      this.swingA += this.swingV * dt;
      const free = this.state === 'idle' || this.state === 'walk';
      const chasing = now < this.chaseUntil && mouse.seen && free;
      const orbiting = now < this.orbitUntil && mouse.seen && free;
      if (orbiting) {
        const a = this.t * (fly ? 2.8 : 1.8);
        this.tx = clamp(mouse.x - PW / 2 + Math.cos(a) * 110, 0, W() - PW);
        this.ty = clamp(mouse.y - PH / 2 + Math.sin(a) * 80, 40, H() - PH);
        this.state = 'walk';
      } else if (chasing) {
        this.tx = clamp(mouse.x - PW / 2, 10, W() - PW - 10);
        this.ty = clamp(mouse.y + (fly ? -PH / 2 : 12), fly ? 40 : 120, H() - PH - 8);
        this.state = 'walk';
      }
      const gx = mouse.x - (this.facing > 0 ? PW * 0.78 : PW * 0.22), gy = mouse.y - PH * 0.22;
      if (this.state === 'grip-go') {
        this.tx = gx;
        this.ty = gy;
        if (Math.hypot(gx - this.x, gy - this.y) < 14) {
          this.state = 'grip';
          this.actT = 0;
          this.actDur = 2.8;
          this.say(fill(pick(GRIP), stats()), 3000);
        }
      }
      if (this.state === 'grip') {
        this.actT += dt;
        const k = Math.min(1, dt * 14);
        this.vx = 0;
        this.vy = 0;
        this.x += (gx - this.x) * k;
        this.y += (gy - this.y) * k;
        darm = [15, -150 + Math.sin(this.actT * 8) * 6];
        if (this.actT >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
          this.vx = this.vy = 0;
        }
      }
      if (this.state === 'walk' || this.state === 'leave' || this.state === 'grip-go') {
        const dx = this.tx - this.x, dy = this.ty - this.y;
        const dist = Math.hypot(dx, dy);
        const sp = this.maxSpeed * (fly ? 1.5 : 1) * (chasing || orbiting || this.state === 'grip-go' ? 2.4 : 1);
        const want = Math.min(sp, dist * (orbiting ? 6 : 2.2));
        const a = Math.min(1, dt * (fly ? 3 : 4.5));
        this.vx += ((dist ? (dx / dist) * want : 0) - this.vx) * a;
        this.vy += ((dist ? (dy / dist) * want : 0) - this.vy) * a;
        if (dist < 2.5 && Math.hypot(this.vx, this.vy) < 15 && !orbiting && this.state !== 'grip-go') {
          if (this.state === 'leave') {
            sendAway(this, { side: this.exitSide, y: this.y });
            return;
          }
          this.state = 'idle';
          this.until = now + rand(1200, 4000);
          if (this.onArrive) {
            const f = this.onArrive;
            this.onArrive = null;
            f();
          }
        }
      } else {
        const d = Math.max(0, 1 - dt * 7);
        this.vx *= d;
        this.vy *= d;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const speed = Math.hypot(this.vx, this.vy);
      this.phase += (speed * dt * 2 * Math.PI) / 58;
      this.amp = lerp(this.amp, Math.min(1, speed / 80), Math.min(1, dt * 10));
      if (this.vx > 12) this.facing = 1;
      else if (this.vx < -12) this.facing = -1;
      if (this.morphed) {
        if (now > this.morphUntil) this.unmorph();
        else {
          const view = speed > 20 ? 'side' : now % 9000 < 1200 ? 'back' : 'front';
          if (view !== this.morphView) {
            this.morphView = view;
            this.morphEl.src = MORPH_BASE + `duck_${view}.png`;
            this.morphEl.classList.toggle('side', view === 'side');
          }
          const hopY = speed > 20 ? -Math.abs(Math.sin(this.phase * 2)) * 6 : Math.sin(now / 400) * 1.2;
          const wob = speed > 20 ? Math.sin(this.phase * 2) * 6 : 0;
          this.morphEl.style.setProperty('--hop', hopY.toFixed(1) + 'px');
          this.morphEl.style.setProperty('--wob', wob.toFixed(1) + 'deg');
        }
      } else if (pendingMorph === this && this.state === 'idle' && !this.busy()) {
        pendingMorph = null;
        this.morph();
      }
      const near = mouse.seen && Math.hypot(mouse.x - (this.x + PW / 2), mouse.y - (this.y + PH / 2)) < 170;
      if (this.state === 'idle' && now > this.until && !this.clone && !duoPending) {
        const r = Math.random();
        if (near && r < 0.35) this.wave();
        else if (r < 0.12) this.rest();
        else if (r < 0.2) { this.stretch(); }
      }
      if (this.state === 'idle' && now > this.until) {
        if (!this.clone && screens > 1 && Math.random() < 0.12) this.leave(Math.random() < 0.5 ? 'left' : 'right');
        else if (fly || this.clone || Math.random() < 0.3) this.walkTo(rand(0, W()), rand(0, H()));
        else this.walkTo(this.x + rand(-500, 500), this.y + rand(-250, 250));
      }
      if (this.state === 'smash') {
        const prev = this.smashT;
        this.smashT += dt / 0.95;
        const t = this.smashT;
        const eo = (u) => 1 - (1 - u) * (1 - u);
        if (t < 0.4) propA = -50 * eo(t / 0.4);
        else if (t < 0.52) propA = -50 + 92 * Math.pow((t - 0.4) / 0.12, 2);
        else propA = 42 * (1 - eo(Math.min(1, (t - 0.52) / 0.48)));
        hop = t < 0.52 ? -2.5 * Math.sin((t / 0.52) * Math.PI) : 0;
        if (prev < 0.52 && t >= 0.52) {
          const cx = this.x + (this.facing > 0 ? PW * 0.98 : PW * 0.02);
          makeCrack(cx, this.y + PH * (this.slot === 'a' ? 0.5 : 0.42));
          this.say(line('smash'));
          this.squash = 0.6;
        }
        if (t >= 1) {
          this.state = 'idle';
          this.smashT = -1;
          this.until = now + 2500;
        }
      }
      if (this.state === 'brush') {
        this.actT += dt;
        const t = this.actT;
        brushOn = true;
        darm = [20, -95 + Math.sin(t * 7) * 30];
        danceLean = 4;
        if (!this.written && t > 0.4) {
          this.written = true;
          const fsz = Math.min(W() * 0.13, H() * 0.22, 170);
          const pw = fsz * (3 * 1.05 + 0.9);
          let bx = this.facing > 0 ? this.x + PW + 30 + pw / 2 : this.x - 30 - pw / 2;
          if (bx + pw / 2 > W() - 10 || bx - pw / 2 < 10) bx = this.facing > 0 ? this.x - 30 - pw / 2 : this.x + PW + 30 + pw / 2;
          makeBrushWriting(bx, this.y + PH * 0.35, '오이쉬');
          this.squash = 0.4;
        }
        if (t >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
          const want = ((cfg && cfg.outfits) || {})[this.slot] || 'military';
          this.rig.setOutfit(want);
          this.say('작품 완성', 2200);
        }
      }
      if (this.state === 'flip') {
        this.actT += dt;
        const t = Math.min(1, this.actT / this.actDur);
        const air = t > 0.12 && t < 0.92 ? (t - 0.12) / 0.8 : t <= 0.12 ? 0 : 1;
        jumpY = -Math.sin(air * Math.PI) * (fairy ? 160 : 130);
        flipA = -360 * this.flipTurns * easeIO(air);
        if (air > 0 && air < 1) { toeLeg = null; crab = null; tuck = true; }
        if (t < 0.12) { hop = 2; }
        if (this.actT >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
          this.squash = 1;
          this.say(fill(pick(FLIP.slice(1)), stats()), 2500);
        } else if (air > 0 && !this.flipSaid) { this.flipSaid = true; this.say('공중제비!', 1400); }
        if (this.actT >= this.actDur) this.flipSaid = false;
      }
      if (this.state === 'sleep') {
        this.actT += dt;
        const t = this.actT, T = this.actDur;
        const ph = (a, b) => clamp((t - a) / (b - a), 0, 1);
        const up = ph(0, 0.5) * (1 - ph(0.6, 0.9));
        const wake = ph(T - 1.6, T - 0.9);
        const stand = ph(T - 0.9, T - 0.3);
        sit = easeIO(ph(0.8, 1.4)) * (1 - easeIO(stand));
        lie = easeIO(ph(3.3, 4.1)) * (1 - easeIO(wake));
        if (up > 0) { darm = [150 * up + 10, -150 * up - 10]; mouthOpen = true; }
        if (t > 1.5 && t < 3.3) { nodOverride = 3 + Math.max(0, Math.sin((t - 1.5) * 2.4)) * 4; blinkOverride = 0.25; danceTilt = 6; }
        if (lie > 0) {
          if (!this.zzz && lie > 0.6) this.zzz = makeZzz(this.x + PW / 2 + (this.facing > 0 ? -60 : 60), this.y - 30);
          if (lie > 0.5) blinkOverride = 0.08;
          breatheOverride = Math.sin(this.t * 1.8);
        }
        if (wake > 0 && this.zzz) { const z = this.zzz; z.classList.add('out'); setTimeout(() => z.remove(), 600); this.zzz = null; }
        if (stand > 0.3) { const s2 = Math.sin(clamp((t - (T - 0.6)) / 0.6, 0, 1) * Math.PI); if (s2 > 0) { darm = [10 + 140 * s2, -10 - 140 * s2]; mouthOpen = s2 > 0.4; } }
        if (t >= T) {
          this.state = 'idle';
          this.until = now + 1500;
          if (this.zzz) { const z = this.zzz; z.classList.add('out'); setTimeout(() => z.remove(), 600); this.zzz = null; }
          this.say('잘 잤다. 근데 아직 ' + stats().d + '일', 2500);
        }
      }
      if (this.state === 'rest') {
        this.actT += dt;
        const t = this.actT, T = this.actDur;
        sit = easeIO(clamp(t / 0.6, 0, 1)) * (1 - easeIO(clamp((t - (T - 0.6)) / 0.6, 0, 1)));
        restLegs = [Math.sin(t * 3.2) * 12, Math.sin(t * 3.2 + 1.6) * 12];
        darm = [25, -25];
        danceTilt = Math.sin(t * 0.8) * 10;
        if (t >= T) { this.state = 'idle'; this.until = now + 1200; }
      }
      if (this.state === 'stretch') {
        this.actT += dt;
        const k = Math.sin(clamp(this.actT / this.actDur, 0, 1) * Math.PI);
        darm = [10 + 150 * k, -10 - 150 * k];
        mouthOpen = k > 0.5;
        if (k > 0.5) blinkOverride = 0.15;
        popAmt = -0.4 * k;
        hop = -1.5 * k;
        if (this.actT >= this.actDur) { this.state = 'idle'; this.until = now + 1200; }
      }
      if (this.state === 'wave') {
        this.actT += dt;
        darm = [12, -150 + Math.sin(this.actT * 14) * 22];
        danceTilt = 5;
        if (this.actT >= this.actDur) { this.state = 'idle'; this.until = now + 1500; }
      }
      if (this.state === 'bread') {
        this.actT += dt;
        const t = this.actT;
        darm = t < 0.9 ? [-40, -40] : [-70 + Math.sin(t * 30) * 4, -20];
        danceLean = t > 0.9 && t < 1.2 ? 4 : 1;
        if (!this.torn && t > 0.95) {
          this.torn = true;
          this.breadEl.className = 'bread on torn';
          setTimeout(() => showCard(), 250);
        }
        if (t >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
          this.breadEl.className = 'bread';
        }
      }
      if (this.state === 'horn') {
        this.actT += dt;
        const t = this.actT;
        const hits = [0.35, 0.62, 1.55, 1.82];
        const press = hits.some((h) => t > h - 0.08 && t < h + 0.1);
        darm = [12, press ? -48 : -66];
        danceLean = press ? 3 : 1;
        if (this.wheel) this.wheel.classList.toggle('press', press);
        if (this.honks < 2 && t > [0.35, 1.55][this.honks]) {
          makeBlast(this.x + PW / 2 + (this.honks ? 60 : -60), this.y - 40, '빵빵!');
          this.honks++;
        }
        if (t >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
          if (this.wheel) this.wheel.classList.remove('on', 'press');
        }
      }
      if (this.state === 'sign') {
        this.actT += dt;
        const t = this.actT;
        darm = [12, -70 + Math.sin(t * 26) * 18];
        danceLean = 3;
        if (!this.signed && t > 0.3) {
          this.signed = true;
          const sx = this.facing > 0 ? this.x + PW + 10 : this.x - 200;
          makeSign(clamp(sx, 20, W() - 300), clamp(this.y + 10, 80, H() - 110), pick(SIGN_TEXTS));
        }
        if (t >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
        }
      }
      if (this.state === 'slime') {
        this.actT += dt;
        const t = this.actT;
        const pokeAt = [0.6, 1.4, 2.2];
        const ph = pokeAt.find((p) => t >= p && t < p + 0.35);
        darm = [12, ph != null ? -75 + Math.sin(((t - ph) / 0.35) * Math.PI) * -15 : -30];
        if (this.pokes < pokeAt.length && t >= pokeAt[this.pokes]) {
          this.pokes++;
          if (this.slimeEl) {
            this.slimeEl.classList.remove('jiggle');
            void this.slimeEl.offsetWidth;
            this.slimeEl.classList.add('jiggle');
          }
          if (this.pokes === pokeAt.length && this.slimeEl) {
            const r = this.slimeEl.getBoundingClientRect();
            this.slimeEl.remove();
            this.slimeEl = null;
            makeSplats(r.left + 40, r.top + 30, this.slimeColor);
            this.squash = 1;
            this.say('으악 터졌다', 2500);
          }
        }
        if (t >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
          if (this.slimeEl) { this.slimeEl.remove(); this.slimeEl = null; }
        }
      }
      if (this.state === 'star') {
        this.actT += dt;
        const t = this.actT;
        const k = easeIO(Math.min(1, t / 0.35)) * (1 - easeIO(Math.max(0, Math.min(1, (t - 1.8) / 0.4))));
        darm = [12, -20 - 125 * k];
        danceLean = -3 * k;
        if (!this.starDone && t > 0.4) {
          this.starDone = true;
          makeStar(this.x + (this.facing > 0 ? PW * 0.86 : PW * 0.14), this.y + PH * 0.2);
        }
        if (t >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
        }
      }
      if (this.state === 'toe') {
        this.actT += dt;
        const t = this.actT;
        const up = Math.min(1, t / 0.45), down = Math.max(0, (t - (this.actDur - 0.45)) / 0.45);
        const k = easeIO(up) * (1 - easeIO(Math.min(1, down)));
        toeLeg = -82 * k;
        toe = k > 0.6 ? Math.sin(t * 9) * 14 : 0;
        danceLean = -9 * k;
        hop = -2 * k;
        darm = [45 * k + 10, -160 * k - 5];
        if (k > 0.9 && now > this.sparkAt) {
          this.sparkAt = now + 160;
          makeSpark(this.x + (this.facing > 0 ? PW * 0.9 : PW * 0.1), this.y + PH * 0.6);
        }
        if (t >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
        }
      }
      if (this.state === 'dance' || this.state === 'write') {
        this.actT += dt;
        if (this.state === 'dance') {
          const D = DANCES[this.danceKind] || DANCES.para;
          const pat = D.pat || PP;
          const beatLen = D.beat;
          const beat = this.actT / beatLen;
          const bi = Math.floor(beat), u = beat - bi;
          const from = pat[(bi + pat.length - 1) % pat.length], to = pat[bi % pat.length];
          const k = Math.min(1, u / (this.danceKind === 'whistle' ? 0.25 : this.danceKind === 'neon' ? 0.08 : this.danceKind === 'pop' ? 0.15 : 0.4));
          const e = 1 - (1 - k) * (1 - k);
          const wave = this.danceKind === 'para' ? Math.sin(this.actT * 38) * 9 : 0;
          darm = [from[0] + (to[0] - from[0]) * e + wave, from[1] + (to[1] - from[1]) * e - wave];
          if (this.danceKind === 'neon') {
            const hit = u < 0.18 ? 1 - u / 0.18 : 0;
            this.facing = 1;
            danceLean = 0;
            danceLegs = 7;
            hop = -0.8 * hit;
            popAmt = 0.35 * hit;
            wide = true;
            danceTilt = 0;
            if (u < 0.15 && this.lastBeat !== bi) {
              this.lastBeat = bi;
              this.el.style.setProperty('--neon', NEON_COLORS[bi % 2 ? 1 : 0]);
              if (bi % 2 === 0) makeSpark(this.x + PW / 2 + rand(-24, 24), this.y + PH * rand(0.3, 0.55));
            }
          } else if (this.danceKind === 'pop') {
            const heavy = bi % 2 === 0;
            const last = this.actT > D.dur - beatLen * 2;
            const hit = heavy && u < 0.22 ? 1 - u / 0.22 : 0;
            popAmt = hit * (last ? 1.8 : 1);
            danceLean = -5 * hit * (last ? 1.4 : 1);
            crab = 12;
            hop = 0;
            bentArms = [null, -8 - 14 * hit];
            darm = [10 + 4 * hit, 0];
            danceTilt = Math.sin(this.actT * 0.55) * 7;
            profile = true;
          } else if (this.danceKind === 'shimmy') {
            danceLean = Math.sin(this.actT * 46) * 4;
            danceLegs = Math.sin(this.actT * 23) * 6;
            hop = -0.8 * Math.abs(Math.sin(this.actT * 23));
          } else if (this.danceKind === 'heart') {
            danceLean = Math.sin(this.actT * 3) * 5;
            danceLegs = (bi % 2 ? 1 : -1) * 8 * Math.sin(u * Math.PI);
            hop = -1.5 * Math.sin(u * Math.PI);
            if (bi % 2 === 0 && u < 0.15 && this.lastBeat !== bi) {
              this.lastBeat = bi;
              makeHeart(this.x + PW / 2 + rand(-20, 20), this.y - 10);
            }
          } else if (this.danceKind === 'power') {
            danceLean = (bi % 2 ? 1 : -1) * 6;
            danceLegs = (bi % 2 ? 1 : -1) * 22 * Math.sin(u * Math.PI);
            hop = -3 * Math.sin(u * Math.PI);
            if (u < 0.12 && this.lastBeat !== bi) { this.lastBeat = bi; this.squash = 0.5; }
          } else if (this.danceKind === 'cheer') {
            const jump = Math.floor(bi / 2) % 2 === 0;
            hop = jump ? -7 * Math.sin(u * Math.PI) : -1.5 * Math.sin(u * Math.PI);
            danceLegs = jump ? 18 * Math.sin(u * Math.PI) : 0;
            danceLean = 0;
            const times = [0.3, 2.4, 4.4];
            if (this.blasts < times.length && this.actT >= times[this.blasts]) {
              makeBlast(this.x + PW / 2, this.y - 30, fill(CHEER_SHOUTS[this.blasts], stats()));
              this.blasts++;
              this.squash = 0.7;
            }
          } else if (this.danceKind === 'whistle') {
            crab = 24 + Math.sin(this.actT * 16) * 14;
            const sec = Math.floor(bi / 4) % 4;
            const pulse = Math.sin(u * Math.PI);
            if (sec === 0 || sec === 3) {
              darm = [-125 + pulse * 4, sec === 0 ? -90 : -165 + pulse * 8];
              gunOn = sec === 0;
              danceLegs = (bi % 2 ? 1 : -1) * 8 * pulse;
              hop = -1.5 * pulse;
              wide = true;
            } else if (sec === 1) {
              darm = [30 + Math.sin(this.actT * 22) * 28, -30 + Math.sin(this.actT * 22) * 28];
              danceLegs = Math.sin(this.actT * 22) * 24;
              danceLean = 8;
              hop = -2.2 * Math.abs(Math.sin(this.actT * 11));
            } else {
              darm = [-125, bi % 2 ? -62 : -100];
              gunOn = true;
              danceLegs = (bi % 2 ? 1 : -1) * 10 * pulse;
              if (u < 0.2 && this.lastBeat !== bi) { this.lastBeat = bi; if (bi % 2 === 0) this.facing *= -1; }
            }
            const times = [0.05, 2.6, 3.9];
            if (this.blasts < times.length && this.actT >= times[this.blasts]) {
              makeBlast(this.x + PW / 2, this.y - 30, BLASTS[this.blasts]);
              this.blasts++;
              this.squash = 0.7;
            }
          } else {
            danceLean = Math.sin(bi * Math.PI * 0.5) * 4;
            danceLegs = (bi % 2 ? 1 : -1) * 9;
            hop = -1.8 * Math.sin(u * Math.PI);
            if (bi % 8 === 0 && u < 0.2) this.facing = (bi / 8) % 2 ? -1 : 1;
          }
        } else {
          propA = Math.sin(this.actT * 30) * 6;
          danceArm = -60 + Math.sin(this.actT * 30) * 15;
        }
        if (this.actT >= this.actDur) {
          this.state = 'idle';
          this.until = now + 1500;
          this.neonSpun = false;
          this.danceKind = null;
        }
      }
    }

    if (this.blinkT < 0 && now > this.blinkAt) {
      this.blinkT = 0;
      this.blinkAt = now + (Math.random() < 0.2 ? 260 : rand(2400, 5600));
    }
    let blink = 1;
    if (this.blinkT >= 0) {
      this.blinkT += dt / 0.15;
      blink = 1 - Math.sin(Math.min(1, this.blinkT) * Math.PI) * 0.9;
      if (this.blinkT >= 1) this.blinkT = -1;
    }
    if (blinkOverride != null) blink = blinkOverride;
    if (now > this.tiltAt) {
      this.tiltTarget = this.state === 'idle' ? rand(-7, 7) : rand(-2, 2);
      this.tiltAt = now + rand(1600, 4200);
    }
    this.tilt = lerp(this.tilt, this.tiltTarget, Math.min(1, dt * 2.5));
    const talking = now < this.talkUntil;
    const breathe = Math.sin((this.t * 2 * Math.PI) / 3.3);
    const dragging_ = this.state === 'drag';
    this.squash = Math.max(0, this.squash - dt * 4);
    const sq = Math.sin(this.squash * Math.PI * 0.5);
    const sway = Math.sin(this.phase);
    const moving = Math.hypot(this.vx, this.vy) > 20;
    let bob, legL, legR, arm, lean, wing = 0, shadow, shadowScale, hover = 0;
    if (fly && !dragging_) {
      hover = Math.sin(this.t * 2.3) * 7;
      bob = hop;
      legL = 12 + Math.sin(this.t * 3) * 8;
      legR = -12 + Math.sin(this.t * 3 + 1.3) * 8;
      arm = Math.sin(this.t * 4) * 12;
      lean = this.amp * 10;
      wing = 12 + Math.sin(this.t * (moving ? 24 : 14)) * 30;
      shadow = 0;
      shadowScale = 0.5;
      if (now > this.sparkAt) {
        this.sparkAt = now + (moving ? 70 : 220);
        makeSpark(this.x + PW / 2 - this.facing * PW * 0.3 + rand(-8, 8), this.y + PH * 0.55 + hover + rand(-8, 8));
      }
    } else {
      bob = -Math.abs(sway) * 2.6 * this.amp + breathe * 0.45 * (1 - this.amp) + hop;
      legL = sway * 30 * this.amp;
      legR = -sway * 30 * this.amp;
      arm = -sway * 24 * this.amp + breathe * 1.5 + (dragging_ ? Math.sin(this.t * 9) * 12 : 0);
      lean = dragging_ ? 0 : 3.5 * this.amp;
      wing = fly ? 40 + Math.sin(this.t * 30) * 30 : 0;
      shadow = dragging_ ? 0.07 : 0.2;
      shadowScale = dragging_ ? 0.6 : 1 + bob * 0.03;
    }
    if (danceArm != null) arm = danceArm;
    if (danceLegs != null) { legL = danceLegs; legR = -danceLegs * 0.6; }
    if (danceLean) lean = danceLean;
    if (toeLeg != null) { legR = toeLeg; legL = 4; }
    if (crab != null) { legL = crab; legR = -crab; bob += 1.5; }
    if (tuck) { legL = -35; legR = -55; darm = [150, -150]; }
    if (sit > 0) {
      legL = -82 * sit + (restLegs ? restLegs[0] * sit : 0);
      legR = -82 * sit + (restLegs ? restLegs[1] * sit : 0);
      bob += 17 * sit;
      lean = lean * (1 - sit);
    }
    if (lie > 0) {
      legL = -82 * sit * (1 - lie) - 28 * lie;
      legR = -82 * sit * (1 - lie) - 40 * lie;
      bob -= 10 * lie;
      darm = [160 * lie + 10, -20];
      lean = 0;
    }
    if (breatheOverride != null) bob += breatheOverride * 0.8;
    if (this.state !== 'smash' && this.state !== 'dance' && this.state !== 'write') {
      if (this.slot === 'b' && talking) propA = -5 + Math.sin(this.t * 6) * 2;
      else propA = sway * 3 * this.amp;
    }

    let spinA = 0;
    if (this.spinT >= 0) {
      this.spinT += dt / (fly ? 1.1 : 0.9);
      spinA = 360 * this.spinTurns * easeIO(Math.min(1, this.spinT));
      if (this.spinT >= 1) this.spinT = -1;
    }

    let scale = 1;
    if (this.dieAt) {
      const left = this.dieAt - now;
      if (left < 300) scale = Math.max(0, left / 300);
      if (left <= 0) {
        removeClone(this);
        return;
      }
    }

    this.rig.pose({
      legL, legR, arm, bob, lean, wing, darm, toe, bent: bentArms,
      blink: wide && blink > 0.95 ? 1.25 : blink,
      whistle: this.state === 'dance' && this.danceKind === 'whistle',
      gun: gunOn,
      brush: brushOn,
      tilt: danceTilt != null ? danceTilt : this.tilt + (dragging_ ? Math.sin(this.t * 7) * 4 : 0),
      nod: nodOverride != null ? nodOverride : talking ? Math.sin(this.t * 12) * 0.9 : 0,
      sit,
      mouth: mouthOpen || (talking && Math.sin(this.t * 24) > -0.1),
      prop: propA,
      sx: 1 + 0.09 * sq + 0.07 * popAmt,
      sy: 1 - 0.11 * sq - 0.03 * popAmt,
      shadow,
      shadowScale,
    });
    this.el.classList.toggle('flip', this.facing < 0);
    const prof = profile ? `scaleX(${(this.facing < 0 ? -1 : 1) * 0.62})` : '';
    if (prof !== this.profStyle) { this.profStyle = prof; this.flipper.style.transform = prof; }
    this.el.classList.toggle('neon', this.state === 'dance' && this.danceKind === 'neon');
    this.swingEl.style.transformOrigin = lie > 0 ? '50% 92%' : spinA || flipA ? '50% 55%' : '50% 22%';
    this.swingEl.style.transform = `rotate(${(this.swingA + spinA + flipA - 78 * lie * (this.facing < 0 ? -1 : 1)).toFixed(2)}deg)${scale !== 1 ? ` scale(${scale.toFixed(3)})` : ''}`;
    const ht = this.rig.headTop();
    const tagTop = Math.round(Math.min(-8, ht * (PW / 100) - 20));
    if (tagTop !== this.tagTop) {
      this.tagTop = tagTop;
      this.tag.style.top = tagTop + 'px';
      this.bubble.style.bottom = (118 + Math.max(0, -8 - tagTop)) + 'px';
    }
    this.el.style.transform = `translate(${this.x.toFixed(1)}px, ${(this.y + hover + jumpY).toFixed(1)}px)`;
  }
}

const mouse = { x: 0, y: 0, seen: false };
let dragging = null;
let ignoring = true;
let pets = {};
let clones = [];
let screens = 1;
const list = () => Object.values(pets);
const outside = (x, y) => x < 0 || y < 0 || x > W() || y > H();

function setIgnore(v) {
  if (v !== ignoring) {
    ignoring = v;
    env.setIgnore(v);
  }
}

function removeClone(c) {
  for (let i = 0; i < 6; i++) makeSpark(c.x + PW / 2 + rand(-25, 25), c.y + PH / 2 + rand(-30, 30));
  c.destroy();
  clones = clones.filter((q) => q !== c);
}

async function cloneJutsu(p) {
  if (!p || p.busy() || clones.length) return;
  p.say(fill(pick(CLONE), stats()), 3500);
  p.spin();
  const n = 4;
  for (let i = 0; i < n; i++) {
    const c = new Pet(p.slot, p.x, p.y, { clone: true, life: rand(6500, 9000) });
    await c.rig.setOutfit(p.rig.outfit);
    c.facing = p.facing;
    clones.push(c);
    if (p.rig.photoUrl && p.rig.params) {
      await c.rig.setPhoto(p.rig.photoUrl);
      c.rig.place(p.rig.params);
    }
    const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
    c.walkTo(p.x + Math.cos(a) * rand(220, 420), p.y + Math.sin(a) * rand(140, 260));
    for (let k = 0; k < 4; k++) makeSpark(p.x + PW / 2 + rand(-30, 30), p.y + PH / 2 + rand(-30, 30));
    if (Math.random() < 0.5) setTimeout(() => c.spin(), rand(800, 3000));
  }
}

let faceQueue = Promise.resolve(false);
function applyFaces() {
  faceQueue = faceQueue.then(async () => {
    let changed = false;
    for (const p of list()) {
      const f = await env.faceFor(p.slot, cfg);
      const key = f ? f.key : '';
      if (key === p.faceKey) continue;
      p.faceKey = key;
      changed = true;
      try {
        if (!f) {
          await p.rig.setPhoto(null);
          continue;
        }
        const img = await p.rig.setPhoto(f.url);
        p.rig.place(f.params || (await CharFit(img)));
      } catch (e) {
        await p.rig.setPhoto(null);
      }
    }
    return changed;
  });
  return faceQueue;
}

function applyOutfits() {
  const o = (cfg && cfg.outfits) || {};
  list().forEach((p) => { if (p.state !== 'brush') p.rig.setOutfit(o[p.slot]); });
}

const frameEl = document.getElementById('frame');
let frameKey = '';
async function applyFrame() {
  if (!frameEl) return;
  const on = cfg && cfg.capture === 'photo' && !!cfg.frameOnScreen;
  frameEl.hidden = !on;
  if (!on) return;
  const style = cfg.frameStyle || 'white';
  const url = style === 'custom' && env.frameFor ? await env.frameFor(cfg) : null;
  const key = url ? 'img' + url.length + url.slice(-30) : 'b-' + style;
  if (key !== frameKey) {
    frameKey = key;
    frameEl.className = url ? 'fs-custom' : 'fs-' + (style === 'custom' ? 'white' : style);
    frameEl.innerHTML = url
      ? `<img src="${url}" alt="">`
      : '<div class="fb fb-top"><span class="fb-deco"></span><span class="fb-title">전역까지</span><span class="fb-deco"></span></div>' +
        '<div class="fb fb-bottom"><span class="fb-dday"></span><span class="fb-date"></span></div><div class="fb fb-left"></div><div class="fb fb-right"></div>';
  }
  refreshFrameText();
}
function refreshFrameText() {
  if (!frameEl || frameEl.hidden) return;
  const s = stats();
  const dd = frameEl.querySelector('.fb-dday');
  const dt = frameEl.querySelector('.fb-date');
  if (dd) dd.textContent = s.d > 0 ? `D-${s.d}` : s.d === 0 ? 'D-DAY' : `D+${-s.d}`;
  if (dt) {
    const n = new Date();
    dt.textContent = `${n.getFullYear()}.${String(n.getMonth() + 1).padStart(2, '0')}.${String(n.getDate()).padStart(2, '0')}`;
  }
}

function applyMode() {
  const next = !!(cfg && cfg.mode === 'fairy');
  const changed = next !== fairy;
  fairy = next;
  list().concat(clones).forEach((p) => {
    p.rig.setFairy(fairy);
    if (changed && !p.busy()) p.walkTo(p.x + rand(-80, 80), fairy ? p.y - rand(80, 200) : p.y + rand(60, 160));
  });
  return changed;
}

function spawn({ slot, x, y, enter, dragged }) {
  if (pets[slot]) return;
  const px = x ?? (W() * 0.35 + (slot === 'b' ? 120 : 0));
  const py = clamp(y ?? H() - PH - 30, 50, H() - PH - 8);
  const p = new Pet(slot, px, py);
  pets[slot] = p;
  refreshTags();
  applyFaces();
  if (enter === 'left') { p.x = -PW; p.walkTo(rand(120, 300), p.y); }
  if (enter === 'right') { p.x = W(); p.walkTo(W() - rand(200, 380), p.y); }
  if (enter) p.say(fill(pick(ARRIVE), stats()), 3000);
  if (dragged) { p.squash = 1; p.say(line('drop'), 2500); }
}

function sendAway(p, info) {
  if (dragging === p) dragging = null;
  p.destroy();
  delete pets[p.slot];
  setIgnore(true);
  env.petExit({ slot: p.slot, ...info });
}

document.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.seen = true;
  if (dragging && screens > 1 && outside(e.clientX, e.clientY)) {
    const p = dragging;
    sendAway(p, { x: e.clientX - p.offX, y: e.clientY - p.offY, px: e.clientX, py: e.clientY });
    return;
  }
  const hit = document.elementFromPoint(e.clientX, e.clientY) || document.body;
  const over = !!(dragging || (hit.closest('.pet') && !hit.closest('.pet.clone')));
  setIgnore(!over);
});
document.addEventListener('mouseup', (e) => {
  if (!dragging) return;
  const p = dragging;
  if (screens > 1 && outside(e.clientX, e.clientY)) {
    sendAway(p, { x: e.clientX - p.offX, y: e.clientY - p.offY, px: e.clientX, py: e.clientY });
    return;
  }
  p.x = clamp(p.x, 0, W() - PW);
  p.y = clamp(p.y, fairy ? 40 : 110, H() - PH);
  p.endDrag();
  dragging = null;
});
document.addEventListener('dblclick', (e) => {
  const el = e.target.closest && e.target.closest('.pet');
  const p = list().find((q) => q.el === el);
  if (p) p.say(line());
});
window.addEventListener('resize', () => {
  list().forEach((p) => {
    p.x = clamp(p.x, 0, W() - PW);
    p.y = clamp(p.y, 40, H() - PH);
    if (p.state === 'walk') p.walkTo(p.tx, p.ty);
  });
});

function refreshTags() {
  const s = stats();
  const t = s.d > 0 ? `D-${s.d}` : s.d === 0 ? 'D-DAY' : `D+${-s.d}`;
  list().forEach((p) => p.setTag(t));
  refreshFrameText();
}

function chatter() {
  setTimeout(chatter, rand(9000, 22000));
  const here = list().filter((p) => !p.busy());
  if (!here.length) return;
  const [a, b] = Math.random() < 0.5 ? here : here.slice().reverse();
  const r = Math.random();
  if (r < 0.2 && b) {
    const pair = duo();
    if (pair) {
      a.say(pair[0], 3500);
      setTimeout(() => {
        if (pets[b.slot] !== b) return;
        b.say(pair[1], 4000);
        if (pair[1].includes('파라파라')) setTimeout(() => { b.dance(); if (pets[a.slot] === a) a.dance(); }, 900);
      }, 2200);
    } else a.say(line());
  } else if (r < 0.3) a.smash();
  else if (r < 0.4) {
    if (Math.random() < 0.5) a.orbit();
    else {
      a.chaseUntil = performance.now() + 5000;
      a.say(pick(['어디 가', '마우스 잡는다', `${stats().d}일 동안 쫓아감`]), 3000);
    }
  } else if (r < 0.5) a.spin();
  else if (r < 0.6) a.scribble();
  else if (r < 0.7) { const k = pick(['para', 'whistle', 'shimmy', 'heart', 'power', 'cheer', 'pop']); if (k === 'pop') duoDance(k); else a.dance(k); }
  else if (r < 0.77) cloneJutsu(a);
  else if (r < 0.78) a.toeUp();
  else if (r < 0.79) a.horn();
  else if (r < 0.795) a.bread();
  else if (r < 0.8) a.sleep();
  else if (r < 0.81) a.rest();
  else if (r < 0.82) a.sign();
  else if (r < 0.84) a.slime();
  else if (r < 0.85) a.sayRepeat(REPEAT_LINE, 5);
  else if (r < 0.88) a.flip();
  else if (r < 0.9) a.brush();
  else if (r < 0.89) a.fingerStar();
  else if (r < 0.94) a.grip();
  else a.say(line());
}

function loop(now) {
  list().forEach((p) => p.tick(now));
  checkDuo(now);
  clones.slice().forEach((c) => c.tick(now));
  requestAnimationFrame(loop);
}

const pickPet = (slot) => pets[slot] || list()[0];

let duoPending = null;
function duoDance(kind) {
  const ps = list().filter((p) => p.state !== 'drag' && p.state !== 'leave');
  if (ps.length < 2) { if (ps[0]) ps[0].dance(kind); return; }
  ps.forEach((p) => { if (p.busy()) { p.state = 'idle'; p.smashT = -1; p.danceKind = null; } });
  const [l, r] = ps[0].x <= ps[1].x ? ps : [ps[1], ps[0]];
  const mx = clamp((l.x + r.x) / 2, 80, W() - PW - 80);
  const my = clamp((l.y + r.y) / 2, fairy ? 80 : 140, H() - PH - 20);
  duoPending = { kind, pets: [l, r], at: performance.now() };
  l.ready = false;
  r.ready = false;
  l.walkTo(mx - 52, my);
  r.walkTo(mx + 52, my);
  l.onArrive = () => { l.ready = true; l.facing = 1; l.until = performance.now() + 10000; };
  r.onArrive = () => { r.ready = true; r.facing = -1; r.until = performance.now() + 10000; };
  l.say(pick(['모여!', '같이 춰', '자리 잡아']), 1600);
}
function checkDuo(now) {
  if (!duoPending) return;
  const { kind, pets: ps, at } = duoPending;
  if (ps.some((p) => !p.el.isConnected)) { duoPending = null; return; }
  if (ps.every((p) => p.ready) || now - at > 6000) {
    duoPending = null;
    ps.forEach((p) => { p.state = 'idle'; p.onArrive = null; p.vx = p.vy = 0; p.dance(kind); p.actT = 0; p.lastBeat = -1; if (kind === 'pop') p.facing = 1; });
  }
}

window.petWorld = {
  start(c, slots, n) {
    cfg = c;
    screens = n || 1;
    fairy = cfg.mode === 'fairy';
    slots.forEach((slot) => spawn({ slot }));
    applyFrame();
    setInterval(refreshTags, 60000);
    requestAnimationFrame(loop);
    const first = list()[0];
    if (first) setTimeout(() => first.say(line()), 1200);
    setTimeout(chatter, rand(8000, 14000));
    scheduleMorph();
  },
  async setConfig(c) {
    cfg = c;
    refreshTags();
    const modeChanged = applyMode();
    applyOutfits();
    applyFrame();
    if (cfg.capture === 'photo' && cfg.frameOnScreen) list().forEach((p) => { if (!p.busy() && p.y > H() - PH - 70) p.walkTo(p.x, H() - PH - 80); });
    const changed = await applyFaces();
    const first = list()[0];
    if (!first) return;
    if (modeChanged) first.say(fairy ? '요정 모드 발동. 그래도 전역은 그대로' : '착지. 다시 걸어서 {d}일'.replace('{d}', stats().d));
    else first.say(changed ? '얼굴 바꿨다. 그래도 전역일은 그대로' : line());
  },
  spawn: (info) => { if (cfg) spawn(info); },
  poke: (slot) => { const p = pickPet(slot); if (p) p.say(line()); },
  smash: (slot) => { const p = pickPet(slot); if (p) p.smash(); },
  spin: (slot) => { const p = pickPet(slot); if (p) p.spin(); },
  dance: (slot) => { const p = pickPet(slot); if (p) p.dance('para'); },
  neon: () => duoDance('neon'),
  whistle: (slot) => { const p = pickPet(slot); if (p) p.dance('whistle'); },
  scribble: (slot) => { const p = pickPet(slot); if (p) p.scribble(); },
  clone: (slot) => cloneJutsu(pickPet(slot)),
  orbit: (slot) => { const p = pickPet(slot); if (p) p.orbit(); },
  toe: (slot) => { const p = pickPet(slot); if (p) p.toeUp(); },
  sleep: (slot) => { const p = pickPet(slot); if (p) p.sleep(); },
  rest: (slot) => { const p = pickPet(slot); if (p) p.rest(); },
  stretch: (slot) => { const p = pickPet(slot); if (p) p.stretch(); },
  wave: (slot) => { const p = pickPet(slot); if (p) p.wave(); },
  horn: (slot) => { const p = pickPet(slot); if (p) p.horn(); },
  reloadCards: () => { cardPool = null; },
  bread: (slot) => { const p = pickPet(slot); if (p) p.bread(); },
  morph: (slot) => { const p = pickPet(slot); if (p) { if (p.busy() && !p.morphed) { p.state = 'idle'; } p.morph(); } },
  brush: (slot) => { const p = pickPet(slot); if (p) p.brush(); },
  flip: (slot) => { const p = pickPet(slot); if (p) p.flip(); },
  pop: () => duoDance('pop'),
  sign: (slot) => { const p = pickPet(slot); if (p) p.sign(); },
  slime: (slot) => { const p = pickPet(slot); if (p) p.slime(); },
  repeat: (slot) => { const p = pickPet(slot); if (p) p.sayRepeat(REPEAT_LINE, 5); },
  shimmy: (slot) => { const p = pickPet(slot); if (p) p.dance('shimmy'); },
  heart: (slot) => { const p = pickPet(slot); if (p) p.dance('heart'); },
  power: (slot) => { const p = pickPet(slot); if (p) p.dance('power'); },
  cheer: (slot) => { const p = pickPet(slot); if (p) p.dance('cheer'); },
  star: (slot) => { const p = pickPet(slot); if (p) p.fingerStar(); },
  grip: (slot) => { const p = pickPet(slot); if (p) p.grip(); },
  setScreens: (n) => { screens = n; },
};
