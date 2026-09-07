# LINE 報工作業 V4 接上 PWA

## 安裝

1. 開啟原本的 [NEXUS OS Apps Script 專案](https://script.google.com/home/projects/1P4tj0j_U15yzjuCsvqK2ONLBbL0-cEQvMT8URv3XhIlbrnuogqbKYlbo/edit)。
2. 左側「檔案」旁按「＋」→「指令碼」，命名 `40_LINE報工作業V4接上PWA`。
3. 刪除新檔的預設內容，貼上 `01_GAS後端/40_LINE報工作業V4接上PWA.gs` 的全部內容，儲存。
4. 上方函式選單選 `套用40_LINE報工作業V4到PWA`，按「執行」一次。這是正式套用功能。
5. 執行紀錄顯示「完成：LINE『報工作業』已接到 V4 PWA。」後，關閉再開啟 LINE 聊天室。

這次透過 LINE API 更新選單連結，無須重新部署 Webhook；v1.9.3 主路由繼續使用。沒有額外測試函式或測試訊息。

## 完成後

- 主管及一般員工選單的「報工作業」都開啟現有 V4 PWA。
- 原主管身分、選單圖片、智慧5S入口、其餘按鈕沿用原設定。
- 「選單更新」會依現有 34_LINE 角色分流模組套用新的選單 ID。
- 程式先準備新選單及圖片，再更新正式 ID 和已綁定使用者。舊選單保留；中斷後可再執行同一函式續作，已準備的選單會重複使用。
- 程式使用原專案的 `LINE_CHANNEL_ACCESS_TOKEN`，不用把權杖貼進程式。

正式報工入口：

[化新報工 V4 PWA](https://qhero70.github.io/smart-factory-worker-app/work-report-v4-477.html?v=539&fix=stable-no-flicker&openExternalBrowser=1)

LINE 入口帶有 `openExternalBrowser=1`，依 [LINE 官方網址規則](https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/#opening-url-in-external-browser) 用外部瀏覽器開啟。iPhone 可在 Safari 的分享選單選「加入主畫面」，之後從主畫面開啟報工。

## 資料接點

- 延續原 V4 穩定版 539 的表單及報工邏輯。
- 沿用既有 V4 報工 API：`AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ`。
- 沿用中央試算表 `19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8`。
- 不使用會清空同網域快取及解除全部 Service Worker 的 530 重置頁。
- PWA 安裝入口已指向穩定版 539；報工 Service Worker 僅清理報工快取，保留智慧5S快取。
- 沒有提交任何正式報工資料，也沒有傳送 LINE 訊息。本次沒有執行測試。
