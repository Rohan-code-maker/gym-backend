import { Response } from 'express';

export interface ApiResponseOptions {
  statusCode?: number;
  message?: string;
  data?: unknown;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Send a standardized success API response.
 */
export const sendSuccess = (
  res: Response,
  { statusCode = 200, message = 'Success', data, pagination }: ApiResponseOptions = {}
) => {
  const body: Record<string, unknown> = {
    success: true,
    message,
  };
  if (data !== undefined) body.data = data;
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
};

/**
 * Send a standardized error API response.
 */
export const sendError = (
  res: Response,
  { statusCode = 500, message = 'Internal server error' }: { statusCode?: number; message?: string }
) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
