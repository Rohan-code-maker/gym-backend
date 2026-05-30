import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/utils/AppError';
import { Prisma } from '@prisma/client';

/**
 * Global error handling middleware.
 * Must be registered last in Express middleware stack.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // Handle known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = `Duplicate value: ${(err.meta?.target as string[])?.join(', ')} already exists`;
      isOperational = true;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
      isOperational = true;
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = 'Invalid reference: related record not found';
      isOperational = true;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    isOperational = true;
  }

  // Log the error
  if (!isOperational || process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${err.stack || err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
