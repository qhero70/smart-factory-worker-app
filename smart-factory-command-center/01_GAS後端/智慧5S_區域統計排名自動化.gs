/**
 * ============================================================
 * 化新精密｜智慧5S 區域統計排名自動化
 * 版本：1.3.6
 * ============================================================
 * 功能：
 * 1. 每日依正式資料重算 5S_區域日統計。
 * 2. 依 PWA v1.0.5 同一套風險公式產生 5S_排名快照。
 * 3. 計算相較前一期的名次變化。
 * 4. 建立每日 LINE 主管排名摘要，沿用唯一 LINE Bot。
 * 5. 自動排除系統驗收、智慧5S自動驗收、TEST_ONLY 等測試資料。
 * 6. 同一天重跑採覆寫更新，不重複建立統計與通知。
 * ============================================================
 */

var 智慧5S_區域統計_版本 = '1.3.6';
var 智慧5S_區域統計_資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S_區域統計_排程函式 = '智慧5S_區域統計_每日自動執行';
var 智慧5S_區域統計_PWA正式入口 = 'https://qhero70.github.io/smart-factory-worker-app/5s/';
var 智慧5S_區域統計_PWA版本備援 = '1360';

function 智慧5S_區域統計_每日自動執行() {
  var 統計結果 = 智慧5S_區域統計_產生今日統計();
  var 通知結果 = 智慧5S_區域統計_建立排名通知(統計結果);
  var 發送結果 = null;

  if (typeof 智慧5S_LINE橋接_處理待通知 === 'function') {
    發送結果 = 智慧5S_LINE橋接_處理待通知(30);
  }

  return {
    成功: true,
    版本: 智慧5S_區域統計_版本,
    統計: 統計結果,
    通知: 通知結果,
    發送: 發送結果
  };
}

