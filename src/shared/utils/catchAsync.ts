import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to automatically pass errors to next().
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
