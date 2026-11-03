# 同時在線人數 設定教學（Firebase）

畫面右上角的「🟢 在線 N 人」靠 Firebase Realtime Database（免費 Spark 方案就夠用）。
**沒設定時，這個標籤會自動隱藏，遊戲照常玩。** 設定只要做一次，大約 10 分鐘。

> ✅ **目前已經設定好了**（2026/11/3）：專案 `xeno-hatchery`、資料庫 `https://xeno-hatchery-default-rtdb.firebaseio.com`（位置 us-central1）、網頁應用程式「Xeno Hatchery Web」，規則已發布，`src/online-config.js` 已填好。下面的步驟只在要換專案或重新設定時才需要。

## 1. 建立專案
1. 打開 https://console.firebase.google.com ，按「新增專案」。
2. 名稱隨意（例如 `xeno-hatchery`）。Google Analytics 可以關掉。

## 2. 建立 Realtime Database
1. 左側選單 →「建構」→「Realtime Database」→「建立資料庫」。
2. 位置選 **asia-southeast1（新加坡）**，台灣連線比較快。
3. 安全性規則先選「以鎖定模式啟動」（第 4 步會換成我們的規則）。
4. 建好後，頁面上方會顯示資料庫網址，長得像：
   `https://你的專案-default-rtdb.asia-southeast1.firebasedatabase.app`
   （如果選美國，則是 `https://你的專案-default-rtdb.firebaseio.com`）

## 3. 註冊網頁應用程式，貼上設定
1. 專案總覽旁的齒輪 →「專案設定」→ 下方「你的應用程式」→ 點 `</>`（網頁）。
2. 暱稱隨意，**不用**勾 Firebase Hosting，按「註冊應用程式」。
3. 畫面會出現一段 `const firebaseConfig = { ... }`。
4. 打開 `src/online-config.js`，把 `window.XH_FIREBASE = null;` 換成（數值換成你的）：

```js
window.XH_FIREBASE = {
  apiKey: "AIza……",
  authDomain: "你的專案.firebaseapp.com",
  databaseURL: "https://你的專案-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "你的專案",
  appId: "1:1234567890:web:abcdef……"
};
```

- **`databaseURL` 一定要有**。Firebase 給的設定裡有時沒有這行，請從第 2 步的資料庫網址複製貼上。
- 其他欄位（storageBucket、messagingSenderId、measurementId）有或沒有都可以。
- 這些值本來就是公開在網頁裡的，不是密碼；安全靠第 4 步的規則。

## 4. 貼上安全性規則
1. Realtime Database →「規則」分頁。
2. 把內容全部換成 `firebase-rules.json` 的內容，按「發布」。
3. 這份規則只允許：每個玩家寫自己的一筆「我在線」時間（必須是伺服器時間），以及讀取在線名單。其他資料一律不能讀寫。

## 5. 上傳並確認
- 照平常方式執行 `build.sh`、上傳。打開遊戲，右上角應出現「🟢 在線 1 人」；用另一支手機或無痕視窗再開一次，會變 2 人。

## 補充說明
- 人數＝最近 **2 分鐘內** 有開著遊戲的人（每 1 分鐘回報一次；關掉分頁會馬上離開）。手機切到背景太久會暫時不算。
- 連不上（網路不好、被擋）時顯示「在線 —」，**不影響遊戲**。
- 自己永遠會被算進去，所以最少顯示 1 人。
- 想關掉這個功能：把 `online-config.js` 改回 `window.XH_FIREBASE = null;` 即可。
- 免費方案上限是同時 100 個連線；超過的人只會看到「在線 —」，遊戲仍正常。
