# 28_主管戰情看板PWA

本階段目的：將 25_AI戰情摘要資料源、25_AI戰情風險清單、24_未報工追蹤、24_派班效率統計做成手機版主管戰情看板。

## 正式檔案

```text
gas/28_主管戰情看板API正式模組.gs
gas/00_主程式_doPost_主管戰情看板接入版_v28.gs
docs/manager-war-room-v28.html
```

## API Action

```text
主管戰情看板健康檢查
取得主管戰情看板
```

## PWA 頁面

```text
https://qhero70.github.io/smart-factory-worker-app/manager-war-room-v28.html?v=28
```

## 資料來源

```text
25_AI戰情摘要資料源
25_AI戰情風險清單
24_未報工追蹤
24_派班效率統計
27_每日自動化排程紀錄
26_LINE推播紀錄
```

## Apps Script 測試函數

```javascript
測試_主管戰情看板健康檢查()
測試_取得主管戰情看板()
```

## 發佈步驟

```text
1. Apps Script 新增 28_主管戰情看板API正式模組.gs
2. 主後端替換 doPost 接入版：00_主程式_doPost_主管戰情看板接入版_v28.gs
3. 儲存
4. 部署 → 管理部署作業 → 編輯 Web App → 新增版本 → 部署
5. 開啟 docs/manager-war-room-v28.html?v=28
```

## 驗收標準

```text
主管戰情看板能顯示：
- 風險等級
- 派班筆數
- 已報工
- 未報工
- 完成率
- 不良率
- AI摘要
- 主管建議
- 風險清單
- 未報工追蹤
- 工站效率排行
- 自動化 / LINE 最新狀態
```

## 下一階段

```text
29_主管戰情看板入口整合
```

將主管戰情看板連到首頁、LINE Rich Menu 或中央入口。
