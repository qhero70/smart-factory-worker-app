const 欄位清單=['工號','姓名','班別','區域','機台編號','產品編號','品名','工站名稱','工單編號','良品數','不良數','停機分鐘','停機原因','換刀次數','備註'];
function 讀取GAS網址(){return localStorage.getItem('GAS網址')||''}
function 儲存設定(){localStorage.setItem('GAS網址',document.getElementById('GAS網址').value.trim());alert('已儲存 GAS Web App URL')}
async function 呼叫API(action,data){const url=讀取GAS網址();if(!url)throw new Error('請先貼上 GAS Web App URL');const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},data||{}))});return await r.json()}
async function 測試連線(){try{document.getElementById('連線結果').textContent=JSON.stringify(await 呼叫API('健康檢查',{}),null,2)}catch(e){document.getElementById('連線結果').textContent=e.message}}
async function 送出報工(){try{const data={來源:'07_報工作業v