import { z } from 'zod';

export const createMemberSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(10).max(15),
    address: z.string().max(255).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    emergencyContact: z.string().max(15).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateMemberSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(10).max(15).optional(),
    address: z.string().max(255).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    emergencyContact: z.string().max(15).optional(),
    notes: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>['body'];
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>['body'];

export const deleteMembersSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1, 'At least one member ID is required'),
  }),
});
