# LINE Bot Flex Message 主選單規格 v1.8.0

## 一、原則

本系統維持唯一 LINE Bot 入口，不建立第二個 Bot。

LINE Bot 用途：

- 快速查詢戰情
- 快速開啟功能頁
- 推播異常提醒
- 回覆 AI 摘要
- 導向 GitHub Pages 前端

---

## 二、主選單按鈕

| 按鈕 | 動作 | 目標 |
|---|---|---|
| 行動戰情室 | URI | `docs/app.html` |
| 資料管理 | URI | `docs/data.html` |
| 計畫清洗 | URI | `docs/plan.html` |
| 排程看板 | URI | `docs/schedule.html` |
| 缺漏補齊 | URI | `docs/repair.html` |
| 主管摘要 | URI | `docs/meeting.html` |
| 今日戰情 | Message | `戰情` |
| AI摘要 | Message | `AI摘要` |

---

## 三、建議 Flex Message 架構

```json
{
  "type": "bubble",
  "size": "mega",
  "header": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {"type": "text", "text": "智慧製造中央作戰指揮中心", "weight": "bold", "size": "lg"},
      {"type": "text", "text": "製造部單一 LINE Bot 入口", "size": "sm", "color": "#94a3b8"}
    ]
  },
  "body": {
    "type": "box",
    "layout": "vertical",
    "spacing": "sm",
    "contents": [
      {"type": "button", "action": {"type": "message", "label": "今日戰情", "text": "戰情"}},
      {"type": "button", "action": {"type": "message", "label": "AI摘要", "text": "AI摘要"}},
      {"type": "button", "action": {"type": "uri", "label": "行動戰情室", "uri": "https://qhero70.github.io/smart-factory-worker-app/app.html"}},
      {"type": "button", "action": {"type": "uri", "label": "排程看板", "uri": "https://qhero70.github.io/smart-factory-worker-app/schedule.html"}},
      {"type": "button", "action": {"type": "uri", "label": "主管摘要", "uri": "https://qhero70.github.io/smart-factory-worker-app/meeting.html"}}
    ]
  }
}
```

---

## 四、文字指令

| 指令 | 回覆 |
|---|---|
| 戰情 | 今日 KPI 戰情 |
| 狀況 | 今日 KPI 戰情 |
| AI | AI 摘要 |
| AI摘要 | AI 摘要 |
| 選單 | Flex Message 主選單 |
| 主選單 | Flex Message 主選單 |

---

## 五、下一階段

v1.9.0 可將此規格實作到 GAS：

- `產生LINE主選單_()`
- `回覆LINEFlex_()`
- 指令「選單」回傳 Flex Message
- 戰情異常時主動推播 LINE
