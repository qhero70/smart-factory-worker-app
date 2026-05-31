import { eq, and, desc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  InsertUser, users, 
  InsertPersonnel, personnel,
  InsertProduct, products,
  InsertWorkOrder, workOrders,
  InsertMachine, machines,
  InsertReportingRecord, reportingRecords,
  InsertAlert, alerts,
  InsertLineNotification, lineNotifications,
  InsertAIAnalysis, aiAnalysis,
  InsertSystemSetting, systemSettings,
  InsertPermission, permissions,
} from "./db/schema.js";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

// 懶加載 drizzle 實例，以便本地工具可以在沒有資料庫的情況下運行
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = await mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] 連接失敗:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _db = null;
    _pool = null;
  }
}

// 匯出 db 物件（用於同步操作）
export const db = {
  getDb,
  closeDb,
  // 以下為資料庫操作函數
  upsertUser,
  getUserByOpenId,
  getPersonnelList,
  getPersonnelById,
  createPersonnel,
  updatePersonnel,
  getProductList,
  getProductById,
  createProduct,
  getMachineList,
  getMachineById,
  createMachine,
  updateMachineStatus,
  getWorkOrderList,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrderStatus,
  createReportingRecord,
  getReportingRecordsByWorkOrder,
  createAlert,
  getActiveAlerts,
  updateAlertStatus,
  createLineNotification,
  getPendingLineNotifications,
  updateLineNotificationStatus,
  createAIAnalysis,
  getLatestAIAnalysis,
  getSystemSetting,
  updateSystemSetting,
  getUserPermissions,
  grantPermission,
};

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const database = await getDb();
  if (!database) {
    console.warn("[Database] 無法 upsert 使用者：資料庫不可用");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await database.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] 無法 upsert 使用者:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const database = await getDb();
  if (!database) {
    console.warn("[Database] 無法取得使用者：資料庫不可用");
    return undefined;
  }

  const result = await database.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== 人員管理 API =====

export async function getPersonnelList() {
  const database = await getDb();
  if (!database) return [];
  return await database.select().from(personnel).orderBy(desc(personnel.createdAt));
}

export async function getPersonnelById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(personnel).where(eq(personnel.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPersonnel(data: InsertPersonnel) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  const result = await database.insert(personnel).values(data);
  return result;
}

export async function updatePersonnel(id: number, data: Partial<InsertPersonnel>) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.update(personnel).set(data).where(eq(personnel.id, id));
}

// ===== 產品管理 API =====

export async function getProductList() {
  const database = await getDb();
  if (!database) return [];
  return await database.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProductById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createProduct(data: InsertProduct) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.insert(products).values(data);
}

// ===== 機台管理 API =====

export async function getMachineList() {
  const database = await getDb();
  if (!database) return [];
  return await database.select().from(machines).orderBy(desc(machines.createdAt));
}

export async function getMachineById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(machines).where(eq(machines.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createMachine(data: InsertMachine) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.insert(machines).values(data);
}

export async function updateMachineStatus(id: number, status: string) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.update(machines).set({ status: status as any }).where(eq(machines.id, id));
}

// ===== 工單管理 API =====

export async function getWorkOrderList() {
  const database = await getDb();
  if (!database) return [];
  return await database.select().from(workOrders).orderBy(desc(workOrders.createdAt));
}

export async function getWorkOrderById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(workOrders).where(eq(workOrders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createWorkOrder(data: InsertWorkOrder) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.insert(workOrders).values(data);
}

export async function updateWorkOrderStatus(id: number, status: string) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.update(workOrders).set({ status: status as any }).where(eq(workOrders.id, id));
}

// ===== 報工紀錄 API =====

export async function createReportingRecord(data: InsertReportingRecord) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.insert(reportingRecords).values(data);
}

export async function getReportingRecordsByWorkOrder(workOrderId: number) {
  const database = await getDb();
  if (!database) return [];
  return await database.select().from(reportingRecords).where(eq(reportingRecords.workOrderId, workOrderId));
}

// ===== 異常警報 API =====

export async function createAlert(data: InsertAlert) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.insert(alerts).values(data);
}

export async function getActiveAlerts() {
  const database = await getDb();
  if (!database) return [];
  return await database.select().from(alerts).where(eq(alerts.status, "active")).orderBy(desc(alerts.createdAt));
}

export async function updateAlertStatus(id: number, status: string) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.update(alerts).set({ status: status as any }).where(eq(alerts.id, id));
}

// ===== LINE 通知 API =====

export async function createLineNotification(data: InsertLineNotification) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.insert(lineNotifications).values(data);
}

export async function getPendingLineNotifications() {
  const database = await getDb();
  if (!database) return [];
  return await database.select().from(lineNotifications).where(eq(lineNotifications.status, "pending"));
}

export async function updateLineNotificationStatus(id: number, status: string) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.update(lineNotifications).set({ status: status as any, sentAt: new Date() }).where(eq(lineNotifications.id, id));
}

// ===== AI 分析 API =====

export async function createAIAnalysis(data: InsertAIAnalysis) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.insert(aiAnalysis).values(data);
}

export async function getLatestAIAnalysis(analysisType: string) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(aiAnalysis).where(eq(aiAnalysis.analysisType, analysisType)).orderBy(desc(aiAnalysis.createdAt)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ===== 系統設定 API =====

export async function getSystemSetting(key: string) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(systemSettings).where(eq(systemSettings.settingKey, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSystemSetting(key: string, value: string) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  const existing = await getSystemSetting(key);
  if (existing) {
    return await database.update(systemSettings).set({ settingValue: value }).where(eq(systemSettings.settingKey, key));
  } else {
    return await database.insert(systemSettings).values({ settingKey: key, settingValue: value });
  }
}

// ===== 權限管理 API =====

export async function getUserPermissions(userId: number) {
  const database = await getDb();
  if (!database) return [];
  return await database.select().from(permissions).where(eq(permissions.userId, userId));
}

export async function grantPermission(userId: number, module: string, permission: string) {
  const database = await getDb();
  if (!database) throw new Error("資料庫不可用");
  return await database.insert(permissions).values({ userId, module, permission });
}
