import { z } from 'zod';

export const createGymSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    address: z.string().max(255).optional(),
    phone: z.string().max(20).optional(),
    logo: z.string().url().optional(),
  }),
});

export const updateGymSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid gym ID') }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    address: z.string().max(255).optional(),
    phone: z.string().max(20).optional(),
    logo: z.string().url().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateGymInput = z.infer<typeof createGymSchema>['body'];
export type UpdateGymInput = z.infer<typeof updateGymSchema>['body'];
