# 38_LINE v1.9.1｜LINE 內開 PWA V4

日期：2026-09-23

## 目標

- 維持唯一 LINE Bot 與既有 Rich Menu。
- 主管「製造生產」與一般員工「報工作業」皆開啟正式 PWA V4。
- 移除 `openExternalBrowser=1`，避免跳出 LINE 到 Safari／Chrome。
- 製造工具 75_LINE Flex 的 PWA URI 同樣先清除外部瀏覽器參數。
- 主管戰情、今日戰情、指令中心、我的狀態、製造工具等 message 動作維持在 LINE 聊天室內。

## 正式 PWA V4

`https://qhero70.github.io/smart-factory-worker-app/work-report-v4-477.html?v=539&fix=stable-no-flicker&來源=LINEBOT_RICHMENU`

## GAS 對應版本

- 38_LINE：`v1.9.1_LINE內開_PWA_V4_圖片Flex`
- 40_LINE：`v1.9.5 LINE內開`
- 75_LINE：`v1.1.1_LINE內開圖片HeroFlex`

## 上線原則

不建立第二個 Bot，不建立第二個 Web App；Apps Script 正式專案同步後，沿用既有部署與角色分流。
