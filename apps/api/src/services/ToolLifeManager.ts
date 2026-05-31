import Groq from 'groq-sdk';
import * as cron from 'node-cron';
import { db } from '../db.js';
import { toolAlerts, workOrders } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { LineNotificationService } from './LineNotificationService.js';
import logger from '../utils/logger.js';

interface ToolLifeData {
  toolId: number;
  cumulativeTime: number;
  lastChangeDate: Date;
  estimatedRemainingLife: number;
  recommendedChangeTime: Date;
  confidence: number;
}

class ToolLifeManager {
  private groq: Groq;
  private lineService: LineNotificationService;
  private notificationSentTools = new Set<number>(); // 追蹤已發送通知的刀具

  constructor(lineService: LineNotificationService) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.lineService = lineService;
  }

  /**
   * 記錄刀具使用時間
   */
  async recordToolUsage(toolId: number, usageTime: number) {
    try {
      const tool = await db
        .select()
        .from(tools)
        .where(eq(tools.id, toolId))
        .limit(1);

      if (!tool.length) {
        throw new Error(`刀具 ${toolId} 不存在`);
      }

      const currentTool = tool[0];
      const newCumulativeTime = (currentTool.cumulativeTime || 0) + usageTime;

      await db
        .update(tools)
        .set({
          cumulativeTime: newCumulativeTime,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tools.id, toolId));

      logger.info(`刀具 ${toolId} 使用時間已更新: ${newCumulativeTime} 小時`);
    } catch (error) {
      logger.error('記錄刀具使用時間失敗:', error);
    }
  }

  /**
   * 使用 AI 預測最佳換刀時機
   */
  async predictOptimalChangeTime(toolId: number): Promise<ToolLifeData> {
    try {
      const tool = await db
        .select()
        .from(tools)
        .where(eq(tools.id, toolId))
        .limit(1);

      if (!tool.length) {
        throw new Error(`刀具 ${toolId} 不存在`);
      }

      const toolData = tool[0];
      const cumulativeTime = toolData.cumulativeTime || 0;
      const lastChangeDate = toolData.lastChangeDate || new Date();

      // 使用 Groq API 預測最佳換刀時機
      const prediction = await this.predictWithGroq(toolData, cumulativeTime);

      logger.info(`刀具 ${toolId} 最佳換刀時機預測完成:`, prediction);
      return prediction;
    } catch (error) {
      logger.error('預測最佳換刀時機失敗:', error);
      throw error;
    }
  }

  /**
   * 使用 Groq API 進行預測
   */
  private async predictWithGroq(toolData: any, cumulativeTime: number): Promise<ToolLifeData> {
    const prompt = `
根據以下刀具數據，預測最佳換刀時機（不是固定週期，而是基於磨損狀況）：

刀具類型: ${toolData.type}
規格: ${toolData.specification}
累計使用時間: ${cumulativeTime} 小時
上次換刀日期: ${toolData.lastChangeDate}
製造商建議壽命: ${toolData.recommendedLifespan} 小時
過去使用記錄: ${toolData.usageHistory || '無'}

請預測：
1. 預計還能使用多少小時（剩餘壽命）
2. 建議換刀時間（具體日期）
3. 預測信心度（0-100%）

請用 JSON 格式回覆：
{
  "estimatedRemainingLife": 數字(小時),
  "recommendedChangeTime": "YYYY-MM-DD",
  "confidence": 數字(0-100)
}
    `;

    const message = await this.groq.messages.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    try {
      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            toolId: toolData.id,
            cumulativeTime,
            lastChangeDate: toolData.lastChangeDate || new Date(),
            estimatedRemainingLife: parsed.estimatedRemainingLife,
            recommendedChangeTime: new Date(parsed.recommendedChangeTime),
            confidence: parsed.confidence,
          };
        }
      }
    } catch (error) {
      logger.error('解析 Groq 回應失敗:', error);
    }

    // 默認返回值
    return {
      toolId: toolData.id,
      cumulativeTime,
      lastChangeDate: toolData.lastChangeDate || new Date(),
      estimatedRemainingLife: Math.max(0, (toolData.recommendedLifespan || 500) - cumulativeTime),
      recommendedChangeTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      confidence: 50,
    };
  }

  /**
   * 檢查並發送換刀提醒（提前30分鐘）
   */
  async checkAndNotifyToolChange() {
    try {
      const allTools = await db.select().from(tools);

      for (const tool of allTools) {
        const prediction = await this.predictOptimalChangeTime(tool.id);
        const now = new Date();
        const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

        // 如果推薦換刀時間在30分鐘內，發送提醒
        if (
          prediction.recommendedChangeTime <= thirtyMinutesLater &&
          prediction.recommendedChangeTime > now &&
          !this.notificationSentTools.has(tool.id)
        ) {
          await this.sendToolChangeReminder(tool, prediction);
          this.notificationSentTools.add(tool.id);

          // 30分鐘後清除通知記錄，允許再次發送
          setTimeout(() => {
            this.notificationSentTools.delete(tool.id);
          }, 30 * 60 * 1000);
        }
      }

      logger.info('刀具換刀提醒檢查完成');
    } catch (error) {
      logger.error('檢查刀具換刀提醒失敗:', error);
    }
  }

  /**
   * 發送換刀提醒給操作員
   */
  private async sendToolChangeReminder(tool: any, prediction: ToolLifeData) {
    try {
      const flexMessage = {
        type: 'flex',
        altText: `⚠️ 刀具 ${tool.name} 即將需要更換`,
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
                color: '#FF9500',
              },
            ],
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
                    text: `刀具: ${tool.name}`,
                    size: 'sm',
                    color: '#666666',
                  },
                  {
                    type: 'text',
                    text: `規格: ${tool.specification}`,
                    size: 'sm',
                    color: '#666666',
                  },
                  {
                    type: 'text',
                    text: `累計使用: ${prediction.cumulativeTime.toFixed(1)} 小時`,
                    size: 'sm',
                    color: '#666666',
                  },
                  {
                    type: 'text',
                    text: `剩餘壽命: ${prediction.estimatedRemainingLife.toFixed(1)} 小時`,
                    size: 'sm',
                    color: '#FF6B6B',
                    weight: 'bold',
                  },
                  {
                    type: 'text',
                    text: `建議換刀時間: ${prediction.recommendedChangeTime.toLocaleString('zh-TW')}`,
                    size: 'sm',
                    color: '#FF9500',
                    weight: 'bold',
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
                style: 'primary',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: '已更換',
                  data: `action=tool_changed&toolId=${tool.id}`,
                },
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: '延遲更換',
                  data: `action=tool_change_delayed&toolId=${tool.id}`,
                },
              },
            ],
          },
        },
      };

      const operatorLineUserId = process.env.LINE_OPERATOR_USER_ID;
      if (operatorLineUserId) {
        await this.lineService.sendFlexToGroup(operatorLineUserId, flexMessage);
      }

      logger.info(`刀具 ${tool.id} 換刀提醒已發送`);
    } catch (error) {
      logger.error('發送換刀提醒失敗:', error);
    }
  }

  /**
   * 自動建立換刀工單
   */
  async createToolChangeWorkOrder(toolId: number, operatorId: number) {
    try {
      const tool = await db
        .select()
        .from(tools)
        .where(eq(tools.id, toolId))
        .limit(1);

      if (!tool.length) {
        throw new Error(`刀具 ${toolId} 不存在`);
      }

      // 建立換刀工單
      const workOrder = await db.insert(workOrders).values({
        productCode: `TOOL_CHANGE_${toolId}`,
        quantity: 1,
        assignedTo: operatorId,
        machineId: tool[0].machineId || 0,
        priority: 'high',
        deadline: new Date(Date.now() + 60 * 60 * 1000), // 1小時內完成
        status: 'pending',
        notes: `更換刀具: ${tool[0].name} (${tool[0].specification})`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 更新刀具狀態
      await db
        .update(tools)
        .set({
          status: 'pending_change',
          updatedAt: new Date(),
        })
        .where(eq(tools.id, toolId));

      logger.info(`已為刀具 ${toolId} 建立換刀工單`);
      return workOrder;
    } catch (error) {
      logger.error('建立換刀工單失敗:', error);
      throw error;
    }
  }

  /**
   * 記錄換刀履歷
   */
  async recordToolChange(toolId: number, newToolId: string, changedBy: number, notes?: string) {
    try {
      const tool = await db
        .select()
        .from(tools)
        .where(eq(tools.id, toolId))
        .limit(1);

      if (!tool.length) {
        throw new Error(`刀具 ${toolId} 不存在`);
      }

      // 更新舊刀具狀態
      await db
        .update(tools)
        .set({
          status: 'retired',
          retiredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tools.id, toolId));

      // 新增新刀具
      await db.insert(tools).values({
        id: parseInt(newToolId),
        name: tool[0].name,
        type: tool[0].type,
        specification: tool[0].specification,
        machineId: tool[0].machineId,
        status: 'active',
        cumulativeTime: 0,
        lastChangeDate: new Date(),
        recommendedLifespan: tool[0].recommendedLifespan,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(`刀具 ${toolId} 已更換為 ${newToolId}，由 ${changedBy} 執行`);
    } catch (error) {
      logger.error('記錄換刀履歷失敗:', error);
      throw error;
    }
  }

  /**
   * 啟動定時檢查（每小時檢查一次）
   */
  startScheduledCheck() {
    cron.schedule('0 * * * *', async () => {
      logger.info('開始檢查刀具換刀提醒...');
      await this.checkAndNotifyToolChange();
    });
    logger.info('刀具壽命管理引擎已啟動（每小時檢查一次）');
  }
}

export default ToolLifeManager;
