# 智慧製造中央作戰指揮中心

此 GitHub 專案已整理為乾淨正式版。

## 主要入口

- GitHub Pages 首頁：`docs/index.html`
- 手機 PWA：`docs/app.html`
- 正式專案檔：`smart-factory-command-center/`

## 系統架構

```text
Google Sheets 主資料庫
+ Google Apps Script 後端
+ HTML5 PWA 前端
+ LINE Bot 單一入口
```

## 目前保留內容

```text
README.md
docs/
smart-factory-command-center/
```

舊的 Node / Expo / PostgreSQL / Redis / apps monorepo 架構已從 main 主線移除。

## 下一步

1. GitHub Settings → Pages 啟用 `main / docs`。
2. 將 `smart-factory-command-center/01_GAS後端/智慧製造中央作戰指揮中心.gs` 貼到 Apps Script。
3. 執行 `初始化_智慧製造中央作戰指揮中心()`。
4. 部署 GAS Web App。
5. 在 `docs/app.html` 的設定頁貼上 GAS Web App URL。
