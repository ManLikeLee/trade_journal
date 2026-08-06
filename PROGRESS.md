# PROGRESS — Audit Remediation

Tracking remediation of `TradeJournal-Engineering-Audit.md` (audited against commit `7a3be4d`).
Items are the audit's own Step 15 priorities. One task per commit; update this file at the end
of every task.

**Baseline at start (`7a3be4d`):** `backend` and `frontend` both pass `npx tsc --noEmit`.
No tests, no CI, no lint config exist, so typecheck is the only automated gate today.

---

## CRITICAL — nothing ships until these are done

- [x] **C1** — Fix `datetime-local` → ISO 8601 serialisation in `TradeForm.tsx` and
      `trades/[id]/edit/page.tsx`. The core action (log a trade) returns 400 on every attempt.
      *Done 2026-08-04 — see log. Backend-verified; browser click-path still unrun.*
- [x] **C2** — Fix 4 endpoint path mismatches: `pnl-by-symbol` → `by-symbol`,
      `pnl-by-day` → `by-day`, `regen-key` → `regenerate-api-key`, `/trades/sync` →
      `/mt-sync/trades` (README + in-app EA snippet).
      *Done 2026-08-04 — see log. Cross-reference clean; browser click-path still unrun.*
- [x] **C3** — Implement server-side P&L with a symbol-spec table; subtract commission and
      swap; backfill existing rows. Manual trades currently persist `pnl = NULL` forever.
      *Done 2026-08-05. Verified live; your 16 real trades byte-identical before and after.*
- [x] **C4** — Fix null/zero handling in `analyzeStreaks`; unify null policy across
      `analytics.service.ts` and `insights.service.ts`. Depends on C3.
      *Done 2026-08-05. 30 unpriced trades: old code claimed a 30-loss streak, new reports none.*
- [ ] **C5** — Fix deployment: `HOST=0.0.0.0`, `CMD ["node","dist/server.js"]`, align
      PORT/EXPOSE/compose, add `output:'standalone'`, create `public/`, add `.dockerignore`.
- [x] **C6** — Move refresh token to an `httpOnly; Secure; SameSite=Strict` cookie; access
      token in memory only; add CSP.
      *Done 2026-08-05. **CSP is report-only and still needs nonces before enforcing** — see log.
      **The app must be opened on `http://127.0.0.1:3000`**, not localhost (middleware redirects).*
- [x] **C7** — Stop leaking `apiKey`: explicit `select` on `getTrade` and `listAccounts`;
      show the key once on create/regenerate.
      *Done 2026-08-05. Verified live: apiKey absent from every read endpoint.
      **Keys are still plaintext at rest — that is C9, still outstanding.***
- [x] **C8** — Add rate limiting on auth and sync endpoints.
      *Done 2026-08-05. Verified live: login 6th attempt → 429 + Retry-After. Helmet added,
      login timing side channel closed.*
- [ ] **C9** — Hash refresh tokens and API keys at rest (SHA-256); unique index on the hash.
- [x] **C10** — Whitelist `sortBy` as a Zod enum on both ends; make `duration` non-sortable.
      Clicking the Duration column header currently returns 500.
      *Done 2026-08-04 — verified live against the running API, 500 → 400 → UI can't send it.*
- [x] **C11** — Purge `.env`, `backend/dist/`, `frontend/.next/` from git; add `.env*` to
      `.gitignore`; rotate any exposed value.
      *Done 2026-08-05. `.git` 207 MB → 480 KB; secret rotated and old token proven rejected.*
- [ ] **C12** — Add CI (`tsc --noEmit` + lint + tests on PR) and an ESLint config.

## HIGH

- [ ] **H1** — Rewrite analytics as SQL aggregation (groupBy / raw SQL + window functions).
      Removes the ~1,000-user ceiling. Depends on H2.
- [ ] **H2** — Add indexes: `accounts.api_key` unique; `trades(accountId,status,closeTime)`;
      `trades(accountId,openTime DESC)`; drop lone `symbol`/`status` indexes. Depends on C9.
- [ ] **H3** — Introduce a shared contracts package (Zod schemas + route constants). Makes the
      C2 class of bug a compile error permanently.
- [ ] **H4** — Test suite baseline: unit on all money functions, integration on auth +
      ownership matrix, one E2E happy path. Depends on C12.
- [ ] **H5** — Add `helmet` + Next.js security headers.
- [ ] **H6** — Transactions: `$transaction` on refresh rotation; `upsert` in `syncTrade`;
      `updateMany` for ownership+write.
- [ ] **H7** — Password reset + email verification.
- [ ] **H8** — Structured logging + error tracking + real `/health` (`SELECT 1`) + `/ready`.
- [ ] **H9** — Cap MT-sync batch at 500; chunked parallel upserts; per-ticket error detail.
      Depends on H6.
- [ ] **H10** — Fix `POST /accounts` upsert-by-name: real `@@unique([userId,name])`, `PUT`
      semantics, correct status codes.
- [ ] **H11** — Form accessibility pass: `htmlFor`/`id`, `aria-invalid`, `aria-describedby`,
      render all field errors, surface server error details.
- [ ] **H12** — Rewrite the README to describe the application that exists.
- [ ] **H13** — Delete dead code: `useTradeSocket`, `socket.io-client`, `pips`, the `mode`
      prop, `accountNumber` in the sync payload, the MetaMask suppressor, the localhost
      fallback, `src/app/page.tsx`.

### 2026-08-04 — C2: endpoint path mismatches

**Changed:** backend path taken as canonical in all four cases.
- `frontend/src/hooks/useTrades.ts:143,150` — `/analytics/pnl-by-day` → `/analytics/by-day`,
  `/analytics/pnl-by-symbol` → `/analytics/by-symbol`.
- `frontend/src/app/(dashboard)/settings/page.tsx:44` — `regen-key` → `regenerate-api-key`.
- `settings/page.tsx` — the EA snippet advertised `/trades/sync` *and* a flat single-trade
  body the endpoint would reject. Replaced the invented MQL5 with the real request contract
  (batch envelope from `mt-sync.schema.ts`) plus a pointer to `mt5/TradeJournalSyncEA.mq5`;
  the integration-guide block now shows `/mt-sync/trades`. Both blocks had hardcoded
  `http://localhost:4000/api` fallbacks — replaced with a single `API_BASE_URL` const
  defaulting to `http://127.0.0.1:5000/api`, matching `lib/api.ts` and the backend default.
- `README.md` — sync endpoint, batch envelope, and the API reference table.
- `CLAUDE.md` — new "API surface" section listing all 26 registered routes with their call
  sites; drift table marked fixed.

