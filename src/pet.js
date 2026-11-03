'use strict';
/* 異種孵化場 v0.3 — 讓飼養箱裡的怪獸「活起來」
   ・只負責表演，不改任何遊戲數值。
   ・一個 requestAnimationFrame 迴圈，以每秒 10 格（復古逐格）更新；分頁隱藏時自動暫停。
   ・位置、跳躍、壓扁伸長都以「像素格」為單位移動，保持像素風清晰。 */
(function () {
  const FRAME = 100;                                   // 1 格 = 100ms（10 fps）
  const RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const reduced = () => RMQ.matches || (typeof S !== 'undefined' && S && S.calm);
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (w) => { let t = Math.random() * Object.values(w).reduce((a, b) => a + b, 0); for (const k in w) { t -= w[k]; if (t <= 0) return k; } return 'rest'; };

  /* 各階段的動作個性：初胚體軟Q愛彈跳，越大越穩重 */
  const STP = [
    { br: 900, amp: .07, hop: 16, slow: 1, gap: [500, 1500], w: { hop: 4, wander: 3, look: .6, rest: 2 } },
    { br: 1300, amp: .045, hop: 14, slow: 1, gap: [700, 2200], w: { hop: 2, wander: 4, look: 1.5, rest: 2.5 } },
    { br: 1700, amp: .032, hop: 10, slow: 1, gap: [900, 2600], w: { hop: 1.2, wander: 4, look: 2, rest: 3 } },
    { br: 2000, amp: .026, hop: 8, slow: 2, gap: [1100, 3000], w: { hop: .8, wander: 3.5, look: 2.2, rest: 3.5 } },
    { br: 2300, amp: .022, hop: 7, slow: 2, gap: [1300, 3200], w: { hop: .6, wander: 3, look: 2.5, rest: 4 } }];

  /* 像素表情圖（每格 = 1 像素，放大 3 倍顯示） */
  const PAL = { k: '#221722', r: '#e8434b', d: '#a8222c', p: '#ffb3c0', w: '#ffffff', b: '#4fa8ff', s: '#cfe8ff', y: '#ffd34a', o: '#ff8a3d', g: '#8fd16a', v: '#b48cff', n: '#8a5a2b' };
  const BM = {
    heart: ['.rr.rr.', 'rprrrrr', 'rprrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    anger: ['.r...r.', 'rrr.rrr', '.r...r.', '.......', '.r...r.', 'rrr.rrr', '.r...r.'],
    sweat: ['..b....', '..bb...', '.bsbb..', '.bsbb..', 'bbbbbb.', '.bbbb..', '..bb...'],
    note: ['...kkkk', '...k..k', '...k..k', '...k..k', '.kkk.kk', 'kkkkkkk', '.kk.kk.'],
    zzz: ['kkkkk..', '...k...', '..k....', '.k.....', 'kkkkk..', '....kkk', '.....k.', '....kkk'],
    spark: ['...y...', '...y...', '..ywy..', 'yywwwyy', '..ywy..', '...y...', '...y...'],
    excl: ['.rr.', 'rrrr', 'rrrr', '.rr.', '.rr.', '....', '.rr.', '.rr.'],
    ques: ['.kkk.', 'k...k', '....k', '...k.', '..k..', '.....', '..k..'],
    sad: ['b.b.b', 'b.b.b', 'b.b.b', 'b.b.b', '.....', '.....'],
    hungry: ['....ww', '...www', '..ooow', '.ooooo', 'ooooo.', 'ooo...', 'oo....'],
    stink: ['g..g..g', '.g..g..', '..g..g.', '.g..g..', 'g..g..g'],
    sick: ['.vvvv.', 'v....v', 'v.vv.v', 'v.v..v', 'v..vv.', '.v....', '..vvvv'],
    crumb: ['n'], dot: ['w'],
  };
  const ICON = {};
  function icon(n) {
    if (ICON[n]) return ICON[n];
    const rows = BM[n], h = rows.length, w = Math.max(...rows.map(r => r.length)); let r = '';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[ch]}"/>`; }));
    return (ICON[n] = { src: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${r}</svg>`), w: w * 3, h: h * 3 });
  }
  const CRUMB = { meat: '#b8322a', calc: '#efe2c4', bug: '#76b84a', gel: '#6ff2ff', std: '#d4b26a' };
  const FICON = { meat: '🥩', calc: '🦴', bug: '🐛', gel: '🧪', std: '🌾' };

  const LOG = [];   // 最近的反應（測試用）
  const PET = new Map();   // 怪獸 id → 動畫狀態（切換分頁回來位置不變）
  const st = (id) => { let s = PET.get(id); if (!s) { s = { x: 0, dir: Math.random() < .5 ? -1 : 1, act: null, nextEmote: performance.now() + R(2500, 5000), taps: [], code: null }; PET.set(id, s); } return s; };

  function build(el, s) {
    el.innerHTML = '<div class="pshadow"></div><div class="pfood hidden"></div><div class="pbody"><img class="px" alt="" draggable="false"></div><div class="pemote hidden"><img class="px" alt=""></div><div class="pfx"></div>';
    s.el = el; s.body = el.querySelector('.pbody'); s.img = s.body.firstChild; s.em = el.querySelector('.pemote'); s.emImg = s.em.firstChild;
    s.fx = el.querySelector('.pfx'); s.food = el.querySelector('.pfood'); s.shadow = el.querySelector('.pshadow'); s.w = 0; s.css = ''; s.filter = null; s.emCss = ''; s.emName = '';
    s.body.addEventListener('pointerdown', (e) => { e.stopPropagation(); tap(s, e); });
  }
  function setCode(s) {
    const el = s.el, code = el.dataset.code, sz = (typeof SIZES !== 'undefined' ? SIZES : {})[code] || [100, 100];
    let h = +el.dataset.h || 140, w = Math.round(sz[0] * h / sz[1]);
    const maxW = Math.max(80, (el.clientWidth || 340) * .9); if (w > maxW) { h = Math.round(h * maxW / w); w = Math.round(maxW); }
    s.w = w; s.h = h; s.px = Math.max(2, Math.round(h / 60));    // 1 個「像素格」約多少 CSS px
    s.img.src = `img/${code}.png`; s.img.width = w; s.img.height = h;
    s.body.style.width = w + 'px'; s.body.style.height = h + 'px'; s.body.style.marginLeft = -w / 2 + 'px';
    s.shadow.style.width = Math.round(w * .7) + 'px'; s.shadow.style.marginLeft = -Math.round(w * .35) + 'px';
    if (s.code && s.code !== code) react(s, 'evolve');
    s.code = code;
  }
  const q = (s, v) => Math.round(v / s.px) * s.px;
  const range = (s) => Math.max(0, ((s.el.clientWidth || 340) - s.w) / 2 - 6);

  /* ---------- 表情泡泡與特效 ---------- */
  function emote(s, name, ms = 1600) { s.emName = name; s.emUntil = performance.now() + ms; const ic = icon(name); s.emImg.src = ic.src; s.emImg.width = ic.w; s.emImg.height = ic.h; s.em.classList.remove('hidden', 'pop'); void s.em.offsetWidth; s.em.classList.add('pop'); }
  function particle(s, cls, x, y, extra = {}) {
    if (s.fx.childElementCount > 24) return;
    const d = document.createElement(extra.img ? 'img' : 'i'); d.className = 'pp ' + cls;
    if (extra.img) { const ic = icon(extra.img); d.src = ic.src; d.width = extra.size || ic.w; d.height = extra.size ? Math.round(extra.size * ic.h / ic.w) : ic.h; d.classList.add('px'); }
    if (extra.text) d.textContent = extra.text;
    if (extra.color) d.style.background = extra.color;
    d.style.left = `calc(50% + ${Math.round(x)}px)`; d.style.bottom = Math.round(y) + 'px';
    if (extra.dx !== undefined) d.style.setProperty('--dx', extra.dx + 'px');
    s.fx.appendChild(d); setTimeout(() => d.remove(), extra.life || 1200);
  }
  const FLOOR = 24;

  /* ---------- 互動反應 ---------- */
  function react(s, type, data = {}) {
    const now = performance.now();
    if (s.act && s.act.type === 'eat' && type === 'tap') return;
    s.act = { type, t0: now, data, phase: 0 }; LOG.push(type + '@' + Math.round(now)); if (LOG.length > 30) LOG.shift();
    if (type === 'eat') {
      const r = range(s); let fx = s.x + (Math.random() < .5 ? -1 : 1) * R(60, 100);
      if (fx > r + s.w * .3 || fx < -r - s.w * .3) fx = s.x - Math.sign(fx - s.x) * R(60, 100);
      fx = Math.max(-r - s.w * .25, Math.min(r + s.w * .25, fx));
      s.act.fx = Math.round(fx); s.food.textContent = FICON[data.k] || '🍖'; s.food.style.left = `calc(50% + ${s.act.fx}px)`; s.food.style.transform = 'translateX(-50%)'; s.food.classList.remove('hidden');
      s.act.dirTo = s.act.fx >= s.x ? 1 : -1; s.act.stand = s.act.fx - s.act.dirTo * s.w * .32;
      emote(s, 'excl', 700);
    }
    if (type === 'clean') { for (let k = 0; k < 4; k++) particle(s, 'sp', -(s.el.clientWidth / 2) + R(14, 60), R(4, 30), { img: 'spark', life: 900 }); emote(s, 'note', 1500); }
    if (type === 'medicine') emote(s, 'sweat', 900);
    if (type === 'train') emote(s, 'excl', 900);
    if (type === 'sleep') emote(s, 'zzz', 1800);
    if (type === 'wake') emote(s, 'excl', 900);
    if (type === 'magic') { emote(s, 'ques', 800); for (let k = 0; k < 6; k++) particle(s, 'sp up', s.x + R(-s.w / 2, s.w / 2), FLOOR + R(10, s.h), { img: 'spark', life: 1000 }); }
    if (type === 'evolve') { emote(s, 'excl', 1200); for (let k = 0; k < 8; k++) particle(s, 'sp up', s.x + R(-s.w / 2, s.w / 2), FLOOR + R(10, s.h), { img: 'spark', life: 1100 }); }
    if (type === 'tap') emote(s, data.mad ? 'anger' : (Math.random() < .5 ? 'heart' : 'note'), data.mad ? 1600 : 1000);
  }
  function tap(s, e) {
    if (s.el.dataset.mood === 'sleep') { emote(s, 'zzz', 1200); return; }
    const now = performance.now(); s.taps = s.taps.filter(t => now - t < 4000); s.taps.push(now);
    const r = s.body.getBoundingClientRect(), from = (e.clientX || r.left + r.width / 2) < r.left + r.width / 2 ? -1 : 1;
    if (s.act && s.act.type === 'tap' && s.act.data.mad) { s.act.t0 = Math.max(s.act.t0, now - 700); return; }   // 生氣中再戳：繼續不理你
    const mad = s.taps.length >= 5; if (mad) s.taps = [];
    react(s, 'tap', { mad, from });
  }

  /* ---------- 逐格更新 ---------- */
  function idleAct(s, P, mood) {
    let w = Object.assign({}, P.w);
    if (mood === 'sleep') w = { rest: 1 };
    else if (mood === 'sick') w = { rest: 4, wander: 1 };
    else if (mood === 'hungry' || mood === 'dirty' || mood === 'sad') w = { rest: 3, wander: 2, look: 1.5, hop: P.w.hop * .2 };
    const type = pick(w), now = performance.now();
    const a = { type, t0: now, idle: true };
    if (type === 'wander') { const r = range(s); a.tx = q(s, R(-r, r)); if (Math.abs(a.tx - s.x) < 20) a.tx = q(s, -Math.sign(s.x || 1) * R(r * .3, r)); }
    if (type === 'rest') a.dur = R(...P.gap) * (reduced() ? 2 : 1);
    if (type === 'look') { a.dur = 1800; if (Math.random() < .25 && mood === 'ok') emote(s, 'ques', 900); }
    if (type === 'hop' && reduced() && Math.random() < .5) a.type = 'rest', a.dur = 1200;
    return a;
  }
  function hopY(t, H) { return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) * H; }

  function frame(s, now, fi) {
    const el = s.el, stage = +el.dataset.stage || 0, mood = el.dataset.mood || 'ok', P = STP[stage] || STP[2], red = reduced();
    const slowM = mood === 'sick' ? 2 : mood === 'sleep' ? 3 : 1;
    let y = 0, sx = 1, sy = 1, jx = 0, filter = '';
    // 呼吸：從腳底壓扁／伸長（以像素格為單位）
    const br = P.br * slowM * (red ? 1.6 : 1), ph = Math.sin((now % br) / br * Math.PI * 2);
    let dh = q(s, P.amp * (red ? .5 : 1) * s.h * ph); if (mood === 'sleep') dh = q(s, P.amp * .6 * s.h * ph);
    sy = 1 + dh / s.h; sx = 1 - dh / s.h * .6;
    if (mood === 'sleep') { sy *= .84; sx *= 1.07; }
    if (mood === 'hungry' || mood === 'dirty' || mood === 'sad') sy -= s.px / s.h;   // 垂頭喪氣
    if (el.classList.contains('isshiny')) filter = 'hue-rotate(150deg) saturate(1.3) drop-shadow(0 0 6px #fff8) ';   // 異色（同原本的 .shiny）
    if (mood === 'sick') { filter += 'saturate(.35) brightness(1.18) sepia(.25) hue-rotate(50deg)'; if (!red) jx = (fi % 2 ? 1 : -1); }
    // 動作
    if (!s.act) s.act = idleAct(s, P, mood);
    const a = s.act, e = now - a.t0, H = s.px * Math.round(P.hop * (red ? .5 : 1) / s.px);
    const done = () => { s.act = null; };
    const step = s.px * (mood === 'sick' ? .5 : 1);
    const walkTo = (tx, fast) => {
      const d = tx - s.x; if (Math.abs(d) <= step * (fast ? 2 : 1)) { s.x = tx; return true; }
      if (fi % (fast ? 1 : (P.slow * slowM)) === 0) s.x += Math.sign(d) * step * (fast ? 2 : 1);
      s.dir = Math.sign(d); return false;
    };
    switch (a.type) {
      case 'rest': if (e > a.dur) done(); break;
      case 'look': s.dir = e < 500 ? s.dir : e < 1100 ? (a.d1 = a.d1 || -s.dir) : (a.d2 = a.d2 || -a.d1); if (e > a.dur) done(); break;
      case 'hop': { const t = e / 650; if (t < .2) { sy *= .9; sx *= 1.06; } else if (t < .9) y = hopY((t - .2) / .7, H); else { sy *= .93; sx *= 1.04; } if (t > 1) done(); break; }
      case 'wander': {
        const arrived = walkTo(a.tx, false);
        if (stage === 0) { const c = fi % 4; y = [0, H * .5, H * .7, H * .4][c]; if (c === 0) { sy *= .88; sx *= 1.08; } }   // 小軟泥一跳一跳
        else if (fi % 4 < 2) y = s.px;                                                                     // 走路的上下小晃
        if (arrived || e > 9000) done(); break;
      }
      case 'eat': {
        const sick = mood === 'sick', chomp = sick ? 340 : 220;
        if (a.phase === 0) { if (walkTo(Math.round(a.stand), true) || e > 4000) { a.phase = 1; a.t1 = now; s.dir = a.dirTo; } else if (fi % 2) y = s.px; break; }
        if (a.phase === 1) {
          const k = Math.floor((now - a.t1) / chomp), half = ((now - a.t1) % chomp) < chomp / 2;
          s.dir = a.dirTo;
          if (half) { sy *= .86; sx *= 1.08; jx += a.dirTo * s.px; } else sy *= 1.03;
          if (k !== a.lastK) { a.lastK = k; for (let n = 0; n < 3; n++) particle(s, 'crumb', a.fx + R(-8, 8), FLOOR + R(4, 14), { color: CRUMB[a.data.k], dx: Math.round(R(-26, 26)), life: 700 }); s.food.style.transform = `translateX(-50%) scale(${Math.max(0, 1 - (k + 1) / 6).toFixed(2)})`; }
          if (k >= 6) { a.phase = 2; a.t2 = now; s.food.classList.add('hidden');
            const kind = a.data.kind; emote(s, kind === 'love' ? 'heart' : kind === 'dislike' ? 'anger' : 'note', 1500);
            if (kind === 'love') particle(s, 'float', s.x + R(-10, 10), FLOOR + s.h, { img: 'heart', life: 1300 }); }
          break;
        }
        const t = now - a.t2, kind = a.data.kind;
        if (kind === 'dislike') { s.dir = Math.floor(t / 130) % 2 ? a.dirTo : -a.dirTo; sy *= .95; if (t > 800 && s.emName !== 'sweat') emote(s, 'sweat', 900); if (t > 1500) done(); }
        else { const n = kind === 'love' ? 2 : 1, len = 550; const hi = Math.floor(t / len); if (hi < n) { const tt = (t % len) / len; y = hopY(tt, H * (kind === 'love' ? 1.2 : .9)); } if (t > n * len + 300) done(); }
        break;
      }
      case 'clean': { s.dir = -1; if (e < 500) { sy *= 1.06; sx *= .97; } else if (e < 900) y = hopY((e - 500) / 400, H * .7); if (e > 1300) done(); break; }
      case 'medicine': {
        if (e < 800) { sy *= .84; sx *= 1.1; jx = (fi % 2 ? 1 : -1) * s.px; }
        else if (e < 1400) { if (s.emName !== 'spark') emote(s, 'spark', 1000); y = hopY((e - 800) / 600, H); }
        if (e > 1600) done(); break;
      }
      case 'train': {
        const n = 2, len = 700, k = Math.floor(e / len), tt = (e % len) / len;
        if (k < n) { y = hopY(tt, H * 2.2); if (tt > .15 && tt < .85) s.dir = Math.floor(e / 90) % 2 ? 1 : -1; else { sy *= .9; sx *= 1.06; } }
        if (e > n * len && s.emName !== 'note') emote(s, 'note', 1000);
        if (e > n * len + 500) done(); break;
      }
      case 'tap': {
        if (a.data.mad) { s.dir = e < 700 ? (Math.floor(e / 100) % 2 ? 1 : -1) : -a.data.from; sy *= .94; if (e > 2000) done(); }
        else { s.dir = a.data.from; y = hopY(e / 520, H * 1.1); if (e > 700) done(); }
        break;
      }
      case 'sleep': if (e > 1500) done(); break;
      case 'wake': case 'evolve': case 'magic': y = hopY(e / 600, H); if (e > 900) done(); break;
      default: done();
    }
    // 心情泡泡（定期出現）
    if (!s.act || s.act.idle) {
      if (mood === 'sleep') { if (now > s.nextEmote) { s.nextEmote = now + 1500; particle(s, 'zfloat', s.x + s.dir * s.w * .25, FLOOR + s.h * .7, { img: 'zzz', life: 1800 }); } }
      else if (mood !== 'ok' && now > s.nextEmote) { s.nextEmote = now + R(6000, 9000); emote(s, { hungry: 'hungry', dirty: 'stink', sad: 'sad', sick: 'sick' }[mood] || 'sad', 1800); }
    }
    // 套用（只在數值改變時寫入 DOM）
    const X = Math.round(s.x + jx), Y = Math.round(q(s, y));
    const css = `translate(${X}px,${-Y}px) scale(${(s.dir < 0 ? -1 : 1) * +sx.toFixed(3)},${+sy.toFixed(3)})`;
    if (css !== s.css) { s.css = css; s.body.style.transform = css; s.shadow.style.transform = `translateX(${X}px) scale(${Math.max(.5, 1 - Y / 60).toFixed(2)})`; }
    if (filter !== s.filter) { s.filter = filter; s.img.style.filter = filter; }
    if (s.emName && now > s.emUntil) { s.emName = ''; s.em.classList.add('hidden'); }
    if (s.emName) { const top = (s.el.clientHeight || 250) - s.em.offsetHeight - 12, eb = FLOOR + Y + Math.round(s.h * sy) + 10, over = eb > top;
      const ec = over ? `left:calc(50% + ${X + (s.dir < 0 ? -1 : 1) * Math.round(s.w * .42)}px);bottom:${Math.max(FLOOR + 10, Math.min(top, FLOOR + Y + Math.round(s.h * sy * .62)))}px` : `left:calc(50% + ${X}px);bottom:${eb}px`;
      /* 頭頂放不下就放在臉旁邊 */ if (ec !== s.emCss) { s.emCss = ec; s.em.style.cssText = ec; } }
  }

  const cereOpen = () => { const c = document.getElementById('cere'); return c && !c.classList.contains('hidden'); };
  let lastFi = -1;
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const fi = Math.floor(now / FRAME); if (fi === lastFi) return; lastFi = fi;
    const els = document.querySelectorAll('.pet[data-keep]'); if (!els.length) return;
    els.forEach((el) => {
      const s = st(el.dataset.keep);
      if (s.el !== el || !el.firstChild) build(el, s);
      if (!s.w || (s.code !== el.dataset.code && !cereOpen())) setCode(s);   // 進化：等進化動畫關掉後才換圖＋開心反應
      if (Math.abs(s.x) > range(s) + 1) s.x = q(s, Math.sign(s.x) * range(s));
      frame(s, now, fi);
    });
  }
  requestAnimationFrame(loop);

  /* ---------- 接上遊戲動作：動作成功才播反應 ---------- */
  const slotPet = (i) => { const c = S.slots[i]; return c && c.stage >= 0 ? st(c.id) : null; };
  function taste(c, k) {   // 純表演：最高傾向（或型態屬性）＝最愛；長大後吃到別的屬性會嫌棄
    const f = FOODS.find(x => x.k === k); if (!f || !f.t) return 'ok';
    if (typeof favFood === 'function' && favFood(c) === k) return 'love';   // v0.4：個性的最愛食物
    const own = F[c.code] && F[c.code].t, total = TK.reduce((a, t) => a + c.tend[t], 0), fav = own || (total ? topTend(c) : null);   // 成形體以後＝自己的屬性
    if (!fav) return 'ok'; if (f.t === fav) return 'love'; return c.stage >= 2 ? 'dislike' : 'ok';
  }
  const hook = (name, pre, post) => { const o = A[name]; if (!o) return; A[name] = function (...args) { const p = pre(...args); const r = o.apply(this, args); try { post(p, ...args); } catch (e) { console.warn(e); } return r; }; };
  hook('feed', (i, k) => { const c = S.slots[i]; return c && { n: c.feeds, kind: taste(c, k) }; }, (p, i, k) => { const c = S.slots[i]; if (p && c && c.feeds > p.n) react(slotPet(i), 'eat', { k, kind: p.kind }); });
  hook('clean', (i) => S.slots[i] && S.slots[i].poops, (p, i) => { const c = S.slots[i]; if (c && c.poops < p && c.stage >= 0) react(slotPet(i), 'clean'); });
  hook('potion', (i) => S.slots[i] && S.slots[i].sick, (p, i) => { const c = S.slots[i]; if (p && c && !c.sick) react(slotPet(i), 'medicine'); });
  hook('env', (i) => S.slots[i] && S.slots[i].env, (p, i) => { const c = S.slots[i]; if (c && c.env !== p) react(slotPet(i), 'train'); });
  hook('lamp', (i) => S.slots[i] && S.slots[i].pausedUntil > S.game, (p, i) => { const c = S.slots[i]; if (!c) return; const now = c.pausedUntil > S.game; if (now !== p) react(slotPet(i), now ? 'sleep' : 'wake'); });
  hook('catalyst', (i) => S.slots[i] && S.slots[i].catalystOn, (p, i) => { const c = S.slots[i]; if (c && c.catalystOn && !p) react(slotPet(i), 'magic'); });
  hook('stab', (i) => S.slots[i] && S.slots[i].stabilizerOn, (p, i) => { const c = S.slots[i]; if (c && c.stabilizerOn && !p) react(slotPet(i), 'magic'); });
  window.Pet = { log: LOG, react: (i, type, data) => { const s = slotPet(i); if (s) react(s, type, data); }, state: (i) => slotPet(i) };
})();
