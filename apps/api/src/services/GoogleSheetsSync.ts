import { getGoogleAuth } from '../config/google.js';
import * as dbModule from '../db.js';
import { users, products, machines, workstations, schedules } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

/**
 * Google Sheets 雙向同步引擎
 * 支援 15 分鐘週期同步和即時寫回
 */

interface SyncLog {
  timestamp: Date;
  operation: 'read' | 'write';
  sheet: string;
  status: 'success' | 'error';
  recordsAffected: number;
  error?: string;
}

class GoogleSheetsSync {
  private syncLogs: SyncLog[] = [];
  private lastSyncTime: Record<string, Date> = {};
  private syncInterval: NodeJS.Timer | null = null;

  /**
   * 啟動定時同步（15分鐘週期）
   */
  startScheduledSync(intervalMinutes: number = 15) {
    console.log(`🔄 啟動 Google Sheets 同步，週期：${intervalMinutes} 分鐘`);

    // 立即執行一次
    this.syncAllSheets();

    // 定時執行
    this.syncInterval = setInterval(() => {
      this.syncAllSheets();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * 停止定時同步
   */
  stopScheduledSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      console.log('⏹️ 已停止 Google Sheets 同步');
    }
  }

  /**
   * 同步所有工作表
   */
  private async syncAllSheets() {
    console.log('📊 開始全量同步 Google Sheets...');

    try {
      // 讀取工作表
      await this.syncFromSheets('01_人員主檔', 'users');
      await this.syncFromSheets('02_產品主檔', 'products');
      await this.syncFromSheets('03_機台主檔', 'machines');
      await this.syncFromSheets('04_工站主檔', 'workstations');
      await this.syncFromSheets('10_排程系統', 'schedules');

      console.log('✅ Google Sheets 同步完成');
    } catch (error) {
      console.error('❌ Google Sheets 同步失敗:', error);
      this.logSync('read', 'all', 'error', 0, String(error));
    }
  }

  /**
   * 從 Google Sheets 讀取資料並同步到資料庫
   */
  private async syncFromSheets(sheetName: string, tableName: string) {
    try {
      const googleAuth = getGoogleAuth();
      const rows = await googleAuth.readSheet(sheetName);

      if (!rows || rows.length === 0) {
        console.log(`⚠️ Sheet "${sheetName}" 為空`);
        return;
      }

      // 第一列是標題
      const headers = rows[0];
      const dataRows = rows.slice(1);

      let recordsAffected = 0;

      for (const row of dataRows) {
        const data = this.mapRowToData(headers, row);

        switch (tableName) {
          case 'users':
            await this.syncUserData(data);
            recordsAffected++;
            break;
          case 'products':
            await this.syncProductData(data);
            recordsAffected++;
            break;
          case 'machines':
            await this.syncMachineData(data);
            recordsAffected++;
            break;
          case 'workstations':
            await this.syncWorkstationData(data);
            recordsAffected++;
            break;
          case 'schedules':
            await this.syncScheduleData(data);
            recordsAffected++;
            break;
        }
      }

      this.logSync('read', sheetName, 'success', recordsAffected);
      console.log(`✅ 同步 "${sheetName}" 完成，影響 ${recordsAffected} 筆記錄`);
    } catch (error) {
      console.error(`❌ 同步 "${sheetName}" 失敗:`, error);
      this.logSync('read', sheetName, 'error', 0, String(error));
    }
  }

  /**
   * 將資料寫回 Google Sheets
   */
  async writeToSheets(sheetName: string, data: any[]) {
    try {
      const googleAuth = getGoogleAuth();

      // 準備資料格式
      const headers = this.getSheetHeaders(sheetName);
      const rows = data.map(item => headers.map(h => item[h] || ''));

      // 清空原有資料
      await googleAuth.clearSheet(sheetName);

      // 寫入標題和資料
      await googleAuth.writeSheet(sheetName, 'A1', [headers, ...rows]);

      this.logSync('write', sheetName, 'success', data.length);
      console.log(`✅ 寫回 "${sheetName}" 完成，共 ${data.length} 筆記錄`);
    } catch (error) {
      console.error(`❌ 寫回 "${sheetName}" 失敗:`, error);
      this.logSync('write', sheetName, 'error', 0, String(error));
    }
  }

  /**
   * 同步使用者資料
   */
  private async syncUserData(data: any) {
    try {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.employeeId, data.employeeId))
        .limit(1);

      if (existingUser.length > 0) {
        // 更新：只有當 Sheets 的資料更新時間較新時才更新
        if (new Date(data.updatedAt) > existingUser[0].updatedAt) {
          await db
            .update(users)
            .set({
              name: data.name,
              email: data.email,
              role: data.role,
              department: data.department,
              lineUserId: data.lineUserId,
              updatedAt: new Date(),
            })
            .where(eq(users.employeeId, data.employeeId));
        }
      } else {
        // 新增
        await db.insert(users).values({
          employeeId: data.employeeId,
          name: data.name,
          email: data.email,
          role: data.role,
          department: data.department,
          lineUserId: data.lineUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('❌ 同步使用者資料失敗:', error);
    }
  }

  /**
   * 同步產品資料
   */
  private async syncProductData(data: any) {
    try {
      const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.productCode, data.productCode))
        .limit(1);

      if (existingProduct.length > 0) {
        if (new Date(data.updatedAt) > existingProduct[0].updatedAt) {
          await db
            .update(products)
            .set({
              name: data.name,
              description: data.description,
              standardCycleTime: parseFloat(data.standardCycleTime),
              updatedAt: new Date(),
            })
            .where(eq(products.productCode, data.productCode));
        }
      } else {
        await db.insert(products).values({
          productCode: data.productCode,
          name: data.name,
          description: data.description,
          standardCycleTime: parseFloat(data.standardCycleTime),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('❌ 同步產品資料失敗:', error);
    }
  }

  /**
   * 同步機台資料
   */
  private async syncMachineData(data: any) {
    try {
      const existingMachine = await db
        .select()
        .from(machines)
        .where(eq(machines.machineCode, data.machineCode))
        .limit(1);

      if (existingMachine.length > 0) {
        if (new Date(data.updatedAt) > existingMachine[0].updatedAt) {
          await db
            .update(machines)
            .set({
              name: data.name,
              status: data.status,
              updatedAt: new Date(),
            })
            .where(eq(machines.machineCode, data.machineCode));
        }
      } else {
        await db.insert(machines).values({
          machineCode: data.machineCode,
          name: data.name,
          status: data.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('❌ 同步機台資料失敗:', error);
    }
  }

  /**
   * 同步工站資料
   */
  private async syncWorkstationData(data: any) {
    try {
      const existingWorkstation = await db
        .select()
        .from(workstations)
        .where(eq(workstations.workstationCode, data.workstationCode))
        .limit(1);

      if (existingWorkstation.length > 0) {
        if (new Date(data.updatedAt) > existingWorkstation[0].updatedAt) {
          await db
            .update(workstations)
            .set({
              name: data.name,
              machineId: data.machineId,
              updatedAt: new Date(),
            })
            .where(eq(workstations.workstationCode, data.workstationCode));
        }
      } else {
        await db.insert(workstations).values({
          workstationCode: data.workstationCode,
          name: data.name,
          machineId: data.machineId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('❌ 同步工站資料失敗:', error);
    }
  }

  /**
   * 同步排程資料
   */
  private async syncScheduleData(data: any) {
    try {
      const existingSchedule = await db
        .select()
        .from(schedules)
        .where(eq(schedules.scheduleCode, data.scheduleCode))
        .limit(1);

      if (existingSchedule.length > 0) {
        if (new Date(data.updatedAt) > existingSchedule[0].updatedAt) {
          await db
            .update(schedules)
            .set({
              workOrderId: data.workOrderId,
              machineId: data.machineId,
              startTime: new Date(data.startTime),
              endTime: new Date(data.endTime),
              status: data.status,
              updatedAt: new Date(),
            })
            .where(eq(schedules.scheduleCode, data.scheduleCode));
        }
      } else {
        await db.insert(schedules).values({
          scheduleCode: data.scheduleCode,
          workOrderId: data.workOrderId,
          machineId: data.machineId,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          status: data.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('❌ 同步排程資料失敗:', error);
    }
  }

  /**
   * 將行資料對應到物件
   */
  private mapRowToData(headers: string[], row: any[]): any {
    const data: any = {};
    headers.forEach((header, index) => {
      data[header] = row[index] || '';
    });
    return data;
  }

  /**
   * 取得工作表標題
   */
  private getSheetHeaders(sheetName: string): string[] {
    const headerMap: Record<string, string[]> = {
      '09_報工系統': ['reportId', 'workOrderId', 'employeeId', 'quantity', 'defects', 'reportedAt'],
      '12_AI與分析': ['analysisId', 'type', 'description', 'result', 'createdAt'],
      '11_檢具系統': ['toolId', 'machineId', 'replacedAt', 'nextReplacement'],
    };

    return headerMap[sheetName] || [];
  }

  /**
   * 記錄同步操作
   */
  private logSync(
    operation: 'read' | 'write',
    sheet: string,
    status: 'success' | 'error',
    recordsAffected: number,
    error?: string
  ) {
    const log: SyncLog = {
      timestamp: new Date(),
      operation,
      sheet,
      status,
      recordsAffected,
      error,
    };

    this.syncLogs.push(log);

    // 只保留最近 1000 筆記錄
    if (this.syncLogs.length > 1000) {
      this.syncLogs = this.syncLogs.slice(-1000);
    }
  }

  /**
   * 取得同步日誌
   */
  getSyncLogs(limit: number = 100): SyncLog[] {
    return this.syncLogs.slice(-limit);
  }

  /**
   * 取得最後同步時間
   */
  getLastSyncTime(sheet: string): Date | null {
    return this.lastSyncTime[sheet] || null;
  }

  /**
   * 手動強制全量同步
   */
  async forceSyncAll(): Promise<void> {
    console.log('🔄 執行手動強制全量同步...');
    await this.syncAllSheets();
  }
}

// 導出單例
let googleSheetsSync: GoogleSheetsSync | null = null;

export function getGoogleSheetsSync(): GoogleSheetsSync {
  if (!googleSheetsSync) {
    googleSheetsSync = new GoogleSheetsSync();
  }
  return googleSheetsSync;
}

export default GoogleSheetsSync;
