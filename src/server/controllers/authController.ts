import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

// ====================================================
// JWT SECRET
// ====================================================

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not configured. Add JWT_SECRET to the server environment variables.'
    );
  }

  return secret;
};

// ====================================================
// APPLICATION DATE
// Uses India timezone for date consistency.
// ====================================================

const getApplicationDate = (): string => {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year =
    parts.find((part) => part.type === 'year')?.value || '';

  const month =
    parts.find((part) => part.type === 'month')?.value || '';

  const day =
    parts.find((part) => part.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
};

// ====================================================
// MAP MONGO USER TO SAFE API USER
// ====================================================

const mapMongoUser = (mongoUser: any) => ({
  id: mongoUser._id.toString(),
  name: mongoUser.name,
  email: mongoUser.email,
  username: mongoUser.username,
  role: mongoUser.role,
  phone: mongoUser.phone || '',
  department: mongoUser.department || '',
  joiningDate: mongoUser.joiningDate
    ? mongoUser.joiningDate.toISOString().slice(0, 10)
    : '',
  status: mongoUser.status,
  avatarUrl: mongoUser.avatarUrl,
});

// ====================================================
// LOGIN
// ====================================================

export async function login(
  req: Request,
  res: Response
) {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      error:
        'Email or username and password are required.',
    });
  }

  const clean = String(identifier)
    .trim()
    .toLowerCase();

  // ==================================================
  // MONGODB AUTHENTICATION
  // ==================================================

  if (isMongoConnected()) {
    try {
      const mongoUser = await User.findOne({
        $or: [
          { email: clean },
          { username: clean },
        ],
      }).select('+password');

      if (mongoUser) {
        if (mongoUser.status === 'Disabled') {
          return res.status(403).json({
            error:
              'Employee account has been disabled.',
          });
        }

        const isMatch =
          await mongoUser.comparePassword(password);

        if (!isMatch) {
          return res.status(401).json({
            error:
              'Invalid password. Please check your credentials.',
          });
        }

        const token = jwt.sign(
          {
            userId: mongoUser._id.toString(),
            role: mongoUser.role,
          },
          getJwtSecret(),
          {
            expiresIn: '7d',
          }
        );

        return res.json({
          token,
          user: mapMongoUser(mongoUser),
        });
      }
    } catch (err: any) {
      console.warn(
        '[Auth] Mongo login error, checking local fallback:',
        err?.message || err
      );
    }
  }

  // ==================================================
  // LOCAL STORE AUTHENTICATION
  // Development fallback only.
  // ==================================================

  const user =
    db.getUserByEmailOrUsername(clean);

  if (!user) {
    return res.status(401).json({
      error:
        'Invalid credentials. User not found.',
    });
  }

  if (user.status === 'Disabled') {
    return res.status(403).json({
      error:
        'Employee account has been disabled.',
    });
  }

  // Local users must have a password.
  if (!user.password) {
    return res.status(401).json({
      error:
        'This account does not have a valid password configured.',
    });
  }

  if (user.password !== password) {
    return res.status(401).json({
      error:
        'Invalid password. Please check your credentials.',
    });
  }

  const token = `oms_sess_${user.id}_${Date.now().toString(36)}`;

  const {
    password: _password,
    ...safeUser
  } = user;

  return res.json({
    token,
    user: safeUser,
  });
}

// ====================================================
// GET CURRENT USER
// ====================================================

export async function getMe(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Not authenticated.',
    });
  }

  const {
    password: _password,
    ...safeUser
  } = req.user as any;

  return res.json({
    user: safeUser,
  });
}

// ====================================================
// LOGOUT
// ====================================================

export async function logout(
  _req: Request,
  res: Response
) {
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

// ====================================================
// FORGOT PASSWORD
// ====================================================

export async function forgotPassword(
  req: Request,
  res: Response
) {
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({
      error:
        'Email or username is required.',
    });
  }

  const clean = String(identifier)
    .trim()
    .toLowerCase();

  /*
   * Keep password recovery responses generic.
   *
   * Do not:
   * - expose whether a user exists
   * - expose an email address
   * - expose passwords
   * - expose demo credentials
   */

  if (isMongoConnected()) {
    try {
      await User.findOne({
        $or: [
          { email: clean },
          { username: clean },
        ],
      });
    } catch (err: any) {
      console.warn(
        '[Auth] Forgot-password lookup error:',
        err?.message || err
      );
    }
  } else {
    db.getUserByEmailOrUsername(clean);
  }

  return res.json({
    success: true,
    message:
      'If an account is registered with the supplied identifier, password recovery instructions will be sent.',
  });
}