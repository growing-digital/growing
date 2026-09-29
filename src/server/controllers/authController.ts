import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'oms_default_jwt_secret_2026';

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email or username and password are required.' });
  }

  const clean = identifier.trim().toLowerCase();

  // If MongoDB is connected, query MongoDB
  if (isMongoConnected()) {
    try {
      const mongoUser = await User.findOne({
        $or: [{ email: clean }, { username: clean }],
      }).select('+password');

      if (mongoUser) {
        if (mongoUser.status === 'Disabled') {
          return res.status(403).json({ error: 'Employee account has been disabled.' });
        }

        const isMatch = await mongoUser.comparePassword(password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
        }

        const token = jwt.sign(
          { userId: mongoUser._id.toString(), role: mongoUser.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          token,
          user: {
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
          },
        });
      }
    } catch (err: any) {
      console.warn('[Auth] Mongo login error, checking fallback store:', err.message);
    }
  }

  // Local store authentication
  const user = db.getUserByEmailOrUsername(clean);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  if (user.status === 'Disabled') {
    return res.status(403).json({ error: 'Employee account has been disabled.' });
  }

  if (user.password && user.password !== password) {
    return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
  }

  const token = `oms_sess_${user.id}_${Date.now().toString(36)}`;
  const { password: _, ...safeUser } = user;

  return res.json({
    token,
    user: safeUser,
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const { password: _, ...safeUser } = req.user as any;
  res.json({ user: safeUser });
}

export async function logout(_req: Request, res: Response) {
  res.json({ success: true, message: 'Logged out successfully.' });
}

export async function forgotPassword(req: Request, res: Response) {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Email or username is required.' });
  }

  const clean = identifier.trim().toLowerCase();
  let userEmail = clean;

  if (isMongoConnected()) {
    const u = await User.findOne({ $or: [{ email: clean }, { username: clean }] });
    if (u) userEmail = u.email;
  } else {
    const u = db.getUserByEmailOrUsername(clean);
    if (u) userEmail = u.email;
  }

  res.json({
    success: true,
    message: `Password reset instructions sent to ${userEmail}. Use default demo password "admin123" for Administrator.`,
  });
}
