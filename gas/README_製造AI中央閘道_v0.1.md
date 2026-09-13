# 化新精密｜HS Manufacturing Agent Gateway v0.1

## 正式定位

本模組延續既有「智慧製造中央作戰指揮中心」與 ⭐智慧工廠主資料庫，不建立第二個 Web App、不建立第二個 LINE Bot，也不重做報工、排程、途程、品質等既有系統。

目前 Phase：`HS Manufacturing Agent Gateway v0.1`

第一個聚合 Tool：

```text
getManufacturingStatus(partNo)
```

本版維持 **Read Only**。

---

## 已完成程式

### 1. Gateway 主模組

```text
gas/製造AI中央閘道_v0.1.gs
```

包含：

```text
getProduct(partNo)
getTodayProductionPlan(partNo)
getProductionProgress(partNo)
getRouting(partNo)
getMachineStatus(machineId)
getDefectSummary(partNo)
getVisionInspection(partNo)
getManufacturingStatus(partNo)
```

API action：

```text
manufacturing.health
manufacturing.getProduct
manufacturing.getTodayProductionPlan
manufacturing.getProductionProgress
manufacturing.getRouting
manufacturing.getMachineStatus
manufacturing.getDefectSummary
manufacturing.getVisionInspection
manufacturing.getStatus
```

### 2. 舊主後端相容掛鉤

```text
gas/製造AI中央閘道_主後端接線_v0.1.gs
```

既有主後端若已呼叫：

```javascript
AI戰情資料源_嘗試處理動作_(payload)
```

即可直接接到新的 Manufacturing Agent Gateway，不需要覆蓋 `doGet(e)` / `doPost(e)`。

---

## 正式資料來源

Spreadsheet：

```text
⭐智慧工廠主資料庫
19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8
```

目前 Adapter：

| Tool | 正式來源 |
|---|---|
| Product | `02_產品主檔` |
| Production Plan | `05_計劃每日明細` |
| Production Progress | `0_報工對接pwa V4，報工` |
| Routing | `08_工站途程機台主檔` |
| Machine | `03_機台主檔` |
| Defect | `09_不良紀錄` |
| Vision | 尚未完成正式來源介接，固定 `NO_DATA` |

---

## 料號規則

正式 Key：

```text
產品編號 → partNo
客戶品號 → customerPartNo
品名 → partName
```

### 已排除錯誤舊料號

`2904601000` 已確認為錯誤，不再作為本專案測試料號，不再追查。

### 目前驗證料號

產品主檔：

```text
partNo: A916000000
customerPartNo: 2426-573-1514
partName: SIDE COVER A,TRAD向 450→496/1075
```

2026-08 生產計畫實際出現：

```text
partNo: A916000001
customerPartNo: 2426-573-1514
partName: SIDE COVER A,TRAD向
```

**A916000000 與 A916000001 不自動合併。**

Gateway 一律採 exact `partNo` 查詢，不使用相同客戶品號擅自替換料號。

---

## 目前真實驗收結果

### A916000000

```text
產品主檔：有
標準途程：有
05_計劃每日明細：目前查無 exact partNo 資料
今日報工：若沒有正式報工則 NO_DATA
不良：若沒有 direct partNo 可安全關聯則 NO_DATA
AI Vision：NO_DATA
```

因此 Agent 不得因為有標準途程，就回答「目前做到 OP110 / OP120 / OP150」。目前工序只能由正式報工的 latest row 判定。

### A916000001（歷史計畫驗證）

`05_計劃每日明細` 已驗證存在 2026-08-10～2026-08-31 的計畫資料；例如 2026-08-12 計畫數量為 54。

這只證明 `A916000001` 的生產計畫資料存在，不代表它等於 `A916000000`。

---

## Tool 回傳原則

成功：

```json
{
  "success": true,
  "data": {},
  "source": "SYSTEM_NAME",
  "retrievedAt": "...",
  "message": null,
  "errorCode": null
}
```

查無正式資料：

```json
{
  "success": false,
  "data": null,
  "source": "SYSTEM_NAME",
  "retrievedAt": "...",
  "message": "目前查無資料",
  "errorCode": "NO_DATA"
}
```

禁止：

```text
猜數量
猜工序
猜機台
猜不良
把 null 當 0
用 customerPartNo 自動合併不同 partNo
```

---

## Apps Script 驗收函數

部署前可在 Apps Script 直接執行：

```text
測試_製造AI閘道_A916000000()
測試_製造AI閘道_A916000001_20260812()
```

其中第二個測試只做歷史資料 Read Only 驗證，不寫入任何正式資料。

---

## 正式 HTTP 請求

沿用既有正式 Web App `/exec` URL：

```json
{
  "action": "manufacturing.getStatus",
  "partNo": "A916000000"
}
```

歷史日期驗證：

```json
{
  "action": "manufacturing.getStatus",
  "partNo": "A916000001",
  "date": "2026-08-12"
}
```

**不得為 Gateway 建立第二個 Web App。**

---

## 下一個正式施工點

當本模組同步進既有 Apps Script 專案並沿用原 `/exec` 完成 HTTP 驗收後，才接 Agent Tool Calling。

Event Center、n8n、LINE Agent、AI進料、5S、水位後續依既定架構擴充，不提前分散主線。
