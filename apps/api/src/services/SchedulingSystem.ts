import * as dbModule from '../db.js';
import { schedules, workOrders, machines } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';

/**
 * 排程系統與甘特圖
 * 支援 APS 自動排程、衝突檢測、優化建議
 */

interface ScheduleItem {
  workOrderId: number;
  machineId: number;
  startTime: Date;
  endTime: Date;
  priority: number;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed';
}

interface GanttData {
  id: string;
  name: string;
  type: 'machine' | 'workorder';
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  resourceId?: number;
}

class SchedulingSystem {
  /**
   * 自動排程（APS 演算法）
   */
  async autoSchedule(workOrderIds: number[], date: Date = new Date()): Promise<ScheduleItem[]> {
    try {
      const scheduledItems: ScheduleItem[] = [];

      // 取得工單資訊
      const workOrderList = await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.status, 'pending'));

      // 取得機台資訊
      const machineList = await db
        .select()
        .from(machines);

      // 簡單的 FIFO 排程演算法
      let currentTime = new Date(date);
      currentTime.setHours(6, 0, 0, 0); // 從早上 6 點開始

      for (const workOrder of workOrderList) {
        // 計算所需時間
        const cycleTime = 60; // 秒
        const requiredTime = (workOrder.quantity * cycleTime) / 60; // 分鐘

        // 選擇最空閒的機台
        const selectedMachine = await this.selectBestMachine(machineList, currentTime);

        if (selectedMachine) {
          const endTime = new Date(currentTime.getTime() + requiredTime * 60 * 1000);

          const scheduleItem: ScheduleItem = {
            workOrderId: workOrder.id,
            machineId: selectedMachine.id,
            startTime: currentTime,
            endTime: endTime,
            priority: workOrder.priority || 5,
            status: 'scheduled',
          };

          scheduledItems.push(scheduleItem);

          // 儲存到資料庫
          await db.insert(schedules).values({
            workOrderId: workOrder.id,
            machineId: selectedMachine.id,
            startTime: currentTime,
            endTime: endTime,
            status: 'scheduled',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // 更新當前時間
          currentTime = endTime;

          // 檢查是否超過工作時間（下午 5 點）
          if (currentTime.getHours() >= 17) {
            currentTime.setDate(currentTime.getDate() + 1);
            currentTime.setHours(6, 0, 0, 0);
          }
        }
      }

      console.log(`✅ 自動排程完成，共 ${scheduledItems.length} 筆工單`);
      return scheduledItems;
    } catch (error) {
      console.error('❌ 自動排程失敗:', error);
      throw error;
    }
  }

