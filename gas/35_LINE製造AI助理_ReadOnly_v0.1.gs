/**
 * 化新精密｜35_LINE 製造 AI 助理 Read Only v0.1
 *
 * 目的：
 * - 沿用既有唯一 LINE Bot，不建立第二個 Bot。
 * - 主管/工程師可用自然語言查詢製造狀態。
 * - 只呼叫 Manufacturing Agent Gateway Tool，不直接讀零散欄位。
 * - 缺資料回 NO_DATA／目前查無資料，不猜測。
 * - 本版不執行收料、報工、HOLD、NG、放行等正式寫入。
 */

var LINE製造AI助理35_版本_ = '0.1.0';
var LINE製造AI助理35_料號規則_ = /\b([A-Za-z][A-Za-z0-9_-]{5,19})\b/;

function LINE製造AI助理35_嘗試處理Webhook_(payload) {
  var events = Array.isArray(payload && payload.events) ? payload.events : [];
  if (!events.length) return null;

  var 已處理 = 0;
  var 待後續事件 = [];

  events.forEach(function(ev) {
    var r = LINE製造AI助理35_處理單一事件_(ev || {});
    if (r && r.已處理) 已處理++;
    else 待後續事件.push(ev);
  });

  if (!已處理) return null;

  payload.events = 待後續事件;
  return {
    ok: true,
    success: true,
    已處理: 待後續事件.length === 0,
    已部分處理: 待後續事件.length > 0,
    處理筆數: 已處理,
    待後續路由筆數: 待後續事件.length,
    模組: '35_LINE製造AI助理',
    版本: LINE製造AI助理35_版本_
  };
}

function LINE製造AI助理35_處理單一事件_(ev) {
  if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return null;

  var text = LINE製造AI助理35_文字_(ev.message.text);
  var replyToken = ev.replyToken;
  var lineUserId = LINE製造AI助理35_文字_(ev.source && ev.source.userId);
  if (!text || !replyToken) return null;

  var isHelp = /^(製造AI|AI助理|製造助理|製造AI助理|AI製造助理)$/i.test(text);
  var hasIntent = /(做到哪裡|做到哪|生產進度|製造狀態|生產狀態|進度如何|進度|目前狀態|現在做到)/i.test(text);
  var partNo = LINE製造AI助理35_解析料號_(text);

  if (!isHelp && !(hasIntent && partNo)) return null;

  var 身份檢查 = LINE製造AI助理35_驗證查詢權限_(lineUserId);
  if (!身份檢查.允許) {
    LINE製造AI助理35_回覆_(replyToken, 身份檢查.訊息);
    return { 已處理: true, success: false, errorCode: 'PERMISSION_DENIED' };
  }

  if (isHelp && !partNo) {
    LINE製造AI助理35_回覆_(replyToken,
      '🤖 製造 AI 助理（唯讀）\n' +
      '可以直接問：\n' +
      '「A916000000 今天做到哪裡？」\n\n' +
      '我會透過 Manufacturing Agent Gateway 查詢正式來源。\n' +
      '查不到的資料會顯示「目前查無資料」，不會自行補數字。'
    );
    return { 已處理: true, success: true, intent: 'HELP' };
  }

  if (!partNo) {
    LINE製造AI助理35_回覆_(replyToken, '請提供料號，例如：A916000000 今天做到哪裡？');
    return { 已處理: true, success: false, errorCode: 'INVALID_ARGUMENT' };
  }

  var result;
  try {
    if (typeof 製造AI閘道_getManufacturingStatus_ === 'function') {
      result = 製造AI閘道_getManufacturingStatus_(partNo, null);
    } else if (typeof 製造AI閘道_嘗試處理動作_ === 'function') {
      result = 製造AI閘道_嘗試處理動作_({
        action: 'getManufacturingStatus',
        partNo: partNo
      });
    } else {
      result = {
        success: false,
        data: null,
        source: 'MANUFACTURING_AGENT_GATEWAY',
        message: 'Manufacturing Agent Gateway 尚未載入',
        errorCode: 'GATEWAY_UNAVAILABLE'
      };
    }
  } catch (err) {
    result = {
      success: false,
      data: null,
      source: 'MANUFACTURING_AGENT_GATEWAY',
      message: String(err && err.message ? err.message : err),
      errorCode: 'INTERNAL_ERROR'
    };
  }

  LINE製造AI助理35_回覆_(replyToken, LINE製造AI助理35_格式化製造狀態_(partNo, result));
  return {
    已處理: true,
    success: !!(result && result.success),
    partNo: partNo,
    errorCode: result ? result.errorCode : 'NO_DATA'
  };
}

function LINE製造AI助理35_解析料號_(text) {
  var m = LINE製造AI助理35_文字_(text).match(LINE製造AI助理35_料號規則_);
  return m ? String(m[1]).toUpperCase() : '';
}

