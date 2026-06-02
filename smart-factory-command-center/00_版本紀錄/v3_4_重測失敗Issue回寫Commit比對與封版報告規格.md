# v3.4.0 重測失敗、Issue 回寫、Commit 比對與封版報告規格

## 一、版本定位

```text
v3.4.0 = 正式上線封版閉環版
```

此版將上線修補流程補成完整閉環：

```text
重測失敗
→ 自動再開修補任務
→ GitHub Issue 狀態回寫
→ Commit 影響範圍比對
→ 正式上線封版報告
```

---

## 二、新增 GAS 檔案

```text
01_GAS後端/v3_4_重測失敗再開修補Issue回寫Commit比對與封版報告.gs
```

新增函數：

```text
升級_v3_4_封版與影響範圍表()
重測失敗_v3_4_再開修補任務(重測編號)
掃描_v3_4_重測失敗自動再開修補任務()
同步_v3_4_GitHubIssue狀態(Issue編號)
同步_v3_4_全部GitHubIssue狀態()
比對_v3_4_單一Commit影響範圍(CommitSHA)
比對_v3_4_Commit影響範圍(BaseSHA, HeadSHA)
產生_v3_4_正式上線封版報告()
取得_v3_4_封版總覽()
```

---

## 三、新增資料表

### 00_Commit影響範圍

欄位：

```text
影響編號、建立時間、比對類型、GitHub倉庫、BaseSHA、HeadSHA、CommitSHA、檔案路徑、變更狀態、新增行、刪除行、變更行、檔案URL、備註、更新時間
```

### 00_正式上線封版報告

欄位：

```text
封版編號、建立時間、系統版本、封版狀態、錯誤總數、修補任務總數、修補完成率、重測總數、重測通過率、未完成數、重測失敗數、GitHub對照數、Commit影響檔案數、報告內容、更新時間
```

---

## 四、GitHub 對照表補充欄位

v3.4 會補強 `00_修補GitHub對照`：

```text
Issue狀態、Issue標籤、Issue更新時間、回寫時間
```

---

## 五、新增前端頁面

```text
docs/release-board.html
```

功能：

- 重測失敗再開修補任務。
- 同步全部 GitHub Issue 狀態。
- 比對單一 Commit 影響範圍。
- 比對 Base...Head 影響範圍。
- 產生正式上線封版報告。
- 查看封版報告紀錄。
- 查看 Commit 影響範圍。

---

## 六、封版判斷規則

```text
未完成修補任務 = 0
且
重測失敗項目 = 0
```

則封版狀態：

```text
可封版
```

否則：

```text
暫不封版
```

---

## 七、LINE 指令

新增：

```text
封版報告
```

---

## 八、正式封版流程

```text
1. system-test.html 執行全部測試
2. fix-board.html 完成修補任務
3. retest-board.html 完成重測
4. release-board.html 掃描重測失敗並再開修補
5. release-board.html 同步 GitHub Issue 狀態
6. release-board.html 比對 Commit 影響範圍
7. release-board.html 產生正式上線封版報告
8. 若狀態為「可封版」，才進入正式上線封版
```

---

## 九、下一版 v3.5.0 建議

```text
正式部署手冊自動產生
封版 PDF 匯出
封版後版本鎖定
正式上線交接清單
```
