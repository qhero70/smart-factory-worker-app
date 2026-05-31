import { Router } from 'express';
import { Database } from '../db/connection';
import { workOrders, reportingLogs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export function setupWorkOrderRoutes(db: Database) {
  const router = Router();

  // 獲取我的工單
  router.get('/mine', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const orders = await db.query.workOrders.findMany({
        where: eq(workOrders.assignedTo, req.userId!),
        orderBy: desc(workOrders.createdAt),
      });

      res.json({ data: orders });
    } catch (error) {
      res.status(500).json({ error: '獲取工單失敗' });
    }
  });

  // 獲取所有工單（主管/管理員）
  router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const orders = await db.query.workOrders.findMany({
        orderBy: desc(workOrders.createdAt),
      });
      res.json({ data: orders });
    } catch (error) {
      res.status(500).json({ error: '獲取工單失敗' });
    }
  });

  // 獲取工單詳情
  router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const order = await db.query.workOrders.findFirst({
        where: eq(workOrders.id, req.params.id),
      });

      if (!order) {
        return res.status(404).json({ error: '工單不存在' });
      }

      res.json({ data: order });
    } catch (error) {
      res.status(500).json({ error: '獲取工單詳情失敗' });
    }
  });

  // 上報生產數據
  router.post('/report', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const {
        workOrderId,
        startTime,
        endTime,
        quantity,
        defectQty,
        downtimeMinutes,
        downtimeReason,
        note,
      } = req.body;

      if (!workOrderId || !startTime || !endTime || !quantity) {
        return res.status(400).json({ error: '缺少必要參數' });
      }

      const [report] = await db
        .insert(reportingLogs)
        .values({
          workOrderId,
          userId: req.userId!,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          quantity,
          defectQty: defectQty || 0,
          downtimeMinutes: downtimeMinutes || 0,
          downtimeReason,
          note,
        })
        .returning();

      // 更新工單統計
      const order = await db.query.workOrders.findFirst({
        where: eq(workOrders.id, workOrderId),
      });

      if (order) {
        await db
          .update(workOrders)
          .set({
            completedQty: (order.completedQty || 0) + quantity,
            defectQty: (order.defectQty || 0) + (defectQty || 0),
          })
          .where(eq(workOrders.id, workOrderId));
      }

      res.json({
        message: '上報成功',
        data: report,
      });
    } catch (error) {
      res.status(500).json({ error: '上報失敗' });
    }
  });

  return router;
}
