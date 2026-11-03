# 異種孵化場 Xeno Hatchery

原創異種怪獸的放置養成網頁遊戲原型（**v0.5**：改成「養豬場MIX」式的飼養圈玩法，詳見 CHANGES_v0.5.md；在線人數設定見 ONLINE_SETUP.md；舊版紀錄見 CHANGES_v0.2～v0.4.md）。

核心玩法：放蛋 → 肚子餓了就餵 → 長好就出貨換金幣 → 登錄圖鑑、解鎖更多格子 → 衝稀有／傳說／史詩。

## 執行
用瀏覽器打開 `src/index.html` 即可（純 HTML/JS，存檔在 localStorage，關掉遊戲也會照常長大）。
建議用本機伺服器開（例如 `python3 -m http.server`），異色／閃光的換色效果最完整；直接開檔案也能玩。
`./build.sh` 會把 `src/` 複製成 `dist/` 作為發佈版本。

## 內容
- `src/index.html`、`style.css`：手機直式介面（飼養圈、圖鑑、商店、任務、排行五個分頁）
- `src/game.js`：遊戲規則、時間、存檔、離線進度、任務、測試工具
- `src/pen.js`：飼養圈動畫（多隻怪獸同時走動、吃飯、表情泡泡、孵化與出貨特效、異色／閃光換色）
- `src/online.js`、`online-config.js`：右上角「在線人數」（Firebase，只寫 /presence）
- `src/img/`：角色與蛋的圖
- `art/`：爬蟲系 22 隻定稿美術

## 進化階段
蛋 → 初胚體 → 幼化體 → 成形體（普通，可出貨）→ 覺醒體（稀有）→ 極限體（傳說／史詩）
