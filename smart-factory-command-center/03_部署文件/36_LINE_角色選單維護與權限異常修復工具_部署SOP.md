# 36_LINE｜角色選單維護與權限異常修復工具｜部署 SOP

## 一、模組定位

第 36 階段只做 LINE 角色選單維護與權限異常修復。

本階段不修改：

- 33_LINE 身份權限判斷
- 34_LINE 角色選單分流邏輯
- 35_LINE 一般員工 Rich Menu 圖片
- 報工 PWA
- 自動排程

## 二、已新增 GAS 檔案

```text
smart-factory-command-center/01_GAS後端/36_LINE_角色選單維護與權限異常修復工具.gs
```

## 三、會新增工作表

| 工作表 | 用途 |
|---|---|
| 36_LINE選單維護掃描 | 掃描每個 LINE_USER_ID 應套用與目前套用的 Rich Menu |
| 36_LINE選單維護紀錄 | 記錄修復、清除、掃描、初始化動作 |

## 四、必要 Script Properties

| 屬性 | 說明 |
|---|---|
| LINE_CHANNEL_ACCESS_TOKEN | LINE Messaging API token |
| LINE_RICH_MENU_主管入口_ID | 主管入口 Rich Menu ID |
| LINE_RICH_MENU_一般員工_ID | 一般員工入口 Rich Menu ID |

## 五、部署順序

1. 將 GAS 檔加入 Apps Script。
2. 執行：

```javascript
初始化36_LINE角色選單維護與權限異常修復工具()
```

3. 執行：

```javascript
測試36_LINE選單維護_本機規格()
```

4. 執行：

```javascript
掃描36_LINE權限與選單異常()
```

5. 若有異常，執行：

```javascript
修復36_LINE全部使用者選單()
```

6. 修復後再次執行：

```javascript
掃描36_LINE權限與選單異常()
```

## 六、單人維護函數

### 查詢指定人員選單狀態

可用 LINE_USER_ID、工號或姓名。

```javascript
查詢36_LINE指定使用者選單狀態('fhfi573')
```

### 修復指定人員選單

```javascript
修復36_LINE指定使用者選單('fhfi573')
```

### 清除指定人員個人選單

清除後該使用者會回到全體預設 Rich Menu。

```javascript
清除36_LINE指定使用者個人選單('fhfi573')
```

## 七、掃描結果判斷

| 判斷結果 | 意義 | 修復方式 |
|---|---|---|
| 正常 | 目前 richMenuId 與應套用 richMenuId 一致 | 不處理 |
| 異常 | 缺少 ID、查不到目前 ID、或目前選單與角色不一致 | 執行修復函數 |
| 停用 | 33_LINE身份權限 啟用 = 否 | 不處理 |

## 八、驗收標準

| 項目 | 標準 |
|---|---|
| 本機規格 | `測試36_LINE選單維護_本機規格()` 成功 true |
| 掃描 | `掃描36_LINE權限與選單異常()` 能產生掃描表 |
| 修復 | `修復36_LINE全部使用者選單()` 成功數大於 0 或沒有異常 |
| 工作表 | 出現 `36_LINE選單維護掃描`、`36_LINE選單維護紀錄` |
| LINE | 工程師仍是主管入口，一般員工仍是報工入口 |

## 九、注意事項

`掃描36_LINE權限與選單異常()` 會呼叫 LINE API 查每個人的 Rich Menu 狀態。若人數變多，建議不要短時間重複執行太多次。
