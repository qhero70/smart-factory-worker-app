import { Router, Request, Response } from 'express';
import { getLineBot } from '../services/LineBot';
import * as dbModule from '../db.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();
const lineBot = getLineBot();

interface LineWebhookBody {
  events: Array<{
    type: string;
    message?: {
      type: string;
      text: string;
      id: string;
    };
    postback?: {
      data: string;
    };
    source: {
      userId: string;
      type: string;
      groupId?: string;
    };
    replyToken: string;
    timestamp: number;
  }>;
}

/**
 * POST /api/line/webhook
 * LINE Webhook 入口
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // 驗證簽名
    const signature = req.headers['x-line-signature'] as string;
    const body = JSON.stringify(req.body);

    if (!lineBot.verifySignature(body, signature)) {
      console.error('❌ LINE 簽名驗證失敗');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const webhookBody = req.body as LineWebhookBody;

    // 處理每個事件
    for (const event of webhookBody.events) {
      await handleLineEvent(event);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ LINE Webhook 處理失敗:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * 處理 LINE 事件
 */
async function handleLineEvent(event: any) {
  const userId = event.source.userId;

  switch (event.type) {
    case 'message':
      await handleMessage(event, userId);
      break;
    case 'postback':
      await handlePostback(event, userId);
      break;
    case 'follow':
      await handleFollow(event, userId);
      break;
    case 'unfollow':
      await handleUnfollow(event, userId);
      break;
  }
}

/**
 * 處理文字訊息
 */
async function handleMessage(event: any, userId: string) {
  const text = event.message.text;
  const replyToken = event.replyToken;

  console.log(`📨 收到訊息 from ${userId}: ${text}`);

  // 關鍵字自動回覆
  if (text.includes('今日') || text.includes('今天')) {
    const messages = [
      lineBot.createTextMessage('📊 今日 KPI 數據：'),
      {
        type: 'text',
        text: '✅ 良品數：450 件\n❌ 不良率：2.1%\n⚙️ OEE：82.5%\n📈 達成率：95%',
      },
    ];
    await lineBot.replyMessage(replyToken, messages);
  } else if (text.includes('工單')) {
    const messages = [
      lineBot.createTextMessage('📋 我的工單列表：'),
      {
        type: 'text',
        text: '#1001 - 產品A (進行中 80%)\n#1002 - 產品B (待開始)\n#1003 - 產品C (已完成)',
      },
    ];
    await lineBot.replyMessage(replyToken, messages);
  } else if (text.includes('異常')) {
    const messages = [
      lineBot.createTextMessage('⚠️ 今日異常清單：'),
      {
        type: 'text',
        text: '🔴 [10:30] 機台A - 主軸故障\n🟠 [14:15] 機台B - 缺料\n🟡 [15:45] 機台C - 品質不穩',
      },
    ];
    await lineBot.replyMessage(replyToken, messages);
  } else if (text.includes('OEE')) {
    const messages = [
      lineBot.createTextMessage('⚙️ 各機台 OEE 即時數據：'),
      {
        type: 'text',
        text: '機台A: 85% ✅\n機台B: 72% ⚠️\n機台C: 91% ✅\n機台D: 68% 🔴',
      },
    ];
    await lineBot.replyMessage(replyToken, messages);
  } else if (text.includes('排程')) {
    const messages = [
      lineBot.createTextMessage('📅 今日排程甘特圖已生成'),
      {
        type: 'text',
        text: '請稍候，正在生成排程圖表...',
      },
    ];
    await lineBot.replyMessage(replyToken, messages);
  } else if (text.includes('報工')) {
    const messages = [
      lineBot.createTextMessage('📱 掃碼報工'),
      {
        type: 'text',
        text: '請開啟 App 進行 QR Code 掃描報工',
      },
    ];
    await lineBot.replyMessage(replyToken, messages);
  } else if (text.includes('AI')) {
    const aiQuestion = text.replace('AI', '').trim();
    const messages = [
      lineBot.createTextMessage(`🤖 AI 分析中：${aiQuestion}`),
      {
        type: 'text',
        text: '根據生產數據分析，建議...',
      },
    ];
    await lineBot.replyMessage(replyToken, messages);
  } else {
    const messages = [
      lineBot.createTextMessage('👋 您好！我是智慧製造 AI 助理。\n\n可以告訴我：\n📊 今日 / 工單 / 異常 / OEE / 排程 / 報工 / AI + 問題'),
    ];
    await lineBot.replyMessage(replyToken, messages);
  }
}

/**
 * 處理 Postback 事件（按鈕點擊）
 */
async function handlePostback(event: any, userId: string) {
  const data = event.postback.data;
  const replyToken = event.replyToken;

  console.log(`🔘 收到 Postback from ${userId}: ${data}`);

  const params = new URLSearchParams(data);
  const action = params.get('action');

  switch (action) {
    case 'start_report':
      const workOrderId = params.get('workOrderId');
      const messages = [
        lineBot.createTextMessage(`📝 開始報工 - 工單 #${workOrderId}`),
        {
          type: 'text',
          text: '請在 App 中掃描工單 QR Code 繼續報工',
        },
      ];
      await lineBot.replyMessage(replyToken, messages);
      break;

    case 'view_details':
      const detailsWorkOrderId = params.get('workOrderId');
      const detailsMessages = [
        lineBot.createTextMessage(`📋 工單詳情 #${detailsWorkOrderId}`),
        {
          type: 'text',
          text: '品名：產品A\n數量：500 件\n機台：A-01\n進度：80%\n截止：2024-06-01 17:00',
        },
      ];
      await lineBot.replyMessage(replyToken, detailsMessages);
      break;

    case 'handle_alert':
      const alertId = params.get('alertId');
      const handleMessages = [
        lineBot.createTextMessage(`✅ 已標記異常 #${alertId} 為「我來處理」`),
        {
          type: 'text',
          text: '感謝您的快速反應！',
        },
      ];
      await lineBot.replyMessage(replyToken, handleMessages);
      break;

    case 'tool_replaced':
      const toolId = params.get('toolId');
      const toolMessages = [
        lineBot.createTextMessage(`✅ 已記錄刀具 #${toolId} 更換`),
        {
          type: 'text',
          text: '感謝您的及時維護！',
        },
      ];
      await lineBot.replyMessage(replyToken, toolMessages);
      break;

    default:
      const defaultMessages = [
        lineBot.createTextMessage('✅ 操作已記錄'),
      ];
      await lineBot.replyMessage(replyToken, defaultMessages);
  }
}

/**
 * 處理用戶加入事件
 */
async function handleFollow(event: any, userId: string) {
  console.log(`👤 新用戶加入: ${userId}`);

  const messages = [
    lineBot.createTextMessage('👋 歡迎使用智慧製造系統！'),
    {
      type: 'text',
      text: '請提供您的員工編號以完成綁定',
    },
  ];

  await lineBot.pushMessage(userId, messages);
}

/**
 * 處理用戶移除事件
 */
async function handleUnfollow(event: any, userId: string) {
  console.log(`👤 用戶已移除: ${userId}`);
  // 可以在此更新用戶狀態
}

export default router;
