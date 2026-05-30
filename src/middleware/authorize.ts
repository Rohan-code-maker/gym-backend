import { Response, NextFunction } from 'express';
import { AppError } from '../shared/utils/AppError';
import { AuthenticatedRequest } from './authenticate';

/**
 * Middleware factory to restrict route access by user role.
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};
