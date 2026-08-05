/**
 * ─────────────────────────────────────────────────────────────────────────────
 * REFRESH TOKEN COOKIES
 *
 * The refresh token is a 30-day credential. It lives in an httpOnly cookie so
 * that JavaScript — including any injected by an XSS — cannot read it. It was
 * previously written to localStorage *and* to a JS-readable cookie, so a single
 * XSS meant persistent account takeover.
 *
 * Two cookies are set, deliberately:
 *
 *   tj_refresh   Path=/api/auth   The token itself. Path-scoped so it is only
 *                                 ever attached to auth requests — the trades,
 *                                 accounts and analytics endpoints never see it.
 *
 *   tj_session   Path=/           A flag with no secret in it ("1"). Next.js
 *                                 middleware needs *something* at the root path
 *                                 to decide whether to render a route or bounce
 *                                 to /login; it cannot see tj_refresh because of
 *                                 the path scope. This is httpOnly too — Next
 *                                 middleware runs server-side and reads the raw
 *                                 Cookie header, so JS still cannot touch it.
 *                                 It authorises nothing: the API is the only
 *                                 thing that decides what a request may do.
 *
 * ⚠️ SameSite=Strict only works because the frontend and API are both served
 * from `localhost` (different ports are still the same *site*). Point the
 * frontend at 127.0.0.1 while the API is on localhost and every request becomes
 * cross-site, the cookie is silently dropped, and every refresh 401s.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CookieOptions, Response, Request } from 'express';
import { env } from '../config/env';

export const REFRESH_COOKIE = 'tj_refresh';
export const SESSION_HINT_COOKIE = 'tj_session';

/** Must match REFRESH_TTL_DAYS in auth.service.ts. */
const REFRESH_TTL_DAYS = 30;
const MAX_AGE_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * `secure` is on everywhere including local development: browsers treat
 * http://localhost as a trustworthy origin and accept Secure cookies from it.
 * Set TRUST_INSECURE_COOKIES=1 to disable it if you are testing over a plain
 * HTTP origin that is *not* localhost, where the cookie would otherwise be
 * dropped without explanation.
 */
const secure = process.env.TRUST_INSECURE_COOKIES !== '1';

const shared: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite: 'strict',
  maxAge: MAX_AGE_MS,
};

export function setAuthCookies(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, { ...shared, path: '/api/auth' });
  res.cookie(SESSION_HINT_COOKIE, '1', { ...shared, path: '/' });
}

/**
 * Clearing only works if every attribute except maxAge matches the cookie that
 * was set — otherwise the browser treats it as a different cookie and keeps the
 * original.
 */
export function clearAuthCookies(res: Response): void {
  const { maxAge: _maxAge, ...attrs } = shared;
  res.clearCookie(REFRESH_COOKIE, { ...attrs, path: '/api/auth' });
  res.clearCookie(SESSION_HINT_COOKIE, { ...attrs, path: '/' });
}

/** The refresh token from the cookie, or undefined. Never read from the body. */
export function readRefreshCookie(req: Request): string | undefined {
  const value = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Exposed for logging/diagnostics only. */
export const cookieConfig = { secure, sameSite: shared.sameSite, maxAgeDays: REFRESH_TTL_DAYS, env: env.NODE_ENV };
