/**
 * v2.5.0 素材庫存查詢與低庫存推播工具
 * 用途：查詢共用素材庫存、低於安全庫存警示、LINE 素材庫存/低庫存圖卡。
 * 使用方式：與 v2_4_共用素材主檔到貨與鎖料歷史工具.gs 放同一個 Apps Script 專案。
 */

function 取得_v2_5_共用素材庫存摘要() {
  const list = 表格轉物件_('10_共用素材主檔');
  const 啟用 = list.filter(x => String(x['狀態'] || '啟用') !== '停用');
  const 低庫存 = 啟用.filter(x => Number(x['目前庫存'] || 0) <= Number(x['安全庫存'] || 0));
  const 缺安全庫存 = 啟用.filter(x => x['安全庫存'] === '' || x['安全庫存'] === undefined);
  const 可分配不足 = 啟用.filter(x => Number(x['可分配數量'] || 0) <= 0);
  return {
    成功: true,
    版本: 'v2.5.0',
    統計: {
      素材總數: 啟用.length,
      低庫存數: 低庫存.length,
      缺安全庫存數: 缺安全庫存.length,
      可分配不足數: 可分配不足.length
    },
    低庫存,
    缺安全庫存,
    可分配不足
  };
}

function 查詢_v2_5_共用素材庫存(關鍵字) {
  const q = String(關鍵字 || '').trim().toLowerCase();
  const list = 表格轉物件_('10_共用素材主檔');
  const result = list.filter(x => {
    const text = `${x['共用素材編號'] || ''} ${x['共用素材名稱'] || ''} ${x['素材分類'] || ''} ${x['主要供應商'] || ''}`.toLowerCase();
    return !q || text.indexOf(q) >= 0;
  });
  return { 成功: true, 版本: 'v2.5.0', 查詢: 關鍵字, 筆數: result.length, 資料: result.slice(0, 30) };
}

function 產生LINE_素材庫存文字_(關鍵字) {
  const r = 查詢_v2_5_共用素材庫存(關鍵字);
  if (!r.資料.length) return `📦 素材庫存查詢\n查詢：${關鍵字 || '全部'}\n找不到資料。`;
  const top = r.資料.slice(0, 8).map((x, i) => `${i + 1}. ${x['共用素材編號']}｜${x['共用素材名稱']}｜庫存 ${x['目前庫存'] || 0}｜可分配 ${x['可分配數量'] || 0}`).join('\n');
  return `📦 素材庫存查詢\n查詢：${關鍵字 || '全部'}\n筆數：${r.筆數}\n\n${top}`;
}

function 產生LINE_低庫存文字_() {
  const s = 取得_v2_5_共用素材庫存摘要();
  const top = (s.低庫存 || []).slice(0, 10).map((x, i) => `${i + 1}. ${x['共用素材編號']}｜${x['共用素材名稱']}｜庫存 ${x['目前庫存'] || 0} / 安全 ${x['安全庫存'] || 0}`).join('\n') || '目前沒有低庫存素材。';
  return `⚠️ 共用素材低庫存\n素材總數：${s.統計.素材總數}\n低庫存：${s.統計.低庫存數}\n缺安全庫存：${s.統計.缺安全庫存數}\n可分配不足：${s.統計.可分配不足數}\n\n${top}`;
}

function 產生LINE_低庫存Flex_() {
  const s = 取得_v2_5_共用素材庫存摘要();
  const top = (s.低庫存 || []).slice(0, 6);
  return {
    type: 'flex',
    altText: '共用素材低庫存圖卡',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#b45309',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: '共用素材低庫存', weight: 'bold', size: 'lg', color: '#ffffff' },
          { type: 'text', text: '安全庫存 / 可分配量警示', size: 'sm', color: '#fef3c7', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          v2_5_LINE數字列_('素材總數', s.統計.素材總數, '#0f766e'),
          v2_5_LINE數字列_('低庫存', s.統計.低庫存數, '#dc2626'),
          v2_5_LINE數字列_('缺安全庫存', s.統計.缺安全庫存數, '#ca8a04'),
          v2_5_LINE數字列_('可分配不足', s.統計.可分配不足數, '#be123c'),
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '低庫存 TOP', weight: 'bold', size: 'sm', color: '#92400e', margin: 'md' },
          ...top.map(x => ({ type: 'text', text: `${x['共用素材編號']}｜${x['共用素材名稱']}｜${x['目前庫存'] || 0}/${x['安全庫存'] || 0}`, size: 'xs', color: '#334155', wrap: true }))
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', color: '#b45309', action: { type: 'uri', label: '開啟素材主檔', uri: 'https://qhero70.github.io/smart-factory-worker-app/material-master.html' } },
          { type: 'button', style: 'secondary', action: { type: 'uri', label: '開啟到貨鎖料', uri: 'https://qhero70.github.io/smart-factory-worker-app/material-arrival.html' } }
        ]
      }
    }
  };
}

function v2_5_LINE數字列_(標籤, 數值, 顏色) {
  return { type: 'box', layout: 'horizontal', contents: [
    { type: 'text', text: 標籤, size: 'sm', color: '#475569', flex: 3 },
    { type: 'text', text: String(數值 || 0), size: 'md', weight: 'bold', color: 顏色 || '#0f766e', align: 'end', flex: 2 }
  ] };
}

function 產生LINE回覆訊息_v2_5_(文字) {
  const t = String(文字 || '').trim();
  if (t === '低庫存' || t === '低庫存圖卡') return [產生LINE_低庫存Flex_()];
  if (t.indexOf('素材庫存') === 0) {
    const q = t.replace('素材庫存', '').trim();
    return [{ type: 'text', text: 產生LINE_素材庫存文字_(q) }];
  }
  if (t === '素材低庫存') return [{ type: 'text', text: 產生LINE_低庫存文字_() }];
  return 產生LINE回覆訊息_v2_4_(文字);
}

function 測試_v2_5_LINE低庫存圖卡() {
  return JSON.stringify(產生LINE_低庫存Flex_(), null, 2);
}
