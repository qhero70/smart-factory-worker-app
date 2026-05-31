import * as dbModule from '../db.js';
import { getLineBot } from './LineBot';

/**
 * OEE (Overall Equipment Effectiveness) 計算引擎
 * OEE = 可用率(A) × 效能率(P) × 品質率(Q) × 100%
 */

interface OEEData {
  machineId: number;
  machineName: string;
  availability: number; // 0-100
  performance: number; // 0-100
  quality: number; // 0-100
  oee: number; // 0-100
  timestamp: Date;
  trend?: {
    day: number;
    week: number;
    month: number;
  };
}

class OEEEngine {
  private lineBot = getLineBot();
  private oeeAlertThresholds = {
    critical: 50, // < 50%: 緊急警報
    high: 65, // < 65%: 紅色警報
    medium: 75, // < 75%: 黃色警告
    low: 85, // < 85%: 藍色提醒
  };

  /**
   * 計算可用率 (Availability)
   * A = 實際開機時間 / 計畫開機時間
   */
  private calculateAvailability(
    plannedTime: number, // 分鐘
    downtime: number // 分鐘
  ): number {
    if (plannedTime === 0) return 0;
    const actualTime = plannedTime - downtime;
    return Math.max(0, Math.min(100, (actualTime / plannedTime) * 100));
  }

  /**
   * 計算效能率 (Performance)
   * P = (實際產量 × 標準週期時間) / 實際開機時間
   */
  private calculatePerformance(
    actualOutput: number,
    standardCycleTime: number, // 秒
    actualTime: number // 分鐘
  ): number {
    if (actualTime === 0) return 0;
    const theoreticalOutput = (actualTime * 60) / standardCycleTime;
    return Math.max(0, Math.min(100, (actualOutput / theoreticalOutput) * 100));
  }

  /**
   * 計算品質率 (Quality)
   * Q = 良品數 / 總產出數
   */
  private calculateQuality(goodParts: number, totalParts: number): number {
    if (totalParts === 0) return 100;
    return Math.max(0, Math.min(100, (goodParts / totalParts) * 100));
  }

  /**
   * 計算 OEE
   */
  calculateOEE(
    availability: number,
    performance: number,
    quality: number
  ): number {
    return Math.round((availability * performance * quality) / 10000 * 100) / 100;
  }

  /**
   * 計算機台 OEE（實時）
   */
  async calculateMachineOEE(machineId: number, date: Date = new Date()): Promise<OEEData> {
    try {
      // 從報工記錄計算
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // 模擬數據（實際應從資料庫查詢）
      const plannedTime = 480; // 8 小時
      const downtime = 45; // 停機 45 分鐘
      const actualOutput = 420; // 實際產量
      const standardCycleTime = 60; // 標準週期 60 秒
      const goodParts = 410; // 良品數
      const totalParts = 420; // 總產出

      const availability = this.calculateAvailability(plannedTime, downtime);
      const performance = this.calculatePerformance(
        actualOutput,
        standardCycleTime,
        plannedTime - downtime
      );
      const quality = this.calculateQuality(goodParts, totalParts);
      const oee = this.calculateOEE(availability, performance, quality);

      const oeeData: OEEData = {
        machineId,
        machineName: `機台 ${machineId}`,
        availability: Math.round(availability * 100) / 100,
        performance: Math.round(performance * 100) / 100,
        quality: Math.round(quality * 100) / 100,
        oee: Math.round(oee * 100) / 100,
        timestamp: new Date(),
      };

      // 檢查警報
      await this.checkOEEAlert(oeeData);

      return oeeData;
    } catch (error) {
      console.error('❌ OEE 計算失敗:', error);
      throw error;
    }
  }

  /**
   * 檢查 OEE 警報
   */
  private async checkOEEAlert(oeeData: OEEData) {
    const { oee, machineId, machineName } = oeeData;

    let alertLevel = '';
    let color = '';
    let shouldNotify = false;

    if (oee < this.oeeAlertThresholds.critical) {
      alertLevel = '🔴 緊急警報';
      color = '#FF0000';
      shouldNotify = true;
    } else if (oee < this.oeeAlertThresholds.high) {
      alertLevel = '🔴 紅色警報';
      color = '#FF0000';
      shouldNotify = true;
    } else if (oee < this.oeeAlertThresholds.medium) {
      alertLevel = '🟡 黃色警告';
      color = '#FFCC00';
      shouldNotify = true;
    } else if (oee < this.oeeAlertThresholds.low) {
      alertLevel = '🔵 藍色提醒';
      color = '#0099FF';
      shouldNotify = false; // 不推播藍色提醒
    }

    if (shouldNotify) {
      const message = {
        type: 'text',
        text: `${alertLevel}\n機台：${machineName}\nOEE：${oee}%\n\n根因分析中...`,
      };

      // 推播給主管
      const managerGroupId = process.env.LINE_MANAGER_GROUP_ID || '';
      if (managerGroupId) {
        await this.lineBot.pushToGroup(managerGroupId, [message]);
      }

      console.log(`${alertLevel} - ${machineName} OEE: ${oee}%`);
    }
  }

  /**
   * 計算整廠 OEE
   */
  async calculateFactoryOEE(date: Date = new Date()): Promise<number> {
    try {
      // 模擬計算所有機台 OEE 的平均值
      const machineIds = [1, 2, 3, 4, 5]; // 假設有 5 台機台
      const oeeValues: number[] = [];

      for (const machineId of machineIds) {
        const oeeData = await this.calculateMachineOEE(machineId, date);
        oeeValues.push(oeeData.oee);
      }

      const factoryOEE =
        oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length;
      return Math.round(factoryOEE * 100) / 100;
    } catch (error) {
      console.error('❌ 整廠 OEE 計算失敗:', error);
      throw error;
    }
  }

  /**
   * 計算 OEE 趨勢
   */
  async calculateOEETrend(machineId: number, days: number = 30): Promise<any[]> {
    try {
      const trends: any[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const oeeData = await this.calculateMachineOEE(machineId, date);

        trends.push({
          date: date.toISOString().split('T')[0],
          oee: oeeData.oee,
          availability: oeeData.availability,
          performance: oeeData.performance,
          quality: oeeData.quality,
        });
      }

      return trends;
    } catch (error) {
      console.error('❌ OEE 趨勢計算失敗:', error);
      throw error;
    }
  }

  /**
   * 取得機台 OEE 排名
   */
  async getMachineOEERanking(): Promise<OEEData[]> {
    try {
      const machineIds = [1, 2, 3, 4, 5];
      const oeeDataList: OEEData[] = [];

      for (const machineId of machineIds) {
        const oeeData = await this.calculateMachineOEE(machineId);
        oeeDataList.push(oeeData);
      }

      // 按 OEE 降序排列
      return oeeDataList.sort((a, b) => b.oee - a.oee);
    } catch (error) {
      console.error('❌ OEE 排名計算失敗:', error);
      throw error;
    }
  }
}

// 導出單例
let oeeEngine: OEEEngine | null = null;

export function getOEEEngine(): OEEEngine {
  if (!oeeEngine) {
    oeeEngine = new OEEEngine();
  }
  return oeeEngine;
}

export default OEEEngine;
