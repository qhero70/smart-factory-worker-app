# 26_LINE每日戰情推播

本階段目的：將 25_LINE每日摘要佇列 中的每日戰情摘要推送到 LINE 主管群組或指定對象。

## 正式檔案

```text
gas/26_LINE每日戰情推播正式模組.gs
gas/00_主程式_doPost_LINE推播接入版_v26.gs
```

## API Action

```text
LINE每日戰情推播健康檢查
初始化_LINE每日戰情推播
取得LINE每日摘要佇列
發送LINE每日戰情
```

## 讀取來源

```text
25_LINE每日摘要佇列
```

## 自動建立分頁

```text
26_LINE推播紀錄
26_LINE推播錯誤紀錄
26_LINE推播設定
```

## 必要 Script Properties

請到 Apps Script：

```text
專案設定
↓
指令碼屬性
```

新增：

```text
LINE_CHANNEL_ACCESS_TOKEN = LINE Bot Channel access token
LINE_TARGET_ID = 單一群組 / 使用者 / 聊天室 ID
```

若要多個目標，使用：

```text
LINE_TARGET_IDS = ID1,ID2,ID3
```

## 測試函數

```javascript
測試_LINE每日戰情推播健康檢查()
測試_初始化_LINE每日戰情推播()
測試_取得LINE每日摘要佇列()
測試_發送LINE每日戰情_測試模式()
```

## 安全測試

先執行測試模式：

```javascript
測試_發送LINE每日戰情_測試模式()
```

測試模式不會真的呼叫 LINE API，只會驗證佇列讀取與流程，並將佇列狀態更新為「測試完成」。

正式推播 action：

```text
發送LINE每日戰情
```

## 發佈步驟

```text
1. Apps Script 新增 26_LINE每日戰情推播正式模組.gs
2. 主後端替換 doPost 接入版：00_主程式_doPost_LINE推播接入版_v26.gs
3. 設定 Script Properties：LINE_CHANNEL_ACCESS_TOKEN、LINE_TARGET_ID 或 LINE_TARGET_IDS
4. 儲存
5. 部署 → 管理部署作業 → 編輯 Web App → 新增版本 → 部署
6. 先跑 測試_LINE每日戰情推播健康檢查()
7. 再跑 測試_初始化_LINE每日戰情推播()
8. 再跑 測試_發送LINE每日戰情_測試模式()
9. 正式推播前確認 25_LINE每日摘要佇列 有 待發送 訊息
```

## 下一階段

```text
27_每日自動化排程觸發器
```

會自動依序執行：

```text
23_派班報工巡檢修復
24_派班報工每日結算
25_AI戰情摘要資料源
26_LINE每日戰情推播
```
