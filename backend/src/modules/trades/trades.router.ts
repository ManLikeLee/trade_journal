import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  CreateTradeSchema,
  UpdateTradeSchema,
  TradesQuerySchema,
  CreateNoteSchema,
} from './trades.schema';
import * as tradesService from './trades.service';

export const tradesRouter = Router();

// All trade routes require authentication
tradesRouter.use(authenticate);

// POST /api/trades
tradesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateTradeSchema.parse(req.body);
    const trade = await tradesService.createTrade(req.user!.sub, input);
    res.status(201).json(trade);
  } catch (err) {
    next(err);
  }
});

// GET /api/trades
tradesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = TradesQuerySchema.parse(req.query);
    const result = await tradesService.listTrades(req.user!.sub, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/trades/:id
tradesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trade = await tradesService.getTrade(req.user!.sub, req.params.id);
    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/trades/:id
tradesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateTradeSchema.parse(req.body);
    const trade = await tradesService.updateTrade(req.user!.sub, req.params.id, input);
    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trades/:id
tradesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await tradesService.deleteTrade(req.user!.sub, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Trade Notes ───────────────────────────────────────────────

// GET /api/trades/:tradeId/notes
tradesRouter.get('/:tradeId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notes = await tradesService.listNotes(req.user!.sub, req.params.tradeId);
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// POST /api/trades/:tradeId/notes
tradesRouter.post('/:tradeId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateNoteSchema.parse(req.body);
    const note = await tradesService.createNote(req.user!.sub, req.params.tradeId, input);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trades/:tradeId/notes/:noteId
tradesRouter.delete(
  '/:tradeId/notes/:noteId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await tradesService.deleteNote(req.user!.sub, req.params.tradeId, req.params.noteId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);
