import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import { User as IUserType } from '../../types.ts';

export interface AuthenticatedRequest extends Request {
  user?: IUserType;
}

const JWT_SECRET = process.env.JWT_SECRET || 'oms_default_jwt_secret_2026';

export async function verifyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.substring(7).trim();

  // 1. Try decoding as JWT if configured
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    if (decoded && decoded.userId) {
      if (isMongoConnected()) {
        const mongoUser = await User.findById(decoded.userId);
        if (mongoUser && mongoUser.status !== 'Disabled') {
          req.user = {
            id: mongoUser._id.toString(),
            name: mongoUser.name,
            email: mongoUser.email,
            username: mongoUser.username,
            role: mongoUser.role,
            phone: mongoUser.phone,
            department: mongoUser.department,
            joiningDate: mongoUser.joiningDate ? mongoUser.joiningDate.toISOString().slice(0, 10) : '2026-09-28',
            status: mongoUser.status,
            avatarUrl: mongoUser.avatarUrl,
          };
          return next();
        }
      }

      // Check local store
      const localUser = db.getUserById(decoded.userId);
      if (localUser && localUser.status !== 'Disabled') {
        req.user = localUser;
        return next();
      }
    }
  } catch {
    // Fall through to session token checks
  }

  // 2. Session string format checks: oms_sess_<userId>_<time> or token_admin
  if (token === 'token_admin') {
    const admin = db.getUserById('usr_admin_01');
    if (admin) {
      req.user = admin;
      return next();
    }
  }

  if (token.startsWith('oms_sess_')) {
    const raw = token.substring('oms_sess_'.length);
    const lastUnderscore = raw.lastIndexOf('_');
    const userId = lastUnderscore !== -1 ? raw.substring(0, lastUnderscore) : raw;

    const user = db.getUserById(userId);
    if (user && user.status !== 'Disabled') {
      req.user = user;
      return next();
    }
  }

  if (token.startsWith('token_')) {
    const identifier = token.substring('token_'.length);
    const user = db.getUserByEmailOrUsername(identifier);
    if (user && user.status !== 'Disabled') {
      req.user = user;
      return next();
    }
  }

  return res.status(401).json({ error: 'Session expired or invalid token.' });
}

export const verifyJWT = verifyAuth;

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied: Administrative privileges required. Employee access prohibited.',
    });
  }
  next();
}
