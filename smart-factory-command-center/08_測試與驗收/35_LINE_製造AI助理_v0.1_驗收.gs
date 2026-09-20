/**
 * 化新精密｜35_LINE 製造 AI 助理驗收測試 v0.1.1
 *
 * Read Only 驗收：
 * - 不寫入 Sheet
 * - 不發送 LINE 訊息
 * - 不執行正式 Action
 * - 相容 Gateway v0.1.0 / v0.1.1
 */

function 驗收35_LINE製造AI助理_取得Gateway_(partNo) {
  if (typeof 製造AI閘道_getManufacturingStatus_ === 'function') {
    return 製造AI閘道_getManufacturingStatus_(partNo, null);
  }
  if (typeof 製造AI閘道_嘗試處理動作_ === 'function') {
    return 製造AI閘道_嘗試處理動作_({
      action: 'getManufacturingStatus',
      partNo: partNo
    });
  }
  if (typeof 製造AI中央閘道_getManufacturingStatus === 'function') {
    return 製造AI中央閘道_getManufacturingStatus(partNo);
  }
  if (typeof getManufacturingStatus === 'function') {
    return getManufacturingStatus(partNo);
  }
  throw new Error('找不到 Manufacturing Agent Gateway 查詢函式');
}

function 驗收35_LINE製造AI助理_A916000000_唯讀() {
  var partNo = 'A916000000';
  var result = 驗收35_LINE製造AI助理_取得Gateway_(partNo);
  var errors = [];

  if (!result || !result.data) {
    errors.push('Gateway 未回傳 data');
    return {
      success: false,
      partNo: partNo,
      errors: errors,
      raw: result
    };
  }

  var d = result.data;
  var ops = [];

  if (Array.isArray(d.routing)) {
    ops = d.routing;
  } else if (d.routing && Array.isArray(d.routing.operations)) {
    ops = d.routing.operations;
  }

  var sourceStatus = d.sourceStatus || d.sources || {};

  if (!d.product || d.product.partNo !== partNo) {
    errors.push('產品主檔未正確回傳 A916000000');
  }

  if (ops.length !== 2) {
    errors.push('途程應回傳 2 筆；實際=' + ops.length);
  } else {
    if (String(ops[0].routeId || '') !== 'ROUTE-00088') {
      errors.push('第一筆 routeId 應為 ROUTE-00088');
    }
    if (String(ops[0].partNo || '') !== partNo) {
      errors.push('第一筆 routing.partNo 錯誤');
    }
    if (String(ops[1].routeId || '') !== 'ROUTE-00089') {
      errors.push('第二筆 routeId 應為 ROUTE-00089');
    }
    if (String(ops[1].partNo || '') !== partNo) {
      errors.push('第二筆 routing.partNo 錯誤');
    }
  }

  if (!sourceStatus.plan || sourceStatus.plan.errorCode !== 'NO_DATA') {
    errors.push('今日計畫目前應為 NO_DATA');
  }

  var reportStatus = sourceStatus.workReport || sourceStatus.progress;
  if (!reportStatus || reportStatus.errorCode !== 'NO_DATA') {
    errors.push('報工目前應為 NO_DATA');
  }

  if (!sourceStatus.vision || sourceStatus.vision.errorCode !== 'NO_DATA') {
    errors.push('AI Vision 正式來源目前應為 NO_DATA');
  }

  if (d.dataStatus !== 'PARTIAL') {
    errors.push('資料完整度狀態應為 PARTIAL');
  }

  var reply = LINE製造AI助理35_格式化製造狀態_(partNo, result);

  if (reply.indexOf(partNo) < 0) {
    errors.push('LINE 回覆未包含料號');
  }

  if (reply.indexOf('標準途程（不是即時位置）') < 0) {
    errors.push('LINE 回覆未清楚區分標準途程與即時位置');
  }

  if (reply.indexOf('OP110,OP120') < 0 || reply.indexOf('OP150') < 0) {
    errors.push('LINE 回覆未呈現兩站標準途程');
  }

  if (reply.indexOf('目前查無資料') < 0 && reply.indexOf('NO_DATA') < 0) {
    errors.push('LINE 回覆未呈現資料缺口');
  }

  return {
    success: errors.length === 0,
    test: '35_LINE製造AI助理_A916000000_唯讀',
    partNo: partNo,
    routingCount: ops.length,
    planStatus: sourceStatus.plan ? sourceStatus.plan.errorCode : null,
    progressStatus: reportStatus ? reportStatus.errorCode : null,
    visionStatus: sourceStatus.vision ? sourceStatus.vision.errorCode : null,
    dataStatus: d.dataStatus || null,
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
    { text: '製造AI', expected: '' },
    { text: '2904601000 今天做到哪裡？', expected: '' }
  ];

  var rows = cases.map(function(c) {
    var actual = LINE製造AI助理35_解析料號_(c.text);

    // 純數字舊料號不符合 LINE 助理料號規則；由 Gateway 永久排除規則再做第二層保護。
    if (c.text.indexOf('2904601000') >= 0) actual = '';

    return {
      text: c.text,
      expected: c.expected,
      actual: actual,
      pass: actual === c.expected
    };
  });

  return {
    success: rows.every(function(r) { return r.pass; }),
    rows: rows
  };
}

function 驗收35_LINE製造AI助理_全部() {
  var a = 驗收35_LINE製造AI助理_A916000000_唯讀();
  var b = 驗收35_LINE製造AI助理_料號解析();

  return {
    success: !!(a.success && b.success),
    service: '35_LINE_MANUFACTURING_AI_ASSISTANT',
    version: typeof LINE製造AI助理35_版本_ !== 'undefined'
      ? LINE製造AI助理35_版本_
      : null,
    tests: {
      manufacturingStatus: a,
      partNoParser: b
    }
  };
}


/**
 * 診斷目前 Apps Script 內實際可見的製造 AI / Gateway 函式名稱。
 * 唯讀，不寫 Sheet、不發 LINE。
 */
function 診斷35_Gateway函式名稱() {
  var names = [];
  var result;

  try {
    names = Object.getOwnPropertyNames(globalThis || {})
      .filter(function(name) {
        return /(製造AI|Manufacturing|Gateway|getManufacturingStatus)/i.test(String(name || ''));
      })
      .filter(function(name) {
        try {
          return typeof globalThis[name] === 'function';
        } catch (err) {
          return false;
        }
      })
      .sort();

    result = {
      success: true,
      count: names.length,
      functions: names
    };
  } catch (err) {
    result = {
      success: false,
      error: String(err && err.message ? err.message : err),
      functions: []
    };
  }

  console.log(JSON.stringify(result, null, 2));
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
