# 化新精密｜智慧 5S 管理平台 v1.0.13

## JSONP／iPhone 後端連線修復驗收紀錄

### 已完成

1. PWA 正式版本升級至 v1.0.13。
2. iPhone / Safari / PWA 讀取採三層容錯：
   - 第一層：Google Apps Script `fetch`。
   - 第二層：Google Apps Script JSONP。
   - 第三層：Google 試算表 Visualization API 唯讀備援。
3. 不使用 Cloudflare Worker，不需要 Cloudflare 帳號。
4. 新增 `智慧5S_Google試算表直讀備援.js`。
5. `index.html`、Web Manifest、Service Worker 全部切換 v1.0.13 快取版本。
6. GAS `doGet` 已在 GitHub 正式主線加入統一 JSONP 外層：
   - 支援既有 TextOutput。
   - 支援一般 JSON 物件。
   - callback 名稱採白名單正規表示式驗證。
   - 無 callback 時維持既有 JSON / HTML 行為。
7. LINE Webhook、報工、中央資料庫與 38.7 主線不變。

### 正式資料庫

- 試算表：`⭐智慧工廠主資料庫`
- ID：`19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8`
- 智慧5S登入人員來源：`01_人員主檔`

### 安全注意

目前 Google Drive 權限檢查顯示主資料庫存在 `anyone / writer` 公開編輯權限。正式環境應降為「知道連結的任何人可檢視」，不得維持公開可編輯。

前端程式不以 Google 試算表直讀執行寫入；所有新增、更新仍走 Google Apps Script 後端。

### GitHub 正式修復提交

- `0a0e1f697a5c408d37fd0fb75691724b31778512`：新增免 Cloudflare Google 試算表直讀備援。
- `625e4f61caf5a47e08a97346639a005efc656630`：升級 v1.0.13 並啟用備援。
- `98b0a1705d5a9deef53c8582bdb5bbc721246e0e`：PWA 入口切換。
- `3b1d9063126babf21e16479e20db575e3e278c66`：PWA 啟動網址升級。
- `ee8d7b2a3c182969316b726490cb179377772493`：Service Worker 快取升級。
- `9c9a6714ca402de7a9b4960cdb2898ca18327547`：GAS doGet 統一加入安全 JSONP 外層。

## 驗收判定

程式碼與 GitHub Pages 端已完成免 Cloudflare 架構修復。Google Apps Script 正式部署版本仍必須包含 GitHub 最新 `doGet` 修復內容，才能讓 GAS JSONP 成為正式第二通道。
