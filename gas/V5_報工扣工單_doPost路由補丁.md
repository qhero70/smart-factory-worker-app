# V5 報工扣工單 doPost 路由補丁

## 目的

讓 PWA 或測試工具可以呼叫：

```text
執行報工扣工單V1
寫入現場報工V1
```

## 要貼的位置

打開中央資料庫 GAS 主程式的 `doPost(e)`，找到這段判斷：

```javascript
else if(action==='執行自動派班V1'||action==='runDispatch') r=執行自動派班V1_(body);
```

在它下面加入：

```javascript
else if(action==='執行報工扣工單V1'||action==='runWorkReportDeduct') r=執行報工扣工單V1_(body);
else if(action==='寫入現場報工V1'||action==='submitWorkReport') r=寫入現場報工V1_(body);
```

## 完成後一定要重新部署

```text
部署 → 管理部署作業 → 編輯鉛筆 → 版本：新版本 → 部署
```

## 成功後會寫入

```text
19_現場報工回寫
20_工單進度追蹤
21_完工入庫建議
22_報工異常警示
```
