/**
 * ZZ_報工作業V2_送出修正版
 * 版本：v1.5.6｜修正送出寫入 09_報工
 *
 * 重要：
 * 1. 此檔檔名故意使用 ZZ_ 開頭，讓 Apps Script 載入時覆蓋舊版同名函數。
 * 2. 此檔不可宣告 doGet / doPost。
 * 3. 修正前端 07_報工作業V2.html 呼叫 google.script.run.寫入報工作業v2(data) 時，必須寫入「09_報工」而不是舊的「09_報工紀錄」。
 */

const 報工作業V2_目標分頁 = '09_報工';

const 報工作業V2_標準欄位 = [
  '報工編號', '時間戳', '作業日', '工號', '姓名', '班別', '是否加班', '加班類型',
  '作業員照片網址', '作業員縮圖網址', '作業員照片檔案ID',
  '產品編號', '客戶品號', '品名', '產品照片網址', '產品縮圖網址', '產品照片檔案ID',
  '工站名稱', '報工工站名稱', '工序', '工序清單', '機台清單', '主機台', '機台照片清單JSON',
  '今日共做數', '不良數', '實際良品數', '不良率',
  '開始時間', '結束時間', '實際工時',
  '不良類別', '不良代碼', '不良原因', '異常類型', '備註', '現場照片JSON',
  '來源', '狀態', '更新時間'
];

function 報工作業V2_送出部署檢查() {
  const ss = 取得試算表_();
  const sh = 取得或建立報工作業V2分頁_(ss);
  const headers = 取得表頭_(sh);
  return {
    成功: true,
    訊息: '報工作業V2送出修正版已載入',
    版本: 'v1.5.6_修正送出寫入09_報工',
    目標分頁: sh.getName(),
    欄位數: headers.length,
    資料列數: Math.max(sh.getLastRow() - 1, 0),
    必要函數: {
      寫入報工作業v2: typeof 寫入報工作業v2 === 'function',
      取得報工作業v2初始資料: typeof 取得報工作業v2初始資料 === 'function'
    }
  };
}

