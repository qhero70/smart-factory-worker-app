import { Router } from 'express';
import { getOEEEngine } from '../services/OEEEngine';

const router = Router();
const oeeEngine = getOEEEngine();

/**
 * GET /api/oee/realtime
 * 所有機台即時 OEE
 */
router.get('/realtime', async (req, res) => {
  try {
    const ranking = await oeeEngine.getMachineOEERanking();
    const factoryOEE = await oeeEngine.calculateFactoryOEE();

    res.json({
      status: 'ok',
      factoryOEE,
      machines: ranking,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/oee/machine/:id
 * 特定機台 OEE（支援 period 參數）
 */
router.get('/machine/:id', async (req, res) => {
  try {
    const machineId = parseInt(req.params.id);
    const period = (req.query.period as string) || 'day';

    const oeeData = await oeeEngine.calculateMachineOEE(machineId);

    res.json({
      status: 'ok',
      machineId,
      period,
      oeeData,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/oee/trend
 * OEE 趨勢（支援 days 參數）
 */
router.get('/trend', async (req, res) => {
  try {
    const machineId = parseInt(req.query.machineId as string) || 1;
    const days = parseInt(req.query.days as string) || 30;

    const trend = await oeeEngine.calculateOEETrend(machineId, days);

    res.json({
      status: 'ok',
      machineId,
      days,
      trend,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

/**
 * GET /api/oee/ranking
 * 機台 OEE 排名
 */
router.get('/ranking', async (req, res) => {
  try {
    const ranking = await oeeEngine.getMachineOEERanking();

    res.json({
      status: 'ok',
      ranking,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: String(error),
    });
  }
});

export default router;
