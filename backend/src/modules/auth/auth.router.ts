import { Router, Request, Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema, RefreshSchema } from './auth.schema';
import * as authService from './auth.service';
import { loginLimiter, registerLimiter, refreshLimiter } from '../../middleware/rateLimit';
import { authenticate } from '../../middleware/auth';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', registerLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RegisterSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', refreshLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = RefreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = RefreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
