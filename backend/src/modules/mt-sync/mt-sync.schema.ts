import { z } from 'zod';

const isoDate = () =>
  z.string().datetime({ offset: true, message: 'Must be a valid ISO 8601 date string' });

const SyncTradeItemSchema = z.object({
  ticket: z.string().min(1),
  symbol: z.string().min(1).max(20),
  direction: z.enum(['BUY', 'SELL']),
  lotSize: z.number().positive(),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional().nullable(),
  stopLoss: z.number().positive().optional().nullable(),
  takeProfit: z.number().positive().optional().nullable(),
  openTime: isoDate(),
  closeTime: isoDate().optional().nullable(),
  pnl: z.number().optional().nullable(),
  commission: z.number().default(0),
  swap: z.number().default(0),
  status: z.enum(['OPEN', 'CLOSED']),
});

export const MtSyncPayloadSchema = z.object({
  accountNumber: z.string().min(1),
  platform: z.enum(['MT4', 'MT5']),
  trades: z.array(SyncTradeItemSchema).min(1, 'trades array must not be empty'),
});

export type MtSyncPayload = z.infer<typeof MtSyncPayloadSchema>;
export type SyncTradeItem = z.infer<typeof SyncTradeItemSchema>;
