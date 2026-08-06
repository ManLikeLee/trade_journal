import { z } from 'zod';
import { isoDate } from '../../utils/schema';

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

/**
 * Columns `listTrades` is allowed to sort by. `sortBy` is interpolated straight into
 * Prisma's `orderBy`, so anything outside this list reaches the query as an unknown key
 * and throws — a display-only UI column such as `duration` returned a 500. The frontend
 * mirrors this list in `components/trades/TradesTable.tsx`; keep the two in sync until
 * the shared contracts package lands (H3).
 */
export const SORTABLE_FIELDS = [
  'openTime',
  'closeTime',
  'symbol',
  'pnl',
  'lotSize',
  'entryPrice',
  'plannedRiskReward',
  'realisedRiskReward',
] as const;

export const TradesQuerySchema = z.object({
  accountId: z.string().optional(),
  symbol: z.string().optional(),
  direction: z.enum(['BUY', 'SELL']).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  // Unvalidated strings reached `new Date()` and hit Prisma as Invalid Date -> 500.
  from: isoDate().optional(),
  to: isoDate().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(SORTABLE_FIELDS).default('openTime'),
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
export type SortableField = (typeof SORTABLE_FIELDS)[number];
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
