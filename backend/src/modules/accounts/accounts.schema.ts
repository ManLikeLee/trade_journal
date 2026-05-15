import { z } from 'zod';

export const CreateAccountSchema = z.object({
  name: z.string().min(1).max(100),
  broker: z.string().min(1).max(100),
  platform: z.enum(['MT4', 'MT5']).optional(),
  accountNumber: z.string().max(50).optional(),
  currency: z.string().max(10).default('USD'),
  initialBalance: z.number().min(0).default(0),
});

export const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  broker: z.string().min(1).max(100).optional(),
  platform: z.enum(['MT4', 'MT5']).optional(),
  accountNumber: z.string().max(50).optional(),
  currency: z.string().max(10).optional(),
  initialBalance: z.number().min(0).optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
