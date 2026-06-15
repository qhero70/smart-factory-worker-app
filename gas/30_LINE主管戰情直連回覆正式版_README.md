# 30_LINE主管戰情直連回覆正式版

用途：修正 LINE Bot 輸入「主管戰情 / 今日戰情 / 昨日戰情 / 戰情 yyyy-MM-dd」沒有反應或只寫紀錄不回覆的問題。

## GitHub 正式保留檔

```text
gas/30_LINE主管戰情直連回覆正式版.gs
gas/00_主程式_doPost_正式版_v30.gs
```

## 已刪除舊檔

```text
gas/29_LINE文字指令主管戰情接入片段.gs
gas/30_LINEWebhook_主管戰情最小可用替換版.gs
gas/00_主程式_doPost_每日自動化接入版_v27.gs
gas/00_主程式_doPost_主管戰情看板接入版_v28.gs
gas/00_主程式_doPost_主管戰情入口接入版_v29.gs
```

## Apps Script 要保留

```text
29_主管戰情看板入口整合正式模組.gs
30_LINE主管戰情直連回覆正式版.gs
```

## Apps Script 要刪除

```text
29_LINE文字指令主管戰情接入片段.gs
30_LINEWebhook_主管戰情最小可用替換版.gs
```

## doPost 正式接入

請使用：

```text
gas/00_主程式_doPost_正式版_v30.gs
```

取代主後端同名函數：

```text
doPost(e)
處理API請求_(action, p)
主程式_安全輸出JSON_(obj)
```

Apps Script 專案內只能保留一個 `doPost(e)`。

## 必要設定

Apps Script → 專案設定 → 指令碼屬性：

```text
LINE_CHANNEL_ACCESS_TOKEN
智慧製造_SPREADSHEET_ID
```

## 測試

```javascript
測試_LINE主管戰情直連_TOKEN檢查()
測試_LINE主管戰情直連_建立回覆()
```

## LINE 驗收

```text
主管戰情
今日戰情
昨日戰情
戰情 2026-06-14
總部首頁
報工
功能
```

正常會回覆主管戰情看板網址或對應入口。
