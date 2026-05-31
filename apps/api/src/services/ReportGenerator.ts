import * as dbModule from '../db.js';
import { anomalies } from '../db/schema.js';
import { gte, lte, and } from 'drizzle-orm';
import * as cron from 'node-cron';
import Groq from 'groq-sdk';
import { LineNotificationService } from './LineNotificationService';
import logger from '../utils/logger';

interface DailyReport {
  date: Date;
  totalProduction: number;
  totalDefects: number;
  defectRate: number;
  completedWorkOrders: number;
  incidents: number;
  aiAnalysis: string;
}

interface WeeklyReport {
  weekStart: Date;
  weekEnd: Date;
  totalProduction: number;
  averageDailyProduction: number;
  defectRate: number;
  completedWorkOrders: number;
  incidents: number;
  topPerformer: string;
  aiAnalysis: string;
}

interface MonthlyReport {
  month: number;
  year: number;
  totalProduction: number;
  averageDailyProduction: number;
  defectRate: number;
  completedWorkOrders: number;
  incidents: number;
  kpiAchievement: {
    production: number;
    quality: number;
    efficiency: number;
  };
  aiAnalysis: string;
}

class ReportGenerator {
  private groq: Groq;
  private lineService: LineNotificationService;

  constructor(lineService: LineNotificationService) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.lineService = lineService;
  }

  /**
   * 生成日報
   */
  async generateDailyReport(date: Date): Promise<DailyReport> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // 獲取該日的報工記錄
      const records = await db
        .select()
        .from(reportingRecords)
        .where(
          and(
            gte(reportingRecords.completedAt, dayStart),
            lte(reportingRecords.completedAt, dayEnd)
          )
        );

      const totalProduction = records.reduce((sum, r) => sum + r.quantity, 0);
      const totalDefects = records.reduce((sum, r) => sum + (r.defectQuantity || 0), 0);
      const defectRate = totalProduction > 0 ? totalDefects / totalProduction : 0;

      // 獲取完成的工單數
      const completedWOs = await db
        .select()
        .from(workOrders)
        .where(
          and(
            gte(workOrders.completedAt, dayStart),
            lte(workOrders.completedAt, dayEnd)
          )
        );

      // 獲取該日的事件
      const incidents = await db
        .select()
        .from(alerts)
        .where(
          and(
            gte(alerts.createdAt, dayStart),
            lte(alerts.createdAt, dayEnd)
          )
        );

      // 使用 AI 生成分析
      const aiAnalysis = await this.generateAIAnalysis(
        'daily',
        totalProduction,
        defectRate,
        completedWOs.length,
        incidents.length
      );

      return {
        date,
        totalProduction,
        totalDefects,
        defectRate,
        completedWorkOrders: completedWOs.length,
        incidents: incidents.length,
        aiAnalysis,
      };
    } catch (error) {
      logger.error('生成日報失敗:', error);
      throw error;
    }
  }

  /**
   * 生成週報
   */
  async generateWeeklyReport(weekStart: Date): Promise<WeeklyReport> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // 獲取該週的報工記錄
      const records = await db
        .select()
        .from(reportingRecords)
        .where(
          and(
            gte(reportingRecords.completedAt, weekStart),
            lte(reportingRecords.completedAt, weekEnd)
          )
        );

      const totalProduction = records.reduce((sum, r) => sum + r.quantity, 0);
      const totalDefects = records.reduce((sum, r) => sum + (r.defectQuantity || 0), 0);
      const defectRate = totalProduction > 0 ? totalDefects / totalProduction : 0;
      const averageDailyProduction = totalProduction / 7;

      // 獲取完成的工單數
      const completedWOs = await db
        .select()
        .from(workOrders)
        .where(
          and(
            gte(workOrders.completedAt, weekStart),
            lte(workOrders.completedAt, weekEnd)
          )
        );

      // 獲取該週的事件
      const incidents = await db
        .select()
        .from(alerts)
        .where(
          and(
            gte(alerts.createdAt, weekStart),
            lte(alerts.createdAt, weekEnd)
          )
        );

      // 找出表現最好的人員
      const topPerformer = this.findTopPerformer(records);

      // 使用 AI 生成分析
      const aiAnalysis = await this.generateAIAnalysis(
        'weekly',
        totalProduction,
        defectRate,
        completedWOs.length,
        incidents.length
      );

      return {
        weekStart,
        weekEnd,
        totalProduction,
        averageDailyProduction,
        defectRate,
        completedWorkOrders: completedWOs.length,
        incidents: incidents.length,
        topPerformer,
        aiAnalysis,
      };
    } catch (error) {
      logger.error('生成週報失敗:', error);
      throw error;
    }
  }

  /**
   * 生成月報
   */
  async generateMonthlyReport(month: number, year: number): Promise<MonthlyReport> {
    try {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      monthEnd.setHours(23, 59, 59, 999);

      // 獲取該月的報工記錄
      const records = await db
        .select()
        .from(reportingRecords)
        .where(
          and(
            gte(reportingRecords.completedAt, monthStart),
            lte(reportingRecords.completedAt, monthEnd)
          )
        );

      const totalProduction = records.reduce((sum, r) => sum + r.quantity, 0);
      const totalDefects = records.reduce((sum, r) => sum + (r.defectQuantity || 0), 0);
      const defectRate = totalProduction > 0 ? totalDefects / totalProduction : 0;
      const daysInMonth = monthEnd.getDate();
      const averageDailyProduction = totalProduction / daysInMonth;

      // 獲取完成的工單數
      const completedWOs = await db
        .select()
        .from(workOrders)
        .where(
          and(
            gte(workOrders.completedAt, monthStart),
            lte(workOrders.completedAt, monthEnd)
          )
        );

      // 獲取該月的事件
      const incidents = await db
        .select()
        .from(alerts)
        .where(
          and(
            gte(alerts.createdAt, monthStart),
            lte(alerts.createdAt, monthEnd)
          )
        );

      // 計算 KPI 達成率
      const kpiAchievement = {
        production: Math.min(100, (totalProduction / 10000) * 100), // 假設月目標 10000 件
        quality: Math.max(0, 100 - defectRate * 100), // 品質 = 100% - 不良率
        efficiency: Math.min(100, (completedWOs.length / 500) * 100), // 假設月目標 500 件工單
      };

      // 使用 AI 生成分析
      const aiAnalysis = await this.generateAIAnalysis(
        'monthly',
        totalProduction,
        defectRate,
        completedWOs.length,
        incidents.length
      );

      return {
        month,
        year,
        totalProduction,
        averageDailyProduction,
        defectRate,
        completedWorkOrders: completedWOs.length,
        incidents: incidents.length,
        kpiAchievement,
        aiAnalysis,
      };
    } catch (error) {
      logger.error('生成月報失敗:', error);
      throw error;
    }
  }

  /**
   * 生成 AI 分析
   */
  private async generateAIAnalysis(
    reportType: 'daily' | 'weekly' | 'monthly',
    totalProduction: number,
    defectRate: number,
    completedWorkOrders: number,
    incidents: number
  ): Promise<string> {
    try {
      const prompt = `
根據以下 ${reportType} 生產數據生成簡潔的分析（最多 100 字）：

總產量: ${totalProduction} 件
不良率: ${(defectRate * 100).toFixed(2)}%
完成工單: ${completedWorkOrders} 件
事件數: ${incidents} 件

請提供：
1. 整體表現評價
2. 主要亮點或問題
3. 簡短的改善建議

請用繁體中文回覆，不要使用 JSON 格式。
      `;

      const message = await this.groq.messages.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text.substring(0, 200);
      }

      return '分析生成中...';
    } catch (error) {
      logger.error('生成 AI 分析失敗:', error);
      return '分析生成失敗';
    }
  }

  /**
   * 找出表現最好的人員
   */
  private findTopPerformer(records: any[]): string {
    if (records.length === 0) return '無';

    const performanceMap: Record<number, number> = {};

    records.forEach(record => {
      const personnelId = record.personnelId || 0;
      performanceMap[personnelId] = (performanceMap[personnelId] || 0) + record.quantity;
    });

    const topPersonnelId = Object.entries(performanceMap).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev
    )[0];

    return `人員 ${topPersonnelId}`;
  }

  /**
   * 發送日報
   */
  async sendDailyReport(report: DailyReport) {
    try {
      const flexMessage = {
        type: 'flex',
        altText: `📊 日報 - ${report.date.toLocaleDateString('zh-TW')}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📊 生產日報',
                weight: 'bold',
                size: 'xl',
                color: '#4A90E2',
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
                layout: 'baseline',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '日期:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: report.date.toLocaleDateString('zh-TW'),
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '總產量:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: `${report.totalProduction} 件`,
                    wrap: true,
                    color: '#4A90E2',
                    size: 'sm',
                    flex: 5,
                    weight: 'bold',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '不良率:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: `${(report.defectRate * 100).toFixed(2)}%`,
                    wrap: true,
                    color: report.defectRate > 0.05 ? '#FF6B6B' : '#51CF66',
                    size: 'sm',
                    flex: 5,
                    weight: 'bold',
                  },
                ],
              },
              {
                type: 'text',
                text: report.aiAnalysis,
                wrap: true,
                size: 'xs',
                color: '#999999',
                margin: 'lg',
              },
            ],
          },
        },
      };

      const managerLineUserId = process.env.LINE_PRODUCTION_MANAGER_USER_ID;
      if (managerLineUserId) {
        await this.lineService.sendFlexToGroup(managerLineUserId, flexMessage);
      }

      logger.info(`日報已發送給生產主管`);
    } catch (error) {
      logger.error('發送日報失敗:', error);
    }
  }

  /**
   * 啟動定時報表生成
   */
  startScheduledReports() {
    // 每天 17:30 生成日報
    cron.schedule('30 17 * * *', async () => {
      logger.info('開始生成日報...');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dailyReport = await this.generateDailyReport(yesterday);
      await this.sendDailyReport(dailyReport);
    });

    // 每週五 17:00 生成週報
    cron.schedule('0 17 * * 5', async () => {
      logger.info('開始生成週報...');
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weeklyReport = await this.generateWeeklyReport(weekStart);
      logger.info('週報生成完成:', weeklyReport);
    });

    // 每月最後一天 23:00 生成月報
    cron.schedule('0 23 28-31 * *', async () => {
      logger.info('開始生成月報...');
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);

      // 檢查明天是否為下個月的第一天
      if (nextDay.getDate() === 1) {
        const monthlyReport = await this.generateMonthlyReport(now.getMonth() + 1, now.getFullYear());
        logger.info('月報生成完成:', monthlyReport);
      }
    });

    logger.info('自動報表生成引擎已啟動');
  }
}

export default ReportGenerator;
