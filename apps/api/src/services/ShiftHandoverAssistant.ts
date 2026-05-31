import { db } from '../db.js';
import { anomalies } from '../db/schema.js';
import { eq, gte, lte, and } from 'drizzle-orm';
import Groq from 'groq-sdk';
import { LineNotificationService } from './LineNotificationService.js';
import logger from '../utils/logger.js';

interface ShiftHandoverReport {
  shiftDate: Date;
  completedWorkOrders: {
    count: number;
    totalQuantity: number;
    details: Array<{
      workOrderId: number;
      productCode: string;
      quantity: number;
      completedAt: Date;
    }>;
  };
  incompleteWorkOrders: {
    count: number;
    totalQuantity: number;
    details: Array<{
      workOrderId: number;
      productCode: string;
      plannedQuantity: number;
      completedQuantity: number;
      progress: number;
    }>;
  };
  incidents: Array<{
    type: string;
    description: string;
    severity: string;
    resolution: string;
    timestamp: Date;
  }>;
  machineStatus: Array<{
    machineId: number;
    machineName: string;
    status: 'normal' | 'warning' | 'error';
    notes: string;
  }>;
  aiSummary: string;
  recommendations: string[];
}

class ShiftHandoverAssistant {
  private groq: Groq;
  private lineService: LineNotificationService;

