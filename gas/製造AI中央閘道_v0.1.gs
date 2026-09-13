/**
 * 化新精密｜HS Manufacturing Agent Gateway v0.1
 * 檔名：製造AI中央閘道_v0.1.gs
 *
 * 定位：
 * - 既有智慧製造中央主後端的 Read Only 製造 AI Tool 模組。
 * - 不建立第二個 Web App、不建立第二個 LINE Bot。
 * - AI 只透過 Tool 取得正式資料；缺資料回 NO_DATA，不猜測。
 * - 本版不包含 HOLD、報工、收料、異常等正式寫入 Action。
 *
 * 正式主資料庫：⭐智慧工廠主資料庫
 * Spreadsheet ID：19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8
 *
 * 支援 action：
 * - manufacturing.health
 * - manufacturing.getProduct
 * - manufacturing.getTodayProductionPlan
 * - manufacturing.getProductionProgress
 * - manufacturing.getRouting
 * - manufacturing.getMachineStatus
 * - manufacturing.getDefectSummary
 * - manufacturing.getVisionInspection
 * - manufacturing.getStatus
 * - getManufacturingStatus
 */

var 製造AI閘道_版本_ = '0.1.0';
var 製造AI閘道_主庫ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 製造AI閘道_時區_ = 'Asia/Taipei';

var 製造AI閘道_工作表_ = {
  產品主檔: '02_產品主檔',
  計劃每日明細: '05_計劃每日明細',
  報工來源: '0_報工對接pwa V4，報工',
  正式報工: '09_報工',
  工站途程: '08_工站途程機台主檔',
  機台主檔: '03_機台主檔',
  不良紀錄: '09_不良紀錄'
};

/**
 * 主後端模組掛鉤。
 * 回傳 null = 非本模組 action，交給原主後端繼續處理。
 */
function 製造AI閘道_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = 製造AI閘道_文字_(payload.action || payload['動作']);
  if (!action) return null;

  var partNo = 製造AI閘道_文字_(payload.partNo || payload['產品編號'] || payload['料號']);
  var machineId = 製造AI閘道_文字_(payload.machineId || payload['機台編號'] || payload['機台']);
  var queryDate = 製造AI閘道_正規日期_(payload.date || payload.queryDate || payload['日期']) || 製造AI閘道_今天_();

  if (action === 'manufacturing.health' || action === '製造AI閘道健康檢查') {
    return 製造AI閘道_健康檢查_();
  }
  if (action === 'manufacturing.getProduct' || action === 'getProduct') {
    return 製造AI閘道_getProduct_(partNo);
  }
  if (action === 'manufacturing.getTodayProductionPlan' || action === 'getTodayProductionPlan') {
    return 製造AI閘道_getTodayProductionPlan_(partNo, queryDate);
  }
  if (action === 'manufacturing.getProductionProgress' || action === 'getProductionProgress') {
    return 製造AI閘道_getProductionProgress_(partNo, queryDate);
  }
  if (action === 'manufacturing.getRouting' || action === 'getRouting') {
    return 製造AI閘道_getRouting_(partNo);
  }
  if (action === 'manufacturing.getMachineStatus' || action === 'getMachineStatus') {
    return 製造AI閘道_getMachineStatus_(machineId);
  }
  if (action === 'manufacturing.getDefectSummary' || action === 'getDefectSummary') {
    return 製造AI閘道_getDefectSummary_(partNo, queryDate);
  }
  if (action === 'manufacturing.getVisionInspection' || action === 'getVisionInspection') {
    return 製造AI閘道_getVisionInspection_(partNo, queryDate);
  }
  if (action === 'manufacturing.getStatus' || action === 'getManufacturingStatus' || action === '取得製造狀態') {
    return 製造AI閘道_getManufacturingStatus_(partNo, queryDate);
  }

  return null;
}

function 製造AI閘道_健康檢查_() {
  try {
    var ss = 製造AI閘道_主庫_();
    return 製造AI閘道_成功_({
      gatewayVersion: 製造AI閘道_版本_,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      readOnly: true,
      timezone: 製造AI閘道_時區_
    }, 'MANUFACTURING_AGENT_GATEWAY');
  } catch (err) {
    return 製造AI閘道_錯誤_('MANUFACTURING_AGENT_GATEWAY', 'GATEWAY_ERROR', err);
  }
}

