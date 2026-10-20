# RT 值班模擬

呼吸治療師（RT）值班模擬遊戲。純 HTML/JS，不需要伺服器，直接用瀏覽器打開 `game/index.html` 就能玩。

玩法參考 [我熱愛值班](https://drcharming.net/game)：16:00 接班到 08:00 交班，時間會流動，護理師或醫師來電後到床邊看呼吸器、生命徵象、ABG，選擇處置，最後結算分數。

## 目前內容

- `game/index.html`：遊戲原型（俯視病房地圖），內含一個**虛構**示範案例（4 床、7 通電話）。方向鍵／WASD 或點地圖移動，E 互動；病人會即時惡化，拖太久會 Code Blue。

## 案例資料

案例是一段 JSON（目前嵌在 `index.html` 的 `<script id="caseData">`），格式：

- `beds[]`：`bed`（遊戲用床號，如 A1）、`age`（年齡區間）、`sex`、`dx`、`device`、`airway`、`admitDay`、`vent` / `hfnc`、`vitals`、`note`
- `events[]`：`t`（HH:MM）、`bed`、`caller`、`msg`、`timeout`（分鐘）、`state`（事件當下的呼吸器 / 生命徵象 / ABG / 警報 / 波形類型）、`finding`、`question`、`options[]`（`text`、`score`、`fb`、`effect`）、`followup`、`real`（實際處置）、`teach`

真實案例之後由 his-crawler 的 `case_generator.py` 在院內電腦產生時間軸，再人工撰寫題目、審核後才放進遊戲。

## 去識別化規則

- 不得出現姓名、病歷號、住院號、真實床號
- 日期改為相對時間（住院第 N 天 HH:MM）
- 年齡只留 10 歲區間
- 護理自由文字不直接放入，改寫成摘要
- 原始 HIS / Maya 資料不進這個 repo（見 `.gitignore`）
