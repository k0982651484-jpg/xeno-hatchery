'use strict';
/* 異種孵化場 原型 v0.4（v0.4：介面精簡＋蛋的個體差異＋同時在線人數；核心規則與數值同 v0.1） — 數值依《設計規格 v2（核心版）》；規格未寫的數值集中在 ASSUME（見「機率說明」頁與 Page 原型節） */
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
  // v0.4 傾向蛋：品階機率同普通蛋，天賦固定為該方向 +3
  tF: { zh: '兇猛蛋', price: { coin: 200 }, lv: 1, odds: [['D', 60], ['C', 30], ['B', 10]], lean: 'F' },
  tS: { zh: '甲殼蛋', price: { coin: 200 }, lv: 1, odds: [['D', 60], ['C', 30], ['B', 10]], lean: 'S' },
  tA: { zh: '敏捷蛋', price: { coin: 200 }, lv: 1, odds: [['D', 60], ['C', 30], ['B', 10]], lean: 'A' },
  tM: { zh: '異變蛋', price: { coin: 200 }, lv: 1, odds: [['D', 60], ['C', 30], ['B', 10]], lean: 'M' },
};
const RELEASE = [ // 規格 6
  { coin: 20, scale: 1, cry: 0, shard: 0 }, { coin: 60, scale: 2, cry: 0, shard: 0 }, { coin: 150, scale: 3, cry: 1, shard: 0 },
  { coin: 400, scale: 5, cry: 2, shard: 1, core: 'S10' }, { coin: 1000, scale: 8, cry: 3, shard: 2, core: 1 }];
const LV_REL = [0, 0, 3, 10, 18, 28, 40, 60, 80, 100, 120]; // 研究員 Lv：Lv3=10、Lv6=40、Lv10=120 依規格；其餘為假設
const PERSONALITY = ['勇敢', '慎重', '淘氣', '好奇', '黏人', '懶散', '暴躁', '孤僻'];
/* v0.4 個體差異（每顆蛋放進飼養欄時就決定，孵化時揭曉） */
const PERS = { 勇敢: ['😤', 'meat'], 暴躁: ['😠', 'meat'], 慎重: ['🧐', 'calc'], 懶散: ['😪', 'calc'], 淘氣: ['😜', 'bug'], 黏人: ['🥰', 'bug'], 好奇: ['🤔', 'gel'], 孤僻: ['😶', 'gel'] }; // 個性 → 最愛食物（吃最愛的食物，該方向 +2）
const SHINY_HATCH = 64;                      // 孵化時異色 1/64（另外每次進化 2%，觸媒 6%，同 v0.1）
const TALENT_ODDS = [[1, 60], [2, 30], [3, 10]];  // 天賦強度（一般蛋，方向四選一）；傾向蛋固定該方向 +3
const SIZE_MIN = 0.7, SIZE_MAX = 1.3, SIZE_BIG = 1.2, SIZE_SMALL = 0.8;   // 體型倍率：0.7～1.3（兩次平均，越極端越少見）
const STAGE_CM = [18, 35, 80, 160, 300], STAGE_KG = [0.4, 2.5, 18, 90, 420];  // 各階段標準體長／體重（×體型倍率／倍率³）
const RANK_ZH = { D: '普通', C: '普通', B: '優良', A: '稀有', S: '超稀有', SS: '傳說' };
const RANK_HINT = { D: '看起來是很普通的蛋', C: '蛋殼微微透出綠光', B: '蛋殼透出藍光，感覺不錯！', A: '蛋殼發出紫色光芒……是好蛋！', S: '金光閃閃！非常厲害的蛋！', SS: '七彩光芒！！傳說級的氣息！' };
function rollTalent(type) { const t = EGGS[type] && EGGS[type].lean; if (t) return { t, n: 3 }; let r = Math.random() * 100, n = 1; for (const [k, p] of TALENT_ODDS) { if ((r -= p) < 0) { n = k; break; } } return { t: TK[Math.floor(Math.random() * 4)], n }; }
function rollSize() { return Math.round((SIZE_MIN + (SIZE_MAX - SIZE_MIN) * (Math.random() + Math.random()) / 2) * 1000) / 1000; }
function rollHidden(o, tut) { o.pers = o.pers || PERSONALITY[Math.floor(Math.random() * 8)]; o.talent = o.talent || rollTalent(o.eggType); if (o.size == null) o.size = rollSize(); if (!tut && o.shinyRolled == null) { o.shiny = Math.random() < 1 / SHINY_HATCH; o.shinyRolled = true; } return o; }
const sizeCm = (c, st = c.stage) => Math.round(STAGE_CM[Math.max(0, st)] * (c.size || 1) * 10) / 10;
const sizeKg = (c, st = c.stage) => { const v = STAGE_KG[Math.max(0, st)] * Math.pow(c.size || 1, 3); return v < 10 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10; };
const sizeTag = (s) => s >= SIZE_BIG ? '特大' : s <= SIZE_SMALL ? '迷你' : '';
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
  if (o.stage < 0) { o.code = 'EGG'; if (!(o.eggType === 'tutorial' || EGGS[o.eggType])) o.eggType = 'normal'; rollHidden(o, o.tutorial); }   // v0.3 的蛋：補上隱藏屬性
  else { if (o.size == null) o.size = 1; if (!PERS[o.personality]) o.personality = PERSONALITY[0]; }   // v0.3 已孵化的怪獸：體型 1.0、沒有天賦
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
  if (!Array.isArray(o.log)) o.log = []; if (!o.dex || typeof o.dex !== 'object') o.dex = {};
  for (const k in o.dex) { const d = o.dex[k]; if (!d || typeof d !== 'object') { delete o.dex[k]; continue; } if (!Array.isArray(d.pers)) d.pers = []; } if (!o.dexRewards || typeof o.dexRewards !== 'object') o.dexRewards = {};
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
  rollHidden(c, c.tutorial);
  c.stage = 0; c.code = 'R-001'; resetStage(c); c.personality = c.pers;
  if (c.tutorial) { c.poops = 1; S.tut.hatch = true; }
  const rec = sizeRecord(c);
  register(c); logEv(`蛋孵化了：${nm(c)}（品階 ${c.rank}・個性${c.personality}・體長 ${sizeCm(c)} cm）`, 'evo');
  if (c.shiny) logEv(`孵出異色個體！`, 'shiny');
  ceremonyQueue.push({ code: 'R-001', from: 'EGG', rank: c.rank, shiny: c.shiny, first: firstFlag, hatch: true, pers: c.personality, talent: c.talent, size: c.size, rec, eggType: c.eggType });
}
function sizeRecord(c) { const d = S.dex[c.code]; if (!d || d.max == null) return null; return c.size > d.max ? 'max' : c.size < d.min ? 'min' : null; }   // 打破這個型態的體型紀錄
function resetStage(c) { c.stageMin = 0; c.feeds = 0; c.food = { meat: 0, calc: 0, bug: 0, gel: 0, std: 0 }; c.tend = { F: 0, S: 0, A: 0, M: 0 }; c.envMin = 0; c.perchMin = 0; c.sickStage = !!c.sick;
  if (c.stage === 1 && c.talent && T[c.talent.t]) c.tend[c.talent.t] += c.talent.n; }   // v0.4 天賦：進入幼化體時，該方向先有 +1～+3
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
  const rec = sizeRecord(c);
  register(c);
  if (c.tutorial) S.tut.evo = true;
  logEv(`${F[from].zh} 進化成 ${F[to].zh}（${STAGES[c.stage]}）`, 'evo');
  ceremonyQueue.push({ code: to, from, rank: c.rank, shiny: c.shiny, first: firstFlag, rec, cm: sizeCm(c) });
}
function register(c) {
  const d = S.dex[c.code] || (S.dex[c.code] = { seen: false, shiny: false, best: null, pers: [] });
  firstFlag = !d.seen; d.seen = true; if (c.shiny) d.shiny = true;
  if (!d.best || RANKS.indexOf(c.rank) > RANKS.indexOf(d.best)) d.best = c.rank;
  if (!Array.isArray(d.pers)) d.pers = []; if (c.personality && !d.pers.includes(c.personality)) d.pers.push(c.personality);   // v0.4 圖鑑紀錄
  if (typeof c.size === 'number') { if (d.max == null || c.size > d.max) d.max = c.size; if (d.min == null || c.size < d.min) d.min = c.size; }
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
    S.slots[i] = rollHidden({ id: uid(), eggType: e.type, tutorial: tut, rank: e.rank || (tut ? ASSUME.tutRank : rollRank(e.type)), stage: -1, code: 'EGG', stageMin: 0, eggDur: tut ? TUT_EGG_MIN : EGG_MIN,
      poops: 0, poopT: 0, cleanT: 0, fullMin: 0, sick: false, sickStage: false, env: 'heat', feeds: 0, food: {}, tend: { F: 0, S: 0, A: 0, M: 0 }, envMin: 0, perchMin: 0,
      lastFeed: -1e15, shiny: !!e.shiny, shinyRolled: e.shiny ? true : undefined, final: false, pausedUntil: 0, born: S.game }, tut);
    closeModal(); UI.tab = 'lab'; UI.slot = i; render();
  },
  feed(i, k) {
    const c = S.slots[i], f = FOODS.find(x => x.k === k);
    if (!c || c.stage < 0) return;
    const wait = c.lastFeed + ASSUME.feedCooldownMin * MIN - S.game; if (wait > 0) return toast(`還很飽，${Math.ceil(wait / MIN)} 分鐘後再餵`);
    if (f.cost && !pay({ coin: f.cost })) return;
    c.lastFeed = S.game; c.feeds++; c.food[k] = (c.food[k] || 0) + 1; if (f.t) c.tend[f.t] += favFood(c) === k ? 2 : 1;   // v0.4：最愛的食物 +2
    S.daily.prog.feed++; if (c.tutorial) S.tut.feed = true; closeModal(); tutCheck(); render();
  },
  clean(i) { const c = S.slots[i]; if (!c || !c.poops) return; c.poops--; c.fullMin = 0; S.daily.prog.clean++; if (c.tutorial) S.tut.clean = true; tutCheck(); render(); },
  env(i, k) { const c = S.slots[i]; c.env = k; c.envMin = 0; closeModal(); render(); },
  potion(i) { const c = S.slots[i]; if (!c.sick) return toast('沒有生病'); if (S.items.potion < 1) return toast('沒有治療藥（商店 30 金）'); S.items.potion--; c.sick = false; c.fullMin = 0; render(); },
  lamp(i) {
    const c = S.slots[i];
    if (c.pausedUntil > S.game) { c.pausedUntil = 0; toast('關掉安眠燈'); return render(); }
    if (S.items.lamp < 1) return toast('沒有安眠燈（商店用結晶兌換）'); S.items.lamp--; c.pausedUntil = S.game + 6 * HOUR; closeModal(); toast('💡 暫停成長 6 小時'); render();
  },
  catalyst(i) { const c = S.slots[i]; if (c.catalystOn) return toast('已使用'); if (S.items.catalyst < 1) return toast('沒有變異觸媒'); S.items.catalyst--; c.catalystOn = true; closeModal(); toast('🧪 下次進化異色 6%'); render(); },
  stab(i) { const c = S.slots[i]; if (c.stabilizerOn) return toast('每次判定限用 1 個'); if (S.items.stabilizer < 1) return toast('沒有進化穩定劑'); S.items.stabilizer--; c.stabilizerOn = true; closeModal(); toast('⚗️ 極限判定 +10%'); render(); },
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
  buyEgg(type) { const e = EGGS[type]; if (level() < e.lv) return toast(`研究員 Lv ${e.lv} 解鎖`); if (!pay(e.price)) return; S.eggs.push({ type, id: uid() }); toast(`🥚 ${e.zh} +1`); render(); },
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
    toast(k === 1 ? '⏩ 回到正常速度' : `⏩ 時間 ×${k}`); render(); },
  fill10k() { const N = 10000, up = (v) => Math.max(+v || 0, N);
    S.coin = up(S.coin); S.scale = up(S.scale); S.core = up(S.core); TK.forEach(t => S.cry[t] = up(S.cry[t])); RANKS.forEach(r => S.shard[r] = up(S.shard[r]));
    for (const k of ['potion', 'lamp', 'catalyst', 'stabilizer']) S.items[k] = up(S.items[k]);
    toast('🧪 資源與道具都補到 10000'); render(); },
  rich() { S.coin += 5000; S.scale += 100; TK.forEach(t => S.cry[t] += 20); RANKS.forEach(r => S.shard[r] += 20); S.core += 3; for (const k in S.items) S.items[k] += 5; toast('已加測試素材'); render(); },
  testEgg(r) { const sh = r.endsWith('*'); r = r.replace('*', ''); S.eggs.push({ type: 'rare', id: uid(), rank: r, shiny: sh || undefined }); toast(`加入 ${r}${sh ? ' 異色' : ''} 測試蛋`); render(); },
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

