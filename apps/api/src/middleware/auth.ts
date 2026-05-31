import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  token?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: '未授權' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { userId: string };
    req.userId = decoded.userId;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: '無效的令牌' });
  }
}
