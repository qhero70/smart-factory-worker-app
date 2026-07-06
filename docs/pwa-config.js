window.PWA_CONFIG=window.PWA_CONFIG||{};
(function(c){
  c.GAS_WEB_APP_URL=['https://script.google.com','/macros/s/','AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ','/exec'].join('');
  c.APP_NAME='NEXUS OS';
  c.APP_SHORT_NAME='化新精密';
  c.VERSION='v4.8.3';
  c.SPREADSHEET_ID='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  c.正式主資料庫ID='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  c.API_TIMEOUT_MS=15000;
  c.API_ACTIONS={
    INIT:['取得報工作業v2初始資料','getWorkReportV4Init','init','讀取資料庫快照'],
    SUBMIT:['submitWorkReportV4','寫入報工作業v4','寫入報工作業v2','寫入現場報工V1'],
    SUBMIT_DEFECT:['submitDefectsV4','寫入不良紀錄v4','寫入不良紀錄v2']
  };
})(window.PWA_CONFIG);