function 智慧5S_區域統計_產生今日統計() {
  var 資料庫 = SpreadsheetApp.openById(智慧5S_區域統計_資料庫ID);
  var 區域分頁 = 智慧5S_區域統計_必要分頁_(資料庫, '5S_區域主檔');
  var 巡檢分頁 = 智慧5S_區域統計_必要分頁_(資料庫, '5S_巡檢主檔');
  var 改善分頁 = 智慧5S_區域統計_必要分頁_(資料庫, '5S_改善單');
  var 紅牌分頁 = 智慧5S_區域統計_必要分頁_(資料庫, '5S_紅牌追蹤');
  var 日統計分頁 = 智慧5S_區域統計_必要分頁_(資料庫, '5S_區域日統計');
  var 排名分頁 = 智慧5S_區域統計_必要分頁_(資料庫, '5S_排名快照');

  var 今天 = new Date();
  var 今天字串 = Utilities.formatDate(今天, 'Asia/Taipei', 'yyyy-MM-dd');

  var 區域資料 = 智慧5S_區域統計_讀取表格_(區域分頁).filter(function (列) {
    return 智慧5S_區域統計_文字_(列['啟用']) !== '否';
  });
  var 巡檢資料 = 智慧5S_區域統計_讀取表格_(巡檢分頁).filter(function (列) {
    return !智慧5S_區域統計_是否測試資料_(列) && 智慧5S_區域統計_文字_(列['狀態']) !== '作廢';
  });
  var 改善資料 = 智慧5S_區域統計_讀取表格_(改善分頁).filter(function (列) {
    return !智慧5S_區域統計_是否測試資料_(列);
  });
  var 紅牌資料 = 智慧5S_區域統計_讀取表格_(紅牌分頁).filter(function (列) {
    return !智慧5S_區域統計_是否測試資料_(列);
  });

  var 區域清單 = 區域資料.map(function (區域列) {
    var 區域代碼 = 智慧5S_區域統計_文字_(區域列['區域代碼']);
    var 區域名稱 = 智慧5S_區域統計_文字_(區域列['區域名稱'] || 區域代碼);

    var 區域巡檢 = 巡檢資料.filter(function (列) {
      return 智慧5S_區域統計_區域符合_(列, 區域代碼, 區域名稱);
    });
    var 區域改善 = 改善資料.filter(function (列) {
      return 智慧5S_區域統計_區域符合_(列, 區域代碼, 區域名稱);
    });
    var 區域紅牌 = 紅牌資料.filter(function (列) {
      return 智慧5S_區域統計_區域符合_(列, 區域代碼, 區域名稱);
    });

    var 今日巡檢 = 區域巡檢.filter(function (列) {
      return 智慧5S_區域統計_日期字串_(列['巡檢日期'] || 列['送出時間'] || 列['建立時間']) === 今天字串;
    });
    var 今日得分 = 今日巡檢.map(function (列) {
      return 智慧5S_區域統計_數字_(列['得分率'], null);
    }).filter(function (值) { return 值 !== null; });
    var 平均得分率 = 今日得分.length
      ? Math.round((今日得分.reduce(function (合計, 值) { return 合計 + 值; }, 0) / 今日得分.length) * 10) / 10
      : '';
    var 異常項數 = 今日巡檢.reduce(function (合計, 列) {
      return 合計 + Math.max(0, 智慧5S_區域統計_數字_(列['異常項數'], 0));
    }, 0);

    var 未結改善 = 區域改善.filter(function (列) {
      return !智慧5S_區域統計_已結束改善_(列['狀態']);
    }).length;
    var 已結改善 = 區域改善.filter(function (列) {
      var 狀態 = 智慧5S_區域統計_文字_(列['狀態']);
      return (狀態 === '已完成' || 狀態 === '已結案');
    }).length;
    var 改善總數 = 未結改善 + 已結改善;
    var 完成率 = 改善總數 > 0 ? Math.round((已結改善 / 改善總數) * 100) : 100;

    var 最新巡檢 = 智慧5S_區域統計_取得最新巡檢_(區域巡檢);
    var 最新得分率 = 最新巡檢 ? 智慧5S_區域統計_數字_(最新巡檢['得分率'], null) : null;

    var 待處置紅牌 = 0;
    var 七日內紅牌 = 0;
    var 逾期紅牌 = 0;
    區域紅牌.forEach(function (列) {
      var 狀態 = 智慧5S_區域統計_文字_(列['案件狀態']);
      if (['已完成', '已結案', '已處置', '作廢'].indexOf(狀態) >= 0) return;
      待處置紅牌++;
      var 到期日 = 智慧5S_區域統計_解析日期_(列['預定處置日']);
      if (!到期日) return;
      var 天數 = 智慧5S_區域統計_日期差_(今天, 到期日);
      if (天數 < 0) 逾期紅牌++;
      else if (天數 <= 7) 七日內紅牌++;
    });

    var 扣分 = 0;
    var 風險說明 = [];
    if (最新得分率 === null) {
      扣分 += 20;
      風險說明.push('尚無正式巡檢基準');
    } else if (最新得分率 < 85) {
      var 低分扣分 = Math.min(30, Math.round((85 - 最新得分率) * 1.2));
      扣分 += 低分扣分;
      風險說明.push('巡檢 ' + Math.round(最新得分率) + ' 分');
    }
    if (未結改善 > 0) {
      扣分 += Math.min(32, 未結改善 * 16);
      風險說明.push('未結改善 ' + 未結改善 + ' 件');
    }
    if (待處置紅牌 > 0) {
      扣分 += Math.min(24, 待處置紅牌 * 8);
      風險說明.push('待處置紅牌 ' + 待處置紅牌 + ' 件');
    }
    if (七日內紅牌 > 0) {
      扣分 += Math.min(24, 七日內紅牌 * 12);
      風險說明.push('7日內到期 ' + 七日內紅牌 + ' 件');
    }
    if (逾期紅牌 > 0) {
      扣分 += Math.min(60, 逾期紅牌 * 40);
      風險說明.push('逾期紅牌 ' + 逾期紅牌 + ' 件');
    }

    var 管理分數 = Math.max(0, 100 - 扣分);
    var 風險層級 = '綠';
    if (逾期紅牌 > 0 || (最新得分率 !== null && 最新得分率 < 70) || 管理分數 < 60) {
      風險層級 = '紅';
    } else if (未結改善 > 0 || 待處置紅牌 > 0 || 最新得分率 === null || (最新得分率 !== null && 最新得分率 < 85) || 管理分數 < 85) {
      風險層級 = '黃';
    }

    return {
      日期: 今天字串,
      區域代碼: 區域代碼,
      區域名稱: 區域名稱,
      平均得分率: 平均得分率,
      異常項數: 異常項數,
      未結改善單: 未結改善,
      已結改善單: 已結改善,
      完成率: 完成率,
      最新得分率: 最新得分率,
      待處置紅牌: 待處置紅牌,
      七日內紅牌: 七日內紅牌,
      逾期紅牌: 逾期紅牌,
      管理分數: 管理分數,
      風險層級: 風險層級,
      風險說明: 風險說明.join('、') || '目前無待辦風險'
    };
  });

  區域清單.sort(function (甲, 乙) {
    if (乙.管理分數 !== 甲.管理分數) return 乙.管理分數 - 甲.管理分數;
    if (甲.逾期紅牌 !== 乙.逾期紅牌) return 甲.逾期紅牌 - 乙.逾期紅牌;
    return 甲.區域名稱.localeCompare(乙.區域名稱);
  });

  智慧5S_區域統計_寫入日統計_(日統計分頁, 今天字串, 區域清單);
  var 前期名次 = 智慧5S_區域統計_取得前期名次_(排名分頁, 今天字串);
  智慧5S_區域統計_寫入排名_(排名分頁, 今天字串, 區域清單, 前期名次);
  SpreadsheetApp.flush();

  return {
    成功: true,
    版本: 智慧5S_區域統計_版本,
    日期: 今天字串,
    區域數: 區域清單.length,
    排名: 區域清單.map(function (列, 索引) {
      return {
        名次: 索引 + 1,
        區域代碼: 列.區域代碼,
        區域名稱: 列.區域名稱,
        分數: 列.管理分數,
        風險: 列.風險層級,
        說明: 列.風險說明
      };
    })
  };
}

