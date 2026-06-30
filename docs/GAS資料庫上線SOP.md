# 智慧製造中央作戰資料庫｜GAS 上線 SOP v1

## 目標

把 PWA 清洗器 V2.5 的資料寫入 Google Sheets 中央資料庫。

流程：

```text
生產計劃表清洗器 V2.5
→ BOM需求展開
→ CTB齊套檢查
→ 10_排程需求池
→ 11_自動排程結果
→ 13_拆工單結果
→ Google Sheets 中央資料庫
```

---

## 一、GAS 檔案

GitHub 正式檔：

```text
gas/智慧製造中央作戰資料庫API_v1.gs
```

請將整份內容貼到 Google Apps Script。

---

## 二、第一次初始化

在 Apps Script 編輯器執行：

```javascript
初始化_智慧製造中央作戰資料庫()
```

完成後會自動建立 Google Sheets，並建立以下分頁：

```text
00_系統設定
00_寫入紀錄
01_產品主檔
02_BOM明細主檔
03_BOM樹狀展開
04_庫存在製入庫
05_計劃每日明細
06_本月彙總
07_出貨訂單
08_BOM需求展開
09_CTB齊套檢查
10_排程需求池
11_自動排程結果
12_資源參數
13_拆工單結果
90_匯入原始資料
91_BOM檢查清單
```

---

## 三、部署 Web App

Apps Script 右上角：

```text
部署 → 新增部署作業 → 類型：網頁應用程式
```

兩個選項必須這樣選：

```text
執行身分：我
存取權限：任何人
```

部署完成後複製 `/exec` 結尾的 Web App URL。

---

## 四、PWA 入口

正式網址：

```text
https://qhero70.github.io/smart-factory-worker-app/production-plan-database-v25.html?v=25-db1
```

操作：

1. 上傳生產計劃表 Excel
2. 上傳 BOM 主檔 Excel / CSV
3. 確認 10_排程需求池、11_自動排程結果有資料
4. 在「Google Sheets 中央資料庫」區塊貼上 GAS Web App URL
5. 按「儲存URL」
6. 按「初始化資料庫」
7. 按「上傳中央資料庫」

---

## 五、驗收標準

Google Sheets 中確認：

| 分頁 | 標準 |
|---|---|
| 02_BOM明細主檔 | 有 BOM 筆數 |
| 05_計劃每日明細 | 有每日計畫 / 產出 / 出貨資料 |
| 08_BOM需求展開 | 有子件需求 |
| 09_CTB齊套檢查 | 有紅燈 / 綠燈 |
| 10_排程需求池 | 有待排程需求 |
| 11_自動排程結果 | 有 PROD / PACK / LOAD |
| 13_拆工單結果 | 有工單資料 |
| 00_寫入紀錄 | 有本次上傳批次 |

---

## 六、注意

目前 PWA 端採 `replace` 寫入模式：

```text
每次上傳會覆蓋同分頁舊資料，但不刪除分頁與標題列。
```

這是為了避免同一份月計劃重複上傳造成需求池重複。
