import { Router } from 'express';
import { Database } from '../db/connection';
import { anomalies } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export function setupAnomalyRoutes(db: Database) {
  const router = Router();

  // 獲取異常列表
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const data = await db.query.anomalies.findMany({
        orderBy: desc(anomalies.createdAt),
      });
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: '獲取異常列表失敗' });
    }
  });

  // 回報異常
  router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const {
        type,
        severity,
        machineId,
        workOrderId,
        description,
        imageUrl,
      } = req.body;

      if (!type || !severity || !description) {
        return res.status(400).json({ error: '缺少必要參數' });
      }

      const [created] = await db
        .insert(anomalies)
        .values({
          type,
          severity,
          machineId,
          workOrderId,
          reportedBy: req.userId!,
          description,
          imageUrl,
          status: 'OPEN',
        })
        .returning();

      // 廣播異常警報
      if (global.broadcastToClients) {
        global.broadcastToClients({
          type: 'ANOMALY_ALERT',
          severity,
          payload: created,
        });
      }

      res.json({
        message: '異常已回報',
        data: created,
      });
    } catch (error) {
      res.status(500).json({ error: '回報異常失敗' });
    }
  });

  return router;
}
