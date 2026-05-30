import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  body: z.object({
    memberId: z.string().uuid('Invalid member ID'),
    planId: z.string().uuid('Invalid plan ID'),
    startDate: z.string().datetime().optional(),
  }),
});

export const updateSubscriptionSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['ACTIVE', 'CANCELLED', 'FROZEN']).optional(),
  }),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>['body'];