  /**
   * 選擇最佳機台
   */
  private async selectBestMachine(machines: any[], startTime: Date) {
    // 簡化版本：選擇第一台可用的機台
    for (const machine of machines) {
      const conflicts = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.machineId, machine.id),
            gte(schedules.startTime, new Date(startTime.getTime() - 3600000)),
            lte(schedules.startTime, new Date(startTime.getTime() + 3600000))
          )
        );

      if (conflicts.length === 0) {
        return machine;
      }
    }

    return machines[0]; // 預設返回第一台
  }

  /**
   * 檢測排程衝突
   */
  async detectConflicts(date: Date = new Date()): Promise<any[]> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySchedules = await db
        .select()
        .from(schedules)
        .where(
          and(
            gte(schedules.startTime, dayStart),
            lte(schedules.startTime, dayEnd)
          )
        );

      const conflicts: any[] = [];

      // 檢查同一機台的時間重疊
      const machineGroups = new Map<number, any[]>();

      for (const schedule of daySchedules) {
        const machineId = schedule.machineId;
        if (!machineGroups.has(machineId)) {
          machineGroups.set(machineId, []);
        }
        machineGroups.get(machineId)!.push(schedule);
      }

      for (const [machineId, scheduleList] of machineGroups) {
        for (let i = 0; i < scheduleList.length; i++) {
          for (let j = i + 1; j < scheduleList.length; j++) {
            const s1 = scheduleList[i];
            const s2 = scheduleList[j];

            // 檢查時間重疊
            if (s1.startTime < s2.endTime && s2.startTime < s1.endTime) {
              conflicts.push({
                machineId,
                schedule1: s1,
                schedule2: s2,
                severity: 'high',
                message: `機台 ${machineId} 的工單 #${s1.workOrderId} 和 #${s2.workOrderId} 時間衝突`,
              });
            }
          }
        }
      }

      if (conflicts.length > 0) {
        console.log(`⚠️ 檢測到 ${conflicts.length} 個排程衝突`);
      }

      return conflicts;
    } catch (error) {
      console.error('❌ 衝突檢測失敗:', error);
      throw error;
    }
  }

  /**
   * 生成甘特圖資料
   */
  async generateGanttData(date: Date = new Date()): Promise<GanttData[]> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const ganttData: GanttData[] = [];

      // 取得機台清單
      const machineList = await db.select().from(machines);

      // 為每台機台建立群組
      for (const machine of machineList) {
        ganttData.push({
          id: `machine-${machine.id}`,
          name: machine.name,
          type: 'machine',
          start: dayStart,
          end: dayEnd,
          progress: 0,
          dependencies: [],
          resourceId: machine.id,
        });

        // 取得該機台的排程
        const machineSchedules = await db
          .select()
          .from(schedules)
          .where(
            and(
              eq(schedules.machineId, machine.id),
              gte(schedules.startTime, dayStart),
              lte(schedules.startTime, dayEnd)
            )
          );

        // 為每個排程建立甘特圖項目
        for (const schedule of machineSchedules) {
          const workOrder = await db
            .select()
            .from(workOrders)
            .where(eq(workOrders.id, schedule.workOrderId))
            .limit(1);

          if (workOrder.length > 0) {
            const wo = workOrder[0];
            const progress = (wo.completedQuantity / wo.quantity) * 100;

            ganttData.push({
              id: `workorder-${schedule.workOrderId}`,
              name: `${wo.productName} (${wo.quantity} 件)`,
              type: 'workorder',
              start: schedule.startTime,
              end: schedule.endTime,
              progress: Math.round(progress),
              dependencies: [`machine-${machine.id}`],
              resourceId: machine.id,
            });
          }
        }
      }

      return ganttData;
    } catch (error) {
      console.error('❌ 甘特圖生成失敗:', error);
      throw error;
    }
  }

  /**
   * 取得排程優化建議
   */
  async getOptimizationSuggestions(date: Date = new Date()): Promise<string[]> {
    try {
      const suggestions: string[] = [];

      // 檢測衝突
      const conflicts = await this.detectConflicts(date);
      if (conflicts.length > 0) {
        suggestions.push(`⚠️ 檢測到 ${conflicts.length} 個排程衝突，建議重新排程`);
      }

      // 檢查機台利用率
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const machineList = await db.select().from(machines);

      for (const machine of machineList) {
        const scheduleList = await db
          .select()
          .from(schedules)
          .where(
            and(
              eq(schedules.machineId, machine.id),
              gte(schedules.startTime, dayStart),
              lte(schedules.startTime, dayEnd)
            )
          );

        const totalScheduleTime = scheduleList.reduce((sum, s) => {
          return sum + (s.endTime.getTime() - s.startTime.getTime());
        }, 0);

        const workingHours = 11 * 60 * 60 * 1000; // 11 小時
        const utilization = (totalScheduleTime / workingHours) * 100;

        if (utilization < 50) {
          suggestions.push(`📊 機台 ${machine.name} 利用率低 (${utilization.toFixed(0)}%)，建議增加工單`);
        } else if (utilization > 90) {
          suggestions.push(`⚠️ 機台 ${machine.name} 利用率高 (${utilization.toFixed(0)}%)，可能會超時`);
        }
      }

      return suggestions;
    } catch (error) {
      console.error('❌ 取得優化建議失敗:', error);
      throw error;
    }
  }

  /**
   * 手動調整排程
   */
  async adjustSchedule(scheduleId: number, newStartTime: Date, newEndTime: Date) {
    try {
      // 檢查新時間是否有衝突
      const schedule = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, scheduleId))
        .limit(1);

      if (schedule.length === 0) {
        throw new Error(`排程 #${scheduleId} 不存在`);
      }

      const conflicts = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.machineId, schedule[0].machineId),
            gte(schedules.startTime, new Date(newStartTime.getTime() - 3600000)),
            lte(schedules.startTime, new Date(newEndTime.getTime() + 3600000))
          )
        );

      if (conflicts.length > 1) {
        throw new Error('新時間與其他排程衝突');
      }

      // 更新排程
      await db
        .update(schedules)
        .set({
          startTime: newStartTime,
          endTime: newEndTime,
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, scheduleId));

      console.log(`✅ 排程 #${scheduleId} 已調整`);
    } catch (error) {
      console.error('❌ 調整排程失敗:', error);
      throw error;
    }
  }
}

// 導出單例
let schedulingSystem: SchedulingSystem | null = null;

export function getSchedulingSystem(): SchedulingSystem {
  if (!schedulingSystem) {
    schedulingSystem = new SchedulingSystem();
  }
  return schedulingSystem;
}

export default SchedulingSystem;
