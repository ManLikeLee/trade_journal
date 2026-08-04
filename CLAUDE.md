# CLAUDE.md — TradeJournal

Project context for Claude Code. Read this before touching anything.

**The README is stale and describes an application that no longer exists.** Trust this file
and the code over `README.md`. Rewriting the README is a tracked task (H12 in `PROGRESS.md`).

---

## What this is

A trading performance journal. Retail forex/CFD traders log trades — manually or via an MT5
Expert Advisor that pushes them over HTTP — and the app computes performance analytics
(win rate, profit factor, expectancy, R:R, drawdown, equity curve) plus a rules-based
"insights" engine correlating outcomes against self-reported emotional state.

Monorepo-ish layout, but **not** an npm workspace: `backend/` and `frontend/` are two
independent packages, each with its own `package.json` and `node_modules`. The root
`package-lock.json` is an empty stub with no matching `package.json`.

---

## Stack — as built, not as documented

| Layer | Reality | README claims (wrong) |
|---|---|---|
| Backend | **Express 4 + Zod + `jsonwebtoken`** | NestJS + Passport JWT |
| ORM | Prisma 5 / PostgreSQL 16 | ✓ correct |
| Frontend | Next.js 14 App Router, 100% client components | ✓ correct |
| State | Zustand (auth) + TanStack Query v5 (server) | ✓ correct |
| UI | Tailwind + Radix primitives + Recharts + Geist | "ShadCN" — not installed |
| Realtime | **None. No socket server exists.** | Socket.io gateway |
| API docs | **None** | Swagger at `/api/docs` |
| Backend port | **5000** | 4000 |

There is **no NestJS anywhere in `backend/src`**. The NestJS build output is still committed
at `backend/dist/` (103 tracked files, including `websocket/trades.gateway.js` — a socket
server with no source counterpart). That directory is dead; never read it, never deploy it.
`backend/package.json` is `2.0.0`, "Express + Prisma", and a migration is literally named
`20260514000000_express_refactor`.

Likewise `frontend/src/hooks/useTradeSocket.ts` connects to a Socket.io server that does not
exist, and `socket.io-client` ships in the bundle for nothing.

---

## Backend conventions

**Entry point:** `backend/src/server.ts` → `backend/src/app.ts`. Built with `tsc` to
`dist/server.js` (`npm start` runs `node dist/server.js`).

**Port:** default **5000**, from `PORT` in `backend/src/config/env.ts:15`. Not 4000 — the
README, `Dockerfile` (`EXPOSE 4000`), and `docker-compose.yml` all disagree with the code.

**API prefix:** every route is mounted under **`/api`** in `app.ts`:

```
/api/auth        open
/api/accounts    ┐
/api/trades      ├─ router.use(authenticate)  (Bearer JWT)
/api/analytics   ┘
/api/mt-sync     x-api-key header (EA ingest)
```

`GET /` and `GET /health` sit outside the prefix.

**Module convention — `router → service → schema`.** Every feature lives in
`backend/src/modules/<name>/` as:

```
<name>.router.ts    Express router. Parses with the Zod schema, calls the service,
                    shapes the response. Never touches Prisma.
<name>.service.ts   Takes (userId, input). Pure of HTTP — never touches req/res.
                    The only layer that touches Prisma.
<name>.schema.ts    Zod schemas + `z.infer` types. One source of truth per contract.
```

This separation is applied consistently across all five modules and there is currently no
leakage. **Keep it that way.** If a service starts reading `req`, or a router starts calling
`prisma`, the change is wrong.

Notes: `analytics/` has two services (`analytics.service.ts`, `insights.service.ts`) and no
schema file. `trades.service.ts` (352 LOC) also holds trade-notes and MT-sync logic — it is
the largest and most defect-dense file in the repo.

**Errors:** throw the typed subclasses from `src/utils/errors.ts` (`HttpError` base). A
single terminal handler in `src/middleware/errorHandler.ts` maps `ZodError → 400`,
`HttpError → statusCode`, Prisma `P2002 → 409`, everything else → generic 500. Handlers
catch and call `next(err)`; do not write error responses inline.

**Error response shape** is `{ error: string, details?: [{ path, message }] }`. The key is
`error`, **not** `message` — the frontend gets this wrong in at least one place
(`settings/page.tsx`).

**Prisma:** singleton from `src/utils/prisma.ts`. Never `new PrismaClient()` in a module.

---

## Database

`backend/prisma/schema.prisma`. PostgreSQL. Models are PascalCase/camelCase in Prisma and
**snake_case in the database via `@map` / `@@map`** — applied consistently and deliberately:

```prisma
model Account {
  userId         String  @map("user_id")
  initialBalance Decimal @default(0) @map("initial_balance") @db.Decimal(18, 2)
  apiKey         String? @map("api_key")
  @@map("accounts")
}
```

Any raw SQL must use the snake_case names (`trades`, `account_id`, `close_time`), not the
Prisma names.

