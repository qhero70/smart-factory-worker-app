/**
 * v2.1.0 欄位升級工具
 * 用途：安全追加排程與計畫清洗需要的新欄位，不覆蓋既有資料。
 * 使用方式：貼到同一個 Apps Script 專案後，執行 升級_v2_1_欄位結構()
 */

const v2_1_欄位升級設定 = {
  '10_排程需求池': [
    '負責人',
    '預計開工日',
    '預計完工日',
    '供料日',
    '出貨日',
    '訂單欠量',
    '排程備註'
  ],
  '10_工單主檔': [
    '供料日',
    '出貨日',
    '訂單欠量',
    '來源需求編號'
  ]
};

function 升級_v2_1_欄位結構() {
  const ss = 取得試算表_();
  const 結果 = [];
  Object.keys(v2_1_欄位升級設定).forEach(表名 => {
    const sh = ss.getSheetByName(表名);
    if (!sh) {
      結果.push({ 工作表名稱: 表名, 狀態: '找不到工作表', 新增欄位: '' });
      return;
    }
    const 欄位 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
    const 新增 = [];
    v2_1_欄位升級設定[表名].forEach(欄名 => {
      if (!欄位.includes(欄名)) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(欄名);
        新增.push(欄名);
      }
    });
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    sh.autoResizeColumns(1, sh.getLastColumn());
    結果.push({ 工作表名稱: 表名, 狀態: 新增.length ? '已新增欄位' : '欄位已存在', 新增欄位: 新增.join('、') });
  });
  記錄操作_('系統升級', '升級_v2_1_欄位結構', '排程/工單欄位', '完成', JSON.stringify(結果));
  return { 成功: true, 版本: 'v2.1.0', 訊息: '欄位升級完成', 結果 };
}

function 測試_v2_1_欄位升級檢查() {
  const ss = 取得試算表_();
  return Object.keys(v2_1_欄位升級設定).map(表名 => {
    const sh = ss.getSheetByName(表名);
    if (!sh) return { 工作表名稱: 表名, 狀態: '找不到工作表' };
    const 欄位 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
    const 缺少 = v2_1_欄位升級設定[表名].filter(x => !欄位.includes(x));
    return { 工作表名稱: 表名, 狀態: 缺少.length ? '缺少欄位' : '正常', 缺少欄位: 缺少.join('、') };
  });
}
