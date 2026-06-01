/**
 * v2.4.0 共用素材主檔、到貨紀錄、鎖料分配歷史工具
 * 用途：建立共用素材主檔、素材到貨紀錄、鎖料分配歷史，並提供正式資料缺漏匯總。
 * 使用方式：貼到同一個 Apps Script 專案後，先執行 升級_v2_4_共用素材主檔與紀錄表()
 */

const v2_4_素材資料表設定 = {
  '10_共用素材主檔': ['共用素材編號','共用素材名稱','素材分類','適用產品清單','目前庫存','安全庫存','已鎖定數量','可分配數量','主要供應商','採購前置天數','狀態','備註','更新時間'],
  '10_共用素材到貨紀錄': ['到貨編號','到貨日期','共用素材編號','共用素材名稱','到貨數量','供應商','來源單號','驗收狀態','經辦人','備註','建立時間'],
  '10_鎖料分配歷史': ['分配批號','分配時間','共用素材編號','共用素材名稱','到貨編號','到貨數量','需求編號','產品編號','品名','Tier等級','交期','原尚缺數量','本次分配數量','分配後尚缺數量','分配狀態','投產允許','經辦人','備註']
};

function 升級_v2_4_共用素材主檔與紀錄表() {
  const ss = 取得試算表_();
  const 結果 = [];
  Object.keys(v2_4_素材資料表設定).forEach(表名 => {
    let sh = ss.getSheetByName(表名);
    if (!sh) sh = ss.insertSheet(表名);
    const 欄位 = v2_4_素材資料表設定[表名];
    const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
    const 新增 = [];
    欄位.forEach(欄名 => {
      if (!現有.includes(欄名)) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(欄名);
        新增.push(欄名);
      }
    });
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    sh.autoResizeColumns(1, sh.getLastColumn());
    結果.push({ 工作表名稱: 表名, 狀態: 新增.length ? '已新增欄位' : '欄位已存在', 新增欄位: 新增.join('、') });
  });
  記錄操作_('系統升級', '升級_v2_4_共用素材主檔與紀錄表', '共用素材/到貨/鎖料歷史', '完成', JSON.stringify(結果));
  return { 成功: true, 版本: 'v2.4.0', 訊息: '共用素材主檔與紀錄表升級完成', 結果 };
}

function 登記_v2_4_共用素材到貨(資料) {
  升級_v2_4_共用素材主檔與紀錄表();
  const ss = 取得試算表_();
  const 到貨表 = ss.getSheetByName('10_共用素材到貨紀錄');
  const 主檔表 = ss.getSheetByName('10_共用素材主檔');
  const 到貨編號 = 資料.到貨編號 || ('ARR-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'));
  const row = {
    到貨編號,
    到貨日期: 資料.到貨日期 || Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'),
    共用素材編號: 資料.共用素材編號 || '',
    共用素材名稱: 資料.共用素材名稱 || '',
    到貨數量: Number(資料.到貨數量 || 0),
    供應商: 資料.供應商 || '',
    來源單號: 資料.來源單號 || '',
    驗收狀態: 資料.驗收狀態 || '已驗收',
    經辦人: 資料.經辦人 || '',
    備註: 資料.備註 || '',
    建立時間: new Date()
  };
  v2_4_追加物件列_(到貨表, row);
  v2_4_更新共用素材庫存_(主檔表, row.共用素材編號, row.共用素材名稱, row.到貨數量);
  記錄操作_('共用素材', '登記_v2_4_共用素材到貨', row.共用素材編號, '完成', JSON.stringify(row));
  return { 成功: true, 訊息: '共用素材到貨已登記', 到貨編號, 資料: row };
}

