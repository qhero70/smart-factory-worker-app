# 42_LINE製造AI助理｜Apps Script 手動同步指引 v0.1

專案：化新精密｜製造 AI Agent Platform  
目標：沿用既有唯一 LINE Bot、原 Web App、原 Webhook，手動完成 LINE 製造 AI 助理 Read Only v0.1 部署。  
原則：不建立第二個 Bot、不建立第二個 Web App、不更換正式 Webhook URL。

---

## A. GitHub 已完成

正式主線：`main`

本次需同步到既有 Apps Script 專案的檔案：

1. `gas/製造AI中央閘道_v0.1.gs`
2. `smart-factory-command-center/01_GAS後端/35_LINE_製造AI助理_ReadOnly_v0.1.gs`
3. `smart-factory-command-center/01_GAS後端/41_LINE_製造AI助理_啟用閘門_v0.1.gs`
4. `smart-factory-command-center/08_測試與驗收/35_LINE_製造AI助理_v0.1_驗收.gs`
5. `smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs`

第 5 檔是目前既有正式主後端；GitHub main 已在此檔接入 `LINE製造AI助理35_嘗試處理Webhook_` 與 `製造AI閘道_嘗試處理動作_`。Apps Script 請更新原檔，不要建立第二個 doPost。

---

## B. Apps Script 左側檔名建議

請在原本 Apps Script 專案新增／更新：

- `製造AI中央閘道_v0.1.gs`
- `35_LINE_製造AI助理_ReadOnly_v0.1.gs`
- `41_LINE_製造AI助理_啟用閘門_v0.1.gs`
- `35_LINE_製造AI助理_v0.1_驗收.gs`
- 原有 `智慧製造中央作戰指揮中心.gs` 更新成 GitHub main 最新內容

不要刪除既有：
- 33_LINE 身份權限
- 34_LINE 角色分流
- 37_LINE 指令中心
- 既有 5S / 報工 / 主管戰情模組
- 原 Web App 部署

---

## C. 儲存後先做不發 LINE 的驗收

先執行：

```
驗收35_LINE製造AI助理_全部()
```

必須看到：

```
success: true
```

若 success 不是 true，禁止部署。

---

## D. 部署原 Web App 新版本

Apps Script：
1. 右上角「部署」
2. 「管理部署作業」
3. 找到目前 LINE Bot 使用的原 Web App
4. 編輯
5. 版本選「新增版本」
6. 說明填：
   `Manufacturing_AI_Agent_LINE_ReadOnly_v0.1`
7. 執行身分：沿用原設定
8. 存取權限：沿用原設定
9. 部署

重要：
- Web App URL 不換
- LINE Developers Webhook URL 不換
- 不新增第二個部署

---

## E. LINE 實測順序

先測既有功能：
- `我的狀態`
- `指令`

確認原功能正常後，再測：

```
製造AI
```

再測：

```
A916000000 今天做到哪裡？
```

目前正式資料預期：
- 產品主檔：有資料
- 標準途程：2 筆
- 今日計畫：NO_DATA
- 今日報工：NO_DATA
- AI Vision 正式來源：NO_DATA

不可自行出現沒有正式來源的「完成率／目前機台／目前工序」。

---

## F. 最後正式曝光

LINE 實測正常後，回 Apps Script 執行：

```
驗收並啟用41_LINE製造AI助理()
```

成功標準：
- success = true
- 37_LINE指令中心 出現「製造AI」
- 啟用 = 是

若要撤回入口：

```
停用41_LINE製造AI助理()
```

---

## G. 最終成功標準

全部完成後才可判定：

```
LINE 製造 AI 助理 Read Only v0.1 正式上線
```

且仍維持：
- 單一 LINE Bot
- 單一原 Web App
- 原 Webhook URL
- Read Only
- NO_DATA 不猜測
- 正式寫入仍需人工確認
