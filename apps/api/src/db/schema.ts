import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  boolean,
  numeric,
  varchar,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============== Users ==============
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: varchar('employee_id', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(), // ADMIN, MANAGER, SUPERVISOR, OPERATOR, VIEWER
    department: varchar('department', { length: 100 }).notNull(),
    lineUserId: varchar('line_user_id', { length: 255 }),
    expoPushToken: text('expo_push_token'),
    avatar: text('avatar'),
    isActive: boolean('is_active').default(true),
    pin: varchar('pin', { length: 255 }), // hashed PIN
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    employeeIdIdx: index('users_employee_id_idx').on(table.employeeId),
    roleIdx: index('users_role_idx').on(table.role),
  })
);

// ============== Work Orders ==============
export const workOrders = pgTable(
  'work_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
    productCode: varchar('product_code', { length: 50 }).notNull(),
    productName: varchar('product_name', { length: 200 }).notNull(),
    machineId: uuid('machine_id'),
    quantity: integer('quantity').notNull(),
    completedQty: integer('completed_qty').default(0),
    defectQty: integer('defect_qty').default(0),
    plannedStart: timestamp('planned_start'),
    plannedEnd: timestamp('planned_end'),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, IN_PROGRESS, PAUSED, COMPLETED, CANCELLED
    assignedTo: uuid('assigned_to'),
    qrCode: text('qr_code'),
    priority: varchar('priority', { length: 20 }).default('MEDIUM'), // LOW, MEDIUM, HIGH
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    orderNoIdx: index('work_orders_order_no_idx').on(table.orderNo),
    statusIdx: index('work_orders_status_idx').on(table.status),
    assignedToIdx: index('work_orders_assigned_to_idx').on(table.assignedTo),
    machineIdIdx: index('work_orders_machine_id_idx').on(table.machineId),
  })
);

// ============== Reporting Logs ==============
export const reportingLogs = pgTable(
  'reporting_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id').notNull(),
    userId: uuid('user_id').notNull(),
    machineId: uuid('machine_id'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    quantity: integer('quantity').notNull(),
    defectQty: integer('defect_qty').default(0),
    downtimeMinutes: integer('downtime_minutes').default(0),
    downtimeReason: text('downtime_reason'),
    note: text('note'),
    location: varchar('location', { length: 200 }),
    deviceId: varchar('device_id', { length: 100 }),
    imageUrls: jsonb('image_urls').$type<string[]>(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    workOrderIdIdx: index('reporting_logs_work_order_id_idx').on(
      table.workOrderId
    ),
    userIdIdx: index('reporting_logs_user_id_idx').on(table.userId),
    createdAtIdx: index('reporting_logs_created_at_idx').on(table.createdAt),
  })
);

// ============== Machines ==============
export const machines = pgTable(
  'machines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    machineCode: varchar('machine_code', { length: 50 }).notNull().unique(),
    machineName: varchar('machine_name', { length: 100 }).notNull(),
    area: varchar('area', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('IDLE'), // RUNNING, IDLE, MAINTENANCE, ERROR
    oeeRate: numeric('oee_rate', { precision: 5, scale: 2 }).default('0'),
    lastHeartbeat: timestamp('last_heartbeat'),
    currentWorkOrderId: uuid('current_work_order_id'),
    operatorId: uuid('operator_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    machineCodeIdx: index('machines_machine_code_idx').on(table.machineCode),
    statusIdx: index('machines_status_idx').on(table.status),
    areaIdx: index('machines_area_idx').on(table.area),
  })
);

// ============== Anomalies ==============
export const anomalies = pgTable(
  'anomalies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 50 }).notNull(), // MACHINE_ERROR, QUALITY, MATERIAL, SAFETY, OTHER
    severity: varchar('severity', { length: 20 }).notNull(), // CRITICAL, HIGH, MEDIUM, LOW
    machineId: uuid('machine_id'),
    workOrderId: uuid('work_order_id'),
    reportedBy: uuid('reported_by').notNull(),
    description: text('description').notNull(),
    imageUrl: text('image_url'),
    status: varchar('status', { length: 50 }).default('OPEN'), // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    aiAnalysis: text('ai_analysis'),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    machineIdIdx: index('anomalies_machine_id_idx').on(table.machineId),
    severityIdx: index('anomalies_severity_idx').on(table.severity),
    statusIdx: index('anomalies_status_idx').on(table.status),
    createdAtIdx: index('anomalies_created_at_idx').on(table.createdAt),
  })
);

// ============== Tool Alerts ==============
export const toolAlerts = pgTable(
  'tool_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    toolCode: varchar('tool_code', { length: 50 }).notNull(),
    machineName: varchar('machine_name', { length: 100 }).notNull(),
    lifePercent: integer('life_percent').notNull(),
    alertType: varchar('alert_type', { length: 50 }).notNull(),
    isAcknowledged: boolean('is_acknowledged').default(false),
    notifiedAt: timestamp('notified_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    machineNameIdx: index('tool_alerts_machine_name_idx').on(table.machineName),
    lifePercentIdx: index('tool_alerts_life_percent_idx').on(table.lifePercent),
  })
);

// ============== Notifications ==============
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body').notNull(),
    type: varchar('type', { length: 50 }).notNull(), // INFO, WARNING, ALERT, ERROR
    data: jsonb('data'),
    isRead: boolean('is_read').default(false),
    sentAt: timestamp('sent_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    isReadIdx: index('notifications_is_read_idx').on(table.isRead),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  })
);

// ============== AI Insights ==============
export const aiInsights = pgTable(
  'ai_insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 50 }).notNull(),
    input: text('input').notNull(),
    result: text('result').notNull(),
    confidence: numeric('confidence', { precision: 3, scale: 2 }),
    recommendation: text('recommendation'),
    actionTaken: boolean('action_taken').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    typeIdx: index('ai_insights_type_idx').on(table.type),
    createdAtIdx: index('ai_insights_created_at_idx').on(table.createdAt),
  })
);

// ============== Attendance Logs ==============
export const attendanceLogs = pgTable(
  'attendance_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    checkIn: timestamp('check_in').notNull(),
    checkOut: timestamp('check_out'),
    location: varchar('location', { length: 200 }),
    shiftType: varchar('shift_type', { length: 50 }), // MORNING, AFTERNOON, NIGHT
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('attendance_logs_user_id_idx').on(table.userId),
    checkInIdx: index('attendance_logs_check_in_idx').on(table.checkIn),
  })
);
