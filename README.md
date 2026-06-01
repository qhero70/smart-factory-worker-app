# 智慧製造中央作戰指揮中心

此 GitHub 專案已整理為乾淨正式版，目前版本：**v1.2.0｜前端戰情室強化與維護工具接入**。

## 主要入口

- GitHub Pages 首頁：`docs/index.html`
- 手機 PWA：`docs/app.html`
- 正式專案檔：`smart-factory-command-center/`
- GAS 主後端：`smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs`
- GAS 維護工具：`smart-factory-command-center/01_GAS後端/系統維護工具.gs`

## 系統架構

```text
Google Sheets 主資料庫
+ Google Apps Script 後端
+ HTML5 PWA 前端
+ LINE Bot 單一入口
```

## v1.2.0 已完成

- KPI 戰情 API
- 工單達成率圖表
- 停機排行
- 不良排行
- AI 摘要強化
- LINE Bot 戰情回覆強化
- 系統維護頁
- 一鍵初始化
- 一鍵自檢
- 修復欄位
- 建立備份
- 每日戰情快照
- 匯入內建測試資料

## 目前保留內容

```text
README.md
.nojekyll
docs/
smart-factory-command-center/
```

舊的 Node / Expo / PostgreSQL / Redis / apps monorepo 架構已從 main 主線移除。

## 下一步

1. GitHub Settings → Pages 啟用 `main / docs`。
2. 將 `smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs` 貼到 Apps Script。
3. 將 `smart-factory-command-center/01_GAS後端/系統維護工具.gs` 也貼到同一個 Apps Script 專案。
4. 執行 `初始化_智慧製造中央作戰指揮中心()`。
5. 部署 GAS Web App。
6. 在 `docs/app.html` 的設定頁貼上 GAS Web App URL。
7. 到「維護」頁執行：一鍵自檢、匯入測試資料、每日快照。
