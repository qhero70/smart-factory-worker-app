/**
 * v2.3.0 LINE CTB Flex 圖卡
 * 用途：LINE 輸入「CTB圖卡」「缺料圖卡」時，回傳 CTB 缺料視覺化 Flex Message。
 * 使用方式：與 LINEBot_FlexMessage主選單.gs、v2_2_LINE排程摘要指令.gs 放同一個 Apps Script 專案。
 */

function 產生LINE_CTB缺料Flex_() {
  const list = 表格轉物件_('10_排程需求池').filter(x => String(x['狀態'] || '待排程') !== '完成');
  const 紅燈 = list.filter(x => LINE_v2_2_CTB燈號_(x) === '紅燈缺料');
  const 黃燈 = list.filter(x => LINE_v2_2_CTB燈號_(x) === '黃燈待確認');
  const 綠燈 = list.filter(x => LINE_v2_2_CTB燈號_(x) === '綠燈可投產');
  const 白燈 = list.filter(x => LINE_v2_2_CTB燈號_(x) === '白燈禁止提前');
  const 尚缺 = 紅燈.reduce((s, x) => s + Number(x['尚缺數量'] || 0), 0);
  const top = 紅燈.slice(0, 5);

  return {
    type: 'flex',
    altText: 'CTB缺料摘要圖卡',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#991b1b',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'CTB 齊套缺料看板', weight: 'bold', size: 'lg', color: '#ffffff' },
          { type: 'text', text: '紅燈缺料 / 共用素材 / 禁止投產', size: 'sm', color: '#fecaca', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          產生LINE_CTB數字列_('紅燈缺料', 紅燈.length, '#dc2626'),
          產生LINE_CTB數字列_('黃燈待確認', 黃燈.length, '#ca8a04'),
          產生LINE_CTB數字列_('綠燈可投產', 綠燈.length, '#16a34a'),
          產生LINE_CTB數字列_('白燈禁止提前', 白燈.length, '#64748b'),
          產生LINE_CTB數字列_('尚缺數量', 尚缺, '#b91c1c'),
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '紅燈 TOP', weight: 'bold', size: 'sm', color: '#991b1b', margin: 'md' },
          ...top.map(x => ({
            type: 'text',
            text: `${x['產品編號'] || ''}｜${x['品名'] || ''}｜缺 ${x['尚缺數量'] || 0}`,
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
          { type: 'button', style: 'primary', color: '#dc2626', action: { type: 'uri', label: '開啟CTB缺料看板', uri: 'https://qhero70.github.io/smart-factory-worker-app/ctb.html' } },
          { type: 'button', style: 'secondary', action: { type: 'uri', label: '開啟鎖料模擬', uri: 'https://qhero70.github.io/smart-factory-worker-app/material-lock.html' } }
        ]
      }
    }
  };
}

function 產生LINE_CTB數字列_(標籤, 數值, 顏色) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: 標籤, size: 'sm', color: '#475569', flex: 3 },
      { type: 'text', text: String(數值), size: 'md', weight: 'bold', color: 顏色 || '#0f766e', align: 'end', flex: 2 }
    ]
  };
}

function 產生LINE回覆訊息_v2_3_(文字) {
  const t = String(文字 || '').trim();
  if (t === 'CTB圖卡' || t === '缺料圖卡' || t === '齊套圖卡') return [產生LINE_CTB缺料Flex_()];
  if (t === '鎖料' || t === '鎖料模擬') {
    return [{ type: 'text', text: '🔒 請開啟鎖料模擬看板，輸入共用素材編號與到貨數量。\nhttps://qhero70.github.io/smart-factory-worker-app/material-lock.html' }];
  }
  return 產生LINE回覆訊息_v2_2_(文字);
}

function 測試_v2_3_LINE_CTB圖卡() {
  return JSON.stringify(產生LINE_CTB缺料Flex_(), null, 2);
}
