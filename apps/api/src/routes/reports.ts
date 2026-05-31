import { Router, Request, Response } from 'express';
import { getReportingSystem } from '../services/ReportingSystem';

const router = Router();
const reportingSystem = getReportingSystem();

/**
 * POST /api/reports/submit
 * 提交單筆報工
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { workOrderId, employeeId, quantity, defects, startTime, endTime, notes } = req.body;

    // 驗證必填欄位
    if (!workOrderId || !employeeId || quantity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必填欄位',
      });
    }

    const result = await reportingSystem.submitReport({
      workOrderId: parseInt(workOrderId),
      employeeId,
      quantity: parseInt(quantity),
      defects: parseInt(defects) || 0,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes,
    });

    res.json({
      status: 'ok',
      reportId: result.reportId,
      message: '報工已提交',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * POST /api/reports/batch
 * 批次提交報工
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { reports } = req.body;

    if (!Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '報工列表不能為空',
      });
    }

    const reportIds = await reportingSystem.batchSubmitReports(
      reports.map((r: any) => ({
        workOrderId: parseInt(r.workOrderId),
        employeeId: r.employeeId,
        quantity: parseInt(r.quantity),
        defects: parseInt(r.defects) || 0,
        startTime: new Date(r.startTime),
        endTime: new Date(r.endTime),
        notes: r.notes,
      }))
    );

    res.json({
      status: 'ok',
      reportIds,
      count: reportIds.length,
      message: `已提交 ${reportIds.length} 筆報工`,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/reports/employee/:id/daily
 * 取得員工今日報工統計
 */
router.get('/employee/:id/daily', async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.id;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    const stats = await reportingSystem.getEmployeeDailyStats(employeeId, date);

    res.json({
      status: 'ok',
      stats,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/reports/workorder/:id/progress
 * 取得工單報工進度
 */
router.get('/workorder/:id/progress', async (req: Request, res: Response) => {
  try {
    const workOrderId = parseInt(req.params.id);

    const progress = await reportingSystem.getWorkOrderProgress(workOrderId);

    res.json({
      status: 'ok',
      progress,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * PUT /api/reports/:id/correct
 * 修正已提交的報工
 */
router.put('/:id/correct', async (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const { quantity, defects, notes } = req.body;

    await reportingSystem.correctReport(reportId, {
      quantity: quantity ? parseInt(quantity) : undefined,
      defects: defects ? parseInt(defects) : undefined,
      notes,
    });

    res.json({
      status: 'ok',
      message: '報工已修正',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

export default router;
