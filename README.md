# TradeJournal — Trading Performance Platform

A production-ready trading journal MVP with manual trade logging, MT4/MT5 EA sync, analytics engine, AI insights, and real-time WebSocket updates.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | Next.js 14, Tailwind CSS, ShadCN, Recharts      |
| Backend    | NestJS, Prisma ORM, Passport JWT                |
| Database   | PostgreSQL                                      |
| Realtime   | Socket.io (WebSocket gateway)                   |
| Auth       | JWT access tokens + rotating refresh tokens    |

---

## Project Structure

```
tradejournal/
├── backend/          # NestJS API
│   ├── prisma/       # Schema + migrations
│   └── src/
│       ├── auth/         # JWT auth, strategies, guards
│       ├── users/        # User profile
│       ├── accounts/     # Broker accounts + API key mgmt
│       ├── trades/       # CRUD + MT4/MT5 sync + notes
│       ├── analytics/    # Stats, equity curve, insights
│       ├── tags/         # Tagging system
│       └── websocket/    # Socket.io gateway
└── frontend/         # Next.js app
    └── src/
        ├── app/          # App router pages
        │   ├── (auth)/   # login, register
        │   └── (dashboard)/ # dashboard, trades, settings, insights
        ├── components/   # Sidebar, TradeForm, TradesTable, Charts
        ├── hooks/        # React Query + WebSocket hooks
        └── lib/          # API client, auth store, utils
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or pnpm

### 1. Database

```bash
# Create database
createdb tradejournal

# Or with psql:
psql -U postgres -c "CREATE DATABASE tradejournal;"
```

Docker option:

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET
# For Docker postgres, DATABASE_URL should be:
# postgresql://postgres:postgres@localhost:5432/tradejournal?schema=public

# Run migrations and generate Prisma client
npx prisma migrate dev --name init
npx prisma generate

# Start development server
npm run start:dev
# API running at http://localhost:4000/api
# Swagger docs at http://localhost:4000/api/docs
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local if your API is not on localhost:4000

# Start development server
npm run dev
# App running at http://localhost:3000
```

### Prisma `P1010` Troubleshooting

If you see:
`P1010: User postgres was denied access on the database tradejournal.public`

Use this exact `DATABASE_URL` (note `?schema=public`, not `.public`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tradejournal?schema=public"
```

If it still fails, reset the local postgres volume and recreate:

```bash
docker compose down -v
docker compose up -d postgres
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

If backend startup still shows `tradejournal.public`, your shell likely exports a global `DATABASE_URL`.
Check and clear it before starting backend:

```bash
echo "$DATABASE_URL"
unset DATABASE_URL
```

---

## MT4/MT5 Expert Advisor Integration

### Setup
1. Go to **Settings** in the app
2. Create a trading account
3. Copy the generated **API Key**

### EA HTTP Request

Send a `POST` to `/api/trades/sync` with your API key:

```
POST http://your-server:4000/api/trades/sync
X-Api-Key: your-account-api-key
Content-Type: application/json

{
  "ticket": "12345678",
  "symbol": "EURUSD",
  "direction": "BUY",
  "lotSize": 0.1,
  "entryPrice": 1.08540,
  "exitPrice": 1.08820,
  "stopLoss": 1.08200,
  "takeProfit": 1.09100,
  "openTime": "2024-01-15T09:30:00Z",
  "closeTime": "2024-01-15T14:22:00Z",
  "commission": 3.50,
  "swap": -0.20
}
```

The `ticket` field is the idempotency key — safe to resend, will upsert not duplicate.

### MQL5 EA Template

```mql5
string API_URL   = "http://your-server:4000/api/trades/sync";
string API_KEY   = "your-api-key-here";

void SyncTrade(ulong ticket) {
   HistoryDealSelect(ticket);
   
   string body = StringFormat(
      "{\"ticket\":\"%d\","
      "\"symbol\":\"%s\","
      "\"direction\":\"%s\","
      "\"lotSize\":%.2f,"
      "\"entryPrice\":%.5f,"
      "\"exitPrice\":%.5f,"
      "\"openTime\":\"%s\","
      "\"closeTime\":\"%s\","
      "\"commission\":%.2f,"
      "\"swap\":%.2f}",
      ticket,
      HistoryDealGetString(ticket, DEAL_SYMBOL),
      HistoryDealGetInteger(ticket, DEAL_TYPE) == DEAL_TYPE_BUY ? "BUY" : "SELL",
      HistoryDealGetDouble(ticket, DEAL_VOLUME),
      HistoryDealGetDouble(ticket, DEAL_PRICE),
      HistoryDealGetDouble(ticket, DEAL_PRICE),
      TimeToString(HistoryDealGetInteger(ticket, DEAL_TIME)),
      TimeToString(TimeCurrent()),
      HistoryDealGetDouble(ticket, DEAL_COMMISSION),
      HistoryDealGetDouble(ticket, DEAL_SWAP)
   );
   
   char post_data[];
   StringToCharArray(body, post_data, 0, StringLen(body));
   
   string headers = "Content-Type: application/json\r\nX-Api-Key: " + API_KEY;
   char result[];
   string result_headers;
   
   int res = WebRequest("POST", API_URL, headers, 5000, post_data, result, result_headers);
}
```

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Invalidate refresh token |

### Trades
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/trades | List with filters & pagination |
| POST | /api/trades | Create trade manually |
| GET | /api/trades/:id | Get single trade |
| PATCH | /api/trades/:id | Update trade |
| DELETE | /api/trades/:id | Delete trade |
| POST | /api/trades/sync | MT4/MT5 EA sync (X-Api-Key auth) |
| GET | /api/trades/:id/notes | List notes |
| POST | /api/trades/:id/notes | Add note with emotion |
| DELETE | /api/trades/:id/notes/:noteId | Delete note |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics/summary | Win rate, PnL, RR, drawdown |
| GET | /api/analytics/equity-curve | Running equity points |
| GET | /api/analytics/pnl-by-day | Daily PnL |
| GET | /api/analytics/pnl-by-symbol | Per-symbol breakdown |
| GET | /api/analytics/win-loss-distribution | PnL buckets |
| GET | /api/analytics/insights | AI rule-based insights |

### Accounts
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/accounts | List accounts |
| POST | /api/accounts | Create account |
| PATCH | /api/accounts/:id | Update account |
| POST | /api/accounts/:id/regen-key | Regenerate API key |
| DELETE | /api/accounts/:id | Delete account |

---

## AI Insights Engine

The insights engine analyses your closed trades and generates observations across 8 dimensions:

| Analyzer | What it detects |
|----------|----------------|
| Emotions | FOMO losses, revenge trading, disciplined wins |
| Day of week | Best and worst trading days |
| Hold time | Optimal trade duration for your style |
| Symbol performance | Best/worst instruments |
| Risk:Reward | Whether WR is above breakeven for your RR |
| Lot consistency | Inconsistent position sizing |
| Trend | Improving vs declining performance |
| Streaks | Current and historical losing streaks |

Insights are ranked by severity: **danger → warning → success → info**

---

## Production Deployment

### Backend (Railway / Render / Fly.io)

```bash
npm run build
npm run start
```

Set environment variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 64+ char random string
- `FRONTEND_URL` — Your frontend domain
- `NODE_ENV=production`

### Frontend (Vercel)

```bash
npm run build
```

Set environment variables:
- `NEXT_PUBLIC_API_URL` — Backend API URL
- `NEXT_PUBLIC_WS_URL` — Backend WebSocket URL

### Database (Supabase / Neon / Railway)

```bash
npx prisma migrate deploy
```

---

## License

MIT
# trade_journal
# trade_journal
