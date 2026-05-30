import { z } from 'zod';

export const createSystemPlanSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    durationDays: z.number().int().positive(),
    price: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateSystemPlanSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    durationDays: z.number().int().positive().optional(),
    price: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateSystemPlanInput = z.infer<typeof createSystemPlanSchema>['body'];
export type UpdateSystemPlanInput = z.infer<typeof updateSystemPlanSchema>['body'];
