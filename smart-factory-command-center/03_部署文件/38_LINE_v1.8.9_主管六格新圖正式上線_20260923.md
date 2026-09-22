# 38_LINE v1.8.9｜主管六格新圖正式上線

日期：2026-09-23

## 本次目標

- 使用者指定主管六格中英雙語新圖正式上線。
- 正式圖片：`docs/line/richmenu-supervisor-v189.png`
- 尺寸：1200×810 PNG，小於 1MB。
- 主管六格點擊座標維持 3×2、每格 400×405。
- 左下邏輯仍為「製造生產」正式 /exec。
- 右下「製造工具」仍送出文字「製造工具」，由 75_LINE v1.0.1 回覆 Flex Carousel。
- 一般員工 Rich Menu 不變。
- 不建立第二個 LINE Bot、不建立第二個 Web App。

## 正式圖片網址

https://qhero70.github.io/smart-factory-worker-app/line/richmenu-supervisor-v189.png

## GAS 上線函數

`上線38_LINE主管新圖_v189並同步()`

此函數只建立新版主管 Rich Menu，更新主管入口 ID，並呼叫既有 34_LINE 角色同步；不重建一般員工選單。

## 驗收函數

`驗收38_LINE主管新圖_v189()`

## Apps Script 部署說明

38_LINE v1.8.9｜主管六格中英雙語新圖正式上線｜製造工具維持75_LINE Flex中心｜製造生產維持正式/exec｜一般員工入口不變｜2026-09-23
