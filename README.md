# RT 夜班 · 呼吸治療師版

一個用瀏覽器就能玩的 3D 值班遊戲。你是今晚的值班呼吸治療師（RT），一個人顧整層呼吸照護病房，從 17:00 值到隔天 08:00。電話會響：有的只是小事，有的是真的危險。到了床邊看監視器和呼吸器數值，用選的決定怎麼處理；選錯，病人會變差，錯太多會心跳停止。吃飯、睡覺、上廁所，都得自己找空檔。

> 以《我熱愛值班》範本製作 · [drcharming.net](https://drcharming.net/)
> 範本原始碼：[7harming/ilove-oncall-template](https://github.com/7harming/ilove-oncall-template)

## 先玩玩看

需要 Node.js 18 以上：

```bash
npm start      # 打開 http://127.0.0.1:8790/
npm test       # 檢查 game/public-cases.js
```

沒有 Node.js 的話：`python -m http.server 8790 --bind 127.0.0.1`。直接雙擊 `index.html` 不行，瀏覽器不讓本機檔案載入 JavaScript 模組。

網址加 `?debug`：按 `]` 快轉 30 分鐘，主控台有 `window.__ward`。

## 和範本不一樣的地方

- 玩家是值班 RT，護理師打給 RT。
- 床邊監視器多一列呼吸器數值（Mode、VT、FiO2、PEEP、Ppeak、VTe……），超出範圍的顯示紅字。資料寫在每個 `states` 的 `vent`。
- 監視器第四格多了 `cuff`（Cuff 壓力）、`lung`（兩側呼吸音）、`rox`（ROX index）。
- 抽血改成抽 ABG，15 分鐘後出報告。
- 五床病人（全部虛構）：痰造成的 high pressure／痰栓、張力性氣胸（DOPE）、HFNC 失敗（ROX）、氣切 cuff 漏氣、COPD auto-PEEP。
- 小事電話換成 RT 會接到的：吸入藥時間、鼻導管流量、咳嗽警報、BiPAP 面罩、管路積水、早上 ABG、家屬問拔管。

## 加一床病人

打開 `game/public-cases.js`，複製一床（例如 `CUFF`）改內容，加到最下面的 `PUBLIC_CASES`，再跑 `npm test`。欄位說明在檔案裡的註解和 `AGENTS.md`；可用的床號是 `03` `04` `06` `07` `08` `11` 房的 A、B、C 床。

## 真實案例與去識別化

之後的案例會由 his-crawler 在院內電腦產生去識別化的時間軸，再人工寫成題目、審過才放進來。規則：

- 不得出現姓名、病歷號、住院號、真實床號
- 日期改為相對時間（住院第 N 天 HH:MM）
- 年齡只留 10 歲區間
- 護理自由文字不直接放入，改寫成摘要
- 原始 HIS / Maya 資料不進這個 repo（見 `.gitignore`）

## 醫療內容

案例是教學情境，不是臨床指引。每一床上線前請資深 RT 或醫師看過。

## 授權

沿用範本授權，**不得商業使用**，要標示出處（詳見 [LICENSE.md](LICENSE.md)）：

- 程式碼（含佔位立繪）：PolyForm Noncommercial 1.0.0
- 文字：CC BY-NC-SA 4.0
- three.js：MIT
- 遊戲裡「以《我熱愛值班》範本製作 · drcharming.net」那一行必須保留；「我熱愛值班」這個名稱不能當成本遊戲的名字。