function 製造AI閘道_getProduct_(partNo) {
  if (!partNo) return 製造AI閘道_缺參數_('partNo');
  try {
    var table = 製造AI閘道_讀表_(製造AI閘道_工作表_.產品主檔);
    var rows = 製造AI閘道_篩選精確_(table, ['產品編號'], partNo);
    if (!rows.length) return 製造AI閘道_無資料_(製造AI閘道_工作表_.產品主檔);

    var r = rows[0];
    return 製造AI閘道_成功_({
      partNo: 製造AI閘道_取_(r, ['產品編號']),
      customerPartNo: 製造AI閘道_取_(r, ['客戶品號']),
      partName: 製造AI閘道_取_(r, ['品名']),
      partType: 製造AI閘道_取_(r, ['產品類型']),
      assemblyCategory: 製造AI閘道_取_(r, ['組裝類別']),
      defaultStation: 製造AI閘道_取_(r, ['預設工站']),
      mainMachine: 製造AI閘道_取_(r, ['主機台']),
      enabled: 製造AI閘道_取_(r, ['啟用']),
      note: 製造AI閘道_取_(r, ['備註'])
    }, 製造AI閘道_工作表_.產品主檔);
  } catch (err) {
    return 製造AI閘道_錯誤_(製造AI閘道_工作表_.產品主檔, 'ADAPTER_ERROR', err);
  }
}

function 製造AI閘道_getTodayProductionPlan_(partNo, queryDate) {
  if (!partNo) return 製造AI閘道_缺參數_('partNo');
  queryDate = queryDate || 製造AI閘道_今天_();
  try {
    var table = 製造AI閘道_讀表_(製造AI閘道_工作表_.計劃每日明細);
    var all = 製造AI閘道_篩選精確_(table, ['產品編號'], partNo);
    var rows = all.filter(function(r) {
      return 製造AI閘道_正規日期_(製造AI閘道_取_(r, ['日期'])) === queryDate;
    });
    if (!rows.length) return 製造AI閘道_無資料_(製造AI閘道_工作表_.計劃每日明細);

    var planRows = rows.filter(function(r) { return 製造AI閘道_文字_(製造AI閘道_取_(r, ['類型'])) === '計畫'; });
    var supplyRows = rows.filter(function(r) { return 製造AI閘道_文字_(製造AI閘道_取_(r, ['類型'])) === '供料'; });
    var shipmentRows = rows.filter(function(r) { return 製造AI閘道_文字_(製造AI閘道_取_(r, ['類型'])) === '訂單(出貨)'; });

    return 製造AI閘道_成功_({
      partNo: partNo,
      planDate: queryDate,
      planQty: 製造AI閘道_加總欄_(planRows, ['數量']),
      supplyQty: 製造AI閘道_加總欄_(supplyRows, ['數量']),
      shipmentQty: 製造AI閘道_加總欄_(shipmentRows, ['數量']),
      planStatus: 製造AI閘道_第一非空_(rows, ['CTB狀態']),
      rows: rows.map(製造AI閘道_計畫列標準化_)
    }, 製造AI閘道_工作表_.計劃每日明細);
  } catch (err) {
    return 製造AI閘道_錯誤_(製造AI閘道_工作表_.計劃每日明細, 'ADAPTER_ERROR', err);
  }
}