function 智慧5S_區域統計_建立排名通知(統計結果) {
  if (!統計結果 || !統計結果.成功) return { 成功: false, 訊息: '沒有可通知的排名資料' };

  var 資料庫 = SpreadsheetApp.openById(智慧5S_區域統計_資料庫ID);
  var 通知分頁 = 智慧5S_區域統計_必要分頁_(資料庫, '5S_通知紀錄');
  var 區域分頁 = 智慧5S_區域統計_必要分頁_(資料庫, '5S_區域主檔');
  var 群組識別碼 = 智慧5S_區域統計_取得主要群組_(區域分頁);
  if (!群組識別碼) return { 成功: false, 訊息: '尚未設定智慧5S LINE群組' };

  var 排名 = 統計結果.排名 || [];
  var 優先 = 排名.slice().sort(function (甲, 乙) {
    var 等級 = { 紅: 3, 黃: 2, 綠: 1 };
    if (等級[乙.風險] !== 等級[甲.風險]) return 等級[乙.風險] - 等級[甲.風險];
    return 甲.分數 - 乙.分數;
  })[0] || null;

  var 前三 = 排名.slice(0, 3).map(function (列) {
    return 列.名次 + '.' + 列.區域名稱 + ' ' + 列.分數 + '分';
  }).join('｜');
  var 摘要 = '【智慧5S主管排名】' + 統計結果.日期 +
    '｜TOP3：' + (前三 || '尚無資料') +
    (優先 ? '｜優先處理：' + 優先.區域名稱 + ' ' + 優先.分數 + '分｜' + 優先.說明 : '') +
    '｜開啟戰情：' + 智慧5S_區域統計_取得PWA網址_('可視化');

  var 去重鍵 = '5S-RANK-' + 統計結果.日期;
  var 新增 = 智慧5S_區域統計_新增通知_(通知分頁, {
    通知編號: '5S-RANK-' + 統計結果.日期.replace(/-/g, ''),
    通知場景: '每日5S排名',
    對象類型: 'LINE群組',
    對象識別碼: 群組識別碼,
    訊息類型: '主管排名摘要',
    內容摘要: 摘要,
    狀態: '待發送',
    送出時間: '',
    錯誤訊息: '',
    去重鍵: 去重鍵
  });

  return { 成功: true, 新增通知: 新增, 去重鍵: 去重鍵, 摘要: 摘要 };
}

