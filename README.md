# 智慧製造中央作戰指揮中心

目前正式基準：**v1.7.5｜38.7 主線優化啟動｜NEXUS OS · 工業 5.0 智慧製造矩陣**。

本專案是製造部智慧製造中央作戰系統，不是單一報工表單，也不是單一 LINE Bot。

```text
Google Sheets 中央資料庫
Google Apps Script 後端 API
GitHub Pages PWA：NEXUS OS 主入口
LINE Bot：通知、註冊、查詢、主管戰情
報工、派班、工單、戰情、AI 摘要模組
```

---

## 一、目前版本定位

| 項目 | 狀態 |
|---|---|
| 正式基準 | v1.7.5 |
| 已完成 | 38.6 Git 同步 GAS 主後端 |
| 目前階段 | 38.7 主線優化第一輪 |
| 39 狀態 | 暫停 |
| 39 原則 | 只補強 26，不可重做每日推播 |

---

## 二、38.7 主線目標

```text
生產計劃表清洗
↓
產品品名修正
↓
10_排程需求池
↓
自動排程
↓
依人員規則派班
↓
今日任務
↓
作業員 PWA 報工
↓
09_報工 / 10_工單 / 21_派班報工回寫
```

---

## 三、PWA 主入口

正式入口：

```text
docs/app.html
```

首頁名稱：

```text
NEXUS OS
工業 5.0 智慧製造矩陣
製造部製一組｜智慧製造中央作戰指揮中心｜PWA 正式主入口
```

PWA 設定：

```text
docs/pwa-config.js
docs/manifest.webmanifest
docs/assets/icons/nexus-os.svg
```

正式 GAS Web App URL 固定放在：

```text
docs/pwa-config.js
GAS_WEB_APP_URL
```

---

## 四、38.7 新增與更新檔案

### 新增

```text
smart-factory-command-center/01_GAS後端/38_7_主線優化_唯一資料庫_計劃清洗_排班規則.gs
docs/assets/icons/nexus-os.svg
docs/work-report-v2-photo-fix-252.js
smart-factory-command-center/03_部署文件/38.7_主線優化需求盤點與方案_v1.7.5.md
smart-factory-command-center/03_部署文件/38.7_主線優化實作紀錄_v1.7.5.md
```

### 更新

```text
smart-factory-command-center/01_GAS後端/總控_38_6_doPost最終接線.gs
docs/app.html
docs/gas-bridge.js
docs/pwa-config.js
docs/manifest.webmanifest
README.md
```

---

## 五、38.7 GAS 動作

```text
健康檢查_主線優化38_7
初始化_主線優化38_7
初始化_唯一資料庫鎖定38_7
初始化_19_人員排班規則
清洗生產計劃表38_7
自動排程38_7
取得今日任務38_7
取得主線儀表板38_7
測試_主線優化38_7
```

---

## 六、排班硬規則

```text
幹部不排班
工程師不進一般作業員自動排程
主任不排班
助理工程師不排班
學生不加班
留職停薪不排班
不加班人員不可排加班
專責人員優先派專責工站 / 專責產品 / 專責機台
```

正式分頁：

```text
19_人員排班規則
```

---

## 七、唯一資料庫原則

只允許一份主資料庫：

```text
智慧製造中央作戰指揮中心資料庫
```

系統鎖定：

```text
PropertiesService：智慧製造_SPREADSHEET_ID
docs/pwa-config.js：SPREADSHEET_ID
```

初始化只能修復分頁與欄位，不應建立新的專案試算表。

---

## 八、照片修復

報工作業機台照片統一轉為：

```text
https://drive.google.com/thumbnail?id=檔案ID&sz=w800
```

前端修復外掛：

```text
docs/work-report-v2-photo-fix-252.js
```

---

## 九、啟動順序

PWA 操作：

```text
1. 初始化 38.7
2. 鎖定唯一資料庫
3. 清洗生產計劃表
4. 自動排程派班
5. 讀取今日任務
6. 開啟報工作業
```

GAS 測試：

```text
健康檢查
主檔檢查
測試38_6_doPost最終接線_靜態檢查
測試_主線優化38_7
初始化_主線優化38_7
清洗生產計劃表38_7
自動排程38_7
取得今日任務38_7
```

---

## 十、保留規則

```text
39 暫停
26_LINE每日戰情推播正式模組 不重做
37_LINE_主後端doPost正式替換段 保留
38.6 doPost 最終接線模組 保留
32～38 LINE 權限、角色分流、指令中心、Rich Menu 主線保留
```

下一步繼續 38.7 主線優化，不進 39。
