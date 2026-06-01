# LINE Bot 單一入口設定

本系統只使用一個 LINE Bot 入口，不建立第二個 Bot。

---

## 一、Webhook URL

GAS 部署成 Web App 後，LINE Developers 的 Webhook URL 設定為：

```text
https://script.google.com/macros/s/你的部署ID/exec
```

---

## 二、GAS 需設定的參數

在 `智慧製造中央作戰指揮中心.gs` 內設定：

```javascript
const 系統設定 = {
  LINE_CHANNEL_ACCESS_TOKEN: '貼上 LINE Channel Access Token',
  LINE_CHANNEL_SECRET: '貼上 LINE Channel Secret'
};
```

---

## 三、預設支援指令

| 指令 | 功能 |
|---|---|
| 戰情 | 回覆今日製造戰情、總計畫、總完成、達成率、警示筆數 |
| 狀況 | 同戰情 |
| AI | 回覆 AI 摘要、風險等級、建議動作 |
| AI摘要 | 同 AI |
| 報工 | 回覆智慧製造中央作戰指揮中心入口提示 |

---

## 四、正式規則

1. 所有入口都集中在同一個 LINE Bot。
2. 不建立第二個 LINE Bot。
3. LINE Bot 只做入口、通知、查詢與提醒。
4. 報工資料仍以 Google Sheets 主資料庫為唯一資料源。
5. 未來可擴充 Flex Message、Rich Menu、主管簽核、逾期提醒。

---

## 五、測試標準

LINE 對話輸入：

```text
戰情
```

應回覆類似：

```text
📊 智慧製造戰情
作業日：2026-06-01
總計畫：100
總完成：20
達成率：20%
警示：0 筆
```
