import { z } from 'zod';

const isoDate = () =>
  z.string().datetime({ offset: true, message: 'Must be a valid ISO 8601 date string' });

export const CreateTradeSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().min(1).max(20),
  direction: z.enum(['BUY', 'SELL']),
  lotSize: z.number().positive('lotSize must be positive'),
  entryPrice: z.number().positive('entryPrice must be positive'),
  exitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  openTime: isoDate(),
  closeTime: isoDate().optional(),
  pnl: z.number().optional(),
  commission: z.number().default(0),
  swap: z.number().default(0),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

export const UpdateTradeSchema = z.object({
  exitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  closeTime: isoDate().optional(),
  pnl: z.number().optional(),
  commission: z.number().optional(),
  swap: z.number().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

export const TradesQuerySchema = z.object({
  accountId: z.string().optional(),
  symbol: z.string().optional(),
  direction: z.enum(['BUY', 'SELL']).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().default('openTime'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const CreateNoteSchema = z.object({
  content: z.string().min(1),
  emotion: z
    .enum(['CONFIDENT', 'FEARFUL', 'GREEDY', 'NEUTRAL', 'FOMO', 'DISCIPLINED', 'REVENGE', 'ANXIOUS'])
    .optional(),
  mistake: z.string().optional(),
  lesson: z.string().optional(),
});

export type CreateTradeInput = z.infer<typeof CreateTradeSchema>;
export type UpdateTradeInput = z.infer<typeof UpdateTradeSchema>;
export type TradesQuery = z.infer<typeof TradesQuerySchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
