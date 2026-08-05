/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RATE LIMITING
 *
 * Why this matters more than it looks: bcrypt runs at cost 12 (~250 ms of CPU
 * per hash) on a single-threaded event loop. Roughly 20 concurrent login
 * requests saturate a core and stall every other user's request — no
 * credentials required. The cost is deliberate and must not be lowered;
 * throttling is the correct mitigation.
 *
 * ⚠️ TODO (C8 follow-up / M1): these limiters use express-rate-limit's DEFAULT
 * IN-MEMORY STORE. Counters live in the process heap, which means:
 *
 *   1. They are PER-PROCESS. Run two instances behind a load balancer and the
 *      effective limit doubles — an attacker simply spreads requests across
 *      them. This MUST move to a shared Redis store before running more than
 *      one instance. docker-compose.yml already provisions Redis; nothing
 *      references it yet.
 *   2. They reset on restart, so a deploy clears every counter.
 *   3. Memory grows with the number of distinct keys until each window expires.
 *
 * With a single process on one machine — the current deployment — in-memory is
 * correct and adds no infrastructure. Revisit the moment that changes.
 *
 * ⚠️ `req.ip` is only trustworthy if Express is configured with `trust proxy`
 * to match the actual proxy depth. There is no proxy today. Behind one, set it,
 * or every request will share the proxy's IP and the per-IP limits become a
 * global limit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import { TooManyRequestsError } from '../utils/errors';

const MINUTE = 60_000;

/**
 * Route the 429 through the application's error handler rather than
 * express-rate-limit's own responder, so the body matches every other error in
 * this API: `{ "error": "..." }`. Retry-After is set explicitly because the
 * library only sets it from its default handler, which this replaces.
 */
function limitHandler(message: string) {
  return (req: Request, res: Response, next: NextFunction, options: Options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    next(new TooManyRequestsError(message));
  };
}

const base = {
  // draft-7 emits the standard `RateLimit` and `RateLimit-Policy` headers.
  standardHeaders: 'draft-7' as const,
  // Suppress the deprecated X-RateLimit-* headers.
  legacyHeaders: false,
};

/**
 * Login: 5 attempts per 15 minutes, keyed on IP **and** the normalised email.
 *
 * Keying on IP alone punishes everyone behind a shared NAT — an office, a
 * university, a mobile carrier — when one person fumbles a password. Keying on
 * email alone lets an attacker lock a known user out of their own account.
 * Together, an attacker must burn a fresh IP for each account they target.
 */
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 5,
  keyGenerator: (req: Request) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    // ipKeyGenerator normalises IPv6 to a /56 subnet; a bare req.ip lets an
    // attacker with an IPv6 allocation cycle addresses for free.
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
  },
  handler: limitHandler('Too many login attempts. Try again in 15 minutes.'),
});

/** Registration: 3 per hour per IP. Signup is rare; automated signup is not. */
export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * MINUTE,
  limit: 3,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: limitHandler('Too many accounts created from this address. Try again later.'),
});

/**
 * Refresh: 30 per 15 minutes per IP. Legitimate clients refresh roughly once
 * per access-token lifetime (15 minutes), so this leaves generous headroom for
 * several tabs and devices while still bounding token-guessing.
 */
export const refreshLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 30,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: limitHandler('Too many token refreshes. Try again shortly.'),
});

/**
 * MT sync, authenticated: 100 requests per minute per API key.
 *
 * The shipped EA syncs every 10 seconds (6/min) and fires an extra sync on each
 * deal event, so 100 is comfortable for a busy account while bounding what one
 * compromised key can do.
 */
export const mtSyncKeyLimiter = rateLimit({
  ...base,
  windowMs: MINUTE,
  limit: 100,
  keyGenerator: (req: Request) => {
    const key = req.headers['x-api-key'];
    return typeof key === 'string' && key.length > 0
      ? `key:${key}`
      : `ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
  handler: limitHandler('Sync rate limit exceeded for this API key.'),
});

/**
 * MT sync, key guessing: 10 FAILED authentications per 15 minutes per IP.
 *
 * This is the unauthenticated attack surface — `/api/mt-sync/trades` accepts any
 * x-api-key and the response tells the caller whether it was right.
 *
 * ⚠️ Invoked MANUALLY from the route handler, only once a key has already been
 * rejected — not mounted as ordinary middleware. Mounted the usual way it fires
 * before the key is looked up, so ten wrong guesses from one address would lock
 * out every *valid* EA sharing that address for fifteen minutes: an attacker on
 * a shared NAT could silently stop a stranger's trade sync. Running it after the
 * lookup means a correct key never touches this counter at all.
 */
export const mtSyncGuessLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 10,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: limitHandler('Too many failed API key attempts. Try again later.'),
});

/**
 * Global backstop for everything under /api. Deliberately loose: it exists to
 * bound a runaway client or a naive scraper, not to shape normal usage. The
 * dashboard alone fires five analytics requests per load.
 */
export const globalApiLimiter = rateLimit({
  ...base,
  windowMs: MINUTE,
  limit: 300,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: limitHandler('Too many requests. Slow down and try again shortly.'),
});
