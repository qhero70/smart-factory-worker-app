# 智慧製造中央作戰指揮中心｜GAS 後端正式部署狀態

版本：v1.6.10
日期：2026-06-13
狀態：正式可用

## 已打通

- 生產計畫表清洗器 V3 已可解析 Excel。
- GAS Web App 已通過健康檢查_排程需求池。
- 10_排程需求池 已成功寫入 84 筆。
- 10_生產計畫清洗紀錄 已成功留下批次紀錄。
- 舊報工PWA入口已改名停用，避免搶 Web App 入口。

## 正式健康檢查

網址參數：/exec?action=健康檢查_排程需求池

成功回覆應包含：ok true，模組 10_排程需求池。

## 正式主線

production-plan-cleaner-v3.html → GAS Web App → 寫入排程需求池 → 10_排程需求池 → 10_生產計畫清洗紀錄。

## Apps Script 現場規則

Apps Script 專案內只允許一組正式入口，正式入口位於：智慧製造中央作戰指揮中心｜正式主後端.gs。

舊報工檔 報工PWA_V2_正式整合版.gs 已停用入口，只保留舊報工函數供備查。

## 已從 GitHub 主線移除

- gas/智慧製造中央作戰指揮中心_正式接入版_v1.6.8.gs
- gas/10_排程需求池後端.gs
- docs/production-plan-cleaner-v1.html
- docs/production-plan-cleaner-v2.html
- 臨時主程式接入補丁與 doPost 補丁

## 現在保留正式前端

- docs/production-plan-cleaner-v3.html

## 下一階段

同批次防重複測試成功後，進入：10_排程需求池 → 10_工單主檔 / 訂單管理 → 拆工單 → 自動排程。
