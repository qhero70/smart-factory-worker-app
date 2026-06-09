# 智慧製造中央作戰指揮中心

此 GitHub 專案已整理為乾淨正式版，目前版本：**v1.5.4｜報工作業v2部署檢查版**。

## 主要入口

- GitHub Pages 首頁：`docs/index.html`
- 手機 PWA：`docs/app.html`
- 報工作業v2：`docs/work-report-v2.html`
- 報工作業v2送出程式：`docs/work-report-v2-submit.js`
- 正式專案檔：`smart-factory-command-center/`
- GAS 主後端：`smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs`
- GAS 維護工具：`smart-factory-command-center/01_GAS後端/系統維護工具.gs`

## 系統架構

```text
Google Sheets 主資料庫
+ Google Apps Script 後端
+ HTML5 PWA 前端
+ LINE Bot 單一入口
```

## v1.5.4 已完成

- `智慧製造中央作戰指揮中心.gs` 已新增 Web API action：`報工作業v2部署檢查`
- `報工作業v2部署檢查_()` 只檢查部署，不寫入任何報工資料
- `docs/work-report-v2-submit.js` 已新增 `checkDeploy()`
- `docs/work-report-v2.html` 已新增「部署檢查」按鈕
- `docs/work-report-v2.html` 已更新 JS 版本號為 `20260610_02`，避免 GitHub Pages 快取舊版
- `docs/work-report-v2-submit.js` 的送出報工仍呼叫 `寫入報工作業v2_化新班別版`
- `寫入報工作業v2_化新班別版(p)` 保留必填檢查、化新班別判斷、報工寫入與工單回扣
- 保留既有 `新增報工_()`，不破壞原本報工資料結構

## 目前保留內容

```text
README.md
.nojekyll
docs/
smart-factory-command-center/
```

舊的 Node / Expo / PostgreSQL / Redis / apps monorepo 架構已從 main 主線移除。

## 上線複製順序

1. 複製 `smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs` 到 Apps Script 的同名主檔。
2. 複製 `smart-factory-command-center/01_GAS後端/系統維護工具.gs` 到同一個 Apps Script 專案。
3. 執行 `初始化_智慧製造中央作戰指揮中心()`。
4. 部署 GAS Web App。
5. 開啟 `docs/work-report-v2.html`。
6. 貼上 GAS Web App URL。
7. 按「儲存GAS網址」。
8. 按「部署檢查」。
9. 按「載入主檔下拉」。
10. 填寫一筆報工測試資料後按「送出報工」。

## 報工作業v2部署檢查標準

按「部署檢查」成功時，畫面回傳 JSON 應包含：

```json
{
  "成功": true,
  "訊息": "報工作業v2部署檢查通過，可以送出報工",
  "action": "報工作業v2部署檢查",
  "報工action": "寫入報工作業v2_化新班別版",
  "不寫入資料": true
}
```

部署檢查會確認以下工作表與欄位：

```text
09_報工紀錄
10_工單主檔
01_人員主檔
02_產品主檔
03_機台主檔
04_工站主檔
```

## 報工作業v2送出標準測試

送出成功時，畫面回傳 JSON 應包含：

```json
{
  "成功": true,
  "訊息": "報工作業v2化新班別版寫入完成",
  "後端函數": "寫入報工作業v2_化新班別版"
}
```

Google Sheets 應確認：

```text
09_報工紀錄：新增一筆報工資料
10_工單主檔：同工單編號的已完成量與不良量已回扣
```
