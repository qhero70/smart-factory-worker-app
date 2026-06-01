/**
 * v2.2.0 CTB 齊套率與缺料欄位升級工具
 * 用途：安全追加缺料、齊套、共用素材與交期急迫度需要的新欄位，不覆蓋既有資料。
 * 使用方式：貼到同一個 Apps Script 專案後，執行 升級_v2_2_CTB齊套缺料欄位()
 */

const v2_2_CTB欄位升級設定 = {
  '10_排程需求池': [
    '客戶品號',
    '訂單月份',
    '月訂單',
    '共用素材編號',
    '共用素材名稱',
    '齊套狀態',
    '供料狀態',
    '缺料原因',
    '可用庫存',
    '已鎖定數量',
    '尚缺數量',
    '最晚投產日',
    '前置天數',
    '交期急迫度',
    'Tier等級',
    '投產允許',
    '素材鎖定狀態',
    '委外廠商',
    '委外交期',
    '委外狀態'
  ],
  '05_共用資料': [
    '資料群組',
    '規則名稱',
    '規則值',
    '規則說明'
  ]
};

function 升級_v2_2_CTB齊套缺料欄位() {
  const ss = 取得試算表_();
  const 結果 = [];
  Object.keys(v2_2_CTB欄位升級設定).forEach(表名 => {
    const sh = ss.getSheetByName(表名);
    if (!sh) {
      結果.push({ 工作表名稱: 表名, 狀態: '找不到工作表', 新增欄位: '' });
      return;
    }
    const 現有欄位 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
    const 新增 = [];
    v2_2_CTB欄位升級設定[表名].forEach(欄名 => {
      if (!現有欄位.includes(欄名)) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(欄名);
        新增.push(欄名);
      }
    });
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    sh.autoResizeColumns(1, sh.getLastColumn());
    結果.push({ 工作表名稱: 表名, 狀態: 新增.length ? '已新增欄位' : '欄位已存在', 新增欄位: 新增.join('、') });
  });
  記錄操作_('系統升級', '升級_v2_2_CTB齊套缺料欄位', 'CTB/缺料/共用素材欄位', '完成', JSON.stringify(結果));
  return { 成功: true, 版本: 'v2.2.0', 訊息: 'CTB齊套缺料欄位升級完成', 結果 };
}

function 計算_v2_2_交期急迫度(交期, 前置天數) {
  if (!交期) return { Tier等級: 'Tier 4', 交期急迫度: '未填交期', 投產允許: '待確認' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(交期);
  if (isNaN(due)) return { Tier等級: 'Tier 4', 交期急迫度: '交期格式錯誤', 投產允許: '待確認' };
  due.setHours(0, 0, 0, 0);
  const lead = Number(前置天數 || 0);
  const 最晚投產日 = new Date(due);
  最晚投產日.setDate(最晚投產日.getDate() - lead);
  const 剩餘天數 = Math.round((due - today) / 86400000);
  let Tier等級 = 'Tier 4';
  let 交期急迫度 = '三週以上';
  let 投產允許 = '禁止提前投產';
  if (剩餘天數 <= 7) {
    Tier等級 = 'Tier 1';
    交期急迫度 = 剩餘天數 < 0 ? '已逾期' : '當週出貨';
    投產允許 = '絕對優先';
  } else if (剩餘天數 <= 14) {
    Tier等級 = 'Tier 2';
    交期急迫度 = '下週出貨';
    投產允許 = '優先排程';
  } else if (剩餘天數 <= 21) {
    Tier等級 = 'Tier 3';
    交期急迫度 = '兩週後';
    投產允許 = '素材充足才允許';
  }
  return {
    Tier等級,
    交期急迫度,
    投產允許,
    最晚投產日: Utilities.formatDate(最晚投產日, 'Asia/Taipei', 'yyyy-MM-dd'),
    剩餘天數
  };
}

function 測試_v2_2_CTB欄位檢查() {
  const ss = 取得試算表_();
  return Object.keys(v2_2_CTB欄位升級設定).map(表名 => {
    const sh = ss.getSheetByName(表名);
    if (!sh) return { 工作表名稱: 表名, 狀態: '找不到工作表' };
    const 欄位 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
    const 缺少 = v2_2_CTB欄位升級設定[表名].filter(x => !欄位.includes(x));
    return { 工作表名稱: 表名, 狀態: 缺少.length ? '缺少欄位' : '正常', 缺少欄位: 缺少.join('、') };
  });
}
