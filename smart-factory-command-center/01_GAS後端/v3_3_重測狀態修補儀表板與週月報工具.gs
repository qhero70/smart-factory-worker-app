/**
 * v3.3.0 重測狀態、修補完成率儀表板與週/月報工具
 * 用途：正式建立 GitHub Issue、更新重測清單狀態、產生修補完成率儀表板、產生上線修補週報 / 月報。
 * 使用方式：與 v3_2_修補建議GitHubIssue與重測工具.gs 放同一個 Apps Script 專案。
 */

function 正式建立_v3_3_GitHubIssue(修補編號) {
  return 建立_v3_2_GitHubIssue(修補編號);
}

function 更新_v3_3_重測狀態(重測編號, 重測狀態, 重測結果, 備註) {
  const ss = 取得試算表_();
  const sh = ss.getSheetByName('00_修補重測清單');
  if (!sh) return { 成功: false, 訊息: '找不到 00_修補重測清單，請先執行 升級_v3_2_修補GitHub與重測表()' };
  const data = sh.getDataRange().getValues();
  const h = data[0];
  const idx = {}; h.forEach((x, i) => idx[x] = i);
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx['重測編號']]) === String(重測編號)) {
      if (idx['重測狀態'] !== undefined) sh.getRange(r + 1, idx['重測狀態'] + 1).setValue(重測狀態 || '待重測');
      if (idx['重測結果'] !== undefined) sh.getRange(r + 1, idx['重測結果'] + 1).setValue(重測結果 || '');
      if (idx['備註'] !== undefined) sh.getRange(r + 1, idx['備註'] + 1).setValue(備註 || '');
      if (idx['重測時間'] !== undefined) sh.getRange(r + 1, idx['重測時間'] + 1).setValue(new Date());
      if (idx['更新時間'] !== undefined) sh.getRange(r + 1, idx['更新時間'] + 1).setValue(new Date());
      return { 成功: true, 版本: 'v3.3.0', 訊息: '重測狀態已更新' };
    }
  }
  return { 成功: false, 訊息: '找不到重測編號：' + 重測編號 };
}

function 取得_v3_3_修補完成率儀表板資料() {
  if (typeof 升級_v3_2_修補GitHub與重測表 === 'function') 升級_v3_2_修補GitHub與重測表();
  const errors = 表格轉物件_('00_上線測試錯誤回報');
  const tasks = 表格轉物件_('00_上線修補任務');
  const maps = 表格轉物件_('00_修補GitHub對照');
  const retests = 表格轉物件_('00_修補重測清單');
  const 完成任務 = tasks.filter(x => x['修補狀態'] === '完成').length;
  const 重測通過 = retests.filter(x => x['重測狀態'] === '通過').length;
  const 重測失敗 = retests.filter(x => x['重測狀態'] === '失敗').length;
  return {
    成功: true,
    版本: 'v3.3.0',
    統計: {
      錯誤總數: errors.length,
      修補任務總數: tasks.length,
      修補完成: 完成任務,
      修補未完成: tasks.length - 完成任務,
      修補完成率: tasks.length ? Math.round(完成任務 / tasks.length * 1000) / 10 : 0,
      GitHub對照數: maps.length,
      重測總數: retests.length,
      重測通過,
      重測失敗,
      重測待測: retests.filter(x => !x['重測狀態'] || x['重測狀態'] === '待重測').length,
      重測通過率: retests.length ? Math.round(重測通過 / retests.length * 1000) / 10 : 0
    },
    類型統計: v3_3_分組統計_(tasks, '修補類型'),
    優先級統計: v3_3_分組統計_(tasks, '優先級'),
    狀態統計: v3_3_分組統計_(tasks, '修補狀態'),
    重測狀態統計: v3_3_分組統計_(retests, '重測狀態'),
    修補任務: tasks.slice(-200).reverse(),
    GitHub對照: maps.slice(-200).reverse(),
    重測清單: retests.slice(-200).reverse()
  };
}

function 產生_v3_3_上線修補週報() {
  return v3_3_產生修補報告_('週報');
}

function 產生_v3_3_上線修補月報() {
  return v3_3_產生修補報告_('月報');
}

function v3_3_產生修補報告_(模式) {
  const d = 取得_v3_3_修補完成率儀表板資料();
  const s = d.統計;
  const 未完成 = (d.修補任務 || []).filter(x => x['修補狀態'] !== '完成').slice(0, 12).map((x, i) => `${i + 1}. ${x['優先級']}｜${x['修補類型']}｜${x['修補狀態']}｜${x['問題摘要']}`).join('\n') || '目前無未完成修補任務。';
  const 失敗重測 = (d.重測清單 || []).filter(x => x['重測狀態'] === '失敗').slice(0, 10).map((x, i) => `${i + 1}. ${x['修補編號']}｜${x['重測項目']}｜${x['重測結果'] || ''}`).join('\n') || '目前無失敗重測項目。';
  return `【v3.3.0 上線修補${模式}】\n\n錯誤總數：${s.錯誤總數}\n修補任務總數：${s.修補任務總數}\n修補完成：${s.修補完成}\n修補未完成：${s.修補未完成}\n修補完成率：${s.修補完成率}%\nGitHub 對照數：${s.GitHub對照數}\n重測總數：${s.重測總數}\n重測通過：${s.重測通過}\n重測失敗：${s.重測失敗}\n重測待測：${s.重測待測}\n重測通過率：${s.重測通過率}%\n\n修補類型統計：\n${v3_3_統計文字_(d.類型統計)}\n\n修補狀態統計：\n${v3_3_統計文字_(d.狀態統計)}\n\n未完成修補任務：\n${未完成}\n\n失敗重測項目：\n${失敗重測}\n\n建議：\n1. 高優先未完成修補先處理。\n2. 重測失敗項目需回到 fix-board 建立新修補任務或補處理紀錄。\n3. 完成修補後，請回 system-test.html 執行全部測試。`;
}

function v3_3_分組統計_(list, key) {
  const out = {};
  (list || []).forEach(x => {
    const k = x[key] || '未填';
    out[k] = (out[k] || 0) + 1;
  });
  return out;
}

function v3_3_統計文字_(obj) {
  return Object.keys(obj || {}).map(k => `${k}：${obj[k]}`).join('\n') || '無資料';
}

function 測試_v3_3_修補完成率儀表板資料() {
  return 取得_v3_3_修補完成率儀表板資料();
}
