# v3.2.0 修補建議、GitHub Issue 與重測工具規格

## 一、版本定位

```text
v3.2.0 = 上線修補工程化版本
```

此版將 v3.1 的錯誤回報與修補任務，進一步升級成：

```text
錯誤回報
→ 自動分析修補建議
→ GitHub Issue 草稿 / 正式 Issue
→ 修補 Commit 對照
→ 修補完成後重測清單
```

---

## 二、新增 GAS 檔案

```text
01_GAS後端/v3_2_修補建議GitHubIssue與重測工具.gs
```

新增函數：

```text
升級_v3_2_修補GitHub與重測表()
產生_v3_2_修補建議(修補編號)
建立_v3_2_GitHubIssue草稿(修補編號)
建立_v3_2_GitHubIssue(修補編號)
登記_v3_2_修補Commit(修補編號, CommitSHA, 備註)
建立_v3_2_修補完成重測清單(修補編號)
取得_v3_2_修補GitHub總覽()
```

---

## 三、新增資料表

### 00_修補GitHub對照

欄位：

```text
對照編號、建立時間、修補編號、GitHub倉庫、Issue標題、Issue編號、Issue網址、CommitSHA、Commit網址、對照狀態、備註、更新時間
```

用途：

- 對照修補任務與 GitHub Issue。
- 對照修補任務與 Commit SHA。
- 保留修補證據鏈。

### 00_修補重測清單

欄位：

```text
重測編號、建立時間、修補編號、來源錯誤編號、重測項目、重測類型、重測狀態、重測結果、重測時間、備註、更新時間
```

用途：

- 修補完成後產生重測項目。
- 確認原錯誤是否已解除。
- 作為正式上線驗收依據。

---

## 四、上線修補看板升級

更新：

```text
docs/fix-board.html
```

每張修補任務卡新增按鈕：

```text
修補建議
Issue草稿
建立重測
登記Commit
```

---

## 五、Issue 建立規則

若 `00_系統設定` 有設定：

```text
GITHUB_TOKEN
GITHUB_REPO_FULL_NAME
```

系統可嘗試正式建立 GitHub Issue。

若沒有 `GITHUB_TOKEN`，系統不會中斷，會回傳：

```text
Issue 草稿
```

可人工複製貼到 GitHub。

---

## 六、修補建議分類

| 修補類型 | 建議檔案 |
|---|---|
| LINE Webhook | v3_0_GAS主控入口與LINE最終整合版.gs、LINEBot_FlexMessage主選單.gs |
| GAS API | v3_0_GAS主控入口與LINE最終整合版.gs、對應 action 的 GAS 工具檔 |
| GitHub Pages | docs/index.html、docs/system-test.html、錯誤對應的 docs/*.html |
| 資料表欄位 | v3_0_GAS主控入口與LINE最終整合版.gs、資料表升級工具 gs |
| 一般修補 | 錯誤對應模組 |

---

## 七、正式修補流程

```text
1. system-test.html 執行全部測試
2. 回報失敗項目
3. fix-board.html 查看修補任務
4. 按「修補建議」確認處理方向
5. 按「Issue草稿」產生 GitHub Issue 內容
6. 修補程式後按「登記Commit」
7. 按「建立重測」產生重測清單
8. 回 system-test.html 重新測試
9. 修補任務狀態改為完成
```

---

## 八、下一版 v3.3.0 建議

```text
GitHub Issue 正式建立前端按鈕
重測清單狀態更新頁
修補完成率儀表板
上線修補週報 / 月報
```
