import { Router, Request, Response } from 'express';
import { getSchedulingSystem } from '../services/SchedulingSystem';

const router = Router();
const schedulingSystem = getSchedulingSystem();

/**
 * POST /api/scheduling/auto
 * 自動排程
 */
router.post('/auto', async (req: Request, res: Response) => {
  try {
    const { workOrderIds, date } = req.body;

    const schedules = await schedulingSystem.autoSchedule(
      workOrderIds || [],
      date ? new Date(date) : new Date()
    );

    res.json({
      status: 'ok',
      schedules,
      count: schedules.length,
      message: `已排程 ${schedules.length} 筆工單`,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/scheduling/conflicts
 * 檢測排程衝突
 */
router.get('/conflicts', async (req: Request, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    const conflicts = await schedulingSystem.detectConflicts(date);

    res.json({
      status: 'ok',
      conflicts,
      count: conflicts.length,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/scheduling/gantt
 * 生成甘特圖資料
 */
router.get('/gantt', async (req: Request, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    const ganttData = await schedulingSystem.generateGanttData(date);

    res.json({
      status: 'ok',
      ganttData,
      count: ganttData.length,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/scheduling/suggestions
 * 取得排程優化建議
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    const suggestions = await schedulingSystem.getOptimizationSuggestions(date);

    res.json({
      status: 'ok',
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * PUT /api/scheduling/:id/adjust
 * 手動調整排程
 */
router.put('/:id/adjust', async (req: Request, res: Response) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const { newStartTime, newEndTime } = req.body;

    if (!newStartTime || !newEndTime) {
      return res.status(400).json({
        status: 'error',
        message: '缺少 newStartTime 或 newEndTime',
      });
    }

    await schedulingSystem.adjustSchedule(
      scheduleId,
      new Date(newStartTime),
      new Date(newEndTime)
    );

    res.json({
      status: 'ok',
      message: '排程已調整',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

export default router;