function 套用_v2_4_到貨並鎖料分配(資料) {
  const 到貨 = 登記_v2_4_共用素材到貨(資料);
  const 模擬結果 = 套用_v2_3_共用素材鎖料分配(資料.共用素材編號, Number(資料.到貨數量 || 0));
  const ss = 取得試算表_();
  const 歷史表 = ss.getSheetByName('10_鎖料分配歷史');
  const batch = 'LOCK-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss');
  (模擬結果.模擬.結果 || []).forEach(x => {
    v2_4_追加物件列_(歷史表, {
      分配批號: batch,
      分配時間: new Date(),
      共用素材編號: 資料.共用素材編號 || '',
      共用素材名稱: 資料.共用素材名稱 || '',
      到貨編號: 到貨.到貨編號,
      到貨數量: Number(資料.到貨數量 || 0),
      需求編號: x.需求編號,
      產品編號: x.產品編號,
      品名: x.品名,
      Tier等級: x.Tier等級,
      交期: x.交期,
      原尚缺數量: x.原尚缺數量,
      本次分配數量: x.本次分配數量,
      分配後尚缺數量: x.分配後尚缺數量,
      分配狀態: x.分配狀態,
      投產允許: x.投產允許,
      經辦人: 資料.經辦人 || '',
      備註: 資料.備註 || ''
    });
  });
  return { 成功: true, 訊息: '到貨已登記並完成鎖料分配', 到貨, 分配批號: batch, 模擬結果 };
}

function 取得_v2_4_正式資料缺漏匯總() {
  const ss = 取得試算表_();
  const 必要表 = ['00_系統設定','01_人員主檔','02_產品主檔','03_機台主檔','04_工站主檔','10_工單主檔','10_排程需求池','10_共用素材主檔','10_共用素材到貨紀錄','10_鎖料分配歷史'];
  const 結果 = [];
  必要表.forEach(表名 => {
    const sh = ss.getSheetByName(表名);
    if (!sh) {
      結果.push({ 類型: '工作表', 項目: 表名, 狀態: '缺少工作表', 嚴重度: '高', 建議: '執行對應版本升級工具' });
      return;
    }
    const rows = Math.max(sh.getLastRow() - 1, 0);
    if (rows === 0) 結果.push({ 類型: '資料列', 項目: 表名, 狀態: '沒有資料', 嚴重度: '中', 建議: '匯入或建立正式資料' });
    const header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
    if (!header.length) 結果.push({ 類型: '欄位', 項目: 表名, 狀態: '沒有欄位', 嚴重度: '高', 建議: '執行欄位修復或升級工具' });
  });
  return { 成功: true, 版本: 'v2.4.0', 統計: { 缺漏數: 結果.length }, 結果 };
}

function v2_4_追加物件列_(sh, obj) {
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = header.map(h => obj[h] !== undefined ? obj[h] : '');
  sh.appendRow(row);
}

function v2_4_更新共用素材庫存_(sh, 編號, 名稱, 數量) {
  const data = sh.getDataRange().getValues();
  const header = data[0];
  const idx = {};
  header.forEach((h, i) => idx[h] = i);
  let found = 0;
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx['共用素材編號']]) === String(編號)) { found = r + 1; break; }
  }
  if (!found) {
    v2_4_追加物件列_(sh, { 共用素材編號: 編號, 共用素材名稱: 名稱, 目前庫存: Number(數量 || 0), 已鎖定數量: 0, 可分配數量: Number(數量 || 0), 狀態: '啟用', 更新時間: new Date() });
    return;
  }
  const oldStock = Number(sh.getRange(found, idx['目前庫存'] + 1).getValue() || 0);
  const locked = Number(sh.getRange(found, idx['已鎖定數量'] + 1).getValue() || 0);
  const newStock = oldStock + Number(數量 || 0);
  sh.getRange(found, idx['目前庫存'] + 1).setValue(newStock);
  if (idx['可分配數量'] !== undefined) sh.getRange(found, idx['可分配數量'] + 1).setValue(Math.max(newStock - locked, 0));
  if (idx['更新時間'] !== undefined) sh.getRange(found, idx['更新時間'] + 1).setValue(new Date());
}

function 測試_v2_4_正式資料缺漏匯總() {
  return 取得_v2_4_正式資料缺漏匯總();
}