function LINE製造AI助理35_驗證查詢權限_(lineUserId) {
  if (!lineUserId) return { 允許: false, 訊息: '⛔ 無法確認 LINE 使用者身份。' };

  // 若既有身份權限模組存在，優先沿用；沒有時不在此模組另造第二套權限。
  if (typeof LINE身份權限33_取得身份_ === 'function') {
    var 身份 = LINE身份權限33_取得身份_(lineUserId);
    if (!身份) return { 允許: false, 訊息: '⛔ 尚未綁定身份，請先完成 LINE 身份綁定。' };

    if (typeof LINE角色分流34_是否主管選單_ === 'function') {
      if (!LINE角色分流34_是否主管選單_(身份)) {
        return { 允許: false, 訊息: '⛔ 製造 AI 助理目前先開放主管／工程師唯讀查詢。' };
      }
    }
  }

  return { 允許: true };
}

function LINE製造AI助理35_格式化製造狀態_(partNo, result) {
  var d = result && result.data ? result.data : null;

  if (!d) {
    return '🤖 製造 AI 助理\n' +
      '料號：' + partNo + '\n' +
      '狀態：目前查無資料\n' +
      '來源：' + LINE製造AI助理35_文字_(result && result.source || 'MANUFACTURING_AGENT_GATEWAY') + '\n' +
      '代碼：' + LINE製造AI助理35_文字_(result && result.errorCode || 'NO_DATA');
  }

  var product = d.product || {};
  var production = d.production || {};
  var current = d.current || {};
  var quality = d.quality || {};
  var vision = d.vision || {};
  var sources = d.sources || {};

  var lines = [
    '🤖 製造 AI 助理｜' + partNo,
    '日期：' + LINE製造AI助理35_值_(d.queryDate),
    '品名：' + LINE製造AI助理35_值_(product.partName),
    '',
    '【生產】',
    '計畫數：' + LINE製造AI助理35_值_(production.planQty),
    '已報工：' + LINE製造AI助理35_值_(production.reportedQty),
    '剩餘：' + LINE製造AI助理35_值_(production.remainingQty),
    '完成率：' + LINE製造AI助理35_百分比_(production.completionRate),
    '',
    '【目前位置】',
    '工序：' + LINE製造AI助理35_值_(current.processId),
    '工站：' + LINE製造AI助理35_值_(current.stationId),
    '機台：' + LINE製造AI助理35_值_(current.machineId),
    '最後報工：' + LINE製造AI助理35_值_(current.lastReportedAt),
    '',
    '【品質】',
    '不良數：' + LINE製造AI助理35_值_(quality.defectQty),
    'AI Vision：' + LINE製造AI助理35_來源文字_(sources.vision),
    '',
    '資料狀態：' + LINE製造AI助理35_整體來源摘要_(sources),
    '更新：' + LINE製造AI助理35_值_(d.lastUpdatedAt)
  ];

  return lines.join('\n').slice(0, 4900);
}

function LINE製造AI助理35_整體來源摘要_(sources) {
  var keys = ['product', 'plan', 'progress', 'routing', 'machine', 'quality', 'vision'];
  var labels = {
    product: '產品',
    plan: '計畫',
    progress: '報工',
    routing: '途程',
    machine: '機台',
    quality: '品質',
    vision: 'Vision'
  };
  return keys.map(function(k) {
    var s = sources && sources[k] ? sources[k] : null;
    return labels[k] + ':' + (s && s.success ? 'OK' : 'NO_DATA');
  }).join('｜');
}

function LINE製造AI助理35_來源文字_(s) {
  return s && s.success ? '有資料' : '目前查無資料';
}

function LINE製造AI助理35_值_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return '目前查無資料';
  return String(v);
}

function LINE製造AI助理35_百分比_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return '目前查無資料';
  return String(v) + '%';
}

function LINE製造AI助理35_回覆_(replyToken, text) {
  if (!replyToken) return;
  if (typeof LINE身份權限33_回覆_ === 'function') return LINE身份權限33_回覆_(replyToken, String(text || '').slice(0, 4900));
  if (typeof LINE主管戰情直連_送出回覆_ === 'function') return LINE主管戰情直連_送出回覆_(replyToken, String(text || '').slice(0, 4900));
  if (typeof 回覆LINE_ === 'function') return 回覆LINE_(replyToken, String(text || '').slice(0, 4900));
  throw new Error('找不到既有 LINE 回覆函式');
}

function LINE製造AI助理35_文字_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}

function 測試35_LINE製造AI助理_格式_A916000000() {
  var r = typeof 製造AI閘道_getManufacturingStatus_ === 'function'
    ? 製造AI閘道_getManufacturingStatus_('A916000000', null)
    : null;
  return LINE製造AI助理35_格式化製造狀態_('A916000000', r);
}
