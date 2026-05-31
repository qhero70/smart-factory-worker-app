import { db } from '../db.js';
import { personnel, machines, skillMatrix } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { LineNotificationService } from './LineNotificationService.js';
import logger from '../utils/logger.js';

interface SkillLevel {
  machineId: number;
  machineName: string;
  level: 1 | 2 | 3 | 4 | 5; // 1=新手, 2=初級, 3=中級, 4=高級, 5=專家
  certificationDate?: Date;
  lastTrainingDate?: Date;
  trainingHours: number;
}

interface PersonnelSkillProfile {
  personnelId: number;
  name: string;
  position: string;
  skills: SkillLevel[];
  overallLevel: number; // 平均技能等級
  certifications: string[];
}

class SkillMatrixManager {
  private lineService: LineNotificationService;

  constructor(lineService: LineNotificationService) {
    this.lineService = lineService;
  }

  /**
   * 獲取人員技能檔案
   */
  async getPersonnelSkillProfile(personnelId: number): Promise<PersonnelSkillProfile> {
    try {
      const person = await db
        .select()
        .from(personnel)
        .where(eq(personnel.id, personnelId))
        .limit(1);

      if (!person.length) {
        throw new Error(`人員 ${personnelId} 不存在`);
      }

      // 獲取技能矩陣數據
      const skills = await db
        .select()
        .from(skillMatrix)
        .where(eq(skillMatrix.personnelId, personnelId));

      // 獲取機台信息
      const skillsWithMachineInfo = await Promise.all(
        skills.map(async skill => {
          const machine = await db
            .select()
            .from(machines)
            .where(eq(machines.id, skill.machineId))
            .limit(1);

          return {
            machineId: skill.machineId,
            machineName: machine[0]?.name || `機台 ${skill.machineId}`,
            level: skill.skillLevel as 1 | 2 | 3 | 4 | 5,
            certificationDate: skill.certificationDate,
            lastTrainingDate: skill.lastTrainingDate,
            trainingHours: skill.trainingHours || 0,
          };
        })
      );

      // 計算平均技能等級
      const overallLevel =
        skillsWithMachineInfo.length > 0
          ? skillsWithMachineInfo.reduce((sum, s) => sum + s.level, 0) /
            skillsWithMachineInfo.length
          : 0;

      // 獲取認證
      const certifications = skillsWithMachineInfo
        .filter(s => s.certificationDate)
        .map(s => `${s.machineName} (${s.level}級)`);

      return {
        personnelId,
        name: person[0].name,
        position: person[0].position || '未定義',
        skills: skillsWithMachineInfo,
        overallLevel,
        certifications,
      };
    } catch (error) {
      logger.error('獲取人員技能檔案失敗:', error);
      throw error;
    }
  }

