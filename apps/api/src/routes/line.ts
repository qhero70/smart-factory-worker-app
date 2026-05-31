import { Router, Request, Response } from 'express';
import { Database } from '../db/connection';
import { middleware, Client } from '@line/bot-sdk';

export function setupLineWebhookRoute(db: Database) {
  const router = Router();

  const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  };

  const client = new Client(lineConfig);

  router.post(
    '/',
    middleware(lineConfig),
    async (req: Request, res: Response) => {
      try {
        const events = (req as any).body.events;

        await Promise.all(
          events.map(async (event: any) => {
            if (event.type === 'message' && event.message.type === 'text') {
              const text = event.message.text;

              // 處理不同的關鍵字
              if (text === '今日工單') {
                await client.replyMessage(event.replyToken, {
                  type: 'text',
                  text: '📋 您的今日工單已發送至應用程式，請查看。',
                });
              } else if (text === '異常回報') {
                await client.replyMessage(event.replyToken, {
                  type: 'text',
                  text: '⚠️ 請在應用程式中回報異常詳情。',
                });
              } else if (text === 'AI分析') {
                await client.replyMessage(event.replyToken, {
                  type: 'text',
                  text: '🤖 AI助理已啟動，請在應用程式中與AI互動。',
                });
              }
            }
          })
        );

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'LINE Webhook處理失敗' });
      }
    }
  );

  return router;
}
