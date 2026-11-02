'use strict';
/* 異種孵化場 原型 v0.1 — 數值依《設計規格 v2（核心版）》；規格未寫的數值集中在 ASSUME（見「機率說明」頁與 Page 原型節） */
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const SAVE_KEY = 'xeno-hatchery-v01';
const STAGES = ['初胚體', '幼化體', '成形體', '覺醒體', '極限體'];
const STAGE_MIN = [30, 120, 360, 1440, null];      // 規格 3：停留時間（分鐘）
const EGG_MIN = 5, TUT_EGG_MIN = 1, TUT_NASCENT_MIN = 3;
const MIN_FEED = [1, 2, 3, 4];                     // 規格 3：本階段最低餵食
const T = { F: { zh: '兇猛', c: '#c8402e' }, S: { zh: '甲殼', c: '#8a6a4a' }, A: { zh: '敏捷', c: '#2e8fb0' }, M: { zh: '異變', c: '#7a4a9e' } };
const TK = ['F', 'S', 'A', 'M'];
const FORMS = [
  ['R-001', '鱗芽蜥', 'Scalebud', 0, null], ['R-002', '芽冠蜥', 'Budcrest', 1, null],
  ['R-003', '焰顎蜥', 'Blazejaw', 2, 'F'], ['R-004', '岩盾蜥', 'Shellrock', 2, 'S'], ['R-005', '迅鱗蜥', 'Swiftscale', 2, 'A'], ['R-006', '斑蝕蜥', 'Blightmottle', 2, 'M'],
  ['R-007', '赤霸蜥', 'Crimsorex', 3, 'F'], ['R-008', '鍛顎蜥', 'Slagfang', 3, 'F'], ['R-009', '堡甲蜥', 'Fortitail', 3, 'S'], ['R-010', '鱗衛蜥', 'Scalewarden', 3, 'S'],
  ['R-011', '疾風蜥', 'Galescale', 3, 'A'], ['R-012', '蒼翼蜥', 'Azurwing', 3, 'A'], ['R-013', '瘴棘蜥', 'Miasmspine', 3, 'M'], ['R-014', '裂相蜥', 'Riftmorph', 3, 'M'],
  ['R-015', '煌天霸蜥', 'Sunvane', 4, 'F'], ['R-016', '熾鍛霸蜥', 'Crucitan', 4, 'F'], ['R-017', '嶽壁巨蜥', 'Montwall', 4, 'S'], ['R-018', '天鱗將蜥', 'Oathdrake', 4, 'S'],
  ['R-019', '雷跡馳蜥', 'Voltstride', 4, 'A'], ['R-020', '穹嵐翼蜥', 'Skytempest', 4, 'A'], ['R-021', '冥瘴冠蜥', 'Venocrown', 4, 'M'], ['R-022', '無相裂蜥', 'Nullform', 4, 'M'],
].map(([code, zh, en, st, t]) => ({ code, zh, en, st, t }));
const F = Object.fromEntries(FORMS.map(f => [f.code, f]));
const FORMED = { F: 'R-003', S: 'R-004', A: 'R-005', M: 'R-006' };
const ULT = { 'R-007': 'R-015', 'R-008': 'R-016', 'R-009': 'R-017', 'R-010': 'R-018', 'R-011': 'R-019', 'R-012': 'R-020', 'R-013': 'R-021', 'R-014': 'R-022' };
const ROUTES = [['霸', 'R-003', 'R-007', 'R-015'], ['鍛', 'R-003', 'R-008', 'R-016'], ['堡', 'R-004', 'R-009', 'R-017'], ['衛', 'R-004', 'R-010', 'R-018'],
  ['迅', 'R-005', 'R-011', 'R-019'], ['翼', 'R-005', 'R-012', 'R-020'], ['棘', 'R-006', 'R-013', 'R-021'], ['相', 'R-006', 'R-014', 'R-022']];
const RANKS = ['D', 'C', 'B', 'A', 'S', 'SS'];
const RANK_CAP = { D: 2, C: 2, B: 3, A: 3, S: 4, SS: 4 };          // 4：品階上限
const RANK_MULT = { D: 1, C: 1.2, B: 1.5, A: 2, S: 3, SS: 4.5 };  // 4：放生加乘
const FOODS = [
  { k: 'meat', zh: '生肉排', t: 'F', cost: 10 }, { k: 'calc', zh: '鈣殼餅', t: 'S', cost: 10 }, { k: 'bug', zh: '活餌蟲', t: 'A', cost: 10 },
  { k: 'gel', zh: '螢光營養膠', t: 'M', cost: 10 }, { k: 'std', zh: '標準飼料', t: null, cost: 0 }];
const ENVS = [
  { k: 'heat', zh: '熱燈區', t: 'F', unlock: null }, { k: 'rock', zh: '岩床區', t: 'S', unlock: [300, 5] }, { k: 'track', zh: '環形跑道', t: 'A', unlock: [500, 10] },
  { k: 'mist', zh: '霧化共振艙', t: 'M', unlock: [800, 15] }, { k: 'perch', zh: '高空棲架', t: 'A', unlock: [1200, 20] }];
const EGGS = {
  normal: { zh: '普通蛋', price: { coin: 100 }, lv: 1, odds: [['D', 60], ['C', 30], ['B', 10]] },
  good: { zh: '優良蛋', price: { coin: 500, scale: 10 }, lv: 3, odds: [['C', 50], ['B', 35], ['A', 15]] },
  rare: { zh: '稀有蛋', price: { coin: 2000, scale: 30, shard_A: 5 }, lv: 6, odds: [['B', 40], ['A', 45], ['S', 15]] },
  legend: { zh: '傳說蛋', price: { core: 1, shard_S: 10 }, lv: 10, odds: [['A', 40], ['S', 50], ['SS', 10]] },
};
const RELEASE = [ // 規格 6
  { coin: 20, scale: 1, cry: 0, shard: 0 }, { coin: 60, scale: 2, cry: 0, shard: 0 }, { coin: 150, scale: 3, cry: 1, shard: 0 },
  { coin: 400, scale: 5, cry: 2, shard: 1, core: 'S10' }, { coin: 1000, scale: 8, cry: 3, shard: 2, core: 1 }];
