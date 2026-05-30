import { Request } from 'express';
import { PaginationMeta } from './apiResponse';

export interface PaginationQuery {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Parse and validate pagination query parameters from the request.
 */
export const parsePagination = (req: Request): PaginationQuery => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const search = (req.query.search as string)?.trim() || undefined;
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
  return { page, limit, skip, search, sortBy, sortOrder };
};

/**
 * Build pagination metadata for paginated responses.
 */
export const buildPaginationMeta = (
  total: number,
  query: PaginationQuery
): PaginationMeta => {
  const totalPages = Math.ceil(total / query.limit);
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasNext: query.page < totalPages,
    hasPrev: query.page > 1,
  };
};
