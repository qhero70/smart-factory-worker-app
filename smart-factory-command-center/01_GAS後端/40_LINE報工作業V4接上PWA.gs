/**
 * 40｜LINE 報工作業 V4 接上 PWA｜v1.9.4
 * 在原 NEXUS OS 專案新增本檔，儲存後執行：套用40_LINE報工作業V4到PWA
 * 沿用既有 Token、圖片、角色與智慧5S入口；只替換報工按鈕網址。
 * 本檔沒有 doGet / doPost，不需改動 v1.9.3 主路由或 Webhook 部署。
 * LINE 選單按鈕需透過替換選單更新；舊選單保留，重跑會沿用已準備的選單。
 */

function 套用40_LINE報工作業V4到PWA() {
  var 鎖 = LockService.getScriptLock();
  if (!鎖.tryLock(10000)) throw new Error('已有選單作業進行中，請稍後再執行本函式。');
  var 屬性 = PropertiesService.getScriptProperties();
  try {
    if (typeof 批次同步34_LINE所有已綁定使用者選單 !== 'function') {
      throw new Error('缺少已使用中的 34_LINE 角色分流模組，尚未切換選單。');
    }
    var 設定 = [
      { 名稱: '主管入口', 屬性鍵: 'LINE_RICH_MENU_主管入口_ID' },
      { 名稱: '一般員工入口', 屬性鍵: 'LINE_RICH_MENU_一般員工_ID' }
    ];
    設定.forEach(function (項目) {
      項目.原ID = String(屬性.getProperty(項目.屬性鍵) || '').trim();
      if (!/^richmenu-[a-z0-9]+$/i.test(項目.原ID)) {
        throw new Error('缺少有效的「' + 項目.名稱 + '」選單 ID，尚未切換選單。');
      }
      項目.原選單 = 報工PWA40_JSON_('get', '/richmenu/' + 項目.原ID);
    });
    if (設定[0].原ID === 設定[1].原ID) {
      throw new Error('主管與員工選單 ID 相同，請先恢復原本的角色選單設定。');
    }
    var 原預設 = 報工PWA40_JSON_('get', '/user/all/richmenu', null, true);
    var 原預設ID = 原預設 ? String(原預設.richMenuId || '') : '';
    var 清單結果 = 報工PWA40_JSON_('get', '/richmenu/list');
    var 清單 = 清單結果.richmenus || [];

    // 兩個選單的圖片都準備好後，才更新正式使用的 ID。
    設定.forEach(function (項目) {
      項目.新ID = 報工PWA40_準備選單_(項目, 清單, 屬性);
    });
    設定.forEach(function (項目) {
      if (String(屬性.getProperty(項目.屬性鍵) || '').trim() !== 項目.原ID) {
        throw new Error('選單設定已被其他作業更新，請重新執行本函式。');
      }
    });
    var 有變更 = 設定.some(function (項目) { return 項目.原ID !== 項目.新ID; });
    if (有變更) {
      屬性.setProperty('LINE_V4_PWA40_上次切換備份', JSON.stringify({
        時間: new Date().toISOString(), 原預設ID: 原預設ID,
        選單: 設定.map(function (項目) {
          return { 屬性鍵: 項目.屬性鍵, 原ID: 項目.原ID, 新ID: 項目.新ID };
        })
      }));
    }
    var 新屬性 = { LINE_WORK_REPORT_V4_PWA_URL: 報工PWA40_正式網址_() };
    設定.forEach(function (項目) { 新屬性[項目.屬性鍵] = 項目.新ID; });
    屬性.setProperties(新屬性, false);
    屬性.setProperty('LINE_V4_PWA40_進度', '正式 ID 已更新，正在同步預設與個人選單');

    // 保留原本的預設角色。中斷後重跑時，也能從備份辨認尚未更新的舊預設。
    var 目標預設ID = 原預設ID ? '' : 設定[1].新ID;
    設定.forEach(function (項目) {
      if (原預設ID === 項目.原ID || 原預設ID === 項目.新ID) 目標預設ID = 項目.新ID;
    });
    var 備份 = JSON.parse(屬性.getProperty('LINE_V4_PWA40_上次切換備份') || '{}');
    if (!目標預設ID && Array.isArray(備份.選單)) {
      備份.選單.forEach(function (項目) {
        if (原預設ID === 項目.原ID && 新屬性[項目.屬性鍵] === 項目.新ID) {
          目標預設ID = 項目.新ID;
        }
      });
    }
    if (目標預設ID && 目標預設ID !== 原預設ID) {
      報工PWA40_JSON_('post', '/user/all/richmenu/' + 目標預設ID);
      var 目前預設 = 報工PWA40_JSON_('get', '/user/all/richmenu');
      if (目前預設.richMenuId !== 目標預設ID) throw new Error('預設選單尚未完成更新，請重新執行本函式。');
    }

    // 使用原 34 模組依現有身份同步；工程師／權限 60 仍沿用主管入口。
    var 同步 = 批次同步34_LINE所有已綁定使用者選單();
    if (!同步 || 同步.成功 !== true) {
      throw new Error('報工入口已設定，但個人選單尚未全部同步。未完成數：' +
        String(同步 && 同步.失敗數 || '未知') + '。請重新執行本函式接續同步。');
    }
    屬性.setProperty('LINE_V4_PWA40_進度', '完成');
    console.log('完成：LINE「報工作業」已接到 V4 PWA。');
    console.log('主管與員工選單已同步，智慧5S及其他按鈕沿用原設定。');
    console.log('已同步使用者：' + String(同步.成功數 || 0));
    console.log('報工入口：' + 報工PWA40_正式網址_());
    return { 成功: true, 訊息: '報工作業 V4 已接上 PWA', 同步人數: 同步.成功數 || 0 };
  } catch (錯誤) {
    屬性.setProperty('LINE_V4_PWA40_進度', '未完成：' + String(錯誤.message || 錯誤).slice(0, 600));
    throw 錯誤;
  } finally {
    鎖.releaseLock();
  }
}

