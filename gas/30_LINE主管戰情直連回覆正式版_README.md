# 30_LINE主管戰情直連回覆正式版

用途：修正 LINE Bot 輸入「主管戰情」沒有反應。

## Apps Script 要刪除 / 保留

保留：

```text
29_主管戰情看板入口整合正式模組.gs
```

刪除或不要使用：

```text
29_LINE文字指令主管戰情接入片段.gs
30_LINEWebhook_主管戰情最小可用替換版.gs
```

原因：這兩支不是完整直連版，若沒有接到原本 LINE 回覆函數，LINE 會沒有反應。

## 正確做法

新增 Apps Script 檔案：

```text
30_LINE主管戰情直連回覆正式版.gs
```

內容請使用 ChatGPT 回覆內提供的完整貼上版。

## doPost 接入位置

在主後端 `doPost(e)` 裡，`const p = 解析POST_(e);` 下面立即加入：

```javascript
if (p && p.events && Array.isArray(p.events)) {
  var 主管戰情LINE結果 = LINE主管戰情直連_嘗試處理Webhook_(p);
  if (主管戰情LINE結果 && 主管戰情LINE結果.已處理) {
    if (typeof 排程需求池_輸出JSON_ === 'function') {
      return 排程需求池_輸出JSON_(主管戰情LINE結果);
    }
    return 輸出JSON_(主管戰情LINE結果);
  }
}
```

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

在 LINE Bot 輸入：

```text
主管戰情
```

正常回覆：

```text
📊 主管戰情看板
作業日：yyyy-MM-dd

主管戰情看板網址
```
