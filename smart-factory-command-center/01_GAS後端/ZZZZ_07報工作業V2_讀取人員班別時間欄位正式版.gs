/**
 * ZZZZ_07報工作業V2_讀取人員班別時間欄位正式版
 * 版本：v1.6.9
 *
 * 用途：
 * 1. 覆寫 取得報工作業v2初始資料()，讓前端直接取得 01_人員主檔 K:U 的正式班別時間欄位。
 * 2. 覆寫 取得報工作業V2前端保護補強JS_()，讓 07_報工作業V2.html 依班別開始時間與結束時間規則自動帶時間。
 * 3. 不新增 doGet / doPost，不影響 LINE Bot。
 *
 * 依賴：智慧製造中央作戰指揮中心.gs 內既有工具函數。
 */

function 取得報工作業v2初始資料() {
  const 照片索引 = 建立照片索引_();
  const 人員 = 讀表_('01_人員主檔')
    .filter(r => 文字_(r.啟用 || '是') !== '否')
    .map(r => {
      const 工號 = 取值_(r, ['工號', '員工編號', '員工工號']);
      const p1 = 取照片資料_(r, ['縮圖網址', '作業員縮圖網址', '照片網址', '作業員照片網址', '圖片網址', '頭像網址', '大頭照網址', '照片', '大頭照'], ['Google檔案ID', '作業員照片檔案ID', '照片檔案ID', '圖片檔案ID', '大頭照檔案ID', 'DriveFileID', 'fileId', '檔案ID']);
      const p2 = 取索引照片_(照片索引, [工號], '人員照片');
      const photo = 合併照片資料_(p1, p2);
      const 原始班別 = 取值_(r, ['班別', '班次', '工作班別', '班別名稱', '上班時段']);
      const 班別代碼 = 文字_(r.班別代碼) || 依班別文字取得代碼_(原始班別);
      const 班別名稱 = 文字_(r.班別名稱) || 依班別代碼取得名稱_(班別代碼, 原始班別);
      const 班別開始時間 = 文字_(r.班別開始時間) || 依班別代碼取得開始時間_(班別代碼);
      const 班別結束時間 = 文字_(r.班別結束時間) || 依班別代碼取得結束時間_(班別代碼);
      const 跨日 = 文字_(r.跨日) || (班別代碼 === 'NIGHT' || 班別代碼 === 'SWING' ? '是' : '否');
      const 班別開始分鐘 = 文字_(r.班別開始分鐘) || 時間字串轉分鐘_(班別開始時間);
      const 班別結束分鐘_跨日 = 文字_(r.班別結束分鐘_跨日) || 計算跨日結束分鐘_(班別開始時間, 班別結束時間);
      return {
        工號,
        姓名: 取值_(r, ['姓名', '中文名', '名字']),
        部門: 取值_(r, ['部門']),
        組別: 取值_(r, ['組別']),
        職稱: 取值_(r, ['職稱', '職位']),
        班別: 班別名稱,
        原始班別,
        班別代碼,
        班別名稱,
        班別開始時間,
        班別結束時間,
        跨日,
        班別開始分鐘,
        班別結束分鐘_跨日,
        報工開始時間規則: 文字_(r.報工開始時間規則) || '班別開始時間',
        報工結束時間規則: 文字_(r.報工結束時間規則) || '目前時間',
        班別時間來源: 文字_(r.班別時間來源) || '01_人員主檔',
        啟用: r.啟用 || '是',
        人員類型: r.人員類型 || r.類別 || r.部門 || '現場人員',
        照片網址: photo.照片網址,
        縮圖網址: photo.縮圖網址,
        Google檔案ID: photo.檔案ID,
        條碼: r.條碼 || r.工牌號 || r.卡號 || ''
      };
    });

  const 產品 = 讀表_('02_產品主檔');
  const 機台 = 讀表_('03_機台主檔');
  const 工站 = 讀正式工站來源_();
  const 共用 = 讀表_('05_共用資料');
  const 報工工站群組 = 建立報工工站群組_(產品, 工站, 機台, 照片索引);
  const 不良原因 = 讀不良代碼主檔_();

  return {
    成功: true,
    版本: 'v1.6.9_讀取01人員主檔班別時間欄位正式版',
    作業日: 取得作業日_(),
    人員,
    報工工站群組,
    途程工站群組: 報工工站群組,
    班別清單: 取班別清單_v169_(共用, 人員),
    異常類型: 取共用值清單_(共用, '停機原因', ['無異常 / Normal', '設備異常', '機台停機 / Machine Down', '待料 / Waiting Material', '換刀 / Tool Change', '品質確認 / Quality Check', '其他 / Others']),
    不良原因,
    筆數: {
      人員: 人員.length,
      報工工站群組: 報工工站群組.length,
      產品: 產品.length,
      工站機台關聯: 機台.length,
      照片索引: 照片索引.__筆數 || 0,
      不良代碼: (不良原因.Z.length + 不良原因.Y.length),
      已讀班別時間欄位: 人員.filter(x => x.班別開始時間 && x.班別結束時間).length
    }
  };
}

