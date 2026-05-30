import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Middleware factory to validate request data against a Zod schema.
 * Schema should have optional `body`, `query`, and `params` keys.
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Replace with coerced/parsed values
      if (result.body) req.body = result.body;
      if (result.query) req.query = result.query;
      if (result.params) req.params = result.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.slice(1).join('.'), // Remove 'body/query/params' prefix
          message: e.message,
        }));
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
        return;
      }
      next(err);
    }
  };
};
