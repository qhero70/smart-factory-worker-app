/* 高解析工件照片：IndexedDB 保留未縮小檔案；雲端上傳由使用者選擇 Drive；不假稱自動上傳。 */
(function () {
'use strict';
const 資料庫名稱='刀具精靈_工件三視圖原圖_v1';
const 可用視圖=['正視圖','俯視圖','側視圖'];
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
  saveCurrent(true);
  const tableId=String(store.currentId||'');
  if(!tableId)throw Error('刀具表尚未取得識別碼');
  let highResOk=false;
  try{await 寫入原圖(tableId,key,file);highResOk=true;}catch(e){console.warn(e);}
  updateA4Preview();updateA3Preview();
  訊息(highResOk?key+' 原圖已保留在本機，縮圖已保存。請分享原圖到 Google Drive 取得跨裝置連結。':key+' 縮圖已存，但原圖未能保存，請確認裝置容量並備份原始照片。');
  if(!highResOk)alert('高解析原圖未能保存；請將相機原始照片另外備份至 Google Drive。');
 }catch(e){訊息('照片保存未完成：'+(e.message||e));alert('工件照片保存失敗：'+(e.message||e));}
};
const 舊移除=window.移除工件三視圖_;
window.移除工件三視圖_=function(key){
 const id=String(store.currentId||'');const was=!!讀取工件三視圖_()[key];
 舊移除(key);
 if(was&&!讀取工件三視圖_()[key])刪除原圖(id,key).catch(e=>console.warn(e));
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
  }else if(title)title.textContent='工件'+key+'｜只有縮圖，請查看雲端原圖';
 }catch(e){if(title)title.textContent='工件'+key+'｜原圖讀取失敗';}
};
window.關閉工件三視圖大圖_=function(){
 document.getElementById('工件三視圖大圖視窗')?.classList.remove('show');
 document.getElementById('工件三視圖大圖圖片')?.removeAttribute('src');
 if(大圖網址){URL.revokeObjectURL(大圖網址);大圖網址=null;}
};
})();