function 取班別清單_v169_(rows, 人員) {
  const set = {};
  set['自動判斷'] = '自動判斷';
  人員.forEach(r => {
    if (r.班別名稱) set[r.班別名稱] = r.班別名稱;
    if (r.班別) set[r.班別] = r.班別;
  });
  ['早班', '中班', '大夜班', '加班'].forEach(x => set[x] = x);
  return Object.keys(set).map(k => ({ 名稱: set[k], 值: k }));
}

function 依班別文字取得代碼_(v) {
  const t = 文字_(v);
  if (!t) return 'AUTO';
  if (t.indexOf('大夜') >= 0 || t.indexOf('夜') >= 0 || t.indexOf('2300') >= 0 || t.indexOf('23:00') >= 0 || t.indexOf('3150') >= 0 || t.indexOf('0315') >= 0 || t.indexOf('03:15') >= 0) return 'NIGHT';
  if (t.indexOf('早班') >= 0 || t.indexOf('早') >= 0 || t.indexOf('0800') >= 0 || t.indexOf('08:00') >= 0) return 'DAY';
  if (t.indexOf('中班') >= 0) return 'SWING';
  return 'AUTO';
}

function 依班別代碼取得名稱_(code, raw) {
  const c = 文字_(code);
  if (c === 'DAY') return '早班';
  if (c === 'SWING') return '中班';
  if (c === 'NIGHT') return '大夜班';
  if (文字_(raw)) return 標準化班別_(raw);
  return '自動判斷';
}

function 依班別代碼取得開始時間_(code) {
  const c = 文字_(code);
  if (c === 'DAY') return '08:00';
  if (c === 'SWING') return '16:50';
  if (c === 'NIGHT') return '23:00';
  return '';
}

function 依班別代碼取得結束時間_(code) {
  const c = 文字_(code);
  if (c === 'DAY') return '16:50';
  if (c === 'SWING') return '01:10';
  if (c === 'NIGHT') return '07:50';
  return '';
}

function 時間字串轉分鐘_(hhmm) {
  const t = 文字_(hhmm);
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  return Number(m[1]) * 60 + Number(m[2]);
}

function 計算跨日結束分鐘_(startHHMM, endHHMM) {
  const s = Number(時間字串轉分鐘_(startHHMM));
  const e = Number(時間字串轉分鐘_(endHHMM));
  if (isNaN(s) || isNaN(e)) return '';
  return e <= s ? e + 1440 : e;
}

function 標準化班別_(v) {
  const t = 文字_(v);
  if (!t) return 判斷化新班別_();
  if (t.indexOf('大夜') >= 0 || t.indexOf('夜') >= 0 || t.indexOf('2300') >= 0 || t.indexOf('23:00') >= 0 || t.indexOf('3150') >= 0 || t.indexOf('0315') >= 0 || t.indexOf('03:15') >= 0) return '大夜班';
  if (t.indexOf('早班') >= 0 || t.indexOf('早') >= 0 || t.indexOf('0800') >= 0 || t.indexOf('08:00') >= 0) return '早班';
  if (t.indexOf('中班') >= 0 || t.indexOf('1650') >= 0 || t.indexOf('16:50') >= 0) return '中班';
  if (t.indexOf('加班') >= 0) return '加班';
  return t;
}

