# LINE Bot Flex Message 接線說明 v1.9.0

## 一、需要貼到同一個 Apps Script 專案的檔案

請將以下檔案放在同一個 Apps Script 專案：

```text
智慧製造中央作戰指揮中心.gs
系統維護工具.gs
LINEBot_FlexMessage主選單.gs
```

---

## 二、目的

讓 LINE 使用者輸入：

```text
選單
主選單
功能
入口
```

LINE Bot 回傳 Flex Message 主選單。

---

## 三、需要調整主後端的地方

在 `智慧製造中央作戰指揮中心.gs` 中，原本 LINE Webhook 可能是：

```javascript
function 處理LINEWebhook_(內容) {
  (內容.events || []).forEach(ev => {
    if (ev.type === 'message' && ev.message.type === 'text') {
      回覆LINE_(ev.replyToken, 產生LINE回覆_(ev.message.text.trim()));
    }
  });
  return ContentService.createTextOutput('OK');
}
```

請改成：

```javascript
function 處理LINEWebhook_(內容) {
  (內容.events || []).forEach(ev => {
    if (ev.type === 'message' && ev.message.type === 'text') {
      const 訊息陣列 = 產生LINE回覆訊息_(ev.message.text.trim());
      回覆LINE訊息陣列_(ev.replyToken, 訊息陣列);
    }
  });
  return ContentService.createTextOutput('OK');
}
```

---

## 四、可執行測試函數

貼入 Apps Script 後，可先執行：

```text
測試_LINE主選單FlexJSON
```

確認能回傳 Flex Message JSON。

也可執行：

```text
測試_LINE文字回覆陣列
```

確認輸入「選單」會產出 Flex Message 訊息陣列。

---

## 五、目前文字指令

| 指令 | 回覆 |
|---|---|
| 選單 | Flex Message 主選單 |
| 主選單 | Flex Message 主選單 |
| 功能 | Flex Message 主選單 |
| 入口 | Flex Message 主選單 |
| 戰情 | 文字版今日 KPI 戰情 |
| 狀況 | 文字版今日 KPI 戰情 |
| AI摘要 | 文字版 AI 摘要 |
| AI | 文字版 AI 摘要 |

---

## 六、注意事項

1. 本系統仍維持唯一 LINE Bot 入口。
2. GitHub Pages 需先啟用，Flex Message 按鈕連結才會正常開啟。
3. GAS Web App 需部署完成，前端頁面才能連到資料。
4. LINE_CHANNEL_ACCESS_TOKEN 必須填入主後端 `系統設定`。