function 製造AI閘道_getProductionProgress_(partNo, queryDate) {
  if (!partNo) return 製造AI閘道_缺參數_('partNo');
  queryDate = queryDate || 製造AI閘道_今天_();
  try {
    var table = 製造AI閘道_讀表_(製造AI閘道_工作表_.報工來源);
    var rows = 製造AI閘道_篩選精確_(table, ['產品編號'], partNo).filter(function(r) {
      return 製造AI閘道_正規日期_(製造AI閘道_取_(r, ['作業日'])) === queryDate;
    });
    if (!rows.length) return 製造AI閘道_無資料_(製造AI閘道_工作表_.報工來源);

    rows.sort(function(a, b) {
      return 製造AI閘道_時間毫秒_(製造AI閘道_取_(a, ['時間戳', '更新時間'])) - 製造AI閘道_時間毫秒_(製造AI閘道_取_(b, ['時間戳', '更新時間']));
    });
    var latest = rows[rows.length - 1];
    var goodQty = 製造AI閘道_加總欄_(rows, ['實際良品數']);
    var defectQty = 製造AI閘道_加總欄_(rows, ['不良數']);
    var reportedQty = null;
    if (goodQty !== null || defectQty !== null) reportedQty = (goodQty || 0) + (defectQty || 0);
    if (reportedQty === null) reportedQty = 製造AI閘道_加總欄_(rows, ['今日共做數']);

    return 製造AI閘道_成功_({
      partNo: partNo,
      workDate: queryDate,
      reportCount: rows.length,
      reportedQty: reportedQty,
      goodQty: goodQty,
      defectQty: defectQty,
      currentProcessId: 製造AI閘道_取_(latest, ['工序範圍']),
      currentStationId: 製造AI閘道_取_(latest, ['工站名稱']),
      currentMachineId: 製造AI閘道_取_(latest, ['主機台']),
      workOrderId: 製造AI閘道_取_(latest, ['工單號', '工單']),
      lastReportedAt: 製造AI閘道_日期時間ISO_(製造AI閘道_取_(latest, ['更新時間', '時間戳'])),
      status: 製造AI閘道_取_(latest, ['處理狀態', '狀態']),
      source: 製造AI閘道_工作表_.報工來源
    }, 製造AI閘道_工作表_.報工來源);
  } catch (err) {
    return 製造AI閘道_錯誤_(製造AI閘道_工作表_.報工來源, 'ADAPTER_ERROR', err);
  }
}

function 製造AI閘道_getRouting_(partNo) {
  if (!partNo) return 製造AI閘道_缺參數_('partNo');
  try {
    var table = 製造AI閘道_讀表_(製造AI閘道_工作表_.工站途程);
    var rows = 製造AI閘道_篩選精確_(table, ['產品編號'], partNo);
    if (!rows.length) return 製造AI閘道_無資料_(製造AI閘道_工作表_.工站途程);

    var data = rows.map(function(r) {
      return {
        routeId: 製造AI閘道_取_(r, ['途程編號', '途程ID', 'routeId']),
        partNo: 製造AI閘道_取_(r, ['產品編號']),
        customerPartNo: 製造AI閘道_取_(r, ['客戶品號']),
        partName: 製造AI閘道_取_(r, ['品名']),
        sequence: 製造AI閘道_取_(r, ['順序', '工站順序', '序號']),
        processId: 製造AI閘道_取_(r, ['工序', '綁定工序', '工序範圍']),
        processName: 製造AI閘道_取_(r, ['工序名稱', '工站名稱', '作業內容']),
        stationId: 製造AI閘道_取_(r, ['工站名稱', '工站', '區域']),
        machineId: 製造AI閘道_取_(r, ['主機台', '機台', '機台編號']),
        machineList: 製造AI閘道_取_(r, ['機台清單', '機台列表']),
        capacity8H: 製造AI閘道_取數_(r, ['8H產能', '產能8H']),
        standardTime: 製造AI閘道_取數_(r, ['標準工時']),
        enabled: 製造AI閘道_取_(r, ['啟用'])
      };
    });
    return 製造AI閘道_成功_({ partNo: partNo, routing: data }, 製造AI閘道_工作表_.工站途程);
  } catch (err) {
    return 製造AI閘道_錯誤_(製造AI閘道_工作表_.工站途程, 'ADAPTER_ERROR', err);
  }
}

function 製造AI閘道_getMachineStatus_(machineId) {
  if (!machineId) return 製造AI閘道_缺參數_('machineId');
  try {
    var table = 製造AI閘道_讀表_(製造AI閘道_工作表_.機台主檔);
    var rows = 製造AI閘道_篩選精確_(table, ['機台編號', '機台ID', 'ID', 'id'], machineId);
    if (!rows.length) return 製造AI閘道_無資料_(製造AI閘道_工作表_.機台主檔);
    var r = rows[0];
    return 製造AI閘道_成功_({
      machineId: 製造AI閘道_取_(r, ['機台編號', '機台ID', 'ID', 'id']),
      machineName: 製造AI閘道_取_(r, ['機台名稱', '名稱']),
      area: 製造AI閘道_取_(r, ['區域', '工站', '站別']),
      model: 製造AI閘道_取_(r, ['型號', 'model']),
      manufacturer: 製造AI閘道_取_(r, ['廠牌', '製造商', 'manufacturer']),
      enabled: 製造AI閘道_取_(r, ['啟用']),
      updatedAt: 製造AI閘道_日期時間ISO_(製造AI閘道_取_(r, ['更新時間']))
    }, 製造AI閘道_工作表_.機台主檔);
  } catch (err) {
    return 製造AI閘道_錯誤_(製造AI閘道_工作表_.機台主檔, 'ADAPTER_ERROR', err);
  }
}