/* ---------------- UI（v0.4：手機優先・怪獸是主角） ---------------- */
const VERSION = 'v0.4';
const SPEEDS = [1, 2, 3, 5, 60];   // 測試加速可選倍速
const DEV_URL = /[?&]dev=1/.test(location.search);
const UI = { tab: DEV_URL ? 'dev' : 'lab', probSlot: null, back: 'shop', slot: 0, tools: false, fade: false };
const FOOD_ICON = { meat: '🥩', calc: '🦴', bug: '🐛', gel: '🧪', std: '🌾' };
const ENV_ICON = { heat: '🔥', rock: '🪨', track: '🏃', mist: '🌫️', perch: '🪵' };
const T_ICON = { F: '🔥', S: '🛡️', A: '💨', M: '🌀' };
const STAGE_H = [110, 140, 165, 185, 205];         // 各階段在飼養箱裡的顯示高度（px，再乘體型）
const CAP_ST = { 2: '成形體', 3: '覺醒體', 4: '極限體' };
const $ = (s) => document.querySelector(s);
const favFood = (c) => PERS[c.personality] && PERS[c.personality][1];
function sprite(code, cls = '', h = 120) { const key = code === 'EGG' ? 'egg_normal' : code; const [w, hh] = SIZES[key] || [100, 100]; return `<img class="px ${cls}" src="img/${key}.png" width="${Math.round(w * h / hh)}" height="${h}" alt="">`; }
function img(code, cls = '', scale = .5) { const key = code === 'EGG' ? 'egg_normal' : code; const [, h] = SIZES[key] || [100, 100]; return sprite(code, cls, Math.round(h * scale)); }
function eggImg(type, h = 96, cls = '') { const k = 'egg_' + (EGGS[type] || type === 'tutorial' ? type : 'normal'); const z = SIZES[k] || [104, 128]; return `<img class="px ${cls}" src="img/${k}.png" width="${Math.round(z[0] * h / z[1])}" height="${h}" alt="">`; }
const eggName = (e) => (e.type === 'tutorial' ? '教學蛋' : EGGS[e.type].zh) + (e.rank ? `（${e.rank}）` : '');
const oddsTxt = (type) => EGGS[type].odds.map(([r, p]) => r + ' ' + p + '%').join('・');
function fmtDur(ms) { ms = Math.max(0, ms); const h = Math.floor(ms / HOUR), m = Math.ceil(ms % HOUR / MIN - 1e-9); return h ? `${h} 小時 ${m} 分` : `${Math.max(m, ms > 0 ? 1 : 0)} 分`; }
function clock(t) { const d = new Date(t + 8 * HOUR); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
const fmtN = (n) => n >= 100000 ? (Math.floor(n / 1000) / 10) + '萬' : String(n);
function toast(m) { const box = $('#toast'); if (!box) return; while (box.children.length >= 2) box.firstChild.remove(); const d = document.createElement('div'); d.textContent = m; box.appendChild(d); setTimeout(() => d.remove(), 2200); }
function modal(html) { const tb = $("#toast"); if (tb) tb.innerHTML = ""; $('#modal').innerHTML = `<div class="box">${html}</div>`; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
function showDiary(evs, off) {
  const top = evs.filter(e => e.kind !== 'info').slice(-5); const list = (top.length ? top : evs.slice(-5));
  setTimeout(() => modal(`<h3>📔 你不在的時候</h3><p class="note">離開了 ${fmtDur(off)}，期間發生：</p><ul class="diary">${list.map(e => `<li><span class="note">${clock(e.t)}</span> ${e.text}</li>`).join('')}</ul><button class="btn big pri" data-a="closeModal">知道了</button>`), 50);
}
function canClaim() { return ASSUME.daily.some(d => S.daily.prog[d.k] >= d.n && !S.daily.claimed[d.k]); }

/* 頂部：資源列＋在線人數（online.js 自己更新 #online）＋測試工具按鈕 */
function header() {
  setHTML($('#hbtns'), `<button class="chip round" data-a="guide" title="怎麼玩">？</button>`);
  setHTML($('#res'), `<button class="rchip" data-tab="inv" title="研究員等級">⭐ Lv${level()}</button><button class="rchip" data-tab="inv" title="金幣">🪙 ${fmtN(S.coin)}</button>
    <button class="rchip" data-tab="inv" title="鱗屑">🔹 ${fmtN(S.scale)}</button><button class="rchip" data-tab="inv" title="蛋">🥚 ${S.eggs.length}</button>
    <button class="tchip ${S.speed > 1 || UI.tools ? 'on' : ''}" data-a="tools" title="測試工具（倍速、補資源）">🧪 ×${S.speed}</button>`);
  setHTML($('#testbar'), UI.tools ? testBar() : ''); $('#testbar').classList.toggle('hidden', !UI.tools);
  document.querySelectorAll('#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === UI.tab || (b.dataset.tab === 'shop' && UI.tab === 'prob')); });
  $('#tabs [data-tab=tasks]').classList.toggle('dot', canClaim());
  const hh = $('#top').offsetHeight; if (hh && hh !== header.hh) { header.hh = hh; document.documentElement.style.setProperty('--hh', hh + 'px'); }
}
function setHTML(el, h) { if (el && el.__h !== h) { el.__h = h; el.innerHTML = h; } }
/* 測試工具：一行（倍速＋補到 10000＋DEV），按頂部 🧪 打開／收起 */
function testBar() {
  return `<div class="seg">${SPEEDS.map(k => `<button class="${S.speed === k ? 'on' : ''}" data-a="setSpeed" data-k="${k}" aria-label="倍速 ${k}">×${k}</button>`).join('')}</div>
    <button class="tfill" data-a="fill10k" title="金幣、鱗屑、結晶、碎片、核心、所有道具都補到 10000">🧪 全補 10000</button><button class="tdev ${UI.tab === 'dev' ? 'on' : ''}" data-a="devTab" title="開發者測試面板">DEV</button>`;
}

/* 教學：下一步提示（一行） */
function nextStep() {
  const t = S.tut, n = slotsOpen();
  const steps = ['hatch', 'feed', 'clean', 'evo', 'dex'], done = steps.filter(k => t[k]).length;
  if (!t.done) {
    const p = `${done}/5`;
    if (!t.hatch) return S.slots.some(c => c && c.stage < 0) ? [p, '⏳', '蛋快孵化了，看看蛋殼的光色！'] : [p, '🥚', '按「放入蛋」開始孵化'];
    if (!t.feed) return [p, '🍖', '牠餓了！按下方「餵食」'];
    if (!t.clean) return [p, '🧹', '牠大便了，點 💩 清掉'];
    if (!t.evo) return [p, '✨', '進度條跑滿就會進化（右上 🧪 可加速）'];
    return [p, '📖', '看看下方「圖鑑」'];
  }
  if (S.releases === 0) return ['', '🕊️', '長到最大後放生，會開放第 2 欄'];
  const empty = [0, 1, 2].some(i => i < n && !S.slots[i]);
  if (empty && !S.eggs.length) return ['', '🛒', '沒有蛋了，到「商店」買一顆'];
  return null;
}
function banner() {
  const s = nextStep(); if (!s) return '';
  return `<div class="coach"><span class="ci">${s[1]}</span><b>${s[2]}</b>${s[0] ? `<span class="cp">${s[0]}</span>` : ''}</div>`;
}
/* 給動畫用的心情（只影響表演） */
function petMood(c, cool, paused) {
  if (paused) return 'sleep'; if (c.sick) return 'sick'; if (c.poops) return 'dirty';
  if (!c.final && !cool && c.feeds < minFeed(c)) return 'hungry'; if (!c.final && rating(c) === 0 && c.feeds) return 'sad'; return 'ok';
}
function statusHint(c, cool) {
  if (c.sick) return ['bad', `🤒 生病了！按「💊 治療」${S.items.potion ? '' : '（沒藥：商店 30 金）'}`];
  if (c.poops >= 2) return ['warn', '💩 快清便便，滿 3 坨太久會生病'];
  if (c.failed) return ['warn', '極限進化沒成功：可放生或重新挑戰'];
  if (c.final) return ['good', c.stage === 4 ? '🏆 最終型態！放生可換大量素材' : `🎉 已長到最大（${c.rank} 最多到${CAP_ST[RANK_CAP[c.rank]]}）`];
  if (c.feeds < minFeed(c)) return ['', cool ? '😋 剛吃飽，等一下再餵' : `🍖 這階段再餵 ${minFeed(c) - c.feeds} 次，評價會變「良好」`];
  if (c.stage === 1) return ['good', '😊 很好！最高的成長方向決定下一型態'];
  return ['good', '😊 照顧得很好，等牠長大'];
}
/* 蛋殼：光色＝品階提示、裂痕＝快孵化了 */
const CRACK = (lv) => `<svg class="crack" viewBox="0 0 104 128" preserveAspectRatio="none" aria-hidden="true">${lv >= 1 ? '<polyline points="28,50 38,56 33,63 45,69 40,77"/>' : ''}${lv >= 2 ? '<polyline points="66,38 58,47 67,53 59,62 70,68 63,76"/><polyline points="45,69 54,73 51,82"/>' : ''}</svg>`;
const crackLv = (p) => p >= .75 ? 2 : p >= .4 ? 1 : 0;
function eggShell(type, rank, shiny, p, h = 130) {
  const lv = crackLv(p), sh = shiny && p >= .5;
  return `<div class="eggw r-${rank} wob${lv}${sh ? ' sh' : ''}" style="--gp:${(.25 + .75 * Math.min(1, p)).toFixed(2)}"><div class="eglow"></div>${eggImg(type, h)}${CRACK(lv)}${sh ? '<i class="tw t1">✦</i><i class="tw t2">✦</i><i class="tw t3">✧</i>' : ''}</div>`;
}
/* 狀態小儀表 */
function meters(c, cool, paused) {
  const mf = minFeed(c), mood = { ok: 1, sleep: 1, hungry: .6, dirty: .6, sad: .3, sick: .15 }[petMood(c, cool, paused)];
  const m = [['🍖', '飽足', c.final && !c.failed ? 1 : Math.min(1, c.feeds / mf)], ['😊', '心情', mood], ['🧼', '清潔', (3 - c.poops) / 3], ['❤️', '健康', c.sick ? .15 : c.poops >= 3 ? .6 : 1]];
  return `<div class="meters">${m.map(([ic, l, v]) => `<div class="mtr ${v < .34 ? 'low' : v < .67 ? 'mid' : ''}" title="${l}"><span>${ic}</span><i><b style="width:${Math.round(v * 100)}%"></b></i><small>${l}</small></div>`).join('')}</div>`;
}
/* 個體標籤：個性・天賦・體型 */
function traitTags(c) {
  const p = PERS[c.personality], d = S.dex[c.code] || {}, tag = sizeTag(c.size || 1);
  const rec = tag && (c.size === d.max || c.size === d.min);
  return `<div class="tags" data-a="traitHelp" data-i="${UI.slot}">${p ? `<span class="tag">${p[0]} ${c.personality}<small>愛吃${FOOD_ICON[p[1]]}</small></span>` : ''}
    ${c.talent ? `<span class="tag" style="--tc:${T[c.talent.t].c}">🧬 天賦 ${T[c.talent.t].zh}+${c.talent.n}</span>` : ''}
    <span class="tag ${tag ? 'hot' : ''}">📏 ${sizeCm(c)}cm${tag ? `<small>${tag}${rec ? '🏆' : ''}</small>` : ''}</span></div>`;
}
function hero(c, i) {
  if (!c) {
    if (!S.eggs.length) return `<div class="hero"><div class="tank big empty" data-tab="shop"><div class="ghost">🥚</div><div class="emp">沒有蛋了</div></div><button class="btn big pri" data-tab="shop">🛒 去商店買蛋</button></div>`;
    return `<div class="hero"><div class="tank big empty" data-a="pickEgg" data-i="${i}"><div class="ghost">${eggImg(S.eggs[0].type, 96, 'ghostegg')}</div><div class="emp">飼養欄 ${i + 1} 空著</div></div>
      <button class="btn big pri" data-a="pickEgg" data-i="${i}">🥚 放入蛋 <small>你有 ${S.eggs.length} 顆</small></button></div>`;
  }
  const paused = c.pausedUntil > S.game;
  if (c.stage < 0) {
    const p = c.stageMin / c.eggDur, left = (c.eggDur - c.stageMin) * MIN;
    const hint = p < .3 ? '蛋裡有動靜……' : RANK_HINT[c.rank] + (c.shiny && p >= .5 ? ' 還有七彩小光點?!' : '');
    return `<div class="hero"><div class="tank big egg r-${c.rank}"><div class="tname"><b>${c.tutorial ? '教學蛋' : EGGS[c.eggType].zh}</b></div>${eggShell(c.eggType, c.rank, c.shiny, p)}<div class="floor"></div></div>
      <div class="grow"><div class="pl"><span>🥚 孵化中</span><b>還要 ${fmtDur(left)}</b></div><div class="bar"><i style="width:${100 * p}%"></i></div></div>
      <div class="hint egghint r-${c.rank}">${hint}</div></div>`;
  }
  const f = F[c.code], tt = topTend(c), total = TK.reduce((a, k) => a + c.tend[k], 0);
  const aura = total ? T[tt].c + '66' : 'rgba(111,191,115,.25)';
  const dur = stageDur(c), r = rating(c);
  const cool = Math.max(0, c.lastFeed + ASSUME.feedCooldownMin * MIN - S.game);
  const poops = Array.from({ length: c.poops }, () => `<button class="poop" data-a="clean" data-i="${i}" aria-label="清便便">💩</button>`).join('');
  const isUltStage = c.stage === 3 && (c.rank === 'S' || c.rank === 'SS');
  const [hk, ht] = statusHint(c, cool);
  const ph = Math.min(225, Math.round(STAGE_H[c.stage] * (1 + ((c.size || 1) - 1) * .5)));
  const next = c.stage < 4 && !c.final ? STAGES[c.stage + 1] : '';
  const grow = c.final && !c.failed ? '' : `<div class="grow"><div class="pl"><span>${c.failed ? '極限進化失敗' : c.trial ? '🔁 重新挑戰中' : `${STAGES[c.stage]} ▸ ${next}`}</span><b>${c.failed ? '' : fmtDur((dur - c.stageMin) * MIN)}${paused ? ' 💤' : ''}</b></div>
    <div class="bar"><i style="width:${c.failed ? 100 : 100 * c.stageMin / dur}%"></i></div>
    <div class="pl sm"><span>評價 <b class="${['badc', 'warnc', 'good'][r]}">${RATE_ZH[r]}</b>${RANK_CAP[c.rank] < 4 ? `・最多到${CAP_ST[RANK_CAP[c.rank]]}` : ''}</span><span>餵食 ${c.feeds}/${minFeed(c)}</span></div></div>`;
  const ultLine = isUltStage ? `<div class="ultline">🎲 極限進化機率 <b>${ultChance(c)}%</b> <a data-a="probFor" data-i="${i}">明細</a>${c.failed ? `<button class="btn" data-a="retry" data-i="${i}">🔁 重新挑戰（鱗屑 10＋${T[f.t].zh}結晶 3）</button>` : ''}</div>` : '';
  const tend = !c.final || c.failed ? `<div class="tend">${TK.map(k => `<div style="--tc:${T[k].c}" class="${total && k === tt ? 'top' : ''}"><span>${T_ICON[k]} ${T[k].zh}</span><b>${'★'.repeat(stars(c.tend[k])) || '·'}</b></div>`).join('')}</div>` : '';
  return `<div class="hero"><div class="tank big" style="--aura:${aura}">
     <div class="tname"><b>${f.zh}</b><button class="rank ${c.rank}" data-a="rankHelp" title="品階是什麼？">${c.rank}</button>${c.shiny ? '<span class="shtag">✦異色</span>' : ''}<small>${STAGES[c.stage]}</small></div>
     <span class="tagr">${c.sick ? '<b class="pill bad">🤒</b>' : ''}${paused ? '<b class="pill">💤</b>' : ''}${c.catalystOn ? '<b class="pill">🧪</b>' : ''}${c.stabilizerOn ? '<b class="pill">⚗️</b>' : ''}</span>
     <div class="floor"></div><div class="pet ${c.shiny ? 'isshiny' : ''}" data-keep="${c.id}" data-slot="${i}" data-code="${c.code}" data-stage="${c.stage}" data-h="${ph}" data-mood="${petMood(c, cool, paused)}"></div><div class="poops">${poops}</div></div>
   ${meters(c, cool, paused)}${traitTags(c)}${grow}${tend}
   <div class="hint ${hk}">${ht}</div>${ultLine}</div>`;
}
/* 底部動作列（拇指區） */
function actionBar(c, i) {
  if (UI.tab !== 'lab' || !c || c.stage < 0) return '';
  if (c.final && !c.failed) return `<div class="abar fin"><button class="ab wide pri" data-a="release" data-i="${i}">🕊️<span>放生換素材</span></button><button class="ab" data-a="sheetItems" data-i="${i}">🎒<span>道具</span></button></div>`;
  const cool = Math.max(0, c.lastFeed + ASSUME.feedCooldownMin * MIN - S.game), mf = minFeed(c);
  return `<div class="abar"><button class="ab ${!cool && c.feeds < mf ? 'hot' : ''}" data-a="sheetFeed" data-i="${i}">🍖<span>餵食</span>${cool ? `<em class="cd">${Math.ceil(cool / MIN)}分</em>` : ''}</button>
    <button class="ab ${c.poops >= 2 ? 'hot' : ''}" data-a="clean" data-i="${i}" ${c.poops ? '' : 'disabled'}>🧹<span>清潔</span>${c.poops ? `<em>${c.poops}</em>` : ''}</button>
    <button class="ab ${c.sick ? 'alert' : ''}" data-a="potion" data-i="${i}" ${c.sick ? '' : 'disabled'}>💊<span>治療</span>${c.sick ? `<em>${S.items.potion}</em>` : ''}</button>
    <button class="ab" data-a="sheetEnv" data-i="${i}">${ENV_ICON[c.env]}<span>住處</span></button>
    <button class="ab" data-a="sheetItems" data-i="${i}">🎒<span>道具</span></button></div>`;
}
function slotNeeds(c) { if (!c) return false; if (c.stage < 0) return false; return c.sick || c.poops >= 2 || (c.final && !c.failed) || (!c.final && c.feeds < minFeed(c) && c.lastFeed + ASSUME.feedCooldownMin * MIN <= S.game); }
function switcher(n) {
  if (!S.tut.done && n === 1) return '';
  return `<div class="slotsw">${[0, 1, 2].map(j => {
    if (j >= n) return `<button class="sw lock" data-a="lockInfo" data-i="${j}">🔒</button>`;
    const c = S.slots[j], ic = !c ? '<span class="plus">＋</span>' : c.stage < 0 ? eggImg(c.eggType, 24) : sprite(c.code, c.shiny ? 'shiny' : '', 24);
    return `<button class="sw ${j === UI.slot ? 'on' : ''} ${slotNeeds(c) ? 'dot' : ''}" data-a="slotSel" data-i="${j}">${ic}<span>${j + 1}</span></button>`;
  }).join('')}</div>`;
}
function vLab() {
  const n = slotsOpen(); if (UI.slot >= n) UI.slot = 0;
  return `${banner()}${switcher(n)}${hero(S.slots[UI.slot], UI.slot)}`;
}
function vDex() {
  const seen = FORMS.filter(f => S.dex[f.code]?.seen).length, sh = FORMS.filter(f => S.dex[f.code]?.shiny).length;
  const R = S.dexRewards, pm = new Set(); Object.values(S.dex).forEach(d => (d.pers || []).forEach(p => pm.add(p)));
  const rw = [['novice', '登錄 5 種', '優良蛋 ×1'], ...ROUTES.map(([n, a]) => ['route_' + n, `完成「${n}」路線`, `${T[F[a].t].zh}結晶 ×10`]), ['shiny10', '異色 10 種', '變異觸媒 ×3'], ['full', '登錄全部 22 種', '傳說蛋＋稱號']];
  return `<h2>📖 圖鑑</h2><div class="card"><div class="pl"><span>已收集 <b>${seen}</b> / 22</span><span class="note">✦異色 ${sh}・個性 ${pm.size}/8</span></div><div class="bar"><i style="width:${seen / 22 * 100}%"></i></div></div>
  ${STAGES.map((st, si) => { const fs = FORMS.filter(f => f.st === si); return `<h3>${st} <small class="note">${fs.filter(f => S.dex[f.code]?.seen).length}/${fs.length}</small></h3><div class="dex">${fs.map(f => {
    const d = S.dex[f.code];
    return d?.seen ? `<button class="dexc" data-a="dexInfo" data-k="${f.code}"><div class="pic">${sprite(f.code, '', 72)}</div><div class="n">${f.zh}</div><div class="c"><span class="rank ${d.best}">${d.best}</span>${d.shiny ? ' <span class="good">✦</span>' : ''}${d.max != null && (d.max >= SIZE_BIG || d.min <= SIZE_SMALL) ? ' 🏆' : ''}</div></button>`
      : `<button class="dexc un" data-a="dexInfo" data-k="${f.code}"><div class="pic">${sprite(f.code, 'sil', 72)}</div><div class="n">？？？</div><div class="c">${f.t ? T[f.t].zh : '基本型'}</div></button>`;
  }).join('')}</div>`; }).join('')}
  <h3>🎁 收集獎勵</h3><div class="card"><ul class="rw">${rw.map(([k, a, b]) => `<li class="${R[k] ? 'good' : ''}">${R[k] ? '✔' : '○'} ${a} → ${b}</li>`).join('')}<li class="note">每個階段全部登錄 → 實驗室裝飾 ×1</li></ul></div>`;
}
function eggCard(k, e, lv) {
  const lock = lv < e.lv;
  return `<div class="ecard ${e.lean ? 'lean' : ''}" style="${e.lean ? '--tc:' + T[e.lean].c : ''}"><div class="epic">${eggImg(k, 64)}</div><b>${e.zh}</b>
    <div class="eodd">${e.lean ? `🧬 天賦 ${T[e.lean].zh}+3` : oddsTxt(k)}</div>
    <button class="btn ${lock ? '' : 'pri'}" data-a="buyEgg" data-k="${k}" ${lock ? 'disabled' : ''}>${lock ? `🔒 Lv${e.lv}` : fmtCost(e.price)}</button></div>`;
}
function vShop() {
  const lv = level(), E = Object.entries(EGGS);
  return `<h2>🛒 商店 <button class="chip sm" data-a="probOpen">📊 機率</button></h2>
   <h3>🥚 蛋 <small class="note">品階越高，長得越遠</small></h3><div class="eshop">${E.filter(([, e]) => !e.lean).map(([k, e]) => eggCard(k, e, lv)).join('')}</div>
   <h3>🎯 傾向蛋 <small class="note">想養哪一型就買哪一顆</small></h3><div class="eshop">${E.filter(([, e]) => e.lean).map(([k, e]) => eggCard(k, e, lv)).join('')}</div>
   <p class="note">傾向蛋品階機率同普通蛋（${oddsTxt('normal')}），天賦固定為該方向 +3：幼化體一開始就有 ★★，比較容易長成那一型。</p>
   <h3>🎒 道具</h3><div class="grid2">${[['potion', '💊 治療藥', '治好生病'], ['lamp', '💡 安眠燈', '暫停成長 6 小時（最多的那色結晶 ×2）'], ['catalyst', '🧪 變異觸媒', '下次進化異色 6%，斑蝕蜥會變裂相蜥'], ['stabilizer', '⚗️ 進化穩定劑', '極限進化 +10%（每次限 1 個）']].map(([k, z, d]) =>
     `<div class="item"><div class="ib"><b>${z}</b> <span class="note">持有 ${fmtN(S.items[k])}</span><div class="note">${d}</div><div class="price">${fmtCost(ASSUME[k])}</div><button class="btn" data-a="buyItem" data-k="${k}">兌換</button></div></div>`).join('')}</div>
   <h3>🔧 實驗室升級</h3><div class="grid2">${[['autoClean', '🤖 自動清潔機', '每 3 小時自動清便便'], ['thermo', '🌡️ 恆溫燈', '生病機率減半'], ['incubator', '🥚 孵化器', '每 12 小時送 1 顆普通蛋']].map(([k, z, d]) =>
     `<div class="item"><div class="ib"><b>${z}</b><div class="note">${d}</div><div class="price">${fmtCost(ASSUME[k])}</div><button class="btn" data-a="buyLab" data-k="${k}" ${S.lab[k] ? 'disabled' : ''}>${S.lab[k] ? '✔ 已安裝' : '安裝'}</button></div></div>`).join('')}
     ${ENVS.filter(e => e.unlock).map(e => `<div class="item"><div class="ib"><b>${ENV_ICON[e.k]} 住處：${e.zh}</b><div class="note">每住 1 小時 ${T[e.t].zh} +1${e.k === 'perch' ? '；住滿 2 小時，迅鱗蜥會變蒼翼蜥' : ''}</div><div class="price">${e.unlock[0]} 金＋鱗屑 ${e.unlock[1]}</div>
     <button class="btn" data-a="buyEnv" data-k="${e.k}" ${S.lab.envs[e.k] ? 'disabled' : ''}>${S.lab.envs[e.k] ? '✔ 已解鎖' : '解鎖'}</button></div></div>`).join('')}</div>`;
}
function vInv() {
  const lv = level(), nextN = LV_REL[lv + 1];
  const open = [0, 1, 2].filter(i => i < slotsOpen() && !S.slots[i]);
  return `<h2>🎒 背包</h2>
  <div class="card"><div class="pl"><span>⭐ 研究員 Lv ${lv}${S.title ? '・' + S.title : ''}</span><span class="note">已放生 ${S.releases} 隻</span></div>${nextN != null ? `<div class="bar"><i style="width:${Math.min(100, (S.releases - LV_REL[lv]) / (nextN - LV_REL[lv]) * 100)}%"></i></div><div class="hint">再放生 ${nextN - S.releases} 隻升到 Lv ${lv + 1}</div>` : '<div class="hint">已達最高等級</div>'}</div>
  <h3>🥚 蛋（${S.eggs.length}）</h3>${S.eggs.length ? `<div class="egglist">${S.eggs.map(e => `<div class="eggrow">${eggImg(e.type, 44)}<b>${eggName(e)}</b>${open.length ? `<button class="btn pri" data-a="place" data-k="${e.id}">放入</button>` : '<span class="note">飼養欄滿了</span>'}</div>`).join('')}</div>` : '<div class="card hint">沒有蛋。到「商店」買蛋，或等任務、圖鑑獎勵。</div>'}
  <h3>💰 素材</h3><div class="mats">
   <div class="mat"><span>🪙</span><b>${fmtN(S.coin)}</b><em>金幣</em></div>
   <div class="mat"><span>🔹</span><b>${fmtN(S.scale)}</b><em>鱗屑</em></div>
   ${TK.map(t => `<div class="mat" style="--tc:${T[t].c}"><span>💎</span><b>${fmtN(S.cry[t])}</b><em>${T[t].zh}結晶</em></div>`).join('')}
   <div class="mat"><span>🔶</span><b>${fmtN(S.core)}</b><em>古鱗核心</em></div>
   <div class="mat wide"><span>🧩</span><b>${RANKS.map(r => r + ' ' + fmtN(S.shard[r])).join('・')}</b><em>品階碎片</em></div></div>
  <h3>🧰 道具</h3><div class="mats"><div class="mat"><span>💊</span><b>${fmtN(S.items.potion)}</b><em>治療藥</em></div><div class="mat"><span>💡</span><b>${fmtN(S.items.lamp)}</b><em>安眠燈</em></div><div class="mat"><span>🧪</span><b>${fmtN(S.items.catalyst)}</b><em>變異觸媒</em></div><div class="mat"><span>⚗️</span><b>${fmtN(S.items.stabilizer)}</b><em>穩定劑</em></div>${S.decor ? `<div class="mat"><span>🪴</span><b>${S.decor}</b><em>實驗室裝飾</em></div>` : ''}</div>
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
  <h3>⚙️ 設定</h3><div class="card"><label class="chk"><input type="checkbox" data-a="calm" ${S.calm ? 'checked' : ''}> 孵化／進化動畫減弱閃光</label>
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
  const glow = { D: '無光', C: '淡綠光', B: '藍光', A: '紫光', S: '金光', SS: '七彩光' };
  return `<button class="btn back" data-a="probBack">← 返回</button><h2>📊 機率說明（遊戲內公開）</h2>${cur}
  <h3>蛋的品階機率</h3><div class="tw"><table><tr><th>蛋</th><th>品階機率</th></tr>${Object.entries(EGGS).map(([k, e]) => `<tr><td>${e.zh}</td><td>${oddsTxt(k)}${e.lean ? `；天賦固定 ${T[e.lean].zh} +3` : ''}</td></tr>`).join('')}<tr><td>教學蛋</td><td>固定 C</td></tr></table></div>
  <h3>孵化時揭曉的個體差異（v0.4）</h3><p class="note">放進飼養欄的那一刻就決定了，孵化時才揭曉。蛋殼的光色會透露品階，越接近孵化越明顯。</p>
  <div class="tw"><table>
  <tr><td>蛋殼光色 ↔ 品階</td><td>${RANKS.map(r => `<span class="rank ${r}">${r}</span> ${glow[r]}`).join('・')}</td></tr>
  <tr><td>異色</td><td>孵化時 1/${SHINY_HATCH}（約 ${(100 / SHINY_HATCH).toFixed(2)}%，教學蛋除外；異色蛋殼會冒七彩小光點）；之後每次進化 2%，用變異觸媒 6%</td></tr>
  <tr><td>個性（8 種，各 12.5%）</td><td>${PERSONALITY.map(p => `${PERS[p][0]}${p}→${FOOD_ICON[PERS[p][1]]}`).join('・')}。餵最愛的食物，該方向 +2（一般 +1）</td></tr>
  <tr><td>天賦（一般蛋）</td><td>方向：兇猛／甲殼／敏捷／異變 各 25%；強度：+1 ${TALENT_ODDS[0][1]}%・+2 ${TALENT_ODDS[1][1]}%・+3 ${TALENT_ODDS[2][1]}%。進入幼化體時先加上去，所以會影響長成哪一種成形體</td></tr>
  <tr><td>天賦（傾向蛋）</td><td>方向固定為蛋的方向，強度固定 +3</td></tr>
  <tr><td>體型</td><td>倍率 ${SIZE_MIN}～${SIZE_MAX}（越接近 1.0 越常見）；≥ ${SIZE_BIG}「特大」約 5.6%、≤ ${SIZE_SMALL}「迷你」約 5.6%。打破圖鑑最大／最小會顯示 🏆 紀錄</td></tr></table></div>
  <h3>品階決定能長多大</h3><div class="tw"><table><tr><th>品階</th><th>最多進化到</th></tr><tr><td>D・C</td><td>成形體</td></tr><tr><td>B・A</td><td>覺醒體</td></tr><tr><td>S・SS</td><td>極限體（要通過極限進化判定）</td></tr></table></div>
  <h3>極限進化機率（覺醒體 24 小時到期時判定一次；只有 S・SS 會判定）</h3>
  <div class="tw"><table><tr><th>項目</th><th>S</th><th>SS</th></tr><tr><td>基礎機率</td><td>30%</td><td>50%</td></tr><tr><td>覺醒體階段照顧評價：良好</td><td>+15%</td><td>+15%</td></tr>
  <tr><td>覺醒體階段照顧評價：普通</td><td>+0%</td><td>+0%</td></tr><tr><td>覺醒體階段照顧評價：差</td><td>不判定（0%）</td><td>不判定（0%）</td></tr>
  <tr><td>進化穩定劑（每次判定限用 1 個）</td><td>+10%</td><td>+10%</td></tr><tr><td>最高機率</td><td>55%</td><td>75%</td></tr></table></div>
  <p class="note">失敗：保持覺醒體並登錄圖鑑，可直接放生，或花鱗屑 10＋主傾向結晶 3 重新挑戰（12 小時嘗試期，照顧評價重算，次數不限）。</p>
  <h3>其他機率</h3><div class="tw"><table><tr><td>古鱗核心（放生覺醒體）</td><td>S 以上 10%</td></tr><tr><td>生病（恆溫燈）</td><td>便便 ≥ 3 坨超過 2 小時必定生病；裝恆溫燈後 50%</td></tr></table></div>
  <p class="note">所有道具目前只能用遊戲內素材取得；原型不含任何付費功能。</p>`;
}
function vDev() {
  return `<button class="btn back" data-a="devClose">← 回孵化場</button><h2>🛠 DEV 測試面板 <small class="note">網址加 ?dev=1 會直接打開</small></h2><div class="card devp">
  <div class="note">遊戲時間 ${clock(S.game)}（UTC+8）・速度 ×${S.speed}</div>
  <div class="lbl">跳時間（離線結算同一套邏輯）</div><button class="btn" data-a="skip" data-k="5">+5 分鐘</button><button class="btn" data-a="skip" data-k="60">+1 小時</button><button class="btn" data-a="skip" data-k="360">+6 小時</button><button class="btn" data-a="skip" data-k="1440">+24 小時</button>
  <div class="lbl">⏩ 測試加速（目前 ×${S.speed}）</div><div class="seg big">${SPEEDS.map(k => `<button class="${S.speed === k ? 'on' : ''}" data-a="setSpeed" data-k="${k}">×${k}</button>`).join('')}</div>
  <div class="lbl">🧪 測試資源</div><button class="btn pri" data-a="fill10k">🧪 測試資源 全部補到 10000（金幣・鱗屑・結晶・碎片・核心・道具）</button>
  <div class="lbl">測試蛋（直接放進蛋庫，品階固定）</div>${RANKS.map(r => `<button class="btn" data-a="testEgg" data-k="${r}">${r} 蛋</button>`).join('')}<button class="btn" data-a="testEgg" data-k="B*">✦異色 B 蛋</button><button class="btn" data-a="testEgg" data-k="SS*">✦異色 SS 蛋</button>
  <div class="lbl">其他</div><button class="btn" data-a="rich">+5000 金、+100 鱗屑、各結晶/碎片 +20、核心 +3、道具各 +5</button><button class="btn" data-a="lvup">研究員 +1 級（並略過教學）</button>
  <button class="btn bad" data-a="reset">清除存檔</button>
  <p class="note">快速測一條極限路線：加 S 蛋 → 放進欄位 → 跳 +5 分孵化 → 每階段餵到最低次數（餵食冷卻 15 分，可用 +5 分鐘 ×3）→ 跳到到期。成形體分歧看「幼化體」階段最高傾向（含天賦）；覺醒體分歧看「成形體」階段的條件。</p></div>`;
}
/* 第一次玩：3 步驟說明 */
function guideHtml() {
  return `<div class="gbox"><div class="gt">歡迎來到 異種孵化場！</div><div class="gs">只要 3 步：</div>
   <div class="gstep"><div class="gp">${eggImg('tutorial', 56)}</div><div><b>1. 孵蛋</b><p>把蛋放進飼養欄。蛋殼的光色暗示品階，每隻孵出來都不一樣！</p></div></div>
   <div class="gstep"><div class="gp">${sprite('R-001', '', 40)}<i>›</i>${sprite('R-003', '', 56)}</div><div><b>2. 照顧長大</b><p>用下方按鈕餵食、清潔。吃不同的食物，會進化成不同的樣子。</p></div></div>
   <div class="gstep"><div class="gp big">📖🕊️</div><div><b>3. 收集・放生</b><p>新型態會登錄到圖鑑。長大後放生，換素材買新蛋，再養下一隻！</p></div></div>
   <button class="btn big pri" data-a="guideClose">開始玩！</button><div class="note c">之後可以按右上角「？」再看一次</div></div>`;
}
function showGuide() { const g = $('#guide'); g.innerHTML = guideHtml(); g.classList.remove('hidden'); }

Object.assign(A, {
  pickEgg(i) {
    if (!S.eggs.length) { UI.tab = 'shop'; return render(); }
    if (S.eggs.length === 1) return A.place(S.eggs[0].id, i);
    modal(`<h3>選一顆蛋放進飼養欄 ${i + 1}</h3><div class="egglist">${S.eggs.map(e => `<div class="eggrow">${eggImg(e.type, 44)}<div><b>${eggName(e)}</b><div class="note">${e.type === 'tutorial' ? '品階固定 C' : e.rank ? '測試蛋' : oddsTxt(e.type) + (EGGS[e.type].lean ? `・天賦 ${T[EGGS[e.type].lean].zh}+3` : '')}</div></div><button class="btn pri" data-a="place" data-k="${e.id}" data-i="${i}">放入</button></div>`).join('')}</div><button class="btn wide" data-a="closeModal">取消</button>`);
  },
  sheetFeed(i) {
    const c = S.slots[i]; if (!c || c.stage < 0) return;
    const cool = Math.max(0, c.lastFeed + ASSUME.feedCooldownMin * MIN - S.game), fav = favFood(c);
    modal(`<h3>🍖 餵食 <small class="note">這階段 ${c.feeds}/${minFeed(c)} 次</small></h3>${cool ? `<p class="warn">😋 還很飽，${Math.ceil(cool / MIN)} 分鐘後再餵</p>` : ''}
      <div class="foods">${FOODS.map(x => `<button class="btn food ${fav === x.k ? 'fav' : ''}" data-a="feed" data-i="${i}" data-k="${x.k}" ${cool ? 'disabled' : ''} style="${x.t ? '--tc:' + T[x.t].c : ''}"><span class="fi">${FOOD_ICON[x.k]}</span><span class="fn">${x.zh}</span><span class="fd">${x.t ? `${T[x.t].zh}+${fav === x.k ? 2 : 1}・10金` : '免費'}</span>${fav === x.k ? '<em>❤ 最愛</em>' : ''}</button>`).join('')}</div>
      <p class="note">吃什麼就往那個方向長。❤ 是牠的最愛（個性${c.personality}），方向 +2。</p>`);
  },
  sheetEnv(i) {
    const c = S.slots[i]; if (!c) return; const envs = ENVS.filter(e => S.lab.envs[e.k]);
    modal(`<h3>🏠 住處 <small class="note">每住 1 小時，該方向 +1</small></h3><div class="envs">${envs.map(e => `<button class="btn env ${c.env === e.k ? 'on' : ''}" data-a="env" data-i="${i}" data-k="${e.k}">${ENV_ICON[e.k]} ${e.zh}<small>＋${T[e.t].zh}</small></button>`).join('')}${envs.length < ENVS.length ? `<button class="btn env ghostbtn" data-tab="shop">＋ 更多住處<small>商店解鎖</small></button>` : ''}</div>`);
  },
  sheetItems(i) {
    const c = S.slots[i]; if (!c) return; const paused = c.pausedUntil > S.game, can = !c.final || c.failed, ult = c.stage === 3 && (c.rank === 'S' || c.rank === 'SS');
    modal(`<h3>🎒 道具</h3><div class="ilist">${can ? `<button class="btn" data-a="lamp" data-i="${i}">💡 ${paused ? '關掉安眠燈' : '安眠燈'}<small>暫停成長 6 小時・持有 ${fmtN(S.items.lamp)}</small></button>
      <button class="btn" data-a="catalyst" data-i="${i}" ${c.catalystOn ? 'disabled' : ''}>🧪 變異觸媒${c.catalystOn ? '（使用中）' : ''}<small>下次進化異色 6%・持有 ${fmtN(S.items.catalyst)}</small></button>
      ${ult ? `<button class="btn" data-a="stab" data-i="${i}" ${c.stabilizerOn ? 'disabled' : ''}>⚗️ 進化穩定劑${c.stabilizerOn ? '（使用中）' : ''}<small>極限進化 +10%・持有 ${fmtN(S.items.stabilizer)}</small></button>` : ''}` : '<div class="note">牠已經長到最大，成長道具用不到了。</div>'}
      ${c.final && !c.failed ? '' : `<button class="btn ghostbtn" data-a="release" data-i="${i}">🕊️ 現在放生<small>現在放生也能換素材</small></button>`}</div><p class="note">道具可以在「商店」換。</p>`);
  },
  traitHelp(i) {
    const c = S.slots[i]; if (!c || c.stage < 0) return; const p = PERS[c.personality], d = S.dex[c.code] || {};
    modal(`<h3>🧬 ${F[c.code].zh} 的個體資料</h3><div class="kv">
      <span>個性</span><span>${p ? `${p[0]} ${c.personality}・最愛 ${FOOD_ICON[p[1]]} ${FOODS.find(x => x.k === p[1]).zh}（該方向 +2）` : '－'}</span>
      <span>天賦</span><span>${c.talent ? `${T[c.talent.t].zh} +${c.talent.n}（進入幼化體時加上，可能長成${F[FORMED[c.talent.t]].zh}）` : '－（v0.3 以前孵化）'}</span>
      <span>體型</span><span>${sizeCm(c)} cm・${sizeKg(c)} kg（倍率 ${(c.size || 1).toFixed(2)}${sizeTag(c.size || 1) ? '・' + sizeTag(c.size) : ''}）</span>
      <span>圖鑑紀錄</span><span>${d.max != null ? `最大 ${(STAGE_CM[c.stage] * d.max).toFixed(1)} cm・最小 ${(STAGE_CM[c.stage] * d.min).toFixed(1)} cm` : '－'}</span></div>
      <button class="btn big" data-a="closeModal">關閉</button>`);
  },
  slotSel(i) { UI.slot = i; UI.fade = true; render(); },
  lockInfo(j) { toast(j === 1 ? (S.tut.done ? '🔒 放生第 1 隻後開放' : '🔒 完成教學並放生第 1 隻後開放') : '🔒 研究員 Lv 5 開放（放生 28 隻）'); },
  tools() { UI.tools = !UI.tools; render(); },
  rankHelp() { modal(`<h3>品階是什麼？</h3><p>每隻怪獸的「品階」決定牠<b>最多能長到哪一階</b>：</p><ul><li><span class="rank D">D</span> <span class="rank C">C</span> → 最多到 成形體</li><li><span class="rank B">B</span> <span class="rank A">A</span> → 最多到 覺醒體</li><li><span class="rank S">S</span> <span class="rank SS">SS</span> → 有機會到 極限體</li></ul><p class="note">孵化前看蛋殼光色就能猜到：無光 D、淡綠 C、藍 B、紫 A、金 S、七彩 SS。品階越高，放生換到的金幣也越多。</p><button class="btn big pri" data-a="closeModal">知道了</button>`); },
  dexInfo(code) {
    const f = F[code], d = S.dex[code];
    if (!d?.seen) return modal(`<div class="c">${sprite(code, 'sil', 140)}</div><h3 class="c">？？？</h3><p class="note c">${STAGES[f.st]}${f.t ? '・' + T[f.t].zh + '系' : ''}。還沒遇到過，繼續養養看！</p><button class="btn big" data-a="closeModal">關閉</button>`);
    const pers = d.pers || [], cm = (v) => v == null ? '－' : (STAGE_CM[f.st] * v).toFixed(1) + ' cm';
    modal(`<div class="dexpic">${sprite(code, '', 150)}${d.shiny ? `<div class="shv">${sprite(code, 'shiny', 70)}<small>✦異色</small></div>` : ''}</div>
      <h3 class="c">${f.zh} <small class="note">${f.code} ${f.en}</small></h3><p class="c note">${STAGES[f.st]}${f.t ? '・' + T[f.t].zh + '系' : '・基本型'}</p>
      <div class="drec"><div><small>最高品階</small><b><span class="rank ${d.best}">${d.best}</span></b></div><div><small>異色</small><b>${d.shiny ? '<span class="good">✦ 見過</span>' : '還沒'}</b></div>
      <div><small>最大紀錄</small><b>${cm(d.max)}${d.max >= SIZE_BIG ? ' 🏆' : ''}</b></div><div><small>最小紀錄</small><b>${cm(d.min)}${d.min != null && d.min <= SIZE_SMALL ? ' 🏆' : ''}</b></div></div>
      <div class="lbl">遇過的個性 ${pers.length}/8</div><div class="pers">${PERSONALITY.map(p => `<span class="${pers.includes(p) ? 'on' : ''}">${pers.includes(p) ? PERS[p][0] + ' ' + p : '？'}</span>`).join('')}</div>
      <button class="btn big" data-a="closeModal">關閉</button>`);
  },
  probOpen() { UI.back = UI.tab === 'prob' ? UI.back : UI.tab; UI.probSlot = null; UI.tab = 'prob'; UI.fade = true; render(); },
  probBack() { UI.tab = UI.back || 'shop'; UI.fade = true; render(); },
  devTab() { UI.tab = UI.tab === 'dev' ? 'lab' : 'dev'; UI.tools = false; UI.fade = true; render(); },
  devClose() { UI.tab = 'lab'; render(); },
  guide() { showGuide(); },
  guideClose() { S.guide = true; $('#guide').classList.add('hidden'); save(); },
});
A.tab = (t) => { UI.tab = t; UI.tools = false; UI.fade = true; if (t === 'dex') { S.tut.dex = true; tutCheck(); } render(); };
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
  const html = v(), view = $('#view');
  if (html !== lastHtml) { lastHtml = html; const tpl = document.createElement('main'); tpl.innerHTML = html; morph(view, tpl); }
  if (UI.fade) { UI.fade = false; view.classList.remove('fade'); void view.offsetWidth; view.classList.add('fade'); }
  const bar = UI.tab === 'lab' ? actionBar(S.slots[UI.slot], UI.slot) : '';
  setHTML($('#abar'), bar); document.body.classList.toggle('hasbar', !!bar);
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
/* 孵化揭曉（扭蛋式）：蛋搖晃→裂開→依品階爆光→品階徽章→個性／天賦／體型 一行一行出現。點一下：先跳到揭曉，再點一下收下 */
const RANK_FX = { D: 0, C: 6, B: 12, A: 18, S: 28, SS: 44 };
function burstFx(rank, shiny, calm) {
  const n = calm ? Math.ceil(RANK_FX[rank] / 2) : RANK_FX[rank]; let h = rank === 'D' ? '<div class="puff"></div>' : `<div class="rays"></div><div class="ring"></div>`;
  for (let k = 0; k < n; k++) { const a = Math.random() * 360, d = 90 + Math.random() * 120, hue = Math.floor(Math.random() * 360); h += `<i class="pt" style="--a:${a.toFixed(0)}deg;--d:${d.toFixed(0)}px;--h:${hue};--dl:${(Math.random() * .25).toFixed(2)}s"></i>`; }
  if (shiny) for (let k = 0; k < 10; k++) h += `<i class="st" style="left:${(10 + Math.random() * 80).toFixed(0)}%;top:${(15 + Math.random() * 55).toFixed(0)}%;--dl:${(Math.random() * 1.2).toFixed(2)}s">✦</i>`;
  if (!calm && RANKS.indexOf(rank) >= 2) h += '<div class="flash"></div>';
  return h;
}
function hatchShow(e, el, done, timers) {
  const R = e.rank, ri = RANKS.indexOf(R); let state = 0;
  el.className = `hatch r-${R}${e.shiny ? ' sh' : ''}${S.calm ? ' calm' : ''}`;
  el.innerHTML = `<div class="hfx"></div><div class="stagebox"><div class="hegg">${eggShell(e.eggType, R, e.shiny, .3, 170)}</div></div><div class="title">蛋要孵化了……</div><div class="hinfo"></div><div class="skip">點一下揭曉</div>`;
  const egg = el.querySelector('.hegg');
  timers.push(setTimeout(() => { egg.innerHTML = eggShell(e.eggType, R, e.shiny, .6, 170); egg.classList.add('sh1'); }, 650));
  timers.push(setTimeout(() => { egg.innerHTML = eggShell(e.eggType, R, e.shiny, 1, 170); egg.classList.add('sh2'); el.querySelector('.title').textContent = ri >= 4 ? '這、這個光是……！？' : ri >= 2 ? '有光透出來了……！' : '快出來了……'; }, 1350));
  const t = e.talent, p = PERS[e.pers], tag = sizeTag(e.size || 1), cm = Math.round(STAGE_CM[0] * (e.size || 1) * 10) / 10, kg = Math.round(STAGE_KG[0] * Math.pow(e.size || 1, 3) * 100) / 100;
  const lines = [
    p ? `<div class="hl">${p[0]} 個性 <b>${e.pers}</b><small>最愛 ${FOOD_ICON[p[1]]}</small></div>` : '',
    t ? `<div class="hl" style="--tc:${T[t.t].c}">🧬 天賦 <b>${T[t.t].zh} +${t.n}</b><small>→ 可能長成${F[FORMED[t.t]].zh}</small></div>` : '',
    `<div class="hl">📏 <b>${cm} cm・${kg} kg</b>${tag ? `<em class="big">${tag}！</em>` : ''}${e.rec ? `<em class="rec">🏆 ${e.rec === 'max' ? '最大' : '最小'}新紀錄</em>` : ''}</div>`,
    e.first ? '<div class="hl new">✨ 新登錄到圖鑑！</div>' : ''].filter(Boolean);
  const reveal = (instant) => {
    if (state) return; state = 1; timers.forEach(clearTimeout); timers.length = 0;
    el.classList.add('rev'); el.querySelector('.hfx').innerHTML = burstFx(R, e.shiny, S.calm);
    el.querySelector('.stagebox').innerHTML = `<div class="hmon">${sprite('R-001', e.shiny ? 'shiny' : '', Math.round(150 * (1 + ((e.size || 1) - 1) * .5)))}</div><div class="rbadge r-${R}"><b>${R}</b><small>${RANK_ZH[R]}</small></div>`;
    el.querySelector('.title').innerHTML = `${e.shiny ? '<span class="shline">✦ 異色個體 ✦</span>' : ''}孵化了！${F['R-001'].zh}`;
    el.querySelector('.skip').textContent = '點一下收下牠';
    const box = el.querySelector('.hinfo');
    lines.forEach((h, k) => { if (instant) box.insertAdjacentHTML('beforeend', h); else timers.push(setTimeout(() => box.insertAdjacentHTML('beforeend', h), 600 + k * 350)); });
    timers.push(setTimeout(done, 12000));
  };
  timers.push(setTimeout(() => reveal(false), 2100));
  el.onclick = () => { if (!state) reveal(true); else done(); };
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
    if (e.hatch) return hatchShow(e, el, done, timers);
    const box = (h) => `<div class="stagebox">${h}</div>`;
    const skip = '<div class="skip">點一下畫面跳過</div>';
    if (e.fail) { el.innerHTML = box(sprite(e.code, e.shiny ? 'shiny' : '', 200)) + `<div class="title">極限進化沒成功（機率 ${e.p}%）</div><div class="sub">保持覺醒體，可以放生或重新挑戰</div><div class="skip">點一下繼續</div>`; timers.push(setTimeout(done, 4000)); return; }
    const isHatch = e.from === 'EGG';
    el.innerHTML = box(`<div class="cocoon"></div>`) + `<div class="title">${isHatch ? '蛋要孵化了……' : '牠要進化了……'}</div><div class="sub"></div>${skip}`;
    timers.push(setTimeout(() => { el.querySelector('.stagebox').innerHTML = sprite(e.code, 'sil', 200); el.querySelector('.title').textContent = '？？？'; }, 2500));
    timers.push(setTimeout(() => { el.insertAdjacentHTML('beforeend', '<div class="flash"></div>'); el.querySelector('.stagebox').innerHTML = sprite(e.code, e.shiny ? 'shiny' : '', 200); }, 5000));
    timers.push(setTimeout(() => { el.querySelector('.title').innerHTML = `${isHatch ? '孵化了！' : '進化成'} ${f.zh} <span class="rank ${e.rank}">${e.rank}</span>${e.shiny ? ' ✦異色' : ''}`; el.querySelector('.sub').textContent = `${STAGES[f.st]}${e.first ? '・✨ 新登錄到圖鑑！' : ''}${e.rec ? `・🏆 體型${e.rec === 'max' ? '最大' : '最小'}紀錄（${e.cm} cm）` : ''}`; }, 5800));
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
load(); $('#ver').textContent = VERSION; { const f = S.slots.findIndex(Boolean); UI.slot = f < 0 ? 0 : f; } render(); if (!S.guide && !DEV_URL) showGuide(); else playCeremonies(); if (loadNote) toast(loadNote);
setInterval(tick, 250);
