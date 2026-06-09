/**
 * 報工作業V2 後端
 * 版本：v1.5.5｜GAS HTML 入口版
 * 對應前端：07_報工作業V2.html
 *
 * 說明：
 * 1. 本檔不可宣告 doGet / doPost。
 * 2. 本檔提供 GAS HTML 前端 google.script.run 呼叫。
 * 3. 前端呼叫：取得報工作業v2初始資料()、寫入報工作業v2(data)。
 */

function 取得報工作業v2初始資料() {
  const 人員 = 轉報工V2人員_(表格轉物件_('01_人員主檔'));
  const 產品 = 表格轉物件_('02_產品主檔');
  const 機台 = 表格轉物件_('03_機台主檔');
  const 工站 = 表格轉物件_('04_工站主檔');
  const 共用 = 表格轉物件_('05_共用資料');
  const 報工工站群組 = 建立報工作業V2工站群組_(產品, 工站, 機台);
  const 班別清單 = 建立共用清單_(共用, '班別', ['自動判斷', '早班', '中班', '大夜班', '加班']);
  const 異常類型 = 建立共用清單_(共用, '停機原因', ['無異常 / Normal', '機台停機 / Machine Down', '待料 / Waiting Material', '換刀 / Tool Change', '品質確認 / Quality Check', '其他 / Others']);
  const 不良原因 = 建立不良原因清單V2_(共用);

  return {
    成功: true,
    版本: 'v1.5.5_GAS_HTML報工作業V2入口版',
    作業日: 取得作業日_(),
    人員,
    報工工站群組,
    途程工站群組: 報工工站群組,
    班別清單,
    不良原因,
    異常類型,
    筆數: {
      人員: 人員.length,
      報工工站群組: 報工工站群組.length,
      產品: 產品.length,
      工站機台關聯: 機台.length,
      照片索引: 0
    }
  };
}

function 寫入報工作業v2(data) {
  data = data || {};
  const 總數 = Number(data.今日共做數 || 0);
  const 不良數 = Number(data.不良數 || 0);
  const 良品數 = Number(data.實際良品數 || Math.max(總數 - 不良數, 0));

  if (!data.工號) throw new Error('請選擇作業員');
  if (!data.產品編號 && !data.品名) throw new Error('請選擇產品');
  if (!data.報工工站名稱 && !data.工站名稱) throw new Error('請選擇報工工站');
  if (總數 <= 0) throw new Error('今日共做數必須大於 0');
  if (不良數 < 0) throw new Error('不良數不可小於 0');
  if (不良數 > 總數) throw new Error('不良數不可大於今日共做數');

  const 報工編號 = 產生流水號_('RFV2');
  const 報工資料 = {
    報工編號,
    作業日: 取得作業日_(),
    工號: data.工號 || '',
    姓名: data.姓名 || '',
    班別: data.班別 && data.班別 !== '自動判斷' ? data.班別 : 判斷化新班別_(),
    區域: 取主機台區域V2_(data) || '',
    機台編號: data.主機台 || data.機台清單 || '',
    產品編號: data.產品編號 || '',
    品名: data.品名 || '',
    工站名稱: data.報工工站名稱 || data.工站名稱 || '',
    工單編號: data.工單編號 || '',
    良品數,
    不良數,
    停機分鐘: Number(data.停機分鐘 || 0),
    停機原因: data.異常類型 || '',
    換刀次數: data.異常類型 && String(data.異常類型).includes('換刀') ? 1 : 0,
    備註: 組合報工作業V2備註_(data),
    來源: 'GAS_HTML_07_報工作業V2'
  };

  const 寫入結果 = 寫入報工作業v2_化新班別版(報工資料);

  if (不良數 > 0 || data.不良代碼 || data.不良原因) {
    try {
      新增不良_({
        作業日: 報工資料.作業日,
        工號: 報工資料.工號,
        姓名: 報工資料.姓名,
        產品編號: 報工資料.產品編號,
        品名: 報工資料.品名,
        機台編號: 報工資料.機台編號,
        工單編號: 報工資料.工單編號,
        不良代碼: data.不良代碼 || '',
        不良名稱: data.不良原因 || '',
        不良數量: 不良數,
        責任歸屬: data.不良類別 || '',
        說明: data.備註 || '',
        照片網址: ''
      });
    } catch (e) {}
  }

  記錄操作_('報工作業V2', '寫入報工', 報工編號, '完成', JSON.stringify({ 工號: 報工資料.工號, 產品編號: 報工資料.產品編號, 良品數, 不良數 }));

  return {
    成功: true,
    訊息: '報工作業V2寫入完成',
    報工編號,
    作業日: 報工資料.作業日,
    班別: 報工資料.班別,
    良品數,
    不良數,
    寫入結果
  };
}