**Money is `Decimal` in the database, never float.** `@db.Decimal(18, 2)` for money,
`@db.Decimal(18, 5)` for prices. Prisma returns these as `Decimal` objects (and serialises
them as strings over JSON). Preserve that: the current analytics code converts to JS `number`
on read and rounds per-trade, which throws the precision away — do not copy that pattern into
new code.

`@@unique([accountId, externalTicket])` on `trades` is the account-scoped idempotency key for
EA sync. It is deliberate. Do not weaken it.

**Migrations** live in `backend/prisma/migrations/`. `20260514000000_express_refactor` is
hand-written (with `ADD COLUMN IF NOT EXISTS` and an `ALTER TYPE ... ADD VALUE` inside a
`DO $$` block), so migration history is not a guaranteed reproduction of `schema.prisma`.
Verify with `prisma migrate diff --from-migrations --to-schema-datamodel` before trusting it.
Put enum additions in their own standalone migration.

---

## Frontend conventions

`frontend/src/`, Next.js 14 App Router. Route groups `(auth)` and `(dashboard)`. Every page
carries `'use client'` — there are currently no Server Components and no server-side fetching.

- `lib/api.ts` — axios instance. `baseURL` = `NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000/api'`,
  **so every call site path is relative to `/api`** (`api.get('/trades')` → `/api/trades`).
  Contains a refresh-token interceptor with a pending-request queue.
- `lib/auth.ts` — Zustand store, persisted to `localStorage`.
- `hooks/useTrades.ts`, `hooks/useInsights.ts` — TanStack Query wrappers. All API paths live here.
- `middleware.ts` — checks the `tj-auth` cookie **exists**; never validates it. Real
  authorisation is the API's job.

---

## ⚠️ The API contract is hand-maintained on both sides

There is **no shared package, no OpenAPI spec, no generated client**. The frontend and the
backend each declare every path and every payload shape by hand. This has already drifted and
shipped four dead endpoints to `main`:

| Frontend calls | Backend registers |
|---|---|
| `/analytics/pnl-by-symbol` | `/analytics/by-symbol` |
| `/analytics/pnl-by-day` | `/analytics/by-day` |
| `/accounts/:id/regen-key` | `/accounts/:id/regenerate-api-key` |
| `/trades/sync` (README + in-app EA snippet) | `/mt-sync/trades` |

**Rule: any change to a route path, a request body, or a response shape must be applied to
both sides in the same commit.** Before adding or renaming a route, grep the other side:

```bash
grep -rn "analytics/" frontend/src/hooks/          # every frontend path
grep -rn "Router\.\(get\|post\|patch\|delete\)(" backend/src/modules/   # every backend route
```

This rule stands until a shared contracts package lands (tracked as **H3** in `PROGRESS.md`),
which turns a rename into a compile error and removes the need for it.

Validation rules drift the same way and already have: `TradeForm.tsx` caps `symbol` at
`max(10)`, `trades.schema.ts` allows `max(20)`. Same field, two rules.

---

## Working agreements

- **Typecheck gate — both must pass before any task is complete:**
  ```bash
  cd backend  && npx tsc --noEmit
  cd frontend && npx tsc --noEmit
  ```
  Both pass on `7a3be4d`. Keep them passing. `strict: true` is on in both tsconfigs; don't
  reach for `as any` / `as never` to get past it (the codebase has 29 `any`s and one
  `as never` — that's the debt, not the pattern).
- **There are no tests, no CI, no lint config.** `frontend` declares a `lint` script and
  depends on `eslint-config-next`, but no `.eslintrc*` exists, so `next lint` prompts
  interactively. Until CI lands (C12), `tsc --noEmit` plus a manual run is the only gate — so
  actually run things rather than reasoning that code looks right.
- **Never commit build output or env files.** `backend/dist/`, `frontend/.next/`, and
  `backend/.env` are all currently tracked *despite* `.gitignore` (added before the ignore
  rule). `.gitignore` does not cover `.env` at all. Untracking these is C11; until then, stage
  files explicitly by path — never `git add -A`.
- **Conventional commits, imperative mood, one logical change per commit.**
  `fix(trades): serialise datetime-local values to ISO 8601 before submit` — not
  `chore: push all local changes`.
- **`PROGRESS.md`** tracks the audit remediation checklist. Update it at the end of every task.

---

## Local development

```bash
# Backend (needs a running Postgres reachable at DATABASE_URL)
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run dev            # tsx watch → http://127.0.0.1:5000

# Frontend
cd frontend
npm run dev            # → http://localhost:3000
```

Docker is **not** a working path today: `backend/Dockerfile` runs `node dist/src/main` (the
deleted NestJS entry point), `server.ts` hard-binds `127.0.0.1`, compose publishes `4000`
against an app on `5000`, and `frontend/Dockerfile` copies a `.next/standalone` output that is
never produced. Fixing all of that is C5.

---

## Reference

The remediation work in `PROGRESS.md` derives from an independent engineering audit:
`TradeJournal-Engineering-Audit.md`, performed against commit `7a3be4d`. It lives in the
parent directory (`../TradeJournal-Engineering-Audit.md`), not in the repo, and is not
tracked by git. Every claim in it cites `file:line`.
