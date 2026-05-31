import { Router } from 'express';
import { getGoogleSheetsSync } from '../services/GoogleSheetsSync';

const router = Router();
const googleSheetsSync = getGoogleSheetsSync();

/**
 * GET /api/sync/status
 * 取得最後同步時間與狀態
 */
router.get('/status', (req, res) => {
  try {
    const logs = googleSheetsSync.getSyncLogs(10);
    const lastSync = logs[logs.length - 1];

    res.json({
      status: 'ok',
      lastSync: lastSync || null,
      recentLogs: logs,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * POST /api/sync/force
 * 手動強制全量同步
 */
router.post('/force', async (req, res) => {
  try {
    await googleSheetsSync.forceSyncAll();

    res.json({
      status: 'ok',
      message: '同步已啟動',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/sync/log
 * 取得同步錯誤日誌
 */
router.get('/log', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = googleSheetsSync.getSyncLogs(limit);

    // 只返回錯誤日誌
    const errorLogs = logs.filter(log => log.status === 'error');

    res.json({
      status: 'ok',
      totalLogs: logs.length,
      errorLogs,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

export default router;
