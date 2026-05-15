# TradeJournal Backend

Express + TypeScript + Prisma. No Docker required.

## Requirements

- Node.js 18+
- PostgreSQL (Supabase, Neon, Railway, or local installation)

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — a long random secret (see below)
- `PORT` — default `5000`
- `FRONTEND_URL` — your frontend origin for CORS

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Run Prisma migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start the server

```bash
npm run dev
```

The API will be available at `http://127.0.0.1:5000`.

### 5. Verify the server is running

```bash
curl http://localhost:5000/health
# → { "status": "ok" }

curl http://localhost:5000/
# → { "message": "Trading journal API is running" }
```

---

## Database Options (no Docker)

### Option A — Supabase (recommended for SaaS)
1. Create a free project at [supabase.com](https://supabase.com)
2. Copy the **connection string** from Settings → Database
3. Set `DATABASE_URL` in your `.env`

### Option B — Neon
1. Create a free database at [neon.tech](https://neon.tech)
2. Copy the connection string and set `DATABASE_URL`

### Option C — Local PostgreSQL on macOS
```bash
brew install postgresql@16
brew services start postgresql@16
createdb tradejournal
# DATABASE_URL=postgresql://postgres@localhost:5432/tradejournal
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start in development mode (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Start compiled production server |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run pending migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |

---

## API Reference

### Auth

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"securepass123","name":"Alice"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"securepass123"}'

# Get current user (requires Bearer token)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### Accounts

```bash
# Create account
curl -X POST http://localhost:5000/api/accounts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My MT5 Account","broker":"ICMarkets","platform":"MT5","accountNumber":"123456"}'

# List accounts
curl http://localhost:5000/api/accounts \
  -H "Authorization: Bearer <token>"

# Regenerate API key (used by MT4/MT5 EA)
curl -X POST http://localhost:5000/api/accounts/<id>/regenerate-api-key \
  -H "Authorization: Bearer <token>"
```

### Manual Trades

```bash
# Log a trade manually
curl -X POST http://localhost:5000/api/trades \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "<accountId>",
    "symbol": "EURUSD",
    "direction": "BUY",
    "lotSize": 0.1,
    "entryPrice": 1.0850,
    "exitPrice": 1.0900,
    "openTime": "2026-04-18T09:00:00.000Z",
    "closeTime": "2026-04-18T12:00:00.000Z",
    "pnl": 50.00,
    "status": "CLOSED"
  }'

# List trades
curl "http://localhost:5000/api/trades?status=CLOSED&limit=20" \
  -H "Authorization: Bearer <token>"

# Update a trade
curl -X PATCH http://localhost:5000/api/trades/<id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"exitPrice": 1.0920, "pnl": 70.00, "status": "CLOSED"}'
```

### Trade Notes

```bash
# Add a journal note
curl -X POST http://localhost:5000/api/trades/<tradeId>/notes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Entered on breakout retest","emotion":"DISCIPLINED"}'
```

### Analytics

```bash
# Summary stats
curl "http://localhost:5000/api/analytics/summary" \
  -H "Authorization: Bearer <token>"

# Equity curve
curl "http://localhost:5000/api/analytics/equity-curve" \
  -H "Authorization: Bearer <token>"

# PnL by symbol
curl "http://localhost:5000/api/analytics/by-symbol" \
  -H "Authorization: Bearer <token>"

# PnL by day
curl "http://localhost:5000/api/analytics/by-day" \
  -H "Authorization: Bearer <token>"

# Session analysis
curl "http://localhost:5000/api/analytics/by-session" \
  -H "Authorization: Bearer <token>"

# AI-style insights
curl "http://localhost:5000/api/analytics/insights" \
  -H "Authorization: Bearer <token>"
```

---

## MT4/MT5 Automatic Sync

The Expert Advisor sends a POST request with your account's API key.

### How it works

1. Create a trading account in the app and copy its **API key** from Settings.
2. Configure the EA with the API key and server URL.
3. The EA posts trade data to `POST /api/mt-sync/trades`.
4. The backend upserts trades using `accountId + ticket` — no duplicates.
5. Manual notes on synced trades are preserved.

### EA Endpoint

```
POST http://localhost:5000/api/mt-sync/trades
Header: x-api-key: <your-account-api-key>
```

### Payload

```json
{
  "accountNumber": "123456",
  "platform": "MT5",
  "trades": [
    {
      "ticket": "987654",
      "symbol": "BTCUSD",
      "direction": "BUY",
      "lotSize": 0.01,
      "entryPrice": 76000,
      "exitPrice": 76500,
      "stopLoss": 75500,
      "takeProfit": 77000,
      "openTime": "2026-04-18T17:22:06.000Z",
      "closeTime": "2026-04-18T18:10:00.000Z",
      "pnl": 5.20,
      "commission": 0,
      "swap": 0,
      "status": "CLOSED"
    }
  ]
}
```

### Response

```json
{ "success": true, "created": 1, "updated": 0, "skipped": 0 }
```

---

## Project Structure

```
backend/
├── src/
│   ├── server.ts              # HTTP server entry point
│   ├── app.ts                 # Express app, routes, middleware
│   ├── config/
│   │   └── env.ts             # Environment variable loading
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication middleware
│   │   ├── requestLogger.ts   # Request logging
│   │   └── errorHandler.ts    # Global error + 404 handler
│   ├── modules/
│   │   ├── auth/              # Register, login, refresh, me
│   │   ├── accounts/          # Broker account CRUD + API key
│   │   ├── trades/            # Trade CRUD + notes
│   │   ├── analytics/         # Stats, equity curve, insights
│   │   └── mt-sync/           # MT4/MT5 EA trade sync
│   └── utils/
│       ├── prisma.ts          # Prisma client singleton
│       └── errors.ts          # HTTP error classes
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env.example
└── package.json
```