const LV_REL = [0, 0, 3, 10, 18, 28, 40, 60, 80, 100, 120]; // 研究員 Lv：Lv3=10、Lv6=40、Lv10=120 依規格；其餘為假設
const PERSONALITY = ['勇敢', '慎重', '淘氣', '好奇', '黏人', '懶散', '暴躁', '孤僻'];
/* 規格未寫、原型自訂的數值 */
const ASSUME = {
  startCoin: 300, feedCooldownMin: 15, starThresholds: [1, 3, 6], tutRank: 'C', retryTrialMin: 720, retryMinFeed: 2,
  potion: { coin: 30 }, lamp: { cry: 2 }, catalyst: { scale: 5, cry_M: 3 }, stabilizer: { coin: 300, scale: 10 },
  autoClean: { coin: 1500, scale: 50 }, thermo: { scale: 80 }, incubator: { core: 1 },
  daily: [{ k: 'feed', zh: '餵食 10 次', n: 10 }, { k: 'release', zh: '放生 1 隻', n: 1 }, { k: 'clean', zh: '清便便 5 次', n: 5 }], dailyReward: { coin: 100, scale: 3 },
};
const fmtCost = (p) => Object.entries(p).map(([k, v]) => ({ coin: `${v} 金`, scale: `鱗屑 ${v}`, core: `古鱗核心 ${v}`, cry: `任一結晶 ${v}` }[k] || (k.startsWith('cry_') ? `${T[k.slice(4)].zh}結晶 ${v}` : k.startsWith('shard_') ? `${k.slice(6)} 碎片 ${v}` : k))).join('＋');