function 寫入報工作業v2(data) {
  data = data || {};
  const ss = 取得試算表_();
  const sh = 取得或建立報工作業V2分頁_(ss);
  const headers = 取得表頭_(sh);

  const 今日共做數 = Number(data.今日共做數 || 0);
  const 不良數 = Number(data.不良數 || 0);
  const 實際良品數 = Number(data.實際良品數 || Math.max(今日共做數 - 不良數, 0));

  if (!String(data.工號 || '').trim()) throw new Error('請選擇作業員，工號不可空白');
  if (!String(data.產品編號 || '').trim() && !String(data.品名 || '').trim()) throw new Error('請選擇產品');
  if (!String(data.報工工站名稱 || data.工站名稱 || '').trim()) throw new Error('請選擇報工工站');
  if (今日共做數 <= 0) throw new Error('今日共做數必須大於 0');
  if (不良數 < 0) throw new Error('不良數不可小於 0');
  if (不良數 > 今日共做數) throw new Error('不良數不可大於今日共做數');

  const now = new Date();
  const 報工編號 = data.報工編號 || 產生流水號_('RFV2');
  const 班別 = data.班別 && data.班別 !== '自動判斷' ? data.班別 : 判斷化新班別_();

  const rowObj = {
    報工編號,
    時間戳: now,
    作業日: 取得作業日_(),
    工號: data.工號 || '',
    姓名: data.姓名 || '',
    班別,
    是否加班: data.是否加班 || '否',
    加班類型: data.加班類型 || '無',
    作業員照片網址: data.作業員照片網址 || '',
    作業員縮圖網址: data.作業員縮圖網址 || '',
    作業員照片檔案ID: data.作業員照片檔案ID || '',
    產品編號: data.產品編號 || '',
    客戶品號: data.客戶品號 || '',
    品名: data.品名 || '',
    產品照片網址: data.產品照片網址 || '',
    產品縮圖網址: data.產品縮圖網址 || '',
    產品照片檔案ID: data.產品照片檔案ID || '',
    工站名稱: data.工站名稱 || data.報工工站名稱 || '',
    報工工站名稱: data.報工工站名稱 || data.工站名稱 || '',
    工序: data.工序 || '',
    工序清單: data.工序清單 || data.工序 || '',
    機台清單: data.機台清單 || '',
    主機台: data.主機台 || '',
    機台照片清單JSON: JSON.stringify(data.機台照片清單 || []),
    今日共做數,
    不良數,
    實際良品數,
    不良率: 今日共做數 > 0 ? 不良數 / 今日共做數 : 0,
    開始時間: data.開始時間 || '',
    結束時間: data.結束時間 || '',
    實際工時: data.實際工時 || '',
    不良類別: data.不良類別 || '無',
    不良代碼: data.不良代碼 || '',
    不良原因: data.不良原因 || '',
    異常類型: data.異常類型 || '',
    備註: data.備註 || '',
    現場照片JSON: JSON.stringify(data.現場照片清單 || []),
    來源: 'GAS_HTML_07_報工作業V2_v1.5.6',
    狀態: '有效',
    更新時間: now
  };

  const row = headers.map(h => rowObj[h] !== undefined ? rowObj[h] : '');
  sh.appendRow(row);

  報工作業V2_同步工單與不良_(rowObj, data);

  try {
    記錄操作_('報工作業V2', '寫入09_報工', 報工編號, '完成', JSON.stringify({
      工號: rowObj.工號,
      產品編號: rowObj.產品編號,
      報工工站名稱: rowObj.報工工站名稱,
      今日共做數,
      不良數,
      實際良品數
    }));
  } catch (e) {}

  return {
    成功: true,
    訊息: '報工作業V2寫入完成',
    報工編號,
    目標分頁: sh.getName(),
    作業日: rowObj.作業日,
    班別,
    今日共做數,
    不良數,
    實際良品數
  };
}

function 取得或建立報工作業V2分頁_(ss) {
  let sh = ss.getSheetByName(報工作業V2_目標分頁);
  if (!sh) sh = ss.insertSheet(報工作業V2_目標分頁);

  const lastColumn = Math.max(sh.getLastColumn(), 1);
  const headers = sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(String).filter(Boolean);

  if (!headers.length) {
    sh.getRange(1, 1, 1, 報工作業V2_標準欄位.length).setValues([報工作業V2_標準欄位]);
  } else {
    const 現有 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const 缺少 = 報工作業V2_標準欄位.filter(h => !現有.includes(h));
    if (缺少.length) {
      sh.getRange(1, sh.getLastColumn() + 1, 1, 缺少.length).setValues([缺少]);
    }
  }

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  return sh;
}

function 取得表頭_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function 報工作業V2_同步工單與不良_(rowObj, 原始資料) {
  const 工單編號 = 原始資料.工單編號 || '';
  if (工單編號) {
    try {
      更新工單完成量_(工單編號, rowObj.實際良品數, rowObj.不良數);
    } catch (e) {}
  }

  if (Number(rowObj.不良數 || 0) > 0 || rowObj.不良代碼 || rowObj.不良原因) {
    try {
      新增不良_({
        作業日: rowObj.作業日,
        工號: rowObj.工號,
        姓名: rowObj.姓名,
        產品編號: rowObj.產品編號,
        品名: rowObj.品名,
        機台編號: rowObj.主機台 || rowObj.機台清單,
        工單編號,
        不良代碼: rowObj.不良代碼,
        不良名稱: rowObj.不良原因,
        不良數量: rowObj.不良數,
        責任歸屬: rowObj.不良類別,
        說明: rowObj.備註,
        照片網址: ''
      });
    } catch (e) {}
  }
}
