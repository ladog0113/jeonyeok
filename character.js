(function () {
  const INK = '#2b2622';
  const BASE_SKIN = '#f1c7a1';
  const FACE = { cx: 50, cy: 44.5, w: 40.4, h: 42.8 };
  const COL = {
    a: { uni: '#7a8650', shade: '#5f6a3c', pants: '#525a37', hat: '#66723f', hatShade: '#4c5630', hair: '#2f2925' },
    b: { uni: '#cfc198', shade: '#ab9d73', pants: '#474d3f', hat: '#b2372d', hatShade: '#8c2a22', hair: '#3a2c24' },
  };
  const ST = `stroke="${INK}" stroke-linejoin="round" stroke-linecap="round"`;
  const OUTFITS = {
    military: { name: '군복' },
    gyaru: { name: '갸루', a: { uni: '#ff6fb5', shade: '#d94a92', pants: '#2b2a33', shoe: '#ff9fd0', hair: '#e8c46a' }, b: { uni: '#ffb13b', shade: '#d98a1c', pants: '#2b2a33', shoe: '#fff1a8', hair: '#f0d9a0' } },
    idol: { name: '아이돌 무대의상', a: { uni: '#f4f1ea', shade: '#cfc6b3', pants: '#26252b', shoe: '#f4f1ea', hair: '#2b2a33' }, b: { uni: '#25242b', shade: '#101014', pants: '#25242b', shoe: '#c9c9cf', hair: '#5a3b8a' } },
    school: { name: '교복', a: { uni: '#2c3a63', shade: '#1e2846', pants: '#4a4f60', shoe: '#3b2a20', hair: '#2f2925' }, b: { uni: '#6b2234', shade: '#4b1624', pants: '#3c3f4a', shoe: '#3b2a20', hair: '#3a2c24' } },
    animal: { name: '동물 잠옷', a: { uni: '#b07a4f', shade: '#8b5a36', pants: '#b07a4f', shoe: '#8b5a36', hair: '#2f2925', belly: '#f3dcc0' }, b: { uni: '#f2f2f2', shade: '#cfcfcf', pants: '#f2f2f2', shoe: '#cfcfcf', hair: '#3a2c24', belly: '#ffd6e0' } },
    trot: { name: '트로트 무대의상', a: { uni: '#d63b4a', shade: '#a52634', pants: '#f4efe6', shoe: '#f4efe6', hair: '#1f1b1a' }, b: { uni: '#2f6fd6', shade: '#1f4fa3', pants: '#f4efe6', shoe: '#f4efe6', hair: '#1f1b1a' } },
    pajama: { name: '잠옷', a: { uni: '#a9cbea', shade: '#83a9cc', pants: '#a9cbea', shoe: '#f0d7a8', hair: '#2f2925' }, b: { uni: '#f6b8c9', shade: '#d98fa4', pants: '#f6b8c9', shoe: '#f0d7a8', hair: '#3a2c24' } },
    skydress: { name: '소라색 민소매 원피스', a: { uni: '#8fd3f4', shade: '#6bb8de', pants: '#8fd3f4', shoe: '#f7f7f2', hair: '#2f2925' }, b: { uni: '#8fd3f4', shade: '#6bb8de', pants: '#8fd3f4', shoe: '#f7f7f2', hair: '#3a2c24' } },
    cheer: { name: '응원단 유니폼', a: { uni: '#1d3f8f', shade: '#132c66', pants: '#f4f1ea', shoe: '#f4f1ea', hair: '#2f2925', trim: '#f4f1ea', accent: '#d63b4a' }, b: { uni: '#a11d33', shade: '#7a1426', pants: '#f4f1ea', shoe: '#f4f1ea', hair: '#3a2c24', trim: '#f4f1ea', accent: '#f2c230' } },
    girlgroup: { name: '걸그룹 무대의상', a: { uni: '#ff8ac7', shade: '#e05fa4', skirt: '#f2f2f6', pants: '#f2f2f6', shoe: '#f2f2f6', hair: '#2b2a33', leg: 'boots' }, b: { uni: '#1d1c22', shade: '#000', skirt: '#c8233c', pants: '#c8233c', shoe: '#1d1c22', hair: '#5a3b8a', leg: 'boots' } },
    cheerleader: { name: '응원단장복', a: { uni: '#1d3f8f', shade: '#132c66', skirt: '#1d3f8f', pants: '#1d3f8f', shoe: '#f7f7f2', hair: '#2f2925', trim: '#f4f1ea', accent: '#d63b4a', leg: 'sock', sock: '#f7f7f2', sockTop: 13 }, b: { uni: '#a11d33', shade: '#7a1426', skirt: '#a11d33', pants: '#a11d33', shoe: '#f7f7f2', hair: '#3a2c24', trim: '#f4f1ea', accent: '#f2c230', leg: 'sock', sock: '#f7f7f2', sockTop: 13 } },
    sailor: { name: '세일러 교복', a: { uni: '#fbfaf6', shade: '#dcd8cc', skirt: '#24305a', pants: '#24305a', shoe: '#3b2a20', hair: '#2f2925', collar: '#24305a', bow: '#d63b4a', leg: 'sock', sock: '#24305a', sockTop: 4 }, b: { uni: '#fbfaf6', shade: '#dcd8cc', skirt: '#3f4a3a', pants: '#3f4a3a', shoe: '#3b2a20', hair: '#3a2c24', collar: '#3f4a3a', bow: '#e8a72e', leg: 'sock', sock: '#fbfaf6', sockTop: 4 } },
    tennis: { name: '테니스룩', a: { uni: '#fbfaf6', shade: '#dcd8cc', skirt: '#fbfaf6', pants: '#fbfaf6', shoe: '#fbfaf6', hair: '#2f2925', accent: '#2e8b57', leg: 'sock', sock: '#fbfaf6', sockTop: 17 }, b: { uni: '#ffd1dc', shade: '#e8a9b9', skirt: '#fbfaf6', pants: '#fbfaf6', shoe: '#fbfaf6', hair: '#3a2c24', accent: '#2f6fd6', leg: 'sock', sock: '#fbfaf6', sockTop: 17 } },
    kimono: { name: '검정 기모노', a: { uni: '#1b1a1f', shade: '#000', pants: '#1b1a1f', shoe: '#c9a35a', hair: '#1b1a1f', obi: '#c8233c', cord: '#e8c14a', leg: 'robe' }, b: { uni: '#1b1a1f', shade: '#000', pants: '#1b1a1f', shoe: '#c9a35a', hair: '#1b1a1f', obi: '#c8233c', cord: '#e8c14a', leg: 'robe' } },
    yellowtop: { name: '옐로 브라톱', a: { uni: '#ffd84a', shade: '#e0b52a', skirt: '#f2f2f6', pants: '#f2f2f6', shoe: '#f7f7f2', hair: '#b9b4a8', leg: 'pants', top: 'bra', deco: 'star' }, b: { uni: '#ffd84a', shade: '#e0b52a', skirt: '#2b2a33', pants: '#2b2a33', shoe: '#f7f7f2', hair: '#b9b4a8', leg: 'pants', top: 'bra', deco: 'star' } },
    halter: { name: '홀터넥', a: { uni: '#ff9ac1', shade: '#e0739f', skirt: '#2b2a33', pants: '#2b2a33', shoe: '#c9c9cf', hair: '#2b2a33', leg: 'pants', top: 'halter', deco: 'chain' }, b: { uni: '#1d1c22', shade: '#000', skirt: '#2b2a33', pants: '#2b2a33', shoe: '#c9c9cf', hair: '#3a2c24', leg: 'pants', top: 'halter', deco: 'chain' } },
    strawberry: { name: '딸기 티 + 스트라이프 팬츠', a: { uni: '#fbfaf6', shade: '#dcd8cc', pants: '#9fc7ee', shoe: '#f7f7f2', hair: '#3a2c24', leg: 'stripe', top: 'tee', deco: 'berry', band: '#ff9ac1', tie: '#8fd3f4' }, b: { uni: '#ffe3ec', shade: '#e8b9c8', pants: '#bfe3c8', shoe: '#f7f7f2', hair: '#2f2925', leg: 'stripe', top: 'tee', deco: 'berry', band: '#ff9ac1', tie: '#b9a7ff' } },
    mintoff: { name: '민트 오프숄더 + 도트 쇼츠', a: { uni: '#9be7c4', shade: '#74c9a3', skirt: '#fbfaf6', pants: '#fbfaf6', shoe: '#f7f7f2', hair: '#e8c46a', leg: 'shorts', top: 'off', deco: 'dots' }, b: { uni: '#9be7c4', shade: '#74c9a3', skirt: '#fbfaf6', pants: '#fbfaf6', shoe: '#f7f7f2', hair: '#e8c46a', leg: 'shorts', top: 'off', deco: 'dots' } },
    pinkmint: { name: '핑크 민트 레이어드 탱크', a: { uni: '#ff9ac1', shade: '#e0739f', skirt: '#2b2a33', pants: '#3b3f52', shoe: '#f7f7f2', hair: '#1d1c22', leg: 'pants', top: 'tank', deco: 'layer', layer: '#9be7c4' }, b: { uni: '#9be7c4', shade: '#74c9a3', skirt: '#2b2a33', pants: '#3b3f52', shoe: '#f7f7f2', hair: '#1d1c22', leg: 'pants', top: 'tank', deco: 'layer', layer: '#ff9ac1' } },
    hoodie: { name: '후드티', a: { uni: '#9aa4b0', shade: '#7b8590', pants: '#3b3f4a', shoe: '#f7f7f2', hair: '#2f2925', leg: 'jogger' }, b: { uni: '#e8a9b9', shade: '#c9899a', pants: '#3b3f4a', shoe: '#f7f7f2', hair: '#3a2c24', leg: 'jogger' } },
    denim: { name: '청자켓', a: { uni: '#5b7fb5', shade: '#45679a', pants: '#3d5a8a', shoe: '#f7f7f2', hair: '#2f2925', tee: '#fbfaf6', leg: 'jeans' }, b: { uni: '#7aa0d6', shade: '#5b7fb5', pants: '#2f4670', shoe: '#2b2a33', hair: '#3a2c24', tee: '#ffd84a', leg: 'jeans' } },
    cardigan: { name: '니트 가디건 + 플리츠', a: { uni: '#f3e3c6', shade: '#d9c49f', skirt: '#8a6d4f', pants: '#8a6d4f', shoe: '#3b2a20', hair: '#3a2c24', blouse: '#fbfaf6', leg: 'sock', sock: '#fbfaf6', sockTop: 8 }, b: { uni: '#c9d7f0', shade: '#a6b7d6', skirt: '#4a5570', pants: '#4a5570', shoe: '#3b2a20', hair: '#2f2925', blouse: '#fbfaf6', leg: 'sock', sock: '#2b2a33', sockTop: 8 } },
    suit: { name: '정장', a: { uni: '#2b2d36', shade: '#1b1c22', pants: '#2b2d36', shoe: '#1d1c18', hair: '#1f1b1a', tie: '#c8233c', leg: 'pants' }, b: { uni: '#c9c3b6', shade: '#a8a294', pants: '#c9c3b6', shoe: '#5a3b26', hair: '#3a2c24', tie: '#2f4670', leg: 'pants' } },
    tracksuit: { name: '트레이닝복', a: { uni: '#2f6fd6', shade: '#1f4fa3', pants: '#2f6fd6', shoe: '#f7f7f2', hair: '#2f2925', line: '#fbfaf6', leg: 'track' }, b: { uni: '#1d1c22', shade: '#000', pants: '#1d1c22', shoe: '#f7f7f2', hair: '#3a2c24', line: '#ff8ac7', leg: 'track' } },
    hanbok: { name: '한복', a: { uni: '#ffe08a', shade: '#e0bd5e', skirt: '#d63b4a', pants: '#d63b4a', shoe: '#fbfaf6', hair: '#1f1b1a', ribbon: '#d63b4a', leg: 'chima' }, b: { uni: '#c9f1df', shade: '#9fd3bb', skirt: '#ff8ac7', pants: '#ff8ac7', shoe: '#fbfaf6', hair: '#1f1b1a', ribbon: '#2f6fd6', leg: 'chima' } },
    padding: { name: '롱패딩', a: { uni: '#1d1c22', shade: '#000', pants: '#1d1c22', shoe: '#2b2a33', hair: '#2f2925', leg: 'coat' }, b: { uni: '#f2f2f2', shade: '#cfcfcf', pants: '#f2f2f2', shoe: '#2b2a33', hair: '#3a2c24', leg: 'coat' } },
    y2k: { name: 'Y2K', a: { uni: '#bfe86b', shade: '#98c24a', pants: '#8a8f7a', shoe: '#f7f7f2', hair: '#2b2a33' }, b: { uni: '#b9a7ff', shade: '#9480e6', pants: '#5e7fb8', shoe: '#f7f7f2', hair: '#4a2c24' } },
  };
  function look(slot, outfit) {
    const base = COL[slot];
    if (!outfit || outfit === 'military' || !OUTFITS[outfit]) return { ...base, sleeve: base.uni, shoe: INK, outfit: 'military' };
    const o = OUTFITS[outfit][slot];
    const bare = ['gyaru', 'skydress', 'girlgroup', 'cheerleader', 'yellowtop', 'halter', 'mintoff', 'pinkmint'].includes(outfit);
    return { ...base, ...o, sleeve: bare ? BASE_SKIN : o.uni, outfit };
  }
  let seq = 0;

  function limb(d, col, w = 7) {
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.4}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  function hand(x, y) {
    return `<circle class="skin" cx="${x}" cy="${y}" r="4.3" fill="${BASE_SKIN}" ${ST} stroke-width="1.7"/>`;
  }
  function leg(cls, x, c) {
    const bare = cls === 'leg-r'
      ? `<g class="bare" display="none"><ellipse class="skin" cx="1.5" cy="22.5" rx="8" ry="5.6" fill="${BASE_SKIN}" ${ST} stroke-width="1.7"/>` +
        `<g class="toe"><rect class="skin" x="5" y="17" width="16" height="6.4" rx="3.2" fill="${BASE_SKIN}" ${ST} stroke-width="1.8"/>` +
        `<path d="M17.2 18.4 v3.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g></g>`
      : '';
    let shin;
    if (c.leg === 'jogger') {
      shin = `<rect x="-5.5" y="-3" width="11" height="24" rx="4" fill="${c.pants}" ${ST} stroke-width="1.8"/><rect x="-5.5" y="15" width="11" height="4" fill="${c.pants}" ${ST} stroke-width="1.2"/>`;
    } else if (c.leg === 'jeans') {
      shin = `<rect x="-5.5" y="-3" width="11" height="24" rx="3" fill="${c.pants}" ${ST} stroke-width="1.8"/><path d="M3.5 -2 V20" stroke="#e8c14a" stroke-width=".9" stroke-dasharray="1.6 1.2"/>`;
    } else if (c.leg === 'track') {
      shin = `<rect x="-5.5" y="-3" width="11" height="24" rx="4" fill="${c.pants}" ${ST} stroke-width="1.8"/><path d="M3.6 -2 V20" stroke="${c.line}" stroke-width="2"/>`;
    } else if (c.leg === 'chima') {
      shin = `<rect x="-5.5" y="-3" width="11" height="22" rx="3" fill="${c.skirt}" stroke="none"/>`;
    } else if (c.leg === 'coat') {
      shin = `<rect x="-6" y="-3" width="12" height="15" rx="3" fill="${c.uni}" stroke="none"/><rect x="-4.5" y="11" width="9" height="11" rx="3" fill="#3b3f4a" ${ST} stroke-width="1.6"/>`;
    } else if (c.leg === 'pants') {
      shin = `<rect x="-5.5" y="-3" width="11" height="24" rx="4" fill="${c.pants}" ${ST} stroke-width="1.8"/>`;
    } else if (c.leg === 'stripe') {
      shin = `<rect x="-5.5" y="-3" width="11" height="24" rx="4" fill="${c.pants}" ${ST} stroke-width="1.8"/>` +
        `<path d="M-2.5 -2 V20 M1 -2 V20 M4 -2 V20" stroke="#fff" stroke-width="1.3" opacity=".85"/>`;
    } else if (c.leg === 'shorts') {
      shin = `<rect class="skin" x="-4.2" y="-3" width="8.4" height="23" rx="4" fill="${BASE_SKIN}" ${ST} stroke-width="1.7"/>`;
    } else if (c.leg === 'boots') {
      shin = `<rect class="skin" x="-4.2" y="-3" width="8.4" height="12" rx="4" fill="${BASE_SKIN}" ${ST} stroke-width="1.7"/>` +
        `<rect x="-5" y="6" width="10" height="16" rx="3" fill="${c.shoe}" ${ST} stroke-width="1.7"/>`;
    } else if (c.leg === 'sock') {
      shin = `<rect class="skin" x="-4.2" y="-3" width="8.4" height="${c.sockTop + 3}" rx="4" fill="${BASE_SKIN}" ${ST} stroke-width="1.7"/>` +
        `<rect x="-4.6" y="${c.sockTop - 1}" width="9.2" height="${22 - c.sockTop}" rx="2.5" fill="${c.sock}" ${ST} stroke-width="1.6"/>`;
    } else if (c.leg === 'robe') {
      shin = `<rect x="-6" y="-3" width="12" height="21" rx="3" fill="${c.uni}" ${ST} stroke-width="1.8"/>` +
        `<rect x="-4" y="17" width="8" height="5" rx="2" fill="#fbfaf6" ${ST} stroke-width="1.3"/>`;
    } else if (c.outfit === 'skydress') {
      shin = `<rect class="skin" x="-4.2" y="-3" width="8.4" height="23" rx="4" fill="${BASE_SKIN}" ${ST} stroke-width="1.7"/>`;
    } else if (c.outfit === 'cheer') {
      shin = `<rect x="-5" y="-3" width="10" height="24" rx="4.5" fill="${c.pants}" ${ST} stroke-width="1.8"/>` +
        `<path d="M3.2 -2 V20" stroke="${c.uni}" stroke-width="2"/>`;
    } else if (c.outfit === 'gyaru') {
      shin = `<rect class="skin" x="-4.2" y="-3" width="8.4" height="17" rx="4" fill="${BASE_SKIN}" ${ST} stroke-width="1.7"/>` +
        `<path d="M-5.6 12 q1.4 -1.6 2.8 0 q1.4 -1.6 2.8 0 q1.4 -1.6 2.8 0 q1.4 -1.6 2.8 0 L5.6 21 L-5.6 21 Z" fill="#fff" ${ST} stroke-width="1.5"/>`;
    } else if (c.outfit === 'y2k') {
      shin = `<rect x="-6.5" y="-3" width="13" height="24" rx="4" fill="${c.pants}" ${ST} stroke-width="1.8"/>` +
        `<rect x="2.5" y="6" width="4" height="5" rx="1" fill="none" stroke="${INK}" stroke-width="1" opacity=".6"/>`;
    } else if (c.outfit === 'pajama') {
      shin = `<rect x="-5" y="-3" width="10" height="24" rx="4.5" fill="${c.pants}" ${ST} stroke-width="1.8"/>` +
        `<path d="M-5 3 H5 M-5 9 H5 M-5 15 H5" stroke="#fff" stroke-width="1.6" opacity=".8"/>`;
    } else {
      shin = `<rect x="-5" y="-3" width="10" height="24" rx="4.5" fill="${c.pants}" ${ST} stroke-width="1.8"/>`;
    }
    const sole = c.outfit === 'gyaru' ? `<rect x="-6" y="25.5" width="15" height="3" rx="1" fill="${INK}"/>` : '';
    return `<g class="${cls}" transform="translate(${x} 92)">${shin}` +
      `<path class="boot" d="M-6 19.5 h8.5 a6.5 6.5 0 0 1 6.5 6.5 v1.5 h-15 z" fill="${c.shoe}" ${c.shoe === INK ? '' : `${ST} stroke-width="1.5"`}/>${sole}${bare}</g>`;
  }

  function drawnFace(slot, c) {
    const eye = (x) => `<g class="eye" data-cx="${x}" data-cy="49"><ellipse cx="${x}" cy="49" rx="2.5" ry="3" fill="${INK}"/><circle cx="${x + 0.8}" cy="47.9" r="0.85" fill="#fff"/></g>`;
    const brows = slot === 'a'
      ? `<path d="M38.5 44.2 Q42.5 43 46.5 44.4 M53.5 44.4 Q57.5 43 61.5 44.2" fill="none" stroke="${c.hair}" stroke-width="1.9" stroke-linecap="round"/>`
      : `<path d="M38.5 43.2 L46.5 44.8 M61.5 43.2 L53.5 44.8" fill="none" stroke="${c.hair}" stroke-width="2" stroke-linecap="round"/>`;
    const mouth = slot === 'a'
      ? `<path class="mouth-c" d="M46.5 57 Q50 59.6 53.5 57" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`
      : `<path class="mouth-c" d="M45.5 56.6 Q50.5 60 55 55.4" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`;
    const hair = slot === 'a'
      ? `<path d="M28.8 39 Q28.2 46 31.4 51 L33.6 41 Z M71.2 39 Q71.8 46 68.6 51 L66.4 41 Z" fill="${c.hair}"/>`
      : `<path d="M29 37 Q28 45 31 49 L34 39 Z M58 34 Q71.5 34.5 71.6 47 Q68.5 40 60.5 38.6 Z" fill="${c.hair}"/>`;
    return `<g class="drawn">${hair}${brows}${eye(42.5)}${eye(57.5)}` +
      `<ellipse cx="37.5" cy="54" rx="3.2" ry="2" fill="#e58f7a" opacity=".35"/><ellipse cx="62.5" cy="54" rx="3.2" ry="2" fill="#e58f7a" opacity=".35"/>` +
      `<path d="M50.2 50.6 q1.3 2.4 -0.7 2.9" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.3" stroke-linecap="round"/>` +
      `${mouth}<ellipse class="mouth-o" cx="50" cy="57.6" rx="2.4" ry="2.1" fill="#7c3a33" ${ST} stroke-width="1.5" display="none"/></g>`;
  }

  function hat(slot, c) {
    if (slot === 'a') {
      return `<g class="hat"><path d="M27.6 39 Q27.2 16.8 50 16.4 Q72.8 16.8 72.4 39 Z" fill="${c.hat}" ${ST} stroke-width="2"/>` +
        `<path d="M33 23.5 Q50 31 67 23.5 M30.5 31 Q50 38 69.5 31 M41 18 Q38 28 39 37 M59 18 Q62 28 61 37" fill="none" stroke="${c.hatShade}" stroke-width="1.3"/>` +
        `<rect x="23" y="36" width="54" height="6.6" rx="3.3" fill="${c.hat}" ${ST} stroke-width="2"/></g>`;
    }
    return `<g class="hat"><path d="M27 37.5 Q24 19.5 45.5 17.4 Q69.5 15.6 74.5 27 Q75 33.4 66.5 34.2 Q46 33.4 27 37.5 Z" fill="${c.hat}" ${ST} stroke-width="2"/>` +
      `<path d="M28.6 36.2 Q47.5 31.6 68 33.3" fill="none" stroke="${c.hatShade}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<circle cx="68.5" cy="18.4" r="2.4" fill="${c.hatShade}" ${ST} stroke-width="1.5"/>` +
      `<circle cx="36.5" cy="29.5" r="2.7" fill="#d8b24a" ${ST} stroke-width="1.3"/></g>`;
  }

  function topHair(c, long) {
    const back = long ? `<path d="M27 40 Q24 62 30 74 L38 70 Q32 58 33 44 Z M73 40 Q76 62 70 74 L62 70 Q68 58 67 44 Z" fill="${c.hair}" ${ST} stroke-width="1.6"/>` : '';
    return back + `<path d="M28.5 44 Q26 20 50 19 Q74 20 71.5 44 Q69 33 60 30 Q55 36 44 35 Q36 34 33 31 Q29 36 28.5 44 Z" fill="${c.hair}" ${ST} stroke-width="1.8"/>`;
  }

  function headwear(slot, c) {
    switch (c.outfit) {
      case 'military':
        return hat(slot, c);
      case 'gyaru':
        return `<g class="hat">${topHair(c, true)}<circle cx="64" cy="27" r="3.4" fill="#fff" ${ST} stroke-width="1.2"/><circle cx="64" cy="27" r="1.4" fill="#ffd84a"/>` +
          `<path d="M60.8 25 a2.4 2.4 0 1 1 3.2 -3.2 a2.4 2.4 0 1 1 3.2 3.2" fill="none"/></g>`;
      case 'animal':
        return `<g class="hat"><circle cx="31" cy="21" r="7" fill="${c.uni}" ${ST} stroke-width="1.8"/><circle cx="69" cy="21" r="7" fill="${c.uni}" ${ST} stroke-width="1.8"/>` +
          `<circle cx="31" cy="21" r="3.4" fill="${c.belly}"/><circle cx="69" cy="21" r="3.4" fill="${c.belly}"/>` +
          `<path d="M25.5 50 Q22 18 50 16.5 Q78 18 74.5 50 Q73 34 68 30 Q50 25 32 30 Q27 34 25.5 50 Z" fill="${c.uni}" ${ST} stroke-width="2"/></g>`;
      case 'pajama':
        return `<g class="hat">${topHair(c)}<path d="M30 33 Q36 14 58 12 Q72 12 80 30 Q74 25 70 28 Q60 26 50 28 Q40 29 30 33 Z" fill="${c.uni}" ${ST} stroke-width="1.8"/>` +
          `<path d="M36 26 L44 18 M46 25 L55 15 M57 25 L65 16" stroke="#fff" stroke-width="1.6" opacity=".8"/>` +
          `<circle cx="81" cy="32" r="3.6" fill="#fff" ${ST} stroke-width="1.4"/></g>`;
      case 'y2k':
        return `<g class="hat">${topHair(c)}<path d="M33 30 l3 -3 l3 3 l-3 3 Z M62 28 l3 -3 l3 3 l-3 3 Z" fill="#ff8fd1" ${ST} stroke-width="1"/></g>`;
      case 'cardigan':
        return `<g class="hat">${topHair(c, true)}<path d="M60 26 l4 -2 l1 4 Z" fill="#ff8ac7"/></g>`;
      case 'hanbok':
        return `<g class="hat"><circle cx="73" cy="50" r="6.5" fill="${c.hair}" ${ST} stroke-width="1.6"/><path d="M68 47 L80 44" stroke="#e8c14a" stroke-width="1.8" stroke-linecap="round"/>${topHair(c)}` +
          `<path d="M28 38 Q50 30 72 38" fill="none" stroke="${c.ribbon}" stroke-width="2"/></g>`;
      case 'suit':
        return `<g class="hat"><path d="M28.5 44 Q26 20 50 19 Q74 20 71.5 44 Q70 32 62 29 Q48 26 40 31 Q32 33 28.5 44 Z" fill="${c.hair}" ${ST} stroke-width="1.8"/><path d="M40 24 Q52 20 64 26" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2"/></g>`;
      case 'yellowtop':
        return `<g class="hat">${topHair(c)}<path d="M30 33 l5 -3 M33 37 l5 -2 M64 30 l5 3" stroke="#ff8ac7" stroke-width="2.2" stroke-linecap="round"/><path d="M62 52 l1 2 l2 .3 l-1.5 1.4 l.4 2 l-1.9 -1 l-1.9 1 l.4 -2 l-1.5 -1.4 l2 -.3 Z" fill="#ffd84a"/></g>`;
      case 'halter':
        return `<g class="hat">${topHair(c, true)}</g>`;
      case 'strawberry':
        return `<g class="hat">${topHair(c, true)}<path d="M29 36 Q50 24 71 36" fill="none" stroke="${c.band}" stroke-width="3.4" stroke-linecap="round"/></g>`;
      case 'mintoff':
        return `<g class="hat"><path d="M30 40 Q22 60 26 74 Q30 70 31 62 Q30 52 33 44 Z M70 40 Q78 60 74 74 Q70 70 69 62 Q70 52 67 44 Z" fill="${c.hair}" ${ST} stroke-width="1.4"/>${topHair(c)}<path d="M36 28 l1.2 2.4 l2.6 .4 l-1.9 1.8 l.5 2.6 l-2.4 -1.3 l-2.4 1.3 l.5 -2.6 l-1.9 -1.8 l2.6 -.4 Z" fill="#ffd84a" ${ST} stroke-width=".8"/></g>`;
      case 'pinkmint':
        return `<g class="hat">${topHair(c, true)}<rect x="60" y="27" width="6" height="2.4" rx="1.2" fill="#ffd84a"/></g>`;
      case 'girlgroup':
        return `<g class="hat">${topHair(c, true)}<path d="M58 22 l2 -4 l2 4 l4 1 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 Z" fill="#ffe680" ${ST} stroke-width="1"/></g>`;
      case 'cheerleader':
        return `<g class="hat"><path d="M66 22 Q86 26 82 52 Q78 40 70 34 Z" fill="${c.hair}" ${ST} stroke-width="1.6"/>${topHair(c)}` +
          `<path d="M64 22 l6 -5 l1 7 Z M64 22 l8 3 l-6 4 Z" fill="${c.accent}" ${ST} stroke-width="1"/></g>`;
      case 'sailor':
        return `<g class="hat">${topHair(c, true)}<path d="M33 30 h6" stroke="${c.bow}" stroke-width="2.4" stroke-linecap="round"/></g>`;
      case 'tennis':
        return `<g class="hat">${topHair(c, true)}<path d="M27 36 Q50 26 73 36 L82 40 Q60 36 50 37 Q38 38 27 36 Z" fill="${c.accent}" ${ST} stroke-width="1.6"/></g>`;
      case 'kimono':
        return `<g class="hat"><circle cx="50" cy="15" r="9" fill="${c.hair}" ${ST} stroke-width="1.8"/>${topHair(c)}` +
          `<path d="M57 12 L68 4" stroke="${c.cord}" stroke-width="1.8" stroke-linecap="round"/><circle cx="68.5" cy="3.5" r="2.2" fill="${c.obi}" ${ST} stroke-width="1"/></g>`;
      case 'skydress':
        return `<g class="hat">${topHair(c, true)}<rect x="58" y="25" width="9" height="3.2" rx="1.6" fill="#8fd3f4" ${ST} stroke-width="1.1"/></g>`;
      case 'cheer':
        return `<g class="hat">${topHair(c)}<path d="M28.6 37 Q50 27 71.4 37" fill="none" stroke="${c.trim}" stroke-width="5" stroke-linecap="round"/>` +
          `<path d="M28.6 37 Q50 27 71.4 37" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round"/></g>`;
      case 'trot':
        return `<g class="hat"><path d="M28.5 44 Q25 22 46 16 Q60 12 70 22 Q76 30 71.5 44 Q70 33 62 30 Q54 27 46 30 Q36 30 33 34 Q29 38 28.5 44 Z" fill="${c.hair}" ${ST} stroke-width="1.8"/>` +
          `<path d="M42 21 Q52 16 62 22" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/></g>`;
      default:
        return `<g class="hat">${topHair(c)}</g>`;
    }
  }

  function torso(slot, c) {
    if (c.outfit !== 'military') return torsoOutfit(slot, c);
    const base = `<rect x="33" y="62" width="34" height="34" rx="12" fill="${c.uni}" ${ST} stroke-width="2"/>`;
    const shade = `<path d="M35 84 Q50 90 65 84 L65 88 Q50 97 35 88 Z" fill="${c.shade}" opacity=".55"/>`;
    if (slot === 'a') {
      return base + shade +
        `<path d="M39 70 q3 -2 6 0 q1 3 -3 3 q-4 0 -3 -3 Z M54 76 q4 -2 7 1 q0 3 -4 3 q-4 -1 -3 -4 Z M44 82 q3 -1 4 1 q-1 2 -3 2 q-2 -1 -1 -3 Z" fill="${c.shade}" opacity=".8"/>` +
        `<path d="M43 62.6 L50 68.4 L57 62.6" fill="none" stroke="${c.shade}" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<rect x="34" y="86" width="32" height="4" fill="#3d3c2f"/>`;
    }
    return base + shade +
      `<path d="M43 62.6 L50 70.5 L57 62.6 Z" fill="#4d5244" ${ST} stroke-width="1.5"/>` +
      `<rect x="54.5" y="74" width="8.5" height="4.2" rx=".8" fill="#fbf8ef" ${ST} stroke-width="1.2"/>` +
      `<rect x="34" y="86" width="32" height="4" fill="#5b5341"/>`;
  }

  function torsoOutfit(slot, c) {
    const base = `<rect x="33" y="62" width="34" height="34" rx="12" fill="${c.uni}" ${ST} stroke-width="2"/>`;
    const shade = `<path d="M35 84 Q50 90 65 84 L65 88 Q50 97 35 88 Z" fill="${c.shade}" opacity=".55"/>`;
    switch (c.outfit) {
      case 'gyaru':
        return `<rect x="34" y="62" width="32" height="18" rx="8" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<rect class="skin" x="36" y="78" width="28" height="7" fill="${BASE_SKIN}" ${ST} stroke-width="1.6"/>` +
          `<path d="M33 84 L67 84 L70 97 L30 97 Z" fill="#3b3b46" ${ST} stroke-width="1.8"/>` +
          `<path d="M38 88 l3 2 M46 88 l3 2 M54 88 l3 2 M62 88 l3 2 M36 93 l3 2 M44 93 l3 2 M52 93 l3 2 M60 93 l3 2" stroke="#d9b45a" stroke-width="1.4"/>` +
          `<path d="M47 68 a3 3 0 0 1 6 0 a3 3 0 0 1 6 0 q0 4 -6 8 q-6 -4 -6 -8 Z" transform="translate(-3 0)" fill="#fff" opacity=".9"/>`;
      case 'idol':
        return base + shade +
          `<path d="M43 62.6 L50 74 L57 62.6" fill="#1d1c22" ${ST} stroke-width="1.4"/>` +
          `<path d="M34 64 L42 64 L48 80 L40 92 Z M66 64 L58 64 L52 80 L60 92 Z" fill="none" stroke="#d9b45a" stroke-width="1.8"/>` +
          `<circle cx="38" cy="72" r="1.1" fill="#ffe680"/><circle cx="62" cy="76" r="1.1" fill="#ffe680"/><circle cx="41" cy="84" r="1.1" fill="#ffe680"/><circle cx="59" cy="86" r="1.1" fill="#ffe680"/><circle cx="36" cy="80" r="1.1" fill="#ffe680"/><circle cx="64" cy="70" r="1.1" fill="#ffe680"/>`;
      case 'school':
        return base + shade +
          `<path d="M43 62.6 L50 76 L57 62.6 Z" fill="#fbfaf6" ${ST} stroke-width="1.4"/>` +
          `<path d="M50 65 L52.2 68 L50 78 L47.8 68 Z" fill="#c23a3a" ${ST} stroke-width="1"/>` +
          `<path d="M43 62.6 L46 82 M57 62.6 L54 82" stroke="${c.shade}" stroke-width="1.6"/>` +
          `<rect x="57" y="70" width="6" height="4" rx=".8" fill="#e7d18a" stroke="${INK}" stroke-width=".8"/>`;
      case 'animal':
        return base + shade + `<ellipse cx="50" cy="80" rx="10" ry="11" fill="${c.belly}" ${ST} stroke-width="1.4"/>` +
          `<path d="M47 63 v4 M53 63 v4" stroke="${INK}" stroke-width="1.3"/>`;
      case 'trot':
        return base + shade +
          `<path d="M43 62.6 L50 72 L57 62.6 Z" fill="#fbfaf6" ${ST} stroke-width="1.3"/>` +
          `<path d="M44 64 L47 80 L42 86 Z M56 64 L53 80 L58 86 Z" fill="#e8c14a" ${ST} stroke-width="1.2"/>` +
          `<path d="M45 66 L50 68.5 L45 71 Z M55 66 L50 68.5 L55 71 Z" fill="#1d1c22" ${ST} stroke-width="1"/>` +
          `<circle cx="38" cy="74" r="1" fill="#fff6c8"/><circle cx="62" cy="78" r="1" fill="#fff6c8"/><circle cx="37" cy="84" r="1" fill="#fff6c8"/><circle cx="63" cy="70" r="1" fill="#fff6c8"/><circle cx="61" cy="88" r="1" fill="#fff6c8"/>`;
      case 'pajama':
        return base + shade +
          `<path d="M38 63 V95 M45 62 V96 M55 62 V96 M62 63 V95" stroke="#fff" stroke-width="1.8" opacity=".75"/>` +
          `<path d="M43 62.6 L50 70 L57 62.6" fill="none" stroke="${c.shade}" stroke-width="2"/>` +
          `<circle cx="50" cy="75" r="1.2" fill="#fff" ${ST} stroke-width=".8"/><circle cx="50" cy="82" r="1.2" fill="#fff" ${ST} stroke-width=".8"/>`;
      case 'hoodie':
        return `<path d="M38 60 Q50 54 62 60 L62 66 Q50 62 38 66 Z" fill="${c.shade}" ${ST} stroke-width="1.6"/>` +
          `<rect x="31" y="62" width="38" height="35" rx="13" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<path d="M46 64 V72 M54 64 V72" stroke="#fbfaf6" stroke-width="1.4" stroke-linecap="round"/>` +
          `<path d="M39 80 H61 L59 90 H41 Z" fill="${c.shade}" ${ST} stroke-width="1.4"/><rect x="32" y="91" width="36" height="5" rx="2" fill="${c.shade}"/>`;
      case 'denim':
        return `<rect x="33" y="62" width="34" height="34" rx="11" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<path d="M44 62 L44 96 L56 96 L56 62 Z" fill="${c.tee}" ${ST} stroke-width="1.4"/>` +
          `<path d="M44 62 L40 70 L44 72 M56 62 L60 70 L56 72" fill="${c.shade}" ${ST} stroke-width="1.3"/>` +
          `<rect x="36" y="74" width="6" height="5" rx="1" fill="none" stroke="${INK}" stroke-width="1"/><rect x="58" y="74" width="6" height="5" rx="1" fill="none" stroke="${INK}" stroke-width="1"/>` +
          `<path d="M35 88 H44 M56 88 H65" stroke="#e8c14a" stroke-width=".9" stroke-dasharray="1.6 1.2"/>`;
      case 'cardigan':
        return `<rect x="35" y="62" width="30" height="22" rx="9" fill="${c.blouse}" ${ST} stroke-width="1.8"/>` +
          `<path d="M33 66 Q33 62 38 62 L46 62 L50 84 L33 84 Z M67 66 Q67 62 62 62 L54 62 L50 84 L67 84 Z" fill="${c.uni}" ${ST} stroke-width="1.8"/>` +
          `<path d="M36 68 V82 M39 66 V83 M61 66 V83 M64 68 V82" stroke="${c.shade}" stroke-width="1"/>` +
          `<circle cx="47.5" cy="70" r="1" fill="${INK}"/><circle cx="48.5" cy="77" r="1" fill="${INK}"/>` +
          `<path d="M35 83 L65 83 L71 97 L29 97 Z" fill="${c.skirt}" ${ST} stroke-width="2"/>` +
          `<path d="M40 84 L37 96 M46 84 L45 96 M54 84 L55 96 M60 84 L63 96" stroke="#000" stroke-opacity=".3" stroke-width="1.2"/>`;
      case 'suit':
        return `<rect x="33" y="62" width="34" height="34" rx="10" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<path d="M43 62.6 L50 76 L57 62.6 Z" fill="#fbfaf6" ${ST} stroke-width="1.3"/>` +
          `<path d="M50 64.5 L52 67 L50 77 L48 67 Z" fill="${c.tie}" ${ST} stroke-width="1"/>` +
          `<path d="M43 62.6 L46 82 L50 76 M57 62.6 L54 82 L50 76" fill="none" stroke="${c.shade}" stroke-width="1.6"/>` +
          `<circle cx="50" cy="84" r="1" fill="${INK}"/><circle cx="50" cy="89" r="1" fill="${INK}"/><path d="M58 70 h5" stroke="#fbfaf6" stroke-width="1.4"/>`;
      case 'tracksuit':
        return `<rect x="33" y="62" width="34" height="34" rx="11" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<path d="M50 63 V96" stroke="#c9ced3" stroke-width="1.4"/><path d="M43 62.6 L50 66 L57 62.6" fill="none" stroke="${c.line}" stroke-width="2"/>` +
          `<path d="M35 66 V94 M65 66 V94" stroke="${c.line}" stroke-width="2.2"/><rect x="34" y="91" width="32" height="5" rx="2" fill="${c.shade}"/>`;
      case 'hanbok':
        return `<path d="M30 76 Q30 99 32 101 L68 101 Q70 99 70 76 Z" fill="${c.skirt}" ${ST} stroke-width="2"/>` +
          `<path d="M36 70 V100 M43 72 V100 M50 72 V100 M57 72 V100 M64 70 V100" stroke="#000" stroke-opacity=".18" stroke-width="1.2"/>` +
          `<rect x="35" y="62" width="30" height="14" rx="6" fill="${c.uni}" ${ST} stroke-width="1.9"/>` +
          `<path d="M42 62.5 L52 72 M58 62.5 L48 70" stroke="#fbfaf6" stroke-width="2.4"/>` +
          `<path d="M51 71 Q47 80 44 84 M51 71 Q53 80 51 86" fill="none" stroke="${c.ribbon}" stroke-width="2.4" stroke-linecap="round"/><circle cx="51" cy="71" r="1.8" fill="${c.ribbon}"/>`;
      case 'padding':
        return `<path d="M31 64 Q31 61 36 61 L64 61 Q69 61 69 64 L70 104 L30 104 Z" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<path d="M31 70 H69 M31 78 H69 M31 86 H69 M30 94 H70 M30 101 H70" stroke="${c.shade}" stroke-width="1.4"/>` +
          `<path d="M50 61 V104" stroke="#9aa4b0" stroke-width="1.4"/><path d="M42 58 Q50 54 58 58 L58 63 L42 63 Z" fill="${c.uni}" ${ST} stroke-width="1.6"/>`;
      case 'yellowtop':
      case 'halter':
      case 'strawberry':
      case 'mintoff':
      case 'pinkmint': {
        let top;
        if (c.top === 'bra') top = `<rect x="36" y="64" width="28" height="11" rx="5" fill="${c.uni}" ${ST} stroke-width="1.8"/><path d="M40 64 L44 58 M60 64 L56 58" stroke="${c.uni}" stroke-width="2"/>`;
        else if (c.top === 'halter') top = `<path d="M37 66 L50 58 L63 66 L63 80 L37 80 Z" fill="${c.uni}" ${ST} stroke-width="1.8"/>`;
        else if (c.top === 'off') top = `<path d="M33 66 Q50 70 67 66 L66 80 L34 80 Z" fill="${c.uni}" ${ST} stroke-width="1.8"/><path d="M34 67 Q50 72 66 67" fill="none" stroke="#fff" stroke-width="1.4"/>`;
        else if (c.top === 'tank') top = `<path d="M38 62 L62 62 L64 82 L36 82 Z" fill="${c.layer}" ${ST} stroke-width="1.8"/><path d="M40 66 L60 66 L62 82 L38 82 Z" fill="${c.uni}" ${ST} stroke-width="1.6"/>`;
        else top = `<rect x="33" y="62" width="34" height="23" rx="11" fill="${c.uni}" ${ST} stroke-width="2"/>`;
        const skin = c.top === 'tee' ? '' : `<rect class="skin" x="36" y="62" width="28" height="22" rx="8" fill="${BASE_SKIN}" ${ST} stroke-width="1.6"/>`;
        let deco = '';
        if (c.deco === 'star') deco = `<path d="M44 70 l1.4 2.8 l3 .4 l-2.2 2 l.6 3 l-2.8 -1.5 l-2.8 1.5 l.6 -3 l-2.2 -2 l3 -.4 Z" fill="#fff" opacity=".9"/><path d="M41 58 Q50 62 59 58" fill="none" stroke="#c9ced3" stroke-width="1.6"/>`;
        if (c.deco === 'chain') deco = `<path d="M38 82 Q50 88 62 82" fill="none" stroke="#c9ced3" stroke-width="1.6" stroke-dasharray="2 1.4"/>`;
        if (c.deco === 'berry') deco = `<path d="M50 68 q-5 1 -4 6 q1 4 4 6 q3 -2 4 -6 q1 -5 -4 -6 Z" fill="#e8344a" ${ST} stroke-width="1"/><path d="M47 67 q3 -2 6 0" stroke="#3aa35a" stroke-width="1.6" fill="none"/>` +
          `<path d="M33 82 Q50 86 67 82" fill="none" stroke="${c.tie}" stroke-width="4"/>`;
        if (c.deco === 'layer') deco = `<circle cx="50" cy="60" r="1.6" fill="#ffd84a"/>`;
        const bottom = c.leg === 'shorts'
          ? `<path d="M34 82 L66 82 L68 94 L52 94 L50 89 L48 94 L32 94 Z" fill="${c.pants}" ${ST} stroke-width="1.8"/><circle cx="38" cy="86" r="1.2" fill="#ff9ac1"/><circle cx="45" cy="90" r="1.2" fill="#ff9ac1"/><circle cx="56" cy="86" r="1.2" fill="#ff9ac1"/><circle cx="62" cy="90" r="1.2" fill="#ff9ac1"/>`
          : `<path d="M34 82 L66 82 L66 97 L34 97 Z" fill="${c.pants}" ${ST} stroke-width="1.8"/>` + (c.leg === 'stripe' ? `<path d="M40 83 V96 M46 83 V96 M54 83 V96 M60 83 V96" stroke="#fff" stroke-width="1.3" opacity=".85"/>` : '');
        return skin + bottom + top + deco;
      }
      case 'girlgroup':
      case 'cheerleader':
      case 'tennis': {
        const top = c.outfit === 'tennis'
          ? `<rect x="34" y="62" width="32" height="20" rx="8" fill="${c.uni}" ${ST} stroke-width="2"/><path d="M45 62.6 L50 68 L55 62.6" fill="none" stroke="${c.accent}" stroke-width="2"/>`
          : `<rect x="35" y="63" width="30" height="15" rx="7" fill="${c.uni}" ${ST} stroke-width="2"/>`;
        const mid = c.outfit === 'tennis' ? '' : `<rect class="skin" x="37" y="76" width="26" height="8" fill="${BASE_SKIN}" ${ST} stroke-width="1.5"/>`;
        const deco = c.outfit === 'girlgroup'
          ? `<circle cx="40" cy="68" r="1.1" fill="#fff6c8"/><circle cx="47" cy="72" r="1.1" fill="#fff6c8"/><circle cx="55" cy="67" r="1.1" fill="#fff6c8"/><circle cx="61" cy="73" r="1.1" fill="#fff6c8"/><path d="M42 64 Q50 70 58 64" fill="none" stroke="#fff6c8" stroke-width="1.2"/>`
          : c.outfit === 'cheerleader'
            ? `<path d="M37 66 L50 74 L63 66" fill="none" stroke="${c.trim}" stroke-width="3"/><path d="M37 66 L50 74 L63 66" fill="none" stroke="${c.accent}" stroke-width="1.2"/>`
            : '';
        const sk = c.outfit === 'cheerleader' ? `<path d="M33 95 H67" stroke="${c.trim}" stroke-width="2.2"/>` : '';
        return top + mid + deco +
          `<path d="M35 82 L65 82 L71 97 L29 97 Z" fill="${c.skirt}" ${ST} stroke-width="2"/>` +
          `<path d="M40 83 L37 96 M46 83 L45 96 M54 83 L55 96 M60 83 L63 96" stroke="${INK}" stroke-opacity=".35" stroke-width="1.2"/>` + sk;
      }
      case 'sailor':
        return `<rect x="34" y="62" width="32" height="24" rx="9" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<path d="M36 63 L50 76 L64 63 L66 70 L50 82 L34 70 Z" fill="${c.collar}" ${ST} stroke-width="1.6"/>` +
          `<path d="M38 66 L50 77 L62 66" fill="none" stroke="#fff" stroke-width="1.2"/>` +
          `<path d="M50 77 L44 82 L47 84 L50 80 L53 84 L56 82 Z" fill="${c.bow}" ${ST} stroke-width="1.1"/>` +
          `<path d="M34 84 L66 84 L71 97 L29 97 Z" fill="${c.skirt}" ${ST} stroke-width="2"/>` +
          `<path d="M40 85 L37 96 M46 85 L45 96 M54 85 L55 96 M60 85 L63 96" stroke="#000" stroke-opacity=".35" stroke-width="1.2"/>`;
      case 'kimono':
        return `<path d="M33 66 Q33 62 38 62 L62 62 Q67 62 67 66 L68 99 L32 99 Z" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<path d="M42 62.5 L56 80 M58 62.5 L48 74" stroke="#fbfaf6" stroke-width="2.6"/>` +
          `<rect x="33" y="78" width="34" height="8" fill="${c.obi}" ${ST} stroke-width="1.6"/>` +
          `<path d="M33 82 H67" stroke="${c.cord}" stroke-width="1.4"/>` +
          `<path d="M52 86 L50 99" stroke="#3a3940" stroke-width="1.2"/>`;
      case 'skydress':
        return `<path d="M38 62 L62 62 L64 78 L71 98 L29 98 L36 78 Z" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<path d="M41 62 Q50 68 59 62" fill="none" stroke="${c.shade}" stroke-width="1.8"/>` +
          `<path d="M36 78 Q50 81 64 78" fill="none" stroke="${c.shade}" stroke-width="1.6"/>` +
          `<path d="M34 90 Q42 93 50 90 Q58 93 66 90" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/>`;
      case 'cheer':
        return base + shade +
          `<path d="M41 62.6 L50 72 L59 62.6" fill="none" stroke="${c.trim}" stroke-width="3"/>` +
          `<path d="M41 62.6 L50 72 L59 62.6" fill="none" stroke="${c.accent}" stroke-width="1.2"/>` +
          `<rect x="34" y="78" width="32" height="5" fill="${c.trim}"/><rect x="34" y="79.6" width="32" height="1.8" fill="${c.accent}"/>` +
          `<path d="M50 72 l1.6 3.4 l3.6 .4 l-2.7 2.4 l.8 3.6 l-3.3 -1.9 l-3.3 1.9 l.8 -3.6 l-2.7 -2.4 l3.6 -.4 Z" transform="translate(0 -1) scale(.8) translate(12.5 18)" fill="${c.trim}"/>`;
      case 'y2k':
        return `<rect x="34" y="62" width="32" height="20" rx="8" fill="${c.uni}" ${ST} stroke-width="2"/>` +
          `<rect class="skin" x="36" y="80" width="28" height="6" fill="${BASE_SKIN}" ${ST} stroke-width="1.6"/>` +
          `<rect x="33" y="85" width="34" height="11" rx="4" fill="${c.pants}" ${ST} stroke-width="1.8"/>` +
          `<path d="M36 88 Q50 92 64 88" fill="none" stroke="#c9ced3" stroke-width="1.4"/>` +
          `<path d="M44 70 l2 -4 l2 4 l4 0 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 Z" fill="#fff" opacity=".9"/>`;
      default:
        return base + shade;
    }
  }

  function prop(slot, c) {
    if (slot === 'a') {
      const guitar = `<g transform="rotate(-28 46 82)">` +
        `<rect x="51" y="79.6" width="36" height="4.8" rx="1.4" fill="#7a4a26" ${ST} stroke-width="1.5"/>` +
        `<path d="M58 79.8 v4.4 M64 79.8 v4.4 M70 79.8 v4.4 M76 79.8 v4.4" stroke="#d9c7a0" stroke-width=".8"/>` +
        `<rect x="85" y="78.2" width="8" height="7.6" rx="2" fill="#3a2716" ${ST} stroke-width="1.5"/>` +
        `<ellipse cx="39.5" cy="85" rx="11" ry="9" fill="${INK}"/><ellipse cx="49" cy="82" rx="7.6" ry="6.6" fill="${INK}"/>` +
        `<ellipse cx="39.5" cy="85" rx="9.2" ry="7.2" fill="#d58c40"/><ellipse cx="49" cy="82" rx="5.8" ry="4.8" fill="#d58c40"/>` +
        `<circle cx="45" cy="83.2" r="2.9" fill="${INK}"/><rect x="34" y="83.4" width="2.4" height="4" rx=".6" fill="${INK}"/></g>`;
      return `<g class="prop" data-px="50" data-py="80">${guitar}` +
        `${limb('M37 67 Q31 80 42 85.5', c.sleeve)}${hand(42.5, 85.5)}` +
        `${limb('M63 67 Q74 80 75 68.5', c.sleeve)}${hand(75.5, 67.5)}</g>`;
    }
    return `<g class="prop" data-px="63" data-py="67">${limb('M63 67 L69.5 79.5 L64.6 64.5', c.sleeve)}` +
      `<path d="M64.8 63.6 L60.3 57.2" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>` +
      `<circle cx="59.4" cy="55.8" r="3.5" fill="#9ca3aa" ${ST} stroke-width="1.4"/>` +
      `<path d="M57 55 h4.8 M57.4 57 h4" stroke="#6d747b" stroke-width=".8"/>` +
      `${hand(64.8, 64.4)}</g>`;
  }


  function wings() {
    const L = `<path d="M41 68 C31 52 15 49 12 58 C9 68 25 73 41 70 Z" fill="#d8f0ff" fill-opacity=".75" ${ST} stroke-width="1.2" stroke-opacity=".6"/>` +
      `<path d="M41 71 C31 75 20 85 25 90 C30 94 39 83 41 73 Z" fill="#e9dcff" fill-opacity=".75" ${ST} stroke-width="1.2" stroke-opacity=".6"/>` +
      `<path d="M39 68 C30 60 22 58 17 60" fill="none" stroke="#fff" stroke-width="1" stroke-opacity=".9"/>`;
    const R = L.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${(100 - Number(x)).toFixed(1)} ${y}`);
    return `<g class="wings" display="none"><g class="wing-l">${L}</g><g class="wing-r">${R}</g></g>`;
  }

  function markup(slot, uid, ghost, outfit) {
    const c = look(slot, outfit);
    const gun = `<g class="gun" display="none"><rect class="skin" x="-1.6" y="19" width="3.2" height="8.5" rx="1.6" fill="${BASE_SKIN}" ${ST} stroke-width="1.3"/>` +
      `<rect class="skin" x="1.5" y="16.6" width="5.2" height="2.8" rx="1.4" fill="${BASE_SKIN}" ${ST} stroke-width="1.2"/></g>`;
    const brush = `<g class="brush" display="none"><rect x="-1.3" y="16" width="2.6" height="17" rx="1" fill="#8a5a2b" ${ST} stroke-width="1"/>` +
      `<path d="M-2.2 32 Q0 41 2.2 32 Z" fill="${INK}"/></g>`;
    const darm = (cls, x) => `<g class="darm ${cls}" display="none" transform="translate(${x} 67)">${limb('M0 0 L0 15', c.sleeve)}${cls === 'darm-r' ? brush : ''}${hand(0, 18.5)}${cls === 'darm-r' ? gun : ''}</g>`;
    const barm = (cls, x) => `<g class="barm ${cls}" display="none" transform="translate(${x} 67)">${limb('M0 0 L0 10 L10 10', c.sleeve)}${hand(12.5, 10)}</g>`;
    const armHang = slot === 'b' ? `<g class="arm-hang" transform="translate(37 67)">${limb('M0 0 L-1 16', c.sleeve)}${hand(-1, 19.5)}</g>` : '';
    return `<svg class="sprite" viewBox="0 0 100 124" overflow="visible" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><radialGradient id="fg${uid}"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>` +
      `<filter id="fb${uid}" filterUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="224"><feGaussianBlur stdDeviation="0.55"/></filter>` +
      `<linearGradient id="sh${uid}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>` +
      `<filter id="fo${uid}" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="0.85" result="d"/><feFlood flood-color="${INK}" flood-opacity=".8"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
      `<mask id="fm${uid}" maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="224"><path class="cut" fill="#fff" filter="url(#fb${uid})"/></mask></defs>` +
      (ghost ? `<image class="photo-ghost" opacity=".3" preserveAspectRatio="none" display="none"/>` : '') +
      `<g class="all"><ellipse class="shadow" cx="50" cy="120" rx="19" ry="3.2" fill="#000" opacity=".2"/>` +
      `${leg('leg-l', 44.5, c)}${leg('leg-r', 55.5, c)}` +
      `<g class="body">${wings()}<rect class="skin" x="45" y="54" width="10" height="11" fill="${BASE_SKIN}" ${ST} stroke-width="1.7"/>` +
      `${torso(slot, c)}<rect x="31" y="61" width="38" height="37" rx="12" fill="url(#sh${uid})" pointer-events="none"/>${armHang}${darm('darm-l', 37)}${darm('darm-r', 63)}${barm('barm-l', 40)}${barm('barm-r', 60)}` +
      `<g class="head"><g class="ears">` +
      `<circle class="skin" cx="29.6" cy="47" r="4.6" fill="${BASE_SKIN}" ${ST} stroke-width="1.8"/>` +
      `<circle class="skin" cx="70.4" cy="47" r="4.6" fill="${BASE_SKIN}" ${ST} stroke-width="1.8"/></g>` +
      `<ellipse class="skin headbase" cx="50" cy="44.5" rx="21" ry="22" fill="${BASE_SKIN}" ${ST} stroke-width="2"/>` +
      `${drawnFace(slot, c)}${headwear(slot, c)}` +
      `<clipPath id="fc${uid}"><rect x="-100" y="-200" width="300" height="264.5"/></clipPath>` +
      `<g class="photo" display="none"><g clip-path="url(#fc${uid})"><g mask="url(#fm${uid})"><image class="photo-img" preserveAspectRatio="none"/></g></g>` +
      `<path class="cut-line" fill="none" stroke="${INK}" stroke-width="1.3" stroke-opacity=".4" stroke-linejoin="round"/></g>` +
`<g class="whistle" display="none"><path d="M57 58 Q62 64 58 70" fill="none" stroke="#d9473a" stroke-width="1.1"/>` +
      `<rect x="51.5" y="55.6" width="8.6" height="5.2" rx="2.6" fill="#c9ced3" ${ST} stroke-width="1.3"/>` +
      `<rect x="47.6" y="56.9" width="4.6" height="2.6" rx="1" fill="#aab1b7" ${ST} stroke-width="1.1"/>` +
      `<circle cx="57.4" cy="58.2" r="1.2" fill="${INK}"/></g>` +
      `</g>${prop(slot, c)}</g></g></svg>`;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  class CharRig {
    constructor(slot, opts = {}) {
      this.slot = slot;
      this.opts = opts;
      this.outfit = opts.outfit || 'military';
      this.fairy = false;
      this.photoImg = null;
      this.photoUrl = null;
      this.params = null;
      this.build();
    }

    build() {
      this.uid = 'r' + ++seq + Math.random().toString(36).slice(2, 6);
      const t = document.createElement('template');
      t.innerHTML = markup(this.slot, this.uid, this.opts.ghost, this.outfit).trim();
      this.svg = t.content.firstElementChild;
      const q = (s) => this.svg.querySelector(s);
      this.p = {
        all: q('.all'), body: q('.body'), legL: q('.leg-l'), legR: q('.leg-r'), arm: q('.arm-hang'),
        head: q('.head'), prop: q('.prop'), drawn: q('.drawn'), photo: q('.photo'), img: q('.photo-img'),
        ghost: q('.photo-ghost'), cut: q('.cut'), cutLine: q('.cut-line'), hat: q('.hat'), ears: q('.ears'), headbase: q('.headbase'), wings: q('.wings'), darmL: q('.darm-l'), barmL: q('.barm-l'), barmR: q('.barm-r'), bootR: q('.leg-r .boot'), bare: q('.bare'), toe: q('.toe'), whistle: q('.whistle'), gun: q('.gun'), brush: q('.brush'), darmR: q('.darm-r'), wingL: q('.wing-l'), wingR: q('.wing-r'), mouthC: q('.mouth-c'), mouthO: q('.mouth-o'), shadow: q('.shadow'),
      };
      this.eyes = [...this.svg.querySelectorAll('.eye')];
      this.skinEls = [...this.svg.querySelectorAll('.skin')];
      this.pivot = [Number(this.p.prop.dataset.px), Number(this.p.prop.dataset.py)];
    }

    async setOutfit(name) {
      name = name || 'military';
      if (name === this.outfit) return;
      this.outfit = name;
      const old = this.svg;
      const url = this.photoUrl, pr = this.params, skin = this.skin;
      this.photoUrl = null;
      this.build();
      old.replaceWith(this.svg);
      this.setFairy(this.fairy);
      if (url) {
        await this.setPhoto(url);
        if (pr) this.place(pr);
      } else if (skin) this.setSkin(skin);
    }

    headTop() {
      if (this.photoImg && this.params && this.params.cut) return Math.min(this.unitFromImg(0, 0)[1], this.unitFromImg(1, 0)[1], this.unitFromImg(0.5, 0)[1]);
      if (this.photoImg && this.contourUnits) return Math.min(...this.contourUnits.map((p) => p[1]));
      return this.outfit === 'animal' ? 13 : this.outfit === 'pajama' ? 11 : 16;
    }

    S(el, a, v) {
      if (el && el['_' + a] !== v) {
        el.setAttribute(a, v);
        el['_' + a] = v;
      }
    }

    pose(o) {
      const f = (n) => (n || 0).toFixed(2);
      const S = this.S.bind(this);
      S(this.p.all, 'transform', `translate(50 120) scale(${f(o.sx ?? 1)} ${f(o.sy ?? 1)}) translate(-50 -120)`);
      const hy = (92 + 17 * (o.sit || 0)).toFixed(2);
      S(this.p.legL, 'transform', `translate(44.5 ${hy}) rotate(${f(o.legL)})`);
      S(this.p.legR, 'transform', `translate(55.5 ${hy}) rotate(${f(o.legR)})`);
      S(this.p.body, 'transform', `translate(0 ${f(o.bob)}) rotate(${f(o.lean)} 50 96)`);
      S(this.p.arm, 'transform', `translate(37 67) rotate(${f(o.arm)})`);
      S(this.p.head, 'transform', `rotate(${f(o.tilt)} 50 62) translate(0 ${f(o.nod)})`);
      S(this.p.prop, 'transform', `rotate(${f(o.prop)} ${this.pivot[0]} ${this.pivot[1]})`);
      const b = f(o.blink ?? 1);
      for (const e of this.eyes) {
        const cx = Number(e.dataset.cx), cy = Number(e.dataset.cy);
        S(e, 'transform', `translate(${cx} ${cy}) scale(1 ${b}) translate(${-cx} ${-cy})`);
      }
      S(this.p.mouthC, 'display', o.mouth ? 'none' : 'inline');
      S(this.p.mouthO, 'display', o.mouth ? 'inline' : 'none');
      S(this.p.wingL, 'transform', `rotate(${f(-(o.wing || 0))} 41 69)`);
      S(this.p.wingR, 'transform', `rotate(${f(o.wing || 0)} 59 69)`);
      S(this.p.whistle, 'display', o.whistle ? 'inline' : 'none');
      S(this.p.gun, 'display', o.gun ? 'inline' : 'none');
      S(this.p.brush, 'display', o.brush ? 'inline' : 'none');
      const tz = o.toe != null;
      S(this.p.bootR, 'display', tz ? 'none' : 'inline');
      S(this.p.bare, 'display', tz ? 'inline' : 'none');
      if (tz) S(this.p.toe, 'transform', `rotate(${f(o.toe)} 6 21)`);
      const bz = !!o.bent;
      const bl = bz && o.bent[0] != null, br = bz && o.bent[1] != null;
      const dz = !!o.darm;
      const dl = dz && !bl, dr = dz && !br;
      S(this.p.barmL, 'display', bl ? 'inline' : 'none');
      S(this.p.barmR, 'display', br ? 'inline' : 'none');
      if (bl) S(this.p.barmL, 'transform', `translate(40 67) rotate(${f(o.bent[0])})`);
      if (br) S(this.p.barmR, 'transform', `translate(60 67) rotate(${f(o.bent[1])})`);
      S(this.p.darmL, 'display', dl ? 'inline' : 'none');
      S(this.p.darmR, 'display', dr ? 'inline' : 'none');
      S(this.p.prop, 'display', dz || bz ? 'none' : 'inline');
      S(this.p.arm, 'display', dz || bz ? 'none' : 'inline');
      if (dz) {
        S(this.p.darmL, 'transform', `translate(37 67) rotate(${f(o.darm[0])})`);
        S(this.p.darmR, 'transform', `translate(63 67) rotate(${f(o.darm[1])})`);
      }
      S(this.p.shadow, 'opacity', f(o.shadow ?? 0.2));
      S(this.p.shadow, 'rx', f(19 * (o.shadowScale ?? 1)));
    }

    setFairy(on) {
      this.fairy = on;
      this.p.wings.setAttribute('display', on ? 'inline' : 'none');
    }

    setSkin(color) {
      this.skin = color;
      for (const el of this.skinEls) el.setAttribute('fill', color);
    }

    async setPhoto(url) {
      if (!url) {
        this.photoImg = null;
        this.photoUrl = null;
        this.showPhoto(false);
        this.setSkin(BASE_SKIN);
        return null;
      }
      if (url !== this.photoUrl) {
        const img = await loadImage(url);
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        this.ctx = cv.getContext('2d', { willReadFrequently: true });
        this.ctx.drawImage(img, 0, 0);
        this.photoImg = img;
        this.photoUrl = url;
        this.p.img.setAttribute('href', url);
        if (this.p.ghost) this.p.ghost.setAttribute('href', url);
      }
      this.showPhoto(true);
      return this.photoImg;
    }

    showPhoto(on) {
      const v = (x) => (x ? 'inline' : 'none');
      if (on) this.p.body.appendChild(this.p.head);
      else this.p.body.insertBefore(this.p.head, this.p.prop);
      this.p.photo.setAttribute('display', v(on));
      for (const k of ['drawn', 'hat', 'ears', 'headbase']) this.p[k].setAttribute('display', v(!on));
      if (this.p.ghost) this.p.ghost.setAttribute('display', v(on));
    }

    geom(pr = this.params) {
      const img = this.photoImg;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const k = Math.max(FACE.w / iw, FACE.h / ih) * pr.s;
      const a = ((pr.r || 0) * Math.PI) / 180;
      return { iw, ih, k, a, ox: FACE.cx - (iw * k) / 2, oy: FACE.cy - (ih * k) / 2 };
    }

    unitFromImg(u, v, pr = this.params) {
      const g = this.geom(pr);
      const x = g.ox + u * g.iw * g.k, y = g.oy + v * g.ih * g.k;
      const dx = x - FACE.cx, dy = y - FACE.cy;
      return [FACE.cx + dx * Math.cos(g.a) - dy * Math.sin(g.a) + pr.x, FACE.cy + dx * Math.sin(g.a) + dy * Math.cos(g.a) + pr.y];
    }

    imgFromUnit(X, Y, pr = this.params) {
      const g = this.geom(pr);
      const dx = X - pr.x - FACE.cx, dy = Y - pr.y - FACE.cy;
      const x = FACE.cx + dx * Math.cos(-g.a) - dy * Math.sin(-g.a);
      const y = FACE.cy + dx * Math.sin(-g.a) + dy * Math.cos(-g.a);
      return [(x - g.ox) / (g.iw * g.k), (y - g.oy) / (g.ih * g.k)];
    }

    place(pr) {
      const img = this.photoImg;
      if (!img) return;
      const cut = !!pr.cut;
      const bigOval = [];
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        bigOval.push([0.5 + Math.sin(t) * 0.95, 0.5 - Math.cos(t) * 0.95]);
      }
      const pts = cut ? bigOval : pr.pts && pr.pts.length >= 5 ? pr.pts : guessContour(img);
      this.params = { x: pr.x, y: pr.y, s: pr.s, r: pr.r || 0, pts: cut ? null : pts, cut };
      const g = this.geom();
      const w = g.iw * g.k, h = g.ih * g.k;
      const tr = `translate(${pr.x.toFixed(3)} ${pr.y.toFixed(3)}) rotate(${(pr.r || 0).toFixed(2)} ${FACE.cx} ${FACE.cy})`;
      for (const el of [this.p.img, this.p.ghost]) {
        if (!el) continue;
        el.setAttribute('x', g.ox.toFixed(3));
        el.setAttribute('y', g.oy.toFixed(3));
        el.setAttribute('width', w.toFixed(3));
        el.setAttribute('height', h.toFixed(3));
        el.setAttribute('transform', tr);
      }
      if (cut) this.p.img.setAttribute('filter', `url(#fo${this.uid})`);
      else this.p.img.removeAttribute('filter');
      this.p.cutLine.setAttribute('display', cut ? 'none' : 'inline');
      const U = pts.map(([u, v]) => this.unitFromImg(u, v));
      const d = smoothPath(U);
      this.p.cut.setAttribute('d', d);
      this.p.cutLine.setAttribute('d', d);
      this.contourUnits = cut ? null : U;
      if (cut) this.sampleSkinAt([[0.32, 0.62], [0.68, 0.62], [0.5, 0.55]]);
      else this.sampleSkin(U);
    }

    sampleSkin(U) {
      const xs = U.map((p) => p[0]), ys = U.map((p) => p[1]);
      const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
      this.sampleSkinAt([[0.3, 0.66], [0.7, 0.66], [0.5, 0.6]].map(([fx, fy]) => this.imgFromUnit(bx + bw * fx, by + bh * fy)), bw);
    }

    sampleSkinAt(uvs, bwUnits) {
      const g = this.geom();
      const rad = Math.max(1, Math.round(bwUnits ? (bwUnits * 0.06) / g.k : g.iw * 0.04));
      let r = 0, gr = 0, b = 0, n = 0;
      for (const [u, v] of uvs) {
        const px = u * g.iw, py = v * g.ih;
        const x1 = Math.max(0, Math.round(px - rad)), y1 = Math.max(0, Math.round(py - rad));
        const x2 = Math.min(g.iw, Math.round(px + rad)), y2 = Math.min(g.ih, Math.round(py + rad));
        if (x2 <= x1 || y2 <= y1) continue;
        const d = this.ctx.getImageData(x1, y1, x2 - x1, y2 - y1).data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue;
          r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++;
        }
      }
      const avg = n ? [r / n, gr / n, b / n] : [0, 0, 0];
      const skinLike = n && avg[0] > 90 && avg[0] > avg[1] && avg[1] > avg[2] * 0.85 && avg[0] - avg[2] > 25;
      if (!skinLike) {
        this.setSkin(BASE_SKIN);
        return;
      }
      const base = hexToRgb(BASE_SKIN);
      const mix = avg.map((v, i) => Math.round(v * 0.85 + base[i] * 0.15));
      this.setSkin(`rgb(${mix.join(',')})`);
    }
  }

  function smoothPath(P) {
    const n = P.length;
    const f = (v) => v.toFixed(2);
    let d = `M${f(P[0][0])} ${f(P[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + 'Z';
  }

  function guessBox(img) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const bw = Math.min(iw, ih) * 0.5;
    return { x: iw / 2 - bw / 2, y: ih * 0.45 - bw * 0.55, width: bw, height: bw * 1.3 };
  }

  function contourFromBox(box, iw, ih) {
    const cx = box.x + box.width / 2, cy = box.y + box.height * 0.5;
    const rx = box.width * 0.54, top = box.height * 0.8, bot = box.height * 0.46;
    const pts = [];
    const N = 14;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const c = Math.cos(t), sn = Math.sin(t);
      const jaw = c < 0 ? 1 - 0.42 * Math.pow(-c, 1.4) : 1;
      pts.push([(cx + rx * sn * jaw) / iw, (cy - (c > 0 ? top : bot) * c) / ih]);
    }
    return pts;
  }

  function guessContour(img) {
    return contourFromBox(guessBox(img), img.naturalWidth, img.naturalHeight);
  }

  async function autoFit(img) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let box = null;
    try {
      if ('FaceDetector' in window) {
        const found = await new window.FaceDetector({ maxDetectedFaces: 1, fastMode: false }).detect(img);
        if (found && found[0]) box = found[0].boundingBox;
      }
    } catch (e) {
      box = null;
    }
    if (!box) box = guessBox(img);
    const kc = Math.max(FACE.w / iw, FACE.h / ih);
    const k = 28 / box.width;
    const ex = box.x + box.width / 2, ey = box.y + box.height * 0.42;
    const icx = 50 + (iw / 2 - ex) * k;
    const icy = 45 + (ih / 2 - ey) * k;
    return { x: icx - FACE.cx, y: icy - FACE.cy, s: k / kc, r: 0, pts: contourFromBox(box, iw, ih) };
  }

  window.CharRig = CharRig;
  window.CharOutfits = Object.fromEntries(Object.entries(OUTFITS).map(([k, v]) => [k, v.name]));
  window.CharFit = autoFit;
})();
