/* 在線人數設定（Firebase Realtime Database）
   ・保持 null：不顯示在線人數，遊戲照常玩。
   ・要開啟：把 Firebase 主控台「專案設定 → 一般 → 你的應用程式 → SDK 設定」裡的 firebaseConfig 貼過來，
     一定要有 databaseURL。詳細步驟見 ONLINE_SETUP.md。

   範例（把 null 換成這樣）：
   window.XH_FIREBASE = {
     apiKey: "AIza....",
     authDomain: "你的專案.firebaseapp.com",
     databaseURL: "https://你的專案-default-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "你的專案",
     appId: "1:1234567890:web:abcdef"
   };
*/
window.XH_FIREBASE = null;
