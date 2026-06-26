/* 製一組報工表單 V4｜機台清單欄位修正 v4.5.4
 * 只修一件事：工站選完後，主機台下拉與機台卡片必須顯示 08_工站途程機台主檔「機台清單」欄位的全部機台。
 * 載入位置：work-report-v4-sheets-direct-442.js 之後、原始 work-report-v4.html 內建 JS 之前。
 */
(function(){
  'use strict';
  var VER='v4.5.4_machine_list_column_patch';
  var originalFetch=window.fetch?window.fetch.bind(window):null;
  var INIT_RE=/取得報工作業v2初始資料|action=([^&]*%E5%8F%96%E5%BE%97%E5%A0%B1%E5%B7%A5)/;
  function txt(v){return String(v===undefined||v===null?'':v).trim();}
  function norm(v){return txt(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!==undefined&&v!==null&&txt(v)!=='')return v;}return '';}
  function isInit(input,init){var s='';try{s+=typeof input==='string'?input:((input&&input.url)||'');}catch(e){}try{s+=' '+(init&&init.body?String(init.body):'');}catch(e){}return INIT_RE.test(s);}
  function splitIds(v){
    if(Array.isArray(v)){
      var out=[];
      v.forEach(function(x){
        if(typeof x==='string') out=out.concat(splitIds(x));
        else if(x&&typeof x==='object') out=out.concat(splitIds(x.機台編號||x.主機台||x.設備編號||x.編號||''));
      });
      return unique(out);
    }
    return unique(txt(v).split(/[、,，;；\s]+/).map(txt).filter(function(x){
      return x && x.indexOf('人員')<0 && !/^人員:?$/i.test(x) && (/\d/.test(x)||/雷刻機|外包|偉宏|賀盛/.test(x));
    }));
  }
  function unique(arr){var seen={},out=[];(arr||[]).forEach(function(x){var k=norm(x);if(!k||seen[k])return;seen[k]=1;out.push(x);});return out;}
  function makeMachineMap(list){var map={};(list||[]).forEach(function(m){if(!m)return;var id=txt(m.機台編號||m.設備編號||m.編號);if(!id)return;map[norm(id)]=m;});return map;}
  function toMachine(id,map){var hit=map[norm(id)]||{};return {
    機台編號: txt(hit.機台編號||id),
    設備名稱: txt(hit.設備名稱||hit.機台名稱||('機台'+id)),
    機台名稱: txt(hit.機台名稱||hit.設備名稱||('機台'+id)),
    區域: txt(hit.區域||hit.廠區||hit.位置),
    機台型號: txt(hit.機台型號||hit.型號),
    照片網址: txt(hit.照片網址||hit.縮圖網址),
    縮圖網址: txt(hit.縮圖網址||hit.照片網址)
  };}
  function patchData(data){
    if(!data||!data.成功) return data;
    var machineMap=makeMachineMap(data.機台清單||[]);
    var groups=data.報工工站群組||data.途程工站群組||[];
    groups.forEach(function(g){
      if(!g) return;
      var rawText='';
      if(typeof g.機台清單==='string') rawText=g.機台清單;
      var rawOther=pick(g,['機台清單原始','機台清單_原始','機台編號清單','可用機台','設備清單','機台列表']);
      var idsFromRaw=splitIds(rawText||rawOther);
      var idsFromArray=Array.isArray(g.機台清單)?splitIds(g.機台清單):[];
      var ids=idsFromRaw.length?idsFromRaw:idsFromArray;
      if(!ids.length) ids=splitIds(g.主機台||g.主機台編號||g.機台編號||'');
      g.機台清單原始=ids.join('、');
      g.機台編號清單=ids.slice();
      g.機台清單=ids.map(function(id){return toMachine(id,machineMap);});
      var station=txt(g.報工工站名稱||g.工站名稱||'');
      var op=txt(g.工序範圍||g.工序||'');
      g.顯示名稱=[station,op,ids.join('、')].filter(Boolean).join('｜');
    });
    data.報工工站群組=groups;
    data.途程工站群組=groups;
    try{console.log('V4 454 機台清單欄位已修正', groups.length);}catch(e){}
    return data;
  }
  if(!originalFetch) return;
  window.fetch=function(input,init){
    if(!isInit(input,init)) return originalFetch(input,init);
    return originalFetch(input,init).then(function(res){
      return res.clone().json().then(function(data){
        data=patchData(data);
        return new Response(JSON.stringify(data),{status:200,statusText:'OK',headers:{'Content-Type':'application/json;charset=utf-8'}});
      }).catch(function(){return res;});
    });
  };
  window.V4_454_修正機台清單欄位=patchData;
  try{console.log('V4 machine list column patch loaded',VER);}catch(e){}
})();