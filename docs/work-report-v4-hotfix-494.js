/* 報工作業 V4 熱修補 v4.9.4
 * 修補範圍：不良原因英文合併顯示、照片拍照/選檔預覽、Drive 圖片顯示、資料載入後二次校正。
 */
(function(){
'use strict';
const VERSION='4.9.4';
const MAX_PHOTOS=12;
const FALLBACK_DEFECTS={
  Z:[
    ['Z01','缺肉','Short Shot'],['Z02','加工砂孔','Machining Blowhole'],['Z03','黑皮','Black Skin'],['Z04','落砂','Sand Drop'],['Z05','變形','Deformation'],['Z06','錯模','Mismatch'],['Z07','試漏','Leakage Test'],['Z08','生鏽','Rust'],['Z09','裂痕','Crack'],['Z10','內徑','Inner Dia.'],['Z11','外徑','Outer Dia.'],['Z12','平坦度','Flatness'],['Z13','螺牙','Thread'],['Z14','碰傷','Dent/Scratch'],['Z15','震刀','Chatter Mark'],['Z16','垂直度','Perpendicularity'],['Z17','面粗度','Roughness'],['Z18','孔位','Hole Pos.'],['Z19','厚度','Thickness'],['Z20','同心度','Concentricity'],['Z21','試加工','Test Machining'],['Z22','段差','Step'],['Z23','偏轉','Runout'],['Z24','壓傷','Crush'],['Z25','真圓度','Roundness'],['Z26','漏加工','Missed Op'],['Z27','研磨打痕','Grinding Mark'],['Z28','素材鬆孔','Porosity'],['Z29','素材批號變更試加工','Batch Change Test'],['Z30','含部兩','Inclusion'],['Z31','球化率','Nodularity'],['Z32','硬度','Hardness'],['Z98','託外加工不良','Outsource NG'],['Z99','素材不良退料','Material Return']
  ],
  Y:[
    ['Y01','內徑','Inner Dia.'],['Y02','外徑','Outer Dia.'],['Y03','平坦度','Flatness'],['Y04','螺牙','Thread'],['Y05','碰傷','Dent/Scratch'],['Y06','震刀','Chatter Mark'],['Y07','垂直度','Perpendicularity'],['Y08','面粗度','Roughness'],['Y09','孔位','Hole Pos.'],['Y10','厚度','Thickness'],['Y11','刀具斷','Broken Tool'],['Y12','同心度','Concentricity'],['Y13','饒隙','Clearance'],['Y14','試加工(試)','Test (Trial)'],['Y15','換線','Line Change'],['Y16','段差','Step'],['Y17','夾持','Clamping'],['Y18','偏轉','Runout'],['Y19','壓傷','Crush'],['Y20','生鏽','Rust'],['Y21','切片','Slicing'],['Y22','裝配變形','Assembly Deformation'],['Y23','小零件','Small Part'],['Y24','刀具異常','Tool NG'],['Y25','試加工(車)','Test (Lathe)'],['Y26','品保測試','QA Test'],['Y27','鬆工','Loose Work'],['Y28','新產品','New Product'],['Y29','設變品','ECN Part'],['Y30','試漏','Leakage Test'],['Y31','氮化','Nitriding'],['Y32','檢品','Inspection'],['Y33','擦痕','Scratch']
  ]
};
function E(id){return document.getElementById(id)}
function S(v){return String(v==null?'':v).trim()}
function esc(s){return S(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(t,m,type){if(window.v4Toast)window.v4Toast(t,m,type);else console.log(t,m)}
function n(v){const x=Number(S(v).replace(/,/g,''));return isFinite(x)?x:0}
function normalizeDefectsFromDb(db){
  db=db||{};
  if(window.V4Bridge&&typeof window.V4Bridge.normalizeDefects==='function'){
    const d=window.V4Bridge.normalizeDefects(db.不良原因||db.defects||[]);
    if((d.Z||[]).length||(d.Y||[]).length)return d;
  }
  const out={Z:[],Y:[]};
  Object.keys(FALLBACK_DEFECTS).forEach(cat=>{
    out[cat]=FALLBACK_DEFECTS[cat].map(r=>({代碼:r[0],名稱:r[1],英文名稱:r[2],分類:cat,啟用:'是',顯示名稱:`${r[0]}｜${r[2]}｜${r[1]}`,英文合併:`${r[0]}｜${r[2]}｜${r[1]}`}));
  });
  return out;
}
function allDefects(){
  const st=window.V4_STATE||{};
  const db=st.db||{};
  const d=(db.不良原因&&((db.不良原因.Z||[]).length||(db.不良原因.Y||[]).length))?db.不良原因:normalizeDefectsFromDb(db);
  db.不良原因=d;
  return [].concat(d.Z||[],d.Y||[]);
}
function defectLabel(d){
  const code=S(d.代碼||d.code||d.c);
  const name=S(d.名稱||d.不良名稱||d.n);
  const en=S(d.英文名稱||d.英文||d.en);
  const cat=S(d.分類||code.slice(0,1)||'Z').replace(/類$/,'');
  return `${cat}類 ${code}｜${en||'No English'}｜${name||'No Chinese'}`;
}
function rebuildDefectMap(){
  const st=window.V4_STATE||{};
  st.defectMap={};
  allDefects().forEach(d=>{if(d&&d.代碼)st.defectMap[d.代碼]=d});
}
function addDefectRowEnglish(){
  const box=E('defectRows');if(!box)return;
  rebuildDefectMap();
  const list=allDefects();
  const row=document.createElement('div');
  row.className='defect-row';
  row.innerHTML=`<button class="photo-tool-btn" type="button" onclick="this.closest('.defect-row').remove();validateDefects(true)">刪</button><select onchange="validateDefects(true)"><option value="">Select defect reason / 選擇不良原因</option>${list.map(d=>`<option value="${esc(d.代碼)}">${esc(defectLabel(d))}</option>`).join('')}</select><input class="qty-input" inputmode="numeric" placeholder="Qty 數量" oninput="validateDefects(true)">`;
  box.appendChild(row);
}
function renderDefectRowsEnglish(){
  const box=E('defectRows');if(!box)return;
  rebuildDefectMap();
  box.innerHTML='';
  addDefectRowEnglish();
}
function installDefectUI(){
  window.addDefectRow=addDefectRowEnglish;
  window.renderDefectRowsEnglish=renderDefectRowsEnglish;
  if(!window.__V4_494_RELOAD_PATCHED__&&typeof window.reloadData==='function'){
    window.__V4_494_RELOAD_PATCHED__=true;
    const old=window.reloadData;
    window.reloadData=async function(){
      const r=await old.apply(this,arguments);
      try{
        if(window.V4_STATE&&window.V4_STATE.db){
          window.V4_STATE.db.不良原因=normalizeDefectsFromDb(window.V4_STATE.db);
          const count=allDefects().length;
          renderDefectRowsEnglish();
          const p=window.V4_STATE.db.筆數||{};p.不良原因=count;window.V4_STATE.db.筆數=p;
          toast('不良原因已載入 / Defects Ready',`已載入 ${count} 筆，中英文合併顯示 v${VERSION}`,'success');
        }
      }catch(e){console.warn('[V4 494] defect patch failed',e)}
      return r;
    };
  }
}
function installPhotoPreviewCss(){
  if(document.getElementById('photoPreviewCss494'))return;
  const style=document.createElement('style');style.id='photoPreviewCss494';style.textContent=`
  .photo-preview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
  .photo-preview-card{position:relative;min-height:116px;border-radius:18px;overflow:hidden;background:#0f172a;box-shadow:0 10px 26px rgba(0,0,0,.16);border:2px solid #d9e2ef}
  .photo-preview-card img{width:100%;height:116px;object-fit:cover;display:block;background:#111827}
  .photo-preview-name{position:absolute;left:0;right:0;bottom:0;padding:18px 7px 6px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.78));color:#fff;font-size:10px;font-weight:900;line-height:1.25;word-break:break-all;text-shadow:0 1px 3px rgba(0,0,0,.65)}
  .photo-preview-del{position:absolute;top:6px;right:6px;width:30px;height:30px;border:0;border-radius:999px;background:rgba(239,68,68,.92);color:#fff;font-weight:1000;box-shadow:0 6px 16px rgba(0,0,0,.25)}
  .photo-preview-empty{grid-column:1/-1;border:2px dashed #a9c8ff;border-radius:18px;background:#eaf3ff;color:#1967d2;min-height:72px;display:grid;place-items:center;text-align:center;font-weight:1000;padding:12px}
  @media(max-width:430px){.photo-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.photo-preview-card img{height:128px}}
  `;document.head.appendChild(style);
}
function ensurePreviewGrid(){
  installPhotoPreviewCss();
  let grid=E('photoPreviewGrid');
  if(grid)return grid;
  const count=E('photoCount');
  grid=document.createElement('div');grid.id='photoPreviewGrid';grid.className='photo-preview-grid';
  if(count&&count.parentNode)count.parentNode.insertBefore(grid,count.nextSibling);
  return grid;
}
function revokePhoto(p){try{if(p&&p.預覽網址&&String(p.預覽網址).startsWith('blob:'))URL.revokeObjectURL(p.預覽網址)}catch(e){}}
function renderPhotoPreview(){
  const grid=ensurePreviewGrid();if(!grid)return;
  const photos=window.V4_PHOTOS||[];
  if(E('photoCount'))E('photoCount').textContent=`${photos.length} / ${MAX_PHOTOS} 張照片 / photos`;
  if(!photos.length){grid.innerHTML='<div class="photo-preview-empty">尚未選擇照片<br>拍照或選圖後會立即在這裡預覽</div>';return;}
  grid.innerHTML=photos.map((p,i)=>`<div class="photo-preview-card"><img src="${esc(p.預覽網址||p.previewUrl||'')}" alt="${esc(p.name||p.檔名||'photo')}" loading="lazy"><button class="photo-preview-del" type="button" onclick="removePhotoAt(${i})">×</button><div class="photo-preview-name">${esc(p.name||p.檔名||'photo')}<br>${Math.round((p.size||p.大小||0)/1024)} KB</div></div>`).join('');
}
function handleFilesPreview(files){
  const current=window.V4_PHOTOS||[];
  const remain=Math.max(0,MAX_PHOTOS-current.length);
  const list=Array.from(files||[]).filter(f=>/^image\//i.test(f.type||'')||/\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(f.name||'')).slice(0,remain);
  if(!list.length){toast('沒有可加入的照片 / No photo added',`最多 ${MAX_PHOTOS} 張，或檔案不是圖片格式`,'warn');return;}
  list.forEach(f=>{
    const previewUrl=URL.createObjectURL(f);
    current.push({name:f.name,size:f.size,type:f.type,lastModified:f.lastModified,預覽網址:previewUrl,previewUrl});
  });
  window.V4_PHOTOS=current;
  renderPhotoPreview();
  toast('照片已加入 / Photos Added',`本次加入 ${list.length} 張，合計 ${current.length} / ${MAX_PHOTOS} 張`,'success');
}
function clearPhotosPreview(){
  (window.V4_PHOTOS||[]).forEach(revokePhoto);
  window.V4_PHOTOS=[];
  renderPhotoPreview();
}
function removePhotoAt(i){
  const arr=window.V4_PHOTOS||[];
  const p=arr.splice(i,1)[0];revokePhoto(p);window.V4_PHOTOS=arr;renderPhotoPreview();
}
function takePhotoPreview(){
  const input=E('photoInput');if(!input)return;
  input.accept='image/*';input.multiple=true;input.setAttribute('capture','environment');input.click();
}
function chooseFilePreview(){
  const input=E('photoInput');if(!input)return;
  input.accept='image/*';input.multiple=true;input.removeAttribute('capture');input.click();
}
function installPhotoPreview(){
  ensurePreviewGrid();
  window.takePhoto=takePhotoPreview;
  window.chooseFile=chooseFilePreview;
  window.handleFiles=handleFilesPreview;
  window.clearPhotos=clearPhotosPreview;
  window.removePhotoAt=removePhotoAt;
  const input=E('photoInput');
  if(input&&!input.__V4_494_PATCHED__){
    input.__V4_494_PATCHED__=true;
    input.onchange=function(){handleFilesPreview(this.files);this.value=''};
  }
  renderPhotoPreview();
}
function patchImageErrors(){
  document.addEventListener('error',function(e){
    const img=e.target;if(!img||img.tagName!=='IMG'||img.dataset.v4ImageFallback)return;
    img.dataset.v4ImageFallback='1';
    const box=img.closest('.card-photo,.product-thumb,.avatar,.photo-preview-card');
    if(box&&box.classList.contains('card-photo'))box.innerHTML='<div class="card-fallback">🖼️</div>';
  },true);
}
function boot(){
  installDefectUI();
  installPhotoPreview();
  patchImageErrors();
}
window.V4Hotfix494={boot,renderDefectRowsEnglish,renderPhotoPreview,version:VERSION};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
setTimeout(boot,150);setTimeout(boot,600);
})();
