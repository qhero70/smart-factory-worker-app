/**
 * v2.3.0 共用素材鎖料模擬工具
 * 用途：素材到貨後，依 Tier 1 → Tier 2 → Tier 3 → Tier 4 與交期排序，自動模擬鎖料分配。
 * 使用方式：貼到同一個 Apps Script 專案後，可執行：
 * 1. 模擬_v2_3_共用素材鎖料分配('A801910008', 500)
 * 2. 套用_v2_3_共用素材鎖料分配('A801910008', 500)
 */

function 模擬_v2_3_共用素材鎖料分配(共用素材編號, 到貨數量) {
  const list = 表格轉物件_('10_排程需求池')
    .filter(x => String(x['狀態'] || '待排程') !== '完成')
    .filter(x => String(x['共用素材編號'] || '').trim() === String(共用素材編號 || '').trim());

  let 可分配 = Number(到貨數量 || 0);
  const 排序後 = list.sort((a, b) => {
    const ta = v2_3_Tier排序值_(a);
    const tb = v2_3_Tier排序值_(b);
    if (ta !== tb) return ta - tb;
    return v2_3_日期差_(a['交期'] || a['預計完工日']) - v2_3_日期差_(b['交期'] || b['預計完工日']);
  });

  const 結果 = 排序後.map(x => {
    const 需求量 = Number(x['需求量'] || 0);
    const 已鎖定 = Number(x['已鎖定數量'] || 0);
    const 尚缺 = Number(x['尚缺數量'] || Math.max(需求量 - 已鎖定, 0));
    const 本次分配 = Math.min(可分配, Math.max(尚缺, 0));
    可分配 -= 本次分配;
    const 分配後尚缺 = Math.max(尚缺 - 本次分配, 0);
    return {
      需求編號: x['需求編號'],
      產品編號: x['產品編號'],
      品名: x['品名'],
      交期: x['交期'] || x['預計完工日'],
      Tier等級: x['Tier等級'] || v2_3_計算Tier_(x['交期'] || x['預計完工日']),
      原尚缺數量: 尚缺,
      本次分配數量: 本次分配,
      分配後尚缺數量: 分配後尚缺,
      分配狀態: 本次分配 <= 0 ? '未分配' : 分配後尚缺 === 0 ? '已滿足' : '部分滿足',
      投產允許: 分配後尚缺 === 0 ? '可投產' : '禁止投產',
      剩餘可分配量: 可分配
    };
  });

  return {
    成功: true,
    版本: 'v2.3.0',
    共用素材編號,
    到貨數量: Number(到貨數量 || 0),
    剩餘未分配: 可分配,
    分配筆數: 結果.filter(x => x['本次分配數量'] > 0).length,
    結果
  };
}

function 套用_v2_3_共用素材鎖料分配(共用素材編號, 到貨數量) {
  const 模擬 = 模擬_v2_3_共用素材鎖料分配(共用素材編號, 到貨數量);
  const ss = 取得試算表_();
  const sh = ss.getSheetByName('10_排程需求池');
  const data = sh.getDataRange().getValues();
  const header = data[0];
  const idx = {};
  header.forEach((h, i) => idx[h] = i);
  const rowById = {};
  for (let r = 1; r < data.length; r++) rowById[String(data[r][idx['需求編號']])] = r + 1;

  模擬.結果.forEach(x => {
    const row = rowById[String(x['需求編號'])];
    if (!row || x['本次分配數量'] <= 0) return;
    v2_3_安全寫入_(sh, row, idx, '已鎖定數量', Number(sh.getRange(row, idx['已鎖定數量'] + 1).getValue() || 0) + Number(x['本次分配數量'] || 0));
    v2_3_安全寫入_(sh, row, idx, '尚缺數量', x['分配後尚缺數量']);
    v2_3_安全寫入_(sh, row, idx, '素材鎖定狀態', x['分配狀態']);
    v2_3_安全寫入_(sh, row, idx, '投產允許', x['投產允許']);
    v2_3_安全寫入_(sh, row, idx, '齊套狀態', x['分配後尚缺數量'] === 0 ? '齊套完成' : '缺料');
    v2_3_安全寫入_(sh, row, idx, '更新時間', new Date());
  });

  記錄操作_('排程系統', '套用_v2_3_共用素材鎖料分配', 共用素材編號, '完成', JSON.stringify(模擬));
  return { 成功: true, 訊息: '共用素材鎖料分配已套用', 模擬 };
}

function v2_3_安全寫入_(sh, row, idx, 欄位, 值) {
  if (idx[欄位] === undefined) return;
  sh.getRange(row, idx[欄位] + 1).setValue(值);
}

function v2_3_Tier排序值_(x) {
  const t = String(x['Tier等級'] || v2_3_計算Tier_(x['交期'] || x['預計完工日']));
  if (t.indexOf('1') >= 0) return 1;
  if (t.indexOf('2') >= 0) return 2;
  if (t.indexOf('3') >= 0) return 3;
  return 4;
}

function v2_3_計算Tier_(交期) {
  const d = v2_3_日期差_(交期);
  if (d <= 7) return 'Tier 1';
  if (d <= 14) return 'Tier 2';
  if (d <= 21) return 'Tier 3';
  return 'Tier 4';
}

function v2_3_日期差_(日期字串) {
  if (!日期字串) return 99999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(日期字串);
  if (isNaN(d)) return 99999;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function 測試_v2_3_共用素材鎖料模擬() {
  return 模擬_v2_3_共用素材鎖料分配('A801910008', 500);
}
