import { Router, Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../utils/errors';
import { MtSyncPayloadSchema } from './mt-sync.schema';
import { getAccountByApiKey, syncTrade } from '../trades/trades.service';
import { mtSyncKeyLimiter, mtSyncGuessLimiter } from '../../middleware/rateLimit';

export const mtSyncRouter = Router();

/**
 * Count a failed authentication against the per-IP guess limit, then reject.
 *
 * If the caller is already over the limit the limiter responds with 429 itself;
 * otherwise it increments and we fall through to the normal 401.
 */
function rejectInvalidKey(req: Request, res: Response, next: NextFunction, message: string) {
  mtSyncGuessLimiter(req, res, ((err?: unknown) => {
    // The limiter signals "over budget" by calling this callback with a
    // TooManyRequestsError. Forward it — swallowing the argument here turned
    // every 429 back into a 401 and silently disabled the guess limit.
    if (err) return next(err);
    next(new UnauthorizedError(message));
  }) as NextFunction);
}

/**
 * POST /api/mt-sync/trades
 *
 * Called by MT4/MT5 Expert Advisors.
 * Authentication: x-api-key header matching an Account.apiKey.
 *
 * Returns:
 *   { success: true, created: number, updated: number, skipped: number }
 */
// Only the per-key limiter runs up front. The guess limiter is applied inside
// the handler, after a key has actually been rejected — see rejectInvalidKey.
mtSyncRouter.post('/trades', mtSyncKeyLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      return rejectInvalidKey(req, res, next, 'Missing x-api-key header');
    }

    const account = await getAccountByApiKey(apiKey);
    if (!account) {
      return rejectInvalidKey(req, res, next, 'Invalid API key');
    }

    const payload = MtSyncPayloadSchema.parse(req.body);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of payload.trades) {
      try {
        const result = await syncTrade(account, {
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