function 製造AI閘道_getDefectSummary_(partNo, queryDate) {
  if (!partNo) return 製造AI閘道_缺參數_('partNo');
  queryDate = queryDate || 製造AI閘道_今天_();
  try {
    var table = 製造AI閘道_讀表_(製造AI閘道_工作表_.不良紀錄);
    var partHeader = 製造AI閘道_找欄名_(table.headers, ['產品編號', '料號', 'partNo']);
    if (!partHeader) {
      return 製造AI閘道_無資料_(製造AI閘道_工作表_.不良紀錄, '來源目前沒有可安全用 partNo 直接關聯的欄位');
    }
    var rows = table.objects.filter(function(r) {
      if (製造AI閘道_文字_(r[partHeader]) !== partNo) return false;
      var d = 製造AI閘道_正規日期_(製造AI閘道_取_(r, ['作業日', '日期', '提報日期', '時間戳', '提報時間']));
      return !d || d === queryDate;
    });
    if (!rows.length) return 製造AI閘道_無資料_(製造AI閘道_工作表_.不良紀錄);

    return 製造AI閘道_成功_({
      partNo: partNo,
      date: queryDate,
      defectQty: 製造AI閘道_加總欄_(rows, ['不良數量', '不良數']),
      defectCount: rows.length,
      defects: rows.map(function(r) {
        return {
          defectId: 製造AI閘道_取_(r, ['不良編號', '不良ID']),
          defectCode: 製造AI閘道_取_(r, ['不良代碼']),
          defectName: 製造AI閘道_取_(r, ['不良名稱']),
          defectQty: 製造AI閘道_取數_(r, ['不良數量', '不良數']),
          stationId: 製造AI閘道_取_(r, ['工站名稱', '工站']),
          machineId: 製造AI閘道_取_(r, ['機台編號', '機台']),
          reportedAt: 製造AI閘道_日期時間ISO_(製造AI閘道_取_(r, ['時間戳', '提報時間']))
        };
      })
    }, 製造AI閘道_工作表_.不良紀錄);
  } catch (err) {
    return 製造AI閘道_錯誤_(製造AI閘道_工作表_.不良紀錄, 'ADAPTER_ERROR', err);
  }
}

function 製造AI閘道_getVisionInspection_(partNo, queryDate) {
  if (!partNo) return 製造AI閘道_缺參數_('partNo');
  return {
    success: false,
    data: null,
    source: 'AI_VISION',
    retrievedAt: 製造AI閘道_現在ISO_(),
    message: '目前查無資料：AI Vision 正式資料來源尚未完成介接',
    errorCode: 'NO_DATA'
  };
}

