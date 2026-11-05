/* 高解析工件照片：IndexedDB 保留未縮小檔案；雲端上傳由使用者選擇 Drive；不假稱自動上傳。 */
(function () {
'use strict';
const 資料庫名稱='刀具精靈_工件三視圖原圖_v1';
const 可用視圖=['正視圖','俯視圖','側視圖'];

/* 私有 Google Drive 高解析照片 API：在原本 GAS 完成部署及權限驗證前，不會顯示成功。 */
let 正式照片服務可用_=false;
let 本次照片授權碼_='';
let 照片上傳執行中_=false;
const 原圖雲端根ID_='1au_lydLX3NAEwEs8lzLF58iJ5uzKveYQ';
function 正式雲端檔案_(){
 if(!appData.工件三視圖雲端檔案||typeof appData.工件三視圖雲端檔案!=='object')
   appData.工件三視圖雲端檔案={正視圖:null,俯視圖:null,側視圖:null};
 return appData.工件三視圖雲端檔案;
}
function 高解析雲端訊息_(message,warning=false){
 const el=document.getElementById('工件高清服務狀態');
 if(el){el.textContent=message;el.dataset.warning=warning?'1':'0';}
 訊息(message);
}
async function 核對工件雲端服務_(){
 try{
  const r=await formalJsonp_({api:'刀具表_照片設定'});
  正式照片服務可用_=!!(r?.成功&&r.照片功能版本==='1.0'&&r.正式照片庫ID===原圖雲端根ID_&&r.可上傳);
  高解析雲端訊息_(正式照片服務可用_?'☁️ 雲端 API 已啟用，輸入授權碼即可上傳。':'⚠️ 雲端尚未啟用：'+(r?.訊息||'照片資料夾權限尚未符合安全要求'),!正式照片服務可用_);
 }catch(e){
  正式照片服務可用_=false;
  高解析雲端訊息_('⚠️ 照片雲端 API 尚未部署。原圖先留在本機，不會顯示假上傳成功。',true);
 }
 return 正式照片服務可用_;
}
window.設定照片雲端授權碼_=function(){
 const field=document.getElementById('工件高清授權碼');
 const code=String(field?.value||'').trim();
 if(code.length<24){高解析雲端訊息_('請輸入管理員提供的完整照片授權碼（至少 24 字）。',true);return;}
 本次照片授權碼_=code;
 if(field)field.value='';
 高解析雲端訊息_(正式照片服務可用_?'✅ 本次授權碼已設定，可以上傳。':'⚠️ 已暫存授權碼，但後端尚未啟用。',!正式照片服務可用_);
};
function 原圖雲端提交_(api,values,timeoutMs=120000){
 return new Promise((resolve,reject)=>{
  const nonce=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'R'+Date.now()+'-'+Math.random().toString(36).slice(2).padEnd(22,'0');
  const frame=document.createElement('iframe'),form=document.createElement('form');
  frame.hidden=true;frame.name='工件照片_'+nonce;
  form.hidden=true;form.method='POST';form.action=FORMAL_GAS_API_URL;form.target=frame.name;
  const fields=Object.assign({},values,{api,請求碼:nonce,授權碼:本次照片授權碼_});
  Object.entries(fields).forEach(([key,value])=>{
   const input=document.createElement('input');input.type='hidden';input.name=key;input.value=String(value??'');form.appendChild(input);
  });
  let completed=false,timer=null;
  const clean=(error,data)=>{
   if(completed)return;
   completed=true;clearTimeout(timer);window.removeEventListener('message',receive);
   setTimeout(()=>{form.remove();frame.remove();},150);
   error?reject(error):resolve(data);
  };
  const receive=event=>{
   // GAS HtmlService 可能位於第二層 Google 沙箱；以 Google 來源＋隨機請求碼驗證，不只看 iframe source。
   const origin=String(event.origin||'');
   if(!/^https:\/\/(?:script\.google\.com|(?:[a-z0-9-]+\.)*script\.googleusercontent\.com)$/i.test(origin))return;
   const data=event.data;
   if(!data||data.來源!=='刀具表精靈照片服務'||data.請求碼!==nonce)return;
   if(data.成功!==true)clean(new Error(data.訊息||'照片後端未完成'));
   else clean(null,data);
  };
  window.addEventListener('message',receive);
  document.body.append(frame,form);
  timer=setTimeout(()=>clean(new Error('照片雲端逾時；本機原始照片仍保留')),timeoutMs);
  try{form.submit();}catch(e){clean(e);}
 });
}
function 讀取檔案為資料網址_(file) {
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||''));
  reader.onerror=()=>reject(new Error('照片讀取失敗'));
  reader.readAsDataURL(file);
 });
}
async function 正式照片上傳_(key){
 if(!可用視圖.includes(key))return false;
 if(照片上傳執行中_){高解析雲端訊息_('上一張照片仍在上傳中。',true);return false;}
 if(!await 核對工件雲端服務_())return false;
 if(!本次照片授權碼_){高解析雲端訊息_('請先輸入照片雲端授權碼。',true);return false;}
 const id=String(store.currentId||'');
 if(!id){高解析雲端訊息_('請先建立刀具表。',true);return false;}
 const data=await 讀取原圖(id,key).catch(()=>null);
 if(!data?.檔案){高解析雲端訊息_('此手機找不到這張高解析原圖，請重新拍照。',true);return false;}
 照片上傳執行中_=true;
 try{
  高解析雲端訊息_(key+' 正在傳送 Google Drive 高解析照片…');
  let image=await 讀取檔案為資料網址_(data.檔案);
  let mime=String(data.類型||'');
  if(image.length>5_500_000||!/^image\/(?:jpeg|png|webp)$/.test(mime)){
   image='';
   for(const [size,q] of [[2560,.9],[2200,.85],[1920,.80],[1600,.72],[1280,.65]]){
    image=await compressImage(data.檔案,size,q);
    if(image.length<=5_500_000)break;
   }
   mime='image/jpeg';
  }
  if(!image||image.length>5_500_000)throw Error('照片超出上傳上限，請降低解析度');
  const result=await 原圖雲端提交_('刀具表_照片上傳',{刀具表ID:id,視圖:key,圖片類型:mime,圖片資料:image});
  if(String(store.currentId||'')!==id)throw Error('儲存時切換刀具表；不將回應寫到另一張表');
  if(!result.檔案ID)throw Error('沒有取得雲端檔案 ID');
  const check=await 原圖雲端提交_('刀具表_照片查核',{檔案ID:result.檔案ID});
  if(check.檔案ID!==result.檔案ID||Number(check.容量)!==Number(result.容量))throw Error('上傳讀回核對失敗');
  正式雲端檔案_()[key]={
   檔案ID:result.檔案ID,檔案名稱:result.檔案名稱,容量:result.容量,
   圖片類型:result.圖片類型,雲端網址:result.雲端網址,
   儲存時間:result.儲存時間,已核對:true
  };
  雲端欄()[key]=result.雲端網址;
  saveCurrent(true);
  window.渲染工件三視圖_();
  高解析雲端訊息_('✅ '+key+' 已存入私有 Google Drive，且已讀回核對；正式試算表快照會保存照片 ID。');
  return true;
 }catch(e){
  高解析雲端訊息_('⚠️ 雲端照片尚未確認：'+(e.message||e)+'；本機原圖仍保留。',true);return false;
 }finally{照片上傳執行中_=false;}
}
window.正式照片上傳_=正式照片上傳_;
window.確認工件照片服務_=核對工件雲端服務_;

