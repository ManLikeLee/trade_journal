import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { notFound, errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.router';
import { accountsRouter } from './modules/accounts/accounts.router';
import { tradesRouter } from './modules/trades/trades.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { mtSyncRouter } from './modules/mt-sync/mt-sync.router';
import { symbolSpecsRouter } from './modules/symbol-specs/symbol-specs.router';
import { globalApiLimiter } from './middleware/rateLimit';

const app = express();

// ── Security headers ──────────────────────────────────────────
// Configured explicitly rather than accepting the defaults wholesale, because
// two of them are wrong for a cross-origin JSON API:
//
//   crossOriginResourcePolicy — helmet defaults to 'same-origin', which would
//     block the browser from reading these responses: the frontend runs on
//     localhost:3000 and the API on 127.0.0.1:5000, different origins. Set to
//     'cross-origin'. CORS still governs who may call the API.
//
//   contentSecurityPolicy — helmet's default policy is written for HTML pages
//     and lists sources this API never serves. Replaced with a deny-everything
//     policy appropriate to a JSON endpoint: it renders no markup, loads no
//     scripts, and must never be framed. The CSP that matters for the app is
//     the one on the Next.js side (task C6).
//
// Everything else is left at helmet's default, including noSniff,
// frameguard (X-Frame-Options: SAMEORIGIN), referrerPolicy, and HSTS. HSTS is a
// no-op over plain HTTP — browsers ignore it — but costs nothing and is correct
// the moment this is served over TLS.
app.use(
  helmet({
    contentSecurityPolicy: {
      // useDefaults:false — otherwise helmet merges these with its HTML-oriented
      // defaults (script-src, style-src, img-src, font-src…), which describe
      // resources this API never serves. Deny everything instead.
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// ── Core middleware ───────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = new Set([
        env.FRONTEND_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      ]);
      // Allow non-browser clients (curl, EA sync, etc.)
      if (!origin || allowed.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  }),
);

// Required to read the httpOnly refresh cookie; Express 4 has no built-in parser.
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── System routes ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'Trading journal API is running' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── API routes ────────────────────────────────────────────────
// Loose global backstop; the per-route limiters inside each router are the ones
// that actually shape traffic. Mounted here so it covers every /api route,
// including any added later.
app.use('/api', globalApiLimiter);

app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/mt-sync', mtSyncRouter);
app.use('/api/symbol-specs', symbolSpecsRouter);

// ── Error handling ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export { app };
