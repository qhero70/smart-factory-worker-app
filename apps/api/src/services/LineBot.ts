import axios from 'axios';
import * as crypto from 'crypto';

/**
 * LINE Bot 服務模組
 * 支援 Flex Message、Rich Menu、Webhook 處理
 */

interface LineEvent {
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
  };
  replyToken: string;
  timestamp: number;
}

interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: any;
}

class LineBot {
  private channelAccessToken: string;
  private channelSecret: string;
  private apiUrl = 'https://api.line.biz/v2/bot';

  constructor(accessToken: string, channelSecret: string) {
    this.channelAccessToken = accessToken;
    this.channelSecret = channelSecret;
  }

  /**
   * 驗證 LINE Webhook 簽名
   */
  verifySignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha256', this.channelSecret)
      .update(body)
      .digest('base64');

    return hash === signature;
  }

  /**
   * 回覆訊息
   */
  async replyMessage(replyToken: string, messages: any[]): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/message/reply`,
        {
          replyToken,
          messages,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ LINE 訊息已回覆');
    } catch (error) {
      console.error('❌ LINE 訊息回覆失敗:', error);
    }
  }

  /**
   * 推播訊息給使用者
   */
  async pushMessage(userId: string, messages: any[]): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/message/push`,
        {
          to: userId,
          messages,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ LINE 訊息已推播給 ${userId}`);
    } catch (error) {
      console.error('❌ LINE 訊息推播失敗:', error);
    }
  }

  /**
   * 推播訊息給群組
   */
  async pushToGroup(groupId: string, messages: any[]): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/message/push`,
        {
          to: groupId,
          messages,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ LINE 訊息已推播給群組 ${groupId}`);
    } catch (error) {
      console.error('❌ LINE 群組訊息推播失敗:', error);
    }
  }

  /**
   * 建立工單通知卡
   */
  createWorkOrderCard(workOrder: any): FlexMessage {
    const progress = Math.round((workOrder.completedQuantity / workOrder.quantity) * 100);
    const isOverdue = new Date(workOrder.dueDate) < new Date();

    return {
      type: 'flex',
      altText: `工單 ${workOrder.workOrderId} - ${workOrder.productName}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `工單 #${workOrder.workOrderId}`,
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
            },
          ],
          backgroundColor: '#1DB446',
          paddingAll: 'md',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '品名',
                  size: 'sm',
                  color: '#999999',
                },
                {
                  type: 'text',
                  text: workOrder.productName,
                  size: 'lg',
                  weight: 'bold',
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '數量',
                      size: 'sm',
                      color: '#999999',
                    },
                    {
                      type: 'text',
                      text: `${workOrder.completedQuantity}/${workOrder.quantity}`,
                      size: 'lg',
                      weight: 'bold',
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '機台',
                      size: 'sm',
                      color: '#999999',
                    },
                    {
                      type: 'text',
                      text: workOrder.machineName,
                      size: 'lg',
                      weight: 'bold',
                    },
                  ],
                },
              ],
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '進度',
                  size: 'sm',
                  color: '#999999',
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'box',
                      layout: 'vertical',
                      flex: progress,
                      height: '8px',
                      backgroundColor: '#1DB446',
                      cornerRadius: '4px',
                    },
                    {
                      type: 'box',
                      layout: 'vertical',
                      flex: 100 - progress,
                      height: '8px',
                      backgroundColor: '#EEEEEE',
                      cornerRadius: '4px',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: `${progress}%`,
                  size: 'sm',
                  color: '#999999',
                  align: 'center',
                },
              ],
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '截止時間',
                  size: 'sm',
                  color: '#999999',
                },
                {
                  type: 'text',
                  text: new Date(workOrder.dueDate).toLocaleString('zh-TW'),
                  size: 'lg',
                  weight: 'bold',
                  color: isOverdue ? '#FF0000' : '#000000',
                },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '開始報工',
                data: `action=start_report&workOrderId=${workOrder.workOrderId}`,
              },
              style: 'primary',
            },
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '查看詳情',
                data: `action=view_details&workOrderId=${workOrder.workOrderId}`,
              },
              style: 'secondary',
            },
          ],
        },
      },
    };
  }

  /**
   * 建立異常警報卡
   */
  createAlertCard(alert: any): FlexMessage {
    const severityColors: Record<string, string> = {
      critical: '#FF0000',
      high: '#FF9900',
      medium: '#FFCC00',
      low: '#0099FF',
    };

    const severityLabel: Record<string, string> = {
      critical: '🔴 緊急',
      high: '🟠 高',
      medium: '🟡 中',
      low: '🔵 低',
    };

    return {
      type: 'flex',
      altText: `異常警報 - ${alert.machineName}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: severityLabel[alert.severity] || '異常',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
            },
          ],
          backgroundColor: severityColors[alert.severity] || '#999999',
          paddingAll: 'md',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: alert.machineName,
                  size: 'lg',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: alert.alertType,
                  size: 'sm',
                  color: '#999999',
                },
              ],
            },
            {
              type: 'text',
              text: `發生時間：${new Date(alert.createdAt).toLocaleString('zh-TW')}`,
              size: 'sm',
              color: '#999999',
            },
            {
              type: 'text',
              text: alert.aiAnalysis,
              size: 'sm',
              wrap: true,
              margin: 'md',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '我來處理',
                data: `action=handle_alert&alertId=${alert.alertId}`,
              },
              style: 'primary',
            },
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '升級通報',
                data: `action=escalate_alert&alertId=${alert.alertId}`,
              },
              style: 'secondary',
            },
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '已解決',
                data: `action=resolve_alert&alertId=${alert.alertId}`,
              },
              style: 'secondary',
            },
          ],
        },
      },
    };
  }

  /**
   * 建立每日報告卡
   */
  createDailyReportCard(report: any): FlexMessage {
    return {
      type: 'flex',
      altText: '今日生產報告',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📊 今日生產報告',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
            },
          ],
          backgroundColor: '#1DB446',
          paddingAll: 'md',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '良品數',
                      size: 'sm',
                      color: '#999999',
                    },
                    {
                      type: 'text',
                      text: `${report.goodParts}/${report.targetQuantity}`,
                      size: 'lg',
                      weight: 'bold',
                      color: '#1DB446',
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '不良率',
                      size: 'sm',
                      color: '#999999',
                    },
                    {
                      type: 'text',
                      text: `${report.defectRate}%`,
                      size: 'lg',
                      weight: 'bold',
                      color: report.defectRate > 3 ? '#FF0000' : '#1DB446',
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: 'OEE',
                      size: 'sm',
                      color: '#999999',
                    },
                    {
                      type: 'text',
                      text: `${report.oee}%`,
                      size: 'lg',
                      weight: 'bold',
                      color: report.oee > 80 ? '#1DB446' : '#FF9900',
                    },
                  ],
                },
              ],
            },
            {
              type: 'text',
              text: report.aiSummary,
              size: 'sm',
              wrap: true,
              margin: 'md',
            },
            {
              type: 'text',
              text: `📌 明日重點：${report.tomorrowFocus}`,
              size: 'sm',
              wrap: true,
              margin: 'md',
              color: '#FF9900',
            },
          ],
        },
      },
    };
  }

  /**
   * 建立刀具更換提醒卡
   */
  createToolReplacementCard(tool: any): FlexMessage {
    return {
      type: 'flex',
      altText: `刀具更換提醒 - ${tool.toolName}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔧 刀具更換提醒',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
            },
          ],
          backgroundColor: '#FF9900',
          paddingAll: 'md',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: tool.toolName,
              size: 'lg',
              weight: 'bold',
            },
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '機台',
                      size: 'sm',
                      color: '#999999',
                    },
                    {
                      type: 'text',
                      text: tool.machineName,
                      size: 'lg',
                      weight: 'bold',
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '剩餘壽命',
                      size: 'sm',
                      color: '#999999',
                    },
                    {
                      type: 'text',
                      text: `${tool.remainingLife}%`,
                      size: 'lg',
                      weight: 'bold',
                      color: tool.remainingLife < 20 ? '#FF0000' : '#1DB446',
                    },
                  ],
                },
              ],
            },
            {
              type: 'text',
              text: `建議更換時間：${new Date(tool.suggestedReplacementTime).toLocaleString('zh-TW')}`,
              size: 'sm',
              color: '#999999',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '已更換',
                data: `action=tool_replaced&toolId=${tool.toolId}`,
              },
              style: 'primary',
            },
            {
              type: 'button',
              action: {
                type: 'postback',
                label: '延後30分鐘',
                data: `action=tool_postpone&toolId=${tool.toolId}`,
              },
              style: 'secondary',
            },
          ],
        },
      },
    };
  }

  /**
   * 建立文字訊息
   */
  createTextMessage(text: string) {
    return {
      type: 'text',
      text,
    };
  }

  /**
   * 建立快速回覆按鈕
   */
  createQuickReplyMessage(text: string, items: any[]) {
    return {
      type: 'text',
      text,
      quickReply: {
        items,
      },
    };
  }
}

// 導出單例
let lineBot: LineBot | null = null;

export function getLineBot(): LineBot {
  if (!lineBot) {
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

    if (!accessToken || !channelSecret) {
      throw new Error('❌ 缺少 LINE 認證信息');
    }

    lineBot = new LineBot(accessToken, channelSecret);
  }
  return lineBot;
}

export default LineBot;
