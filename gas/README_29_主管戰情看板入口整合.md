# 29_主管戰情看板入口整合

本階段目的：把主管戰情看板整合進正式入口，避免手打網址。

## 已完成檔案

```text
docs/index.html
docs/work-report-v2-manager-entry-250.js
docs/pwa-config.js
gas/29_主管戰情看板入口整合正式模組.gs
gas/00_主程式_doPost_主管戰情入口接入版_v29.gs
```

## 已完成入口

```text
1. 總部首頁：NEXUS OS 風格首頁，包含主管戰情看板入口。
2. 報工 PWA：外掛式注入主管戰情快捷入口，不動報工核心。
3. LINE Bot：提供主管戰情、戰情看板、主管看板、每日戰情等指令回覆文字。
```

## 正式網址

```text
總部首頁：https://qhero70.github.io/smart-factory-worker-app/?v=30
主管戰情看板：https://qhero70.github.io/smart-factory-worker-app/manager-war-room-v28.html?v=29
報工PWA：https://qhero70.github.io/smart-factory-worker-app/work-report-v2.html?v=250
```

## API Action

```text
主管戰情入口健康檢查
取得主管戰情入口
取得主管戰情LINE訊息
```

## Apps Script 測試函數

```javascript
測試_主管戰情入口健康檢查()
測試_取得主管戰情入口()
測試_取得主管戰情LINE訊息()
```

## LINE 文字指令

```text
主管戰情
戰情看板
主管看板
每日戰情
戰情
```

## 發佈步驟

```text
1. Apps Script 新增 29_主管戰情看板入口整合正式模組.gs
2. 主後端替換 doPost 接入版：00_主程式_doPost_主管戰情入口接入版_v29.gs
3. 若要讓 LINE Webhook 直接吃文字指令，於文字訊息分流處接入 主管戰情入口_處理LINE文字_(text)
4. 儲存
5. 部署 Web App 新版本
6. 開啟總部首頁與報工PWA確認入口顯示
```

## 驗收標準

```text
總部首頁可以進主管戰情看板
報工PWA上方有主管戰情快捷入口
LINE輸入「主管戰情」可取得主管戰情看板網址
```
