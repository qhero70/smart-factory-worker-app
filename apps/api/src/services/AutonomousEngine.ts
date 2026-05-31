import cron from 'node-cron';
import { Database } from '../db/connection';
import { Logger } from 'pino';
import { machines, workOrders, reportingLogs, anomalies } from '../db/schema';
import { desc, and, gte, lte } from 'drizzle-orm';
import { AIService } from './AIService';

export class AutonomousEngine {
  private db: Database;
  private logger: Logger;
  private aiService: AIService;

  constructor(db: Database, logger: Logger) {
    this.db = db;
    this.logger = logger;
    this.aiService = new AIService();
  }

  async start(): Promise<void> {
    this.logger.info('🤖 Autonomous Engine started');

    // 每5分鐘檢查機台健康
    cron.schedule('*/5 * * * *', () => this.checkMachineHealth());

    // 每10分鐘計算KPI
    cron.schedule('*/10 * * * *', () => this.calculateLiveKPI());

    // 每30分鐘分析生產趨勢
    cron.schedule('*/30 * * * *', () => this.analyzeProductionTrend());

    // 每小時預測交期風險
    cron.schedule('0 * * * *', () => this.predictDeliveryRisk());

    // 每日早上7:30晨會簡報
    cron.schedule('30 7 * * *', () => this.morningBriefing());

    // 每日下午5點晚報
    cron.schedule('0 17 * * *', () => this.eveningReport());
  }

  private async checkMachineHealth(): Promise<void> {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const allMachines = await this.db.query.machines.findMany();

      for (const machine of allMachines) {
        if (!machine.lastHeartbeat || machine.lastHeartbeat < tenMinutesAgo) {
          this.logger.warn(`⚠️ Machine ${machine.machineName} is not responding`);

          // 廣播警報
          if (global.broadcastToClients) {
            global.broadcastToClients({
              type: 'MACHINE_ALERT',
              severity: 'CRITICAL',
              payload: {
                machineId: machine.id,
                machineName: machine.machineName,
                message: `${machine.machineName} 未在規定時間內回應心跳信號`,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Machine health check failed');
    }
  }

  private async calculateLiveKPI(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reports = await this.db.query.reportingLogs.findMany({
        where: gte(reportingLogs.createdAt, today),
      });

      const totalQuantity = reports.reduce((sum, r) => sum + r.quantity, 0);
      const totalDefect = reports.reduce((sum, r) => sum + (r.defectQty || 0), 0);
      const defectRate = totalQuantity > 0 ? (totalDefect / totalQuantity) * 100 : 0;

      const kpi = {
        date: today.toISOString(),
        totalQuantity,
        totalDefect,
        defectRate: defectRate.toFixed(2),
        reportCount: reports.length,
      };

      this.logger.info({ kpi }, '📊 KPI calculated');

      // 廣播KPI更新
      if (global.broadcastToClients) {
        global.broadcastToClients({
          type: 'KPI_UPDATE',
          payload: kpi,
        });
      }

      // 如果不良率>5%，觸發AI根因分析
      if (defectRate > 5) {
        await this.triggerAIAnalysis('defect_rate', JSON.stringify(reports));
      }
    } catch (error) {
      this.logger.error({ error }, 'KPI calculation failed');
    }
  }

  private async analyzeProductionTrend(): Promise<void> {
    try {
      const last8Hours = new Date(Date.now() - 8 * 60 * 60 * 1000);
      const reports = await this.db.query.reportingLogs.findMany({
        where: gte(reportingLogs.createdAt, last8Hours),
      });

      if (reports.length === 0) return;

      const summary = JSON.stringify({
        count: reports.length,
        totalQty: reports.reduce((sum, r) => sum + r.quantity, 0),
        avgDefectRate:
          (reports.reduce((sum, r) => sum + (r.defectQty || 0), 0) /
            reports.reduce((sum, r) => sum + r.quantity, 0)) *
          100,
      });

      const analysis = await this.aiService.analyze(
        'production_trend',
        summary
      );

      this.logger.info({ analysis }, '📈 Production trend analysis completed');

      // 廣播分析結果
      if (global.broadcastToClients) {
        global.broadcastToClients({
          type: 'AI_INSIGHT',
          payload: analysis,
        });
      }
    } catch (error) {
      this.logger.error({ error }, 'Production trend analysis failed');
    }
  }

  private async predictDeliveryRisk(): Promise<void> {
    try {
      const inProgressOrders = await this.db.query.workOrders.findMany({
        where: (wo) => wo.status === 'IN_PROGRESS',
      });

      for (const order of inProgressOrders) {
        if (!order.quantity) continue;

        const progress = (order.completedQty || 0) / order.quantity;
        if (progress < 0.7) {
          this.logger.warn(
            `📦 Order ${order.orderNo} is at risk of delay (${(progress * 100).toFixed(0)}% complete)`
          );

          if (global.broadcastToClients) {
            global.broadcastToClients({
              type: 'DELIVERY_RISK',
              severity: 'HIGH',
              payload: order,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Delivery risk prediction failed');
    }
  }

  private async morningBriefing(): Promise<void> {
    try {
      const todayOrders = await this.db.query.workOrders.findMany();
      this.logger.info(`📋 Morning briefing: ${todayOrders.length} orders today`);

      if (global.broadcastToClients) {
        global.broadcastToClients({
          type: 'MORNING_BRIEFING',
          payload: {
            orderCount: todayOrders.length,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      this.logger.error({ error }, 'Morning briefing failed');
    }
  }

  private async eveningReport(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reports = await this.db.query.reportingLogs.findMany({
        where: gte(reportingLogs.createdAt, today),
      });

      const report = {
        date: today.toISOString(),
        reportCount: reports.length,
        totalQuantity: reports.reduce((sum, r) => sum + r.quantity, 0),
        defectCount: reports.reduce((sum, r) => sum + (r.defectQty || 0), 0),
      };

      this.logger.info({ report }, '📊 Evening report');

      if (global.broadcastToClients) {
        global.broadcastToClients({
          type: 'EVENING_REPORT',
          payload: report,
        });
      }
    } catch (error) {
      this.logger.error({ error }, 'Evening report failed');
    }
  }

  private async triggerAIAnalysis(type: string, data: string): Promise<void> {
    try {
      const analysis = await this.aiService.analyze(type, data);
      this.logger.info({ analysis }, `🤖 AI analysis triggered for ${type}`);

      if (global.broadcastToClients) {
        global.broadcastToClients({
          type: 'AI_RECOMMENDATION',
          payload: analysis,
        });
      }
    } catch (error) {
      this.logger.error({ error }, `AI analysis failed for ${type}`);
    }
  }
}

export async function initializeAutonomousEngine(
  db: Database,
  logger: Logger
): Promise<void> {
  const engine = new AutonomousEngine(db, logger);
  await engine.start();
}

// Extend global type
declare global {
  function broadcastToClients(data: object): void;
}
