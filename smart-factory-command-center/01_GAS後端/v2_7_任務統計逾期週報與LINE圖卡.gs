/**
 * v2.7.0 任務統計、逾期警示、週報與 LINE 任務摘要 Flex 圖卡
 * 用途：將 10_跨部門待辦任務 轉成主管可追蹤的統計、逾期、週報與 LINE 圖卡。
 * 使用方式：與 v2_6_低庫存任務與三方待辦工具.gs 放同一個 Apps Script 專案。
 */

function 取得_v2_7_任務統計儀表板資料() {
  const list = 表格轉物件_('10_跨部門待辦任務');
  const 未完成 = list.filter(x => String(x['任務狀態'] || '') !== '完成');
  const 完成 = list.filter(x => String(x['任務狀態'] || '') === '完成');
  const 逾期 = 未完成.filter(x => v2_7_是否逾期_(x));
  const 即將逾期 = 未完成.filter(x => {
    const d = v2_7_日期差_(x['最晚採購日']);
    return d >= 0 && d <= 2;
  });
  const 單位統計 = v2_7_分組統計_(list, '負責單位');
  const 狀態統計 = v2_7_分組統計_(list, '任務狀態');
  const 優先統計 = v2_7_分組統計_(list, '優先級');
  const 高風險任務 = 未完成
    .filter(x => x['優先級'] === '高' || v2_7_是否逾期_(x))
    .sort((a, b) => v2_7_日期差_(a['最晚採購日']) - v2_7_日期差_(b['最晚採購日']))
    .slice(0, 20);
  return {
    成功: true,
    版本: 'v2.7.0',
    統計: {
      任務總數: list.length,
      未完成: 未完成.length,
      已完成: 完成.length,
      逾期: 逾期.length,
      即將逾期: 即將逾期.length,
      高優先: list.filter(x => x['優先級'] === '高').length
    },
    單位統計,
    狀態統計,
    優先統計,
    逾期任務: 逾期,
    即將逾期任務: 即將逾期,
    高風險任務
  };
}

function 產生_v2_7_任務週報文字() {
  const d = 取得_v2_7_任務統計儀表板資料();
  const top = (d.高風險任務 || []).slice(0, 8).map((x, i) => `${i + 1}. ${x['負責單位']}｜${x['優先級']}｜${x['任務狀態']}｜${x['共用素材編號']}｜最晚採購 ${x['最晚採購日'] || '未填'}`).join('\n') || '目前無高風險任務。';
  return `【三方待辦任務週報 v2.7.0】\n\n任務總數：${d.統計.任務總數}\n未完成：${d.統計.未完成}\n已完成：${d.統計.已完成}\n逾期：${d.統計.逾期}\n2天內到期：${d.統計.即將逾期}\n高優先：${d.統計.高優先}\n\n單位統計：\n${v2_7_統計文字_(d.單位統計)}\n\n狀態統計：\n${v2_7_統計文字_(d.狀態統計)}\n\n高風險任務：\n${top}\n\n建議動作：\n1. 採購先處理逾期與高優先任務。\n2. 生管確認是否需調整排程或改料。\n3. 製造確認缺料工單是否暫停投產。`;
}

function 產生LINE_任務摘要Flex_() {
  const d = 取得_v2_7_任務統計儀表板資料();
  const top = (d.高風險任務 || []).slice(0, 6);
  return {
    type: 'flex',
    altText: '三方待辦任務摘要',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6d28d9',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: '三方待辦任務摘要', weight: 'bold', size: 'lg', color: '#ffffff' },
          { type: 'text', text: '生管 / 採購 / 製造 任務追蹤', size: 'sm', color: '#ede9fe', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          v2_7_LINE數字列_('任務總數', d.統計.任務總數, '#0f766e'),
          v2_7_LINE數字列_('未完成', d.統計.未完成, '#ca8a04'),
          v2_7_LINE數字列_('逾期', d.統計.逾期, '#dc2626'),
          v2_7_LINE數字列_('2天內到期', d.統計.即將逾期, '#ea580c'),
          v2_7_LINE數字列_('高優先', d.統計.高優先, '#be123c'),
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '高風險任務 TOP', weight: 'bold', size: 'sm', color: '#6d28d9', margin: 'md' },
          ...top.map(x => ({
            type: 'text',
            text: `${x['負責單位'] || ''}｜${x['優先級'] || ''}｜${x['共用素材編號'] || ''}｜${x['最晚採購日'] || '未填'}`,
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
          { type: 'button', style: 'primary', color: '#6d28d9', action: { type: 'uri', label: '開啟三方待辦', uri: 'https://qhero70.github.io/smart-factory-worker-app/task-board.html' } },
          { type: 'button', style: 'secondary', action: { type: 'uri', label: '開啟任務儀表板', uri: 'https://qhero70.github.io/smart-factory-worker-app/task-dashboard.html' } }
        ]
      }
    }
  };
}

function 產生LINE回覆訊息_v2_7_(文字) {
  const t = String(文字 || '').trim();
  if (t === '任務摘要' || t === '任務圖卡' || t === '三方任務') return [產生LINE_任務摘要Flex_()];
  if (t === '任務週報' || t === '三方週報') return [{ type: 'text', text: 產生_v2_7_任務週報文字() }];
  return 產生LINE回覆訊息_v2_6 ? 產生LINE回覆訊息_v2_6_(文字) : 產生LINE回覆訊息_v2_5_(文字);
}

function v2_7_是否逾期_(x) {
  if (String(x['任務狀態'] || '') === '完成') return false;
  const d = v2_7_日期差_(x['最晚採購日']);
  return d < 0;
}

function v2_7_日期差_(日期字串) {
  if (!日期字串) return 99999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(日期字串);
  if (isNaN(d)) return 99999;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function v2_7_分組統計_(list, 欄位) {
  const out = {};
  list.forEach(x => {
    const k = x[欄位] || '未填';
    out[k] = (out[k] || 0) + 1;
  });
  return out;
}

function v2_7_統計文字_(obj) {
  return Object.keys(obj || {}).map(k => `${k}：${obj[k]}`).join('\n') || '無資料';
}

function v2_7_LINE數字列_(標籤, 數值, 顏色) {
  return { type: 'box', layout: 'horizontal', contents: [
    { type: 'text', text: 標籤, size: 'sm', color: '#475569', flex: 3 },
    { type: 'text', text: String(數值 || 0), size: 'md', weight: 'bold', color: 顏色 || '#0f766e', align: 'end', flex: 2 }
  ] };
}

function 測試_v2_7_任務統計資料() {
  return 取得_v2_7_任務統計儀表板資料();
}

function 測試_v2_7_LINE任務圖卡() {
  return JSON.stringify(產生LINE_任務摘要Flex_(), null, 2);
}
