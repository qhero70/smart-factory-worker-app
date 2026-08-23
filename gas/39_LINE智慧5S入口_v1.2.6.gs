/**
 * 化新精密｜39_LINE 智慧5S入口 v1.2.6
 *
 * 文字指令：智慧5S / 5S / 智慧5S入口 / 5S入口 / 5S巡檢
 * 回覆：LINE Flex「開啟智慧5S」按鈕。
 * PWA 網址及版本從 5S_系統參數動態讀取，避免 LINE 與 PWA 版本分流。
 */
var LINE智慧5S入口39_版本_ = 'v1.2.6';
var LINE智慧5S入口39_試算表ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var LINE智慧5S入口39_正式入口_ = 'https://qhero70.github.io/smart-factory-worker-app/5s/';
var LINE智慧5S入口39_版本備援_ = '1260';

function LINE智慧5S入口39_嘗試處理Webhook_(內容) {
  var events = 內容 && Array.isArray(內容.events) ? 內容.events : [];
  if (!events.length) return null;
  var handled = 0;
  var rest = [];
  var results = [];

  events.forEach(function(event) {
    if (!event || event.type !== 'message' || !event.message || event.message.type !== 'text') {
      rest.push(event);
      return;
    }
    var text = LINE智慧5S入口39_正規化_(event.message.text);
    if (!LINE智慧5S入口39_是否入口指令_(text)) {
      rest.push(event);
      return;
    }
    try {
      var url = LINE智慧5S入口39_取得網址_('首頁');
      LINE智慧5S入口39_回覆入口_(event.replyToken, url);
      handled++;
      results.push({成功:true,指令:text,PWA:url});
    } catch (err) {
      handled++;
      results.push({成功:false,指令:text,錯誤:String(err && err.message ? err.message : err)});
      try {
        LINE智慧5S入口39_回覆文字_(event.replyToken, '智慧5S入口暫時無法開啟，請稍後再試。');
      } catch (_) {}
    }
  });

  if (!handled) return null;
  內容.events = rest;
  return {
    ok:true,
    已處理:rest.length === 0,
    已部分處理:rest.length > 0,
    處理筆數:handled,
    待後續路由筆數:rest.length,
    模組:'39_LINE智慧5S入口',
    版本:LINE智慧5S入口39_版本_,
    結果:results
  };
}

function LINE智慧5S入口39_是否入口指令_(text) {
  var t = LINE智慧5S入口39_正規化_(text).toLowerCase().replace(/\s+/g,'');
  return /^(智慧5s|5s|智慧5s入口|5s入口|5s巡檢|開啟智慧5s|開啟5s)$/.test(t);
}

function LINE智慧5S入口39_取得系統參數_() {
  var out = {};
  try {
    var ss = SpreadsheetApp.openById(LINE智慧5S入口39_試算表ID_);
    var sh = ss.getSheetByName('5S_系統參數');
    if (!sh || sh.getLastRow() < 2) return out;
    var values = sh.getDataRange().getValues();
    var headers = values[0].map(function(v){return String(v || '').trim();});
    var keyIndex = headers.indexOf('參數鍵');
    var valueIndex = headers.indexOf('參數值');
    if (keyIndex < 0 || valueIndex < 0) return out;
    values.slice(1).forEach(function(row) {
      var key = String(row[keyIndex] == null ? '' : row[keyIndex]).trim();
      if (key) out[key] = String(row[valueIndex] == null ? '' : row[valueIndex]).trim();
    });
  } catch (e) {
    console.warn('39_LINE智慧5S入口讀參數失敗：' + e);
  }
  return out;
}

function LINE智慧5S入口39_取得網址_(page) {
  var p = LINE智慧5S入口39_取得系統參數_();
  var props = PropertiesService.getScriptProperties();
  var base = String(p['PWA正式入口網址'] || props.getProperty('智慧5S_PWA網址') || LINE智慧5S入口39_正式入口_).trim();
  var version = String(p['PWA入口版本'] || LINE智慧5S入口39_版本備援_).replace(/\D/g,'') || LINE智慧5S入口39_版本備援_;
  base = base.replace(/([?&])v=\d+/g,'$1').replace(/([?&])頁面=[^&]*/g,'$1').replace(/([?&])來源=[^&]*/g,'$1');
  base = base.replace(/\?&/g,'?').replace(/&&+/g,'&').replace(/[?&]+$/,'');
  var sep = base.indexOf('?') >= 0 ? '&' : '?';
  var url = base + sep + '來源=LINEBOT&v=' + version;
  if (page && page !== '首頁') url += '&頁面=' + encodeURIComponent(page);
  return url;
}

function LINE智慧5S入口39_回覆入口_(replyToken, url) {
  var token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!token) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN');
  var flex = {
    type:'flex',
    altText:'製一｜智慧5S入口',
    contents:{
      type:'bubble',
      size:'kilo',
      body:{
        type:'box',layout:'vertical',spacing:'md',
        contents:[
          {type:'text',text:'🧹 製一｜智慧5S',weight:'bold',size:'xl',color:'#176B47'},
          {type:'text',text:'巡檢・機台履歷・改善・紅牌・可視化標準',wrap:true,size:'sm',color:'#5F6F66'},
          {type:'box',layout:'vertical',margin:'md',contents:[{type:'button',style:'primary',height:'sm',color:'#176B47',action:{type:'uri',label:'開啟智慧5S',uri:url}}]}
        ]
      },
      footer:{type:'box',layout:'vertical',contents:[{type:'text',text:'入口版本由中央5S系統參數自動同步',size:'xxs',color:'#8A9690',align:'center'}]}
    }
  };
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer '+token},
    payload:JSON.stringify({replyToken:replyToken,messages:[flex]}),
    muteHttpExceptions:true
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('LINE Reply API HTTP '+code+'：'+res.getContentText());
}

function LINE智慧5S入口39_回覆文字_(replyToken, text) {
  var token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!token) return;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},
    payload:JSON.stringify({replyToken:replyToken,messages:[{type:'text',text:String(text).slice(0,4900)}]}),muteHttpExceptions:true
  });
}

function LINE智慧5S入口39_健康檢查() {
  return {ok:true,模組:'39_LINE智慧5S入口',版本:LINE智慧5S入口39_版本_,PWA:LINE智慧5S入口39_取得網址_('首頁')};
}

function LINE智慧5S入口39_正規化_(value) {
  return String(value == null ? '' : value).replace(/\u3000/g,' ').replace(/\s+/g,' ').trim();
}
