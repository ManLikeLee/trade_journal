import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { isoDate } from '../../utils/schema';
import { authenticate } from '../../middleware/auth';
import * as analyticsService from './analytics.service';
import { generateInsights } from './insights.service';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

/**
 * `from` and `to` were bare strings. `analytics.service` then ran them through a
 * parser that returned null on failure and simply dropped the filter, so
 * `?from=garbage` answered **200 with all-time data presented as filtered**.
 *
 * That is worse than the 500 fixed in C10: an error tells the user something
 * went wrong, whereas this states a wrong number confidently on a page whose
 * whole purpose is reporting their P&L.
 */
const QuerySchema = z.object({
  accountId: z.string().optional(),
  from: isoDate().optional(),
  to: isoDate().optional(),
});

// GET /api/analytics/summary
analyticsRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = QuerySchema.parse(req.query);
    const result = await analyticsService.getSummary(req.user!.sub, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/equity-curve
analyticsRouter.get('/equity-curve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = QuerySchema.parse(req.query);
    const result = await analyticsService.getEquityCurve(req.user!.sub, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/by-symbol
analyticsRouter.get('/by-symbol', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = QuerySchema.parse(req.query);
    const result = await analyticsService.getPnlBySymbol(req.user!.sub, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/by-day
analyticsRouter.get('/by-day', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = QuerySchema.parse(req.query);
    const result = await analyticsService.getPnlByDay(req.user!.sub, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/by-session
analyticsRouter.get('/by-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = QuerySchema.parse(req.query);
    const result = await analyticsService.getPnlBySession(req.user!.sub, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/insights
analyticsRouter.get('/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = QuerySchema.parse(req.query);
    const result = await generateInsights(req.user!.sub, accountId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
