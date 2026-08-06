import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { symbolSpecPayload } from '../../domain/symbol-spec';

export const symbolSpecsRouter = Router();

symbolSpecsRouter.use(authenticate);

/**
 * GET /api/symbol-specs
 *
 * Contract specifications the backend uses to calculate P&L. Served so the trade
 * form can show a live preview that agrees with what will actually be stored,
 * instead of maintaining a second copy of the table in the frontend.
 *
 * Static reference data, hence no service or schema module: there is no input to
 * validate and no persistence to reach for.
 */
symbolSpecsRouter.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.set('Cache-Control', 'private, max-age=3600');
    res.json(symbolSpecPayload());
  } catch (err) {
    next(err);
  }
});
