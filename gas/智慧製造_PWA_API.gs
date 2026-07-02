/** 智慧製造 PWA API：提供 GitHub Pages 前端讀寫 Google Sheets */
const PWA_主資料庫ID='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
const PWA_API_TOKEN='';
function doGet(e){return PWA_處理_(e,'GET')}
function doPost(e){return PWA_處理_(e,'POST')}
function PWA_處理_(e,method){try{const p=PWA_參數_(e,method);if(PWA_API_TOKEN&&String(p.token||'')!==PWA_API_TOKEN)throw new Error('API_TOKEN_INVALID');let out;switch(String(p.action||'')){case'ping':out={ok:true,message:'PWA API OK'};break;case'listSheets':out=PWA_分頁_(p);break;case'sheetData':out=PWA_讀取_(p);break;case'updateRow':out=PWA_更新_(p);break;case'appendRow':out=PWA_新增_(p);break;case'deleteRow':out=PWA_刪除_(p);break;case'dashboard':out=PWA_首頁_(p);break;default:out={ok:false,error:'UNKNOWN_ACTION'}}return PWA_JSON_(out,p.callback)}catch(err){return PWA_JSON_({ok:false,error:String(err.message||err)},e&&e.parameter&&e.parameter.callback)}}
function PWA_參數_(e,method){const p=Object.assign({},e&&e.parameter?e.parameter:{});if(method==='POST'&&e&&e.postData&&e.postData.contents){try{Object.assign(p,JSON.parse(e.postData.contents))}catch(x){}}['values','headers','object'].forEach(k=>{if(typeof p[k]==='string'&&/^[\[{]/.test(p[k])){try{p[k]=JSON.parse(p[k])}catch(x){}}});return p}
function PWA_SS_(p){return SpreadsheetApp.openById(p.spreadsheetId||PWA_主資料庫ID)}
function PWA_SH_(p){const sh=PWA_SS_(p).getSheetByName(String(p.sheet||''));if(!sh)throw new Error('找不到分頁：'+p.sheet);return sh}
function PWA_分頁_(p){const ss=PWA_SS_(p);return{ok:true,sheets:ss.getSheets().map(s=>({name:s.getName(),sheetId:s.getSheetId(),rows:s.getLastRow(),columns:s.getLastColumn()}))}}
function PWA_讀取_(p){const sh=PWA_SH_(p),lr=sh.getLastRow(),lc=sh.getLastColumn();if(!lr||!lc)return{ok:true,headers:[],rows:[]};const v=sh.getRange(1,1,lr,lc).getDisplayValues(),h=v[0],q=String(p.query||'').toLowerCase(),lim=Math.min(Number(p.limit||200),1000),rows=[];for(let i=1;i<v.length&&rows.length<lim;i++){if(q&&v[i].join(' ').toLowerCase().indexOf(q)===-1)continue;const o={};h.forEach((x,j)=>o[x||('欄'+(j+1))]=v[i][j]);rows.push({rowNumber:i+1,values:v[i],object:o})}return{ok:true,sheet:sh.getName(),headers:h,rows:rows,lastRow:lr,lastColumn:lc}}
function PWA_更新_(p){const sh=PWA_SH_(p),r=Number(p.rowNumber);if(r<2)throw new Error('rowNumber不可小於2');const lc=sh.getLastColumn();sh.getRange(r,1,1,lc).setValues([PWA_列_(p,lc)]);return{ok:true,rowNumber:r}}
function PWA_新增_(p){const sh=PWA_SH_(p),lc=Math.max(sh.getLastColumn(),1);sh.appendRow(PWA_列_(p,lc));return{ok:true,rowNumber:sh.getLastRow()}}
function PWA_刪除_(p){const sh=PWA_SH_(p),r=Number(p.rowNumber);if(r<2)throw new Error('rowNumber不可小於2');sh.deleteRow(r);return{ok:true,rowNumber:r}}
function PWA_列_(p,lc){let v=Array.isArray(p.values)?p.values.slice():[];while(v.length<lc)v.push('');return v.slice(0,lc)}
function PWA_首頁_(p){const ss=PWA_SS_(p),c=n=>{const s=ss.getSheetByName(n);return s?Math.max(s.getLastRow()-1,0):0};return{ok:true,data:{todaySchedule:c('16_自動派班結果'),todayReport:c('19_現場報工回寫'),notReported:c('20_工單進度追蹤'),warnings:c('15_排程警示')+c('18_派班警示')}}}
function PWA_JSON_(o,cb){const j=JSON.stringify(o);return ContentService.createTextOutput(cb?String(cb)+'('+j+');':j).setMimeType(cb?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON)}
