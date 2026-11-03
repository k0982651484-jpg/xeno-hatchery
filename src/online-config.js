/* 在線人數設定（Firebase Realtime Database）
   ・專案：xeno-hatchery（資料庫位置 us-central1）。這些值本來就會公開在網頁裡，不是密碼；安全靠資料庫規則（firebase-rules.json）。
   ・想關掉在線人數：把下面整段換成 window.XH_FIREBASE = null;
   詳細說明見 ONLINE_SETUP.md。
*/
window.XH_FIREBASE = {
  apiKey: "AIzaSyCJZ9X2Z3ttfbq3rQ61K1gVlX0gbEmxDpo",
  authDomain: "xeno-hatchery.firebaseapp.com",
  databaseURL: "https://xeno-hatchery-default-rtdb.firebaseio.com",
  projectId: "xeno-hatchery",
  storageBucket: "xeno-hatchery.firebasestorage.app",
  messagingSenderId: "367794726427",
  appId: "1:367794726427:web:55c894c41081012698fabe"
};
