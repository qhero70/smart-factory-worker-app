import { Router } from 'express';
import { Database } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export function setupAuthRoutes(db: Database) {
  const router = Router();

  router.post('/login', async (req, res) => {
    try {
      const { employeeId, pin } = req.body;

      if (!employeeId || !pin) {
        return res.status(400).json({ error: '缺少必要參數' });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.employeeId, employeeId),
      });

      if (!user) {
        return res.status(401).json({ error: '員工ID或PIN碼錯誤' });
      }

      if (!user.pin) {
        return res.status(401).json({ error: '尚未設置PIN碼' });
      }

      const isValidPin = await bcrypt.compare(pin, user.pin);
      if (!isValidPin) {
        return res.status(401).json({ error: '員工ID或PIN碼錯誤' });
      }

      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          role: user.role,
          department: user.department,
        },
      });
    } catch (error) {
      res.status(500).json({ error: '登入失敗' });
    }
  });

  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: '缺少refreshToken' });
      }

      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh-secret'
      ) as { userId: string };

      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
      });

      if (!user) {
        return res.status(401).json({ error: '用戶不存在' });
      }

      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      res.json({ accessToken });
    } catch (error) {
      res.status(401).json({ error: '令牌刷新失敗' });
    }
  });

  return router;
}