function 報工PWA40_正式網址_() {
  return 'https://qhero70.github.io/smart-factory-worker-app/work-report-v4-477.html?v=539&fix=stable-no-flicker&openExternalBrowser=1';
}

function 報工PWA40_準備選單_(項目, 清單, 屬性) {
  var 原 = 項目.原選單;
  var 新 = {
    size: 原.size, selected: 原.selected, name: 原.name,
    chatBarText: 原.chatBarText, areas: JSON.parse(JSON.stringify(原.areas || []))
  };
  var 報工區 = 新.areas.filter(function (區域) {
    var 動作 = 區域.action || {};
    var 標籤 = String(動作.label || '').replace(/\s/g, '');
    var 網址 = String(動作.uri || '');
    return /^(報工作業(?:V[24])?|報工|報工入口|開啟報工)$/i.test(標籤) ||
      /[?&]page=07_/.test(網址) || /\/work-report-v4-[^/]*\.html(?:[?#]|$)/.test(網址);
  });
  if (報工區.length !== 1) {
    throw new Error('「' + 項目.名稱 + '」無法唯一辨認報工作業按鈕，尚未切換選單。');
  }
  if (報工區[0].action.type === 'uri' && 報工區[0].action.uri === 報工PWA40_正式網址_()) {
    return 項目.原ID;
  }
  報工區[0].action = { type: 'uri', label: '報工作業', uri: 報工PWA40_正式網址_() };
  var 摘要 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify([新.size, 新.selected, 新.chatBarText, 新.areas]), Utilities.Charset.UTF_8)
    .map(function (位元) { return ('0' + (位元 & 255).toString(16)).slice(-2); }).join('').slice(0, 20);
  新.name = '40_' + 項目.名稱 + '_報工V4PWA_' + 摘要;
  var 待用鍵 = 'LINE_V4_PWA40_待用_' + 摘要;
  var 待用ID = String(屬性.getProperty(待用鍵) || '');
  var 既有 = 清單.find(function (選單) {
    return (選單.richMenuId === 待用ID || 選單.name === 新.name) &&
      報工PWA40_相同設定_(選單, 新);
  });
  var 新ID = 既有 ? String(既有.richMenuId) : '';
  if (新ID) {
    var 已上傳 = 報工PWA40_要求_('get', '/richmenu/' + 新ID + '/content', null, true, true);
    if (已上傳) return 新ID;
  }
  var 原圖片 = 報工PWA40_要求_('get', '/richmenu/' + 項目.原ID + '/content', null, true).getBlob();
  if (!新ID) {
    var 建立結果 = 報工PWA40_JSON_('post', '/richmenu', 新);
    新ID = String(建立結果.richMenuId || '');
    if (!/^richmenu-[a-z0-9]+$/i.test(新ID)) throw new Error('LINE 未回傳有效的新選單 ID。');
    屬性.setProperty(待用鍵, 新ID);
  }
  報工PWA40_要求_('post', '/richmenu/' + 新ID + '/content', 原圖片, true);
  console.log('已準備「' + 項目.名稱 + '」的 V4 報工入口。');
  return 新ID;
}

function 報工PWA40_相同設定_(甲, 乙) {
  // API 回傳的物件欄位順序可能不同，先統一欄位順序再比較。
  function 排序(值) {
    if (Array.isArray(值)) return 值.map(排序);
    if (值 && typeof 值 === 'object') {
      var 結果 = {};
      Object.keys(值).sort().forEach(function (鍵) { 結果[鍵] = 排序(值[鍵]); });
      return 結果;
    }
    return 值;
  }
  return ['size', 'selected', 'chatBarText', 'areas'].every(function (鍵) {
    return JSON.stringify(排序(甲[鍵])) === JSON.stringify(排序(乙[鍵]));
  });
}

function 報工PWA40_JSON_(方法, 路徑, 資料, 允許不存在) {
  var 回應 = 報工PWA40_要求_(方法, 路徑, 資料, false, 允許不存在);
  return 回應 ? JSON.parse(回應.getContentText() || '{}') : null;
}

function 報工PWA40_要求_(方法, 路徑, 資料, 圖片模式, 允許不存在) {
  var 權杖 = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!權杖) throw new Error('原專案缺少 LINE_CHANNEL_ACCESS_TOKEN，尚未送出 LINE 要求。');
  var 網域 = 圖片模式 ? 'https://api-data.line.me/v2/bot' : 'https://api.line.me/v2/bot';
  var 選項 = { method: 方法, headers: { Authorization: 'Bearer ' + 權杖 }, muteHttpExceptions: true };
  if (資料 !== null && 資料 !== undefined) {
    選項.contentType = 圖片模式 ? 資料.getContentType() : 'application/json';
    選項.payload = 圖片模式 ? 資料.getBytes() : JSON.stringify(資料);
  }
  var 回應 = UrlFetchApp.fetch(網域 + 路徑, 選項);
  var 狀態碼 = 回應.getResponseCode();
  if (允許不存在 && 狀態碼 === 404) return null;
  if (狀態碼 < 200 || 狀態碼 >= 300) {
    throw new Error('LINE 選單更新失敗 HTTP ' + 狀態碼 + '：' + 回應.getContentText().slice(0, 300));
  }
  return 回應;
}
