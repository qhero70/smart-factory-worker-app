# 智慧製造中央作戰指揮中心

目前正式基準：**v1.7.5｜38_LINE 指令中心 Rich Menu 快捷按鈕優化完成｜38.5 GAS 主檔與模組整理盤點中**。

本專案是製造部智慧製造中央作戰系統，不是單一報工表單，也不是單一 LINE Bot。核心包含：

```text
Google Sheets 中央資料庫
Google Apps Script 後端 API
LINE Bot 指令中心與 Rich Menu
GitHub Pages PWA 行動入口
報工、派班、工單、戰情、AI 摘要模組
```

---

## 一、目前版本定位

| 項目 | 狀態 |
|---|---|
| 正式基準 | v1.7.5 |
| 已完成階段 | 38_LINE 指令中心 Rich Menu 快捷按鈕優化 |
| 目前階段 | 38.5_GAS 主檔與模組整理盤點 |
| 下一階段 | 先做 38.6 主後端 doPost 同步 37 接線，再進 39 |
| 39 原則 | 只能補強 26，不可重做每日推播 |

---

## 二、GitHub 主要資料夾

```text
README.md
.nojekyll
docs/
smart-factory-command-center/01_GAS後端/
smart-factory-command-center/02_HTML前端/
smart-factory-command-center/03_部署文件/
```

### docs/

GitHub Pages PWA 前端資料夾。

重點檔案：

```text
docs/app.html
docs/index.html
docs/pwa-config.js
docs/gas-bridge.js
docs/manifest.webmanifest
```

`docs/app.html` 會讀取：

```text
docs/pwa-config.js
docs/gas-bridge.js
```

正式 GAS Web App URL 固定放在：

```text
docs/pwa-config.js
GAS_WEB_APP_URL
```

### smart-factory-command-center/01_GAS後端/

GAS 主程式與各正式模組來源。

新增索引：

```text
smart-factory-command-center/01_GAS後端/00_GAS模組索引.md
```

### smart-factory-command-center/02_HTML前端/

GAS HTML 前端來源。

核心檔案：

```text
07_報工作業V2.html
```

### smart-factory-command-center/03_部署文件/

部署、盤點、架構與版本紀錄。

目前正式盤點文件：

```text
00_目前進度盤點_架構與GAS整理報告_v1.7.5.md
38.5_GAS主檔與模組整理盤點_v1.7.5.md
```

---

## 三、目前最重要風險

GitHub 主檔：

```text
smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs
```

目前仍顯示 v1.6.8，doPost 尚未同步 37 最新接線。

目前主檔 doPost 只看得到：

```text
31_LINE 主管戰情日期快選
→ 30_LINE 主管戰情直連
→ 一般 LINE Webhook
```

正確 doPost 接線基準在：

```text
smart-factory-command-center/01_GAS後端/37_LINE_主後端doPost正式替換段.gs
```

正確順序：

```text
37_LINE 指令中心
→ 34_LINE 角色選單分流
→ 33_LINE 身份權限檢查
→ 31_LINE 主管戰情日期快選
→ 30_LINE 主管戰情直連
→ 一般 LINE Webhook
```

---

## 四、GAS 主線模組

### 核心主檔

```text
智慧製造中央作戰指揮中心.gs
系統維護工具.gs
appsscript.json
```

### 報工、派班、工單主線

```text
07_報工作業V2.html
報工PWA_V2_正式整合版.gs
09報工V2_欄位對齊登入正式模組.gs
11_需求池轉工單正式模組.gs
12_拆工單正式模組.gs
13_工單主檔修復重建正式模組.gs
14_工單欄位格式重建狀態正式模組.gs
15_排程池口吻查重正式模組.gs
16_品名補正正式模組.gs
17_排程補齊工作台正式模組.gs
19_派班需求轉自動派班正式模組.gs
20_今日派班整理正式模組.gs
21_今日派班報工對接正式模組.gs
22_派班報工防重複超量保護.gs
23_派班報工巡檢修復正式模組.gs
24_派班報工每日結算正式模組.gs
```

### 戰情、AI、每日推播

```text
25_AI戰情摘要資料源.gs
26_LINE每日戰情推播正式模組.gs
27_每日自動化排程觸發器正式模組.gs
28_主管戰情看板API正式模組.gs
29_主管戰情看板入口整合正式模組.gs
30_LINE主管戰情直連回覆正式版.gs
31_LINE主管戰情日期快選正式模組.gs
```

### LINE 權限、角色分流、指令中心、Rich Menu

```text
32_LINE_RichMenu_主管入口與快捷選單.gs
33_LINE_主管權限與身份綁定.gs
34_LINE_使用者角色分流與一般員工選單.gs
34_LINE_一般員工RichMenu建立.gs
36_LINE_角色選單維護與權限異常修復工具.gs
37_LINE_指令中心與快捷指令總表.gs
38_LINE_指令中心RichMenu快捷按鈕優化.gs
```

---

## 五、不可刪除規則

目前全部先保留，不做刪除。

特別注意：

```text
26_LINE每日戰情推播正式模組.gs 是每日推播主引擎，不可刪、不可重做。
37_LINE_主後端doPost正式替換段.gs 是目前最新 doPost 基準，不可刪。
32～38 是目前 LINE 權限、選單、指令中心主線，不可直接刪。
```

待封存與待比對的完整清單請看：

```text
smart-factory-command-center/01_GAS後端/00_GAS模組索引.md
smart-factory-command-center/03_部署文件/38.5_GAS主檔與模組整理盤點_v1.7.5.md
```

---

## 六、正式架構

```text
LINE 使用者
  ↓
Rich Menu 主管入口 / 一般員工入口
  ↓
GAS Web App doPost(e)
  ↓
37_LINE 指令中心
  ↓
34_LINE 角色選單分流
  ↓
33_LINE 身份權限檢查
  ↓
31_LINE 主管戰情日期快選
  ↓
30_LINE 主管戰情直連
  ↓
一般 LINE Webhook / API Handler
  ↓
Google Sheets 中央作戰資料庫
```

PWA：

```text
docs/app.html
  ↓
docs/pwa-config.js
  ↓
docs/gas-bridge.js
  ↓
GAS Web App URL
```

報工：

```text
報工作業 V2
  ↓
09_報工
  ↓
09_不良紀錄
  ↓
10_工單主檔 / 今日派班 / 每日結算
```

---

## 七、部署基本設定

GAS Web App 部署：

```text
執行身分：我
誰可以存取：任何人
```

LINE Developers：

```text
Use webhook：開啟
Auto-reply messages：關閉
Greeting messages：可關閉
```

---

## 八、目前測試標準

### GAS 後端

```text
健康檢查
主檔檢查
初始化33_LINE主管權限與身份綁定
初始化37_LINE指令中心與快捷指令總表
測試34_LINE角色分流_本機規格
測試38_LINE快捷RichMenu_本機規格
```

### LINE 指令

```text
指令
主管指令
員工指令
我的狀態
選單說明
權限檢查
選單更新
主管戰情
今日戰情
昨日戰情
報工作業
```

---

## 九、下一步

目前不要進 39。下一步先做：

```text
38.6_主後端 doPost 同步 37 最新接線
```

完成 38.6 並測試通過後，再做：

```text
39_LINE 每日戰情推播升級與主管提醒補強
```

39 只補強 26，不重做 26。
