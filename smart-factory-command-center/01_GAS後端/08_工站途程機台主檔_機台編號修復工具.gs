/**
 * 08_工站途程機台主檔_機台編號修復工具.gs
 * 智慧製造中央作戰指揮中心資料庫｜08 主檔機台編號修復工具
 *
 * 目的：
 * 1. 修復 08_工站途程機台主檔 中，因 Google Sheets 把「1064,1083,1073」誤判成數字格式，顯示為「106,410,831,073」的問題。
 * 2. 機台編號一律以 03_機台主檔 的正式機台編號為準。
 * 3. 重新依 04_工站機台關聯 + 產品/品名/工序 找出正確機台清單。
 * 4. 將 機台編號清單、主機台、區域清單、機台明細JSON 全部改成純文字寫回。
 *
 * 使用：
 * 執行 修復_08工站途程機台主檔_機台編號()
 */

const 修復08設定 = {
  主檔: '08_工站途程機台主檔',
  機台主檔: '03_機台主檔',
  工站機台關聯: '04_工站機台關聯',
  報告: '08_工站途程機台主檔_機台修復報告',
  需文字欄位: ['工序清單','工序範圍','機台編號清單','主機台','區域清單','機台明細JSON']
};

function 修復_08工站途程機台主檔_機台編號() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const 主表 = 取得表_(ss, 修復08設定.主檔);
  const 機台主檔列 = 讀表物件_(ss, 修復08設定.機台主檔);
  const 關聯列 = 讀表物件_(ss, 修復08設定.工站機台關聯);

  const 機台索引 = 建立正式機台索引_(機台主檔列);
  const 關聯索引 = 整理工站機台關聯列_(關聯列, 機台索引);

  const data = 主表.getDataRange().getDisplayValues();
  if (data.length < 2) throw new Error('08_工站途程機台主檔 無資料');

  const header = data[0].map(v => String(v || '').trim());
  const col = 建立欄位索引_(header);
  補欄位格式為純文字_(主表, header, 修復08設定.需文字欄位);

  const 必要 = ['品名','工序清單','工序範圍','機台編號清單','主機台','區域清單'];
  必要.forEach(h => { if (col[h] == null) throw new Error('08_工站途程機台主檔 缺少欄位：' + h); });

  const 更新值 = [];
  const 報告 = [];
  let 修復筆數 = 0;
  let 找不到筆數 = 0;
  let 原本正常筆數 = 0;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const obj = {};
    header.forEach((h, i) => obj[h] = String(row[i] || '').trim());

    const 品名 = obj['品名'] || '';
    if (!品名) continue;

    const 產品編號 = obj['產品編號'] || '';
    const 客戶品號 = obj['客戶品號'] || '';
    const 工站名稱 = obj['報工工站名稱'] || obj['工站名稱'] || '';
    const 工序清單 = 解析工序清單_(obj['工序清單'] || obj['工序範圍'] || obj['工序']);

    const 正式機台 = 依關聯找正式機台_(關聯索引, {
      產品編號, 客戶品號, 品名, 工站名稱, 工序清單
    }, 機台索引);

    const 原機台文字 = obj['機台編號清單'] || '';
    const 原主機台 = obj['主機台'] || '';
    const 原清單 = 解析機台清單_寬鬆_(原機台文字, 機台索引);
    const 正式清單 = 正式機台.map(m => m.機台編號);

    let 最終機台 = 正式機台;
    let 狀態 = '正常';
    let 說明 = '';

    if (!最終機台.length) {
      const fallback = 原清單.map(no => 機台索引[標準鍵_(no)]).filter(Boolean);
      if (fallback.length) {
        最終機台 = fallback;
        狀態 = '使用原欄位修復';
        說明 = '04_工站機台關聯未命中，改用原欄位解析後比對 03_機台主檔';
      } else {
        找不到筆數++;
        狀態 = '需確認';
        說明 = '找不到對應正式機台，可能是委外/人工作業/資料待補';
      }
    }

    const 新清單 = 最終機台.map(m => m.機台編號);
    const 新主機台 = 新清單[0] || '';
    const 新區域 = 去重_(最終機台.map(m => m.區域).filter(Boolean));
    const 新明細 = 最終機台.map(m => ({
      機台編號: m.機台編號,
      設備名稱: m.設備名稱 || m.機台名稱 || '',
      區域: m.區域 || '',
      機台型號: m.機台型號 || m.型號 || '',
      工站名稱: 工站名稱,
      工序: 工序清單.join(',')
    }));

    const 原正規 = 原清單.join('、');
    const 新正規 = 新清單.join('、');
    const 是否異動 = 原正規 !== 新正規 || 原主機台 !== 新主機台;
    if (是否異動) 修復筆數++; else 原本正常筆數++;

    報告.push([
      r + 1,
      obj['群組ID'] || obj['關聯編號'] || '',
      產品編號,
      客戶品號,
      品名,
      工站名稱,
      工序清單.join('、'),
      原機台文字,
      原主機台,
      新清單.join('、'),
      新主機台,
      新區域.join('、'),
      狀態,
      說明,
      new Date()
    ]);

    更新值.push({
      rowIndex: r + 1,
      機台編號清單: 新清單.join('、'),
      主機台: 新主機台,
      區域清單: 新區域.join('、'),
      是否多機台: 新清單.length > 1 ? '是' : '否',
      機台明細JSON: JSON.stringify(新明細)
    });
  }

  寫回08機台欄位_(主表, col, 更新值);
  寫入機台修復報告_(ss, 報告);

  const result = {
    成功: true,
    總資料筆數: data.length - 1,
    修復筆數,
    原本正常筆數,
    找不到筆數,
    說明: '機台編號已依 03_機台主檔 + 04_工站機台關聯 重新寫回為純文字，分隔符號改為「、」，避免 Google Sheets 誤判數字。',
    測試時間: new Date()
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function 檢核_08工站途程機台主檔_機台編號() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const 主表 = 取得表_(ss, 修復08設定.主檔);
  const 機台主檔列 = 讀表物件_(ss, 修復08設定.機台主檔);
  const 機台索引 = 建立正式機台索引_(機台主檔列);
  const rows = 讀表物件_(ss, 修復08設定.主檔);

  const bad = [];
  rows.forEach((r, idx) => {
    const list = 解析機台清單_寬鬆_(r['機台編號清單'] || '', 機台索引);
    const raw = String(r['機台編號清單'] || '');
    const 疑似被格式化 = /\d{1,3},\d{3},\d{3}/.test(raw) || raw.includes(',') && !raw.includes('、');
    const 不在主檔 = list.filter(no => !機台索引[標準鍵_(no)]);
    if (疑似被格式化 || 不在主檔.length) {
      bad.push({列號: idx + 2, 品名: r['品名'], 工站: r['報工工站名稱'] || r['工站名稱'], 原值: raw, 解析後: list.join('、'), 不在主檔: 不在主檔.join('、')});
    }
  });

  const result = {
    成功: bad.length === 0,
    總筆數: rows.length,
    異常筆數: bad.length,
    前20筆異常: bad.slice(0, 20),
    測試時間: new Date()
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function 寫回08機台欄位_(sh, col, updates) {
  const map = {
    機台編號清單: col['機台編號清單'],
    主機台: col['主機台'],
    區域清單: col['區域清單'],
    是否多機台: col['是否多機台'],
    機台明細JSON: col['機台明細JSON']
  };
  Object.keys(map).forEach(k => {
    if (map[k] != null) sh.getRange(2, map[k] + 1, Math.max(sh.getLastRow() - 1, 1), 1).setNumberFormat('@');
  });
  updates.forEach(u => {
    Object.keys(map).forEach(k => {
      if (map[k] != null) sh.getRange(u.rowIndex, map[k] + 1).setValue("'" + String(u[k] || ''));
    });
  });
}

function 寫入機台修復報告_(ss, rows) {
  const name = 修復08設定.報告;
  let sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  const header = ['列號','群組ID','產品編號','客戶品號','品名','報工工站名稱','工序清單','原機台編號清單','原主機台','新機台編號清單','新主機台','新區域清單','狀態','說明','修復時間'];
  sh.getRange(1,1,1,header.length).setValues([header]);
  if (rows.length) sh.getRange(2,1,rows.length,header.length).setValues(rows);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, header.length);
}

function 建立正式機台索引_(rows) {
  const idx = {};
  rows.forEach(r => {
    const no = 取值_(r, ['機台編號','機台號','機台','設備編號','編號']);
    if (!no) return;
    const key = 標準鍵_(no);
    idx[key] = {
      機台編號: String(no).trim(),
      區域: 取值_(r, ['區域','廠區','位置']),
      設備名稱: 取值_(r, ['設備名稱','機台名稱','名稱']),
      機台名稱: 取值_(r, ['機台名稱','設備名稱','名稱']),
      機台型號: 取值_(r, ['機台型號','型號','設備型號']),
      型號: 取值_(r, ['型號','機台型號','設備型號'])
    };
  });
  return idx;
}

function 整理工站機台關聯列_(rows, 機台索引) {
  return rows.map(r => {
    const no = 取值_(r, ['機台編號','機台','設備編號']);
    const base = 機台索引[標準鍵_(no)] || {};
    return {
      產品編號: 取值_(r, ['產品編號','料號','產品料號']),
      客戶品號: 取值_(r, ['客戶品號','客戶料號']),
      品名: 取值_(r, ['品名','產品名稱']),
      工站名稱: 取值_(r, ['工站名稱','工站','報工工站名稱']),
      工序: 取值_(r, ['工序','OP','製程']),
      機台編號: base.機台編號 || String(no || '').trim(),
      區域: base.區域 || 取值_(r, ['區域','廠區']),
      設備名稱: base.設備名稱 || 取值_(r, ['設備名稱','機台名稱']),
      機台型號: base.機台型號 || 取值_(r, ['機台型號','型號'])
    };
  }).filter(r => r.機台編號 && 機台索引[標準鍵_(r.機台編號)]);
}

function 依關聯找正式機台_(rows, q, 機台索引) {
  const opSet = {};
  (q.工序清單 || []).forEach(op => opSet[標準鍵_(op)] = true);
  const matches = rows.filter(r => {
    const sameProduct =
      (q.產品編號 && 標準鍵_(r.產品編號) === 標準鍵_(q.產品編號)) ||
      (q.客戶品號 && 標準鍵_(r.客戶品號) === 標準鍵_(q.客戶品號)) ||
      (q.品名 && 標準鍵_(r.品名) === 標準鍵_(q.品名));
    if (!sameProduct) return false;
    const opHit = r.工序 && opSet[標準鍵_(r.工序)];
    const stationHit = q.工站名稱 && 標準鍵_(r.工站名稱) === 標準鍵_(q.工站名稱);
    return opHit || stationHit;
  });
  const out = [];
  const seen = {};
  matches.forEach(m => {
    const base = 機台索引[標準鍵_(m.機台編號)];
    if (!base) return;
    const key = 標準鍵_(base.機台編號);
    if (seen[key]) return;
    seen[key] = true;
    out.push({
      機台編號: base.機台編號,
      區域: base.區域 || m.區域 || '',
      設備名稱: base.設備名稱 || m.設備名稱 || '',
      機台型號: base.機台型號 || m.機台型號 || ''
    });
  });
  return out;
}

function 解析工序清單_(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const parts = raw.split(/[、,，;；\s]+/).filter(Boolean);
  const out = [];
  parts.forEach(p => {
    const range = p.match(/^OP(\d+)\s*[~～\-]\s*OP?(\d+)$/i);
    if (range) {
      const a = Number(range[1]), b = Number(range[2]);
      const step = Math.abs(b - a) >= 10 ? 10 : 1;
      for (let n = a; n <= b; n += step) out.push('OP' + String(n).padStart(3, '0'));
    } else {
      const op = p.match(/OP\s*(\d+)/i);
      out.push(op ? 'OP' + String(Number(op[1])).padStart(3, '0') : p);
    }
  });
  return 去重_(out);
}

function 解析機台清單_寬鬆_(text, 機台索引) {
  let raw = String(text || '').trim();
  if (!raw) return [];
  raw = raw.replace(/^'/, '');

  // 正常分隔優先：1064、1083、1073
  if (/[、;；]/.test(raw)) {
    return 去重_(raw.split(/[、;；]/).map(s => s.trim()).filter(Boolean).filter(no => 機台索引[標準鍵_(no)]));
  }

  // 若還有逗號，先嘗試當正常逗號清單；若項目不在主檔，再視為被格式化數字。
  if (raw.includes(',')) {
    const direct = raw.split(',').map(s => s.trim()).filter(Boolean).filter(no => 機台索引[標準鍵_(no)]);
    if (direct.length) return 去重_(direct.map(no => 機台索引[標準鍵_(no)].機台編號));
  }

  const digits = raw.replace(/\D/g, '');
  const candidates = Object.keys(機台索引).map(k => 機台索引[k].機台編號).sort((a,b) => String(b).length - String(a).length);
  const found = [];
  let rest = digits;
  candidates.forEach(no => {
    const n = String(no);
    if (rest.includes(n)) {
      found.push(no);
      rest = rest.replace(n, '');
    }
  });
  return 去重_(found);
}

function 補欄位格式為純文字_(sh, header, fields) {
  const col = 建立欄位索引_(header);
  fields.forEach(f => {
    if (col[f] != null) sh.getRange(1, col[f] + 1, Math.max(sh.getLastRow(), 1), 1).setNumberFormat('@');
  });
}

function 取得表_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('找不到工作表：' + name);
  return sh;
}
function 讀表物件_(ss, name) {
  const sh = 取得表_(ss, name);
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const header = values[0].map(v => String(v || '').trim());
  return values.slice(1).map((row, i) => {
    const o = { _列號: i + 2 };
    header.forEach((h, c) => { if (h) o[h] = String(row[c] || '').trim(); });
    return o;
  }).filter(o => Object.keys(o).some(k => k !== '_列號' && String(o[k] || '').trim() !== ''));
}
function 建立欄位索引_(header) { const out = {}; header.forEach((h,i) => { if (h) out[h] = i; }); return out; }
function 取值_(obj, names) { for (let i=0;i<names.length;i++){ const k=names[i]; if (obj[k] != null && String(obj[k]).trim() !== '') return String(obj[k]).trim(); } return ''; }
function 標準鍵_(v) { return String(v || '').trim().replace(/^'/,'').replace(/\.0$/,'').toUpperCase(); }
function 去重_(arr) { const s = {}; const out = []; (arr || []).forEach(v => { v = String(v || '').trim(); if (v && !s[v]) { s[v] = true; out.push(v); } }); return out; }
