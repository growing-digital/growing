import type {
  Request,
  Response,
  NextFunction,
} from 'express';

import jwt from 'jsonwebtoken';
import { User } from '../models/User.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';

import type {
  User as IUserType,
} from '../../types.ts';

// ====================================================
// AUTHENTICATED REQUEST
// ====================================================

export interface AuthenticatedRequest
  extends Request {
  user?: IUserType;
}

// ====================================================
// JWT SECRET
// ====================================================

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not configured.'
    );
  }

  return secret;
};

// ====================================================
// VERIFY AUTH
// ====================================================

export async function verifyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    return res.status(401).json({
      error:
        'Authentication required. Missing Bearer token.',
    });
  }

  const token = authHeader
    .substring(7)
    .trim();

  if (!token) {
    return res.status(401).json({
      error:
        'Authentication required. Invalid Bearer token.',
    });
  }

  // ==================================================
  // 1. JWT AUTHENTICATION
  // ==================================================

  try {
    const decoded = jwt.verify(
      token,
      getJwtSecret()
    ) as {
      userId: string;
      role: string;
    };

    if (
      decoded &&
      decoded.userId
    ) {
      // ----------------------------------------------
      // MongoDB user
      // ----------------------------------------------

      if (isMongoConnected()) {
        const mongoUser =
          await User.findById(
            decoded.userId
          );

        if (
          mongoUser &&
          mongoUser.status !== 'Disabled'
        ) {
          req.user = {
            id: mongoUser._id.toString(),
            name: mongoUser.name,
            email: mongoUser.email,
            username: mongoUser.username,
            role: mongoUser.role,
            phone: mongoUser.phone || '',
            department:
              mongoUser.department || '',

            joiningDate:
              mongoUser.joiningDate
                ? mongoUser.joiningDate
                    .toISOString()
                    .slice(0, 10)
                : '',

            status: mongoUser.status,
            avatarUrl:
              mongoUser.avatarUrl,
          };

          return next();
        }

        if (
          mongoUser &&
          mongoUser.status === 'Disabled'
        ) {
          return res.status(403).json({
            error:
              'Employee account has been disabled.',
          });
        }
      }

      // ----------------------------------------------
      // Local user
      // ----------------------------------------------

      const localUser =
        db.getUserById(
          decoded.userId
        );

      if (
        localUser &&
        localUser.status !== 'Disabled'
      ) {
        req.user = localUser;

        return next();
      }
    }
  } catch {
    /*
     * JWT verification failed.
     *
     * Continue below for development session
     * tokens. These are only accepted when MongoDB
     * is not connected.
     */
  }

  // ==================================================
  // DEVELOPMENT / LOCAL SESSION TOKENS
  //
  // These are deliberately disabled when MongoDB is
  // connected, because production authentication
  // should use signed JWTs.
  // ==================================================

  if (!isMongoConnected()) {

    // ----------------------------------------------
    // Legacy admin session
    // ----------------------------------------------

    if (token === 'token_admin') {
      const admin =
        db.getUserById(
          'usr_admin_01'
        );

      if (
        admin &&
        admin.status !== 'Disabled'
      ) {
        req.user = admin;

        return next();
      }
    }

    // ----------------------------------------------
    // oms_sess_<userId>_<time>
    // ----------------------------------------------

    if (
      token.startsWith('oms_sess_')
    ) {
      const raw =
        token.substring(
          'oms_sess_'.length
        );

      const lastUnderscore =
        raw.lastIndexOf('_');

      const userId =
        lastUnderscore !== -1
          ? raw.substring(
              0,
              lastUnderscore
            )
          : raw;

      const user =
        db.getUserById(userId);

      if (
        user &&
        user.status !== 'Disabled'
      ) {
        req.user = user;

        return next();
      }
    }

    // ----------------------------------------------
    // token_<identifier>
    // ----------------------------------------------

    if (
      token.startsWith('token_')
    ) {
      const identifier =
        token.substring(
          'token_'.length
        );

      const user =
        db.getUserByEmailOrUsername(
          identifier
        );

      if (
        user &&
        user.status !== 'Disabled'
      ) {
        req.user = user;

        return next();
      }
    }
  }

  return res.status(401).json({
    error:
      'Session expired or invalid token.',
  });
}

// ====================================================
// BACKWARD-COMPATIBLE ALIAS
// ====================================================

export const verifyJWT = verifyAuth;

// ====================================================
// ADMIN AUTHORIZATION
// ====================================================

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (
    !req.user ||
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({
      error:
        'Access denied: Administrative privileges required. Employee access prohibited.',
    });
  }

  next();
}