import { Router, Request, Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema } from './auth.schema';
import * as authService from './auth.service';
import { loginLimiter, registerLimiter, refreshLimiter } from '../../middleware/rateLimit';
import { authenticate } from '../../middleware/auth';
import { setAuthCookies, clearAuthCookies, readRefreshCookie } from '../../utils/cookies';
import { UnauthorizedError } from '../../utils/errors';

export const authRouter = Router();

/**
 * The refresh token never appears in a response body. The service returns it —
 * it knows nothing about HTTP, per the module convention — and this layer moves
 * it into an httpOnly cookie before responding.
 */
function respondWithSession(
  res: Response,
  status: number,
  result: { accessToken: string; refreshToken: string; expiresIn: number; user: unknown },
) {
  const { refreshToken, ...body } = result;
  setAuthCookies(res, refreshToken);
  res.status(status).json(body);
}

// POST /api/auth/register
authRouter.post('/register', registerLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RegisterSchema.parse(req.body);
    respondWithSession(res, 201, await authService.register(input));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = LoginSchema.parse(req.body);
    respondWithSession(res, 200, await authService.login(input));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 *
 * Reads the token from the httpOnly cookie only — never from the body. Accepting
 * a body token would preserve a path where JavaScript can present the
 * credential, which is exactly what moving it into a cookie removes.
 */
authRouter.post('/refresh', refreshLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = readRefreshCookie(req);
    if (!token) {
      // Nothing to rotate. Clear any stale cookie so the client stops retrying.
      clearAuthCookies(res);
      throw new UnauthorizedError('No refresh token');
    }
    respondWithSession(res, 200, await authService.refresh(token));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = readRefreshCookie(req);
    if (token) await authService.logout(token);
    // Always clear, even when there was no session: logout must be idempotent
    // and must never leave a cookie behind.
    clearAuthCookies(res);
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
