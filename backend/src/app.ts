import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { notFound, errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.router';
import { accountsRouter } from './modules/accounts/accounts.router';
import { tradesRouter } from './modules/trades/trades.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { mtSyncRouter } from './modules/mt-sync/mt-sync.router';

const app = express();

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
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/mt-sync', mtSyncRouter);

// ── Error handling ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export { app };
