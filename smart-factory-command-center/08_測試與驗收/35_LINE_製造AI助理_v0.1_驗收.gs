/**
 * 化新精密｜35_LINE 製造 AI 助理驗收測試 v0.1
 *
 * Read Only 驗收：
 * - 不寫入 Sheet
 * - 不發送 LINE 訊息
 * - 不執行正式 Action
 * - 只驗證 Manufacturing Agent Gateway 與 LINE 格式化邏輯
 */

function 驗收35_LINE製造AI助理_A916000000_唯讀() {
  var partNo = 'A916000000';
  var result = 製造AI閘道_getManufacturingStatus_(partNo, 製造AI閘道_今天_());
  var errors = [];

  if (!result || !result.data) {
    errors.push('Gateway 未回傳 data');
    return { success: false, partNo: partNo, errors: errors, raw: result };
  }

  var d = result.data;
  if (!d.product || d.product.partNo !== partNo) {
    errors.push('產品主檔未正確回傳 A916000000');
  }

  if (!Array.isArray(d.routing) || d.routing.length !== 2) {
    errors.push('途程應回傳 2 筆；實際=' + (Array.isArray(d.routing) ? d.routing.length : 'null'));
  } else {
    if (String(d.routing[0].routeId || '') !== 'ROUTE-00088') errors.push('第一筆 routeId 應為 ROUTE-00088');
    if (String(d.routing[0].partNo || '') !== partNo) errors.push('第一筆 routing.partNo 錯誤');
    if (String(d.routing[1].routeId || '') !== 'ROUTE-00089') errors.push('第二筆 routeId 應為 ROUTE-00089');
    if (String(d.routing[1].partNo || '') !== partNo) errors.push('第二筆 routing.partNo 錯誤');
  }

  if (!d.sources || !d.sources.plan || d.sources.plan.errorCode !== 'NO_DATA') {
    errors.push('今日計畫目前應為 NO_DATA');
  }
  if (!d.sources || !d.sources.progress || d.sources.progress.errorCode !== 'NO_DATA') {
    errors.push('報工目前應為 NO_DATA');
  }
  if (!d.sources || !d.sources.vision || d.sources.vision.errorCode !== 'NO_DATA') {
    errors.push('AI Vision 正式來源目前應為 NO_DATA');
  }

  var reply = LINE製造AI助理35_格式化製造狀態_(partNo, result);
  if (reply.indexOf(partNo) < 0) errors.push('LINE 回覆未包含料號');
  if (reply.indexOf('標準途程（不是即時位置）') < 0) errors.push('LINE 回覆未清楚區分標準途程與即時位置');
  if (reply.indexOf('ROUTE-00088') >= 0 || reply.indexOf('ROUTE-00089') >= 0) errors.push('LINE 回覆不應直接把 routeId 當成現場位置');
  if (reply.indexOf('目前查無資料') < 0 && reply.indexOf('NO_DATA') < 0) {
    errors.push('LINE 回覆未呈現資料缺口');
  }

  return {
    success: errors.length === 0,
    test: '35_LINE製造AI助理_A916000000_唯讀',
    partNo: partNo,
    routingCount: Array.isArray(d.routing) ? d.routing.length : null,
    planStatus: d.sources && d.sources.plan ? d.sources.plan.errorCode : null,
    progressStatus: d.sources && d.sources.progress ? d.sources.progress.errorCode : null,
    visionStatus: d.sources && d.sources.vision ? d.sources.vision.errorCode : null,
    errors: errors,
    preview: reply
  };
}

function 驗收35_LINE製造AI助理_料號解析() {
  var cases = [
    { text: 'A916000000 今天做到哪裡？', expected: 'A916000000' },
    { text: '查 A916000000 生產進度', expected: 'A916000000' },
    { text: 'manufacturing status', expected: '' },
    { text: '今天做到哪裡', expected: '' },
    { text: '製造AI', expected: '' }
  ];
  var rows = cases.map(function(c) {
    var actual = LINE製造AI助理35_解析料號_(c.text);
    return { text: c.text, expected: c.expected, actual: actual, pass: actual === c.expected };
  });
  return { success: rows.every(function(r) { return r.pass; }), rows: rows };
}

function 驗收35_LINE製造AI助理_全部() {
  var a = 驗收35_LINE製造AI助理_A916000000_唯讀();
  var b = 驗收35_LINE製造AI助理_料號解析();
  return {
    success: !!(a.success && b.success),
    version: LINE製造AI助理35_版本_,
    gatewayVersion: 製造AI閘道_版本_,
    tests: { manufacturingStatus: a, partNoParser: b }
  };
}
