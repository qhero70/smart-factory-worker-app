# 智慧製造中央作戰指揮中心

目前版本：**v1.6.0｜乾淨正式版｜報工作業V2整併版**。

## 這一版的原則

這一版已把前面造成混亂的補丁檔整理掉，主線只保留正式版。

## 正式保留檔案

### GAS 後端

```text
smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs
smart-factory-command-center/01_GAS後端/系統維護工具.gs
```

其中 `智慧製造中央作戰指揮中心.gs` 已內建：

```text
doGet
doPost
初始化_智慧製造中央作戰指揮中心
取得報工作業v2初始資料
寫入報工作業v2
主檔檢查
戰情
AI摘要
```

不需要再貼任何：

```text
ZZ_ 開頭檔案
報工作業V2_後端.gs
送出修正版.gs
補丁.gs
測試版.gs
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

舊 GitHub Pages 報工頁已移除：

```text
docs/work-report-v2.html
docs/work-report-v2-submit.js
docs/work-report-v2.css
```

## Apps Script 重建方式

在 Apps Script 內先把混亂檔案刪乾淨，只保留或重建以下檔案：

```text
appsscript.json
智慧製造中央作戰指揮中心.gs
系統維護工具.gs
07_報工作業V2.html
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

### 2. 貼維護工具

複製：

```text
smart-factory-command-center/01_GAS後端/系統維護工具.gs
```

貼到 Apps Script：

```text
系統維護工具.gs
```

### 3. 貼 HTML

Apps Script 左側新增 HTML 檔，名稱輸入：

```text
07_報工作業V2
```

複製：

```text
smart-factory-command-center/02_HTML前端/07_報工作業V2.html
```

貼進 HTML 檔。

### 4. 初始化

執行：

```text
初始化_智慧製造中央作戰指揮中心
```

### 5. 部署 Web App

設定：

```text
執行身分：我
誰可以存取：任何人
```

### 6. 開啟報工作業V2

網址格式：

```text
你的 GAS Web App URL?page=07_報工作業V2
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
