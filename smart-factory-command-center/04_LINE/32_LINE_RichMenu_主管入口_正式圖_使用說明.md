# 32_LINE Rich Menu｜主管入口正式圖使用說明

## 重要

`32_LINE_RichMenu_主管入口_正式圖.png` 若在 GitHub 內看到的是一長串 `iVBOR...` 文字，代表該檔案是 Base64 文字檔，不是正式圖片檔。

LINE Rich Menu 圖片必須使用真正的 PNG/JPEG 公開圖片網址。

## 建議做法

1. 將正確圖片上傳到 Google Drive。
2. 分享權限改為「知道連結的任何人可查看」。
3. 取出檔案 ID。
4. 組成圖片直連網址：

```text
https://drive.google.com/uc?export=download&id=你的檔案ID
```

5. 到 Apps Script 專案設定 → 指令碼屬性，新增或修改：

```text
LINE_RICH_MENU_主管入口圖片網址
```

值填入上述圖片直連網址。

6. 依序執行：

```javascript
測試_32_LINE_RichMenu主管入口圖片讀取()
清除32_LINE_RichMenu主管入口與快捷選單()
設定32_LINE_RichMenu主管入口與快捷選單()
查詢32_LINE_RichMenu主管入口目前狀態()
```
