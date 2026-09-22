# 化新精密｜LINE 製造工具中心上線紀錄

版本日期：2026-09-23

## 本次完成

- 75_LINE 製造工具中心 v1.0.1
- LINE 總控 v1.9.7 製造工具最高優先直通
- 38_LINE Rich Menu v1.8.8
- 主管 Rich Menu 中英雙語 1200×810 正式圖
- 製造生產固定使用既有正式 Web App /exec
- 製造工具串接 Flex Carousel
- 智慧5S作為首批正式工具

## 正式主管 Rich Menu

上排：

1. 主管戰情 / Supervisor Dashboard
2. 今日戰情 / Today Dashboard
3. 指令中心 / Command Center

下排：

4. 製造生產 / Manufacturing
5. 我的狀態 / My Status
6. 製造工具 / Manufacturing Tools

正式圖片：

https://qhero70.github.io/smart-factory-worker-app/line/richmenu-supervisor-v188.png

## 正式製造生產入口

https://script.google.com/macros/s/AKfycby2ghuwkxTr1kbt2bU9D3U24O55c6GhcabA1IhDC67OEw86pH6MjS3nnBMASnjEmggw/exec?page=07_%E5%A0%B1%E5%B7%A5%E4%BD%9C%E6%A5%ADV2

不得使用 /dev。

## GAS 部署說明

### LINE 總控 v1.9.7

LINE總控 v1.9.7｜製造工具最高優先直通 75_LINE｜整合 Flex 製造工具中心｜保留智慧5S、報工V4、製造AI與既有角色分流｜2026-09-23

### 38_LINE v1.8.8

38_LINE v1.8.8｜主管製造生產正式入口改用唯一Web App /exec｜禁止/dev測試網址｜製造工具串接75_LINE Flex中心｜保留一般員工、智慧5S、角色綁定與既有LINE架構｜2026-09-23

## 已完成驗收

### 75_LINE

- handler = true
- token = true
- sheet = true
- flex = true
- errors = []

### LINE 總控 v1.9.7

- doPost = true
- oldDoPost = true
- tool75 = true
- manufacturingToolParser.製造工具 = true
- manufacturingToolParser.工具中心 = true
- manufacturingToolParser.A916查詢不得命中 = true
- errors = []

### 38_LINE v1.8.8

- 主管六格 layout 正確
- 製造生產 = 正式 /exec URI
- 製造工具 = message「製造工具」
- tool75 = true
- token = true
- errors = []

## 架構約束

- 不建立第二個 LINE Bot
- 不建立第二個 Web App
- 不更換正式 Web App URL
- 既有智慧5S、報工、製造AI保留
- 製造工具由 Sheet 動態擴充，不建立資訊孤島