function 製造AI閘道_getManufacturingStatus_(partNo, queryDate) {
  if (!partNo) return 製造AI閘道_缺參數_('partNo');
  queryDate = queryDate || 製造AI閘道_今天_();

  var product = 製造AI閘道_getProduct_(partNo);
  var plan = 製造AI閘道_getTodayProductionPlan_(partNo, queryDate);
  var progress = 製造AI閘道_getProductionProgress_(partNo, queryDate);
  var routing = 製造AI閘道_getRouting_(partNo);
  var defects = 製造AI閘道_getDefectSummary_(partNo, queryDate);
  var vision = 製造AI閘道_getVisionInspection_(partNo, queryDate);

  var machine = null;
  if (progress.success && progress.data && progress.data.currentMachineId) {
    machine = 製造AI閘道_getMachineStatus_(progress.data.currentMachineId);
  } else {
    machine = 製造AI閘道_無資料_(製造AI閘道_工作表_.機台主檔, '沒有正式報工 currentMachineId，因此不從標準途程猜測目前機台');
  }

  var planQty = plan.success ? plan.data.planQty : null;
  var reportedQty = progress.success ? progress.data.reportedQty : null;
  var remainingQty = null;
  var completionRate = null;
  if (planQty !== null && reportedQty !== null) {
    remainingQty = Math.max(0, Number(planQty) - Number(reportedQty));
    completionRate = Number(planQty) === 0 ? null : Number((Number(reportedQty) / Number(planQty) * 100).toFixed(2));
  }

  var data = {
    partNo: partNo,
    queryDate: queryDate,
    product: product.success ? product.data : null,
    production: {
      planQty: planQty,
      reportedQty: reportedQty,
      remainingQty: remainingQty,
      completionRate: completionRate
    },
    current: {
      processId: progress.success ? progress.data.currentProcessId : null,
      stationId: progress.success ? progress.data.currentStationId : null,
      machineId: progress.success ? progress.data.currentMachineId : null,
      lastReportedAt: progress.success ? progress.data.lastReportedAt : null
    },
    quality: {
      defectQty: defects.success ? defects.data.defectQty : null,
      holdQty: null
    },
    vision: {
      inspectionCount: vision.success && vision.data ? vision.data.inspectionCount : null,
      ngCount: vision.success && vision.data ? vision.data.ngCount : null
    },
    routing: routing.success ? routing.data.routing : null,
    machine: machine.success ? machine.data : null,
    sources: {
      product: 製造AI閘道_來源狀態_(product),
      plan: 製造AI閘道_來源狀態_(plan),
      progress: 製造AI閘道_來源狀態_(progress),
      routing: 製造AI閘道_來源狀態_(routing),
      machine: 製造AI閘道_來源狀態_(machine),
      quality: 製造AI閘道_來源狀態_(defects),
      vision: 製造AI閘道_來源狀態_(vision)
    },
    lastUpdatedAt: 製造AI閘道_現在ISO_()
  };

  if (!product.success) {
    return {
      success: false,
      data: data,
      source: 'MANUFACTURING_AGENT_GATEWAY',
      retrievedAt: 製造AI閘道_現在ISO_(),
      message: '產品主檔目前查無資料',
      errorCode: 'NO_DATA'
    };
  }

  return 製造AI閘道_成功_(data, 'MANUFACTURING_AGENT_GATEWAY');
}

function 製造AI閘道_來源狀態_(r) {
  return {
    success: !!(r && r.success),
    source: r ? r.source : null,
    message: r ? r.message : '目前查無資料',
    errorCode: r ? r.errorCode : 'NO_DATA'
  };
}

function 製造AI閘道_計畫列標準化_(r) {
  return {
    area: 製造AI閘道_取_(r, ['區域']),
    partNo: 製造AI閘道_取_(r, ['產品編號']),
    customerPartNo: 製造AI閘道_取_(r, ['客戶品號']),
    partName: 製造AI閘道_取_(r, ['品名']),
    workOrderId: 製造AI閘道_取_(r, ['工單']),
    planDate: 製造AI閘道_正規日期_(製造AI閘道_取_(r, ['日期'])),
    type: 製造AI閘道_取_(r, ['類型']),
    qty: 製造AI閘道_取數_(r, ['數量']),
    openingInventory: 製造AI閘道_取數_(r, ['期初庫存']),
    capacity8H: 製造AI閘道_取數_(r, ['產能8H']),
    planStatus: 製造AI閘道_取_(r, ['CTB狀態']),
    sourceSheet: 製造AI閘道_取_(r, ['來源工作表']),
    sourceRow: 製造AI閘道_取_(r, ['來源列號'])
  };
}

function 製造AI閘道_主庫_() {
  return SpreadsheetApp.openById(製造AI閘道_主庫ID_);
}

function 製造AI閘道_讀表_(sheetName) {
  var sh = 製造AI閘道_主庫_().getSheetByName(sheetName);
  if (!sh) throw new Error('找不到工作表：' + sheetName);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { headers: [], objects: [] };
  var values = sh.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  var headers = values[0].map(製造AI閘道_文字_);
  var objects = [];
  for (var i = 1; i < values.length; i++) {
    var raw = values[i];
    var hasValue = raw.some(function(v) { return 製造AI閘道_文字_(v) !== ''; });
    if (!hasValue) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c] || ('Column' + (c + 1));
      obj[h] = raw[c];
    }
    objects.push(obj);
  }
  return { headers: headers, objects: objects };
}

function 製造AI閘道_篩選精確_(table, candidates, expected) {
  var h = 製造AI閘道_找欄名_(table.headers, candidates);
  if (!h) return [];
  expected = 製造AI閘道_文字_(expected);
  return table.objects.filter(function(r) { return 製造AI閘道_文字_(r[h]) === expected; });
}

function 製造AI閘道_找欄名_(headers, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var target = 製造AI閘道_文字_(candidates[i]);
    for (var j = 0; j < headers.length; j++) {
      if (製造AI閘道_文字_(headers[j]) === target) return headers[j];
    }
  }
  return null;
}

