import { getDatabase } from './db/connection';
import {
  users,
  workOrders,
  machines,
  reportingLogs,
  anomalies,
} from './db/schema';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  try {
    const db = await getDatabase();
    console.log('🌱 Starting seed...');

    // 清空現有數據
    await db.delete(reportingLogs);
    await db.delete(workOrders);
    await db.delete(anomalies);
    await db.delete(machines);
    await db.delete(users);

    // 創建用戶
    const hashedPin = await bcrypt.hash('1234', 10);
    const operatorId = uuidv4();
    const managerId = uuidv4();

    await db.insert(users).values([
      {
        id: operatorId,
        employeeId: 'EMP001',
        name: '王小明',
        role: 'OPERATOR',
        department: '生產部',
        pin: hashedPin,
        isActive: true,
      },
      {
        id: managerId,
        employeeId: 'EMP002',
        name: '李經理',
        role: 'MANAGER',
        department: '生產部',
        pin: hashedPin,
        isActive: true,
      },
      {
        employeeId: 'EMP003',
        name: '陳主任',
        role: 'SUPERVISOR',
        department: '生產部',
        pin: hashedPin,
        isActive: true,
      },
    ]);

    console.log('✅ Users created');

    // 創建機台
    const machineIds = [
      uuidv4(),
      uuidv4(),
      uuidv4(),
      uuidv4(),
      uuidv4(),
    ];

    await db.insert(machines).values(
      machineIds.map((id, idx) => ({
        id,
        machineCode: `M${String(idx + 1).padStart(3, '0')}`,
        machineName: `機台${idx + 1}`,
        area: `區域${Math.floor(idx / 2) + 1}`,
        status: idx % 2 === 0 ? 'RUNNING' : 'IDLE',
        oeeRate: String(70 + Math.random() * 20),
        lastHeartbeat: new Date(),
        operatorId: operatorId,
      }))
    );

    console.log('✅ Machines created');

    // 創建工單
    const orderIds: string[] = [];
    const baseTime = new Date();

    for (let i = 0; i < 10; i++) {
      const orderId = uuidv4();
      orderIds.push(orderId);

      await db.insert(workOrders).values({
        id: orderId,
        orderNo: `ORD-${String(i + 1).padStart(4, '0')}`,
        productCode: `PROD${String(i + 1).padStart(3, '0')}`,
        productName: `產品${i + 1}`,
        quantity: 100 + Math.random() * 200,
        completedQty: Math.floor(Math.random() * 100),
        defectQty: Math.floor(Math.random() * 10),
        status: i < 5 ? 'IN_PROGRESS' : 'PENDING',
        assignedTo: operatorId,
        machineId: machineIds[i % machineIds.length],
        priority: ['HIGH', 'MEDIUM', 'LOW'][i % 3],
        plannedStart: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
        plannedEnd: new Date(baseTime.getTime() + (i + 8) * 60 * 60 * 1000),
      });
    }

    console.log('✅ Work orders created');

    // 創建報工日誌
    for (let i = 0; i < 20; i++) {
      await db.insert(reportingLogs).values({
        workOrderId: orderIds[i % orderIds.length],
        userId: operatorId,
        machineId: machineIds[i % machineIds.length],
        startTime: new Date(baseTime.getTime() + i * 30 * 60 * 1000),
        endTime: new Date(baseTime.getTime() + (i + 1) * 30 * 60 * 1000),
        quantity: 10 + Math.floor(Math.random() * 20),
        defectQty: Math.floor(Math.random() * 3),
        downtimeMinutes: Math.floor(Math.random() * 30),
        downtimeReason: ['刀具磨損', '進料卡住', '機械故障', null][
          Math.floor(Math.random() * 4)
        ],
      });
    }

    console.log('✅ Reporting logs created');

    // 創建異常記錄
    await db.insert(anomalies).values([
      {
        type: 'MACHINE_ERROR',
        severity: 'HIGH',
        machineId: machineIds[0],
        reportedBy: operatorId,
        description: '機台震動異常',
        status: 'OPEN',
      },
      {
        type: 'QUALITY',
        severity: 'MEDIUM',
        machineId: machineIds[1],
        reportedBy: operatorId,
        description: '尺寸超公差',
        status: 'OPEN',
      },
      {
        type: 'MATERIAL',
        severity: 'LOW',
        reportedBy: operatorId,
        description: '原料缺貨',
        status: 'OPEN',
      },
    ]);

    console.log('✅ Anomalies created');

    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