  constructor(lineService: LineNotificationService) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.lineService = lineService;
  }

  /**
   * 生成班次交接報告
   */
  async generateShiftHandoverReport(
    shiftDate: Date,
    personnelId: number
  ): Promise<ShiftHandoverReport> {
    try {
      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(0, 0, 0, 0);

      const shiftEnd = new Date(shiftDate);
      shiftEnd.setHours(23, 59, 59, 999);

      // 獲取該班次完成的工單
      const completedRecords = await db
        .select()
        .from(reportingRecords)
        .where(
          and(
            gte(reportingRecords.completedAt, shiftStart),
            lte(reportingRecords.completedAt, shiftEnd)
          )
        );

      const completedWorkOrders = {
        count: completedRecords.length,
        totalQuantity: completedRecords.reduce((sum, r) => sum + r.quantity, 0),
        details: completedRecords.map(r => ({
          workOrderId: r.workOrderId,
          productCode: r.productCode || '',
          quantity: r.quantity,
          completedAt: r.completedAt,
        })),
      };

      // 獲取未完成的工單
      const allWorkOrders = await db
        .select()
        .from(workOrders)
        .where(
          and(
            gte(workOrders.createdAt, shiftStart),
            lte(workOrders.createdAt, shiftEnd)
          )
        );

      const incompleteWorkOrders = {
        count: 0,
        totalQuantity: 0,
        details: [] as any[],
      };

      for (const wo of allWorkOrders) {
        const completed = completedRecords.filter(r => r.workOrderId === wo.id);
        const completedQty = completed.reduce((sum, r) => sum + r.quantity, 0);

        if (completedQty < wo.quantity) {
          incompleteWorkOrders.count++;
          incompleteWorkOrders.totalQuantity += wo.quantity - completedQty;
          incompleteWorkOrders.details.push({
            workOrderId: wo.id,
            productCode: wo.productCode,
            plannedQuantity: wo.quantity,
            completedQuantity: completedQty,
            progress: (completedQty / wo.quantity) * 100,
          });
        }
      }

      // 獲取該班次的警報
      const shiftAlerts = await db
        .select()
        .from(alerts)
        .where(
          and(
            gte(alerts.createdAt, shiftStart),
            lte(alerts.createdAt, shiftEnd)
          )
        );

      const incidents = shiftAlerts.map(alert => ({
        type: alert.type,
        description: alert.description,
        severity: alert.severity,
        resolution: alert.status === 'resolved' ? '已解決' : '待處理',
        timestamp: alert.createdAt,
      }));

      // 獲取機台狀態
      const allMachines = await db.select().from(machines);

      const machineStatus = allMachines.map(machine => {
        const machineAlerts = shiftAlerts.filter(a => a.description.includes(machine.name));
        const hasError = machineAlerts.some(a => a.severity === 'critical');
        const hasWarning = machineAlerts.some(a => a.severity === 'high');

        return {
          machineId: machine.id,
          machineName: machine.name,
          status: hasError ? 'error' : hasWarning ? 'warning' : 'normal',
          notes: machineAlerts.map(a => a.description).join('; '),
        };
      });

      // 使用 AI 生成摘要和建議
      const { summary, recommendations } = await this.generateAISummary(
        completedWorkOrders,
        incompleteWorkOrders,
        incidents,
        machineStatus
      );

      return {
        shiftDate,
        completedWorkOrders,
        incompleteWorkOrders,
        incidents,
        machineStatus,
        aiSummary: summary,
        recommendations,
      };
    } catch (error) {
      logger.error('生成班次交接報告失敗:', error);
      throw error;
    }
  }

  /**
   * 使用 AI 生成摘要和建議
   */
  private async generateAISummary(
    completed: any,
    incomplete: any,
    incidents: any[],
    machineStatus: any[]
  ): Promise<{ summary: string; recommendations: string[] }> {
    try {
      const prompt = `
根據以下班次數據生成簡潔的交接摘要和建議：

完成工單: ${completed.count} 件，總數量 ${completed.totalQuantity} 件
未完成工單: ${incomplete.count} 件，待完成 ${incomplete.totalQuantity} 件
發生事件: ${incidents.length} 件
- ${incidents.map(i => `${i.type}: ${i.description}`).join('\n- ')}

機台狀態:
${machineStatus.map(m => `- ${m.machineName}: ${m.status}`).join('\n')}

請生成：
1. 一句話的班次摘要（最多 50 字）
2. 3-5 項給接班人員的建議

請用 JSON 格式回覆：
{
  "summary": "摘要文字",
  "recommendations": ["建議1", "建議2", ...]
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
              summary: parsed.summary,
              recommendations: parsed.recommendations,
            };
          }
        }
      } catch (error) {
        logger.error('解析 AI 回應失敗:', error);
      }

      return {
        summary: '班次已完成',
        recommendations: ['檢查未完成工單', '確認機台狀態'],
      };
    } catch (error) {
      logger.error('生成 AI 摘要失敗:', error);
      return {
        summary: '班次已完成',
        recommendations: ['檢查未完成工單', '確認機台狀態'],
      };
    }
  }

  /**
   * 發送交接報告給接班人員
   */
  async sendHandoverReportToNextShift(
    report: ShiftHandoverReport,
    nextShiftPersonnelLineUserId: string
  ) {
    try {
      const flexMessage = {
        type: 'flex',
        altText: `📋 班次交接報告 - ${report.shiftDate.toLocaleDateString('zh-TW')}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📋 班次交接報告',
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
                type: 'text',
                text: report.aiSummary,
                wrap: true,
                weight: 'bold',
                size: 'sm',
                margin: 'md',
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '✅ 已完成',
                    weight: 'bold',
                    size: 'sm',
                  },
                  {
                    type: 'text',
                    text: `${report.completedWorkOrders.count} 件工單，共 ${report.completedWorkOrders.totalQuantity} 件`,
                    size: 'xs',
                    color: '#51CF66',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '⏳ 待完成',
                    weight: 'bold',
                    size: 'sm',
                  },
                  {
                    type: 'text',
                    text: `${report.incompleteWorkOrders.count} 件工單，待完成 ${report.incompleteWorkOrders.totalQuantity} 件`,
                    size: 'xs',
                    color: '#FFA500',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '⚠️ 事件',
                    weight: 'bold',
                    size: 'sm',
                  },
                  {
                    type: 'text',
                    text: report.incidents.length > 0 
                      ? `${report.incidents.length} 件事件已記錄`
                      : '無異常事件',
                    size: 'xs',
                    color: report.incidents.length > 0 ? '#FF6B6B' : '#51CF66',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '💡 建議',
                    weight: 'bold',
                    size: 'sm',
                  },
                  ...report.recommendations.slice(0, 3).map(rec => ({
                    type: 'text',
                    text: '• ' + rec,
                    size: 'xs',
                    color: '#666666',
                    wrap: true,
                  })),
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
                  type: 'uri',
                  label: '查看完整報告',
                  uri: `https://app.smartfactory.com/handover/${report.shiftDate.toISOString().split('T')[0]}`,
                },
              },
            ],
          },
        },
      };

      await this.lineService.sendFlexToGroup(nextShiftPersonnelLineUserId, flexMessage);

      logger.info(`班次交接報告已發送給接班人員`);
    } catch (error) {
      logger.error('發送交接報告失敗:', error);
    }
  }

  /**
   * 生成交接報告 PDF
   */
  async generateHandoverReportPDF(report: ShiftHandoverReport): Promise<Buffer> {
    try {
      // 使用 pdfkit 生成 PDF
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      // 標題
      doc.fontSize(20).font('Helvetica-Bold').text('班次交接報告', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(
        `日期: ${report.shiftDate.toLocaleDateString('zh-TW')}`,
        { align: 'center' }
      );
      doc.moveDown();

      // AI 摘要
      doc.fontSize(14).font('Helvetica-Bold').text('班次摘要');
      doc.fontSize(11).font('Helvetica').text(report.aiSummary, { align: 'left' });
      doc.moveDown();

      // 完成工單
      doc.fontSize(14).font('Helvetica-Bold').text('已完成工單');
      doc.fontSize(10).font('Helvetica').text(
        `共 ${report.completedWorkOrders.count} 件，總數量 ${report.completedWorkOrders.totalQuantity} 件`
      );
      doc.moveDown();

      // 未完成工單
      doc.fontSize(14).font('Helvetica-Bold').text('未完成工單');
      doc.fontSize(10).font('Helvetica').text(
        `共 ${report.incompleteWorkOrders.count} 件，待完成 ${report.incompleteWorkOrders.totalQuantity} 件`
      );
      doc.moveDown();

      // 事件記錄
      if (report.incidents.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('事件記錄');
        report.incidents.forEach(incident => {
          doc.fontSize(10).font('Helvetica').text(
            `• ${incident.type}: ${incident.description} (${incident.severity})`
          );
        });
        doc.moveDown();
      }

      // 機台狀態
      doc.fontSize(14).font('Helvetica-Bold').text('機台狀態');
      report.machineStatus.forEach(machine => {
        const statusText = machine.status === 'normal' ? '正常' : machine.status === 'warning' ? '警告' : '錯誤';
        doc.fontSize(10).font('Helvetica').text(
          `• ${machine.machineName}: ${statusText}`
        );
      });
      doc.moveDown();

      // 建議
      doc.fontSize(14).font('Helvetica-Bold').text('建議');
      report.recommendations.forEach(rec => {
        doc.fontSize(10).font('Helvetica').text(`• ${rec}`);
      });

      doc.end();

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('生成交接報告 PDF 失敗:', error);
      throw error;
    }
  }
}

export default ShiftHandoverAssistant;
