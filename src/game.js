'use strict';
/* 異種孵化場 原型 v0.3（v0.2 介面＋v0.3 怪獸動畫／測試倍速；遊戲邏輯與數值同 v0.1） — 數值依《設計規格 v2（核心版）》；規格未寫的數值集中在 ASSUME（見「機率說明」頁與 Page 原型節） */
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
    dex: {}, dexRewards: {}, title: '', guide: false, tut: { hatch: false, feed: false, clean: false, evo: false, dex: false, done: false },
    daily: { key: dayKey(now), prog: { feed: 0, release: 0, clean: 0 }, claimed: {} }, log: [], seen: now,
  };
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function dayKey(t) { return Math.floor((t + 8 * HOUR - 6 * HOUR) / DAY); } // 每日 06:00（UTC+8）重置
function save() { S.real = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
/* 讀檔：舊存檔（v0.1）缺的欄位自動補上；壞掉的存檔重新開始，不會卡死 */
function fillSlot(c) {
  const d = { tutorial: false, rank: 'D', stage: -1, stageMin: 0, eggDur: EGG_MIN, poops: 0, poopT: 0, cleanT: 0, fullMin: 0, sick: false, sickStage: false, env: 'heat',
    feeds: 0, food: {}, tend: { F: 0, S: 0, A: 0, M: 0 }, envMin: 0, perchMin: 0, lastFeed: -1e15, shiny: false, final: false, pausedUntil: 0, born: 0, eggType: 'normal' };
  const o = Object.assign(d, c); o.id = o.id || uid();
  if (!RANKS.includes(o.rank)) o.rank = 'D';
  if (o.stage >= 0 && !F[o.code]) return null;
  if (o.stage < 0) { o.code = 'EGG'; if (!(o.eggType === 'tutorial' || EGGS[o.eggType])) o.eggType = 'normal'; }
  o.tend = Object.assign({ F: 0, S: 0, A: 0, M: 0 }, o.tend); if (!ENVS.find(e => e.k === o.env)) o.env = 'heat';
  return o;
}
function migrate(o) {
  const d = newSave();
  if (!o || typeof o !== 'object' || o.v !== 1) return d;
  for (const k in d) if (o[k] === undefined) o[k] = d[k];
  for (const k of ['cry', 'shard', 'items', 'lab', 'tut', 'daily']) o[k] = Object.assign({}, d[k], o[k] && typeof o[k] === 'object' ? o[k] : {});
  o.lab.envs = Object.assign({ heat: true }, o.lab.envs);
  o.daily.prog = Object.assign({ feed: 0, release: 0, clean: 0 }, o.daily.prog); o.daily.claimed = o.daily.claimed || {};
  for (const k of ['coin', 'scale', 'core', 'releases', 'game', 'real']) if (typeof o[k] !== 'number' || !isFinite(o[k])) o[k] = d[k];
  if (typeof o.simT !== 'number') o.simT = o.game;
  if (!Array.isArray(o.slots)) o.slots = [];
  o.slots = [0, 1, 2].map(i => o.slots[i] && typeof o.slots[i] === 'object' ? fillSlot(o.slots[i]) : null);
  o.eggs = Array.isArray(o.eggs) ? o.eggs.filter(e => e && (e.type === 'tutorial' || EGGS[e.type])).map(e => Object.assign({}, e, { id: e.id || uid() })) : [];
  if (!Array.isArray(o.log)) o.log = []; if (!o.dex || typeof o.dex !== 'object') o.dex = {}; if (!o.dexRewards || typeof o.dexRewards !== 'object') o.dexRewards = {};
  return o;
}
let loadNote = '';
function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); const o = JSON.parse(raw); S = migrate(o); if (o && typeof o === 'object' && o.v !== 1) loadNote = '存檔版本不相容，已重新開始'; } catch (e) { S = newSave(); if (raw) loadNote = '舊存檔讀取失敗，已重新開始'; }
  try {
    const off = Math.max(0, Date.now() - S.real);   // 離線：真實時間以 ×1 補上
    S.speed = 1; S.real = Date.now();
    if (off > MIN) { const before = S.log.length; advanceTo(S.game + off, true); const evs = S.log.slice(before); if (evs.length) showDiary(evs, off); }
  } catch (e) { console.warn(e); S = newSave(); loadNote = '舊存檔格式不相容，已重新開始'; }
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
  place(eid, slot) {
    const open = (j) => j < slotsOpen() && !S.slots[j];
    const i = slot !== undefined && open(slot) ? slot : [0, 1, 2].find(open); if (i === undefined) return toast('沒有空的飼養欄');
    const ei = S.eggs.findIndex(e => e.id === eid); if (ei < 0) return; const e = S.eggs.splice(ei, 1)[0];
    const tut = e.type === 'tutorial';
    S.slots[i] = { id: uid(), eggType: e.type, tutorial: tut, rank: e.rank || (tut ? ASSUME.tutRank : rollRank(e.type)), stage: -1, code: 'EGG', stageMin: 0, eggDur: tut ? TUT_EGG_MIN : EGG_MIN,
      poops: 0, poopT: 0, cleanT: 0, fullMin: 0, sick: false, sickStage: false, env: 'heat', feeds: 0, food: {}, tend: { F: 0, S: 0, A: 0, M: 0 }, envMin: 0, perchMin: 0,
      lastFeed: -1e15, shiny: false, final: false, pausedUntil: 0, born: S.game };
    closeModal(); UI.tab = 'lab'; toast(`${tut ? '教學蛋' : EGGS[e.type].zh}放進飼養欄 ${i + 1}，開始孵化！`); render();
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
    if (slotsOpen() > open0) toast(`解鎖飼養欄 ${slotsOpen()}`);
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
  speed() { A.setSpeed(S.speed === 1 ? 60 : 1); },
  setSpeed(k) { k = +k; if (!SPEEDS.includes(k)) k = 1; S.speed = k;
    toast(k === 1 ? '測試加速關閉，回到正常速度' : k === 60 ? '測試加速 ×60：真實 1 秒＝遊戲 1 分鐘' : `測試加速 ×${k}：時間跑 ${k} 倍快`); render(); },
  fill10k() { const N = 10000, up = (v) => Math.max(+v || 0, N);
    S.coin = up(S.coin); S.scale = up(S.scale); S.core = up(S.core); TK.forEach(t => S.cry[t] = up(S.cry[t])); RANKS.forEach(r => S.shard[r] = up(S.shard[r]));
    for (const k of ['potion', 'lamp', 'catalyst', 'stabilizer']) S.items[k] = up(S.items[k]);
    toast('🧪 測試資源：金幣、鱗屑、4 種結晶、各品階碎片、古鱗核心、所有道具 都補到 10000'); render(); },
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
function tutCheck() { const t = S.tut; if (!t.done && t.hatch && t.feed && t.clean && t.evo && t.dex) { t.done = true; toast('教學完成！放生第 1 隻後會開放飼養欄 2'); logEv('教學完成'); } }

/* ---------------- UI（v0.2：手機優先） ---------------- */
const VERSION = 'v0.3';
const SPEEDS = [1, 2, 3, 5, 60];   // 測試加速可選倍速
const DEV_URL = /[?&]dev=1/.test(location.search);
const UI = { tab: DEV_URL ? 'dev' : 'lab', probSlot: null, back: 'shop', more: {} };
const FOOD_ICON = { meat: '🥩', calc: '🦴', bug: '🐛', gel: '🧪', std: '🌾' };
const ENV_ICON = { heat: '🔥', rock: '🪨', track: '🏃', mist: '🌫️', perch: '🪵' };
const STAGE_H = [110, 140, 165, 185, 205];         // 各階段在飼養箱裡的顯示高度（px）
const CAP_ST = { 2: '成形體', 3: '覺醒體', 4: '極限體' };
const $ = (s) => document.querySelector(s);
function sprite(code, cls = '', h = 120) { const key = code === 'EGG' ? 'egg_normal' : code; const [w, hh] = SIZES[key] || [100, 100]; return `<img class="px ${cls}" src="img/${key}.png" width="${Math.round(w * h / hh)}" height="${h}" alt="">`; }
function img(code, cls = '', scale = .5) { const key = code === 'EGG' ? 'egg_normal' : code; const [, h] = SIZES[key] || [100, 100]; return sprite(code, cls, Math.round(h * scale)); }
function eggImg(type, h = 96, cls = '') { const k = 'egg_' + (EGGS[type] || type === 'tutorial' ? type : 'normal'); return `<img class="px ${cls}" src="img/${k}.png" width="${Math.round(SIZES[k][0] * h / SIZES[k][1])}" height="${h}" alt="">`; }
const eggName = (e) => (e.type === 'tutorial' ? '教學蛋' : EGGS[e.type].zh) + (e.rank ? `（${e.rank}）` : '');
function fmtDur(ms) { ms = Math.max(0, ms); const h = Math.floor(ms / HOUR), m = Math.ceil(ms % HOUR / MIN - 1e-9); return h ? `${h} 小時 ${m} 分` : `${Math.max(m, ms > 0 ? 1 : 0)} 分`; }
function clock(t) { const d = new Date(t + 8 * HOUR); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
function toast(m) { const box = $('#toast'); if (!box) return; while (box.children.length >= 3) box.firstChild.remove(); const d = document.createElement('div'); d.textContent = m; box.appendChild(d); setTimeout(() => d.remove(), 2600); }
function modal(html) { $('#modal').innerHTML = `<div class="box">${html}</div>`; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
function showDiary(evs, off) {
  const top = evs.filter(e => e.kind !== 'info').slice(-5); const list = (top.length ? top : evs.slice(-5));
  setTimeout(() => modal(`<h3>📔 你不在的時候</h3><p class="note">離開了 ${fmtDur(off)}，期間發生：</p><ul class="diary">${list.map(e => `<li><span class="note">${clock(e.t)}</span> ${e.text}</li>`).join('')}</ul><button class="btn big pri" data-a="closeModal">知道了</button>`), 50);
}
function canClaim() { return ASSUME.daily.some(d => S.daily.prog[d.k] >= d.n && !S.daily.claimed[d.k]); }

/* 頂部：版本、測試加速、玩法、DEV；資源列 */
function header() {
  setHTML($('#hbtns'), `<button class="chip round" data-a="guide" title="怎麼玩">？</button><button class="chip dev ${UI.tab === 'dev' ? 'on' : ''}" data-a="devTab" title="開發者測試面板">DEV</button>`);
  setHTML($('#testbar'), testBar());
  const eggs = S.eggs.length;
  setHTML($('#res'), `<button class="rchip" data-tab="inv">⭐ 研究員 Lv ${level()}${S.title ? '・' + S.title : ''}</button><button class="rchip" data-tab="inv">🪙 ${S.coin}</button>
    <button class="rchip" data-tab="inv">🔹 鱗屑 ${S.scale}</button><button class="rchip" data-tab="inv">🥚 蛋 ${eggs}</button>`);
  document.querySelectorAll('#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === UI.tab || (b.dataset.tab === 'shop' && UI.tab === 'prob')); });
  $('#tabs [data-tab=tasks]').classList.toggle('dot', canClaim());
  const hh = $('#top').offsetHeight; if (hh && hh !== header.hh) { header.hh = hh; document.documentElement.style.setProperty('--hh', hh + 'px'); }
}
function setHTML(el, h) { if (el && el.__h !== h) { el.__h = h; el.innerHTML = h; } }
/* 測試列：倍速＋一鍵補資源（測試版才有） */
function testBar() {
  return `<div class="tspeed"><span class="tlbl">⏩ 測試加速</span><div class="seg">${SPEEDS.map(k => `<button class="${S.speed === k ? 'on' : ''}" data-a="setSpeed" data-k="${k}" aria-label="倍速 ${k}">×${k}</button>`).join('')}</div></div>
    <button class="tfill" data-a="fill10k" title="金幣、鱗屑、結晶、碎片、核心、所有道具都補到 10000">🧪 測試資源 全補到 10000</button>`;
}

/* 教學：下一步提示 */
function nextStep() {
  const t = S.tut, n = slotsOpen();
  const steps = ['hatch', 'feed', 'clean', 'evo', 'dex'], done = steps.filter(k => t[k]).length;
  if (!t.done) {
    const p = `教學 ${done}/5`;
    if (!t.hatch) return S.slots.some(c => c && c.stage < 0) ? [p, '⏳', '蛋正在孵化，等 1 分鐘就好', '嫌慢可以按右上角「⏩ 測試加速」'] : [p, '🥚', '按下面的「放入蛋」開始孵化', '蛋會自己孵化，不用做別的事'];
    if (!t.feed) return [p, '🍖', '牠肚子餓了！在下面選一種食物餵牠', '不同食物會讓牠往不同方向長大'];
    if (!t.clean) return [p, '🧹', '牠大便了，點畫面裡的 💩 清掉', '放著太久會生病'];
    if (!t.evo) return [p, '✨', '等牠長大，進度條跑滿就會進化', '嫌慢可以按右上角「⏩ 測試加速」'];
    return [p, '📖', '點下方「📖 圖鑑」看看收集到的型態', ''];
  }
  if (S.releases === 0) return ['教學完成', '🕊️', '照顧牠長到最大，再按「放生」換素材', '第一次放生後，會開放第 2 個飼養欄'];
  const empty = [0, 1, 2].some(i => i < n && !S.slots[i]);
  if (empty && !S.eggs.length) return ['', '🛒', '沒有蛋了，到「商店」買一顆新蛋', '普通蛋 100 金；放生可以換金幣'];
  return null;
}
function banner() {
  const s = nextStep(); if (!s) return '';
  return `<div class="banner"><div class="bi">${s[1]}</div><div><div class="bt">${s[2]}</div>${s[3] ? `<div class="bs">${s[3]}</div>` : ''}</div>${s[0] ? `<span class="bp">${s[0]}</span>` : ''}</div>`;
}

function stagePath(c) {
  const cap = RANK_CAP[c.rank];
  return `<div class="path">${['蛋', ...STAGES].map((s, j) => { const st = j - 1; const cls = st === c.stage ? 'cur' : st < c.stage ? 'done' : st > cap ? 'cap' : ''; return `<span class="${cls}">${st > cap ? '🔒' : ''}${s}</span>`; }).join('<i>›</i>')}</div>`;
}
/* 給動畫用的心情（只影響表演） */
function petMood(c, cool, paused) {
  if (paused) return 'sleep'; if (c.sick) return 'sick'; if (c.poops) return 'dirty';
  if (!c.final && !cool && c.feeds < minFeed(c)) return 'hungry'; if (!c.final && rating(c) === 0 && c.feeds) return 'sad'; return 'ok';
}
function statusHint(c, cool) {
  if (c.sick) return ['bad', `🤒 生病了！按「💊 治療」吃藥${S.items.potion ? '' : '（沒有藥：商店 30 金）'}`];
  if (c.poops >= 2) return ['warn', '💩 便便快滿了！滿 3 坨超過 2 小時會生病'];
  if (c.failed) return ['warn', '極限進化沒成功。可以放生，或花素材重新挑戰'];
  if (c.final) return ['good', c.stage === 4 ? '🏆 已經是最終型態了！可以放生換大量素材' : `🎉 已長到最大（品階 ${c.rank} 最多到${CAP_ST[RANK_CAP[c.rank]]}）。放生牠換素材吧`];
  if (c.feeds < minFeed(c)) return ['', cool ? '😋 剛吃飽，等一下再餵' : `🍖 這個階段要餵 ${minFeed(c)} 次，照顧評價才會「良好」`];
  if (c.stage === 1) return ['good', '😊 照顧得很好！成長方向最高的那項，決定牠下一階段變成什麼'];
  return ['good', '😊 照顧得很好！等進度條跑滿就會進化'];
}
function slotCard(c, i) {
  const head = (t, r = '') => `<div class="slothead"><b>飼養欄 ${i + 1}</b><span>${t}</span>${r}</div>`;
  if (!c) {
    if (!S.eggs.length) return `<div class="card slot">${head('空的')}<div class="tank empty"><div class="ghost">🥚</div></div>
      <button class="btn big pri" data-tab="shop">🛒 去商店買蛋</button><div class="hint">蛋都用完了。普通蛋 100 金，放生可以換金幣</div></div>`;
    return `<div class="card slot">${head('空的')}<div class="tank empty" data-a="pickEgg" data-i="${i}"><div class="ghost">${eggImg(S.eggs[0].type, 88, 'ghostegg')}</div></div>
      <button class="btn big pri" data-a="pickEgg" data-i="${i}">🥚 放入蛋</button><div class="hint">把蛋放進來，${S.eggs[0].type === 'tutorial' ? '1 分鐘' : '5 分鐘'}就會孵化（你有 ${S.eggs.length} 顆蛋）</div></div>`;
  }
  const paused = c.pausedUntil > S.game;
  if (c.stage < 0) {
    const left = (c.eggDur - c.stageMin) * MIN;
    return `<div class="card slot">${head('孵化中')}<div class="tank"><div class="spr wob">${eggImg(c.eggType, 120)}</div><div class="floor"></div></div>
      <div class="name">${c.tutorial ? '教學蛋' : EGGS[c.eggType].zh}</div>
      <div class="prog"><div class="pl"><span>孵化進度</span><b>還要 ${fmtDur(left)}</b></div><div class="bar"><i style="width:${100 * c.stageMin / c.eggDur}%"></i></div></div>
      <div class="hint">什麼都不用做，等牠孵出來就好</div></div>`;
  }
  const f = F[c.code], tt = topTend(c), total = TK.reduce((a, k) => a + c.tend[k], 0);
  const aura = total ? T[tt].c + '66' : 'rgba(111,191,115,.25)';
  const dur = stageDur(c), r = rating(c);
  const cool = Math.max(0, c.lastFeed + ASSUME.feedCooldownMin * MIN - S.game);
  const poops = Array.from({ length: c.poops }, () => `<button class="poop" data-a="clean" data-i="${i}" aria-label="清便便">💩</button>`).join('');
  const isUltStage = c.stage === 3 && (c.rank === 'S' || c.rank === 'SS');
  const canAct = !c.final || c.failed;
  const [hk, ht] = statusHint(c, cool);
  let prog;
  if (c.final && !c.failed) prog = '';
  else prog = `<div class="prog"><div class="pl"><span>${c.failed ? '極限進化失敗' : c.trial ? '重新挑戰中' : `成長到下一階段`}</span><b>${c.failed ? '保持覺醒體' : '還要 ' + fmtDur((dur - c.stageMin) * MIN)}${paused ? '（安眠燈暫停中）' : ''}</b></div>
    <div class="bar"><i style="width:${c.failed ? 100 : 100 * c.stageMin / dur}%"></i></div>
    <div class="pl sm"><span>這階段餵了 ${c.feeds}/${minFeed(c)} 次</span><span>照顧評價 <b class="${['badc', 'warnc', 'good'][r]}">${RATE_ZH[r]}</b></span></div></div>`;
  const ultLine = isUltStage ? `<div class="ultline">🎲 極限進化機率 <b>${ultChance(c)}%</b> <span class="note">${c.failed ? '' : '（到期時判定一次）'}</span> <a data-a="probFor" data-i="${i}">看明細</a>${c.failed ? `<button class="btn" data-a="retry" data-i="${i}">🔁 重新挑戰（鱗屑 10＋${T[f.t].zh}結晶 3）</button>` : ''}</div>` : '';
  const feedBlock = canAct ? `<div class="sec"><div class="sect">🍖 餵食 <span class="note">${cool ? `剛吃飽，${Math.ceil(cool / MIN)} 分後可再餵` : '選一種食物'}</span></div>
    <div class="foods">${FOODS.map(x => `<button class="btn food" data-a="feed" data-i="${i}" data-k="${x.k}" ${cool ? 'disabled' : ''} style="${x.t ? '--tc:' + T[x.t].c : ''}"><span class="fi">${FOOD_ICON[x.k]}</span><span class="fn">${x.zh}</span><span class="fd">${x.t ? '＋' + T[x.t].zh + '・10 金' : '免費・不變方向'}</span></button>`).join('')}</div></div>` : '';
  const envs = ENVS.filter(e => S.lab.envs[e.k]);
  const envBlock = canAct ? `<div class="sec"><div class="sect">🏠 住處 <span class="note">每住 1 小時，該方向 +1</span></div><div class="envs">${envs.map(e => `<button class="btn env ${c.env === e.k ? 'on' : ''}" data-a="env" data-i="${i}" data-k="${e.k}">${ENV_ICON[e.k]} ${e.zh}<small>＋${T[e.t].zh}</small></button>`).join('')}${envs.length < ENVS.length ? `<button class="btn env ghostbtn" data-tab="shop">＋ 更多住處<small>到商店解鎖</small></button>` : ''}</div></div>` : '';
  const tend = canAct ? `<div class="sec"><div class="sect">🧭 成長方向 <span class="note">★ 越多，越往那個方向長</span></div><div class="tend">${TK.map(k => `<div style="--tc:${T[k].c}" class="${total && k === tt ? 'top' : ''}">${T[k].zh}<b>${'★'.repeat(stars(c.tend[k])) || '－'}</b></div>`).join('')}</div></div>` : '';
  const care = `<div class="care">
    <button class="btn act" data-a="clean" data-i="${i}" ${c.poops ? '' : 'disabled'}>🧹 清便便${c.poops ? ` ×${c.poops}` : ''}</button>
    <button class="btn act ${c.sick ? 'alert' : ''}" data-a="potion" data-i="${i}" ${c.sick ? '' : 'disabled'}>💊 治療<small>（藥 ${S.items.potion}）</small></button>
    <button class="btn act" data-a="moreToggle" data-i="${i}">🎒 道具 ${UI.more[i] ? '▴' : '▾'}</button></div>
    ${UI.more[i] ? `<div class="more">
      ${canAct ? `<button class="btn" data-a="lamp" data-i="${i}">💡 ${paused ? '關掉安眠燈' : '安眠燈'}<small>暫停成長 6 小時・持有 ${S.items.lamp}</small></button>
      <button class="btn" data-a="catalyst" data-i="${i}">🧪 變異觸媒<small>下次進化異色機率變 6%・持有 ${S.items.catalyst}</small></button>
      ${isUltStage ? `<button class="btn" data-a="stab" data-i="${i}">⚗️ 進化穩定劑<small>極限進化機率 +10%・持有 ${S.items.stabilizer}</small></button>` : ''}` : '<div class="note">牠已經長到最大，成長道具用不到了。</div>'}
      <div class="note">道具可以在「商店」換。</div></div>` : ''}`;
  const rel = c.final ? `<button class="btn big pri" data-a="release" data-i="${i}">🕊️ 放生，換素材</button>` : `<button class="btn rel" data-a="release" data-i="${i}">🕊️ 放生（現在放生也可以換素材）</button>`;
  return `<div class="card slot">${head(STAGES[c.stage], `<button class="rank ${c.rank}" data-a="rankHelp" title="品階是什麼？">品階 ${c.rank}</button>`)}
   <div class="tank" style="--aura:${aura}"><span class="tagr">${c.sick ? '<b class="pill bad">🤒 生病</b>' : ''}${paused ? '<b class="pill">💤 暫停中</b>' : ''}${c.catalystOn ? '<b class="pill">🧪 觸媒</b>' : ''}${c.stabilizerOn ? '<b class="pill">⚗️ 穩定劑</b>' : ''}</span>
     <div class="floor"></div><div class="pet ${c.shiny ? 'isshiny' : ''}" data-keep="${c.id}" data-slot="${i}" data-code="${c.code}" data-stage="${c.stage}" data-h="${STAGE_H[c.stage]}" data-mood="${petMood(c, cool, paused)}"></div><div class="poops">${poops}</div></div>
   <div class="name">${f.zh}${c.shiny ? ' <span class="good">✦異色</span>' : ''} <small>${f.code}・個性${c.personality}</small></div>
   ${stagePath(c)}
   ${prog}
   <div class="hint ${hk}">${ht}</div>
   ${ultLine}
   ${c.final ? rel : ''}
   ${feedBlock}${care}${envBlock}${tend}
   ${c.final ? '' : rel}</div>`;
}
function vLab() {
  const n = slotsOpen();
  const cards = [0, 1, 2].map(i => i < n ? slotCard(S.slots[i], i) : '').join('');
  const locked = [1, 2].filter(i => i >= n).map(i => `<div class="lockrow">🔒 飼養欄 ${i + 1}<span>${i === 1 ? (S.tut.done ? '放生第 1 隻後開放' : '完成教學並放生第 1 隻後開放') : '研究員 Lv 5 開放（放生 28 隻）'}</span></div>`).join('');
  return `${banner()}<div class="slots">${cards}</div>${locked}`;
}
function vDex() {
  const seen = FORMS.filter(f => S.dex[f.code]?.seen).length, sh = FORMS.filter(f => S.dex[f.code]?.shiny).length;
  const R = S.dexRewards;
  const rw = [['novice', '登錄 5 種', '優良蛋 ×1'], ...ROUTES.map(([n, a]) => ['route_' + n, `完成「${n}」路線`, `${T[F[a].t].zh}結晶 ×10`]), ['shiny10', '異色 10 種', '變異觸媒 ×3'], ['full', '登錄全部 22 種', '傳說蛋＋稱號']];
  return `<h2>📖 圖鑑</h2><div class="card"><div class="pl"><span>已收集 <b>${seen}</b> / 22 種</span><span class="note">異色 ${sh}/22</span></div><div class="bar"><i style="width:${seen / 22 * 100}%"></i></div>
    <div class="hint">孵化、進化出新的型態，就會自動登錄。黑影＝還沒遇到過。點一下看介紹。</div></div>
  ${STAGES.map((st, si) => { const fs = FORMS.filter(f => f.st === si); return `<h3>${st} <small class="note">${fs.filter(f => S.dex[f.code]?.seen).length}/${fs.length}</small></h3><div class="dex">${fs.map(f => {
    const d = S.dex[f.code];
    return d?.seen ? `<button class="dexc" data-a="dexInfo" data-k="${f.code}"><div class="pic">${sprite(f.code, d.shiny ? '' : '', 72)}</div><div class="n">${f.zh}</div><div class="c">${f.t ? T[f.t].zh : '基本型'}・最高 <span class="rank ${d.best}">${d.best}</span>${d.shiny ? ' ✦' : ''}</div></button>`
      : `<button class="dexc un" data-a="dexInfo" data-k="${f.code}"><div class="pic">${sprite(f.code, 'sil', 72)}</div><div class="n">？？？</div><div class="c">${f.t ? T[f.t].zh : '基本型'}</div></button>`;
  }).join('')}</div>`; }).join('')}
  <h3>🎁 收集獎勵</h3><div class="card"><ul class="rw">${rw.map(([k, a, b]) => `<li class="${R[k] ? 'good' : ''}">${R[k] ? '✔' : '○'} ${a} → ${b}</li>`).join('')}<li class="note">每個階段全部登錄 → 實驗室裝飾 ×1</li></ul></div>`;
}
function vShop() {
  const lv = level();
  const lvNeed = (n) => `研究員 Lv ${n}（放生 ${LV_REL[n]} 隻）`;
  return `<h2>🛒 商店</h2><button class="btn wide" data-a="probOpen">📊 機率說明（蛋的品階、進化機率都公開在這裡）</button>
   <h3>🥚 蛋 <small class="note">品階越高，能進化得越遠</small></h3><div class="grid2">${Object.entries(EGGS).map(([k, e]) => `<div class="item"><div class="ipic">${eggImg(k, 64)}</div><div class="ib"><b>${e.zh}</b><div class="price">${fmtCost(e.price)}</div><div class="note">品階機率：${e.odds.map(([r, p]) => r + ' ' + p + '%').join('・')}</div>
     <button class="btn pri" data-a="buyEgg" data-k="${k}" ${lv < e.lv ? 'disabled' : ''}>${lv < e.lv ? '🔒 ' + lvNeed(e.lv) : '購買'}</button></div></div>`).join('')}</div>
   <h3>🎒 道具</h3><div class="grid2">${[['potion', '💊 治療藥', '治好生病'], ['lamp', '💡 安眠燈', '暫停成長 6 小時（用最多的那色結晶 ×2）'], ['catalyst', '🧪 變異觸媒', '下次進化異色機率 6%，斑蝕蜥會變裂相蜥'], ['stabilizer', '⚗️ 進化穩定劑', '極限進化機率 +10%（每次限 1 個）']].map(([k, z, d]) =>
     `<div class="item"><div class="ib"><b>${z}</b> <span class="note">持有 ${S.items[k]}</span><div class="note">${d}</div><div class="price">${fmtCost(ASSUME[k])}</div><button class="btn" data-a="buyItem" data-k="${k}">兌換</button></div></div>`).join('')}</div>
   <h3>🔧 實驗室升級</h3><div class="grid2">${[['autoClean', '🤖 自動清潔機', '每 3 小時自動清便便'], ['thermo', '🌡️ 恆溫燈', '生病機率減半'], ['incubator', '🥚 孵化器', '每 12 小時送 1 顆普通蛋']].map(([k, z, d]) =>
     `<div class="item"><div class="ib"><b>${z}</b><div class="note">${d}</div><div class="price">${fmtCost(ASSUME[k])}</div><button class="btn" data-a="buyLab" data-k="${k}" ${S.lab[k] ? 'disabled' : ''}>${S.lab[k] ? '✔ 已安裝' : '安裝'}</button></div></div>`).join('')}
     ${ENVS.filter(e => e.unlock).map(e => `<div class="item"><div class="ib"><b>${ENV_ICON[e.k]} 住處：${e.zh}</b><div class="note">每住 1 小時 ${T[e.t].zh} +1${e.k === 'perch' ? '；住滿 2 小時，迅鱗蜥會變蒼翼蜥' : ''}</div><div class="price">${e.unlock[0]} 金＋鱗屑 ${e.unlock[1]}</div>
     <button class="btn" data-a="buyEnv" data-k="${e.k}" ${S.lab.envs[e.k] ? 'disabled' : ''}>${S.lab.envs[e.k] ? '✔ 已解鎖' : '解鎖'}</button></div></div>`).join('')}</div>`;
}
function vInv() {
  const lv = level(), nextN = LV_REL[lv + 1];
  const open = [0, 1, 2].filter(i => i < slotsOpen() && !S.slots[i]);
  return `<h2>🎒 背包</h2>
  <div class="card"><div class="pl"><span>⭐ 研究員 Lv ${lv}</span><span class="note">已放生 ${S.releases} 隻</span></div>${nextN != null ? `<div class="bar"><i style="width:${Math.min(100, (S.releases - LV_REL[lv]) / (nextN - LV_REL[lv]) * 100)}%"></i></div><div class="hint">再放生 ${nextN - S.releases} 隻升到 Lv ${lv + 1}（等級越高，能買更好的蛋）</div>` : '<div class="hint">已達最高等級</div>'}</div>
  <h3>🥚 蛋（${S.eggs.length}）</h3>${S.eggs.length ? `<div class="egglist">${S.eggs.map(e => `<div class="eggrow">${eggImg(e.type, 44)}<b>${eggName(e)}</b>${open.length ? `<button class="btn pri" data-a="place" data-k="${e.id}">放入飼養欄</button>` : '<span class="note">飼養欄滿了</span>'}</div>`).join('')}</div>` : '<div class="card hint">沒有蛋。到「商店」買蛋，或等任務、圖鑑獎勵。</div>'}
  <h3>💰 素材</h3><div class="mats">
   <div class="mat"><span>🪙</span><b>${S.coin}</b><em>金幣</em><small>買蛋、食物、藥</small></div>
   <div class="mat"><span>🔹</span><b>${S.scale}</b><em>鱗屑</em><small>好蛋、升級要用</small></div>
   ${TK.map(t => `<div class="mat" style="--tc:${T[t].c}"><span>💎</span><b>${S.cry[t]}</b><em>${T[t].zh}結晶</em><small>換安眠燈、重新挑戰</small></div>`).join('')}
   <div class="mat"><span>🔶</span><b>${S.core}</b><em>古鱗核心</em><small>傳說蛋、孵化器</small></div>
   <div class="mat wide"><span>🧩</span><b>${RANKS.map(r => r + ' ' + S.shard[r]).join('・')}</b><em>品階碎片</em><small>稀有蛋（A 碎片 5）、傳說蛋（S 碎片 10）</small></div></div>
  <h3>🧰 道具</h3><div class="mats"><div class="mat"><span>💊</span><b>${S.items.potion}</b><em>治療藥</em></div><div class="mat"><span>💡</span><b>${S.items.lamp}</b><em>安眠燈</em></div><div class="mat"><span>🧪</span><b>${S.items.catalyst}</b><em>變異觸媒</em></div><div class="mat"><span>⚗️</span><b>${S.items.stabilizer}</b><em>穩定劑</em></div>${S.decor ? `<div class="mat"><span>🪴</span><b>${S.decor}</b><em>實驗室裝飾</em></div>` : ''}</div>
  <h3>🕊️ 放生能換什麼？</h3><div class="hint">長得越大再放生，換到越多。品階越高、異色（×2）也越多。</div>
  <div class="tw"><table><tr><th>放生時</th><th>🪙 金幣</th><th>🔹 鱗屑</th><th>其他</th></tr>
  ${RELEASE.map((r, i) => `<tr><td>${STAGES[i]}</td><td>${r.coin}</td><td>${r.scale}</td><td>${[r.cry ? '結晶 ' + r.cry : '', r.shard ? '碎片 ' + r.shard : '', r.core === 1 ? '核心 1' : r.core ? '核心 10%（S 以上）' : ''].filter(Boolean).join('、') || '－'}</td></tr>`).join('')}</table></div>
  <p class="note">金幣再乘品階：D ×1、C ×1.2、B ×1.5、A ×2、S ×3、SS ×4.5。研究員等級門檻（放生數）：${LV_REL.slice(2).map((n, i) => `Lv${i + 2}=${n}`).join('、')}</p>`;
}
function vTasks() {
  return `<h2>📋 每日任務 <small class="note">每天早上 6 點重置</small></h2>
  ${ASSUME.daily.map(d => { const p = Math.min(S.daily.prog[d.k], d.n), ok = p >= d.n, got = S.daily.claimed[d.k]; return `<div class="card task"><div class="tb"><b>${d.zh}</b><div class="bar"><i style="width:${p / d.n * 100}%"></i></div><div class="note">${p}/${d.n}・獎勵 🪙100＋🔹3</div></div>
    <button class="btn ${ok && !got ? 'pri' : ''}" data-a="claim" data-k="${d.k}" ${!ok || got ? 'disabled' : ''}>${got ? '✔ 已領' : ok ? '領取' : '進行中'}</button></div>`; }).join('')}
  <h3>📔 實驗日記</h3><div class="card"><ul class="diary">${S.log.slice(-40).reverse().map(e => `<li><span class="note">${clock(e.t)}</span> ${e.text}</li>`).join('') || '<li class="note">還沒有紀錄。孵出第一隻就會開始記錄。</li>'}</ul></div>
  <h3>⚙️ 設定</h3><div class="card"><label class="chk"><input type="checkbox" data-a="calm" ${S.calm ? 'checked' : ''}> 進化動畫減弱閃光</label>
  <button class="btn wide" data-a="guide">❓ 再看一次玩法說明</button></div>`;
}
function vProb() {
  const c = UI.probSlot != null ? S.slots[UI.probSlot] : null;
  let cur = '';
  if (c && c.stage === 3) {
    const r = rating(c), base = c.rank === 'SS' ? 50 : c.rank === 'S' ? 30 : 0;
    cur = `<div class="card"><b>${nm(c)}（${c.rank}）目前</b><div class="kv"><span>基礎機率</span><span>${base}%</span><span>覺醒體階段照顧評價：${RATE_ZH[r]}</span><span>${r === 2 ? '+15%' : r === 1 ? '+0%' : '不判定（0%）'}</span>
      <span>進化穩定劑</span><span>${c.stabilizerOn ? '+10%' : '未使用'}</span><span><b>本次極限進化機率</b></span><span><b>${ultChance(c)}%</b></span></div><p class="note">照顧評價在到期時結算；目前餵食 ${c.feeds}/${minFeed(c)}${c.sickStage ? '，本階段生病過（評價降一級）' : ''}。</p></div>`;
  }
  return `<button class="btn back" data-a="probBack">← 返回</button><h2>📊 機率說明（遊戲內公開）</h2>${cur}
  <h3>品階決定能長多大</h3><div class="tw"><table><tr><th>品階</th><th>最多進化到</th></tr><tr><td>D・C</td><td>成形體</td></tr><tr><td>B・A</td><td>覺醒體</td></tr><tr><td>S・SS</td><td>極限體（要通過極限進化判定）</td></tr></table></div>
  <h3>極限進化機率（覺醒體 24 小時到期時判定一次；只有 S・SS 會判定）</h3>
  <div class="tw"><table><tr><th>項目</th><th>S</th><th>SS</th></tr><tr><td>基礎機率</td><td>30%</td><td>50%</td></tr><tr><td>覺醒體階段照顧評價：良好</td><td>+15%</td><td>+15%</td></tr>
  <tr><td>覺醒體階段照顧評價：普通</td><td>+0%</td><td>+0%</td></tr><tr><td>覺醒體階段照顧評價：差</td><td>不判定（0%）</td><td>不判定（0%）</td></tr>
  <tr><td>進化穩定劑（每次判定限用 1 個）</td><td>+10%</td><td>+10%</td></tr><tr><td>最高機率</td><td>55%</td><td>75%</td></tr></table></div>
  <p class="note">失敗：保持覺醒體並登錄圖鑑，可直接放生，或花鱗屑 10＋主傾向結晶 3 重新挑戰（12 小時嘗試期，照顧評價重算，次數不限）。</p>
  <h3>蛋的品階機率</h3><div class="tw"><table><tr><th>蛋</th><th>品階機率</th></tr>${Object.values(EGGS).map(e => `<tr><td>${e.zh}</td><td>${e.odds.map(([r, p]) => r + ' ' + p + '%').join('・')}</td></tr>`).join('')}<tr><td>教學蛋</td><td>固定 C</td></tr></table></div>
  <h3>其他機率</h3><div class="tw"><table><tr><td>異色</td><td>每次進化 2%；使用變異觸媒 6%</td></tr><tr><td>古鱗核心（放生覺醒體）</td><td>S 以上 10%</td></tr><tr><td>生病（恆溫燈）</td><td>便便 ≥ 3 坨超過 2 小時必定生病；裝恆溫燈後 50%</td></tr></table></div>
  <p class="note">所有道具目前只能用遊戲內素材取得；原型不含任何付費功能。</p>`;
}
function vDev() {
  return `<button class="btn back" data-a="devClose">← 回孵化場</button><h2>🛠 DEV 測試面板 <small class="note">只給測試用・網址加 ?dev=1 會直接打開</small></h2><div class="card devp">
  <div class="note">遊戲時間 ${clock(S.game)}（UTC+8）・速度 ×${S.speed}</div>
  <div class="lbl">跳時間（離線結算同一套邏輯）</div><button class="btn" data-a="skip" data-k="5">+5 分鐘</button><button class="btn" data-a="skip" data-k="60">+1 小時</button><button class="btn" data-a="skip" data-k="360">+6 小時</button><button class="btn" data-a="skip" data-k="1440">+24 小時</button>
  <div class="lbl">⏩ 測試加速（目前 ×${S.speed}）</div><div class="seg big">${SPEEDS.map(k => `<button class="${S.speed === k ? 'on' : ''}" data-a="setSpeed" data-k="${k}">×${k}</button>`).join('')}</div>
  <div class="lbl">🧪 測試資源</div><button class="btn pri" data-a="fill10k">🧪 測試資源 全部補到 10000（金幣・鱗屑・結晶・碎片・核心・道具）</button>
  <div class="lbl">測試蛋（直接放進蛋庫）</div>${RANKS.map(r => `<button class="btn" data-a="testEgg" data-k="${r}">${r} 蛋</button>`).join('')}
  <div class="lbl">其他</div><button class="btn" data-a="rich">+5000 金、+100 鱗屑、各結晶/碎片 +20、核心 +3、道具各 +5</button><button class="btn" data-a="lvup">研究員 +1 級（並略過教學）</button>
  <button class="btn bad" data-a="reset">清除存檔</button>
  <p class="note">快速測一條極限路線：加 S 蛋 → 放進欄位 → 跳 +5 分孵化 → 每階段餵到最低次數（餵食冷卻 15 分，可用 +5 分鐘 ×3）→ 跳到到期。成形體分歧看「幼化體」階段最高傾向；覺醒體分歧看「成形體」階段的條件。</p></div>`;
}
/* 第一次玩：3 步驟說明 */
function guideHtml() {
  return `<div class="gbox"><div class="gt">歡迎來到 異種孵化場！</div><div class="gs">只要 3 步：</div>
   <div class="gstep"><div class="gp">${eggImg('tutorial', 56)}</div><div><b>1. 孵蛋</b><p>把蛋放進飼養欄，等幾分鐘就會孵出小怪獸。</p></div></div>
   <div class="gstep"><div class="gp">${sprite('R-001', '', 40)}<i>›</i>${sprite('R-003', '', 56)}</div><div><b>2. 照顧長大</b><p>餵食、清便便。吃不同的食物，會進化成不同的樣子。</p></div></div>
   <div class="gstep"><div class="gp big">📖🕊️</div><div><b>3. 收集・放生</b><p>新型態會登錄到圖鑑。長大後放生，換素材買新蛋，再養下一隻！</p></div></div>
   <button class="btn big pri" data-a="guideClose">開始玩！</button><div class="note c">之後可以按右上角「？」再看一次</div></div>`;
}
function showGuide() { const g = $('#guide'); g.innerHTML = guideHtml(); g.classList.remove('hidden'); }

Object.assign(A, {
  pickEgg(i) {
    if (!S.eggs.length) { UI.tab = 'shop'; return render(); }
    if (S.eggs.length === 1) return A.place(S.eggs[0].id, i);
    modal(`<h3>選一顆蛋放進飼養欄 ${i + 1}</h3><div class="egglist">${S.eggs.map(e => `<div class="eggrow">${eggImg(e.type, 44)}<div><b>${eggName(e)}</b><div class="note">${e.type === 'tutorial' ? '品階固定 C' : '品階機率 ' + EGGS[e.type].odds.map(([r, p]) => r + ' ' + p + '%').join('・')}</div></div><button class="btn pri" data-a="place" data-k="${e.id}" data-i="${i}">放入</button></div>`).join('')}</div><button class="btn wide" data-a="closeModal">取消</button>`);
  },
  moreToggle(i) { UI.more[i] = !UI.more[i]; render(); },
  rankHelp() { modal(`<h3>品階是什麼？</h3><p>每隻怪獸孵化時會決定「品階」，品階決定牠<b>最多能長到哪一階</b>：</p><ul><li><span class="rank D">D</span> <span class="rank C">C</span> → 最多到 成形體</li><li><span class="rank B">B</span> <span class="rank A">A</span> → 最多到 覺醒體</li><li><span class="rank S">S</span> <span class="rank SS">SS</span> → 有機會到 極限體</li></ul><p class="note">品階越高，放生時換到的金幣也越多。好的蛋比較容易出高品階。</p><button class="btn big pri" data-a="closeModal">知道了</button>`); },
  dexInfo(code) {
    const f = F[code], d = S.dex[code];
    if (!d?.seen) return modal(`<div class="c">${sprite(code, 'sil', 140)}</div><h3 class="c">？？？</h3><p class="note c">${STAGES[f.st]}${f.t ? '・' + T[f.t].zh + '系' : ''}。還沒遇到過，繼續養養看！</p><button class="btn big" data-a="closeModal">關閉</button>`);
    modal(`<div class="c">${sprite(code, '', 160)}</div><h3 class="c">${f.zh} <small class="note">${f.code} ${f.en}</small></h3><p class="c">${STAGES[f.st]}${f.t ? '・' + T[f.t].zh + '系' : ''}・最高品階 <span class="rank ${d.best}">${d.best}</span>${d.shiny ? '・✦見過異色' : ''}</p><button class="btn big" data-a="closeModal">關閉</button>`);
  },
  probOpen() { UI.back = UI.tab === 'prob' ? UI.back : UI.tab; UI.probSlot = null; UI.tab = 'prob'; render(); },
  probBack() { UI.tab = UI.back || 'shop'; render(); },
  devTab() { UI.tab = UI.tab === 'dev' ? 'lab' : 'dev'; render(); },
  devClose() { UI.tab = 'lab'; render(); },
  guide() { showGuide(); },
  guideClose() { S.guide = true; $('#guide').classList.add('hidden'); save(); },
});
A.probFor = (i) => { UI.back = 'lab'; UI.tab = 'prob'; UI.probSlot = i; render(); };
A.release = (i) => {
  const c = S.slots[i]; if (!c || c.stage < 0) return;
  const rw = releaseReward(c);
  modal(`<div class="c">${sprite(c.code, c.shiny ? 'shiny' : '', 120)}</div><h3 class="c">要放生 ${nm(c)} 嗎？</h3><p class="note c">牠會回到野外，圖鑑紀錄會保留。飼養欄會空出來，可以再孵新蛋。</p>
    <div class="card"><b>你會得到：</b><div class="good">${rw.text}</div></div>${c.final ? '' : '<p class="warn c">牠還在長大中，等長大再放生可以換更多。</p>'}
    <button class="btn big pri" data-a="releaseOk" data-i="${i}">🕊️ 確定放生</button><button class="btn wide" data-a="closeModal">先不要</button>`);
};

function render() {
  header();
  const v = { lab: vLab, dex: vDex, shop: vShop, inv: vInv, tasks: vTasks, prob: vProb, dev: vDev }[UI.tab] || vLab;
  const html = v();
  if (html !== lastHtml) { lastHtml = html; const tpl = document.createElement('main'); tpl.innerHTML = html; morph($('#view'), tpl); }
  save();
}
/* 只更新有變的節點：圖片與動畫不會每秒重來 */
let lastHtml = '';
function morph(a, b) {
  const an = a.childNodes, bn = b.childNodes;
  for (let i = 0; i < bn.length; i++) {
    const x = an[i], y = bn[i];
    if (!x) { a.appendChild(y.cloneNode(true)); continue; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y.cloneNode(true), x); continue; }
    if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    if (x.nodeType !== 1) continue;
    if (x.hasAttribute('data-keep')) {   // 動畫中的怪獸：只同步 data-*，不動內部
      if (x.getAttribute('data-keep') !== y.getAttribute('data-keep')) { a.replaceChild(y.cloneNode(true), x); continue; }
      for (const at of [...y.attributes]) if (at.name.startsWith('data-') && x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
      if (x.className !== y.className) x.className = y.className; continue;
    }
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    if (x.tagName === 'INPUT') { x.checked = y.hasAttribute('checked'); x.disabled = y.hasAttribute('disabled'); }
    if (x.tagName === 'BUTTON') x.disabled = y.hasAttribute('disabled');
    morph(x, y);
  }
  while (an.length > bn.length) a.removeChild(a.lastChild);
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
    const skip = '<div class="skip">點一下畫面跳過</div>';
    if (e.fail) { el.innerHTML = box(sprite(e.code, e.shiny ? 'shiny' : '', 200)) + `<div class="title">極限進化沒成功（機率 ${e.p}%）</div><div class="sub">保持覺醒體，可以放生或重新挑戰</div><div class="skip">點一下繼續</div>`; timers.push(setTimeout(done, 4000)); return; }
    const isHatch = e.from === 'EGG';
    el.innerHTML = box(`<div class="cocoon"></div>`) + `<div class="title">${isHatch ? '蛋要孵化了……' : '牠要進化了……'}</div><div class="sub"></div>${skip}`;
    timers.push(setTimeout(() => { el.querySelector('.stagebox').innerHTML = sprite(e.code, 'sil', 200); el.querySelector('.title').textContent = '？？？'; }, 2500));
    timers.push(setTimeout(() => { el.insertAdjacentHTML('beforeend', '<div class="flash"></div>'); el.querySelector('.stagebox').innerHTML = sprite(e.code, e.shiny ? 'shiny' : '', 200); }, 5000));
    timers.push(setTimeout(() => { el.querySelector('.title').innerHTML = `${isHatch ? '孵化了！' : '進化成'} ${f.zh} <span class="rank ${e.rank}">${e.rank}</span>${e.shiny ? ' ✦異色' : ''}`; el.querySelector('.sub').textContent = `${STAGES[f.st]}${e.first ? '・✨ 新登錄到圖鑑！' : ''}`; }, 5800));
    timers.push(setTimeout(done, e.first ? 10000 : 8000));
  };
  el.classList.remove('hidden'); next();
}
document.addEventListener('click', (ev) => {
  if (ev.target.id === 'modal') return closeModal();
  const t = ev.target.closest('[data-tab],[data-a]'); if (!t || t.disabled) return;
  if (t.dataset.tab) { closeModal(); window.scrollTo(0, 0); return A.tab(t.dataset.tab); }
  const a = t.dataset.a; if (!A[a]) return;
  if (t.tagName === 'INPUT' && a !== 'calm') return;
  const i = t.dataset.i !== undefined ? +t.dataset.i : undefined, k = t.dataset.k;
  if (a === 'skip') return A.skip(+k);
  if (['buyEgg', 'buyItem', 'buyLab', 'buyEnv', 'claim', 'testEgg', 'dexInfo', 'setSpeed'].includes(a)) return A[a](k);
  if (a === 'place') return A.place(k, i);
  if (a === 'feed' || a === 'env') return A[a](i, k);
  A[a](i);
});
let lastRender = 0;
function tick() {
  const now = Date.now(), dt = now - S.real; S.real = now;
  if (!(cereBusy && S.speed > 1)) advanceTo(S.game + dt * S.speed);   // 測試加速時，看進化動畫的期間先暫停（正常速度與 v0.1 相同）
  if (ceremonyQueue.length) playCeremonies();
  if (!cereBusy && $('#modal').classList.contains('hidden') && now - lastRender > 950) { lastRender = now; render(); } else save();
}
load(); $('#ver').textContent = VERSION; render(); if (!S.guide && !DEV_URL) showGuide(); else playCeremonies(); if (loadNote) toast(loadNote);
setInterval(tick, 250);