function 製造AI閘道_取_(r, candidates) {
  if (!r) return null;
  for (var i = 0; i < candidates.length; i++) {
    var k = candidates[i];
    if (Object.prototype.hasOwnProperty.call(r, k)) {
      var v = r[k];
      if (製造AI閘道_文字_(v) !== '') return v;
    }
  }
  return null;
}

function 製造AI閘道_取數_(r, candidates) {
  var v = 製造AI閘道_取_(r, candidates);
  if (v === null || v === undefined || 製造AI閘道_文字_(v) === '') return null;
  var n = Number(String(v).replace(/,/g, '').replace(/%/g, '').trim());
  return isFinite(n) ? n : null;
}

function 製造AI閘道_加總欄_(rows, candidates) {
  if (!rows || !rows.length) return null;
  var found = false;
  var total = 0;
  rows.forEach(function(r) {
    var n = 製造AI閘道_取數_(r, candidates);
    if (n !== null) { found = true; total += n; }
  });
  return found ? total : null;
}

function 製造AI閘道_第一非空_(rows, candidates) {
  for (var i = 0; i < rows.length; i++) {
    var v = 製造AI閘道_取_(rows[i], candidates);
    if (v !== null && 製造AI閘道_文字_(v) !== '') return v;
  }
  return null;
}

function 製造AI閘道_文字_(v) {
  return String(v === null || v === undefined ? '' : v).replace(/\u3000/g, ' ').trim();
}

function 製造AI閘道_今天_() {
  return Utilities.formatDate(new Date(), 製造AI閘道_時區_, 'yyyy-MM-dd');
}

function 製造AI閘道_現在ISO_() {
  return Utilities.formatDate(new Date(), 製造AI閘道_時區_, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function 製造AI閘道_正規日期_(v) {
  if (v === null || v === undefined || 製造AI閘道_文字_(v) === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, 製造AI閘道_時區_, 'yyyy-MM-dd');
  }
  var s = 製造AI閘道_文字_(v).replace(/\./g, '/').replace(/-/g, '/');
  var m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  var d = new Date(v);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, 製造AI閘道_時區_, 'yyyy-MM-dd');
  return null;
}

function 製造AI閘道_日期時間ISO_(v) {
  if (v === null || v === undefined || 製造AI閘道_文字_(v) === '') return null;
  var d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return 製造AI閘道_文字_(v);
  return Utilities.formatDate(d, 製造AI閘道_時區_, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function 製造AI閘道_時間毫秒_(v) {
  var d = v instanceof Date ? v : new Date(v || 0);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function 製造AI閘道_成功_(data, source) {
  return {
    success: true,
    data: data,
    source: source,
    retrievedAt: 製造AI閘道_現在ISO_(),
    message: null,
    errorCode: null
  };
}

function 製造AI閘道_無資料_(source, customMessage) {
  return {
    success: false,
    data: null,
    source: source,
    retrievedAt: 製造AI閘道_現在ISO_(),
    message: customMessage || '目前查無資料',
    errorCode: 'NO_DATA'
  };
}

function 製造AI閘道_缺參數_(paramName) {
  return {
    success: false,
    data: null,
    source: 'MANUFACTURING_AGENT_GATEWAY',
    retrievedAt: 製造AI閘道_現在ISO_(),
    message: '缺少必要參數：' + paramName,
    errorCode: 'INVALID_ARGUMENT'
  };
}

function 製造AI閘道_錯誤_(source, code, err) {
  return {
    success: false,
    data: null,
    source: source,
    retrievedAt: 製造AI閘道_現在ISO_(),
    message: String(err && err.message ? err.message : err),
    errorCode: code || 'INTERNAL_ERROR'
  };
}

/**
 * Apps Script 內可直接執行的第一個正式測試。
 * 已排除錯誤舊料號 2904601000。
 */
function 測試_製造AI閘道_A916000000() {
  return 製造AI閘道_getManufacturingStatus_('A916000000', 製造AI閘道_今天_());
}

/**
 * 針對 2026-08 歷史生產計畫資料驗證，不會寫入資料。
 * A916000001 與 A916000000 維持不同 partNo，不自動合併。
 */
function 測試_製造AI閘道_A916000001_20260812() {
  return 製造AI閘道_getManufacturingStatus_('A916000001', '2026-08-12');
}
