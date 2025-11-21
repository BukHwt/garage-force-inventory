import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Authentication will fail until it is configured.');
}

type TokenPayload = {
  sub: string;
  name: string;
  role: string;
};

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Authentication is not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('Auth error: token expired', { expiredAt: error.expiredAt });
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireEditor(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role === 'VIEWER') {
    return res.status(403).json({ error: 'View-only users cannot modify inventory' });
  }

  next();
}
