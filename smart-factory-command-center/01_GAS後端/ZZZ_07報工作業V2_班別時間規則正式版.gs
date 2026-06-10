/**
 * ZZZ_07報工作業V2_班別時間規則正式版
 * 版本：v1.6.8
 *
 * 用途：
 * 1. 以 01_人員主檔「班別」為最高優先，不用目前時間覆蓋人員班別。
 * 2. 報工 V2 產出頁時間改為：開始時間 = 班別起始時間；結束時間 = 目前時間。
 * 3. 此檔案名稱以 ZZZ_ 開頭，目的是在 Apps Script 專案載入時位於最後，覆蓋主檔同名函數。
 *
 * 注意：
 * - 本檔不新增 doGet / doPost。
 * - 本檔不改 LINE Bot。
 * - 本檔只覆寫 取得報工作業V2前端保護補強JS_() 與 標準化班別_()。
 */

function 取得報工作業V2前端保護補強JS_() {
  return `<script>
(function(){
  function $id(id){return document.getElementById(id);}
  function pad(n){return String(n).padStart(2,'0');}
  function toLocalInputValue(d){
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  }
  function 文字(v){return String(v||'').trim();}

  window.取圖片網址=function(v){
    var s=String(v||'').trim();
    if(!s)return'';
    if(s.indexOf('data:image/')===0)return s;
    var m=s.match(/[-\\w]{25,}/);
    if(s.indexOf('drive.google.com')>=0&&m)return'https://drive.google.com/thumbnail?id='+m[0]+'&sz=w800';
    if(!/^https?:\/\//i.test(s)&&m)return'https://drive.google.com/thumbnail?id='+m[0]+'&sz=w800';
    return s;
  };

  window.圖片HTML=function(url,text){
    var src=window.取圖片網址(url);
    var safe=String(text||'無圖').replace(/[&<>\"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m];});
    return src?'<img src="'+src+'" onerror="this.outerHTML=\'<div class=無圖>'+safe+'</div>\'">':'<div class="無圖">'+safe+'</div>';
  };

  window.判斷目前班別=function(){
    var d=new Date(), hm=d.getHours()*100+d.getMinutes();
    if(hm>=750 && hm<1650) return '早班';
    if(hm>=1650 || hm<110) return '中班';
    return '大夜班';
  };

  window.推估班別=function(v){
    var t=文字(v);
    if(!t) return window.判斷目前班別();
    if(t.indexOf('大夜')>=0 || t.indexOf('夜')>=0 || t.indexOf('2300')>=0 || t.indexOf('23:00')>=0 || t.indexOf('3150')>=0 || t.indexOf('03:50')>=0 || t.indexOf('0315')>=0 || t.indexOf('03:15')>=0) return '大夜班';
    if(t.indexOf('中')>=0 || t.indexOf('1650')>=0 || t.indexOf('16:50')>=0) return '中班';
    if(t.indexOf('早')>=0 || t.indexOf('0800')>=0 || t.indexOf('08:00')>=0) return '早班';
    if(t.indexOf('加班')>=0) return '加班';
    return t;
  };

  window.取得目前畫面班別=function(){
    var s=$id('班別');
    if(s && s.value && s.value!=='自動判斷') return window.推估班別(s.value);
    if(window.狀態 && window.狀態.作業員 && window.狀態.作業員.班別) return window.推估班別(window.狀態.作業員.班別);
    return window.判斷目前班別();
  };

  window.取得班別開始時間=function(班別){
    var now=new Date();
    var d=new Date(now.getTime());
    var b=window.推估班別(班別||window.取得目前畫面班別());
    if(b==='早班'){
      d.setHours(8,0,0,0);
      return d;
    }
    if(b==='中班'){
      d.setHours(16,50,0,0);
      return d;
    }
    if(b==='大夜班'){
      d.setHours(23,0,0,0);
      if(now.getHours()<12) d.setDate(d.getDate()-1);
      return d;
    }
    d.setHours(now.getHours(),now.getMinutes(),0,0);
    return d;
  };

  window.計算實際工時_正式=function(){
    var a=$id('開始時間'), b=$id('結束時間'), h=$id('實際工時');
    if(!a || !b || !h || !a.value || !b.value) return;
    var start=new Date(a.value), end=new Date(b.value);
    if(isNaN(start.getTime()) || isNaN(end.getTime())) return;
    var hours=(end.getTime()-start.getTime())/3600000;
    h.value = hours>0 ? hours.toFixed(2) : '0';
  };

  window.設定預設時間=function(force){
    var a=$id('開始時間'), b=$id('結束時間');
    if(!a || !b) return;
    var now=new Date();
    var 班別=window.取得目前畫面班別();
    var start=window.取得班別開始時間(班別);
    if(force || !a.value) a.value=toLocalInputValue(start);
    if(force || !b.value) b.value=toLocalInputValue(now);
    window.計算實際工時_正式();
    if(typeof window.更新預覽==='function') window.更新預覽();
  };

  var oldCalc=window.計算工時;
  window.計算工時=function(){
    window.計算實際工時_正式();
    if(typeof window.更新預覽==='function') window.更新預覽();
  };

  var oldOperator=window.作業員變更;
  if(typeof oldOperator==='function'){
    window.作業員變更=function(){
      oldOperator();
      var s=$id('班別');
      if(s && window.狀態 && window.狀態.作業員){
        var b=window.推估班別(window.狀態.作業員.原始班別 || window.狀態.作業員.班別 || '');
        if(b) s.value=b;
      }
      setTimeout(function(){window.設定預設時間(true);},30);
    };
  }

  var oldLoad=window.資料載入完成;
  if(typeof oldLoad==='function'){
    window.資料載入完成=function(data){
      oldLoad(data);
      setTimeout(function(){window.設定預設時間(true);},100);
      setTimeout(function(){window.設定預設時間(false);},700);
    };
  }

  var oldTab=window.切換頁籤;
  if(typeof oldTab==='function'){
    window.切換頁籤=function(name){
      oldTab(name);
      if(name==='產出') setTimeout(function(){window.設定預設時間(true);},50);
    };
  }

  window.addEventListener('load',function(){
    setTimeout(function(){window.設定預設時間(true);},150);
    setTimeout(function(){window.設定預設時間(false);},900);
  });
})();
</script>`;
}

function 標準化班別_(v) {
  const t = 文字_(v);
  if (!t) return 判斷化新班別_();
  if (t.indexOf('大夜') >= 0 || t.indexOf('夜') >= 0 || t.indexOf('2300') >= 0 || t.indexOf('23:00') >= 0 || t.indexOf('3150') >= 0 || t.indexOf('0315') >= 0 || t.indexOf('03:15') >= 0) return '大夜班';
  if (t.indexOf('中') >= 0 || t.indexOf('1650') >= 0 || t.indexOf('16:50') >= 0) return '中班';
  if (t.indexOf('早') >= 0 || t.indexOf('0800') >= 0 || t.indexOf('08:00') >= 0) return '早班';
  if (t.indexOf('加班') >= 0) return '加班';
  return t;
}
