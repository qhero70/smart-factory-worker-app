# 34_LINE｜使用者角色分流與一般員工選單｜部署 SOP

## 一、模組定位

第 34 階段只處理 LINE Rich Menu 依角色分流。

- 主管、班長、工程師：使用 `主管入口` Rich Menu。
- 現場人員：使用 `報工入口` Rich Menu。
- 未綁定人員：提示綁定身份。

本階段不改報工 PWA、不改排程、不改報工扣工單。

## 二、已新增檔案

```text
smart-factory-command-center/01_GAS後端/34_LINE_使用者角色分流與一般員工選單.gs
smart-factory-command-center/01_GAS後端/34_LINE_一般員工RichMenu建立.gs
smart-factory-command-center/01_GAS後端/34_LINE_主後端doPost正式替換段.gs
```

## 三、會使用的 Script Properties

| 屬性 | 說明 |
|---|---|
| LINE_CHANNEL_ACCESS_TOKEN | LINE Messaging API token |
| LINE_RICH_MENU_主管入口_ID | 第 32 階段建立的主管 Rich Menu ID |
| LINE_RICH_MENU_一般員工_ID | 第 34 階段建立的一般員工 Rich Menu ID |
| LINE_RICH_MENU_一般員工圖片網址 | 一般員工 Rich Menu 圖片網址，未設定時使用測試圖 |

## 四、會新增的工作表

| 工作表 | 用途 |
|---|---|
| 34_LINE選單分流紀錄 | 記錄每次角色選單套用、批次同步、錯誤訊息 |

## 五、主後端接線

將 `智慧製造中央作戰指揮中心.gs` 內原本的 `doPost(e)` 整段替換為：

```text
smart-factory-command-center/01_GAS後端/34_LINE_主後端doPost正式替換段.gs
```

重點順序：

```text
34_LINE 角色選單分流
↓
33_LINE 身份權限檢查
↓
31_LINE 戰情日期快選
↓
主管戰情直連
↓
一般 LINE Webhook
```

## 六、部署順序

1. 將三個 34 檔案加入 Apps Script。
2. 用 `34_LINE_主後端doPost正式替換段.gs` 替換主後端 `doPost(e)`。
3. 執行：

```javascript
初始化34_LINE使用者角色分流與一般員工選單()
```

4. 執行：

```javascript
測試34_LINE角色分流_本機規格()
```

5. 執行：

```javascript
測試34_LINE一般員工RichMenu_本機規格()
```

6. 執行：

```javascript
測試34_LINE一般員工RichMenu圖片讀取()
```

7. 執行：

```javascript
建立34_LINE一般員工RichMenu()
```

8. 建議執行：

```javascript
設定34_LINE一般員工RichMenu為預設()
```

9. 執行：

```javascript
批次同步34_LINE所有已綁定使用者選單()
```

## 七、LINE 指令

| 指令 | 用途 |
|---|---|
| 綁定 工號 | 綁定身份，並立即套用角色選單 |
| 權限檢查 | 由 33 階段回覆身份權限 |
| 選單更新 | 依目前身份重新套用選單 |
| 主管選單 | 有主管入口權限者可切回主管入口 |
| 員工選單 | 切到一般報工入口 |

## 八、驗收標準

| 測試項目 | 成功標準 |
|---|---|
| 工程師輸入 `選單更新` | 回覆已套用主管入口 |
| 現場人員輸入 `選單更新` | 回覆已套用一般員工入口 |
| 現場人員輸入 `主管選單` | 回覆權限不足 |
| 批次同步 | 已綁定人員依角色分流 |
| 工作表 | 出現 `34_LINE選單分流紀錄` |

## 九、標準

- 不改 32 Rich Menu 圖片。
- 不改 33 權限判斷。
- 34 只負責選單套用與分流紀錄。
- 一般員工仍可報工。
- 主管仍可看主管戰情。
