# LINE 製造 AI 助理｜正式部署與現場驗收 SOP v0.1

專案：化新精密｜製造 AI Agent Platform  
模組：HS Manufacturing AI Agent → LINE 單一入口  
狀態：部署前最終交接  
原則：不建立第二個 LINE Bot、不更換原 Web App URL、第一階段 Read Only。

---

## 1. 已確認的現況

### GitHub
- Branch：`feature/line-manufacturing-ai-agent-v0.1`
- PR：#2（Draft）
- PR CI：`LINE 製造 AI 助理 PR 驗收` 已通過。
- 語法、安全邊界、禁止正式寫入滲入檢查皆 PASS。

### 正式主資料庫
Spreadsheet：`⭐智慧工廠主資料庫`

已唯讀核對：
- `02_產品主檔`：A916000000 存在。
- `08_工站途程機台主檔`：A916000000 有 2 筆途程。
- routeId：`ROUTE-00088`、`ROUTE-00089`。
- `05_計劃每日明細`：目前 A916000000 查無資料。
- `0_報工對接pwa V4，報工`：目前 A916000000 查無資料。
- AI Vision 正式來源：目前尚未完成 Tool 介接，回 `NO_DATA`。

### LINE 路徑
`37_LINE指令使用紀錄` 可見 2026-09-18 仍有既有 LINE 指令回覆紀錄，表示目前主資料庫的 LINE 指令中心路徑仍有近期使用痕跡。

另有較早的 `LINE_BOT_入口總控（正式）` / `智慧中控 OS V13` 資產與 2026-05 歷史互動紀錄。部署時不得自行把 Webhook 改接到另一套 LINE Bot 或另一個 Web App；必須沿用目前正式 Webhook 所在 Apps Script 專案。

---

## 2. 本次需同步的 GitHub 檔案

1. `gas/35_LINE製造AI助理_ReadOnly_v0.1.gs`
2. `gas/35_LINE製造AI助理_驗收測試_v0.1.gs`
3. `gas/製造AI中央閘道_v0.1.gs`
4. `gas/00_主程式_doPost_正式版_v30.gs`

注意：
- 第 4 檔只增加 `LINE製造AI助理35_嘗試處理Webhook_` 路由。
- 不得以舊版本完整覆蓋正式主程式。
- 同步前先比對正式 Apps Script 目前 `doPost(e)`，只套用必要差異。

---

## 3. Apps Script 同步後，先做「不發 LINE」驗收

依序執行：

```javascript
驗收35_LINE製造AI助理_料號解析()
```

成功標準：
- `A916000000 今天做到哪裡？` → partNo = `A916000000`
- 一般英文句子不得被誤判為料號。

接著執行：

```javascript
驗收35_LINE製造AI助理_A916000000_唯讀()
```

成功標準：
- product.partNo = `A916000000`
- routingCount = 2
- 第一筆 routeId = `ROUTE-00088`
- 第二筆 routeId = `ROUTE-00089`
- plan = `NO_DATA`
- progress = `NO_DATA`
- vision = `NO_DATA`
- LINE 預覽文字有「目前查無資料」或 `NO_DATA`

最後執行：

```javascript
驗收35_LINE製造AI助理_全部()
```

必須：
```json
{ "success": true }
```

未通過禁止部署。

---

## 4. Web App 部署

只更新「原本正式 Web App 部署」。

- 部署類型：網頁應用程式
- 版本：新增版本
- 建議說明：`Manufacturing_AI_Agent_LINE_ReadOnly_v0.1`
- 執行身分：沿用原設定
- 存取權限：沿用原設定
- Web App URL：不更換
- LINE Developers Webhook：不更換

禁止：
- 建立第二個 Web App。
- 建立第二個 LINE Bot。
- 更換正式 Webhook URL。
- 在本階段增加收料、報工、HOLD、NG、放行等寫入。

---

## 5. 部署後 LINE 現場驗收

先驗既有功能不可壞：

```text
我的狀態
```

```text
指令
```

成功標準：既有 LINE 身份、指令中心仍正常。

再測製造 AI 助理：

```text
製造AI
```

成功標準：
- 回覆「製造 AI 助理（唯讀）」說明。
- 未綁定或非主管／工程師時，不得洩漏製造資料。

主管／工程師測試：

```text
A916000000 今天做到哪裡？
```

本階段預期：
- 產品主檔：有資料。
- 途程：有資料。
- 今日計畫：目前查無資料。
- 報工：目前查無資料。
- AI Vision 正式來源：目前查無資料。
- 不得自行回答完成率、目前機台、目前工序等無正式來源的值。

---

## 6. 成功後才做的下一件事

只有正式 LINE 驗收通過後，才可在 `37_LINE指令中心` 新增對外可見指令，例如：
- 指令：`製造AI`
- 別名：`AI助理,製造助理`
- 權限：`允許主管入口`
- 說明：`查詢料號製造狀態（唯讀）`
- 範例：`A916000000 今天做到哪裡？`

在正式 Webhook 驗收前，不先新增這筆。

---

## 7. 回滾

若 LINE 無回覆、既有指令異常或 Apps Script 執行錯誤：
1. 立即回到上一個穩定 Web App 版本。
2. 不改 LINE Developers Webhook URL。
3. 不刪除任何 Sheet。
4. 不刪除 `33_LINE身份權限`、`37_LINE指令中心`、`37_LINE指令使用紀錄`。
5. 保留錯誤執行紀錄供除錯。

---

## 8. 正式上線判定

全部通過才可說「LINE 製造 AI 助理 Read Only v0.1 已上線」：

- [x] GitHub 模組完成
- [x] PR CI PASS
- [x] 正式主資料來源唯讀核對
- [x] 工站途程 Adapter 錯位修正完成
- [ ] Apps Script 已同步
- [ ] 三個本機驗收函式 PASS
- [ ] 原 Web App 新版本已部署
- [ ] 既有 LINE 指令回歸測試 PASS
- [ ] A916000000 LINE 唯讀查詢 PASS
- [ ] `37_LINE指令中心` 正式曝光

目前正式結論：

```text
程式、資料契約與 CI 已完成部署前驗收。
Apps Script 與真實 LINE Webhook 尚未完成現場上線驗收。
```
