var 主檔={人員:[],產品:[],機台:[],工站:[],工單:[]};
function v(id){var x=document.getElementById(id);return x?x.value.trim():''}
function setv(id,val){var x=document.getElementById(id);if(x)x.value=val||''}
function out(t){var a=document.getElementById('狀態');var b=document.getElementById('結果');if(a)a.textContent=t;if(b)b.textContent=t}
function url(){return localStorage.getItem('GAS網址')||v('GAS網址')}
function 唯一(a){return Array.from(new Set(a.filter(Boolean)))}
function 拆機台(s){return String(s||'').split(/[,，、\s]+/).filter(Boolean)}
async function saveUrl(){var u=v('GAS網址');if(!u)throw new Error('請先貼GAS網址');localStorage.setItem('GAS網址',u);out('✅ GAS網址已儲存，可按「部署檢查」或「載入主檔下拉」')}
async function api(action,data){var u=url();if(!u)throw new Error('請先貼GAS網址');var r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action:action},data||{}))});return r.json()}
function 建立清單值(id,arr){var d=document.getElementById(id);if(!d)return;d.innerHTML='';唯一(arr).slice(0,800).forEach(function(x){var o=document.createElement('option');o.value=x;d.appendChild(o)})}
function 建立清單(id,arr,欄){建立清單值(id,(arr||[]).map(function(x){return x[欄]||''}))}
async function checkDeploy(){try{out('部署檢查中...');var r=await api('報工作業v2部署檢查',{前端版本:'20260610_02',頁面:'docs/work-report-v2.html'});out(JSON.stringify(r,null,2));if(!r.成功)throw new Error(r.訊息||'部署檢查未通過')}catch(e){out('錯誤：'+e.message)}}
async function loadMaster(){try{out('讀取主檔中...');var r=await api('取得主檔資料');if(!r.成功)throw new Error(r.訊息||'主檔讀取失敗');主檔=r;建立清單('人員清單',r.人員||[],'姓名');建立清單('產品清單',r.產品||[],'產品編號');建立清單('機台清單',r.機台||[],'機台編號');建立清單('工站清單',r.工站||[],'工站名稱');建立清單('工單清單',r.工單||[],'工單編號');out('✅ 主檔已載入：人員'+(r.人員||[]).length+'，產品'+(r.產品||[]).length+'，機台'+(r.機台||[]).length+'，工站'+(r.工站||[]).length)}catch(e){out('錯誤：'+e.message)}}
function autoPerson(){var n=v('姓名');var p=(主檔.人員||[]).find(function(x){return String(x.姓名||'')===n||String(x.工號||'')===v('工號')});if(p){setv('工號',p.工號);setv('姓名',p.姓名);setv('班別',p.班別)}}
function autoProduct(){var k=v('產品編號');var p=(主檔.產品||[]).find(function(x){return String(x.產品編號||'')===k});if(p)setv('品名',p.品名);var rows=(主檔.工站||[]).filter(function(x){return !k||String(x.產品編號||'')===k});建立清單('工站清單',rows,'工站名稱');setv('工站名稱','');建立清單值('機台清單',[]);out('已依產品篩選工站：'+rows.length+'筆')}
function autoStation(){var s=v('工站名稱');var k=v('產品編號');var rows=(主檔.工站||[]).filter(function(x){return String(x.工站名稱||'')===s&&(!k||String(x.產品編號||'')===k)});var ms=[];rows.forEach(function(x){ms=ms.concat(拆機台(x.機台編號清單))});建立清單值('機台清單',ms);if(ms.length===1)setv('機台編號',ms[0]);out('已依工站篩選機台：'+唯一(ms).length+'台')}
function autoMachine(){var m=v('機台編號');var x=(主檔.機台||[]).find(function(a){return String(a.機台編號||'')===m});if(x)setv('區域',x.區域)}
async function submitReport(){try{var d={來源:'07_報工作業v2',前端版本:'20260610_02',後端函數:'寫入報工作業v2_化新班別版'};['工號','姓名','班別','區域','機台編號','產品編號','品名','工站名稱','工單編號','良品數','不良數','停機分鐘','停機原因','換刀次數','備註'].forEach(function(k){d[k]=v(k)});if(!d.工號&&!d.姓名)throw new Error('請填工號或姓名');if(!d.產品編號)throw new Error('請填產品編號');if(!d.工站名稱)throw new Error('請填工站名稱');if(!d.機台編號)throw new Error('請填機台編號');if(Number(d.良品數||0)+Number(d.不良數||0)<=0)throw new Error('良品數+不良數必須大於0');out('送出中...');out(JSON.stringify(await api('寫入報工作業v2_化新班別版',d),null,2))}catch(e){out('錯誤：'+e.message)}}
window.addEventListener('load',function(){setv('GAS網址',localStorage.getItem('GAS網址')||'');out('系統已載入，請先貼上或確認GAS網址；正式送出前請先按「部署檢查」。');['姓名','工號'].forEach(function(id){var x=document.getElementById(id);if(x)x.addEventListener('change',autoPerson)});document.getElementById('產品編號').addEventListener('change',autoProduct);document.getElementById('工站名稱').addEventListener('change',autoStation);document.getElementById('機台編號').addEventListener('change',autoMachine)});
