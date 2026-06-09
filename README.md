# 智慧製造中央作戰指揮中心

此 GitHub 專案已整理為乾淨正式版，目前版本：**v1.5.5｜GAS HTML 報工作業V2入口版**。

## 主要入口

- GitHub Pages 首頁：`docs/index.html`
- 手機 PWA：`docs/app.html`
- 舊 GitHub Pages 報工作業v2：`docs/work-report-v2.html`
- 正式專案檔：`smart-factory-command-center/`
- GAS 主後端：`smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs`
- GAS 維護工具：`smart-factory-command-center/01_GAS後端/系統維護工具.gs`
- GAS 報工作業V2後端：`smart-factory-command-center/01_GAS後端/報工作業V2_後端.gs`
- GAS 報工作業V2前端：`smart-factory-command-center/02_HTML前端/07_報工作業V2.html`

## 系統架構

```text
Google Sheets 主資料庫
+ Google Apps Script 後端
+ GAS HTML 前端
+ LINE Bot 單一入口
```

## v1.5.5 已完成

- 主入口 `智慧製造中央作戰指揮中心.gs` 已支援 HTML 頁面路由
- Web App 可用 `?page=07_報工作業V2` 開啟正式報工頁
- 新增 `smart-factory-command-center/02_HTML前端/07_報工作業V2.html`
- 新增 `smart-factory-command-center/01_GAS後端/報工作業V2_後端.gs`
- 補上 `取得報工作業v2初始資料()`
- 補上 `寫入報工作業v2(data)`
- 前端使用 `google.script.run`，不需要再貼 GAS Web App URL
- 報工寫入仍回到 `09_報工紀錄`
- 若有工單編號，仍會回扣 `10_工單主檔`

## 目前保留內容

```text
README.md
.nojekyll
docs/
smart-factory-command-center/
```

舊的 Node / Expo / PostgreSQL / Redis / apps monorepo 架構已從 main 主線移除。

## GAS 上線複製順序

1. 複製 `smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs` 到 Apps Script 的同名主檔。
2. 複製 `smart-factory-command-center/01_GAS後端/系統維護工具.gs` 到同一個 Apps Script 專案。
3. 新增 GAS 指令碼檔案：`報工作業V2_後端.gs`。
4. 複製 `smart-factory-command-center/01_GAS後端/報工作業V2_後端.gs` 全部內容貼入。
5. 新增 GAS HTML 檔案：`07_報工作業V2`。
6. 複製 `smart-factory-command-center/02_HTML前端/07_報工作業V2.html` 全部內容貼入。
7. 執行 `初始化_智慧製造中央作戰指揮中心()`。
8. 部署 GAS Web App。

## GAS Web App 開啟報工作業V2

部署完成後，正式開啟網址為：

```text
你的 GAS Web App URL?page=07_報工作業V2
```

範例：

```text
https://script.google.com/macros/s/你的部署ID/exec?page=07_報工作業V2
```

## 報工作業V2標準測試

開啟頁面後，畫面應自動顯示：

```text
報工作業 v2
智慧製造中央作戰指揮中心｜正式讀取 08_工站途程機台主檔
```

資料載入成功時，狀態卡應顯示：

```text
🟢 資料已載入｜人員：... 筆｜報工工站群組：... 筆｜機台：... 筆｜照片索引：... 筆
```

送出成功時，畫面會提示：

```text
報工完成：RFV2-xxxxxxxxxxxx-xxx
```

Google Sheets 應確認：

```text
09_報工紀錄：新增一筆報工資料
10_工單主檔：同工單編號的已完成量與不良量已回扣
09_不良紀錄：若有不良數或不良原因，新增一筆不良紀錄
```
