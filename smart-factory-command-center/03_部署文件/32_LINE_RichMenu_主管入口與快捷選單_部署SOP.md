# 32_LINE Rich Menu｜主管入口與快捷選單｜部署 SOP

## 一、模組定位

本階段只處理 LINE Rich Menu 主管入口，不修改既有 webhook 主流程，不進入 PWA、排程、報工扣工單等後續階段。

Rich Menu 採六宮格：

| 位置 | 名稱 | LINE 動作 |
|---|---|---|
| 左上 | 主管戰情 | message：主管戰情 |
| 中上 | 今日戰情 | message：今日戰情 |
| 右上 | 昨日戰情 | message：昨日戰情 |
| 左下 | 報工作業 | uri：GAS Web App URL?page=07_報工作業V2；無 URL 時 message：報工 |
| 中下 | 主檔檢查 | message：主檔檢查 |
| 右下 | AI摘要 | message：AI摘要 |

## 二、必要設定

Apps Script 專案屬性必須有：

| 屬性名稱 | 必填 | 說明 |
|---|---:|---|
| LINE_CHANNEL_ACCESS_TOKEN | 是 | LINE Messaging API Channel access token |
| LINE_RICH_MENU_主管入口圖片網址 | 建議 | Rich Menu 圖片網址，PNG/JPEG，小於 1MB |

若未設定 `LINE_RICH_MENU_主管入口圖片網址`，系統會使用內建備援圖片網址，確保流程可測。

## 三、執行順序

1. 執行 `測試_32_LINE_RichMenu主管入口與快捷選單_本機規格()`
   - 標準：回傳 `成功: true`
   - 檢查：尺寸 1200×810、比例 >= 1.45、六個區塊未超出範圍、chatBarText 為「主管入口」

2. 執行 `測試_32_LINE_RichMenu主管入口圖片讀取()`
   - 標準：回傳 `成功: true`
   - 檢查：圖片可讀取、MIME 類型為 image、大小小於 1MB

3. 執行 `測試_32_LINE_RichMenu主管入口與快捷選單_LINE驗證()`
   - 標準：回傳 `LINE Rich Menu 物件驗證通過`
   - 目的：只呼叫 LINE validate，不建立正式選單

4. 執行 `設定32_LINE_RichMenu主管入口與快捷選單()`
   - 標準：回傳 `成功: true`
   - 結果：建立 Rich Menu、上傳圖片、設為所有使用者預設 Rich Menu、寫入 `LINE_RICH_MENU_主管入口_ID`

5. 執行 `查詢32_LINE_RichMenu主管入口目前狀態()`
   - 標準：LINE 目前預設 ID 與 Script Properties 記錄 ID 一致

## 四、Google Sheets 檢查點

成功上線後，資料庫會出現或更新工作表：

| 工作表 | 用途 |
|---|---|
| 32_LINE_RichMenu設定 | 記錄建立、清除、richMenuId、版本、備註 |

## 五、回復與重建

若要回復或重新建立：

1. 執行 `清除32_LINE_RichMenu主管入口與快捷選單()`
2. 確認 LINE 預設 Rich Menu 已移除
3. 重新執行本 SOP 的測試與設定流程

## 六、標準

- 不修改 `doPost(e)`。
- 不新增 webhook 分支。
- 不影響既有 LINE 文字指令。
- 圖片尺寸固定 1200×810。
- 可點區塊固定 6 個。
- `chatBarText` 固定為「主管入口」。
- 報工作業優先直開 `07_報工作業V2`。
