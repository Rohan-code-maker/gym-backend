import { Role } from '@prisma/client';

/**
 * Extends the Express Request type to carry the authenticated user payload.
 */
declare global {
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware after JWT verification */
      user?: JwtPayload;
    }
  }
}

/** Payload stored inside the JWT access token */
export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

/** Shape returned to the client after login / register */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Standard query-string filter params shared across list endpoints */
export interface ListQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export {};
