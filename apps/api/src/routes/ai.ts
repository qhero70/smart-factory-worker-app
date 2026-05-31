import { Router } from 'express';
import { Database } from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AIService } from '../services/AIService';

export function setupAIRoute(db: Database) {
  const router = Router();
  const aiService = new AIService();

  // AI 分析
  router.post('/analyze', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { type, input } = req.body;

      if (!type || !input) {
        return res.status(400).json({ error: '缺少必要參數' });
      }

      const result = await aiService.analyze(type, input);

      res.json({
        data: result,
      });
    } catch (error) {
      res.status(500).json({ error: 'AI分析失敗' });
    }
  });

  // AI 語音助理
  router.post('/voice', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: '缺少文本輸入' });
      }

      const response = await aiService.chat(text);

      res.json({
        data: response,
      });
    } catch (error) {
      res.status(500).json({ error: 'AI對話失敗' });
    }
  });

  return router;
}
