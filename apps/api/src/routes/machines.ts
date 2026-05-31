import { Router } from 'express';
import { Database } from '../db/connection';
import { machines } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

export function setupMachineRoutes(db: Database) {
  const router = Router();

  // 獲取所有機台
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const data = await db.query.machines.findMany({
        orderBy: desc(machines.createdAt),
      });
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: '獲取機台列表失敗' });
    }
  });

  // 獲取機台詳情
  router.get('/:id', authMiddleware, async (req, res) => {
    try {
      const machine = await db.query.machines.findFirst({
        where: eq(machines.id, req.params.id),
      });

      if (!machine) {
        return res.status(404).json({ error: '機台不存在' });
      }

      res.json({ data: machine });
    } catch (error) {
      res.status(500).json({ error: '獲取機台詳情失敗' });
    }
  });

  // 更新機台狀態（心跳檢測）
  router.post('/:id/heartbeat', async (req, res) => {
    try {
      const { status, oeeRate } = req.body;

      const [updated] = await db
        .update(machines)
        .set({
          status: status || 'RUNNING',
          oeeRate: oeeRate ? oeeRate.toString() : undefined,
          lastHeartbeat: new Date(),
        })
        .where(eq(machines.id, req.params.id))
        .returning();

      res.json({ data: updated });
    } catch (error) {
      res.status(500).json({ error: '更新機台狀態失敗' });
    }
  });

  return router;
}