function 智慧5S_區域統計_建立每日觸發器() {
  智慧5S_區域統計_刪除每日觸發器();
  ScriptApp.newTrigger(智慧5S_區域統計_排程函式)
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .nearMinute(10)
    .create();
  return { 成功: true, 版本: 智慧5S_區域統計_版本, 訊息: '區域統計排名每日約08:10觸發器已建立' };
}

function 智慧5S_區域統計_刪除每日觸發器() {
  var 數量 = 0;
  ScriptApp.getProjectTriggers().forEach(function (觸發器) {
    if (觸發器.getHandlerFunction() === 智慧5S_區域統計_排程函式) {
      ScriptApp.deleteTrigger(觸發器);
      數量++;
    }
  });
  return { 成功: true, 已刪除觸發器數: 數量 };
}

function 智慧5S_區域統計_健康檢查() {
  var 資料庫 = SpreadsheetApp.openById(智慧5S_區域統計_資料庫ID);
  var 必要 = ['5S_區域主檔','5S_巡檢主檔','5S_改善單','5S_紅牌追蹤','5S_區域日統計','5S_排名快照','5S_通知紀錄'];
  var 缺少 = 必要.filter(function (名稱) { return !資料庫.getSheetByName(名稱); });
  return {
    成功: 缺少.length === 0,
    版本: 智慧5S_區域統計_版本,
    資料庫名稱: 資料庫.getName(),
    缺少分頁: 缺少,
    LINE橋接可用: typeof 智慧5S_LINE橋接_處理待通知 === 'function'
  };
}

function 智慧5S_區域統計_取得PWA網址_(頁面) {
  if (typeof LINE智慧5S入口39_取得網址_ === 'function') {
    return LINE智慧5S入口39_取得網址_(頁面 || '首頁');
  }
  var 參數 = {};
  try {
    var 資料庫 = SpreadsheetApp.openById(智慧5S_區域統計_資料庫ID);
    var 分頁 = 資料庫.getSheetByName('5S_系統參數');
    if (分頁 && 分頁.getLastRow() >= 2) {
      var 資料 = 分頁.getDataRange().getDisplayValues();
      var 欄位 = 資料.shift().map(function (值) { return String(值 || '').trim(); });
      var 鍵欄 = 欄位.indexOf('參數鍵');
      var 值欄 = 欄位.indexOf('參數值');
      資料.forEach(function (列) {
        var 鍵 = 鍵欄 >= 0 ? String(列[鍵欄] || '').trim() : '';
        if (鍵 && 值欄 >= 0) 參數[鍵] = String(列[值欄] || '').trim();
      });
    }
  } catch (錯誤) {
    console.warn('智慧5S排名讀取PWA版本失敗：' + 錯誤);
  }
  var 基底 = String(參數['PWA正式入口網址'] || 智慧5S_區域統計_PWA正式入口).trim();
  var 版本 = String(參數['PWA入口版本'] || 智慧5S_區域統計_PWA版本備援).replace(/\D/g, '') || 智慧5S_區域統計_PWA版本備援;
  基底 = 基底.replace(/([?&])v=\d+/g, '$1').replace(/([?&])頁面=[^&]*/g, '$1').replace(/([?&])來源=[^&]*/g, '$1');
  基底 = 基底.replace(/\?&/g, '?').replace(/&&+/g, '&').replace(/[?&]+$/, '');
  var 網址 = 基底 + (基底.indexOf('?') >= 0 ? '&' : '?') + '來源=LINEBOT&v=' + 版本;
  if (頁面 && 頁面 !== '首頁') 網址 += '&頁面=' + encodeURIComponent(頁面);
  return 網址;
}

