'use strict';
/* 異種孵化場 v0.5 — 共用飼養圈（canvas）
   ・只負責畫面與動作，不改遊戲數值：遊戲每次 tick 把怪獸清單交給 Pen.sync()。
   ・每隻怪獸會呼吸、走來走去、餓了冒泡泡、去飼料槽吃東西、吃飽開心跳。
   ・異色＝換色盤（色相旋轉，只換有顏色的像素，保留黑框）；閃光＝金色調＋閃爍星星。 */
(function () {
  const PAL = { k: '#221722', r: '#e8434b', p: '#ffb3c0', w: '#ffffff', b: '#4fa8ff', s: '#cfe8ff', y: '#ffd34a', o: '#ff8a3d', g: '#8fd16a', n: '#8a5a2b', d: '#b07a1a' };
  const BM = {
    heart: ['.rr.rr.', 'rprrrrr', 'rprrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    note: ['...kkkk', '...k..k', '...k..k', '...k..k', '.kkk.kk', 'kkkkkkk', '.kk.kk.'],
    sweat: ['..b....', '..bb...', '.bsbb..', '.bsbb..', 'bbbbbb.', '.bbbb..', '..bb...'],
    zzz: ['kkkkk..', '...k...', '..k....', '.k.....', 'kkkkk..', '....kkk', '.....k.', '....kkk'],
    spark: ['...y...', '...y...', '..ywy..', 'yywwwyy', '..ywy..', '...y...', '...y...'],
    hungry: ['....ww', '...www', '..ooow', '.ooooo', 'ooooo.', 'ooo...', 'oo....'],
    coin: ['.yyyy.', 'yyddyy', 'yydyyy', 'yyddyy', 'yyydyy', 'yyddyy', '.yyyy.'],
    excl: ['.rr.', 'rrrr', 'rrrr', '.rr.', '.rr.', '....', '.rr.', '.rr.'],
  };
  const ICON = {};
  function icon(n) {
    if (ICON[n]) return ICON[n];
    const rows = BM[n], h = rows.length, w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas');
    c.width = w; c.height = h; const x = c.getContext('2d');
    rows.forEach((row, yy) => [...row].forEach((ch, xx) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(xx, yy, 1, 1); } }));
    return (ICON[n] = c);
  }
  /* ---------- 圖片與換色 ---------- */
  const IMG = {};
  function img(code) { if (!IMG[code]) { const i = new Image(); i.src = 'img/' + code + '.png?v=0.5'; IMG[code] = i; } return IMG[code]; }
  const VSHIFT = { 1: 160, 2: 42 };                         // 異色：色相 +160°；閃光：偏金 +42°
  const VCSS = { 1: 'hue-rotate(160deg) saturate(1.1)', 2: 'hue-rotate(42deg) saturate(1.3) brightness(1.12)' };
  const VC = {};
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
  function hue2(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
  function hsl2rgb(h, s, l) { if (!s) return [l * 255, l * 255, l * 255]; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [hue2(p, q, h + 1 / 3) * 255, hue2(p, q, h) * 255, hue2(p, q, h - 1 / 3) * 255]; }
  function sprite(code, v) {
    const key = code + '|' + (v || 0); if (VC[key]) return VC[key];
    const im = img(code); if (!im.complete || !im.naturalWidth) return null;
    if (!v) return (VC[key] = im);
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    try {
      const d = x.getImageData(0, 0, c.width, c.height), a = d.data, sh = VSHIFT[v] / 360;
      for (let i = 0; i < a.length; i += 4) {
        if (!a[i + 3]) continue;
        let [h, s, l] = rgb2hsl(a[i], a[i + 1], a[i + 2]);
        if (s < .14 || l < .1 || l > .96) { if (v === 2) { l = Math.min(1, l * 1.08 + .02); } else continue; }
        else { h = (h + sh) % 1; if (v === 2) { s = Math.min(1, s * 1.25); l = Math.min(.97, l * 1.1 + .03); } }
        const o = hsl2rgb(h, s, l); a[i] = o[0]; a[i + 1] = o[1]; a[i + 2] = o[2];
      }
      x.putImageData(d, 0, 0);
    } catch (e) {                                            // file:// 開啟時讀不到像素 → 改用濾鏡
      x.clearRect(0, 0, c.width, c.height); x.filter = VCSS[v]; x.drawImage(im, 0, 0); x.filter = 'none';
    }
    return (VC[key] = c);
  }
  /* ---------- 飼養圈 ---------- */
  const STH = [30, 36, 46, 60, 74, 90];                     // 各階段顯示高度（CSS px）
  const SPEED = [0, 34, 30, 26, 22, 19];
  const TROUGH = { N: '#d4b26a', F: '#e05a3a', S: '#c8c2b0', A: '#5fc6e8', M: '#a46ae0' };
  const AURA = { R: 'rgba(80,160,255,', L: 'rgba(255,200,60,', E: 'rgba(220,90,255,' };
  const rnd = (a, b) => a + Math.random() * (b - a);
  let cv, ctx, W = 360, H = 380, DPR = 1, bg = null, troughType = 'N', bedOn = false;
  const A = new Map(); const P = []; let last = 0, onTap = null, hidden = false;
  const floor = () => ({ x0: 26, x1: W - 26, y0: 96, y1: H - 70 });
  const troughBox = () => ({ x: W / 2 - 70, y: H - 52, w: 140, h: 26 });

  function resize() {
    if (!cv) return; const r = cv.parentElement.getBoundingClientRect();
    W = Math.round(Math.min(r.width || 360, 520)); H = Math.round(Math.min(Math.max(W * 1.02, 340), 440));
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    bg = null; for (const a of A.values()) clampA(a);
  }
  function makeBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    let seed = 7; const sr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    x.fillStyle = '#3c5a32'; x.fillRect(0, 0, W, H);
    for (let yy = 0; yy < H; yy += 6) for (let xx = 0; xx < W; xx += 6) { const t = sr(); x.fillStyle = t < .3 ? '#466a39' : t < .55 ? '#3a5530' : t < .62 ? '#57793f' : t < .66 ? '#6b5a3a' : '#40602f'; x.fillRect(xx, yy, 6, 6); }
    // 泥土小徑（飼料槽前）
    x.fillStyle = '#6b5236'; for (let i = 0; i < 160; i++) { const xx = W / 2 + (sr() - .5) * 220, yy = H - 80 + sr() * 70; x.fillRect(Math.round(xx / 6) * 6, Math.round(yy / 6) * 6, 6, 6); }
    // 草叢、石頭
    for (let i = 0; i < 14; i++) { const xx = 20 + sr() * (W - 40), yy = 100 + sr() * (H - 190); x.fillStyle = '#7fb24f'; x.fillRect(xx, yy, 3, 6); x.fillRect(xx + 4, yy - 3, 3, 9); x.fillRect(xx + 8, yy, 3, 6); }
    for (let i = 0; i < 5; i++) { const xx = 30 + sr() * (W - 60), yy = 110 + sr() * (H - 200); x.fillStyle = '#7d8077'; x.fillRect(xx, yy, 12, 6); x.fillStyle = '#9a9d93'; x.fillRect(xx + 3, yy - 3, 6, 3); }
    // 後方圍欄
    x.fillStyle = '#20301f'; x.fillRect(0, 0, W, 60);
    x.fillStyle = '#2a4a2c'; for (let xx = 0; xx < W; xx += 12) x.fillRect(xx, 30 + ((xx / 12) % 3) * 3, 12, 30);
    x.fillStyle = '#8a5a2b'; x.fillRect(0, 54, W, 8); x.fillRect(0, 72, W, 8);
    for (let xx = 8; xx < W; xx += 48) { x.fillStyle = '#6e461f'; x.fillRect(xx, 42, 10, 44); x.fillStyle = '#a8743a'; x.fillRect(xx, 42, 10, 4); }
    x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 86, W, 6);
    return c;
  }
  function drawTrough() {
    const t = troughBox();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(t.x + 4, t.y + t.h - 2, t.w, 8);
    ctx.fillStyle = '#6e461f'; ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.fillStyle = '#a8743a'; ctx.fillRect(t.x, t.y, t.w, 5); ctx.fillRect(t.x, t.y, 6, t.h); ctx.fillRect(t.x + t.w - 6, t.y, 6, t.h);
    ctx.fillStyle = TROUGH[troughType] || TROUGH.N;
    for (let i = 0; i < 20; i++) ctx.fillRect(t.x + 8 + (i * 13 % (t.w - 20)), t.y + 6 + (i * 7 % 8), 6, 4);
    if (bedOn) { ctx.fillStyle = 'rgba(240,210,120,.55)'; ctx.fillRect(10, H - 30, 60, 18); ctx.fillStyle = '#fff3c0'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('加速床', 18, H - 17); }
  }

  function clampA(a) { const f = floor(); a.x = Math.max(f.x0, Math.min(f.x1, a.x)); a.y = Math.max(f.y0, Math.min(f.y1, a.y)); }
  function newActor(m) {
    const f = floor();
    const a = { id: m.id, x: rnd(f.x0 + 20, f.x1 - 20), y: rnd(f.y0 + 20, f.y1), tx: 0, ty: 0, face: Math.random() < .5 ? -1 : 1, mode: 'idle', until: performance.now() + rnd(300, 2000),
      ph: Math.random() * 6.28, hop: 0, bub: null, bubUntil: 0, nextBub: performance.now() + rnd(1500, 5000), pop: 0, m };
    return a;
  }
  function sync(list, opt) {
    opt = opt || {}; troughType = opt.trough || 'N'; bedOn = !!opt.bed;
    const seen = new Set();
    for (const m of list) {
      seen.add(m.id); let a = A.get(m.id);
      if (!a) { a = newActor(m); A.set(m.id, a); }
      if (a.m && (a.m.code !== m.code || a.m.st !== m.st)) { a.pop = 1; burst(a.x, a.y - STH[m.st] / 2, 'spark', 10); }
      a.m = m;
    }
    for (const id of [...A.keys()]) if (!seen.has(id)) { const a = A.get(id); if (!a.leaving) A.delete(id); }
    if (!cv) return;
    img('egg_normal'); img('egg_rare'); img('egg_tutorial');
    for (const m of list) if (m.code) img(m.code);
  }
  function bubble(a, n, ms) { a.bub = n; a.bubUntil = performance.now() + (ms || 1600); }
  function burst(x, y, kind, n) { for (let i = 0; i < n; i++) P.push({ x, y, vx: rnd(-60, 60), vy: rnd(-120, -40), life: rnd(.6, 1.1), t: 0, kind }); }
  function feed(ids, type) {
    troughType = type || troughType; const t = troughBox(); let k = 0; const n = ids.length;
    for (const id of ids) { const a = A.get(id); if (!a || a.m.st === 0) continue;
      a.mode = 'toEat'; a.tx = t.x + 14 + (n > 1 ? (k / (n - 1)) * (t.w - 28) : t.w / 2 - 14) + rnd(-6, 6); a.ty = floor().y1 - (k % 2) * 10; a.until = performance.now(); k++; }
  }
  function ship(id) { const a = A.get(id); if (!a) return; a.leaving = true; a.mode = 'leave'; a.leaveT = 0; burst(a.x, a.y - 30, 'coin', 12); }
  function cheer(id) { const a = A.get(id); if (!a || a.m.st === 0) { if (a) a.pop = .6; return; } if (a.m.hungry) { bubble(a, 'hungry', 1500); a.mode = 'shake'; a.until = performance.now() + 500; } else { bubble(a, 'heart', 1400); a.mode = 'jump'; a.until = performance.now() + 700; } }

  function update(dt, now) {
    const f = floor();
    for (const a of A.values()) {
      const m = a.m; a.ph += dt * (m.st === 0 ? 2 : 1); a.pop = Math.max(0, a.pop - dt * 1.6);
      if (a.mode === 'leave') { a.leaveT += dt; a.y -= dt * 120; if (a.leaveT > .8) A.delete(a.id); continue; }
      if (m.st === 0) continue;                              // 蛋不會走
      const sp = SPEED[m.st] * (m.hungry ? .6 : 1) * (m.old ? .5 : 1);
      if (a.mode === 'toEat' || a.mode === 'walk' || a.mode === 'toTrough') {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (Math.abs(dx) > 2) a.face = dx < 0 ? -1 : 1;
        const v = a.mode === 'toEat' ? sp * 2.2 : sp;
        if (d < 3 || now > a.until + (a.mode === 'toEat' ? 9000 : 6000)) {
          if (a.mode === 'toEat') { a.mode = 'eat'; a.until = now + 2600; bubble(a, 'note', 2600); }
          else if (a.mode === 'toTrough') { a.mode = 'idle'; a.until = now + rnd(1500, 3000); bubble(a, 'hungry', 1500); }
          else { a.mode = 'idle'; a.until = now + rnd(800, 3500); }
        } else { a.x += dx / d * v * dt; a.y += dy / d * v * dt; a.hop = Math.abs(Math.sin(a.ph * 9)) * (m.st <= 2 ? 6 : 3); }
      } else if (a.mode === 'eat') {
        a.hop = 0; if (Math.random() < dt * 10) P.push({ x: a.x + a.face * 10 + rnd(-6, 6), y: a.y - 4, vx: rnd(-30, 30), vy: rnd(-80, -30), life: .5, t: 0, kind: 'crumb', c: TROUGH[troughType] });
        if (now > a.until) { a.mode = 'happy'; a.until = now + 1300; bubble(a, 'heart', 1600); }
      } else if (a.mode === 'happy' || a.mode === 'jump') {
        a.hop = Math.abs(Math.sin((now / 1000) * 9)) * 14; if (now > a.until) { a.hop = 0; if (a.mode === 'happy') { a.mode = 'walk'; a.tx = rnd(f.x0, f.x1); a.ty = rnd(f.y0, f.y1 - 50); a.until = now; } else { a.mode = 'idle'; a.until = now + rnd(800, 2000); } }
      } else if (a.mode === 'shake') {
        a.hop = 0; a.shx = Math.sin(now / 30) * 2; if (now > a.until) { a.mode = 'idle'; a.shx = 0; }
      } else {                                                // idle
        a.hop = 0;
        if (now > a.until) {
          if (m.hungry && Math.random() < .35) { const t = troughBox(); a.mode = 'toTrough'; a.tx = rnd(t.x, t.x + t.w); a.ty = f.y1 - rnd(0, 26); a.until = now; }
          else if (m.old && Math.random() < .7) { a.until = now + rnd(2000, 5000); }
          else { a.mode = 'walk'; a.tx = rnd(f.x0, f.x1); a.ty = rnd(f.y0, f.y1); a.until = now; }
        }
      }
      clampA(a);
      if (now > a.nextBub && !a.bub) {
        a.nextBub = now + rnd(2500, 6000);
        if (m.hungry) bubble(a, 'hungry', 1800); else if (m.old) bubble(a, 'zzz', 1800); else if (m.ready) bubble(a, 'coin', 1500); else if (Math.random() < .25) bubble(a, 'note', 1200);
      }
      if (a.bub && now > a.bubUntil) a.bub = null;
    }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; if (p.t > p.life) P.splice(i, 1); }
  }
  function drawActor(a, now) {
    const m = a.m, h0 = STH[m.st] * (m.scale || 1);
    const x = Math.round(a.x + (a.shx || 0)), y = Math.round(a.y);
    // 影子與光環
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, h0 * .45, h0 * .12, 0, 0, 6.29); ctx.fill();
    if (m.st > 0 && AURA[m.tier]) { const al = .25 + .15 * Math.sin(now / 400 + a.ph); ctx.fillStyle = AURA[m.tier] + al + ')'; ctx.beginPath(); ctx.ellipse(x, y, h0 * .62, h0 * .18, 0, 0, 6.29); ctx.fill(); }
    if (m.st === 0) {
      const im = img(m.egg || 'egg_normal'); if (!im.complete || !im.naturalWidth) return;
      const p = m.p || 0, amp = p > .85 ? .22 : p > .6 ? .1 : .04, fr = p > .85 ? 14 : 4;
      const wob = Math.sin(now / 1000 * fr + a.ph) * amp * (p > .6 ? (Math.sin(now / 900) > 0 ? 1 : .2) : 1);
      const eh = h0 * (1 + a.pop * .2), ew = eh * im.naturalWidth / im.naturalHeight;
      if (m.glow) { ctx.fillStyle = m.glow; ctx.globalAlpha = .35 + .2 * Math.sin(now / 300); ctx.beginPath(); ctx.ellipse(x, y - eh / 2, ew * .9, eh * .7, 0, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.save(); ctx.translate(x, y); ctx.rotate(wob); ctx.imageSmoothingEnabled = false; ctx.drawImage(im, -ew / 2, -eh, ew, eh);
      if (p > .8) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-ew * .3, -eh * .55); ctx.lineTo(-ew * .1, -eh * .45); ctx.lineTo(0, -eh * .6); ctx.lineTo(ew * .15, -eh * .48); ctx.lineTo(ew * .3, -eh * .58); ctx.stroke(); }
      ctx.restore(); return;
    }
    const sp = sprite(m.code, m.v); if (!sp) return;
    const per = m.st <= 2 ? 1.1 : 1.6 + m.st * .2;
    const br = Math.sin(now / 1000 * (6.28 / per) + a.ph) * (m.st <= 2 ? .05 : .03);
    let sx = 1 - br * .6, sy = 1 + br;
    if (a.mode === 'eat') { const c = Math.sin(now / 70); sy = 1 - .08 * Math.max(0, c); sx = 1 + .05 * Math.max(0, c); }
    if (a.pop) { sy *= 1 + a.pop * .25; sx *= 1 + a.pop * .25; }
    const hh = h0, ww = hh * sp.width / sp.height;
    ctx.save(); ctx.translate(x, y - Math.round(a.hop)); ctx.scale(-a.face * sx, sy);   // 原圖面向左
    if (m.old) ctx.globalAlpha = .82;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(sp, -ww / 2, -hh, ww, hh);
    ctx.restore();
    if (m.v === 2) for (let i = 0; i < 3; i++) { const t = now / 600 + i * 2.1 + a.ph, al = Math.max(0, Math.sin(t * 2)); if (al < .2) continue; const s = 2 + Math.round(al * 2); ctx.globalAlpha = al; ctx.imageSmoothingEnabled = false; ctx.drawImage(icon('spark'), x + Math.cos(t) * ww * .45 - s * 3.5, y - hh * .55 + Math.sin(t * 1.3) * hh * .4 - s * 3.5, 7 * s / 2, 7 * s / 2); ctx.globalAlpha = 1; }
    if (a.bub) { const ic = icon(a.bub), s = 3, bw = ic.width * s + 10, bh = ic.height * s + 10, bx = x - bw / 2 + a.face * 8, by = y - Math.round(a.hop) - hh - bh - 4 + Math.sin(now / 200) * 1.5;
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(bx, by, bw, bh); ctx.fillRect(x - 2, by + bh, 4, 4); ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, bx + 5, by + 5, ic.width * s, ic.height * s); }
    else if (m.hungry) { const ic = icon('hungry'); ctx.globalAlpha = .55 + .45 * Math.sin(now / 250); ctx.drawImage(ic, x - 9, y - hh - 22, 18, 21); ctx.globalAlpha = 1; }
  }
  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!bg) bg = makeBg(); ctx.imageSmoothingEnabled = false; ctx.drawImage(bg, 0, 0, W, H);
    drawTrough();
    const list = [...A.values()].sort((p, q) => p.y - q.y);
    for (const a of list) drawActor(a, now);
    for (const p of P) {
      const al = 1 - p.t / p.life; ctx.globalAlpha = Math.max(0, al);
      if (p.kind === 'crumb') { ctx.fillStyle = p.c || '#d4b26a'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); }
      else ctx.drawImage(icon(p.kind === 'coin' ? 'coin' : 'spark'), Math.round(p.x) - 7, Math.round(p.y) - 7, 14, 14);
      ctx.globalAlpha = 1;
    }
  }
  function loop(t) {
    const dt = Math.min(.1, (t - (last || t)) / 1000); last = t;
    if (cv && cv.isConnected && !hidden) { update(dt, t); draw(t); }
    requestAnimationFrame(loop);
  }
  function hit(ev) {
    const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
    const list = [...A.values()].sort((p, q) => q.y - p.y);
    for (const a of list) { const m = a.m, h = STH[m.st] * (m.scale || 1), w = Math.max(44, h * .9); if (x > a.x - w / 2 && x < a.x + w / 2 && y < a.y + 10 && y > a.y - Math.max(44, h)) return a.id; }
    return null;
  }
  function init(canvas, tapFn) {
    cv = canvas; ctx = cv.getContext('2d'); onTap = tapFn; resize();
    cv.addEventListener('click', (e) => { const id = hit(e); if (id != null) { cheer(id); onTap && onTap(id); } });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; });
  }
  /* 在一個 <canvas> 上畫單張圖（揭曉畫面、詳情用） */
  function drawInto(c, code, v, hpx) {
    const go = () => { const sp = code.startsWith('egg') ? img(code) : sprite(code, v); if (!sp || !(sp.width || sp.naturalWidth)) return setTimeout(go, 60);
      const sw = sp.naturalWidth || sp.width, sh = sp.naturalHeight || sp.height, h = hpx, w = Math.round(h * sw / sh);
      c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px'; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(sp, 0, 0, w * 2, h * 2); };
    img(code); go();
  }
  requestAnimationFrame(loop);
  window.Pen = { init, sync, feed, ship, cheer, resize, drawInto, img, VCSS, count: () => A.size, actors: A };
})();
