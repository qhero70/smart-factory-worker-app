/**
 * v2.2.0 LINE 排程摘要與 CTB 缺料摘要指令
 * 用途：讓 LINE 輸入「排程摘要」「缺料摘要」「CTB」時，可回覆排程與缺料重點。
 * 使用方式：與 LINEBot_FlexMessage主選單.gs 放在同一個 Apps Script 專案。
 */

function 產生LINE排程摘要文字_() {
  const list = 表格轉物件_('10_排程需求池');
  const 未完成 = list.filter(x => String(x['狀態'] || '待排程') !== '完成');
  const 逾期 = 未完成.filter(x => LINE_v2_2_日期差_(x['交期'] || x['預計完工日']) < 0);
  const 到期 = 未完成.filter(x => {
    const d = LINE_v2_2_日期差_(x['交期'] || x['預計完工日']);
    return d >= 0 && d <= 3;
  });
  const 欠量 = 未完成.reduce((s, x) => s + Number(x['訂單欠量'] || 0), 0);
  const 紅燈 = 未完成.filter(x => LINE_v2_2_CTB燈號_(x) === '紅燈缺料');
  const top = 紅燈.slice(0, 5).map((x, i) => `${i + 1}. ${x['需求編號']}｜${x['品名']}｜尚缺 ${x['尚缺數量'] || 0}`).join('\n') || '目前無紅燈缺料。';
  return `📌 排程摘要\n未完成：${未完成.length}\n逾期：${逾期.length}\n3天內到期：${到期.length}\n訂單欠量：${欠量}\n紅燈缺料：${紅燈.length}\n\n紅燈TOP：\n${top}`;
}

function 產生LINE_CTB缺料摘要文字_() {
  const list = 表格轉物件_('10_排程需求池').filter(x => String(x['狀態'] || '待排程') !== '完成');
  const 紅燈 = list.filter(x => LINE_v2_2_CTB燈號_(x) === '紅燈缺料');
  const 黃燈 = list.filter(x => LINE_v2_2_CTB燈號_(x) === '黃燈待確認');
  const 綠燈 = list.filter(x => LINE_v2_2_CTB燈號_(x) === '綠燈可投產');
  const 白燈 = list.filter(x => LINE_v2_2_CTB燈號_(x) === '白燈禁止提前');
  const 尚缺 = 紅燈.reduce((s, x) => s + Number(x['尚缺數量'] || 0), 0);
  const top = 紅燈.slice(0, 6).map((x, i) => `${i + 1}. ${x['產品編號']}｜${x['品名']}｜${x['缺料原因'] || '未填原因'}`).join('\n') || '目前無紅燈缺料。';
  return `🚦 CTB缺料摘要\n紅燈缺料：${紅燈.length}\n黃燈待確認：${黃燈.length}\n綠燈可投產：${綠燈.length}\n白燈禁止提前：${白燈.length}\n尚缺數量：${尚缺}\n\n紅燈明細：\n${top}`;
}

function LINE_v2_2_CTB燈號_(x) {
  const 缺料原因 = String(x['缺料原因'] || '');
  const 齊套狀態 = String(x['齊套狀態'] || '');
  const 尚缺數量 = Number(x['尚缺數量'] || 0);
  if (齊套狀態.indexOf('缺') >= 0 || 尚缺數量 > 0 || ['缺料', '材料不足', '缺素材', '缺棧板', '缺包材'].some(k => 缺料原因.indexOf(k) >= 0)) return '紅燈缺料';
  const tier = String(x['Tier等級'] || LINE_v2_2_計算Tier_(x['交期'] || x['預計完工日']));
  if (tier === 'Tier 4') return '白燈禁止提前';
  if (!x['供料日'] || !x['齊套狀態'] || String(x['供料狀態'] || '').indexOf('待') >= 0) return '黃燈待確認';
  return '綠燈可投產';
}

function LINE_v2_2_計算Tier_(交期) {
  const d = LINE_v2_2_日期差_(交期);
  if (d <= 7) return 'Tier 1';
  if (d <= 14) return 'Tier 2';
  if (d <= 21) return 'Tier 3';
  return 'Tier 4';
}

function LINE_v2_2_日期差_(日期字串) {
  if (!日期字串) return 99999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(日期字串);
  if (isNaN(d)) return 99999;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function 產生LINE回覆訊息_v2_2_(文字) {
  const t = String(文字 || '').trim();
  if (t === '排程摘要' || t === '排程' || t === '排程狀況') return [{ type: 'text', text: 產生LINE排程摘要文字_() }];
  if (t === '缺料摘要' || t.toUpperCase() === 'CTB' || t === '齊套') return [{ type: 'text', text: 產生LINE_CTB缺料摘要文字_() }];
  return 產生LINE回覆訊息_(文字);
}

function 測試_v2_2_LINE排程摘要() {
  return 產生LINE排程摘要文字_();
}

function 測試_v2_2_LINE_CTB缺料摘要() {
  return 產生LINE_CTB缺料摘要文字_();
}
