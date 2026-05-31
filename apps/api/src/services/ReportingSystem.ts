import { db } from '../db.js';
import { workOrders, reports, users } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getLineBot } from './LineBot';
import { getGoogleSheetsSync } from './GoogleSheetsSync';

/**
 * 報工系統完整流程
 * 支援 QR 掃碼、驗證、同步、異常處理
 */

interface ReportData {
  workOrderId: number;
  employeeId: string;
  quantity: number;
  defects: number;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

interface ReportValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class ReportingSystem {
  private lineBot = getLineBot();
  private googleSheetsSync = getGoogleSheetsSync();

  /**
   * 驗證報工資料
   */
  async validateReport(data: ReportData): Promise<ReportValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 檢查工單是否存在
    const workOrder = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, data.workOrderId))
      .limit(1);

    if (workOrder.length === 0) {
      errors.push(`工單 #${data.workOrderId} 不存在`);
    } else {
      // 檢查數量是否超過工單量
      const wo = workOrder[0];
      const totalReported = wo.completedQuantity + data.quantity;

      if (totalReported > wo.quantity) {
        errors.push(
          `報工數量 ${data.quantity} 超過剩餘量 ${wo.quantity - wo.completedQuantity}`
        );
      }

      // 檢查不良率是否異常
      const defectRate = (data.defects / data.quantity) * 100;
      if (defectRate > 10) {
        warnings.push(`不良率 ${defectRate.toFixed(2)}% 異常高，請確認`);
      }
    }

    // 檢查員工是否存在
    const employee = await db
      .select()
      .from(users)
      .where(eq(users.employeeId, data.employeeId))
      .limit(1);

    if (employee.length === 0) {
      errors.push(`員工 ${data.employeeId} 不存在`);
    }

    // 檢查時間邏輯
    if (data.endTime <= data.startTime) {
      errors.push('結束時間必須晚於開始時間');
    }

    const duration = (data.endTime.getTime() - data.startTime.getTime()) / 1000 / 60; // 分鐘
    if (duration > 480) {
      // 超過 8 小時
      warnings.push(`報工時長 ${duration.toFixed(0)} 分鐘異常長`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 提交報工
   */
  async submitReport(data: ReportData): Promise<{ reportId: number; success: boolean }> {
    try {
      // 驗證資料
      const validation = await this.validateReport(data);

      if (!validation.isValid) {
        throw new Error(`驗證失敗: ${validation.errors.join(', ')}`);
      }

      // 計算工作時間（分鐘）
      const duration = (data.endTime.getTime() - data.startTime.getTime()) / 1000 / 60;

      // 建立報工記錄
      const result = await db
        .insert(reports)
        .values({
          workOrderId: data.workOrderId,
          employeeId: data.employeeId,
          quantity: data.quantity,
          defects: data.defects,
          defectRate: (data.defects / data.quantity) * 100,
          duration: duration,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes || '',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: reports.id });

      const reportId = result[0]?.id || 0;

      // 更新工單進度
      await db
        .update(workOrders)
        .set({
          completedQuantity: workOrders.completedQuantity + data.quantity,
          defectiveQuantity: workOrders.defectiveQuantity + data.defects,
          updatedAt: new Date(),
        })
        .where(eq(workOrders.id, data.workOrderId));

      // 同步到 Google Sheets
      await this.syncReportToSheets(reportId, data);

      // 發送 LINE 通知
      await this.notifyReportSubmitted(data, reportId);

      // 檢查工單是否完成
      const updatedWorkOrder = await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, data.workOrderId))
        .limit(1);

      if (updatedWorkOrder[0]?.completedQuantity >= updatedWorkOrder[0]?.quantity) {
        await this.notifyWorkOrderCompleted(updatedWorkOrder[0]);
      }

      console.log(`✅ 報工 #${reportId} 已提交`);

      return {
        reportId,
        success: true,
      };
    } catch (error) {
      console.error('❌ 報工提交失敗:', error);
      throw error;
    }
  }

  /**
   * 同步報工到 Google Sheets
   */
  private async syncReportToSheets(reportId: number, data: ReportData) {
    try {
      const reportData = [
        [
          reportId,
          data.workOrderId,
          data.employeeId,
          data.quantity,
          data.defects,
          new Date().toISOString(),
        ],
      ];

      await this.googleSheetsSync.writeToSheets('09_報工系統', reportData);
      console.log(`✅ 報工 #${reportId} 已同步到 Google Sheets`);
    } catch (error) {
      console.error('❌ 同步報工到 Google Sheets 失敗:', error);
    }
  }

  /**
   * 發送報工通知
   */
  private async notifyReportSubmitted(data: ReportData, reportId: number) {
    try {
      const employee = await db
        .select()
        .from(users)
        .where(eq(users.employeeId, data.employeeId))
        .limit(1);

      const workOrder = await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, data.workOrderId))
        .limit(1);

      if (employee.length > 0 && employee[0].lineUserId) {
        const message = {
          type: 'text',
          text: `✅ 報工已記錄\n\n工單: #${data.workOrderId}\n數量: ${data.quantity} 件\n不良: ${data.defects} 件\n報工 ID: #${reportId}`,
        };

        await this.lineBot.pushMessage(employee[0].lineUserId, [message]);
      }

      // 推播給班長
      const supervisorGroupId = process.env.LINE_SUPERVISOR_GROUP_ID || '';
      if (supervisorGroupId) {
        const message = {
          type: 'text',
          text: `📝 ${employee[0]?.name || data.employeeId} 提交報工\n工單: #${data.workOrderId}\n數量: ${data.quantity} 件`,
        };

        await this.lineBot.pushToGroup(supervisorGroupId, [message]);
      }
    } catch (error) {
      console.error('❌ 發送報工通知失敗:', error);
    }
  }

  /**
   * 通知工單完成
   */
  private async notifyWorkOrderCompleted(workOrder: any) {
    try {
      const managerGroupId = process.env.LINE_MANAGER_GROUP_ID || '';

      if (managerGroupId) {
        const message = {
          type: 'text',
          text: `🎉 工單完成\n工單 ID: #${workOrder.id}\n產品: ${workOrder.productName}\n總數量: ${workOrder.quantity} 件\n不良率: ${((workOrder.defectiveQuantity / workOrder.quantity) * 100).toFixed(2)}%`,
        };

        await this.lineBot.pushToGroup(managerGroupId, [message]);
      }

      console.log(`✅ 工單 #${workOrder.id} 完成通知已發送`);
    } catch (error) {
      console.error('❌ 發送工單完成通知失敗:', error);
    }
  }

  /**
   * 取得員工今日報工統計
   */
  async getEmployeeDailyStats(employeeId: string, date: Date = new Date()) {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyReports = await db
        .select()
        .from(reports)
        .where(
          and(
            eq(reports.employeeId, employeeId),
            gte(reports.createdAt, dayStart),
            lte(reports.createdAt, dayEnd)
          )
        );

      const totalQuantity = dailyReports.reduce((sum, r) => sum + r.quantity, 0);
      const totalDefects = dailyReports.reduce((sum, r) => sum + r.defects, 0);
      const totalDuration = dailyReports.reduce((sum, r) => sum + r.duration, 0);

      return {
        employeeId,
        date: date.toISOString().split('T')[0],
        reportCount: dailyReports.length,
        totalQuantity,
        totalDefects,
        defectRate: totalQuantity > 0 ? (totalDefects / totalQuantity) * 100 : 0,
        totalDuration,
        reports: dailyReports,
      };
    } catch (error) {
      console.error('❌ 取得員工統計失敗:', error);
      throw error;
    }
  }

  /**
   * 取得工單報工進度
   */
  async getWorkOrderProgress(workOrderId: number) {
    try {
      const workOrder = await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, workOrderId))
        .limit(1);

      if (workOrder.length === 0) {
        throw new Error(`工單 #${workOrderId} 不存在`);
      }

      const wo = workOrder[0];
      const progress = (wo.completedQuantity / wo.quantity) * 100;

      const workOrderReports = await db
        .select()
        .from(reports)
        .where(eq(reports.workOrderId, workOrderId));

      return {
        workOrderId,
        productName: wo.productName,
        totalQuantity: wo.quantity,
        completedQuantity: wo.completedQuantity,
        defectiveQuantity: wo.defectiveQuantity,
        progress: Math.round(progress),
        defectRate: wo.completedQuantity > 0 ? (wo.defectiveQuantity / wo.completedQuantity) * 100 : 0,
        reportCount: workOrderReports.length,
        status: progress >= 100 ? 'completed' : 'in_progress',
      };
    } catch (error) {
      console.error('❌ 取得工單進度失敗:', error);
      throw error;
    }
  }

  /**
   * 批次報工（多工單）
   */
  async batchSubmitReports(reports: ReportData[]): Promise<number[]> {
    try {
      const reportIds: number[] = [];

      for (const report of reports) {
        const result = await this.submitReport(report);
        reportIds.push(result.reportId);
      }

      console.log(`✅ 批次報工完成，共 ${reportIds.length} 筆`);
      return reportIds;
    } catch (error) {
      console.error('❌ 批次報工失敗:', error);
      throw error;
    }
  }

  /**
   * 修正報工（更新已提交的報工）
   */
  async correctReport(reportId: number, data: Partial<ReportData>) {
    try {
      const existingReport = await db
        .select()
        .from(reports)
        .where(eq(reports.id, reportId))
        .limit(1);

      if (existingReport.length === 0) {
        throw new Error(`報工 #${reportId} 不存在`);
      }

      const oldReport = existingReport[0];

      // 更新報工記錄
      await db
        .update(reports)
        .set({
          quantity: data.quantity || oldReport.quantity,
          defects: data.defects || oldReport.defects,
          notes: data.notes || oldReport.notes,
          updatedAt: new Date(),
        })
        .where(eq(reports.id, reportId));

      // 更新工單進度
      const quantityDiff = (data.quantity || oldReport.quantity) - oldReport.quantity;
      const defectsDiff = (data.defects || oldReport.defects) - oldReport.defects;

      await db
        .update(workOrders)
        .set({
          completedQuantity: workOrders.completedQuantity + quantityDiff,
          defectiveQuantity: workOrders.defectiveQuantity + defectsDiff,
          updatedAt: new Date(),
        })
        .where(eq(workOrders.id, oldReport.workOrderId));

      console.log(`✅ 報工 #${reportId} 已修正`);
    } catch (error) {
      console.error('❌ 修正報工失敗:', error);
      throw error;
    }
  }
}

// 導出單例
let reportingSystem: ReportingSystem | null = null;

export function getReportingSystem(): ReportingSystem {
  if (!reportingSystem) {
    reportingSystem = new ReportingSystem();
  }
  return reportingSystem;
}

export default ReportingSystem;
