'use strict';
/* 異種孵化場 v0.5 — 放置養成（照「異種孵化場 放置養成規劃（草案）」v1：爬蟲 R 族 62 格）
   一個共用飼養圈：買蛋放進去 → 餓了就餵 → 4 小時長成普通可出貨；餵得夠、運氣好會長成稀有／傳說／史詩。
   所有時間都用「遊戲時鐘」S.clock（毫秒）。開著遊戲時照測試倍速走；關掉再回來照真實時間補（離線照長）。 */
const VER = '0.5', SAVE_KEY = 'xh_v05';
const MIN = 60e3, HR = 3600e3;
const SPECIES = [
  ['R-001', '鱗芽蜥'], ['R-002', '芽冠蜥'],
  ['R-003', '焰顎蜥'], ['R-004', '岩盾蜥'], ['R-005', '迅鱗蜥'], ['R-006', '斑蝕蜥'],
  ['R-007', '赤霸蜥'], ['R-008', '鍛顎蜥'], ['R-009', '堡甲蜥'], ['R-010', '鱗衛蜥'], ['R-011', '疾風蜥'], ['R-012', '蒼翼蜥'], ['R-013', '瘴棘蜥'], ['R-014', '裂相蜥'],
  ['R-015', '煌天霸蜥'], ['R-016', '熾鍛霸蜥'], ['R-017', '嶽壁巨蜥'], ['R-018', '天鱗將蜥'], ['R-019', '雷跡馳蜥'], ['R-020', '穹嵐翼蜥'], ['R-021', '冥瘴冠蜥'], ['R-022', '無相裂蜥']];
const NAME = Object.fromEntries(SPECIES);
const FORMED = { F: 'R-003', S: 'R-004', A: 'R-005', M: 'R-006' };
const AWK = { F: ['R-007', 'R-008'], S: ['R-009', 'R-010'], A: ['R-011', 'R-012'], M: ['R-013', 'R-014'] };
const ULT = { 'R-007': 'R-015', 'R-008': 'R-016', 'R-009': 'R-017', 'R-010': 'R-018', 'R-011': 'R-019', 'R-012': 'R-020', 'R-013': 'R-021', 'R-014': 'R-022' };
const PREV = {}; for (const l in AWK) for (const c of AWK[l]) PREV[c] = FORMED[l]; for (const c in ULT) PREV[ULT[c]] = c; PREV['R-002'] = 'R-001'; for (const l in FORMED) PREV[FORMED[l]] = 'R-002';
const LINE = { F: '兇猛', S: '甲殼', A: '敏捷', M: '異變' };
const FEEDS = [['N', '普通', '🌾'], ['F', '兇猛', '🥩'], ['S', '甲殼', '🦴'], ['A', '敏捷', '🐛'], ['M', '異變', '🧪']];
const TIER = { J: { zh: '幼年', price: 0, score: 0 }, N: { zh: '普通', price: 500, score: 10 }, R: { zh: '稀有', price: 2500, score: 80 }, L: { zh: '傳說', price: 10000, score: 600 }, E: { zh: '史詩', price: 40000, score: 5000 } };
const tierOf = (code) => { const n = +code.slice(2); return n <= 2 ? 'J' : n <= 6 ? 'N' : n <= 14 ? 'R' : n <= 20 ? 'L' : 'E'; };
const STAGE = ['蛋', '初胚體', '幼化體', '成形體', '覺醒體', '極限體'];
const VAR_ZH = ['原色', '異色', '閃光'], VAR_MUL = [1, 1.5, 3], VAR_SUF = ['', '*a', '*s'];
const T = { hatch: 30 * MIN, juv: 90 * MIN, form: 4 * HR, awk: 12 * HR, leg: 24 * HR, epic: 36 * HR, hunger: 60 * MIN, age: 48 * HR };
const NEED = { awk: 6, leg: 10, epic: 12 };                 // 累計餵食次數（1＋2＋3、＋4、＋6）
const TUT = 5 / 240;                                       // 教學蛋：4 小時壓成 5 分鐘
const P = { rare: .2, rareF: .35, ult: .1, ultF: .2, mut: .03, mutH: .08, shiny: .01, alt: .05 };
const PRICE = { egg: 100, fruit: 200, ticket: 3000, bed: 3000, feeder: 5000, attr: 10 };
const UNLOCK = { attr: 10, fruit: 30 };
const DEX = ['R-001', 'R-002']; for (const [c] of SPECIES.slice(2)) for (const s of VAR_SUF) DEX.push(c + s);   // 2＋20×3＝62
const MAX_FREE_SLOTS = 10, MAX_SLOTS = 15;

/* ---------- 時間（台北） ---------- */
const TPE = 8 * HR;
const dayKey = (t = Date.now()) => new Date(t + TPE).toISOString().slice(0, 10);
const weekId = (t = Date.now()) => { const d = Math.floor((t + TPE) / 864e5); return d - ((d + 3) % 7); };   // 週一 00:00（台北）
const fmt = (ms) => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); if (h >= 24) return Math.floor(h / 24) + '天' + (h % 24) + '小時'; if (h) return h + '小時' + m + '分'; return m + '分' + String(s % 60).padStart(2, '0') + '秒'; };
const $ = (q) => document.querySelector(q);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (n) => Math.round(n).toLocaleString('en-US');