function 智慧5S_區域統計_寫入日統計_(分頁, 日期, 區域清單) {
  var 表格 = 智慧5S_區域統計_讀取表格含列號_(分頁);
  區域清單.forEach(function (列) {
    var 既有 = 表格.filter(function (現有) {
      return 智慧5S_區域統計_日期字串_(現有.資料['日期']) === 日期 &&
        智慧5S_區域統計_文字_(現有.資料['區域代碼']) === 列.區域代碼;
    })[0];
    var 值 = [日期, 列.區域代碼, 列.區域名稱, 列.平均得分率, 列.異常項數, 列.未結改善單, 列.已結改善單, 列.完成率];
    if (既有) 分頁.getRange(既有.列號, 1, 1, 8).setValues([值]);
    else 分頁.appendRow(值);
  });
}

function 智慧5S_區域統計_寫入排名_(分頁, 日期, 區域清單, 前期名次) {
  var 表格 = 智慧5S_區域統計_讀取表格含列號_(分頁);
  區域清單.forEach(function (列, 索引) {
    var 名次 = 索引 + 1;
    var 前名次 = 前期名次[列.區域代碼];
    var 變化 = '建立基準';
    if (前名次) {
      var 差 = 前名次 - 名次;
      變化 = 差 > 0 ? '↑' + 差 : (差 < 0 ? '↓' + Math.abs(差) : '持平');
    }
    var 既有 = 表格.filter(function (現有) {
      return 智慧5S_區域統計_日期字串_(現有.資料['統計期間']) === 日期 &&
        智慧5S_區域統計_文字_(現有.資料['範圍類型']) === '每日' &&
        智慧5S_區域統計_文字_(現有.資料['對象代碼']) === 列.區域代碼;
    })[0];
    var 值 = [日期, '每日', 列.區域代碼, 列.區域名稱, 列.管理分數, 名次, 變化];
    if (既有) 分頁.getRange(既有.列號, 1, 1, 7).setValues([值]);
    else 分頁.appendRow(值);
  });
}

function 智慧5S_區域統計_取得前期名次_(分頁, 今天) {
  var 資料 = 智慧5S_區域統計_讀取表格_(分頁).filter(function (列) {
    var 日期 = 智慧5S_區域統計_日期字串_(列['統計期間']);
    return 智慧5S_區域統計_文字_(列['範圍類型']) === '每日' && 日期 && 日期 < 今天;
  });
  var 最新日期 = '';
  資料.forEach(function (列) {
    var 日期 = 智慧5S_區域統計_日期字串_(列['統計期間']);
    if (日期 > 最新日期) 最新日期 = 日期;
  });
  var 結果 = {};
  資料.filter(function (列) {
    return 智慧5S_區域統計_日期字串_(列['統計期間']) === 最新日期;
  }).forEach(function (列) {
    結果[智慧5S_區域統計_文字_(列['對象代碼'])] = 智慧5S_區域統計_數字_(列['名次'], 0);
  });
  return 結果;
}

function 智慧5S_區域統計_取得最新巡檢_(清單) {
  if (!清單.length) return null;
  return 清單.slice().sort(function (甲, 乙) {
    return 智慧5S_區域統計_日期時間戳_(乙['巡檢日期'] || 乙['送出時間'] || 乙['建立時間']) -
      智慧5S_區域統計_日期時間戳_(甲['巡檢日期'] || 甲['送出時間'] || 甲['建立時間']);
  })[0] || null;
}

function 智慧5S_區域統計_區域符合_(列, 區域代碼, 區域名稱) {
  var 目標 = [區域代碼, 區域名稱].map(function (值) { return 智慧5S_區域統計_正規區域_(值); });
  var 候選 = [列['區域代碼'], 列['區域'], 列['區域名稱']].map(function (值) { return 智慧5S_區域統計_正規區域_(值); });
  return 候選.some(function (值) { return 值 && 目標.indexOf(值) >= 0; });
}

function 智慧5S_區域統計_是否測試資料_(列) {
  var 合併 = Object.keys(列).map(function (鍵) { return 智慧5S_區域統計_文字_(列[鍵]); }).join('｜');
  return 智慧5S_區域統計_文字_(列['來源類型']) === '系統驗收' ||
    合併.indexOf('智慧5S自動驗收') >= 0 ||
    合併.indexOf('TEST_ONLY') >= 0 ||
    合併.indexOf('SYSTEM-5S-TEST') >= 0 ||
    合併.indexOf('SYSTEM-ACCEPTANCE') >= 0;
}

