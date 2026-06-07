import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../shared/utils/AppError';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  isMaster?: boolean;
}

/**
 * Middleware to verify JWT access token and attach userId/userRole to request.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please login.', 401));
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as {
      userId: string;
      role: string;
      isMaster?: boolean;
    };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.isMaster = decoded.isMaster;
    next();
  } catch {
    next(new AppError('Invalid or expired access token', 401));
  }
};
