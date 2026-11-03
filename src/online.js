/* 異種孵化場 v0.4：同時在線人數（Firebase Realtime Database presence）
   每個開著遊戲的分頁在 /presence/<隨機 id> 寫一筆 {t: 伺服器時間}，每 60 秒更新一次，關掉時自動刪除。
   畫面上的人數＝2 分鐘內有更新的筆數。任何錯誤都只會讓頂部顯示「在線 —」，不會影響遊戲。 */
(function () {
  'use strict';
  var cfg = window.XH_FIREBASE, chip = document.getElementById('online');
  if (!chip) return;
  function show(t, off) { chip.textContent = t; chip.classList.remove('hidden'); chip.classList.toggle('off', !!off); }
  if (!cfg || !cfg.databaseURL) return;   // 沒設定：不顯示
  var SDK = 'https://www.gstatic.com/firebasejs/12.6.0/';
  var WINDOW_MS = 2 * 60 * 1000, BEAT_MS = 60 * 1000;
  var fail = function (e) { try { console.warn('[online]', e && e.message || e); } catch (_) {} show('在線 —', true); };
  var ok = false;
  show('🟢 在線 …');
  var timeout = setTimeout(function () { if (!ok) fail('連線逾時'); }, 15000);
  function load(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = function () { rej(new Error('載入失敗 ' + src)); }; document.head.appendChild(s); }); }
  function newId() { var a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', s = ''; for (var i = 0; i < 20; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function start() {
    var fb = window.firebase;
    var app = (fb.apps && fb.apps.length) ? fb.app() : fb.initializeApp(cfg);
    var db = app.database(), id = newId(), me = db.ref('presence/' + id), all = db.ref('presence');
    var offset = 0, snapVal = {}, TS = fb.database.ServerValue.TIMESTAMP;
    db.ref('.info/serverTimeOffset').on('value', function (s) { offset = s.val() || 0; });
    var beat = function () { me.set({ t: TS }).catch(fail); };
    db.ref('.info/connected').on('value', function (s) {
      if (s.val() !== true) return;
      me.onDisconnect().remove().then(beat).catch(fail);
    });
    setInterval(function () { if (!document.hidden) beat(); }, BEAT_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) beat(); });
    window.addEventListener('pagehide', function () { try { me.remove(); } catch (_) {} });
    var count = function () {
      var now = Date.now() + offset, n = 0;
      for (var k in snapVal) { var v = snapVal[k]; if (v && typeof v.t === 'number' && v.t > now - WINDOW_MS) n++; }
      ok = true; clearTimeout(timeout); show('🟢 在線 ' + Math.max(n, 1) + ' 人');
    };
    all.on('value', function (s) { snapVal = s.val() || {}; count(); }, fail);
    setInterval(function () { if (ok) count(); }, 30000);
  }
  try {
    var p = window.firebase && window.firebase.database ? Promise.resolve() : load(SDK + 'firebase-app-compat.js').then(function () { return load(SDK + 'firebase-database-compat.js'); });
    p.then(function () { try { start(); } catch (e) { fail(e); } }, fail);
  } catch (e) { fail(e); }
})();