function 智慧5S_區域統計_已結束改善_(狀態) {
  return ['已完成','已結案','作廢'].indexOf(智慧5S_區域統計_文字_(狀態)) >= 0;
}

function 智慧5S_區域統計_取得主要群組_(分頁) {
  var 資料 = 智慧5S_區域統計_讀取表格_(分頁);
  for (var i = 0; i < 資料.length; i++) {
    if (智慧5S_區域統計_文字_(資料[i]['啟用']) === '否') continue;
    var 群組 = 智慧5S_區域統計_文字_(資料[i]['LINE群組識別碼']);
    if (群組) return 群組;
  }
  return '';
}

function 智慧5S_區域統計_新增通知_(分頁, 通知) {
  var 資料 = 智慧5S_區域統計_讀取表格_(分頁);
  var 去重鍵 = 智慧5S_區域統計_文字_(通知.去重鍵);
  var 已存在 = 資料.some(function (列) {
    return 去重鍵 && 智慧5S_區域統計_文字_(列['去重鍵']) === 去重鍵;
  });
  if (已存在) return false;

  var 欄位 = 分頁.getRange(1, 1, 1, 分頁.getLastColumn()).getDisplayValues()[0];
  分頁.appendRow(欄位.map(function (欄名) {
    return 通知[智慧5S_區域統計_文字_(欄名)] !== undefined ? 通知[智慧5S_區域統計_文字_(欄名)] : '';
  }));
  return true;
}

function 智慧5S_區域統計_讀取表格_(分頁) {
  if (分頁.getLastRow() < 2) return [];
  var 欄位 = 分頁.getRange(1, 1, 1, 分頁.getLastColumn()).getDisplayValues()[0];
  var 資料 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 欄位.length).getDisplayValues();
  return 資料.map(function (列) {
    var 物件 = {};
    欄位.forEach(function (欄名, i) { 物件[智慧5S_區域統計_文字_(欄名)] = 列[i]; });
    return 物件;
  });
}

function 智慧5S_區域統計_讀取表格含列號_(分頁) {
  var 資料 = 智慧5S_區域統計_讀取表格_(分頁);
  return 資料.map(function (列, i) { return { 列號: i + 2, 資料: 列 }; });
}

function 智慧5S_區域統計_必要分頁_(資料庫, 名稱) {
  var 分頁 = 資料庫.getSheetByName(名稱);
  if (!分頁) throw new Error('找不到必要分頁：' + 名稱);
  return 分頁;
}

function 智慧5S_區域統計_文字_(值) {
  return String(值 === null || 值 === undefined ? '' : 值).trim();
}

function 智慧5S_區域統計_數字_(值, 預設值) {
  var 數值 = Number(String(值 === null || 值 === undefined ? '' : 值).replace(/%/g, '').trim());
  return isFinite(數值) ? 數值 : 預設值;
}

function 智慧5S_區域統計_正規區域_(值) {
  return 智慧5S_區域統計_文字_(值).replace(/\s+/g, '');
}

function 智慧5S_區域統計_解析日期_(值) {
  var 內容 = 智慧5S_區域統計_文字_(值).replace(/\//g, '-');
  var 符合 = 內容.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!符合) return null;
  return new Date(Number(符合[1]), Number(符合[2]) - 1, Number(符合[3]), 12, 0, 0);
}

function 智慧5S_區域統計_日期字串_(值) {
  var 日期 = 智慧5S_區域統計_解析日期_(值);
  return 日期 ? Utilities.formatDate(日期, 'Asia/Taipei', 'yyyy-MM-dd') : '';
}

function 智慧5S_區域統計_日期差_(起日, 迄日) {
  var 起 = new Date(起日.getFullYear(), 起日.getMonth(), 起日.getDate(), 12, 0, 0);
  var 迄 = new Date(迄日.getFullYear(), 迄日.getMonth(), 迄日.getDate(), 12, 0, 0);
  return Math.round((迄.getTime() - 起.getTime()) / 86400000);
}

function 智慧5S_區域統計_日期時間戳_(值) {
  var 日期 = 智慧5S_區域統計_解析日期_(值);
  return 日期 ? 日期.getTime() : 0;
}