**Beyond the four, found while building the route inventory** — the README's API table had
three further wrong or missing entries, all corrected: it listed
`GET /api/analytics/win-loss-distribution`, which **does not exist** (the real route is
`by-session`); it omitted `GET /api/auth/me` and `GET /api/accounts/:id`; and it documented
the notes routes with `:id` where the code uses `:tradeId`.

**Verified:** throwaway script (scratchpad, not committed) that parses every
`api.<verb>('<path>')` call site out of `frontend/src` and every route registration out of
`backend/src/modules/**/*.router.ts`, resolves each against the `app.use()` mount prefixes,
normalises `${expr}` and `:param`, and compares both directions.
**22 frontend call sites vs 26 backend routes → 0 mismatches** (exit 0). 7 routes are
registered but never called from the frontend; all 7 are expected (`mt-sync` is the EA's,
the rest are unbuilt UI) and are marked **unused** in the CLAUDE.md table.
Repo-wide grep for `trades/sync`, `pnl-by-symbol`, `pnl-by-day`, `regen-key`,
`win-loss-distribution` returns only intentional references in `CLAUDE.md`/`PROGRESS.md` plus
two TanStack **query keys** (`analyticsKey('pnl-by-day'|'pnl-by-symbol')`) which are internal
cache identifiers, not URLs — left alone, documented in CLAUDE.md.
`npx tsc --noEmit` exit 0 in both packages.

**Not verified:** the browser. The two dashboard charts and the regenerate-key button need a
live backend to confirm 200s — click-path handed to the user.