function 建立報工作業V2工站群組_(產品, 工站, 機台) {
  const 產品Map = {};
  產品.forEach(p => {
    const key = String(p['產品編號'] || '').trim();
    if (key) 產品Map[key] = p;
  });

  return 工站.filter(g => String(g['啟用'] || '是') !== '否').map(g => {
    const pid = String(g['產品編號'] || '').trim();
    const p = 產品Map[pid] || {};
    const 機台清單 = 拆字串V2_(g['機台編號清單']).map(id => {
      const m = 機台.find(x => String(x['機台編號'] || '').trim() === String(id).trim()) || {};
      return {
        機台編號: id,
        區域: m['區域'] || '',
        機台型號: m['型號'] || '',
        設備名稱: m['機台名稱'] || '',
        照片網址: m['照片網址'] || '',
        縮圖網址: m['縮圖網址'] || ''
      };
    });

    return {
      產品編號: pid,
      客戶品號: p['客戶品號'] || '',
      品名: p['品名'] || g['品名'] || '',
      產品照片網址: p['產品照片網址'] || p['照片網址'] || '',
      產品縮圖網址: p['產品縮圖網址'] || p['縮圖網址'] || '',
      產品照片檔案ID: p['產品照片檔案ID'] || '',
      工站名稱: g['工站名稱'] || '',
      報工工站名稱: g['工站名稱'] || '',
      工序: g['工站代碼'] || '',
      工序範圍: g['工站代碼'] || '',
      工序清單: g['工站代碼'] ? [g['工站代碼']] : [],
      標準產能: g['標準產能_班'] || p['標準產能_班'] || p['8小時標準產能'] || '',
      標準工時_秒: p['標準工時_秒'] || '',
      機台清單,
      主機台: 機台清單[0] ? 機台清單[0].機台編號 : '',
      顯示名稱: [g['工站名稱'], g['工站代碼'], 機台清單.map(m => m.機台編號).join('、')].filter(Boolean).join('｜')
    };
  });
}

function 轉報工V2人員_(rows) {
  return rows.map(r => ({
    工號: r['工號'] || '',
    姓名: r['姓名'] || '',
    部門: r['部門'] || '',
    組別: r['組別'] || '',
    職稱: r['職稱'] || '',
    班別: r['班別'] || '',
    啟用: r['啟用'] || '是',
    照片網址: r['照片網址'] || '',
    縮圖網址: r['縮圖網址'] || '',
    Google檔案ID: r['Google檔案ID'] || ''
  }));
}

function 建立共用清單_(共用, 類型, 預設) {
  const list = 共用.filter(x => String(x['資料類型'] || '') === 類型 && String(x['啟用'] || '是') !== '否')
    .sort((a, b) => Number(a['排序'] || 999) - Number(b['排序'] || 999))
    .map(x => ({ 名稱: x['名稱'] || x['代碼'], 值: x['名稱'] || x['代碼'] }));
  if (list.length) return list;
  return 預設.map(x => ({ 名稱: x, 值: x }));
}

function 建立不良原因清單V2_(共用) {
  const z = [], y = [];
  共用.forEach(x => {
    const type = String(x['資料類型'] || '');
    const code = String(x['代碼'] || '');
    const item = { 代碼: code, 名稱: x['名稱'] || code };
    if (type.includes('不良') || code) {
      if (code.toUpperCase().startsWith('Z')) z.push(item);
      if (code.toUpperCase().startsWith('Y')) y.push(item);
    }
  });
  return {
    Z: z.length ? z : [{ 代碼: 'Z01', 名稱: '素材/外觀不良' }],
    Y: y.length ? y : [{ 代碼: 'Y01', 名稱: '加工/尺寸不良' }]
  };
}

function 拆字串V2_(s) {
  return String(s || '').split(/[,，、\s]+/).map(x => x.trim()).filter(Boolean);
}

function 取主機台區域V2_(data) {
  const 主機台 = String(data.主機台 || '').trim();
  const list = Array.isArray(data.機台照片清單) ? data.機台照片清單 : [];
  const m = list.find(x => String(x.機台編號 || '') === 主機台) || list[0] || {};
  return m.區域 || '';
}

function 組合報工作業V2備註_(data) {
  const lines = [];
  if (data.是否加班) lines.push('是否加班：' + data.是否加班);
  if (data.加班類型 && data.加班類型 !== '無') lines.push('加班類型：' + data.加班類型);
  if (data.今日共做數 !== undefined) lines.push('今日共做數：' + data.今日共做數);
  if (data.實際工時) lines.push('實際工時：' + data.實際工時);
  if (data.不良類別 && data.不良類別 !== '無') lines.push('不良類別：' + data.不良類別);
  if (data.不良原因) lines.push('不良原因：' + data.不良原因);
  if (data.異常類型) lines.push('異常類型：' + data.異常類型);
  if (data.現場照片清單 && data.現場照片清單.length) lines.push('現場照片：' + data.現場照片清單.length + ' 張');
  if (data.備註) lines.push('備註：' + data.備註);
  return lines.join('\n');
}
