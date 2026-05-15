import { Router, Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../utils/errors';
import { MtSyncPayloadSchema } from './mt-sync.schema';
import { getAccountByApiKey, syncTrade } from '../trades/trades.service';

export const mtSyncRouter = Router();

/**
 * POST /api/mt-sync/trades
 *
 * Called by MT4/MT5 Expert Advisors.
 * Authentication: x-api-key header matching an Account.apiKey.
 *
 * Returns:
 *   { success: true, created: number, updated: number, skipped: number }
 */
mtSyncRouter.post('/trades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedError('Missing x-api-key header');
    }

    const account = await getAccountByApiKey(apiKey);
    if (!account) throw new UnauthorizedError('Invalid API key');

    const payload = MtSyncPayloadSchema.parse(req.body);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of payload.trades) {
      try {
        const result = await syncTrade(account.id, {
          ticket: item.ticket,
          symbol: item.symbol,
          direction: item.direction,
          lotSize: item.lotSize,
          entryPrice: item.entryPrice,
          exitPrice: item.exitPrice,
          stopLoss: item.stopLoss,
          takeProfit: item.takeProfit,
          openTime: item.openTime,
          closeTime: item.closeTime,
          pnl: item.pnl,
          commission: item.commission,
          swap: item.swap,
          status: item.status,
          source: payload.platform,
        });

        if (result.action === 'created') created++;
        else updated++;
      } catch (err) {
        console.error(`Skipping ticket ${item.ticket}:`, err);
        skipped++;
      }
    }

    res.json({ success: true, created, updated, skipped });
  } catch (err) {
    next(err);
  }
});
