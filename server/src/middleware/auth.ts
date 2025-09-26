import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface JwtUser {
  id: number;
  role: 'student'|'lecturer'|'admin';
}

export function requireAuth(req: Request & { user?: JwtUser }, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as JwtUser;
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(roles: Array<JwtUser['role']>) {
  return (req: Request & { user?: JwtUser }, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// Augment Express Request globally so req.user is typed everywhere
declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}