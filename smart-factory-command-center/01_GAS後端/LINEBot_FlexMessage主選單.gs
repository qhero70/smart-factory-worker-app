/**
 * 智慧製造中央作戰指揮中心｜LINE Bot Flex Message 主選單
 * 版本：v1.9.0
 * 說明：此檔需與「智慧製造中央作戰指揮中心.gs」放在同一個 Apps Script 專案。
 * 注意：若主後端已有 處理LINEWebhook_，請將其中的文字判斷改用 本檔的 產生LINE回覆訊息_(文字)。
 */

const LINE前端網址設定 = {
  GitHubPages根網址: 'https://qhero70.github.io/smart-factory-worker-app',
  行動戰情室: 'https://qhero70.github.io/smart-factory-worker-app/app.html',
  資料管理: 'https://qhero70.github.io/smart-factory-worker-app/data.html',
  計畫清洗: 'https://qhero70.github.io/smart-factory-worker-app/plan.html',
  排程看板: 'https://qhero70.github.io/smart-factory-worker-app/schedule.html',
  缺漏補齊: 'https://qhero70.github.io/smart-factory-worker-app/repair.html',
  主管摘要: 'https://qhero70.github.io/smart-factory-worker-app/meeting.html'
};

function 產生LINE回覆訊息_(文字) {
  const t = String(文字 || '').trim();
  if (t === '選單' || t === '主選單' || t === '功能' || t === '入口') {
    return [產生LINE主選單Flex_()];
  }
  if (t.includes('戰情') || t.includes('狀況')) {
    return [{ type: 'text', text: 產生LINE戰情文字_() }];
  }
  if (t.toUpperCase().includes('AI') || t.includes('摘要')) {
    return [{ type: 'text', text: 產生LINEAI摘要文字_() }];
  }
  return [
    { type: 'text', text: '🏭 智慧製造中央作戰指揮中心\n可輸入：選單、戰情、AI摘要。' },
    產生LINE主選單Flex_()
  ];
}

function 產生LINE主選單Flex_() {
  return {
    type: 'flex',
    altText: '智慧製造中央作戰指揮中心主選單',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        backgroundColor: '#0f766e',
        contents: [
          { type: 'text', text: '智慧製造中央作戰指揮中心', weight: 'bold', size: 'lg', color: '#ffffff' },
          { type: 'text', text: '製造部單一 LINE Bot 入口', size: 'sm', color: '#ccfbf1', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          產生LINE區塊標題_('即時查詢'),
          產生LINE雙按鈕列_('今日戰情', '戰情', 'AI摘要', 'AI摘要'),
          產生LINE區塊標題_('現場系統'),
          產生LINE網址按鈕_('行動戰情室', LINE前端網址設定.行動戰情室, '#14b8a6'),
          產生LINE網址按鈕_('排程看板', LINE前端網址設定.排程看板, '#a78bfa'),
          產生LINE網址按鈕_('資料管理', LINE前端網址設定.資料管理, '#fbbf24'),
          產生LINE網址按鈕_('計畫清洗', LINE前端網址設定.計畫清洗, '#bef264'),
          產生LINE網址按鈕_('缺漏補齊', LINE前端網址設定.缺漏補齊, '#f0abfc'),
          產生LINE網址按鈕_('主管摘要', LINE前端網址設定.主管摘要, '#fdba74')
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '輸入「選單」可再次開啟此入口', size: 'xs', color: '#64748b', align: 'center' }
        ]
      }
    }
  };
}

function 產生LINE區塊標題_(文字) {
  return { type: 'text', text: 文字, weight: 'bold', size: 'sm', color: '#0f766e', margin: 'md' };
}

function 產生LINE網址按鈕_(標籤, 網址, 顏色) {
  return {
    type: 'button',
    style: 'primary',
    color: 顏色 || '#0f766e',
    height: 'sm',
    action: { type: 'uri', label: 標籤, uri: 網址 }
  };
}

function 產生LINE雙按鈕列_(左標籤, 左文字, 右標籤, 右文字) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [
      { type: 'button', style: 'primary', color: '#0f766e', height: 'sm', action: { type: 'message', label: 左標籤, text: 左文字 } },
      { type: 'button', style: 'secondary', height: 'sm', action: { type: 'message', label: 右標籤, text: 右文字 } }
    ]
  };
}

function 產生LINE戰情文字_() {
  const x = 取得KPI戰情_();
  return `📊 智慧製造戰情\n作業日：${x.作業日}\n總計畫：${x.KPI.總計畫}\n總完成：${x.KPI.總完成}\n達成率：${x.KPI.達成率}%\n不良率：${x.KPI.不良率}%\n停機：${x.KPI.今日停機分鐘} 分鐘\n逾期警示：${x.KPI.逾期工單數} 筆`;
}

function 產生LINEAI摘要文字_() {
  const x = 產生AI摘要_();
  return `🤖 AI摘要\n風險：${x.風險等級}\n${x.摘要}\n建議：\n${(x.建議 || []).join('\n')}`;
}

function 回覆LINE訊息陣列_(replyToken, messages) {
  if (!系統設定.LINE_CHANNEL_ACCESS_TOKEN) return { 成功: false, 訊息: '尚未設定 LINE_CHANNEL_ACCESS_TOKEN' };
  const payload = { replyToken, messages: messages.slice(0, 5) };
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + 系統設定.LINE_CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  return { 成功: true, 狀態碼: res.getResponseCode(), 回應: res.getContentText() };
}

function 測試_LINE主選單FlexJSON() {
  return JSON.stringify(產生LINE主選單Flex_(), null, 2);
}

function 測試_LINE文字回覆陣列() {
  return 產生LINE回覆訊息_('選單');
}
