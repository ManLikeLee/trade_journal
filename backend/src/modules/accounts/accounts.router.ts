import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { CreateAccountSchema, UpdateAccountSchema } from './accounts.schema';
import * as accountsService from './accounts.service';

export const accountsRouter = Router();

// All account routes require authentication
accountsRouter.use(authenticate);

// GET /api/accounts
accountsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await accountsService.listAccounts(req.user!.sub);
    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts
accountsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateAccountSchema.parse(req.body);
    const account = await accountsService.createAccount(req.user!.sub, input);
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

// GET /api/accounts/:id
accountsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await accountsService.getAccount(req.user!.sub, req.params.id);
    res.json(account);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/accounts/:id
accountsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateAccountSchema.parse(req.body);
    const account = await accountsService.updateAccount(req.user!.sub, req.params.id, input);
    res.json(account);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id
accountsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await accountsService.deleteAccount(req.user!.sub, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts/:id/regenerate-api-key
accountsRouter.post('/:id/regenerate-api-key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await accountsService.regenerateApiKey(req.user!.sub, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
