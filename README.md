# 智慧製造中央作戰指揮中心

目前版本：**v1.6.1｜乾淨正式版｜報工作業V2 + LINE Bot + PWA 整併版**。

## 版本定位

本版是 main 主線正式可部署版。前面所有補丁、測試版、舊 LINE 分離檔、舊 GitHub Pages 報工頁都已從 main 清理。

## GitHub main 正式保留檔案

### GAS 後端

```text
smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs
smart-factory-command-center/01_GAS後端/系統維護工具.gs
```

`智慧製造中央作戰指揮中心.gs` 已內建：

```text
doGet
doPost
LINE Bot Webhook
初始化_智慧製造中央作戰指揮中心
取得報工作業v2初始資料
寫入報工作業v2
主檔檢查
戰情
AI摘要
報工入口
指令
```

### GAS HTML 前端

```text
smart-factory-command-center/02_HTML前端/07_報工作業V2.html
```

### PWA

```text
docs/index.html
docs/app.html
docs/manifest.webmanifest
```

## 已從 main 移除的舊檔

```text
smart-factory-command-center/01_GAS後端/v3_0_GAS主控入口與LINE最終整合版.gs
smart-factory-command-center/01_GAS後端/LINEBot_FlexMessage主選單.gs
smart-factory-command-center/01_GAS後端/ZZ_API路由補丁.gs
smart-factory-command-center/01_GAS後端/04_工站關聯正式寫入.gs
smart-factory-command-center/01_GAS後端/05_GAS_API_04工站資料對接.gs
smart-factory-command-center/01_GAS後端/08_工站途程機台主檔_機台編號修復工具.gs
smart-factory-command-center/01_GAS後端/07_報工作業v2_化新班別規則_短版.gs
smart-factory-command-center/01_GAS後端/報工作業V2_後端.gs
smart-factory-command-center/01_GAS後端/ZZ_報工作業V2_送出修正版.gs
docs/work-report-v2.html
docs/work-report-v2-submit.js
docs/work-report-v2.css
```

## Apps Script 重建方式

Apps Script 左側最後只保留或重建：

```text
appsscript.json
智慧製造中央作戰指揮中心.gs
系統維護工具.gs
07_報工作業V2.html
```

不要再貼任何：

```text
ZZ_ 開頭檔案
v3_0_GAS主控入口與LINE最終整合版.gs
LINEBot_FlexMessage主選單.gs
ZZ_API路由補丁.gs
報工作業V2_後端.gs
任何補丁、修正版、測試版
```

### 1. 貼主後端

複製：

```text
smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs
```

貼到 Apps Script：

```text
智慧製造中央作戰指揮中心.gs
```

### 2. 填 LINE Token

在主後端上方填入：

```javascript
LINE_CHANNEL_ACCESS_TOKEN: '你的 LINE Channel access token',
```

若未填 token，GAS 仍會收到 LINE Webhook，但 LINE 不會回覆訊息。

### 3. 貼維護工具

複製：

```text
smart-factory-command-center/01_GAS後端/系統維護工具.gs
```

貼到 Apps Script：

```text
系統維護工具.gs
```

### 4. 貼 HTML

Apps Script 左側新增 HTML 檔，名稱輸入：

```text
07_報工作業V2
```

複製：

```text
smart-factory-command-center/02_HTML前端/07_報工作業V2.html
```

貼進 HTML 檔。

### 5. 初始化

執行：

```text
初始化_智慧製造中央作戰指揮中心
```

### 6. 部署 Web App

部署設定：

```text
執行身分：我
誰可以存取：任何人
```

## 正式網址

### LINE Bot Webhook URL

貼到 LINE Developers：

```text
你的 GAS Web App URL
```

範例：

```text
https://script.google.com/macros/s/部署ID/exec
```

### 報工作業V2 URL

```text
你的 GAS Web App URL?page=07_報工作業V2
```

### PWA URL

```text
https://qhero70.github.io/smart-factory-worker-app/app.html
```

PWA 開啟後貼上 GAS Web App URL，可開啟報工 V2，也可做後端健康檢查。

## LINE Bot 指令

```text
主檔檢查
戰情
AI摘要
報工
指令
```

LINE Developers 設定：

```text
Use webhook：開啟
Auto-reply messages：關閉
Greeting messages：可關閉
```

## 報工送出成功標準

畫面顯示：

```text
報工完成：RFV2-xxxxxxxxxxxx-xxx
```

Google Sheets 檢查：

```text
09_報工：新增一筆報工資料
09_不良紀錄：若不良數大於 0，新增一筆不良資料
10_工單主檔：若有工單編號，回扣已完成量與不良量
```

## 注意

`寫入報工作業v2(data)` 是給 HTML 前端呼叫的函數，不要在 Apps Script 上方手動執行。手動執行時沒有 data，會出現工號空白，這不是前端錯誤。
