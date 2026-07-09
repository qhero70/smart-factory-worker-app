/* 報工V4｜正式主檔鎖定器 v5.3.3 */
(function(){
  'use strict';
  if(window.__HX_WORK_REPORT_OFFICIAL_LOCK_533__) return;
  window.__HX_WORK_REPORT_OFFICIAL_LOCK_533__ = true;
  var OFFICIAL = {
    version:'533',
    gas:'https://script.google.com/macros/s/AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ/exec',
    spreadsheetId:'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8',
    sheets:['01_人員主檔','02_產品主檔','03_機台主檔','04_工站產品關聯','04_工站機台關聯','04_工站產品工時主檔','04_工站人員關聯','05_不良代碼主檔','08_工站途程機台主檔','09_報工','09_不良紀錄']
  };
  window.HX_WORK_REPORT_OFFICIAL = OFFICIAL;
  function patch(){
    if(!window.V4Bridge || typeof window.V4Bridge.loadInit !== 'function'){
      setTimeout(patch,120); return;
    }
    if(window.V4Bridge.__officialLock533) return;
    var old = window.V4Bridge.loadInit.bind(window.V4Bridge);
    window.V4Bridge.loadInit = async function(){
      var data = await old.apply(this, arguments);
      data = data || {};
      data.正式主檔鎖定 = OFFICIAL;
      data.訊息 = '報工V4已對接正式主檔v533';
      data.筆數 = Object.assign({}, data.筆數 || {}, {正式主檔鎖定版本:'533'});
      window.HX_WORK_REPORT_DATA_OFFICIAL = data.筆數;
      console.info('[報工V4] 正式主檔鎖定 v533', data.筆數);
      return data;
    };
    window.V4Bridge.__officialLock533 = true;
  }
  patch();
})();
