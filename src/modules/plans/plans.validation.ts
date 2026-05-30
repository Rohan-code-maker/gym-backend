import { z } from 'zod';

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    durationDays: z.number().int().positive('Duration must be a positive number'),
    price: z.number().positive('Price must be positive'),
    features: z.array(z.string()).default([]),
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    durationDays: z.number().int().positive().optional(),
    price: z.number().positive().optional(),
    features: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>['body'];
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>['body'];