  /**
   * 更新人員技能等級
   */
  async updateSkillLevel(
    personnelId: number,
    machineId: number,
    newLevel: 1 | 2 | 3 | 4 | 5,
    trainingHours?: number
  ) {
    try {
      // 檢查是否已有該技能記錄
      const existingSkill = await db
        .select()
        .from(skillMatrix)
        .where(
          and(
            eq(skillMatrix.personnelId, personnelId),
            eq(skillMatrix.machineId, machineId)
          )
        )
        .limit(1);

      if (existingSkill.length > 0) {
        // 更新現有技能
        await db
          .update(skillMatrix)
          .set({
            skillLevel: newLevel,
            trainingHours: (existingSkill[0].trainingHours || 0) + (trainingHours || 0),
            lastTrainingDate: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(skillMatrix.personnelId, personnelId),
              eq(skillMatrix.machineId, machineId)
            )
          );
      } else {
        // 新增技能
        await db.insert(skillMatrix).values({
          personnelId,
          machineId,
          skillLevel: newLevel,
          trainingHours: trainingHours || 0,
          lastTrainingDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      logger.info(
        `人員 ${personnelId} 的機台 ${machineId} 技能已更新為 ${newLevel} 級`
      );

      // 發送通知
      await this.sendSkillUpdateNotification(personnelId, machineId, newLevel);
    } catch (error) {
      logger.error('更新人員技能等級失敗:', error);
      throw error;
    }
  }

  /**
   * 認證人員技能
   */
  async certifySkill(
    personnelId: number,
    machineId: number,
    certificationLevel: 1 | 2 | 3 | 4 | 5
  ) {
    try {
      // 更新技能等級
      await this.updateSkillLevel(personnelId, machineId, certificationLevel);

      // 更新認證日期
      await db
        .update(skillMatrix)
        .set({
          certificationDate: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(skillMatrix.personnelId, personnelId),
            eq(skillMatrix.machineId, machineId)
          )
        );

      logger.info(
        `人員 ${personnelId} 已獲得機台 ${machineId} 的 ${certificationLevel} 級認證`
      );

      // 發送認證通知
      await this.sendCertificationNotification(personnelId, machineId, certificationLevel);
    } catch (error) {
      logger.error('認證人員技能失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取技能矩陣（所有人員 × 所有機台）
   */
  async getSkillMatrix() {
    try {
      const allPersonnel = await db.select().from(personnel);
      const allMachines = await db.select().from(machines);

      const matrix: Record<number, Record<number, number>> = {};

      for (const person of allPersonnel) {
        matrix[person.id] = {};
        for (const machine of allMachines) {
          const skill = await db
            .select()
            .from(skillMatrix)
            .where(
              and(
                eq(skillMatrix.personnelId, person.id),
                eq(skillMatrix.machineId, machine.id)
              )
            )
            .limit(1);

          matrix[person.id][machine.id] = skill.length > 0 ? skill[0].skillLevel : 0;
        }
      }

      return {
        personnel: allPersonnel.map(p => ({ id: p.id, name: p.name })),
        machines: allMachines.map(m => ({ id: m.id, name: m.name })),
        matrix,
      };
    } catch (error) {
      logger.error('獲取技能矩陣失敗:', error);
      throw error;
    }
  }

  /**
   * 推薦合適的操作員
   */
  async recommendOperator(
    machineId: number,
    requiredLevel: 1 | 2 | 3 | 4 | 5 = 3
  ): Promise<PersonnelSkillProfile[]> {
    try {
      // 獲取所有人員的技能
      const allPersonnel = await db.select().from(personnel);

      const qualifiedPersonnel: PersonnelSkillProfile[] = [];

      for (const person of allPersonnel) {
        const skill = await db
          .select()
          .from(skillMatrix)
          .where(
            and(
              eq(skillMatrix.personnelId, person.id),
              eq(skillMatrix.machineId, machineId)
            )
          )
          .limit(1);

        if (skill.length > 0 && skill[0].skillLevel >= requiredLevel) {
          const profile = await this.getPersonnelSkillProfile(person.id);
          qualifiedPersonnel.push(profile);
        }
      }

      // 按平均技能等級排序
      qualifiedPersonnel.sort((a, b) => b.overallLevel - a.overallLevel);

      return qualifiedPersonnel;
    } catch (error) {
      logger.error('推薦操作員失敗:', error);
      throw error;
    }
  }

  /**
   * 識別培訓需求
   */
  async identifyTrainingNeeds(
    targetLevel: 1 | 2 | 3 | 4 | 5 = 3
  ): Promise<{
    personnelId: number;
    name: string;
    machineId: number;
    machineName: string;
    currentLevel: number;
    targetLevel: number;
    trainingHoursNeeded: number;
  }[]> {
    try {
      const allPersonnel = await db.select().from(personnel);
      const allMachines = await db.select().from(machines);
      const trainingNeeds = [];

      for (const person of allPersonnel) {
        for (const machine of allMachines) {
          const skill = await db
            .select()
            .from(skillMatrix)
            .where(
              and(
                eq(skillMatrix.personnelId, person.id),
                eq(skillMatrix.machineId, machine.id)
              )
            )
            .limit(1);

          const currentLevel = skill.length > 0 ? skill[0].skillLevel : 0;

          if (currentLevel < targetLevel) {
            // 估算培訓時數（每級 20 小時）
            const trainingHoursNeeded = (targetLevel - currentLevel) * 20;

            trainingNeeds.push({
              personnelId: person.id,
              name: person.name,
              machineId: machine.id,
              machineName: machine.name,
              currentLevel,
              targetLevel,
              trainingHoursNeeded,
            });
          }
        }
      }

      // 按培訓時數排序（優先級最高的在前）
      trainingNeeds.sort((a, b) => b.trainingHoursNeeded - a.trainingHoursNeeded);

      return trainingNeeds;
    } catch (error) {
      logger.error('識別培訓需求失敗:', error);
      throw error;
    }
  }

  /**
   * 發送技能更新通知
   */
  private async sendSkillUpdateNotification(
    personnelId: number,
    machineId: number,
    newLevel: number
  ) {
    try {
      const person = await db
        .select()
        .from(personnel)
        .where(eq(personnel.id, personnelId))
        .limit(1);

      const machine = await db
        .select()
        .from(machines)
        .where(eq(machines.id, machineId))
        .limit(1);

      const levelNames = ['未定義', '新手', '初級', '中級', '高級', '專家'];

      const flexMessage = {
        type: 'flex',
        altText: `✅ 技能更新 - ${person[0]?.name}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '✅ 技能等級已更新',
                weight: 'bold',
                size: 'xl',
                color: '#51CF66',
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
                    text: '人員:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: person[0]?.name || '未知',
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
                    text: '機台:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: machine[0]?.name || `機台 ${machineId}`,
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
                    text: '新等級:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: levelNames[newLevel] || '未定義',
                    wrap: true,
                    color: '#51CF66',
                    size: 'sm',
                    flex: 5,
                    weight: 'bold',
                  },
                ],
              },
            ],
          },
        },
      };

      const hrManagerLineUserId = process.env.LINE_HR_MANAGER_USER_ID;
      if (hrManagerLineUserId) {
        await this.lineService.sendFlexToGroup(hrManagerLineUserId, flexMessage);
      }

      logger.info(`技能更新通知已發送給人資主管`);
    } catch (error) {
      logger.error('發送技能更新通知失敗:', error);
    }
  }

  /**
   * 發送認證通知
   */
  private async sendCertificationNotification(
    personnelId: number,
    machineId: number,
    certificationLevel: number
  ) {
    try {
      const person = await db
        .select()
        .from(personnel)
        .where(eq(personnel.id, personnelId))
        .limit(1);

      const machine = await db
        .select()
        .from(machines)
        .where(eq(machines.id, machineId))
        .limit(1);

      const levelNames = ['未定義', '新手', '初級', '中級', '高級', '專家'];

      const flexMessage = {
        type: 'flex',
        altText: `🏆 認證完成 - ${person[0]?.name}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🏆 技能認證完成',
                weight: 'bold',
                size: 'xl',
                color: '#FFD700',
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
                text: `${person[0]?.name} 已獲得 ${machine[0]?.name} 的 ${levelNames[certificationLevel]} 級認證！`,
                wrap: true,
                weight: 'bold',
                size: 'sm',
              },
            ],
          },
        },
      };

      const hrManagerLineUserId = process.env.LINE_HR_MANAGER_USER_ID;
      if (hrManagerLineUserId) {
        await this.lineService.sendFlexToGroup(hrManagerLineUserId, flexMessage);
      }

      logger.info(`認證通知已發送給人資主管`);
    } catch (error) {
      logger.error('發送認證通知失敗:', error);
    }
  }
}

export default SkillMatrixManager;