**Deferred:** 1 item added (README's remaining stale prose).

### 2026-08-04 — C10: sortBy whitelist, from/to validation, double-sort

**Changed:**
- `backend/src/modules/trades/trades.schema.ts` — exported `SORTABLE_FIELDS` (7 columns) and
  `SortableField`; `sortBy: z.enum(SORTABLE_FIELDS).default('openTime')`; `from`/`to` now use
  the existing `isoDate()` helper instead of bare `z.string()`.
- `frontend/src/components/trades/TradesTable.tsx` — `enableSorting: false` on `duration`
  (display-only), plus `direction`, `exitPrice` and `status` (real Prisma columns but outside
  the whitelist, so the API rejects them); local `SORTABLE_COLUMN_IDS` mirror + type guard so
  an unrecognised column id falls back to the API default instead of being forwarded;
  `manualSorting: true` added and `getSortedRowModel()` removed.

**Scope note — three sorts were disabled, not enabled.** The whitelist is the 7 fields the
task and the audit both specify, but the table renders 10 columns. `direction`, `exitPrice`
and `status` are real Prisma scalars whose sorting *worked* before this change; with the
enum in place they would 400. I disabled them in the UI to satisfy "whitelisted or
`enableSorting: false`". Adding them to both lists instead is a two-line change if sorting by
Side / Exit / Status is wanted — say the word.

**Verified live against the running backend** (not just typechecked):
- Reproduced first: `?sortBy=duration` → **HTTP 500**, `?from=garbage` → **HTTP 500**.
- After: `?sortBy=duration` → **400** with `{"path":"sortBy","message":"Invalid enum value…"}`.
  Same for `direction`, `exitPrice`, `status`.
- All 7 whitelisted fields → **200**, and with 3 seeded trades each produces the *correct
  distinct ordering* (`pnl desc` → 120, 35, −50; `symbol asc` → EUR, GBP, XAU; `lotSize asc`
  → 0.1, 0.2, 0.3; `openTime asc` → Jul 1, 2, 3). Sorting works, it is not merely accepted.
- `from=garbage` / `to=garbage` → **400**; valid ISO ranges → **200**; no params → **200**
  with defaults; `order=sideways` → **400**.
- Column audit parsed from source: 10 columns, 6 sortable and whitelisted, 4 with
  `enableSorting: false`, **0 unsafe**. `getSortedRowModel` absent, `manualSorting: true`
  present, `manualPagination: true` retained.
- The two duplicated whitelists compared programmatically: **identical**.
- `npx tsc --noEmit` exit 0 in both packages.

**Test data:** created and deleted a throwaway account + 3 trades. The user row
`c10-verify-1785872978@claude-test.local` remains (no delete-user endpoint exists), as does
`c2-verify-1785871217@claude-test.local` from C2.

**Not verified:** the browser. The disabled headers should no longer show a sort cursor or
chevron, and rows should keep the server's order when paging. Click-path below.

**Deferred:** 2 items added.

### 2026-08-05 — C11 Phase A: untrack build output and env files; rotate JWT_SECRET

**Context found first:** the GitHub repo `ManLikeLee/trade_journal` is **public** (0 forks) and
`backend/.env` was committed to it, so `JWT_SECRET` — a 31-character placeholder beginning
`dev` — was world-readable and is the key the running API signs access tokens with. Git
history was measured rather than assumed: of 207 MB of `.git`, **`frontend/.next` accounts for
198.3 MB**, `backend/dist` 0.8 MB, and *all source across all history* 1.7 MB.

**Changed:**
- `.gitignore` — rewrote. It covered neither `.env` nor `.env.local`, so the next secret
  committed would also have been published; `frontend/.next/` and `backend/dist/` were listed
  but had no effect because both were already tracked. Now `.env` + `.env.*` with a `!` negation
  keeping the `.env.example` templates tracked, plus `frontend/out/`, `.DS_Store`, `*.log`.
- `git rm -r --cached` on `backend/.env`, `frontend/.env.local`, `backend/dist` (103 files),
  `frontend/.next` (132 files) — 238 deletions from the index, working copies left in place so
  the app keeps running.
- `backend/dist` additionally deleted from disk: it is the *NestJS* build this project
  replaced, including `websocket/trades.gateway.js` which has no source counterpart, and
  `backend/Dockerfile` still points its CMD at that dead entry point.
- `backend/.env` — `JWT_SECRET` rotated to 64 random chars (384 bits) from
  `crypto.randomBytes(48)`. Previous file saved to `backend/.env.c11-backup`, which the new
  ignore rules already cover (verified with `git check-ignore`).

**Verified:** 0 unexpected paths in the 238 staged deletions (filtered the diff to prove only
`backend/dist/`, `frontend/.next/`, `backend/.env`, `frontend/.env.local` were touched); 58
source files under `backend/src` + `frontend/src` still tracked; both `.env.example` templates
still tracked; `backend/.env` and `frontend/.env.local` still present on disk; `GET /health`
still 200; working tree clean afterwards.

**Not yet done — Phase B.** `.git` is still 207 MB and the old secret is still readable in the
public repo's history. Both require a history rewrite + force-push, which is destructive and
outward-facing, so it is held pending explicit approval. A full backup bundle of every ref was
written to `/tmp/tradejournal-backup-20260805-105137.bundle` (141 MB) beforehand.

**Deferred:** 1 item added (Postgres password).

### 2026-08-05 — C11 Phase B: history rewrite, force-push, secret verified dead

**Changed:**
- Rewrote all 15 commits with `git filter-branch --index-filter` (built in — `git-filter-repo`
  and BFG are both absent and either would have meant a new download; 15 commits made
  `filter-branch`'s slowness irrelevant), dropping `frontend/.next`, `backend/dist`,
  `backend/.env`, `frontend/.env.local` from every commit. Then
  `reflog expire --expire=now --all` + `gc --prune=now --aggressive`, then `push --force`.
- `docker-compose.yml:38` — **the purge alone would not have removed the exposed secret.** The
  hardcoded `JWT_SECRET: dev-secret-change-in-production` is byte-for-byte the value
  `backend/.env` carried, and `docker-compose.yml` is a legitimately tracked file that was never
  a purge target. Replaced with `${JWT_SECRET:?…}` so compose fails fast instead of booting
  with a known signing key.
- Deleted `frontend/.next` from disk (271 MB) and restarted both dev servers.

**Result:**

| | Before | After |
|---|---|---|
| `.git` | 207 MB | **480 KB** |
| repo total | 1.0 GB | **639 MB** |
| tracked files | 321 | **86** |
| free disk | 5.2 GB | **6.8 GB** |

**Verified:**
- `git fsck` clean; 58 source files still tracked (unchanged); both `.env.example` templates
  survived; working tree clean; **`npx tsc --noEmit` exit 0 in both packages** — the strongest
  evidence the rewrite did not damage source.
- 0 occurrences of `frontend/.next`, `backend/dist`, `backend/.env`, `frontend/.env.local`
  anywhere in the new history.
- Commit count 15 → 14. The dropped commit is `8dd115a "Sync frontend build artifacts"`,
  confirmed against the backup bundle to have contained **only** `frontend/` build files, so
  `--prune-empty` correctly removed a commit that no longer changed anything.
- Remote `main` matches local (`fb38ae6`).
  `raw.githubusercontent.com/.../backend/.env` → **HTTP 404**;
  the published `docker-compose.yml` contains **0** occurrences of the old secret.
- Rotation proven effective, not assumed: a token freshly signed by the API → `GET /auth/me`
  **200**; a token hand-signed with the old `dev-secret-change-in-production` → **401**.
- Both servers restarted and healthy: backend `/health` 200, frontend `/login` and `/trades`
  200. Real data intact: 16 trades, 2 accounts. The 3 `@claude-test.local` users created
  during C2/C10/C11 verification were deleted.

**Backup:** `/tmp/tradejournal-backup-20260805-105137.bundle` (141 MB) holds the complete
pre-rewrite history. Recover with `git clone <bundle>`. Delete it once you are satisfied —
note it still contains the old secret.

**Caveat:** GitHub may keep the pre-rewrite objects reachable by direct commit SHA in its cache
for some time. The secret they contain is dead, but ask GitHub Support to run a GC if you want
them unreachable.

### 2026-08-05 — C3: server-side P&L

**New:** `backend/src/domain/symbol-spec.ts` (41 instruments + 21 broker aliases, normalisation,
null for unknown), `backend/src/domain/pnl.ts` (`grossPnl`/`netPnl`/`computePnl`/
`computeRiskReward`, Decimal throughout), `backend/src/modules/symbol-specs/` (GET
/api/symbol-specs), `backend/src/scripts/backfill-pnl.ts`, `frontend/src/lib/pnl-preview.ts`,
`frontend/src/hooks/useSymbolSpecs.ts`.

**Changed:** `computeMetrics` now calculates instead of echoing; its three unused parameters are
gone and it takes `symbol` + `accountCurrency`. All three call sites wired (`syncTrade` now
takes the account, which the mt-sync router already had). `analytics.service.ts`'s duplicate
risk:reward deleted in favour of the shared one. Both trade forms use the shared preview;
commission accepts negatives on both; TradeForm gained an optional "Realised P&L" override and
its `symbol` cap was raised 10 → 20 to match the backend (`GER40.CASH` is 10 characters and was
previously unenterable).

**Decisions taken (see the plan and the user's calls):** costs are negative (MT5 convention,
matching stored data); FX conversion exact-or-refuse; script under `src/` so it is typechecked;
spec table served to the frontend rather than duplicated.

**Two design corrections found while building:**
1. `updateTrade` merged the stored `pnl` back into the calculation, which would have frozen a
   manual trade's figure — editing commission would not have moved P&L. Now a stored `pnl` is
   authoritative only when `source !== MANUAL`.
2. A supplied `pnl` must win even for symbols we *can* calculate, otherwise an EA's broker
   figure would be replaced by our estimate.

**Verified — 27 pure-function assertions plus a live round-trip through the API:**

| Case | Hand-calculated | Stored by the API |
|---|---|---|
| EURUSD BUY 0.1 @ 1.0850→1.0870 | `0.0020 × 0.1 × 100000` = 20.00 | **20.00** |
| USDJPY BUY 0.5 @ 150.00→150.30 | `0.30 × 0.5 × 100000` = ¥15,000 ÷ 150.30 = 99.80 | **99.80** |
| XAUUSD BUY 0.1 @ 2400→2405 | `5.00 × 0.1 × 100` = 50.00 | **50.00** |
| …with commission −7.00, swap −1.20 | `50.00 − 7.00 − 1.20` = 41.80 | **41.80** |

Also proven live: positive swap credits (+0.20 → 50.20); SELL sign both ways; `GER40.CASH` and
`WOBBLE99` and open trades store `pnl = null` rather than a fabricated number; a supplied
`pnl: 123.45` beats a calculable 50.00; `US100.CASH` resolves through the suffix rule and
computes 20.25; PATCHing commission recalculates 50 → 43, PATCHing exitPrice → 93, PATCHing an
explicit pnl → 500; an EA-synced GER40 keeps its broker figure −45.26 verbatim; EUR-account
conversion (20 USD → 18.40 EUR) and `2000.10→2000.30` proving no float drift.

**Backfill tested against real rows, not an empty set** — 5 NULL-pnl rows inserted directly via
SQL, then: dry run reported 3 updatable + 4 skipped with reasons; `--apply` wrote exactly
20.00 / 99.80 / 41.80; a second run reported **0 updates** (idempotent). All test rows and users
then deleted.

**Regression guard:** a fingerprint of all 16 real trades' `pnl` + `risk_reward` was taken
before any C3 change and re-checked after everything including `--apply`:
`9e37a35e29e5636a9ddcbee37c82a8af` both times. **Identical — your data was never touched.**

`npx tsc --noEmit` exit 0 in both packages.

**Not verified:** the browser. The preview, the new Realised P&L field and the "can't estimate"
message need a visual check — click-path handed over.

**Deferred:** 3 items added.

### 2026-08-05 — C3 follow-up: blank Realised P&L submitted 0, overriding the calculation

**Reported by the user:** an XAUUSD 0.1-lot trade previewing +$43.00 saved as **0.00**, and a
GER40 trade that correctly said "can't estimate" also saved as **0.00** instead of null.

**Root cause — a bug introduced by C3, in the field C3 added.** `TradeForm`'s new optional
`pnl` was `z.coerce.number().optional().or(z.literal(''))`. `z.coerce.number()` turns `''` into
`0`, which is a valid number, so the `.or(z.literal(''))` fallback was never reached and an
untouched field submitted `pnl: 0` on every save. The backend then correctly applied its
precedence rule — a supplied pnl wins — and stored 0.00, overwriting the calculated 43.00 and
converting GER40's intended null into a fabricated breakeven. The submit-time guard checked for
`''` and `null` but not for the number `0`, so it never fired.

The form's other optional numbers (`exitPrice`, `stopLoss`, `takeProfit`) escape this only by
accident: `.positive()` rejects the coerced `0`, so they do fall through to the `''` branch.
Proven by running both field definitions side by side: `parse('')` → `0` for pnl, `''` for
exitPrice.

**Fixed** with a `z.preprocess` that maps blank/null/undefined to `undefined` *before*
coercion. A deliberately typed `0` still means breakeven and is still sent.

**Verified live, all five paths:** `pnl: 0` sent → stores 0 (bug reproduced); pnl omitted →
**43**; GER40 → **null**; GER40 with a typed −45.26 → **−45.26**; a deliberate 0 → **0**.
Schema unit-checked for `''`/null/undefined/'43'/'0'/'-12.5'. Both typechecks exit 0.

**Contract size challenged and checked.** The user reported MT5 giving $40 gross for XAUUSD 0.1
lots over a $5 move, implying a contract size of 80. Derived the implied contract size from
their own closed gold trades instead — `(pnl − commission − swap) ÷ (move × lots × direction)`
— across four real trades including a 0.1-lot one (4171.94 → 4171.80, gross −1.40):
**every one implies exactly 100**. Table left unchanged; asked the user to confirm against
MT5's symbol specification before altering it.

**User action needed:** two hand-entered test trades are sitting in the real account with the
bad `pnl = 0.00` (GER40 26214→26219 and XAUUSD 2400→2405). They will skew analytics until
deleted or re-saved.

### 2026-08-05 — Bug: trade detail and edit pages threw on every open (pre-existing)

**Reported by the user:** clicking any row in the trade log showed the error boundary,
"Something went wrong".

**Root cause — pre-existing, not introduced by this session's work.** Both
`trades/[id]/page.tsx` and `trades/[id]/edit/page.tsx` typed `params` as
`Promise<{ id: string }>` and unwrapped it with React's `use(params)`. That is the **Next.js
15** contract. This project is on **Next.js 14.2.0 with React 18.3.1**, where `params` is a
plain object, so `use()` rejected it outright. Reproduced by server-rendering the route:

```
⨯ Error: An unsupported type was passed to use(): [object Object]
    at TradeDetailPage (trades/[id]/page.tsx)
GET /trades/<id> 500
```

**Fixed** by destructuring `params` directly and correcting the type on both pages.

**Verified:** `GET /trades/<id>` and `GET /trades/<id>/edit` both **500 → 200**, no errors in
the dev server log. Both typechecks exit 0.

**Why nothing caught this earlier.** `tsc` passes either way — the annotation was simply a lie,
and TypeScript checks the annotation, not Next's actual runtime contract. Every verification so
far has been at the API layer or over pure functions; neither exercises a React render. This is
precisely the audit's thesis — the code was written, typechecked, and never run. The cheapest
guard is the Playwright happy path in **H4**; a route-level smoke test that server-renders each
page and asserts a 200 would have caught it in seconds.

**Note for C1:** the edit page has therefore never been reachable in a browser, so C1's
`closeTime` round-trip remains browser-unverified even though its logic is proven.

### 2026-08-05 — C4: one null/zero P&L policy across analytics and insights

**New:** `backend/src/domain/trade-outcome.ts` — the policy as executable code
(`classifyOutcome`, `realisedPnl`, `isPriced`, `pricedOnly`, `winRateOf`) so the two services
share one implementation rather than two prose comments that can drift. Both services also
carry a short policy header pointing at it.

**Policy:** `pnl === null` → UNPRICED, excluded from every win/loss/streak/average statistic
but counted and reported. `pnl === 0` → SCRATCH, a real outcome: counted in the priced total,
excluded from wins, losses and the win-rate denominator, and it **breaks** a streak.

**Changed:**
- `analyzeStreaks` rewritten from `if (>0) … else` to an explicit four-way switch. The bare
  `else` was the whole bug: every null and every genuine breakeven fell into it and was counted
  as a loss.
- `analyzeEmotions`, `analyzeDayOfWeek`, `analyzeHoldTime`, `analyzeSymbols` — every bare
  `Number(t.pnl)` replaced with an explicit null check. `analyzeHoldTime`'s minimum-sample gate
  now counts priced trades, not bucket size: three unpriced trades are not three data points.
- `generateInsights` — the `< 5` guard counts priced trades, and the message names how many
  trades were excluded and why, instead of silently under-reporting.
- `getSummary` — `totalTrades` now means *all closed trades*, matching its label and the trades
  table. Added `pricedTrades`, `unpricedTrades` and `scratchCount`. Previously `totalTrades`
  meant "trades with a P&L", which is why the dashboard showed a smaller number than the table.
- Frontend `AnalyticsSummary` updated with the three new fields to keep both sides in sync.
- The five analyzers are now exported: they are pure functions over trade arrays, so the policy
  is testable without a database.

**Verified — 34 assertions over 11 fixtures, all passing:**

| Fixture | Streaks | Insight emitted |
|---|---|---|
| all wins (6) | current 0, max 0 | none |
| all losses (6) | current 6, max 6 | both |
| mixed | current 3, max 3 | current only |
| **all nulls (6)** | **current 0, max 0** | **none** |
| **all zeros (6 scratches)** | **current 0, max 0** | **none** |
| null mid losing streak | current 4, max 4 | current only |
| null mid long streak | current 6, max 6 | both |
| scratch mid losing streak | current 2, max 2 | none — the scratch split it |
| scratch splits a long streak | current 3, max 3 | current only |
| losses then a scratch | current 0, max 5 | max only |
| **30 hand-logged unpriced** | **current 0, max 0** | **none** |

Thresholds are part of the assertion: `current-losing-streak` fires at ≥3, `max-losing-streak`
at ≥5. My first run reported 5 failures — all of them **wrong expectations in the fixture**,
not defects: I had asserted insights at streak values below those thresholds. Corrected and
re-run.

**Cross-service agreement proven live** on a seeded account of 7 closed trades (1 win, 2
losses, 1 scratch, 3 unpriced):
`GET /analytics/summary` → `totalTrades 7, pricedTrades 4, unpricedTrades 3, win 1, loss 2,
scratch 1, winRate 33.33`; `GET /analytics/insights` → *"You have 4 so far. 3 further trades
have no P&L recorded."* Both report **4 priced, 3 unpriced**. `win + loss + scratch = priced`,
and the scratch is correctly outside the win-rate denominator.

**The audit's scenario, reproduced end to end.** With 30 hand-logged unpriced trades in the
account, the API returns **no losing-streak insight at all**. The old logic over the same
ordering yields `max losing streak = 30` — *"Your worst streak was 30 consecutive losses."*

`npx tsc --noEmit` exit 0 in both packages. All 39 seeded rows and the test user deleted; your
19 real trades untouched.

**Not verified:** the browser. The dashboard's trade-count tile and the insights panel need a
visual check.

**Deferred:** 2 items added.

### 2026-08-05 — C7: stop returning apiKey; reveal-once pattern

**Changed:**
- `accounts.service.ts` — the fix is enforced by **types, not discipline**. Every function
  returns `PublicAccount`, an interface with no `apiKey` field; only `createAccount` and
  `regenerateApiKey` return `AccountWithSecret`. A single `toPublicAccount()` mapper is the one
  exit point for an account row, replacing the key with `hasApiKey` and `apiKeyLast4`. Adding a
  new account endpoint cannot leak the key by omission — it would not compile.
- `trades.service.ts` — `getTrade`'s `include: { account: true }` replaced with an explicit
  select of `id, name, broker, currency, platform` (the fields the detail and edit pages
  render). `assertAccountOwner` and `getAccountByApiKey` narrowed to the fields their callers
  use, so the key is not even fetched on those paths.
- `auth.service.ts` — two further over-fetches closed: the registration existence check pulled
  the whole user row including `passwordHash` for a truthiness test, and `refresh` used
  `include: { user: true }` to read one email, fetching the password hash on **every token
  refresh**. Neither reached a client, but neither should have been read.
- `settings/page.tsx` — the show/hide toggle and copy button over `account.apiKey` are gone,
  because the field no longer exists in list responses. The card shows `••••…last4`. A new key
  is surfaced once, on create and on regenerate, in a `RevealOnceKey` panel with a copy button
  and "copy this now — it will not be shown again". Regeneration now requires confirmation
  naming the consequence (the running EA stops syncing), and the mutation finally has error
  handling — it had none, so failures were silent. The create form's error handler read
  `data.message`, which the API never returns; it now reads `data.error` first.
- The in-app EA snippet no longer interpolates a key it cannot have.

**Over-fetch audit (item 6) — every Prisma read, and what it returns:**

| Query | Before | Now |
|---|---|---|
| `listAccounts` | whole row, **apiKey included** | mapped, masked |
| `getAccount` / `updateAccount` | whole row, **apiKey included** | mapped, masked |
| `createAccount` / `regenerateApiKey` | whole row | mapped + key (intended, reveal-once) |
| `deleteAccount` | returned the deleted row | returns `void`; router already 204s |
| `getTrade` | `account: true` → **whole account row** | 5-field select |
| `assertAccountOwner` | whole account row | `id, userId, currency` |
| `getAccountByApiKey` | whole account row | `id, userId, currency` |
| `auth.register` existence check | whole user row incl. `passwordHash` | `id` only |
| `auth.refresh` | `include: { user: true }` incl. `passwordHash` | `user: { email }` |
| `auth.login` | whole user row | unchanged — `passwordHash` is needed for bcrypt, and the row is never returned |
| `getMe`, `user.create` | already had a `select` | unchanged |
| `listTrades`, `analytics`, `insights` | trades + `TRADE_INCLUDE` | unchanged — no account relation, so no key; the notes/tags over-fetch on list pages is a **performance** issue left for M7 |

**Verified live — exact response shapes, recursively scanned for an `apiKey` key at any depth:**

| Endpoint | apiKey present? |
|---|---|
| `GET /api/accounts` | **NONE** ✅ — `hasApiKey: true, apiKeyLast4: "13a0"` |
| `GET /api/accounts/:id` | **NONE** ✅ |
| `PATCH /api/accounts/:id` | **NONE** ✅ |
| `GET /api/trades/:id` | **NONE** ✅ — `account` keys: `broker, currency, id, name, platform` |
| `GET /api/trades` | **NONE** ✅ — no `account` relation at all |
| `POST /api/accounts` | present — **intended**, reveal-once |
| `POST /api/accounts/:id/regenerate-api-key` | present — **intended**, reveal-once |

Rotation still works end to end: the new key authenticates `POST /api/mt-sync/trades` (200)
and the old one is rejected (401). Auth flows re-checked after the narrowing —
register → `/auth/me` → refresh → refreshed token → login all pass.
`npx tsc --noEmit` exit 0 in both packages. Test users deleted; 19 trades, 2 accounts intact.

**Still outstanding — C9.** The key remains **plaintext in `accounts.api_key`**, and refresh
tokens are plaintext in `sessions.refresh_token`. C7 closes the API surface; a database dump,
leaked backup or over-permissive read role still yields every key. C9 hashes both at rest with
a unique index on the hash. `apiKeyLast4` is derived from the plaintext today and will need to
become a stored column when C9 lands.

**Not verified:** the browser. The masked card, the confirmation dialog, the reveal-once panel
and the create flow need a visual check.

**Deferred:** 1 item added.

### 2026-08-05 — C8: rate limiting, helmet, login timing side channel

**New dependencies** (approved in the task): `express-rate-limit@8.6.2`, `helmet@8.3.0`.

**New:** `backend/src/middleware/rateLimit.ts`; `TooManyRequestsError` (429) in `utils/errors.ts`.

| Route | Limit | Key |
|---|---|---|
| `POST /auth/login` | 5 / 15 min | IP + normalised email |
| `POST /auth/register` | 3 / hour | IP |
| `POST /auth/refresh` | 30 / 15 min | IP |
| `POST /mt-sync/trades` | 100 / min | API key |
| ↳ failed key attempts | 10 / 15 min | IP, counted only after rejection |
| `/api/*` backstop | 300 / min | IP |

Login is keyed on IP **and** email deliberately: IP alone punishes everyone behind a shared
NAT when one person fumbles a password; email alone lets an attacker lock a user out of their
own account. `ipKeyGenerator` normalises IPv6 to a /56 so an attacker with an allocation
cannot cycle addresses for free.

**Two bugs I introduced and caught by testing, not by reading:**

1. *The guess limiter locked out legitimate EAs.* Mounted as ordinary middleware it ran
   **before** the key lookup, so ten wrong guesses from one address blocked every valid key
   sharing that address for 15 minutes — an attacker on a shared NAT could silently stop a
   stranger's trade sync. Proven live (valid key → 429). Now invoked manually from the handler
   *after* a key has been rejected, so a correct key never touches the counter.
2. *That fix silently disabled the limiter.* The callback passed to the limiter ignored its
   argument, so when the limiter signalled "over budget" by calling back with a
   `TooManyRequestsError`, it was discarded and re-raised as a 401. Twelve wrong keys all
   returned 401 and no 429 ever fired. Only visible because the output was checked.

**Also fixed (item 5):** `login` returned early when no user matched, skipping bcrypt, so
"unknown email" answered in ~1 ms against ~250 ms for "wrong password" — a clean oracle for
which addresses hold accounts. It now always performs one comparison, against a dummy hash
computed once at startup. Measured: **504 ms vs 554 ms**, a difference inside run-to-run
variance, against a ~5000× gap before.

**Helmet (item 6)** configured explicitly; two defaults overridden:
- `crossOriginResourcePolicy: 'cross-origin'` — the default `same-origin` would have blocked
  the browser from reading these responses, since the frontend is on `localhost:3000` and the
  API on `127.0.0.1:5000`. CORS still governs who may call the API.
- `contentSecurityPolicy` with `useDefaults: false` — helmet's default policy describes HTML
  resources this API never serves. Replaced with `default-src 'none'; frame-ancestors 'none';
  base-uri 'none'; form-action 'none'`. My first attempt left `useDefaults` on, which *merged*
  with the defaults and produced a policy that contradicted its own comment; caught by reading
  the emitted header rather than the source.

Everything else left at helmet's defaults: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`,
`Strict-Transport-Security` (a no-op over plain HTTP, correct the moment TLS is added),
`Cross-Origin-Opener-Policy`, `Origin-Agent-Cluster`, and `X-Powered-By` removed.

**Verified live:**
- 10 rapid logins: attempts 1–5 → **401**; 6–10 → **429**, `Retry-After: 900`, body
  `{"error":"Too many login attempts. Try again in 15 minutes."}` — the same `{ error }` shape
  `errorHandler` produces for every other failure. `RateLimit` headers count down 4→0.
- A **different email from the same IP** gets its own budget (5 fresh attempts) while the first
  stays blocked — proving the composite key.
- MT-sync: 10 invalid keys → 401, 11th–12th → **429 + Retry-After: 900**, and a **valid key
  from the same IP still returns 200** with the guess budget exhausted.
- `curl -I` shows all headers above; `X-Powered-By` absent.
- `npx tsc --noEmit` exit 0 both packages. Test users deleted; no test artefacts left in real
  accounts (the 20th trade is a genuine XAUUSD sync from the live EA at 18:20).

**Deferred:** 2 items added.

### 2026-08-05 — C6: httpOnly refresh cookie, memory-only access token, CSP

**New dependency:** `cookie-parser@1.4.7` (+ types). Express 4 has no built-in cookie reader.

**Three blockers found while planning, all real:**

1. **`SameSite=Strict` cannot work across `localhost` and `127.0.0.1`** — they share no
   registrable domain, so every request is cross-site and the browser drops the cookie
   silently. The plan proposed moving the frontend to `localhost:5000`; that turned out to be
   impossible because **macOS AirPlay Receiver owns `localhost:5000`** (`Server: AirTunes/770.8.1`
   answered with a 403 — `localhost` resolves to `::1` first, and the API binds `127.0.0.1`).
   Resolved the other way instead: **both sides on `127.0.0.1`**, which needs no port change and
   no EA reconfiguration. `middleware.ts` now redirects `localhost` → `127.0.0.1` so the
   mismatch cannot be hit by accident.
2. **The Next middleware gate would have broken.** The refresh cookie is path-scoped to
   `/api/auth`, so it is invisible at `/trades`. Added a second cookie, `tj_session`, at path
   `/` holding `"1"` and no secret. It is httpOnly too — Next middleware reads the raw Cookie
   header server-side, so JS still cannot see it.
3. **React StrictMode would have caused a logout loop.** It double-invokes mount effects, so
   bootstrap would fire two refreshes; the second presents an already-rotated token, 401s, and
   clears the session. Solved with one module-scoped in-flight promise shared by *both* the
   bootstrap and the interceptor path.

**A fourth, caught during implementation:** `api.ts`'s request interceptor read the access token
from `localStorage.getItem('tradejournal-auth')` — the persisted zustand blob. The moment tokens
left storage, every request would have gone out with no `Authorization` header. Introduced
`lib/access-token.ts`, a memory-only holder that `api.ts` reads and the store writes, which also
removes the interceptor's coupling to persistence internals (an audit finding in its own right).

**Backend:** `utils/cookies.ts` (set/clear/read helpers, attributes in one place); `auth.router.ts`
sets the cookie and strips `refreshToken` from every response body — the service still returns it,
so the module convention that services know nothing of HTTP is preserved; `/refresh` and `/logout`
read the cookie **only**, never the body; `register`/`login`/`refresh` now return `user`, so a
reload restores a session in one round trip.

**Frontend:** tokens gone from zustand persistence entirely (the store is no longer persisted);
`withCredentials: true`; `setAuthCookie`/`clearAuthCookie` deleted; `bootstrap()` replaces
`validateSession()`; legacy `tradejournal-auth` localStorage and `tj-auth` cookie actively purged
on load so a pre-migration token cannot linger for 30 days; localhost fallback retry removed;
all 7 debug `console.log`s removed including the one printing the user's email.

**Migration window: none, as recommended and agreed.** Keeping body-based refresh would preserve
a path where JS can present the credential — the exact thing being removed. One forced re-login.

**Verified end to end against the running API** (cookie jar, browser-equivalent):
- **Login** → 200. `Set-Cookie: tj_refresh=…; Path=/api/auth; HttpOnly; Secure; SameSite=Strict`
  and `tj_session=1; Path=/; HttpOnly; Secure; SameSite=Strict`. Body keys:
  `accessToken, expiresIn, user` — **`refreshToken` ABSENT**.
- **Reload → silent refresh** with no body, cookie only → 200, new access token, rotated cookie,
  and the new token authenticates `GET /auth/me` (200).
- **No cookie** → 401 `{"error":"No refresh token"}`.
- **Logout** → 204, both cookies cleared with matching attributes (they must match or the browser
  ignores the clear), session row deleted, and the old cookie then fails to refresh (401).
- `Secure` **is** accepted over `http://127.0.0.1` — browsers treat loopback as trustworthy.
- Headers on the app confirmed live: `Content-Security-Policy-Report-Only`,
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
- `npx tsc --noEmit` exit 0 both packages; `/health` 200; `/login` 200.

**⚠️ CSP is report-only and deliberately not enforced.** It will report exactly two violations,
both expected: the inline theme script in `app/layout.tsx` (must run pre-paint to avoid a
light/dark flash) and Next's own inline bootstrap (`self.__next_f.push`). Making them pass needs
`'unsafe-inline'` on `script-src`, which materially weakens CSP against the very XSS this task
defends against. The real fix is a per-request nonce in middleware or a SHA-256 hash of the theme
script. **Do not promote this policy to enforcing until that lands** — it would advertise
protection it does not provide.

**Post-commit fix — infinite redirect loop (reported by the user).** Opening the app gave
`ERR_TOO_MANY_REDIRECTS`: `/dashboard` → 307 → `/dashboard` forever.

Cause: the canonical-host redirect I added to `middleware.ts` guarded on
`request.nextUrl.hostname`, which in dev **always reports `localhost`** regardless of the Host
header, so the guard never matched and every request redirected to itself. Reading the real
`Host` header fixed the guard, but exposed a second problem: `NextResponse.redirect()` rewrites
a Location it considers same-deployment back to a bare path, dropping the host change — so
`localhost` still looped. Setting the `Location` header by hand on a raw `NextResponse` did not
help; Next normalises it either way.

**Resolution: the redirect cannot be done from middleware at all.** Removed it from
`middleware.ts` and moved it into the browser (`providers.tsx`), where `location.replace()` is
not rewritten by anything and cannot loop, because after it runs the hostname no longer matches.

Verified: `127.0.0.1:3000/` and `localhost:3000/` both terminate in **3 hops**
(`/` → `/dashboard` → `/login` → 200); `/login` 200; `/dashboard` without a cookie redirects to
`/login?from=%2Fdashboard`; `/dashboard` **with** the `tj_session` cookie returns **200**,
proving the hint cookie does its job.

**Two further fixes after the user opened the app:**

*401 storm and double refresh on every load.* The backend log showed six `401`s, then **two**
`POST /refresh` (two token rotations), then six successful retries. The app was recovering, but
the dashboard's TanStack queries were racing `bootstrap()`: they fired before any access token
existed, the interceptor recovered each one, and its refresh raced the bootstrap already in
flight. `checkingAuth` existed for precisely this and **nothing consumed it** — an audit finding
in its own right. `(dashboard)/layout.tsx` now holds children behind a skeleton until bootstrap
resolves, so one refresh per load and no 401s on the happy path.

*Hydration failure — pre-existing, not caused by C6.* `theme-provider.tsx` called
`getInitialTheme()` from `useState`'s initialiser, i.e. **during render**. The server has no
`localStorage` and returned `'light'`; a client with a stored `'dark'` returned `'dark'`. The
Sidebar renders `ThemeToggle`, which emits a different icon *and* aria-label per theme, so the
client's first render did not match the server HTML and React discarded the entire tree
("The server HTML was replaced with client content in `<#document>`"). Initial state is now
`'light'` on both sides with the stored preference adopted in a mount effect, and the
apply-effect is gated on `mounted` so the placeholder cannot overwrite a stored `'dark'`. No
visual flash: the inline script in `app/layout.tsx` already applies the class before first
paint — this only catches React up to the DOM. Verified the server now renders the light-mode
markup deterministically.

**Not verified:** the browser itself. DevTools checks are in the handover.

**Deferred:** 2 items added.

---

## Deferred

Unrelated problems found while working on a scoped task. Not fixed, recorded here.

- **`TradeForm` submits no `pnl`, so manual trades still persist `pnl = NULL`.** C1 makes the
  request succeed; it does not make the numbers right. This is C3's job — noting it so nobody
  reads "trade creation works" as "trade creation is correct".
- **The two P&L previews are hardcoded to 4-decimal FX** (`TradeForm.tsx:56-64`,
  `edit/page.tsx:42-49`, both `* 10000`). Wrong for XAUUSD, JPY pairs, and indices. C3.
- **`isSubmitting` can never be true on the edit page's failure path**: `onSubmit` does not
  wrap `mutateAsync` in try/catch, so a rejected mutation throws out of the submit handler.
  Cosmetic today (`updateTrade.isError` still renders); belongs with H11's error-surfacing work.
- **Unused `formatDuration` import** in `frontend/src/lib/utils.ts:3`. H13.
- **Unused `errors` destructure** in `trades/[id]/edit/page.tsx:28` — the edit form renders no
  field errors at all. H11.
- **Sub-minute precision is dropped** when an existing timestamp round-trips through the edit
  form — `datetime-local` defaults to `step="60"`, so emitting seconds makes the input invalid
  and blocks submit (see the C1 log entry). Editing an MT5-synced trade therefore rewrites
  `closeTime` seconds to `:00`. Identical to pre-C1 behaviour, so not a regression. Two ways
  out, both out of C1's scope: add `step="1"` to every datetime-local input and re-enable
  seconds, or submit `closeTime` only when react-hook-form reports the field dirty. The second
  is the better fix and belongs with H11.
- **Number inputs have the same step-mismatch trap, pre-existing.** `entryPrice`, `exitPrice`,
  `stopLoss`, `takeProfit` all use `step="0.00001"`, so any price with more than 5 decimal
  places (crypto, some indices) makes the field invalid and the browser silently refuses to
  submit — no error text, since these fields render none. Ties into the audit's crypto-precision
  finding and H11.
- **The local Postgres password was also published** in the committed `backend/.env`
  `DATABASE_URL`. Not rotated: the database listens on `localhost:5432` only, so it is not
  remotely reachable, and changing it means altering the Postgres role and updating `.env`
  together. Worth doing if that database is ever exposed beyond this machine.
- **CSP needs nonces before it can be enforced.** Currently report-only with `'unsafe-inline'`
  on `script-src`. Needs a per-request nonce issued in `middleware.ts` and threaded through
  Next's script tags, or a SHA-256 hash of the theme init script, then flip the header name to
  `Content-Security-Policy`.
- **Password change does not invalidate outstanding sessions** (there is no password-change
  endpoint yet). When H7 adds one, it must delete every `sessions` row for that user, or a
  stolen refresh token survives the password change — the scenario the audit calls out.
- **Rate-limit counters are in-memory and per-process.** Documented at the top of
  `rateLimit.ts` with a TODO. Redis is already provisioned in docker-compose and unused. Must
  land before a second instance runs, or every limit silently doubles.
- **`trust proxy` is unset.** Correct today (no proxy), but behind one every request would
  carry the proxy's IP and each per-IP limit would become a single global limit.
- **`GET /api/accounts` still returns `userId` and `initialBalance`** to the client. Neither is
  secret and `initialBalance` will be needed for drawdown anchoring (M9), but `userId` is
  redundant — the caller is that user. Trim when the account response shape is next revisited.
- **The dashboard does not yet surface `unpricedTrades`.** The API now returns it and the
  frontend type carries it, but no component renders it. Until it does, a user with unpriced
  trades sees `totalTrades` and the money figures without being told the two cover different
  sets. Small UI addition, belongs with H11/M12.
- **`analyzeStreaks` skips unpriced trades rather than breaking the run.** `[-5, -6, null, -7]`
  therefore reads as a 3-trade losing streak. The alternative — treating an unknown result as a
  break — would understate real streaks. Chosen deliberately and asserted in the fixtures;
  revisit if it reads wrong to a trader.
- **Analytics silently ignores an invalid `from`/`to` instead of rejecting it.** C10 fixed the
  trades query; `analytics.router.ts`'s own `QuerySchema` still declares `from`/`to` as bare
  `z.string().optional()`. It does not 500 — `analytics.service.ts:29` runs them through a
  `dateOrNull()` guard — but that means `?from=garbage` returns **HTTP 200 with all-time
  data**, presented as though the requested date filter had applied. Verified live. Wrong
  numbers stated confidently is arguably worse than an error; fix by reusing `isoDate()`.
- **`from`/`to` on `/api/trades` now require a full ISO 8601 timestamp with offset**, so a
  natural date-only range (`?from=2026-08-01`) returns 400. Nothing sends these today. If a
  date-range picker is built later, either send `T00:00:00.000Z` or widen the schema with an
  explicit date-only branch.
- **README still states port 4000, Swagger docs at `/api/docs`, and a NestJS stack** (lines
  ~88, 89, 102 and the stack section). C2 corrected only the endpoint paths and the two sync
  URLs it rewrote; the rest of the stale prose is H12's job.
- **`currency` can be saved blank.** The Settings account form registers `currency` as a plain
  text input, so leaving it empty submits `''`; both the frontend and backend Zod schemas apply
  `.default('USD')` only when the field is `undefined`, and neither sets a `min(1)`. The account
  is created with an empty currency. Type `USD` explicitly until this is fixed. Relates to M3.

---

## Log

### 2026-08-04 — Session setup (no code changes)

**Changed:** Added `CLAUDE.md` (project ground truth: Express not NestJS, port 5000, `/api`
prefix, `router → service → schema` convention, Prisma snake_case `@map`, `Decimal` money,
manual FE/BE path-sync rule) and this file.

**Verified:**
- `cd backend && npx tsc --noEmit` → exit 0, no output.
- `cd frontend && npx tsc --noEmit` → exit 0, no output.
- Audit claims spot-checked against the code and confirmed independently:
  `analytics.router.ts` registers `/by-symbol` and `/by-day` while `useTrades.ts:143,150` call
  `/analytics/pnl-by-day` and `/analytics/pnl-by-symbol`; `accounts.router.ts:64` registers
  `/:id/regenerate-api-key` while `settings/page.tsx:41` posts `/accounts/:id/regen-key`;
  `server.ts:5` hard-binds `127.0.0.1`; `config/env.ts:15` defaults `PORT` to 5000.
- 103 `backend/dist/` files, 132 `frontend/.next/` files, and `backend/.env` +
  `frontend/.env.local` are tracked in git despite `.gitignore`.

**Deferred:** nothing.

### 2026-08-04 — C1: datetime-local → ISO 8601 serialisation

**Changed:**
- `frontend/src/lib/utils.ts` — added `datetimeLocalToIso()` (parses the offset-less
  datetime-local value as local time via `new Date()`, returns `date.toISOString()`; blank or
  unparseable input returns `undefined` so the caller omits the field) and
  `isoToDatetimeLocal()` (formats from *local* getters — the old `toISOString().slice(0,16)`
  displayed UTC and shifted the clock for every user outside it; truncates to whole minutes,
  see the step-mismatch note below).
- `frontend/src/components/trades/TradeForm.tsx` — `onSubmit` converts `openTime` and
  `closeTime`; the `openTime` default now uses `isoToDatetimeLocal`.
- `frontend/src/app/(dashboard)/trades/[id]/edit/page.tsx` — same for `closeTime` on both
  submit and form default.
- Backend schema deliberately unchanged: ISO 8601 with offset is the correct wire format.

**Self-caught regression (fixed before this commit left the machine).** The first version of
`isoToDatetimeLocal` preserved non-zero seconds, to keep MT5-synced timestamps lossless. That
would have re-broken trade logging by a different mechanism: `<input type="datetime-local">`
defaults to `step="60"`, neither trade form sets `noValidate`, and no datetime-local input
sets a `step`. A value like `2026-08-04T18:54:21` is therefore a **step mismatch** — the
browser marks the field invalid, never fires `submit`, react-hook-form's `onSubmit` never
runs, and "Save Trade" does nothing but show a native tooltip. Since the create form's default
is `new Date()`, that would have hit ~59 of every 60 page loads. Unit tests over the pure
functions passed throughout and would never have caught it; it was found by re-reading the
click-path against the markup. Values are now truncated to whole minutes, which is valid under
any `step`. Trade-off accepted: editing a trade whose `closeTime` carries seconds truncates it
to `:00` (same as the pre-C1 behaviour — not a regression). Logged under Deferred.

**Verified:** throwaway script (`frontend/tmp-c1-verify.ts`, run then deleted) importing the
real `CreateTradeSchema`/`UpdateTradeSchema` from `backend/src/modules/trades/trades.schema.ts`
and the real helpers from `frontend/src/lib/utils.ts` — no reimplementation of either side.
22 assertions, run under 5 timezones (UTC, Asia/Tokyo +9, America/New_York −4,
Asia/Kolkata +5:30, Pacific/Chatham +12:45): all pass, exit 0 in each. Covers: the raw value
is still rejected (bug reproduced), the converted value is accepted, the full create + patch
payloads parse, blank/whitespace/null/garbage all yield `undefined`, the converted instant
matches the local wall-clock time, whole-minute ISO round-trips exactly, sub-minute precision
truncates as documented, and — added after the regression above — every emitted value sits on
a whole minute, brute-forced over 600 consecutive seconds.
`npx tsc --noEmit` exit 0 in both packages.

Click-path re-checked against the actual markup: sidebar reads **Add Trade** (not "Log a
trade"); the button on `/trades` reads **Log trade**; `Settings → Add account → Create Account`
is the real account-creation flow; `createTrade` returns 201 with no other required field;
`TradesTable` defaults to `sortBy=openTime` so the post-save list does not hit the C10 500;
register redirects to `/dashboard` after setting the `tj-auth` cookie.

**Not verified:** the browser path. Needs a running backend, Postgres, and a broker account —
click-path handed to the user rather than claimed. The step-mismatch class of bug is only
provable in a real browser; the guard against it here is a value-shape assertion, not a
rendering test.

**Deferred:** 6 items added to the Deferred section above (none in C1's scope).
