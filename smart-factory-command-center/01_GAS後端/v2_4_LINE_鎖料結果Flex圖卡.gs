/**
 * v2.4.0 LINE 鎖料結果 Flex 圖卡
 * 用途：把共用素材鎖料模擬結果轉成 LINE Flex Message。
 * 使用方式：與 v2_3_共用素材鎖料模擬工具.gs 放同一個 Apps Script 專案。
 */

function 產生LINE_鎖料結果Flex_(共用素材編號, 到貨數量) {
  const result = 模擬_v2_3_共用素材鎖料分配(共用素材編號, 到貨數量);
  const rows = result.結果 || [];
  const 已滿足 = rows.filter(x => x.分配狀態 === '已滿足').length;
  const 部分滿足 = rows.filter(x => x.分配狀態 === '部分滿足').length;
  const 未分配 = rows.filter(x => x.分配狀態 === '未分配').length;
  const 分配量 = rows.reduce((s, x) => s + Number(x.本次分配數量 || 0), 0);
  const top = rows.slice(0, 6);

  return {
    type: 'flex',
    altText: '共用素材鎖料分配結果',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#be123c',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: '共用素材鎖料結果', weight: 'bold', size: 'lg', color: '#ffffff' },
          { type: 'text', text: `${共用素材編號}｜到貨 ${到貨數量}`, size: 'sm', color: '#ffe4e6', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          v2_4_LINE數字列_('本次分配', 分配量, '#be123c'),
          v2_4_LINE數字列_('剩餘未分配', result.剩餘未分配, '#64748b'),
          v2_4_LINE數字列_('已滿足', 已滿足, '#16a34a'),
          v2_4_LINE數字列_('部分滿足', 部分滿足, '#ca8a04'),
          v2_4_LINE數字列_('未分配', 未分配, '#dc2626'),
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '分配順序 TOP', weight: 'bold', size: 'sm', color: '#be123c', margin: 'md' },
          ...top.map(x => ({
            type: 'text',
            text: `${x.需求編號 || ''}｜${x.Tier等級 || ''}｜分配 ${x.本次分配數量 || 0}｜${x.分配狀態 || ''}`,
            size: 'xs',
            color: '#334155',
            wrap: true
          }))
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', color: '#be123c', action: { type: 'uri', label: '開啟鎖料模擬', uri: 'https://qhero70.github.io/smart-factory-worker-app/material-lock.html' } },
          { type: 'button', style: 'secondary', action: { type: 'uri', label: '開啟到貨鎖料', uri: 'https://qhero70.github.io/smart-factory-worker-app/material-arrival.html' } }
        ]
      }
    }
  };
}

function v2_4_LINE數字列_(標籤, 數值, 顏色) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: 標籤, size: 'sm', color: '#475569', flex: 3 },
      { type: 'text', text: String(數值 || 0), size: 'md', weight: 'bold', color: 顏色 || '#0f766e', align: 'end', flex: 2 }
    ]
  };
}

function 產生LINE回覆訊息_v2_4_(文字) {
  const t = String(文字 || '').trim();
  if (t.indexOf('鎖料圖卡') === 0) {
    const parts = t.split(/\s+/);
    const partNo = parts[1] || '';
    const qty = Number(parts[2] || 0);
    if (!partNo || !qty) return [{ type: 'text', text: '請輸入：鎖料圖卡 共用素材編號 到貨數量\n例如：鎖料圖卡 A801910008 500' }];
    return [產生LINE_鎖料結果Flex_(partNo, qty)];
  }
  if (t === '到貨鎖料' || t === '素材到貨') {
    return [{ type: 'text', text: '📦 請開啟共用素材到貨與鎖料套用頁：\nhttps://qhero70.github.io/smart-factory-worker-app/material-arrival.html' }];
  }
  return 產生LINE回覆訊息_v2_3_(文字);
}

function 測試_v2_4_LINE鎖料結果圖卡() {
  return JSON.stringify(產生LINE_鎖料結果Flex_('A801910008', 500), null, 2);
}