/* ---------- 存檔 ---------- */
let S;
function mkEgg(o = {}) {
  const r = Math.random();
  const m = { id: S.nid++, st: 0, g: 0, code: null, v: o.tut ? 0 : (r < P.shiny ? 2 : r < P.shiny + P.alt ? 1 : 0), pot: o.tut ? 1 : o.ticket ? 0 : Math.random(), pot2: Math.random(),
    ticket: !!o.ticket, tut: !!o.tut, feeds: 0, fedG: 0, attr: { F: 0, S: 0, A: 0, M: 0 }, juvH: 0, mut: false, line: null, goR: null, goU: null, fruit: false, fin: false, finAt: 0, epic: false };
  if (o.tut) m.pot2 = 1;
  return m;
}
function newSave() {
  S = { v: 5, clock: 0, real: Date.now(), coins: 500, eggs: 3, fruit: 0, ticket: 0, slots: 3, paid: 0, mons: [], nid: 1, dex: {}, seen: {},
    stat: { ship: 0, N: 0, R: 0, L: 0, E: 0 }, score: 0, week: { id: weekId(), sp: {}, score: 0, n: 0 }, claimed: {}, day: dayKey(), streak: 1,
    tBuy: { day: dayKey(), n: 0 }, bedUntil: 0, feeder: false, trough: 'N', speed: 1, test: false, intro: false };
  S.mons.push(mkEgg({ tut: true }));
  return S;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function load() {
  try { const o = JSON.parse(localStorage.getItem(SAVE_KEY)); if (o && o.v === 5) { S = o; return true; } } catch (e) { }
  newSave(); return false;
}

/* ---------- 規則 ---------- */
const sc = (m) => m.tut ? TUT : 1;
const rate = () => S.clock < S.bedUntil ? 1 / 0.8 : 1;                    // 加速床：成長時間 ×0.8（餓得也快）
const hungry = (m) => !m.fin && m.st >= 1 && (m.g - m.fedG) >= T.hunger * sc(m);
const isOld = (m) => m.fin && S.clock - m.finAt >= T.age;
const sellable = (m) => m.st >= 3;
const price = (m) => sellable(m) ? Math.round(TIER[tierOf(m.code)].price * VAR_MUL[m.v] * (isOld(m) ? .1 : 1)) : 0;
const dexKey = (m) => tierOf(m.code) === 'J' ? m.code : m.code + VAR_SUF[m.v];
const dexCount = () => DEX.filter(k => S.dex[k]).length;
const dexTier = (t) => DEX.filter(k => S.dex[k] && tierOf(k.slice(0, 5)) === t).length;
const freeSlots = () => S.slots + S.paid - S.mons.length;
function nextAt(m) {                                        // 下一個階段在第幾毫秒（成長時間）
  const s = sc(m);
  if (m.fin) return null;
  return [T.hatch, T.juv, T.form, T.awk, m.epic ? T.epic : T.leg][m.st] * s;
}
const need = (m) => m.st <= 3 ? NEED.awk : m.epic ? NEED.epic : NEED.leg;
function glowOf(m) {
  if (m.tut) return { k: 'plain', zh: '教學蛋', stars: 1 };
  const r = m.ticket || m.pot < P.rare;
  if (r && m.pot2 < P.ult) return { k: 'gold', zh: '傳說潛力', stars: 4 };
  if (r) return { k: 'blue', zh: '稀有潛力', stars: 3 };
  if (m.pot < P.rareF) return { k: 'green', zh: '用突破果有機會變稀有', stars: 2 };
  return { k: 'plain', zh: '一般', stars: 1 };
}
function seeDex(code) { if (!S.dex[code]) { S.dex[code] = { t: Date.now(), n: 0 }; return true; } return false; }
function finish(m) { m.fin = true; m.finAt = S.clock; }
function stepMon(m, dg, ev) {
  if (m.fin) return;
  m.g += dg; const s = sc(m);
  if (m.st === 2) m.juvH = Math.max(m.juvH, m.g - m.fedG);
  for (let guard = 0; guard < 6; guard++) {
    if (m.st === 0 && m.g >= T.hatch * s) { m.st = 1; m.code = 'R-001'; m.fedG = m.g; seeDex('R-001'); ev.push({ k: 'hatch', m }); continue; }
    if (m.st === 1 && m.g >= T.juv * s) { m.st = 2; m.code = 'R-002'; m.juvH = m.g - m.fedG; seeDex('R-002'); ev.push({ k: 'grow', m }); continue; }
    if (m.st === 2 && m.g >= T.form * s) {
      if (!m.tut && Math.random() < (m.juvH >= 2 * HR * s ? P.mutH : P.mut)) m.mut = true;
      let line = 'M';
      if (!m.mut) { const a = m.attr, best = Math.max(a.F, a.S, a.A, a.M), top = Object.keys(a).filter(k => a[k] === best && best > 0); line = top.length ? top[Math.floor(Math.random() * top.length)] : 'FSAM'[Math.floor(Math.random() * 4)]; }
      m.line = line; m.code = FORMED[line]; m.st = 3;
      m.goR = !m.tut && (m.ticket || m.pot < (m.fruit ? P.rareF : P.rare)); m.fruit = false;
      if (!m.goR) finish(m);
      ev.push({ k: 'form', m }); continue;
    }
    if (m.st === 3 && m.goR && m.g >= T.awk * s) {
      if (m.feeds >= NEED.awk) {
        m.st = 4; m.code = AWK[m.line][Math.random() < .5 ? 0 : 1]; m.epic = m.mut;
        m.goU = (m.line !== 'M' || m.mut) && m.pot2 < (m.fruit ? P.ultF : P.ult); m.fruit = false;
        if (!m.goU) finish(m);
        ev.push({ k: 'evo', m });
      } else { finish(m); ev.push({ k: 'miss', m }); }
      continue;
    }
    if (m.st === 4 && m.goU && m.g >= (m.epic ? T.epic : T.leg) * s) {
      if (m.feeds >= need(m)) { m.st = 5; m.code = ULT[m.code]; finish(m); ev.push({ k: 'evo', m }); } else { finish(m); ev.push({ k: 'miss', m }); }
      continue;
    }
    break;
  }
}
function feedHungry(type, auto) {
  const list = S.mons.filter(hungry); if (!list.length) return 0;
  const cost = type === 'N' ? 0 : PRICE.attr * list.length;
  if (S.coins < cost) return -1;
  S.coins -= cost;
  for (const m of list) { m.feeds++; m.fedG = m.g; if (m.st === 2 && type !== 'N') m.attr[type]++; }
  if (!auto && window.Pen) Pen.feed(list.map(m => m.id), type);
  return list.length;
}
function advance(ms, offline) {
  const ev = []; let left = ms, t = 0, nextFeed = 2 * HR, fed = 0;
  while (left > 0) {
    const d = Math.min(left, 30e3), r = rate();
    for (const m of S.mons) stepMon(m, d * r, ev);
    S.clock += d; left -= d; t += d;
    if (offline && S.feeder && t >= nextFeed && fed < 4) { nextFeed += 2 * HR; fed++; const n = feedHungry('N', true); ev.push({ k: 'auto', n }); }
  }
  return ev;
}

/* ---------- 每日、每週 ---------- */
function checkDay(quiet) {
  const d = dayKey();
  if (S.week.id !== weekId()) S.week = { id: weekId(), sp: {}, score: 0, n: 0 };
  if (S.day === d) return;
  const y = dayKey(Date.now() - 864e5);
  S.streak = S.day === y ? S.streak + 1 : 1; S.day = d; S.eggs += 2;
  if (!quiet) toast(`每日登入：送 2 顆蛋 🥚（連續第 ${S.streak} 天）`);
}

/* ---------- 任務 ---------- */
const TASKS = [
  { id: 's4', slot: 4, zh: '出貨 5 隻', p: () => [S.stat.ship, 5] },
  { id: 's5', slot: 5, zh: '圖鑑登錄 4 種普通', p: () => [dexTier('N'), 4] },
  { id: 's6', slot: 6, zh: '第一次出貨稀有', p: () => [S.stat.R, 1] },
  { id: 's7', slot: 7, zh: '累計出貨 40 隻', p: () => [S.stat.ship, 40] },
  { id: 's8', slot: 8, ticket: 1, zh: '圖鑑 10 格', p: () => [dexCount(), 10] },
  { id: 's9', slot: 9, zh: '第一次出貨傳說', p: () => [S.stat.L, 1] },
  { id: 's10', slot: 10, zh: '圖鑑 20 格，或累計出貨 200 隻', p: () => dexCount() >= 20 || S.stat.ship >= 200 ? [1, 1] : [Math.max(dexCount() / 20, S.stat.ship / 200), 1], txt: () => `圖鑑 ${dexCount()}/20・出貨 ${S.stat.ship}/200` },
  { id: 'd30', ticket: 1, zh: '圖鑑 30 格', p: () => [dexCount(), 30] },
  { id: 'login7', ticket: 1, zh: '連續登入 7 天', p: () => [S.streak, 7] },
];
const ROUTES = Object.keys(ULT).map(c => ({ id: 'rt_' + c, codes: [PREV[c], c, ULT[c]], zh: `集滿路線：${NAME[PREV[c]]}→${NAME[c]}→${NAME[ULT[c]]}` }));
const taskDone = (t) => { const [a, b] = t.p(); return a >= b; };
function claim(id) {
  if (id === 'week') { if (S.week.claimed || Object.keys(S.week.sp).length < 10) return; S.week.claimed = true; S.ticket++; toast('週任務完成：稀有蛋券 +1 🎫'); return render(); }
  const t = TASKS.find(x => x.id === id) || ROUTES.find(x => x.id === id); if (!t || S.claimed[id]) return;
  if (t.codes ? !t.codes.every(c => S.dex[c]) : !taskDone(t)) return;
  S.claimed[id] = true; const got = [];
  if (t.slot) { S.slots = Math.min(MAX_FREE_SLOTS, S.slots + 1); got.push('飼養圈名額 +1'); }
  if (t.ticket || t.codes) { S.ticket++; got.push('稀有蛋券 +1'); }
  toast('任務完成：' + got.join('、') + ' 🎉'); save(); render();
}
const claimable = () => TASKS.filter(t => !S.claimed[t.id] && taskDone(t)).length + ROUTES.filter(t => !S.claimed[t.id] && t.codes.every(c => S.dex[c])).length + (!S.week.claimed && Object.keys(S.week.sp).length >= 10 ? 1 : 0);

/* ---------- 動作 ---------- */
let tab = 'pen', cereQ = [], speedOpen = false;
const G = {
  placeEgg(useTicket) {
    if (freeSlots() <= 0) return toast('飼養圈滿了，先出貨空出名額');
    if (useTicket) { if (S.ticket <= 0) return; S.ticket--; }
    if (S.eggs > 0) S.eggs--; else { if (S.coins < PRICE.egg) return toast('金幣不夠買蛋'); S.coins -= PRICE.egg; }
    S.mons.push(mkEgg({ ticket: useTicket })); closeSheet();
    toast(useTicket ? '放入稀有蛋！30 分鐘後孵化（保證走稀有路線，記得餵滿 6 次）' : '放入一顆蛋，30 分鐘後孵化'); save(); render();
  },
  eggBtn() {
    if (freeSlots() <= 0) return toast('飼養圈滿了，先出貨空出名額');
    if (S.ticket > 0) return sheet(`<h3>放哪一種蛋？</h3>
      <button class="btn big pri" onclick="G.placeEgg(false)">🥚 普通蛋 <small>${S.eggs > 0 ? '背包剩 ' + S.eggs + ' 顆' : '花 100 金幣'}</small></button>
      <button class="btn big gold" onclick="G.placeEgg(true)">🎫 用稀有蛋券 <small>剩 ${S.ticket} 張・保證走稀有路線（要餵滿 6 次）</small></button>
      <button class="btn wide" onclick="closeSheet()">取消</button>`);
    G.placeEgg(false);
  },
  feed() {
    const n = feedHungry(S.trough, false);
    if (n === 0) return toast('現在沒有怪獸肚子餓（每 60 分鐘餓一次）');
    if (n < 0) return toast('金幣不夠買屬性飼料');
    toast(`餵了 ${n} 隻 ${FEEDS.find(f => f[0] === S.trough)[2]}`); save(); render();
  },
  trough(k) { if (k !== 'N' && !(S.test || S.stat.ship >= UNLOCK.attr)) return toast(`屬性飼料：出貨 ${UNLOCK.attr} 隻後解鎖`); S.trough = k; save(); render(); },
  ship(id, ok) {
    const m = S.mons.find(x => x.id === id); if (!m || !sellable(m)) return;
    if (!m.fin && !ok) return sheet(`<h3>${NAME[m.code]} 還在長大</h3><p>牠已經判定會繼續長（${m.st === 3 ? '覺醒體・稀有' : '極限體'}）。現在出貨只拿 <b>${num(price(m))}</b> 金幣。</p>
      <button class="btn big bad" onclick="G.ship(${id},true)">還是出貨</button><button class="btn wide" onclick="closeSheet()">再養一下</button>`);
    const p = price(m), t = tierOf(m.code), key = dexKey(m), isNew = !S.dex[key];
    S.coins += p; S.score += TIER[t].score; S.stat.ship++; S.stat[t]++;
    if (isNew) S.dex[key] = { t: Date.now(), n: 0 }; S.dex[key].n++;
    S.week.sp[key] = 1; S.week.score += TIER[t].score; S.week.n++;
    S.mons = S.mons.filter(x => x !== m); if (window.Pen) Pen.ship(id);
    closeSheet(); toast(`出貨 ${NAME[m.code]}${m.v ? '（' + VAR_ZH[m.v] + '）' : ''}：+${num(p)} 金幣${isNew ? '・📖 新圖鑑！' : ''}`);
    save(); render(); return p;
  },
  shipAll() {
    const list = S.mons.filter(m => m.fin && sellable(m)); if (!list.length) return toast('還沒有長好的怪獸');
    let sum = 0, nw = 0; for (const m of list) { const had = !!S.dex[dexKey(m)]; sum += G.ship(m.id, true) || 0; if (!had) nw++; }
    toast(`出貨 ${list.length} 隻：+${num(sum)} 金幣${nw ? `・📖 新圖鑑 ${nw} 格` : ''}`);
  },
  fruit(id) {
    const m = S.mons.find(x => x.id === id); if (!m || S.fruit <= 0 || m.fruit) return;
    m.fruit = true; S.fruit--; toast('用了突破果：下一次判定機率提高'); save(); openMon(id);
  },
  buy(k) {
    const unlocked = shopUnlocked(k); if (!unlocked.ok) return toast(unlocked.why);
    const cost = PRICE[k]; if (S.coins < cost) return toast('金幣不夠');
    if (k === 'ticket') { if (S.tBuy.day !== dayKey()) S.tBuy = { day: dayKey(), n: 0 }; if (S.tBuy.n >= 2) return toast('稀有蛋券今天已經買 2 張了'); S.tBuy.n++; S.ticket++; }
    if (k === 'egg') S.eggs++;
    if (k === 'fruit') S.fruit++;
    if (k === 'bed') S.bedUntil = Math.max(S.bedUntil, S.clock) + 7 * 24 * HR;
    if (k === 'feeder') { if (S.feeder) return; S.feeder = true; }
    S.coins -= cost; toast('購買成功'); save(); render();
  },
  speed(x) { S.speed = x; save(); render(); },
  skip(ms) { const ev = advance(ms, true); handleEv(ev, true, ms); toast(`⏩ 時間快轉 ${fmt(ms)}`); },
  testMode() { S.test = true; S.coins += 10000; S.eggs += 10; S.fruit += 5; S.ticket += 2; toast('🧪 測試模式：+10000 金幣、蛋 ×10、突破果 ×5、稀有蛋券 ×2，商店全解鎖'); save(); render(); },
  reset() { if (!confirm('確定清除 v0.5 存檔重新開始？')) return; localStorage.removeItem(SAVE_KEY); newSave(); cereQ = []; $('#cere').className = 'hidden'; render(); intro(); },
  tab(t) { tab = t; render(); window.scrollTo(0, 0); },
  toggleTest() { speedOpen = !speedOpen; render(); },
};
window.G = G;
function shopUnlocked(k) {
  if (S.test) return { ok: true };
  if (k === 'fruit' && S.stat.ship < UNLOCK.fruit) return { ok: false, why: `出貨 ${UNLOCK.fruit} 隻後解鎖（${S.stat.ship}/${UNLOCK.fruit}）` };
  if (k === 'ticket' && S.stat.R < 1) return { ok: false, why: '第一次出貨稀有後解鎖' };
  if (k === 'feeder' && S.feeder) return { ok: false, why: '已經有了' };
  return { ok: true };
}

/* ---------- 事件 → 畫面 ---------- */
function handleEv(ev, offline, ms) {
  let hatch = 0, grow = 0, miss = 0, auto = 0, evo = 0;
  for (const e of ev) {
    if (e.k === 'hatch') { hatch++; cereQ.push({ k: 'hatch', m: e.m }); }
    else if (e.k === 'evo') { evo++; cereQ.push({ k: 'evo', m: e.m }); }
    else if (e.k === 'form' || e.k === 'grow') { grow++; if (!offline) toast(`${NAME[e.m.code]} 長成${STAGE[e.m.st]}${e.k === 'form' ? (e.m.goR ? '・還會繼續長！' : '・可以出貨了') : ''}`); }
    else if (e.k === 'miss') { miss++; if (!offline) toast(`${NAME[e.m.code]} 餵的次數不夠，停在這裡（可出貨）`); }
    else if (e.k === 'auto') auto++;
  }
  if (offline && ms >= 2 * MIN && (hatch + grow + evo + miss + auto)) {
    cereQ.unshift({ k: 'away', ms, hatch, grow: grow + evo, miss, auto });
  }
  if (cereQ.length && $('#cere').classList.contains('hidden')) nextCere();
  save(); render();
}
function nextCere() {
  const el = $('#cere'), c = cereQ.shift();
  if (!c) { el.className = 'hidden'; el.innerHTML = ''; return; }
  const rest = cereQ.length;
  if (c.k === 'away') {
    el.className = 'cere away';
    el.innerHTML = `<div class="cbox"><h2>歡迎回來！</h2><p>你離開了 <b>${fmt(c.ms)}</b>，飼養圈照常在長：</p><ul>
      ${c.hatch ? `<li>🥚 孵化 ${c.hatch} 隻</li>` : ''}${c.grow ? `<li>⬆️ 長大 ${c.grow} 次</li>` : ''}${c.miss ? `<li>😢 ${c.miss} 隻餵不夠停在原階段</li>` : ''}${c.auto ? `<li>🤖 自動餵食器餵了 ${c.auto} 次</li>` : ''}</ul>
      <button class="btn big pri" id="cgo">看看牠們</button>${rest > 1 ? `<button class="btn wide" id="cskip">略過全部動畫</button>` : ''}</div>`;
  } else if (c.k === 'hatch') {
    const m = c.m, gl = glowOf(m), vz = m.v === 2 ? '<div class="vtag shiny">✦ 閃光個體 ✦</div>' : m.v === 1 ? '<div class="vtag alt">◆ 異色個體 ◆</div>' : '';
    el.className = `cere hatch g-${gl.k} v${m.v}`;
    el.innerHTML = `<div class="cbox"><div class="cstage"><div class="rays"></div><img class="cegg px" src="img/${m.ticket ? 'egg_rare' : m.tut ? 'egg_tutorial' : 'egg_normal'}.png?v=0.5" alt=""><div class="flash"></div><canvas class="cmon px"></canvas></div>
      <div class="ctext"><div class="ctitle">孵化了！${NAME['R-001']}</div>${vz}
      <div class="pot">潛力 <b class="stars">${'★'.repeat(gl.stars)}${'☆'.repeat(4 - gl.stars)}</b> <span>${gl.zh}</span></div>
      <p class="note">${m.tut ? '教學蛋 5 分鐘就會長到可以出貨。' : gl.stars >= 3 ? '好苗子！餓了記得餵，餵滿才會突破。' : '每 60 分鐘會餓一次，餵得勤才有機會長成稀有。'}</p></div>
      <button class="btn big pri" id="cgo">太好了！</button>${rest ? `<button class="btn wide" id="cskip">略過其餘 ${rest} 個</button>` : ''}</div>`;
    Pen.drawInto(el.querySelector('.cmon'), 'R-001', m.v, 150);
    setTimeout(() => el.classList.add('p2'), 1500);
  } else {
    const m = c.m, t = tierOf(m.code);
    el.className = `cere evo t-${t} v${m.v} p2`;
    el.innerHTML = `<div class="cbox"><div class="cstage"><div class="rays"></div><div class="flash"></div><canvas class="cmon px"></canvas></div>
      <div class="ctext"><div class="ctitle">進化！${NAME[m.code]}</div><div class="tierbig t-${t}">${TIER[t].zh}・${STAGE[m.st]}</div>
      ${m.v ? `<div class="vtag ${m.v === 2 ? 'shiny' : 'alt'}">${VAR_ZH[m.v]}</div>` : ''}<p class="note">${m.fin ? '已經是最終型態，可以出貨了。' : '還會繼續長，記得餵！'}</p></div>
      <button class="btn big pri" id="cgo">好耶！</button>${rest ? `<button class="btn wide" id="cskip">略過其餘 ${rest} 個</button>` : ''}</div>`;
    Pen.drawInto(el.querySelector('.cmon'), m.code, m.v, 170);
  }
  el.onclick = (e) => {
    if (e.target.id === 'cskip') { cereQ = []; return nextCere(); }
    if (c.k === 'hatch' && !el.classList.contains('p2')) { el.classList.add('p2'); return; }
    if (e.target.id === 'cgo' || e.target === el) nextCere();
  };
}

/* ---------- 介面 ---------- */
let toastT = [];
function toast(t) {
  const box = $('#toast'), d = document.createElement('div'); d.className = 't'; d.textContent = t; box.appendChild(d);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => d.remove(), 3200);
}
function sheet(html) { const el = $('#sheet'); el.innerHTML = `<div class="sbox">${html}</div>`; el.className = 'show'; el.onclick = (e) => { if (e.target === el) closeSheet(); }; }
function closeSheet() { const el = $('#sheet'); el.className = 'hidden'; el.innerHTML = ''; sheetId = null; }
window.closeSheet = closeSheet;
let sheetId = null;
const thumb = (code, v, h, cls = '') => `<img class="px th ${cls}" src="img/${code}.png?v=0.5" style="height:${h}px;${v ? 'filter:' + Pen.VCSS[v] : ''}" alt="">`;
function monLine(m) {
  const na = nextAt(m), r = rate(), left = na == null ? 0 : (na - m.g) / r;
  if (m.st === 0) return `孵化剩 <b data-tm="${m.id}">${fmt(left)}</b>`;
  if (!m.fin) {
    const to = m.st === 1 ? '幼化體' : m.st === 2 ? '成形體（可出貨）' : m.st === 3 ? '覺醒體・稀有' : m.epic ? '極限體・史詩' : '極限體・傳說';
    return `→ ${to} 剩 <b data-tm="${m.id}">${fmt(left)}</b>`;
  }
  if (isOld(m)) return '<span class="badc">變老了，售價 1 折</span>';
  return `長好了・<span class="good">可出貨</span>・變老剩 ${fmt(T.age - (S.clock - m.finAt))}`;
}
function pips(m) {
  if (m.st === 0 || (m.fin)) return '';
  const n = need(m), f = Math.min(m.feeds, n);
  return `<span class="pips" title="餵食次數">🍖 ${'●'.repeat(f)}${'○'.repeat(n - f)} <small>${m.feeds}/${n}</small></span>`;
}
function renderTop() {
  $('#res').innerHTML = `<span class="rc coin">🪙 <b>${num(S.coins)}</b></span><span class="rc">🥚 ${S.eggs}</span><span class="rc">🍑 突破果 ${S.fruit}</span><span class="rc">🎫 ${S.ticket}</span>`;
  $('#tbtn').classList.toggle('on', speedOpen);
  const tb = $('#testbar'); tb.classList.toggle('hidden', !speedOpen);
  if (speedOpen) tb.innerHTML = `<div class="trow"><span>速度</span>${[1, 2, 3, 5].map(x => `<button class="chip ${S.speed === x ? 'on' : ''}" onclick="G.speed(${x})">×${x}</button>`).join('')}</div>
    <div class="trow"><span>快轉</span>${[[10 * MIN, '+10分'], [HR, '+1時'], [4 * HR, '+4時'], [12 * HR, '+12時']].map(([ms, l]) => `<button class="chip" onclick="G.skip(${ms})">${l}</button>`).join('')}</div>
    <div class="trow"><button class="chip" onclick="G.testMode()">🎁 測試模式</button><button class="chip" onclick="G.reset()">🗑 重置</button><span class="note">時鐘 ${fmt(S.clock)}</span></div>`;
  document.querySelectorAll('nav#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.classList.toggle('dot', b.dataset.tab === 'tasks' && claimable() > 0); });
}
function hint() {
  const hun = S.mons.filter(hungry).length, ready = S.mons.filter(m => m.fin && sellable(m)).length, fs = freeSlots();
  if (S.mons.some(m => m.tut && m.st === 0)) return '👋 教學蛋 5 分鐘就會長大，先看牠孵化吧！';
  if (hun) return `🍖 有 ${hun} 隻肚子餓了，按「餵食」！`;
  if (ready) return `💰 ${ready} 隻長好了，按「出貨」換金幣`;
  if (fs > 0) return S.eggs > 0 ? `🥚 有 ${fs} 個空位，放蛋進去吧` : `🥚 有 ${fs} 個空位，花 100 金幣買蛋放進去`;
  const grow = S.mons.filter(m => !m.fin).map(m => (nextAt(m) - m.g) / rate()); if (grow.length) return `⏳ 下一次長大在 ${fmt(Math.min(...grow))} 後（關掉遊戲也會長）`;
  return '飼養圈滿了';
}
let lastSig = '';
function renderPen() {
  const hun = S.mons.filter(hungry).length, ready = S.mons.filter(m => m.fin && sellable(m)).length, fs = freeSlots();
  $('#slotinfo').textContent = `名額 ${S.mons.length}/${S.slots + S.paid}`;
  $('#hungerinfo').textContent = hun ? `🍖 ${hun} 隻餓了` : '😊 都吃飽了'; $('#hungerinfo').classList.toggle('hun', !!hun);
  $('#bedinfo').textContent = S.clock < S.bedUntil ? `🛏 加速床 ${fmt(S.bedUntil - S.clock)}` : '';
  $('#hint').textContent = hint();
  const atk = S.test || S.stat.ship >= UNLOCK.attr;
  $('#feedrow').innerHTML = '<span class="flab">飼料槽</span>' + FEEDS.map(([k, z, e]) => `<button class="fchip ${S.trough === k ? 'on' : ''} ${k !== 'N' && !atk ? 'lock' : ''}" onclick="G.trough('${k}')">${e}${z}<small>${k === 'N' ? '免費' : atk ? '10/份' : '🔒'}</small></button>`).join('');
  $('#bEgg').innerHTML = `🥚 放蛋<small>${fs <= 0 ? '沒有空位' : S.eggs > 0 ? '背包 ' + S.eggs + ' 顆' : '100 金幣'}</small>`; $('#bEgg').disabled = fs <= 0;
  $('#bFeed').innerHTML = `🍖 餵食<small>${hun ? hun + ' 隻餓了' : '沒有餓的'}</small>`; $('#bFeed').classList.toggle('pulse', !!hun);
  $('#bShip').innerHTML = `💰 出貨<small>${ready ? ready + ' 隻長好了' : '還沒長好'}</small>`; $('#bShip').classList.toggle('pulse', !!ready);
  const sig = S.mons.map(m => [m.id, m.st, m.code, m.fin, hungry(m), m.feeds, m.fruit, isOld(m)].join(',')).join('|') + '/' + S.slots + S.paid + S.fruit;
  if (sig !== lastSig) {
    lastSig = sig;
    let h = S.mons.map(m => {
      const t = m.code ? tierOf(m.code) : null;
      return `<button class="mcard ${hungry(m) ? 'hungry' : ''} ${m.fin ? 'done' : ''}" onclick="openMon(${m.id})">
        <span class="mth">${m.st === 0 ? `<img class="px th" src="img/${m.ticket ? 'egg_rare' : m.tut ? 'egg_tutorial' : 'egg_normal'}.png?v=0.5" style="height:40px" alt="">` : thumb(m.code, m.v, 42)}</span>
        <span class="minfo"><b>${m.st === 0 ? (m.tut ? '教學蛋' : m.ticket ? '稀有蛋' : '蛋') : NAME[m.code]}</b>${t && t !== 'J' ? ` <i class="tg t-${t}">${TIER[t].zh}</i>` : ''}${m.st && m.v ? ` <i class="tg v${m.v}">${VAR_ZH[m.v]}</i>` : ''}${m.fruit ? ' <i class="tg">🍑</i>' : ''}
        <small>${m.st ? STAGE[m.st] + '・' : ''}${monLine(m)}</small>${pips(m)}</span>
        <span class="mside">${hungry(m) ? '<em class="hb">餓</em>' : m.fin && sellable(m) ? `<em class="sb">${num(price(m))}</em>` : ''}</span></button>`;
    }).join('');
    for (let i = 0; i < fs; i++) h += `<button class="mcard empty" onclick="G.eggBtn()"><span class="mth">＋</span><span class="minfo"><b>空位</b><small>點這裡放蛋</small></span></button>`;
    const nxt = TASKS.find(t => t.slot === S.slots + 1);
    if (nxt) h += `<div class="mcard lock" onclick="G.tab('tasks')"><span class="mth">🔒</span><span class="minfo"><b>第 ${nxt.slot} 格</b><small>任務：${nxt.zh}</small></span></div>`;
    else if (S.slots >= MAX_FREE_SLOTS && S.paid < 5) h += `<div class="mcard lock"><span class="mth">🔒</span><span class="minfo"><b>第 ${11 + S.paid} 格</b><small>付費名額 NT$60（原型尚未開放）</small></span></div>`;
    $('#mlist').innerHTML = h;
  } else {
    document.querySelectorAll('[data-tm]').forEach(el => { const m = S.mons.find(x => x.id === +el.dataset.tm); if (m) { const na = nextAt(m); if (na != null) el.textContent = fmt((na - m.g) / rate()); } });
  }
  Pen.sync(S.mons.map(m => ({ id: m.id, st: m.st, code: m.code, v: m.st ? m.v : 0, hungry: hungry(m), ready: m.fin && sellable(m) && !isOld(m), old: isOld(m), tier: m.code ? tierOf(m.code) : null,
    egg: m.ticket ? 'egg_rare' : m.tut ? 'egg_tutorial' : 'egg_normal', p: m.st === 0 ? m.g / (T.hatch * sc(m)) : 0, glow: m.ticket && m.st === 0 ? '#ffd34a' : null, scale: S.mons.length > 8 ? .85 : 1 })), { trough: S.trough, bed: S.clock < S.bedUntil });
}
function openMon(id) {
  const m = S.mons.find(x => x.id === id); if (!m) return; sheetId = id;
  const t = m.code ? tierOf(m.code) : null, gl = glowOf(m);
  const canFruit = S.fruit > 0 && !m.fruit && !m.fin && (m.st <= 2 || (m.st === 3 && m.goR)) && !m.tut;
  let judge = '';
  if (m.st <= 2) judge = `長到成形體（4 小時）時判定能不能變稀有：基本 20%，用突破果 35%。${m.ticket ? '<b>稀有蛋：保證突破</b>。' : ''}`;
  else if (m.st === 3 && m.goR) judge = `<b class="good">已突破！</b>12 小時時要累計餵滿 ${NEED.awk} 次才會長成覺醒體（稀有），之後判定極限體：10%，用突破果 20%。`;
  else if (m.st === 4 && m.goU) judge = `<b class="good">還會長！</b>${m.epic ? '異變線 36 小時・史詩' : '24 小時・傳說'}，要累計餵滿 ${need(m)} 次。`;
  sheet(`<div class="mhead">${m.st === 0 ? `<canvas class="big px" id="mcv"></canvas>` : `<canvas class="big px" id="mcv"></canvas>`}
    <div><h3>${m.st === 0 ? (m.tut ? '教學蛋' : m.ticket ? '稀有蛋' : '蛋') : NAME[m.code]}</h3>
    <div>${t && t !== 'J' ? `<i class="tg t-${t}">${TIER[t].zh}</i>` : ''}${m.st && m.v ? `<i class="tg v${m.v}">${VAR_ZH[m.v]}</i>` : ''}${m.st ? `<i class="tg">${STAGE[m.st]}</i>` : ''}${m.line ? `<i class="tg">${LINE[m.line]}線</i>` : ''}</div>
    ${m.st ? `<div class="pot">潛力 <b class="stars">${'★'.repeat(gl.stars)}${'☆'.repeat(4 - gl.stars)}</b></div>` : ''}</div></div>
    <p>${monLine(m)}</p>${pips(m) ? `<p>${pips(m)} ${hungry(m) ? '<b class="badc">肚子餓了</b>' : ''}</p>` : ''}
    ${judge ? `<p class="note">${judge}</p>` : ''}${m.fruit ? '<p class="note">🍑 已用突破果，下一次判定機率提高。</p>' : ''}
    ${sellable(m) ? `<button class="btn big pri" onclick="G.ship(${m.id})">💰 出貨 +${num(price(m))} 金幣</button>` : `<p class="note">長到成形體（從放蛋算 4 小時）就能出貨。</p>`}
    ${canFruit ? `<button class="btn big" onclick="G.fruit(${m.id})">🍑 用突破果（剩 ${S.fruit}）</button>` : ''}
    <button class="btn wide" onclick="closeSheet()">關閉</button>`);
  Pen.drawInto($('#mcv'), m.st === 0 ? (m.ticket ? 'egg_rare' : m.tut ? 'egg_tutorial' : 'egg_normal') : m.code, m.st ? m.v : 0, 96);
}
window.openMon = openMon;

function renderDex() {
  const sec = [['幼年', ['R-001', 'R-002']], ['普通・成形體', DEX.filter(k => tierOf(k.slice(0, 5)) === 'N')], ['稀有・覺醒體', DEX.filter(k => tierOf(k.slice(0, 5)) === 'R')], ['傳說・極限體', DEX.filter(k => tierOf(k.slice(0, 5)) === 'L')], ['史詩・異變線極限體', DEX.filter(k => tierOf(k.slice(0, 5)) === 'E')]];
  let h = `<h2>📖 圖鑑 <small>${dexCount()} / ${DEX.length}</small></h2>
    <div class="stats"><div><b>${num(S.score)}</b><small>總分</small></div><div><b>${S.stat.ship}</b><small>累計出貨</small></div><div><b>${Object.keys(S.week.sp).length}</b><small>本週出貨種類</small></div></div>
    <p class="note">第一次出貨就會登錄（幼年型態長到就登錄）。異色、閃光各算一格。分數：普通 10・稀有 80・傳說 600・史詩 5000。</p>`;
  for (const [title, keys] of sec) {
    h += `<h3>${title} <small>${keys.filter(k => S.dex[k]).length}/${keys.length}</small></h3><div class="dgrid">`;
    for (const k of keys) {
      const code = k.slice(0, 5), v = k.endsWith('*s') ? 2 : k.endsWith('*a') ? 1 : 0, got = S.dex[k];
      h += `<button class="dcell ${got ? 'got' : ''} v${v}" onclick="dexInfo('${k}')">${got ? thumb(code, v, 46) : thumb(code, 0, 46, 'sil')}<span>${got ? NAME[code] : '？？？'}</span>${v ? `<i class="tg v${v}">${VAR_ZH[v]}</i>` : ''}</button>`;
    }
    h += '</div>';
  }
  $('#view').innerHTML = h;
}
window.dexInfo = function (k) {
  const code = k.slice(0, 5), v = k.endsWith('*s') ? 2 : k.endsWith('*a') ? 1 : 0, got = S.dex[k], t = tierOf(code);
  const how = t === 'J' ? '養大就會看到' : t === 'N' ? `幼化期多吃「${LINE[Object.keys(FORMED).find(l => FORMED[l] === code)]}」飼料（不吃屬性飼料就隨機）` : t === 'E' ? '異變線（幼化期餓太久更容易異變）長到極限體' : `由 ${got || S.dex[PREV[code]] ? NAME[PREV[code]] : '？？？'} 繼續長大`;
  sheet(`<div class="mhead"><canvas class="big px" id="dcv"></canvas><div><h3>${got ? NAME[code] : '？？？'}</h3><div><i class="tg t-${t}">${TIER[t].zh}</i>${v ? `<i class="tg v${v}">${VAR_ZH[v]}</i>` : ''}</div>
    <p class="note">${code}${got ? `・已出貨 ${got.n} 隻` : '・還沒登錄'}</p></div></div>
    ${t !== 'J' ? `<p>售價 ${num(TIER[t].price * VAR_MUL[v])}・分數 ${TIER[t].score}</p>` : ''}<p class="note">取得：${how}${v === 1 ? '；孵化時 5% 是異色' : v === 2 ? '；孵化時 1% 是閃光' : ''}</p>
    <button class="btn wide" onclick="closeSheet()">關閉</button>`);
  const c = $('#dcv'); Pen.drawInto(c, code, v, 110); if (!got) c.classList.add('sil');
};
function renderShop() {
  const row = (k, ic, name, desc) => { const u = shopUnlocked(k); const own = k === 'feeder' && S.feeder; return `<div class="srow"><span class="sic">${ic}</span><span class="sinfo"><b>${name}</b><small>${desc}</small>${!u.ok && !own ? `<small class="warnc">🔒 ${u.why}</small>` : ''}</span>
    <button class="btn ${u.ok ? 'pri' : ''}" ${u.ok && !own ? '' : 'disabled'} onclick="G.buy('${k}')">${own ? '已擁有' : '🪙 ' + num(PRICE[k])}</button></div>`; };
  if (S.tBuy.day !== dayKey()) S.tBuy = { day: dayKey(), n: 0 };
  $('#view').innerHTML = `<h2>🛒 商店</h2>
    ${row('egg', '🥚', '蛋', '放進飼養圈會自己長大。每天登入送 2 顆')}
    ${row('fruit', '🍑', '突破果', '點單隻怪獸使用：下一次判定 稀有 20%→35%、極限 10%→20%')}
    ${row('ticket', '🎫', '稀有蛋券', `孵化前用在蛋上，保證走稀有路線（仍要餵滿 6 次）。今天已買 ${S.tBuy.n}/2`)}
    ${row('bed', '🛏', '加速床（7 天）', `全圈成長時間 ×0.8，餓得也快。${S.clock < S.bedUntil ? '使用中，剩 ' + fmt(S.bedUntil - S.clock) + '（再買會延長）' : ''}`)}
    ${row('feeder', '🤖', '自動餵食器', '離線時每 2 小時幫全圈餵一次（普通飼料），最多 4 次，睡覺用')}
    <div class="srow"><span class="sic">🥩</span><span class="sinfo"><b>屬性飼料</b><small>在飼養圈的「飼料槽」選，每份 10。幼化期吃最多的屬性決定走哪條線。${S.test || S.stat.ship >= UNLOCK.attr ? '' : `<span class="warnc">🔒 出貨 ${UNLOCK.attr} 隻後解鎖（${S.stat.ship}/${UNLOCK.attr}）</span>`}</small></span></div>
    <h3>付費（原型尚未開放）</h3>
    <div class="srow mock"><span class="sic">🎁</span><span class="sinfo"><b>新手包</b><small>稀有蛋券 ×3，每個帳號限買 1 次</small></span><button class="btn" disabled>NT$30・尚未開放</button></div>
    <div class="srow mock"><span class="sic">🏠</span><span class="sinfo"><b>飼養圈名額（第 11–15 格）</b><small>每格 NT$60、永久；滿 10 格後才開放。${S.slots >= MAX_FREE_SLOTS ? '' : `（目前 ${S.slots}/10 格）`}</small></span><button class="btn" disabled>NT$60・尚未開放</button></div>
    <p class="note">原型不會收任何錢，按鈕只是示意。</p>`;
}
function renderTasks() {
  const bar = (a, b) => `<span class="bar"><i style="width:${Math.min(100, a / b * 100)}%"></i></span>`;
  const row = (t) => { const [a, b] = t.p(), done = a >= b, got = S.claimed[t.id];
    const rw = [t.slot ? `飼養圈第 ${t.slot} 格` : '', t.ticket ? '稀有蛋券 ×1' : ''].filter(Boolean).join('＋');
    return `<div class="trow2 ${got ? 'got' : done ? 'ready' : ''}"><span class="tinfo"><b>${t.zh}</b><small>獎勵：${rw}</small>${bar(a, b)}<small>${t.txt ? t.txt() : `${Math.min(a, b)}/${b}`}</small></span>
      ${got ? '<span class="ok">✔ 已領</span>' : `<button class="btn ${done ? 'pri' : ''}" ${done ? '' : 'disabled'} onclick="claim('${t.id}')">領取</button>`}</div>`; };
  const wk = Object.keys(S.week.sp).length;
  let h = `<h2>📋 任務</h2><h3>擴充飼養圈（目前 ${S.slots}/10 格）</h3>${TASKS.filter(t => t.slot).map(row).join('')}
    <h3>稀有蛋券</h3>${TASKS.filter(t => !t.slot).map(row).join('')}
    <div class="trow2 ${S.week.claimed ? 'got' : wk >= 10 ? 'ready' : ''}"><span class="tinfo"><b>週任務：本週出貨 10 種</b><small>獎勵：稀有蛋券 ×1（每週一 00:00 台北時間重置）</small>${bar(wk, 10)}<small>${Math.min(wk, 10)}/10</small></span>
      ${S.week.claimed ? '<span class="ok">✔ 已領</span>' : `<button class="btn ${wk >= 10 ? 'pri' : ''}" ${wk >= 10 ? '' : 'disabled'} onclick="claim('week')">領取</button>`}</div>
    <h3>路線收集（集滿送稀有蛋券）</h3>`;
  for (const r of ROUTES) { const n = r.codes.filter(c => S.dex[c]).length, got = S.claimed[r.id];
    h += `<div class="trow2 ${got ? 'got' : n === 3 ? 'ready' : ''}"><span class="tinfo"><b>${r.codes.map(c => S.dex[c] ? NAME[c] : '？？？').join(' → ')}</b>${bar(n, 3)}<small>${n}/3（原色）</small></span>
      ${got ? '<span class="ok">✔</span>' : `<button class="btn ${n === 3 ? 'pri' : ''}" ${n === 3 ? '' : 'disabled'} onclick="claim('${r.id}')">領取</button>`}</div>`; }
  h += `<h3>付費名額</h3><div class="trow2 mock"><span class="tinfo"><b>第 11–15 格</b><small>每格 NT$60、永久；滿 10 格後開放</small></span><button class="btn" disabled>尚未開放</button></div>`;
  $('#view').innerHTML = h;
}
window.claim = claim;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function renderRank() {
  const r = rng(S.week.id), names = ['蜥蜴大王', '小芽芽', '夜貓飼育員', '綠鱗阿哲', 'Mika', '鐵甲阿伯', '咕嚕咕嚕', '阿蜥'];
  const dayIn = Math.min(7, ((Date.now() + TPE) / 864e5 - S.week.id));
  const rows = names.map(n => { const sp = Math.floor(r() * 12 * dayIn / 7 + r() * 3); return { n, sp, sc: sp * 10 + Math.floor(r() * sp * 40) }; });
  rows.push({ n: '你', sp: Object.keys(S.week.sp).length, sc: S.week.score, me: true });
  rows.sort((a, b) => b.sp - a.sp || b.sc - a.sc);
  const end = (S.week.id + 7) * 864e5 - TPE;
  $('#view').innerHTML = `<h2>🏆 本週排行榜</h2><div class="mockban">⚠️ 原型：排行榜是<b>本機假資料</b>（其他玩家是假的），還沒有連線。</div>
    <p class="note">先比本週出貨<b>種類數</b>，一樣再比分數。每週一 00:00（台北時間）重置，還剩 ${fmt(end - Date.now())}。排名不送獎勵。</p>
    <div class="rank">${rows.map((x, i) => `<div class="rrow ${x.me ? 'me' : ''}"><span class="rn">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="rname">${esc(x.n)}</span><span class="rsp">${x.sp} 種</span><span class="rsc">${num(x.sc)} 分</span></div>`).join('')}</div>
    <h3>我的永久紀錄</h3><div class="stats"><div><b>${dexCount()}</b><small>圖鑑格數</small></div><div><b>${num(S.score)}</b><small>總分</small></div></div>`;
}
function render() {
  renderTop();
  $('#penwrap').classList.toggle('hidden', tab !== 'pen'); $('#view').classList.toggle('hidden', tab === 'pen');
  if (tab === 'pen') renderPen(); else { Pen.sync(S.mons.map(m => ({ id: m.id, st: m.st, code: m.code, v: m.v, tier: m.code ? tierOf(m.code) : null }))); lastSig = ''; }
  if (tab === 'dex') renderDex(); else if (tab === 'shop') renderShop(); else if (tab === 'tasks') renderTasks(); else if (tab === 'rank') renderRank();
}
function intro() {
  if (S.intro) return;
  sheet(`<h2>歡迎來到異種孵化場！</h2><ol class="intro">
    <li><b>🥚 放蛋</b>：蛋放進飼養圈，會自己長大，<b>關掉遊戲也會長</b>。</li>
    <li><b>🍖 餵食</b>：每 60 分鐘會餓一次。餵得越勤，越有機會長成稀有、傳說。</li>
    <li><b>💰 出貨</b>：長到成形體（4 小時）就能賣錢、登錄圖鑑，空出名額再放新蛋。</li></ol>
    <p class="note">第一顆是教學蛋，5 分鐘就長大。</p><button class="btn big pri" onclick="S.intro=true;save();closeSheet()">開始！</button>`);
}

/* ---------- 迴圈 ---------- */
let lastUi = 0;
function tick() {
  const now = Date.now(), real = now - S.real; S.real = now;
  if (real > 0) {
    if (real > 5000) handleEv(advance(real, true), true, real);
    else { const ev = advance(real * S.speed, false); if (ev.length) handleEv(ev, false); }
  }
  if (now - lastUi > 900) { lastUi = now; checkDay(); if (tab === 'pen') renderPen(); else renderTop(); if (sheetId != null && !$('#sheet').classList.contains('hidden')) { const p = document.querySelector('#sheet p'); const m = S.mons.find(x => x.id === sheetId); if (p && m) p.innerHTML = monLine(m); } }
}
function boot() {
  const had = load(); checkDay(!had);
  document.querySelectorAll('nav#tabs button').forEach(b => b.onclick = () => G.tab(b.dataset.tab));
  $('#tbtn').onclick = G.toggleTest;
  $('#bEgg').onclick = G.eggBtn; $('#bFeed').onclick = G.feed; $('#bShip').onclick = G.shipAll;
  Pen.init($('#pen'), (id) => { const m = S.mons.find(x => x.id === id); if (m) openMon(id); });
  render(); tick(); intro();
  setInterval(tick, 250); setInterval(save, 5000);
  window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else tick(); });
}
boot();