/* ---------------- 存檔 ---------------- */
let S;
function newSave() {
  const now = Date.now();
  return {
    v: 1, game: now, simT: now, real: now, speed: 1, calm: false,
    coin: ASSUME.startCoin, scale: 0, cry: { F: 0, S: 0, A: 0, M: 0 }, shard: Object.fromEntries(RANKS.map(r => [r, 0])), core: 0,
    items: { potion: 1, lamp: 0, catalyst: 0, stabilizer: 0 }, eggs: [{ type: 'tutorial', id: uid() }],
    slots: [null, null, null], releases: 0, lab: { autoClean: false, thermo: false, incubator: false, incT: 0, envs: { heat: true } },
    dex: {}, dexRewards: {}, title: '', tut: { hatch: false, feed: false, clean: false, evo: false, dex: false, done: false },
    daily: { key: dayKey(now), prog: { feed: 0, release: 0, clean: 0 }, claimed: {} }, log: [], seen: now,
  };
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function dayKey(t) { return Math.floor((t + 8 * HOUR - 6 * HOUR) / DAY); } // 每日 06:00（UTC+8）重置
function save() { S.real = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
function load() {
  try { S = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = newSave();
  const off = Math.max(0, Date.now() - S.real);   // 離線：真實時間以 ×1 補上
  S.speed = 1; S.real = Date.now();
  if (off > MIN) { const before = S.log.length; advanceTo(S.game + off, true); const evs = S.log.slice(before); if (evs.length) showDiary(evs, off); }
}

/* ---------------- 模擬（以遊戲時間的每分鐘推進） ---------------- */
let ceremonyQueue = [];
function slotsOpen() { let n = 1; if (S.tut.done && S.releases >= 1) n = 2; if (level() >= 5) n = 3; return n; }
function level() { let lv = 1; for (let i = 1; i < LV_REL.length; i++) if (S.releases >= LV_REL[i]) lv = i; return lv; }
function advanceTo(target, offline) {
  if (S.simT == null) S.simT = S.game;
  S.game = Math.max(S.game, target);
  let guard = 0;
  while (S.simT + MIN <= S.game && guard++ < 200000) {   // 每 1 分鐘（遊戲時間）推進一步
    S.simT += MIN;
    for (let i = 0; i < 3; i++) if (S.slots[i]) stepMinute(S.slots[i], i, offline);
    if (S.lab.incubator) { S.lab.incT += 1; if (S.lab.incT >= 720) { S.lab.incT = 0; S.eggs.push({ type: 'normal', id: uid() }); logEv(`孵化器送來 1 顆普通蛋`); } }
  }
  dailyCheck();
}
function stepMinute(c, i, offline) {
  if (c.pausedUntil && c.pausedUntil > S.simT) return;   // 安眠燈：暫停成長
  if (c.stage < 0) { c.stageMin++; if (c.stageMin >= c.eggDur) hatch(c, i); return; }
  c.poopT++; if (c.poopT >= 90) { c.poopT = 0; if (c.poops < 3) c.poops++; }          // 每 90 分鐘 1 坨，最多 3 坨
  if (S.lab.autoClean) { c.cleanT++; if (c.cleanT >= 180) { c.cleanT = 0; c.poops = 0; } } // 自動清潔機 3 小時
  if (c.poops >= 3 && !c.sick) {
    c.fullMin++;
    if (c.fullMin > 120) { c.fullMin = 0; if (!(S.lab.thermo && Math.random() < .5)) { c.sick = true; c.sickStage = true; logEv(`${nm(c)} 生病了（便便 ≥ 3 坨超過 2 小時）`, 'sick'); } }
  } else if (c.poops < 3) c.fullMin = 0;
  if (c.final) return;
  c.stageMin++; c.envMin++;
  if (c.env === 'perch') c.perchMin++;
  if (c.envMin >= 60) { c.envMin = 0; const e = ENVS.find(x => x.k === c.env); c.tend[e.t]++; }  // 環境每 1 小時 +1
  if (c.stageMin >= stageDur(c)) stageEnd(c, i);
}
function stageDur(c) { if (c.trial) return ASSUME.retryTrialMin; if (c.tutorial && c.stage === 0) return TUT_NASCENT_MIN; return STAGE_MIN[c.stage]; }
function minFeed(c) { return c.trial ? ASSUME.retryMinFeed : MIN_FEED[c.stage]; }
function rating(c) {   // 照顧評價：2 良好／1 普通／0 差
  let r = c.feeds >= minFeed(c) ? 2 : c.feeds >= 1 ? 1 : 0;
  if (c.sickStage) r = Math.max(0, r - 1);
  return r;
}
const RATE_ZH = ['差', '普通', '良好'];
function topTend(c) { let best = 'F'; for (const k of TK) if (c.tend[k] > c.tend[best]) best = k; return best; }
function stars(n) { const th = ASSUME.starThresholds; return n >= th[2] ? 3 : n >= th[1] ? 2 : n >= th[0] ? 1 : 0; }
function hatch(c, i) {
  c.stage = 0; c.code = 'R-001'; resetStage(c); c.personality = PERSONALITY[Math.floor(Math.random() * 8)];
  if (c.tutorial) { c.poops = 1; S.tut.hatch = true; }
  register(c); logEv(`蛋孵化了：${nm(c)}（品階 ${c.rank}）`, 'evo'); ceremonyQueue.push({ code: 'R-001', from: 'EGG', rank: c.rank, shiny: c.shiny, first: firstFlag });
}
function resetStage(c) { c.stageMin = 0; c.feeds = 0; c.food = { meat: 0, calc: 0, bug: 0, gel: 0, std: 0 }; c.tend = { F: 0, S: 0, A: 0, M: 0 }; c.envMin = 0; c.perchMin = 0; c.sickStage = !!c.sick; }
function stageEnd(c, i) {
  const r = rating(c), from = c.code;
  c.lastRating = r;
  if (c.stage === 0) return evolve(c, 'R-002');
  if (c.stage === 1) return evolve(c, r === 0 ? 'R-006' : FORMED[topTend(c)]);
  if (c.stage === 2) {
    if (RANK_CAP[c.rank] <= 2) return finalize(c, `品階 ${c.rank} 上限為成形體`);
    let to;
    if (from === 'R-003') to = c.food.calc >= 2 ? 'R-008' : 'R-007';
    else if (from === 'R-004') to = c.food.meat >= 2 ? 'R-010' : 'R-009';
    else if (from === 'R-005') to = c.perchMin >= 120 ? 'R-012' : 'R-011';
    else to = (c.catalystOn || stars(c.tend.M) >= 3) ? 'R-014' : 'R-013';
    return evolve(c, to);
  }
  if (c.stage === 3) {
    if (RANK_CAP[c.rank] <= 3) return finalize(c, `品階 ${c.rank} 上限為覺醒體`);
    const p = ultChance(c, r);
    const roll = Math.random() * 100;
    const used = c.stabilizerOn; c.stabilizerOn = false;
    logEv(`${nm(c)} 極限進化判定：機率 ${p}%${used ? '（含穩定劑）' : ''}，擲出 ${roll.toFixed(1)}`, 'ult');
    if (p > 0 && roll < p) { c.trial = false; c.failed = false; return evolve(c, ULT[from]); }
    c.trial = false; c.failed = true; c.final = true; c.stageMin = 0;
    logEv(`${nm(c)} 極限進化失敗，保持覺醒體（可放生或重新挑戰）`, 'ult');
    ceremonyQueue.push({ fail: true, code: from, rank: c.rank, shiny: c.shiny, p });
  }
}
function ultChance(c, r) {  // 4-1：S 30%、SS 50%；良好 +15；差 = 不判定；穩定劑 +10
  if (r === undefined) r = rating(c);
  if (!(c.rank === 'S' || c.rank === 'SS')) return 0;
  if (r === 0) return 0;
  return (c.rank === 'SS' ? 50 : 30) + (r === 2 ? 15 : 0) + (c.stabilizerOn ? 10 : 0);
}
function finalize(c, why) { c.final = true; c.capNote = why; logEv(`${nm(c)} 停在${STAGES[c.stage]}（${why}）`); }
let firstFlag = false;
function evolve(c, to) {
  const from = c.code;
  const chance = c.catalystOn ? 6 : 2;               // 異色：每次進化 2%，變異觸媒 6%
  if (!c.shiny && Math.random() * 100 < chance) { c.shiny = true; logEv(`${F[to].zh} 出現異色！`, 'shiny'); }
  c.catalystOn = false;
  c.code = to; c.stage = F[to].st; resetStage(c);
  if (c.stage === 4) c.final = true;
  register(c);
  if (c.tutorial) S.tut.evo = true;
  logEv(`${F[from].zh} 進化成 ${F[to].zh}（${STAGES[c.stage]}）`, 'evo');
  ceremonyQueue.push({ code: to, from, rank: c.rank, shiny: c.shiny, first: firstFlag });
}
function register(c) {
  const d = S.dex[c.code] || (S.dex[c.code] = { seen: false, shiny: false, best: null });
  firstFlag = !d.seen; d.seen = true; if (c.shiny) d.shiny = true;
  if (!d.best || RANKS.indexOf(c.rank) > RANKS.indexOf(d.best)) d.best = c.rank;
  dexRewards();
}
function dexRewards() {
  const seen = FORMS.filter(f => S.dex[f.code]?.seen).map(f => f.code), R = S.dexRewards;
  const give = (k, msg, fn) => { if (!R[k]) { R[k] = true; fn(); toast('圖鑑獎勵：' + msg); logEv('圖鑑獎勵：' + msg); } };
  if (seen.length >= 5) give('novice', '新手研究員 → 優良蛋 ×1', () => S.eggs.push({ type: 'good', id: uid() }));
  for (const [n, ...codes] of ROUTES) if (['R-002', ...codes].every(x => seen.includes(x))) give('route_' + n, `路線「${n}」完成 → ${T[F[codes[0]].t].zh}結晶 ×10`, () => S.cry[F[codes[0]].t] += 10);
  for (let st = 0; st < 5; st++) if (FORMS.filter(f => f.st === st).every(f => seen.includes(f.code))) give('stage_' + st, `${STAGES[st]}全登錄 → 實驗室裝飾 ×1`, () => { S.decor = (S.decor || 0) + 1; });
  if (FORMS.filter(f => S.dex[f.code]?.shiny).length >= 10) give('shiny10', '異色收藏家 → 變異觸媒 ×3', () => S.items.catalyst += 3);
  if (seen.length === 22) give('full', '完整圖鑑 → 傳說蛋 ×1＋稱號「鱗之博士」', () => { S.eggs.push({ type: 'legend', id: uid() }); S.title = '鱗之博士'; });
}
function nm(c) { return c.stage < 0 ? '蛋' : F[c.code].zh + (c.shiny ? '（異色）' : ''); }
function logEv(text, kind = 'info') { S.log.push({ t: S.simT || S.game, text, kind }); if (S.log.length > 200) S.log.splice(0, S.log.length - 200); }
function dailyCheck() { const k = dayKey(S.game); if (S.daily.key !== k) S.daily = { key: k, prog: { feed: 0, release: 0, clean: 0 }, claimed: {} }; }

/* ---------------- 動作 ---------------- */
function pay(p) {
  const have = (k) => k === 'coin' ? S.coin : k === 'scale' ? S.scale : k === 'core' ? S.core : k === 'cry' ? Math.max(...TK.map(t => S.cry[t])) : k.startsWith('cry_') ? S.cry[k.slice(4)] : k.startsWith('shard_') ? S.shard[k.slice(6)] : 0;
  for (const [k, v] of Object.entries(p)) if (have(k) < v) { toast('素材不足：' + fmtCost(p)); return false; }
  for (const [k, v] of Object.entries(p)) {
    if (k === 'coin') S.coin -= v; else if (k === 'scale') S.scale -= v; else if (k === 'core') S.core -= v;
    else if (k === 'cry') { const t = TK.reduce((a, b) => S.cry[b] > S.cry[a] ? b : a); S.cry[t] -= v; }
    else if (k.startsWith('cry_')) S.cry[k.slice(4)] -= v; else if (k.startsWith('shard_')) S.shard[k.slice(6)] -= v;
  }
  return true;
}
function rollRank(type) { const o = EGGS[type].odds; let r = Math.random() * 100; for (const [k, p] of o) { if ((r -= p) < 0) return k; } return o[o.length - 1][0]; }
const A = {
  tab(t) { UI.tab = t; if (t === 'dex') { S.tut.dex = true; tutCheck(); } render(); },
  place(eid) {
    const i = [0, 1, 2].find(j => j < slotsOpen() && !S.slots[j]); if (i === undefined) return toast('沒有空的飼養欄位');
    const ei = S.eggs.findIndex(e => e.id === eid); const e = S.eggs.splice(ei, 1)[0];
    const tut = e.type === 'tutorial';
    S.slots[i] = { id: uid(), eggType: e.type, tutorial: tut, rank: e.rank || (tut ? ASSUME.tutRank : rollRank(e.type)), stage: -1, code: 'EGG', stageMin: 0, eggDur: tut ? TUT_EGG_MIN : EGG_MIN,
      poops: 0, poopT: 0, cleanT: 0, fullMin: 0, sick: false, sickStage: false, env: 'heat', feeds: 0, food: {}, tend: { F: 0, S: 0, A: 0, M: 0 }, envMin: 0, perchMin: 0,
      lastFeed: -1e15, shiny: false, final: false, pausedUntil: 0, born: S.game };
    toast(`${tut ? '教學蛋' : EGGS[e.type].zh}放進欄位 ${i + 1}，品階在孵蛋時決定`); render();
  },
  feed(i, k) {
    const c = S.slots[i], f = FOODS.find(x => x.k === k);
    if (!c || c.stage < 0) return;
    const wait = c.lastFeed + ASSUME.feedCooldownMin * MIN - S.game; if (wait > 0) return toast(`還很飽，${Math.ceil(wait / MIN)} 分鐘後再餵`);
    if (f.cost && !pay({ coin: f.cost })) return;
    c.lastFeed = S.game; c.feeds++; c.food[k] = (c.food[k] || 0) + 1; if (f.t) c.tend[f.t]++;
    S.daily.prog.feed++; if (c.tutorial) S.tut.feed = true; tutCheck(); toast(`餵了${f.zh}`); render();
  },
  clean(i) { const c = S.slots[i]; if (!c || !c.poops) return; c.poops--; c.fullMin = 0; S.daily.prog.clean++; if (c.tutorial) S.tut.clean = true; tutCheck(); render(); },
  env(i, k) { const c = S.slots[i]; c.env = k; c.envMin = 0; render(); },
  potion(i) { const c = S.slots[i]; if (!c.sick) return toast('沒有生病'); if (S.items.potion < 1) return toast('沒有治療藥（商店 30 金）'); S.items.potion--; c.sick = false; c.fullMin = 0; toast('病好了'); render(); },
  lamp(i) {
    const c = S.slots[i];
    if (c.pausedUntil > S.game) { c.pausedUntil = 0; toast('關掉安眠燈'); return render(); }
    if (S.items.lamp < 1) return toast('沒有安眠燈（商店用結晶兌換）'); S.items.lamp--; c.pausedUntil = S.game + 6 * HOUR; toast('安眠燈：暫停成長 6 小時'); render();
  },
  catalyst(i) { const c = S.slots[i]; if (c.catalystOn) return toast('已使用'); if (S.items.catalyst < 1) return toast('沒有變異觸媒'); S.items.catalyst--; c.catalystOn = true; toast('變異觸媒：下次進化異色 6%，斑蝕蜥會走裂相蜥'); render(); },
  stab(i) { const c = S.slots[i]; if (c.stabilizerOn) return toast('每次判定限用 1 個'); if (S.items.stabilizer < 1) return toast('沒有進化穩定劑'); S.items.stabilizer--; c.stabilizerOn = true; toast('進化穩定劑：本次極限判定 +10%'); render(); },
  retry(i) {
    const c = S.slots[i], t = F[c.code].t;
    if (!pay({ scale: 10, ['cry_' + t]: 3 })) return;
    c.failed = false; c.final = false; c.trial = true; resetStage(c); logEv(`${nm(c)} 重新挑戰：開始 12 小時嘗試期`); toast('開始 12 小時嘗試期，照顧評價重算'); render();
  },
  release(i) {
    const c = S.slots[i]; if (!c || c.stage < 0) return;
    const rw = releaseReward(c);
    modal(`<h3>放生 ${nm(c)}？</h3><p class="note">放生後欄位清空，個體已登錄圖鑑。</p><p>可得：${rw.text}</p>
      <div class="row"><button class="btn pri" data-a="releaseOk" data-i="${i}">確定放生</button><button class="btn" data-a="closeModal">取消</button></div>`);
  },
  releaseOk(i) {
    const c = S.slots[i], rw = releaseReward(c), lv0 = level(), open0 = slotsOpen();
    S.coin += rw.coin; S.scale += rw.scale; if (rw.cry) S.cry[rw.t] += rw.cry; if (rw.shard) S.shard[c.rank] += rw.shard; if (rw.core) S.core += rw.core;
    S.slots[i] = null; S.releases++; S.daily.prog.release++; closeModal();
    logEv(`放生 ${nm(c)}：${rw.text}${rw.coreHit === false ? '' : ''}`); toast('放生：' + rw.text);
    if (level() > lv0) toast(`研究員升到 Lv ${level()}`);
    if (slotsOpen() > open0) toast(`解鎖飼養欄位 ${slotsOpen()}`);
    render();
  },
  buyEgg(type) { const e = EGGS[type]; if (level() < e.lv) return toast(`研究員 Lv ${e.lv} 解鎖`); if (!pay(e.price)) return; S.eggs.push({ type, id: uid() }); toast(`買到${e.zh}`); render(); },
  buyItem(k) { const cost = ASSUME[k]; if (!pay(cost)) return; S.items[k]++; toast('買到 1 個'); render(); },
  buyLab(k) { if (S.lab[k]) return; if (!pay(ASSUME[k])) return; S.lab[k] = true; toast('實驗室升級完成'); render(); },
  buyEnv(k) { const e = ENVS.find(x => x.k === k); if (S.lab.envs[k]) return; if (!pay({ coin: e.unlock[0], scale: e.unlock[1] })) return; S.lab.envs[k] = true; toast(`解鎖${e.zh}`); render(); },
  claim(k) { const d = ASSUME.daily.find(x => x.k === k); if (S.daily.prog[k] < d.n || S.daily.claimed[k]) return; S.daily.claimed[k] = true; S.coin += ASSUME.dailyReward.coin; S.scale += ASSUME.dailyReward.scale; toast('任務獎勵 100 金＋鱗屑 3'); render(); },
  probFor(i) { UI.tab = 'prob'; UI.probSlot = i; render(); },
  closeModal() { closeModal(); },
  calm() { S.calm = !S.calm; render(); },
  // DEV
  skip(m) { const before = S.log.length; advanceTo(S.game + m * MIN); toast(`時間 +${m >= 60 ? m / 60 + ' 小時' : m + ' 分鐘'}`); playCeremonies(); render(); },
  speed() { S.speed = S.speed === 60 ? 1 : 60; toast(S.speed === 60 ? '加速 ×60：真實 1 秒＝遊戲 1 分鐘' : '回到 ×1'); render(); },
  rich() { S.coin += 5000; S.scale += 100; TK.forEach(t => S.cry[t] += 20); RANKS.forEach(r => S.shard[r] += 20); S.core += 3; for (const k in S.items) S.items[k] += 5; toast('已加測試素材'); render(); },
  testEgg(r) { S.eggs.push({ type: 'rare', id: uid(), rank: r }); toast(`加入 ${r} 測試蛋`); render(); },
  lvup() { const lv = level(); if (lv < 10) S.releases = Math.max(S.releases, LV_REL[lv + 1]); S.tut.done = true; toast(`研究員 Lv ${level()}`); render(); },
  reset() { if (confirm('確定清除存檔？')) { localStorage.removeItem(SAVE_KEY); S = newSave(); ceremonyQueue = []; render(); } },
};
function releaseReward(c) {
  const st = c.stage, R = RELEASE[st], t = F[c.code].t || null;
  const coin = Math.round(R.coin * RANK_MULT[c.rank] * (c.shiny ? 2 : 1));
  let core = 0; if (R.core === 1) core = 1; else if (R.core === 'S10' && (c.rank === 'S' || c.rank === 'SS') && Math.random() < .1) core = 1;
  const parts = [`${coin} 金`, `鱗屑 ${R.scale}`]; if (R.cry && t) parts.push(`${T[t].zh}結晶 ${R.cry}`); if (R.shard) parts.push(`${c.rank} 碎片 ${R.shard}`);
  if (R.core === 'S10' && (c.rank === 'S' || c.rank === 'SS')) parts.push('古鱗核心 10% 機率'); if (R.core === 1) parts.push('古鱗核心 1');
  return { coin, scale: R.scale, cry: t ? R.cry : 0, t, shard: R.shard, core, text: parts.join('、') };
}
function tutCheck() { const t = S.tut; if (!t.done && t.hatch && t.feed && t.clean && t.evo && t.dex) { t.done = true; toast('教學完成！放生第 1 隻後解鎖飼養欄位 2'); logEv('教學完成'); } }

/* ---------------- UI ---------------- */
const UI = { tab: 'lab', probSlot: null };
const $ = (s) => document.querySelector(s);
function img(code, cls = '', scale = .5) { const key = code === 'EGG' ? 'egg_normal' : code; const [w] = SIZES[key] || [100]; return `<img class="px ${cls}" src="img/${key}.png" width="${Math.round(w * scale)}" alt="">`; }
function eggImg(type, scale = .5) { const k = 'egg_' + type; return `<img class="px" src="img/${k}.png" width="${Math.round(SIZES[k][0] * scale)}" alt="">`; }
function fmtDur(ms) { ms = Math.max(0, ms); const h = Math.floor(ms / HOUR), m = Math.floor(ms % HOUR / MIN); return h ? `${h} 小時 ${m} 分` : `${m} 分`; }
function clock(t) { const d = new Date(t + 8 * HOUR); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
function toast(m) { const box = $('#toast'); while (box.children.length >= 3) box.firstChild.remove(); const d = document.createElement('div'); d.textContent = m; box.appendChild(d); setTimeout(() => d.remove(), 2600); }
function modal(html) { $('#modal').innerHTML = `<div class="box">${html}</div>`; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
function showDiary(evs, off) {
  const top = evs.filter(e => e.kind !== 'info').slice(-5); const list = (top.length ? top : evs.slice(-5));
  setTimeout(() => modal(`<h3>登入日記</h3><p class="note">離線 ${fmtDur(off)}，期間發生：</p><ul>${list.map(e => `<li>${clock(e.t)}　${e.text}</li>`).join('')}</ul><button class="btn pri" data-a="closeModal">知道了</button>`), 50);
}
function res() {
  return `<span>研究員 <b>Lv ${level()}</b>${S.title ? '・' + S.title : ''}</span><span>金幣 <b>${S.coin}</b></span><span>鱗屑 <b>${S.scale}</b></span>
  <span>結晶 ${TK.map(t => `<b style="color:${T[t].c}">${S.cry[t]}</b>`).join('/')}</span><span>核心 <b>${S.core}</b></span>
  <span>遊戲時間 <b>${clock(S.game)}</b>（UTC+8）${S.speed === 60 ? ' <b class="warn">×60</b>' : ''}</span>`;
}
function slotCard(c, i) {
  if (!c) {
    const eggs = S.eggs.map(e => `<button class="btn sm" data-a="place" data-k="${e.id}">${e.type === 'tutorial' ? '教學蛋' : EGGS[e.type].zh}${e.rank ? '（' + e.rank + '）' : ''}</button>`).join('');
    return `<div class="card"><div class="tank" style="align-items:center"><div class="note" style="text-align:center">欄位 ${i + 1} 空著<br>${S.eggs.length ? '選一顆蛋放進來：' : '到商店買蛋'}</div></div><div class="row">${eggs}</div></div>`;
  }
  const paused = c.pausedUntil > S.game;
  if (c.stage < 0) {
    const left = (c.eggDur - c.stageMin) * MIN;
    return `<div class="card"><div class="tank"><span class="tag">欄位 ${i + 1}・孵化中</span>${eggImg(c.eggType === 'tutorial' ? 'tutorial' : c.eggType, .75)}<div class="floor"></div></div>
      <div class="name">${c.tutorial ? '教學蛋' : EGGS[c.eggType].zh}</div><div class="bar"><i style="width:${100 * c.stageMin / c.eggDur}%"></i></div><div class="meta"><span>孵化倒數 ${fmtDur(left)}</span></div></div>`;
  }
  const f = F[c.code], tt = topTend(c), total = TK.reduce((a, k) => a + c.tend[k], 0);
  const aura = total ? T[tt].c + '55' : 'rgba(111,191,115,.25)';
  const dur = stageDur(c), r = rating(c);
  let timer;
  if (c.failed) timer = `<span class="warn">極限進化失敗・保持覺醒體</span>`;
  else if (c.final) timer = c.stage === 4 ? '<span class="good">極限體・終點</span>' : `<span class="note">${c.capNote || '已達上限'}</span>`;
  else timer = `<span>${c.trial ? '嘗試期' : '下次進化'} ${fmtDur((dur - c.stageMin) * MIN)}${paused ? '（安眠燈暫停中）' : ''}</span>`;
  const cool = Math.max(0, c.lastFeed + ASSUME.feedCooldownMin * MIN - S.game);
  const poops = Array.from({ length: c.poops }, () => `<button class="poop" data-a="clean" data-i="${i}" title="點一下清掉">💩</button>`).join('');
  const isUltStage = c.stage === 3 && (c.rank === 'S' || c.rank === 'SS');
  const ultLine = isUltStage ? `<div class="ultline">本次極限進化機率 <b>${ultChance(c)}%</b> <span class="note">${c.failed ? '' : '（依目前照顧評價；到期時判定）'}</span>　<a data-a="probFor" data-i="${i}">明細</a>${c.failed ? `<div class="row"><button class="btn sm" data-a="retry" data-i="${i}">重新挑戰（鱗屑 10＋${T[f.t].zh}結晶 3）</button></div>` : ''}</div>` : '';
  const envOpts = ENVS.filter(e => S.lab.envs[e.k]).map(e => `<option value="${e.k}" ${c.env === e.k ? 'selected' : ''}>${e.zh}（${T[e.t].zh}${e.k === 'perch' ? '・隱藏條件' : ''}）</option>`).join('');
  const canAct = !c.final || c.failed;
  return `<div class="card"><div class="tank" style="--aura:${aura}"><span class="tag">欄位 ${i + 1}・${STAGES[c.stage]}</span>
     <span class="tagr">${c.sick ? '<b class="badc">生病</b>' : ''}${c.catalystOn ? ' 🧪觸媒' : ''}${c.stabilizerOn ? ' ⚗穩定劑' : ''}</span>
     ${img(c.code, (c.shiny ? 'shiny ' : '') + (paused ? 'paused' : ''))}<div class="floor"></div><div class="poops">${poops}</div></div>
   <div class="name">${f.zh} <span class="rank ${c.rank}">${c.rank}</span> <small>${f.code} ${f.en}・${c.personality}${c.shiny ? '・異色' : ''}</small></div>
   <div class="bar"><i style="width:${c.final ? 100 : 100 * c.stageMin / dur}%"></i></div>
   <div class="meta">${timer}<span>餵食 ${c.feeds}/${minFeed(c)}・評價 <b class="${['badc', '', 'good'][r]}">${c.final && !c.failed ? '—' : RATE_ZH[r]}</b></span></div>
   <div class="tend">${TK.map(k => `<div style="border-color:${T[k].c}">${T[k].zh} ${'★'.repeat(stars(c.tend[k])) || '—'}</div>`).join('')}</div>
   ${ultLine}
   ${canAct ? `<div class="lbl">餵食（${cool ? `${Math.ceil(cool / MIN)} 分後可餵` : '可以餵'}；傾向食物 10 金）</div>
   <div class="row">${FOODS.map(x => `<button class="btn sm" data-a="feed" data-i="${i}" data-k="${x.k}" ${cool ? 'disabled' : ''} style="${x.t ? 'border-left:3px solid ' + T[x.t].c : ''}">${x.zh}</button>`).join('')}</div>
   <div class="lbl">環境</div><div class="row"><select data-a="env" data-i="${i}">${envOpts}</select>` : '<div class="row">'}
     <button class="btn sm" data-a="potion" data-i="${i}" ${c.sick ? '' : 'disabled'}>治療藥 ${S.items.potion}</button>
     ${canAct ? `<button class="btn sm" data-a="lamp" data-i="${i}">${paused ? '關安眠燈' : '安眠燈 ' + S.items.lamp}</button>
     <button class="btn sm" data-a="catalyst" data-i="${i}">變異觸媒 ${S.items.catalyst}</button>
     ${isUltStage ? `<button class="btn sm" data-a="stab" data-i="${i}">穩定劑 ${S.items.stabilizer}</button>` : ''}` : ''}
     <button class="btn sm bad" data-a="release" data-i="${i}">放生</button></div></div>`;
}
function vLab() {
  const n = slotsOpen();
  const t = S.tut; const steps = [['hatch', '孵教學蛋'], ['feed', '餵食一次'], ['clean', '清一坨便便'], ['evo', '看第一次進化'], ['dex', '打開圖鑑']];
  const tut = t.done ? '' : `<div class="card" style="margin-bottom:12px"><b>教學</b>　${steps.map(([k, z]) => `<span class="${t[k] ? 'good' : 'note'}">${t[k] ? '✔' : '○'} ${z}</span>`).join('　')}<div class="note">完成後放生第 1 隻，解鎖飼養欄位 2。</div></div>`;
  const cards = [0, 1, 2].map(i => i < n ? slotCard(S.slots[i], i) : `<div class="card locked"><div>🔒 飼養欄位 ${i + 1}<br><span class="note">${i === 1 ? '完成教學並放生第 1 隻' : '研究員 Lv 5（放生 28 隻）'}</span></div></div>`).join('');
  return `${tut}<div class="slots">${cards}</div><p class="note">蛋庫：${S.eggs.length ? S.eggs.map(e => (e.type === 'tutorial' ? '教學蛋' : EGGS[e.type].zh) + (e.rank ? `（${e.rank}）` : '')).join('、') : '無'}　｜　點便便清掉；不顯示傾向數字，只顯示 ★。</p>`;
}
function vDex() {
  const seen = FORMS.filter(f => S.dex[f.code]?.seen).length, sh = FORMS.filter(f => S.dex[f.code]?.shiny).length;
  return `<h2>圖鑑 ${seen}/22　<span class="note">異色 ${sh}/22</span></h2>${STAGES.map((st, si) => `<h3>${st}</h3><div class="dex">${FORMS.filter(f => f.st === si).map(f => {
    const d = S.dex[f.code];
    return d?.seen ? `<div class="dexc"><div class="pic">${img(f.code, '', .25)}</div><div class="c">${f.code}</div><div class="n">${f.zh}</div><div class="c">${st}${f.t ? '・' + T[f.t].zh : ''}</div><div class="stamp">最高品階 <span class="rank ${d.best}">${d.best}</span>${d.shiny ? ' ✦異色' : ''}</div></div>`
      : `<div class="dexc"><div class="pic">${img(f.code, 'sil', .25)}</div><div class="c">${f.code}</div><div class="n">？？？</div><div class="c">${st}${f.t ? '・' + T[f.t].zh : ''}</div></div>`;
  }).join('')}</div>`).join('')}
  <h3>放生說明</h3><table><tr><th>放生階段</th><th>金幣（×品階加乘；異色 ×2）</th><th>鱗屑</th><th>傾向結晶</th><th>品階碎片</th><th>稀有道具</th></tr>
  ${RELEASE.map((r, i) => `<tr><td>${STAGES[i]}</td><td>${r.coin}</td><td>${r.scale}</td><td>${r.cry ? '主傾向 ×' + r.cry : '—'}</td><td>${r.shard ? '同品階 ×' + r.shard : '—'}</td><td>${r.core === 1 ? '古鱗核心 ×1' : r.core ? '古鱗核心 10%（S 以上）' : '—'}</td></tr>`).join('')}</table>
  <p class="note">品階加乘：D ×1、C ×1.2、B ×1.5、A ×2、S ×3、SS ×4.5。完成獎勵：登錄 5 種→優良蛋；路線完成→結晶 ×10；階段全登錄→裝飾；異色 10 種→變異觸媒 ×3；22 種→傳說蛋＋稱號。</p>`;
}
function vShop() {
  const lv = level();
  return `<h2>商店</h2><h3>蛋</h3><div class="grid2">${Object.entries(EGGS).map(([k, e]) => `<div class="item">${eggImg(k, .5)}<b>${e.zh}</b><div class="note">${fmtCost(e.price)}</div><div class="note">品階：${e.odds.map(([r, p]) => r + ' ' + p + '%').join('・')}</div>
     <div class="row"><button class="btn sm pri" data-a="buyEgg" data-k="${k}" ${lv < e.lv ? 'disabled' : ''}>${lv < e.lv ? '研究員 Lv ' + e.lv + ' 解鎖' : '購買'}</button></div></div>`).join('')}</div>
   <h3>道具（僅 4 種）</h3><div class="grid2">${[['potion', '治療藥', '治病'], ['lamp', '安眠燈', '暫停成長 6 小時（用最多的那色結晶 ×2 兌換）'], ['catalyst', '變異觸媒', '下次進化異色機率 ×3（6%），並開啟裂相蜥'], ['stabilizer', '進化穩定劑', '極限判定 +10%（每次判定限 1 個）']].map(([k, z, d]) =>
     `<div class="item"><b>${z}</b>（持有 ${S.items[k]}）<div class="note">${d}</div><div class="note">${fmtCost(ASSUME[k])}</div><div class="row"><button class="btn sm" data-a="buyItem" data-k="${k}">兌換</button></div></div>`).join('')}</div>
   <h3>實驗室升級</h3><div class="grid2">${[['autoClean', '自動清潔機', '每 3 小時自動清便便'], ['thermo', '恆溫燈', '生病機率減半'], ['incubator', '孵化器', '每 12 小時送 1 顆普通蛋']].map(([k, z, d]) =>
     `<div class="item"><b>${z}</b><div class="note">${d}</div><div class="note">${fmtCost(ASSUME[k])}</div><div class="row"><button class="btn sm" data-a="buyLab" data-k="${k}" ${S.lab[k] ? 'disabled' : ''}>${S.lab[k] ? '已安裝' : '安裝'}</button></div></div>`).join('')}
     ${ENVS.filter(e => e.unlock).map(e => `<div class="item"><b>環境區：${e.zh}</b><div class="note">每 1 小時 ${T[e.t].zh} +1${e.k === 'perch' ? '；累計 2 小時→迅鱗蜥走蒼翼蜥' : ''}</div><div class="note">${e.unlock[0]} 金＋鱗屑 ${e.unlock[1]}</div>
     <div class="row"><button class="btn sm" data-a="buyEnv" data-k="${e.k}" ${S.lab.envs[e.k] ? 'disabled' : ''}>${S.lab.envs[e.k] ? '已解鎖' : '解鎖'}</button></div></div>`).join('')}</div>`;
}
function vInv() {
  return `<h2>素材</h2><table><tr><th>素材</th><th>數量</th><th>用途</th></tr>
  <tr><td>金幣</td><td>${S.coin}</td><td>買蛋、傾向食物（10 金）、治療藥（30 金）</td></tr>
  <tr><td>鱗屑</td><td>${S.scale}</td><td>優良蛋以上的必要素材；實驗室升級；極限重新挑戰</td></tr>
  ${TK.map(t => `<tr><td style="color:${T[t].c}">${T[t].zh}結晶</td><td>${S.cry[t]}</td><td>兌換安眠燈；極限重新挑戰（主傾向 3）</td></tr>`).join('')}
  <tr><td>品階碎片</td><td>${RANKS.map(r => r + ' ' + S.shard[r]).join('・')}</td><td>稀有蛋（A 碎片 5）、傳說蛋（S 碎片 10）</td></tr>
  <tr><td>古鱗核心</td><td>${S.core}</td><td>傳說蛋、孵化器</td></tr>
  <tr><td>道具</td><td>治療藥 ${S.items.potion}・安眠燈 ${S.items.lamp}・變異觸媒 ${S.items.catalyst}・穩定劑 ${S.items.stabilizer}</td><td></td></tr>
  <tr><td>實驗室裝飾</td><td>${S.decor || 0}</td><td>（原型只計數）</td></tr></table>
  <p class="note">放生次數 ${S.releases}；研究員等級門檻（放生數）：${LV_REL.slice(2).map((n, i) => `Lv${i + 2}=${n}`).join('、')}</p>`;
}
function vTasks() {
  return `<h2>每日任務 <span class="note">每天 06:00（UTC+8）重置</span></h2><table><tr><th>任務</th><th>進度</th><th>獎勵</th><th></th></tr>
  ${ASSUME.daily.map(d => `<tr><td>${d.zh}</td><td>${Math.min(S.daily.prog[d.k], d.n)}/${d.n}</td><td>100 金＋鱗屑 3</td><td><button class="btn sm" data-a="claim" data-k="${d.k}" ${S.daily.prog[d.k] < d.n || S.daily.claimed[d.k] ? 'disabled' : ''}>${S.daily.claimed[d.k] ? '已領' : '領取'}</button></td></tr>`).join('')}</table>
  <h2>實驗日記</h2><table>${S.log.slice(-40).reverse().map(e => `<tr><td style="white-space:nowrap">${clock(e.t)}</td><td>${e.text}</td></tr>`).join('') || '<tr><td>尚無紀錄</td></tr>'}</table>
  <p class="note"><label><input type="checkbox" data-a="calm" ${S.calm ? 'checked' : ''}> 進化儀式減弱閃光</label></p>`;
}
function vProb() {
  const c = UI.probSlot != null ? S.slots[UI.probSlot] : null;
  let cur = '';
  if (c && c.stage === 3) {
    const r = rating(c), base = c.rank === 'SS' ? 50 : c.rank === 'S' ? 30 : 0;
    cur = `<div class="card"><b>${nm(c)}（${c.rank}）目前</b><div class="kv"><span>基礎機率</span><span>${base}%</span><span>覺醒體階段照顧評價：${RATE_ZH[r]}</span><span>${r === 2 ? '+15%' : r === 1 ? '+0%' : '不判定（0%）'}</span>
      <span>進化穩定劑</span><span>${c.stabilizerOn ? '+10%' : '未使用'}</span><span><b>本次極限進化機率</b></span><span><b>${ultChance(c)}%</b></span></div><p class="note">照顧評價在到期時結算；目前餵食 ${c.feeds}/${minFeed(c)}${c.sickStage ? '，本階段生病過（評價降一級）' : ''}。</p></div>`;
  }
  return `<h2>機率說明（遊戲內公開）</h2>${cur}
  <h3>極限進化機率（覺醒體 24 小時到期時判定一次；只有 S・SS 會判定）</h3>
  <table><tr><th>項目</th><th>S</th><th>SS</th></tr><tr><td>基礎機率</td><td>30%</td><td>50%</td></tr><tr><td>覺醒體階段照顧評價：良好</td><td>+15%</td><td>+15%</td></tr>
  <tr><td>覺醒體階段照顧評價：普通</td><td>+0%</td><td>+0%</td></tr><tr><td>覺醒體階段照顧評價：差</td><td>不判定（0%）</td><td>不判定（0%）</td></tr>
  <tr><td>進化穩定劑（每次判定限用 1 個）</td><td>+10%</td><td>+10%</td></tr><tr><td>最高機率</td><td>55%</td><td>75%</td></tr></table>
  <p class="note">失敗：保持覺醒體並登錄圖鑑，可直接放生，或花鱗屑 10＋主傾向結晶 3 重新挑戰（12 小時嘗試期，照顧評價重算，次數不限）。品階 D・C 只到成形體，B・A 只到覺醒體。</p>
  <h3>蛋的品階機率</h3><table><tr><th>蛋</th><th>品階機率</th></tr>${Object.values(EGGS).map(e => `<tr><td>${e.zh}</td><td>${e.odds.map(([r, p]) => r + ' ' + p + '%').join('・')}</td></tr>`).join('')}<tr><td>教學蛋</td><td>固定 C</td></tr></table>
  <h3>其他機率</h3><table><tr><td>異色</td><td>每次進化 2%；使用變異觸媒 6%</td></tr><tr><td>古鱗核心（放生覺醒體）</td><td>S 以上 10%</td></tr><tr><td>生病（恆溫燈）</td><td>便便 ≥ 3 坨超過 2 小時必定生病；裝恆溫燈後 50%</td></tr></table>
  <p class="note">所有道具目前只能用遊戲內素材取得；原型不含任何付費功能。</p>`;
}
function vDev() {
  return `<h2>DEV 測試面板 <span class="note">只給測試用</span></h2><div class="card devp">
  <div class="lbl">跳時間（離線結算同一套邏輯）</div><button class="btn" data-a="skip" data-k="5">+5 分鐘</button><button class="btn" data-a="skip" data-k="60">+1 小時</button><button class="btn" data-a="skip" data-k="360">+6 小時</button><button class="btn" data-a="skip" data-k="1440">+24 小時</button>
  <button class="btn ${S.speed === 60 ? 'pri' : ''}" data-a="speed">加速 ×60：${S.speed === 60 ? '開' : '關'}</button>
  <div class="lbl">測試蛋（直接放進蛋庫）</div>${RANKS.map(r => `<button class="btn" data-a="testEgg" data-k="${r}">${r} 蛋</button>`).join('')}
  <div class="lbl">其他</div><button class="btn" data-a="rich">+5000 金、+100 鱗屑、各結晶/碎片 +20、核心 +3、道具各 +5</button><button class="btn" data-a="lvup">研究員 +1 級（並略過教學）</button>
  <button class="btn bad" data-a="reset">清除存檔</button>
  <p class="note">快速測一條極限路線：加 S 蛋 → 放進欄位 → 跳 +5 分孵化 → 每階段餵到最低次數（餵食冷卻 15 分，可用 +5 分鐘 ×3）→ 跳到到期。成形體分歧看「幼化體」階段最高傾向；覺醒體分歧看「成形體」階段的條件。</p></div>`;
}
function render() {
  $('#res').innerHTML = res();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab));
  const v = { lab: vLab, dex: vDex, shop: vShop, inv: vInv, tasks: vTasks, prob: vProb, dev: vDev }[UI.tab];
  const ae = document.activeElement; const keepSel = ae && ae.tagName === 'SELECT';
  if (!keepSel) $('#view').innerHTML = v();
  save();
}
/* 進化儀式：8 秒（光繭→剪影→爆閃→名稱與品階），首次登錄 +2 秒，點一下跳過 */
let cereBusy = false;
function playCeremonies() {
  if (cereBusy || !ceremonyQueue.length) return;
  const q = ceremonyQueue.splice(0, 3); ceremonyQueue = []; cereBusy = true; const el = $('#cere');
  const next = () => {
    const e = q.shift(); if (!e) { el.classList.add('hidden'); cereBusy = false; render(); return; }
    el.className = S.calm ? 'calm' : ''; const f = F[e.code]; let timers = [];
    const done = () => { timers.forEach(clearTimeout); el.onclick = null; next(); };
    el.onclick = done;
    const box = (h) => `<div class="stagebox">${h}</div>`;
    if (e.fail) { el.innerHTML = box(img(e.code, e.shiny ? 'shiny' : '', .5)) + `<div class="title">極限進化未成功（機率 ${e.p}%）</div><div class="sub">保持覺醒體，可放生或重新挑戰・點一下繼續</div>`; timers.push(setTimeout(done, 4000)); return; }
    const from = e.from === 'EGG' ? eggImg('normal', .75) : img(e.from, '', .5);
    el.innerHTML = box(`<div class="cocoon"></div>`) + `<div class="title">……</div><div class="sub">點一下跳過</div>`;
    timers.push(setTimeout(() => { el.querySelector('.stagebox').innerHTML = img(e.code, 'sil', .5); el.querySelector('.title').textContent = '？？？'; }, 2500));
    timers.push(setTimeout(() => { el.insertAdjacentHTML('beforeend', '<div class="flash"></div>'); el.querySelector('.stagebox').innerHTML = img(e.code, e.shiny ? 'shiny' : '', .5); }, 5000));
    timers.push(setTimeout(() => { el.querySelector('.title').innerHTML = `${f.zh} <span class="rank ${e.rank}">${e.rank}</span>${e.shiny ? ' ✦異色' : ''}`; el.querySelector('.sub').textContent = `${f.code} ${f.en}・${STAGES[f.st]}${e.first ? '・新登錄！' : ''}`; }, 5800));
    timers.push(setTimeout(done, e.first ? 10000 : 8000));
  };
  el.classList.remove('hidden'); next();
}
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-tab],[data-a]'); if (!t) return;
  if (t.dataset.tab) return A.tab(t.dataset.tab);
  const a = t.dataset.a; if (a === 'env' || (t.tagName === 'INPUT' && a !== 'calm')) return;
  const arg = t.dataset.i !== undefined ? (isNaN(+t.dataset.i) ? t.dataset.i : +t.dataset.i) : undefined;
  if (a === 'feed' || a === 'buyEgg' || a === 'buyItem' || a === 'buyLab' || a === 'buyEnv' || a === 'claim') return a === 'feed' ? A.feed(arg, t.dataset.k) : A[a](t.dataset.k);
  if (a === 'skip') return A.skip(+t.dataset.k);
  if (a === 'testEgg' || a === 'place') return A[a](t.dataset.k);
  if (A[a]) A[a](arg);
});
document.addEventListener('change', (ev) => { const t = ev.target; if (t.dataset.a === 'env') { t.blur(); A.env(+t.dataset.i, t.value); } });
let lastRender = 0;
function tick() {
  const now = Date.now(), dt = now - S.real; S.real = now;
  advanceTo(S.game + dt * S.speed);
  if (ceremonyQueue.length) playCeremonies();
  if (!cereBusy && $('#modal').classList.contains('hidden') && now - lastRender > 950) { lastRender = now; render(); } else save();
}
load(); render(); playCeremonies(); setInterval(tick, 250);