let 大圖網址=null;
function 開庫(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(Error('此瀏覽器沒有 IndexedDB 原圖保存功能'));
  const r=indexedDB.open(資料庫名稱,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('照片'))r.result.createObjectStore('照片',{keyPath:'索引'});};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('照片資料庫無法啟動'));
 });
}
async function 寫入原圖(id,key,file){
 if(!id)throw Error('此刀具表未建立唯一 ID');
 const db=await 開庫();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('照片','readwrite');
  tx.objectStore('照片').put({索引:id+'|'+key,檔案:file,名稱:file.name,類型:file.type});
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('原圖保存失敗'));
  tx.onabort=()=>reject(tx.error||Error('原圖保存中止，可能裝置儲存空間不足'));
 });}finally{db.close();}
}
async function 讀取原圖(id,key){
 if(!id)return null;
 const db=await 開庫();
 try{return await new Promise((resolve,reject)=>{
  const r=db.transaction('照片','readonly').objectStore('照片').get(id+'|'+key);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error||Error('原圖讀取失敗'));
 });}finally{db.close();}
}
async function 刪除原圖(id,key){
 if(!id)return;
 const db=await 開庫();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('照片','readwrite');tx.objectStore('照片').delete(id+'|'+key);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('原圖清除失敗'));
 });}finally{db.close();}
}
function 雲端欄(){
 if(!appData.工件三視圖雲端)appData.工件三視圖雲端={正視圖:'',俯視圖:'',側視圖:''};
 return appData.工件三視圖雲端;
}
function 訊息(str){const e=document.getElementById('工件三視圖狀態');if(e)e.textContent=str;}
window.保存三視圖雲端連結_=function(input,key){
 if(!可用視圖.includes(key))return;
 let url='';
 try{
  if(input.value.trim()){
   const target=new URL(input.value.trim());
   if(target.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(target.hostname))throw Error('僅支援 Google Drive HTTPS 網址');
   url=target.href;
  }
  雲端欄()[key]=url;saveCurrent(true);
  訊息(url?key+' 雲端照片網址已存入目前刀具表（非上傳成功的證明）':key+' 雲端網址已清除');
 }catch(e){input.value=雲端欄()[key]||'';alert('照片網址不正確：'+(e.message||e));}
};
window.開啟三視圖雲端原圖_=function(key){
 const url=雲端欄()[key]||'';
 if(!url){alert('請先上傳到 Google Drive，將原圖連結貼入欄位。');return;}
 window.open(url,'_blank','noopener,noreferrer');
};
window.分享三視圖原圖_=async function(key){
 if(!可用視圖.includes(key))return;
 let original;
 try{original=await 讀取原圖(String(store.currentId||''),key);}
 catch(e){alert('原始檔無法讀取：'+(e.message||e));return;}
 if(!original||!original.檔案){alert('此裝置找不到高解析原圖。請使用拍照的手機分享或重新拍攝。');return;}
 const name=String(original.名稱||key+'.jpg').replace(/[\\/:*?"<>|]/g,'_');
 const file=new File([original.檔案],name,{type:original.類型||'image/jpeg'});
 if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
  try{
   await navigator.share({title:'工件'+key,text:'請選 Google Drive，儲存至刀具表精靈_工件三視圖照片庫；完成後貼回照片共用連結。',files:[file]});
   訊息('分享操作已完成，請確認 Google Drive 已收到原圖並貼回網址。');return;
  }catch(e){if(e&&e.name==='AbortError')return;}
 }
 if(typeof 直接下載檔案_==='function')直接下載檔案_(file);
 else{
  const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);
 }
 訊息('已下載原圖，請開啟上方雲端資料夾上傳，並貼回照片連結。');
 alert('此瀏覽器不支援直接分享原圖，已改下載。請自行上傳到 Google Drive。');
};
const 舊開啟管理=window.開啟工件三視圖編輯_;
window.開啟工件三視圖編輯_=function(){const result=舊開啟管理.apply(this,arguments);核對工件雲端服務_().catch(()=>{});return result;};
const 舊渲染=window.渲染工件三視圖_;
window.渲染工件三視圖_=function(){
 舊渲染();
 for(const key of 可用視圖){
  const field=document.getElementById('工件三視圖雲端連結-'+key);
  if(field&&document.activeElement!==field)field.value=雲端欄()[key]||'';
 }
};
window.接收工件三視圖_=async function(input,key){
 const file=input.files&&input.files[0];input.value='';
 if(!file||!可用視圖.includes(key))return;
 if(!/^image\//i.test(file.type)){alert('請選擇圖片檔');return;}
 const originId=String(store.currentId||'');
 訊息('正在保存高解析原圖和報表小縮圖…');
 try{
  let thumb='';
  for(const [pixels,quality] of [[350,.70],[280,.60],[220,.52],[160,.45],[110,.33]]){
   thumb=await compressImage(file,pixels,quality);
   if(thumb.length<=9800)break;
  }
  if(thumb.length>9800)throw Error('照片無法製作適合試算表的縮圖');
  if(String(store.currentId||'')!==originId)throw Error('拍照過程已切換刀具表，避免寫入錯誤表單');
  讀取工件三視圖_()[key]=thumb;
  正式雲端檔案_()[key]=null;
  雲端欄()[key]='';
  saveCurrent(true);
  const tableId=String(store.currentId||'');
  if(!tableId)throw Error('刀具表尚未取得識別碼');
  let highResOk=false;
  try{await 寫入原圖(tableId,key,file);highResOk=true;}catch(e){console.warn(e);}
  updateA4Preview();updateA3Preview();
  訊息(highResOk?key+' 原圖已保留在本機，縮圖已保存。請分享原圖到 Google Drive 取得跨裝置連結。':key+' 縮圖已存，但原圖未能保存，請確認裝置容量並備份原始照片。');
  if(!highResOk)alert('高解析原圖未能保存；請將相機原始照片另外備份至 Google Drive。');
  if(highResOk&&本次照片授權碼_&&正式照片服務可用_)正式照片上傳_(key).catch(()=>{});
 }catch(e){訊息('照片保存未完成：'+(e.message||e));alert('工件照片保存失敗：'+(e.message||e));}
};
const 舊移除=window.移除工件三視圖_;
window.移除工件三視圖_=function(key){
 const id=String(store.currentId||'');const was=!!讀取工件三視圖_()[key];
 舊移除(key);
 if(was&&!讀取工件三視圖_()[key]){
  正式雲端檔案_()[key]=null;雲端欄()[key]='';saveCurrent(true);
  刪除原圖(id,key).catch(e=>console.warn(e));
 }
};
window.開啟工件三視圖大圖_=async function(key){
 if(!可用視圖.includes(key))return;
 const thumb=讀取工件三視圖_()[key];
 if(!thumb){開啟工件三視圖編輯_();return;}
 const id=String(store.currentId||'');
 const modal=document.getElementById('工件三視圖大圖視窗');
 const img=document.getElementById('工件三視圖大圖圖片');
 const title=document.getElementById('工件三視圖大圖標題');
 const link=document.getElementById('工件三視圖大圖雲端鈕');
 if(!modal||!img)return;
 img.src=thumb;
 if(title)title.textContent='工件'+key+'｜正在讀取高解析原圖';
 if(link){link.hidden=!雲端欄()[key];link.onclick=()=>window.開啟三視圖雲端原圖_(key);}
 modal.classList.add('show');
 try{
  const full=await 讀取原圖(id,key);
  if(!modal.classList.contains('show')||String(store.currentId||'')!==id)return;
  if(full&&full.檔案){
   if(大圖網址)URL.revokeObjectURL(大圖網址);
   大圖網址=URL.createObjectURL(full.檔案);img.src=大圖網址;
   if(title)title.textContent='工件'+key+'｜原始解析度';
  }else {
   const remote=正式雲端檔案_()[key];
   if(!remote?.檔案ID||!本次照片授權碼_||!await 核對工件雲端服務_()){
    if(title)title.textContent='工件'+key+'｜僅有縮圖，雲端原圖需授權';
   }else{
    try{
     if(title)title.textContent='工件'+key+'｜正在讀回雲端高解析照片';
     const out=await 原圖雲端提交_('刀具表_照片讀取',{檔案ID:remote.檔案ID});
     if(!modal.classList.contains('show')||String(store.currentId||'')!==id)return;
     if(out.檔案ID!==remote.檔案ID||!out.圖片資料)throw Error('照片讀回缺少資料');
     const uri='data:'+out.圖片類型+';base64,'+out.圖片資料;
     img.src=uri;
     if(title)title.textContent='工件'+key+'｜Drive 高解析照片';
     高解析雲端訊息_('✅ '+key+' 已從 Drive 安全讀回高解析原圖');
    }catch(err){
     if(title)title.textContent='工件'+key+'｜雲端讀取失敗，縮圖仍可使用';
     高解析雲端訊息_('⚠️ 雲端原圖未讀回：'+(err.message||err),true);
    }
   }
  }
 }catch(e){if(title)title.textContent='工件'+key+'｜原圖讀取失敗';}
};
window.關閉工件三視圖大圖_=function(){
 document.getElementById('工件三視圖大圖視窗')?.classList.remove('show');
 document.getElementById('工件三視圖大圖圖片')?.removeAttribute('src');
 if(大圖網址){URL.revokeObjectURL(大圖網址);大圖網址=null;}
};
})();