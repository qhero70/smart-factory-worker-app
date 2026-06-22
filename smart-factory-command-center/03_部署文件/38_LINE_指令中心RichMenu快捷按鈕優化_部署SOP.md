# 38_LINE｜指令中心 Rich Menu 快捷按鈕優化｜部署 SOP

## 一、模組定位

第 38 階段只處理 Rich Menu 快捷按鈕優化。

本階段不修改：

- 33_LINE 身份權限
- 34_LINE 角色分流
- 35_LINE 圖片正式化邏輯
- 36_LINE 維護工具
- 37_LINE 指令中心
- 報工 PWA
- 自動排程

## 二、已新增檔案

```text
smart-factory-command-center/01_GAS後端/38_LINE_指令中心RichMenu快捷按鈕優化.gs
```

## 三、正式圖片

| 圖片 | 用途 |
|---|---|
| 38_LINE_RichMenu_主管入口_快捷優化正式圖.png | 主管快捷入口 |
| 38_LINE_RichMenu_一般員工入口_快捷優化正式圖.png | 員工快捷入口 |

## 四、新版主管入口六宮格

| 位置 | 功能 | LINE 動作 |
|---|---|---|
| 左上 | 主管戰情 | message：主管戰情 |
| 中上 | 今日戰情 | message：今日戰情 |
| 右上 | 指令中心 | message：指令 |
| 左下 | 報工作業 | uri：報工作業 V2；無 URL 時 message：報工作業 |
| 中下 | 我的狀態 | message：我的狀態 |
| 右下 | 選單更新 | message：選單更新 |

## 五、新版一般員工入口六宮格

| 位置 | 功能 | LINE 動作 |
|---|---|---|
| 左上 | 報工作業 | uri：報工作業 V2；無 URL 時 message：報工作業 |
| 中上 | 我的狀態 | message：我的狀態 |
| 右上 | 指令中心 | message：指令 |
| 左下 | 選單更新 | message：選單更新 |
| 中下 | 選單說明 | message：選單說明 |
| 右下 | 身份綁定 | message：綁定 |

## 六、Script Properties

| 屬性 | 說明 |
|---|---|
| LINE_RICH_MENU_主管入口圖片網址_38 | 主管快捷入口圖片網址 |
| LINE_RICH_MENU_一般員工圖片網址_38 | 員工快捷入口圖片網址 |
| LINE_RICH_MENU_主管入口_ID | 由 38 建立後覆蓋 |
| LINE_RICH_MENU_一般員工_ID | 由 38 建立後覆蓋 |

## 七、部署順序

1. 上傳兩張 38 圖片到 Google Drive。
2. 分享權限設為「知道連結的任何人可查看」。
3. 在 Apps Script 設定圖片網址：

```text
LINE_RICH_MENU_主管入口圖片網址_38
LINE_RICH_MENU_一般員工圖片網址_38
```

4. 將 GAS 檔加入 Apps Script。
5. 執行：

```javascript
初始化38_LINE指令中心RichMenu快捷按鈕優化()
```

6. 執行：

```javascript
測試38_LINE快捷RichMenu_本機規格()
```

7. 執行：

```javascript
測試38_LINE快捷RichMenu圖片讀取()
```

8. 執行：

```javascript
建立38_LINE主管快捷RichMenu()
```

9. 執行：

```javascript
建立38_LINE一般員工快捷RichMenu()
```

10. 執行：

```javascript
設定38_LINE一般員工快捷RichMenu為預設()
```

11. 執行：

```javascript
批次同步34_LINE所有已綁定使用者選單()
```

## 八、一鍵上線函數

若前置設定都完成，也可直接執行：

```javascript
一鍵上線38_LINE快捷RichMenu並同步()
```

## 九、驗收標準

| 測試 | 正確結果 |
|---|---|
| 主管入口點指令中心 | 回覆 37 指令中心總覽 |
| 主管入口點我的狀態 | 回覆身份、權限、目標選單 |
| 主管入口點選單更新 | 回覆目標選單：主管入口 |
| 員工入口點指令中心 | 回覆 37 指令中心總覽 |
| 員工入口點選單更新 | 回覆目標選單：一般員工入口 |
| 34 分流 | 工程師主管入口，現場人員報工入口 |

## 十、注意事項

38 會建立新的 Rich Menu ID，並覆蓋：

```text
LINE_RICH_MENU_主管入口_ID
LINE_RICH_MENU_一般員工_ID
```

這是正常行為，因為 34 與 36 都會讀這兩個屬性作為目前正式選單 ID。
