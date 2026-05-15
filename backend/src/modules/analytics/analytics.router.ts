import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import * as analyticsService from './analytics.service';
import { generateInsights } from './insights.service';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

const QuerySchema = z.object({
  accountId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
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