function 取得報工作業V2前端保護補強JS_() {
  return `<script>
(function(){
  function $id(id){return document.getElementById(id);}
  function pad(n){return String(n).padStart(2,'0');}
  function toLocalInputValue(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());}
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

  window.推估班別=function(v){
    var t=文字(v);
    if(!t)return'自動判斷';
    if(t==='DAY')return'早班';
    if(t==='SWING')return'中班';
    if(t==='NIGHT')return'大夜班';
    if(t.indexOf('大夜')>=0||t.indexOf('夜')>=0||t.indexOf('2300')>=0||t.indexOf('23:00')>=0||t.indexOf('3150')>=0)return'大夜班';
    if(t.indexOf('早班')>=0||t.indexOf('早')>=0||t.indexOf('0800')>=0||t.indexOf('08:00')>=0)return'早班';
    if(t.indexOf('中班')>=0)return'中班';
    return t;
  };

  window.取得目前作業員=function(){
    if(window.狀態 && window.狀態.作業員) return window.狀態.作業員;
    return null;
  };

  window.取得目前畫面班別=function(){
    var op=window.取得目前作業員();
    if(op && op.班別名稱) return op.班別名稱;
    if(op && op.班別) return window.推估班別(op.班別);
    var s=$id('班別');
    if(s && s.value && s.value!=='自動判斷') return window.推估班別(s.value);
    return '自動判斷';
  };

  window.取得班別開始時間=function(){
    var op=window.取得目前作業員();
    if(op && op.班別開始時間) return op.班別開始時間;
    var b=window.取得目前畫面班別();
    if(b==='早班')return'08:00';
    if(b==='中班')return'16:50';
    if(b==='大夜班')return'23:00';
    return'';
  };

  window.取得班別結束時間=function(){
    var op=window.取得目前作業員();
    if(op && op.班別結束時間) return op.班別結束時間;
    var b=window.取得目前畫面班別();
    if(b==='早班')return'16:50';
    if(b==='中班')return'01:10';
    if(b==='大夜班')return'07:50';
    return'';
  };

  window.時間字串轉日期=function(hhmm, isStart){
    var now=new Date();
    var t=文字(hhmm);
    var m=t.match(/^(\d{1,2}):(\d{2})$/);
    if(!m) return new Date(now.getTime());
    var d=new Date(now.getTime());
    d.setHours(Number(m[1]),Number(m[2]),0,0);
    var 班別=window.取得目前畫面班別();
    if(班別==='大夜班' && isStart){
      if(now.getHours()<12) d.setDate(d.getDate()-1);
    }
    if(班別==='中班' && isStart){
      if(now.getHours()<8) d.setDate(d.getDate()-1);
    }
    return d;
  };

  window.計算實際工時_正式=function(){
    var a=$id('開始時間'),b=$id('結束時間'),h=$id('實際工時');
    if(!a||!b||!h||!a.value||!b.value)return;
    var start=new Date(a.value),end=new Date(b.value);
    if(isNaN(start.getTime())||isNaN(end.getTime()))return;
    var hours=(end.getTime()-start.getTime())/3600000;
    h.value=hours>0?hours.toFixed(2):'0';
  };

  window.設定預設時間=function(force){
    var a=$id('開始時間'),b=$id('結束時間');
    if(!a||!b)return;
    var now=new Date();
    var startHHMM=window.取得班別開始時間();
    var start=startHHMM?window.時間字串轉日期(startHHMM,true):new Date(now.getTime());
    if(force||!a.value)a.value=toLocalInputValue(start);
    if(force||!b.value)b.value=toLocalInputValue(now);
    window.計算實際工時_正式();
    if(typeof window.更新預覽==='function')window.更新預覽();
  };

  window.計算工時=function(){
    window.計算實際工時_正式();
    if(typeof window.更新預覽==='function')window.更新預覽();
  };

  var oldOperator=window.作業員變更;
  if(typeof oldOperator==='function'){
    window.作業員變更=function(){
      oldOperator();
      var op=window.取得目前作業員();
      var s=$id('班別');
      if(s&&op&&(op.班別名稱||op.班別))s.value=op.班別名稱||window.推估班別(op.班別);
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
      if(name==='產出')setTimeout(function(){window.設定預設時間(true);},50);
    };
  }

  window.addEventListener('load',function(){
    setTimeout(function(){window.設定預設時間(true);},150);
    setTimeout(function(){window.設定預設時間(false);},900);
  });
})();
</script>`;
}
