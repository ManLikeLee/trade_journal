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
- [x] **C5** — Fix deployment. **Reshaped: no Docker.** The three broken Docker artifacts were
      deleted rather than repaired; `HOST` is now configurable and `build && start` is verified
      for both packages. *Done 2026-08-06.*
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
- [x] **C9** — Hash refresh tokens and API keys at rest (SHA-256); unique index on the hash.
      *Done 2026-08-06. Existing EA key and browser sessions kept working. EA auth lookup:
      Seq Scan → Index Scan, 21× faster at 10k accounts.*
- [x] **C10** — Whitelist `sortBy` as a Zod enum on both ends; make `duration` non-sortable.
      Clicking the Duration column header currently returns 500.
      *Done 2026-08-04 — verified live against the running API, 500 → 400 → UI can't send it.*
- [x] **C11** — Purge `.env`, `backend/dist/`, `frontend/.next/` from git; add `.env*` to
      `.gitignore`; rotate any exposed value.
      *Done 2026-08-05. `.git` 207 MB → 480 KB; secret rotated and old token proven rejected.*
- [x] **C12** — Add CI (`tsc --noEmit` + lint + tests on PR) and an ESLint config.
      *Done 2026-08-06. All steps green locally. Docker job non-blocking until C5 — see log.*

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
- [ ] **H13** — Delete dead code: ~~`useTradeSocket`~~, ~~`socket.io-client`~~, `pips`, the
      `mode` prop, `accountNumber` in the sync payload, the MetaMask suppressor,
      ~~the localhost fallback~~, `src/app/page.tsx`.
      *Partially done: the socket hook + dependency removed 2026-08-07 (3 CVEs); the localhost
      fallback went with C6.*

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

**Both jobs green.** Two follow-ups from the run's annotations:

*Node 20 deprecation.* The runner reported `actions/checkout@v4` and `actions/setup-node@v4`
target Node 20 and were being forced onto Node 24. Checking rather than assuming turned up
something worse than the warning implied: **Node 20 reached end of life on 2026-04-30**, so CI
was pinned to an unsupported runtime and `engines: >=20` permitted one. Actions bumped to
**v7** (latest for both — Dependabot's github-actions ecosystem would propose it anyway), CI
`node-version` to **22**, and `engines` to **>=22**, which also matches the local v22.15.0 so CI
and the developer machine cannot drift into different runtime behaviour.

*8 no-console warnings.* Expected — these are the recorded burn-down: 7 in `server.ts`'s
startup banner and 1 in `requestLogger.ts`. They are warnings by design and go away with **H8**
(structured logging), which replaces both with a real logger. They are deliberately not
suppressed: a disable comment would hide the count that H8 is meant to drive to zero.

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

**Was outstanding, now resolved — C9.** At the time of C7 the key was still plaintext in
`accounts.api_key`. **C9 has since removed that column entirely**: only a SHA-256 digest is
stored, and `apiKeyLast4` became the stored column this entry predicted it would need to be.

**Re-verified 2026-08-06** (after C9 and the folder move), live rather than from the code:
`GET /api/accounts`, `GET /api/trades/:id` and `GET /api/trades` were each scanned recursively
for a key named `apiKey` at any depth — **absent from all three**. `trade.account` exposes only
`broker, currency, id, name, platform`; the trades list carries no account relation at all;
`GET /api/accounts` returns `hasApiKey` + `apiKeyLast4` and **not** `apiKeyHash`. The raw key
appears only in the create and regenerate responses.

**Mask fixed.** The card rendered `'•'.repeat(28) + last4`, implying a 32-character key — wrong
against the original 36-char UUID and more wrong against C9's 43-char token. The client cannot
know the real length any more (only the last 4 are stored), so the mask no longer claims one:
`•••• •••• •••• last4`.

**Over-fetch re-audit after C9's new queries.** Seven reads still fetch full rows
(`auth.login`, three in `accounts.service`, four in `trades.service` notes/sync,
`analytics.getClosedTrades`). None reaches a client unmapped: every account row exits through
`toPublicAccount`, which strips both `apiKey` and `apiKeyHash` by destructuring, and the live
responses above confirm it. They are a blast-radius and performance concern rather than a leak
— the trades ones are M7's `include`-stripping work and analytics is H1's.

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
computed once at startup.

**Re-measured 2026-08-07 through the live API** (the original figure came from timing bcrypt
directly, which is weaker evidence). 20 requests per group, each to a distinct email so the
IP+email limiter never trips — 20 users seeded directly in the database, since the register
limiter allows only 3/hour:

| Path | n | min | median | max | mean |
|---|---:|---:|---:|---:|---:|
| known email + wrong password | 20 | 289 ms | **318 ms** | 395 ms | 329 ms |
| unknown email (dummy hash) | 20 | 295 ms | **323 ms** | 582 ms | 342 ms |
| *pre-fix* unknown email (lookup only, no bcrypt) | 20 | 0.8 ms | **1.4 ms** | 52 ms | — |

Medians differ by 5 ms in ~320 ms (1.5%) and the ranges overlap almost entirely. Against the
pre-fix path the gap was **~230×**.

*The first run of this measurement was wrong and was thrown away*: the `cd` that generated the
bcrypt hash silently failed, so 20 users were seeded with an **empty** `password_hash`, and
`bcrypt.compare` against an empty string returns false immediately. That produced a 26 ms vs
326 ms split — an apparent timing oracle in the opposite direction, entirely an artefact of the
harness. Re-seeded with a real 60-char `$2b$12$` hash and re-run.

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

*One 401 survived the layout gate.* `Sidebar` calls `useAccounts()` and renders **outside**
`<main>`, so gating only `children` never covered it. Rather than blank the chrome too, the
request interceptor in `lib/api.ts` now awaits the session when no token is present yet: any
caller mounted before bootstrap finishes joins the shared in-flight refresh, so it costs one
request no matter how many queries are waiting, and it covers components added later without
each needing an `enabled` flag. Auth endpoints are skipped, which also prevents recursion since
`refreshAccessToken()` itself calls `POST /auth/refresh`.

*Logout appeared to do nothing.* `Sidebar` called `logout()` and stopped there: state cleared
and the cookie was cleared server-side, but nothing navigated, so the user sat on the dashboard
until a reload let middleware redirect. Pre-existing shape, far more visible now that a stale
page no longer has a token to work with. `handleLogout` now awaits the call, then
`router.replace('/login')`, and is guarded against double-clicks.

It also **clears the TanStack query cache**, which is held in memory and survives logout —
without that, the next account to sign in on the same tab would briefly render the previous
user's trades and balances from cache before refetching. That is a cross-account data exposure
in a shared-browser scenario, not just a staleness bug.

*401 burst after logout.* Logout worked, but the console filled with 401s. Cause: clearing the
query cache **while the dashboard was still mounted** made every active query refetch
immediately, moments after the session was destroyed — each refetch then triggered a refresh
attempt that also 401d. The deeper problem was that the client could not distinguish "no token
yet, ask the cookie" from "no token because the user just signed out"; the refresh cookie is
httpOnly, so asking the server was the only way to find out. Added a `sessionEnded` flag in
`access-token.ts`, set on logout and on any failed refresh, cleared on login/register/successful
refresh. The request interceptor now fails fast with a `CanceledError` instead of hitting the
network, and the response interceptor stops attempting recovery. `handleLogout` also navigates
before clearing the cache, so the queries are unmounted by the time it happens.

One 401 remains on a cold load while signed out — the bootstrap asking whether a session exists.
That is unavoidable without reading an httpOnly cookie, and it is how the app discovers it has
no session.

**Not verified:** the browser itself. DevTools checks are in the handover.

**Deferred:** 2 items added.

### 2026-08-06 — C9: hash tokens at rest, index the EA auth path

**Two migrations, deliberately split** so the backfill sits between them and nothing is dropped
before its replacement is populated:

`20260806000000_add_token_hashes_and_query_indexes` — adds `sessions.refresh_token_hash`
(unique), `accounts.api_key_hash` (unique), `accounts.api_key_last4`; adds
`@@index([expiresAt])` on sessions and the two composites on trades; drops `trades_symbol_idx`
and `trades_status_idx`.

`20260806010000_drop_raw_token_columns` — drops `sessions.refresh_token` and
`accounts.api_key`. Opens with a `DO $$` guard that **raises and aborts** if any row still holds
a raw value with no hash, naming the backfill script in the error. Dropping these is
irreversible and would silently invalidate a live API key, so it must not run against a
database that has not been backfilled.

Both generated with `prisma migrate diff` rather than hand-written — the audit flagged
hand-editing as the cause of schema/migration drift. Verified afterwards with
`migrate diff --exit-code` → 0: schema and database agree.

**New:** `utils/token.ts` — `generateToken()` (32 random bytes, base64url, 256 bits, replacing
`randomUUID`'s 122), `hashToken()`, `tokenLast4()`.

**Why SHA-256 and not bcrypt**, documented at length in the file because it looks wrong at a
glance: these are 256-bit CSPRNG values, not human passwords. There is no dictionary and no
feasible offline search, so a work factor buys nothing — while bcrypt would add ~250 ms to
**every EA sync request** and, because it salts each hash, would make the column unindexable.
That would force a scan-and-compare over every row, which is exactly the sequential scan this
task exists to remove. Passwords still use bcrypt at cost 12, which is correct.

**`apiKeyLast4` is now a stored column.** C7 sliced it off the plaintext; with the plaintext
gone it cannot be derived from a hash. Flagged as a consequence in the C7 entry, resolved here.

**Nothing broke, as promised in the task:**
- **Your live EA key still authenticates** — tested against `/api/mt-sync/trades` both before
  and after the raw column was dropped: **200**, and a wrong key **401**. Hashing an unchanged
  raw value yields the value the backfill already stored, so no key had to be re-copied into MT5.
- **Existing browser sessions stayed signed in** — all 5 session rows backfilled, and every hash
  was verified *in Postgres* against its raw value (`encode(sha256(refresh_token::bytea),'hex')
  = refresh_token_hash`): **5/5 sessions, 2/2 accounts matched** before anything was dropped.
- Full cycle re-tested on the new code: register 201 → refresh 200 → refresh 200 → logout 204 →
  refresh 401.
- New sessions and accounts store **only** the digest: `refresh_token IS NULL` / `api_key IS
  NULL` with a 64-char hex hash, and a 43-char raw key returned to the client once.

**Index performance, measured** — at 3 rows Postgres correctly ignores any index, so 10,000
temporary accounts were inserted, measured, and removed:

| | Plan | Buffers | Rows filtered | Time |
|---|---|---|---|---|
| After C9 (`api_key_hash`, unique index) | **Index Scan** | 4 | 0 | **0.171 ms** |
| Equivalent to before (index disabled) | Seq Scan | 205 | 10,002 | 3.678 ms |

**21× faster on the hottest, least-authenticated path in the system**, executed by every EA on
every sync cycle.

**The backfill script survives deliberately.** It is rewritten against raw SQL rather than the
Prisma client, because the columns it reads no longer exist in the schema and a typed query
would not compile. Migration `20260806010000` names it in its guard, so anyone restoring a
pre-C9 backup needs it to work; on an already-migrated database it detects the missing columns
and exits cleanly.

**Deferred:** 1 item added.

### 2026-08-06 — C12: the gate

**New:** `.github/workflows/ci.yml`, `.github/dependabot.yml`, `backend/.eslintrc.json`,
`frontend/.eslintrc.json`, `.prettierrc.json`, `.prettierignore`.
Added `eslint`, `@typescript-eslint/*` and `prettier` to both packages; `engines: node >=20` on
both; `lint`, `format:check` and `test` scripts on both.

**CI runs on `pull_request` and `push` to main**, in three jobs:

| Job | Steps |
|---|---|
| Backend | `npm ci` (cached) → `prisma generate` → `tsc --noEmit` → lint → **build** → test |
| Frontend | `npm ci` (cached) → `tsc --noEmit` → lint → **build** → test |
| Docker | build both images — **non-blocking**, see below |

`prisma generate` is required before `tsc`: the client is generated code, and without it a
clean checkout fails to typecheck. Two steps beyond the brief: **`npm run build` in both jobs**,
because typechecking does not compile every route and the build is the strongest cheap proof
the app is shippable — the backend build also demonstrates it emits `dist/server.js`, which is
*not* what `backend/Dockerfile` invokes.

**⚠️ The Docker job is `continue-on-error: true` and must not stay that way.** The frontend
image cannot build: `next.config.js` never sets `output: 'standalone'`, so `.next/standalone`
is never produced, and `public/` does not exist — both `COPY` instructions fail. That is C5,
descoped because this project runs without Docker. Left blocking, CI would be permanently red
and would stop being read, which is worse than no CI. **Remove `continue-on-error` the moment
C5 lands.** Docker is not installed on this machine, so this is the one job that could not be
run locally.

**Lint: 0 errors in both packages.** Backend rules all run at **error**; 7 pre-existing errors
were fixed rather than suppressed, since they were small and real: an unused import, a
`prefer-const`, two `Decimal`s in template literals, two unsafe `any` accesses reading
`req.body`/`req.cookies`, and `no-namespace` on the Express `Request` augmentation — that last
resolved with `allowDeclarations: true`, which is the idiomatic answer for module augmentation
rather than an inline disable.

**Frontend burn-down — 22 pre-existing errors set to `warn`, per the task's instruction not to
mass-fix.** Counts recorded in `frontend/.eslintrc.json` next to the rules:

| Rule | Count | Notes |
|---|---:|---|
| `@typescript-eslint/no-explicit-any` | **32** | the audit counted 29 |
| `@typescript-eslint/no-floating-promises` | **16** | 8 of them in the dead `useTradeSocket.ts` (H13) |
| `@typescript-eslint/no-unused-vars` | **5** | incl. the dead `mode` prop and `formatDuration` (H13) |
| `no-console` | **1** | down from the audit's 30; C6 removed the rest |

Raise each to `error` as its count reaches zero. The backend already runs all four at `error`,
so they cannot regress there. One genuine error was fixed: an unescaped apostrophe in JSX.

**Prettier config only — no repo-wide format**, as instructed. `prettier --check` currently
fails across the codebase; a one-shot format belongs in its own commit so it does not bury
every future diff.

**`tailwindcss`, `postcss` and `autoprefixer` moved to `devDependencies`** — they were shipping
in the production install.

**Verified locally, every step:**
```
BACKEND    prisma generate 0 | tsc 0 | lint 0 (0 errors, 9 warnings) | build 0 | test 0
FRONTEND   tsc 0 | lint 0 (0 errors, 54 warnings) | build 0 (compiled successfully) | test 0
npm ci     backend 0 | frontend 0        (CI uses npm ci, not npm install)
```

**Deferred:** 2 items added.

### 2026-08-06 — C4 part 2: analytics date filters validated

Promoted out of Deferred. `analytics.router.ts` declared `from`/`to` as bare
`z.string().optional()`, and `analytics.service` ran them through a parser that returned null on
failure — silently dropping the filter. Reproduced live before the fix on a seeded account of 3
July trades:

| Request | Before | |
|---|---|---|
| `?from=2026-07-01T00:00:00.000Z` | 200, 3 trades | correct |
| `?from=2026-08-01T00:00:00.000Z` | 200, 0 trades | correct — July excluded |
| **`?from=garbage`** | **200, 3 trades, $300** | **filter silently dropped, all-time data returned as filtered** |

Worse than the 500 C10 fixed: an error says something went wrong; this states a wrong number
confidently on a P&L report.

**Correction to the earlier Deferred note:** it implied any invalid date silently widened. Not
so — date-only `?from=2026-08-01` **worked correctly** (`new Date()` parses it), returning 0.
Only genuinely unparseable strings were dropped. The bug was narrower than recorded, and the
live reproduction is what showed it.

**Changed:** new `utils/schema.ts` holding the single `isoDate()` definition, imported by both
`trades.schema.ts` and `analytics.router.ts` — it lived inside the trades module, and having
analytics import another module's schema would breach the `router → service → schema`
boundary. Widening it later for a date-only form updates every router at once (point 8).

**Point 7 — `dateOrNull` kept, but inverted.** Renamed `parseDateFilter` and it now **throws**
`BadRequestError` instead of returning null. Deleting it would have been defensible, but a
service is exported and reachable from a script, a job, or a future route that forgets to
validate; the failure mode being guarded against is a silently wrong number, so the guard must
fail loudly. A separate `dateOrNull` remains for values read *out of* the database, which
cannot be invalid.

**Behaviour change worth stating:** date-only `?from=2026-08-01` now returns **400** on
analytics, where it previously worked. That is deliberate — it matches `/api/trades` since C10,
and a date without an offset means different instants in different timezones, which this
codebase is already naive about (M2). Documented in `utils/schema.ts` with the widening path.

**Verified live:** `?from=garbage` and `?to=nonsense` → **400** with a field-level message;
valid ISO ranges → **200** and correct filtering (July range 3 trades, August range 0); no
params → 200. All four other analytics endpoints (`equity-curve`, `by-day`, `by-symbol`,
`insights`) → **400** on garbage too.

**Part 1 re-verified** after the folder move — 8 streak fixtures, all correct, and the three
cases that matter produce **no streak insight at all**: all-nulls, all-zeros, and 30
hand-logged unpriced trades. `summary` and `insights` agreed on a seeded 3-priced/4-unpriced
account: both reported 3 and 4.

`npx tsc --noEmit` exit 0 both packages; backend lint 0.

### 2026-08-06 — C5: deployable without Docker

**The user does not want Docker in this project**, so the task was reshaped: rather than repair
three artifacts that have never worked, delete them and verify the path that is actually used.

**Deleted:** `backend/Dockerfile` (its `CMD` invoked `dist/src/main`, the entry point of the
NestJS app this project replaced — the audit called it a live hazard), `frontend/Dockerfile`
(copied `.next/standalone`, which is never produced, and a `public/` that does not exist — it
could not build), `docker-compose.yml` (published 4000 against an app on 5000, and provisioned
a Redis nothing references). The CI `docker` job went with them, so **CI is now three jobs, all
blocking, no `continue-on-error`** — the caveat recorded in C12 is resolved.

**The fix that actually mattered:** `server.ts` hardcoded `const HOST = '127.0.0.1'`. That is
correct for local development and fatal on any platform that routes traffic into the process —
Railway, Render, Fly, systemd behind nginx — with no way to override it. `HOST` is now an env
var defaulting to loopback, so local stays safe and deployment is one variable away.

Also fixed while in `server.ts`: shutdown closed the HTTP server but never called
`prisma.$disconnect()`, leaking a Postgres connection on every restart — which matters most on
exactly the platforms that restart on each deploy.

**Verified by running it, not by reasoning about it:**

| Check | Result |
|---|---|
| `backend npm run build` | exit 0, emits `dist/server.js` |
| `node dist/server.js` (PORT=5099) | starts, `GET /health` → **200** |
| `HOST=0.0.0.0` | binds `*:5099`, reachable on the LAN IP `172.20.10.2` → **200** |
| SIGTERM | `shutting down gracefully` → `Server closed`, no hang |
| `frontend npm run build` | exit 0, compiled successfully, 8 routes |
| `next start` (PORT=3099) | ready in 692 ms, `GET /login` → **200**, CSP/HSTS/X-Frame headers present |

The dev servers were stopped for the frontend production build (shared `.next`) and restarted
afterwards; both confirmed healthy on 3000/5000.

`tsc` 0 and `eslint` 0 errors in both packages. One error the new linter caught in my own
change: `shutdown` was declared `async` with nothing to await — exactly the kind of thing C12
exists to stop.

**Deferred:** 1 item added.

### 2026-08-06 — R:R split into two named metrics (C3 follow-up, user chose option b)

The single `riskReward` field was resolved `takeProfit ?? exitPrice` on write and
`exitPrice ?? takeProfit` on read. I originally kept the write-path ordering; the user preferred
the read path, then chose the third option — **two named metrics** — which is the correct answer
because *neither* ordering fixes the defect. Under either, the column means the plan for some
rows and the outcome for others, with nothing to tell a caller which it is holding.

**The data proved it.** Recomputing both from stored prices surfaced this row:

```
XAUUSD SELL  entry 4257.27  SL 4279.69  TP 4133.30  exit 4279.74
             planned 5.5294        realised -1.0022
```

A trade stopped out for a full loss stored **5.5294** — its plan — and contributed that to the
dashboard's "Avg R:R". Losing trades were inflating the headline reward figure.

**Migration `20260806120000_split_risk_reward`** adds both columns, **recomputes** them from
`entry/stop/take_profit/exit` in SQL, then drops the old one. Recomputed rather than copied: the
old values are a mix, and copying would carry the ambiguity forward under a name asserting it is
gone. Verified afterwards with `migrate diff --exit-code` → 0. Of 25 trades, 10 have a planned
value and 4 a realised one.

**Changed:** `domain/pnl.ts` exports `plannedRiskReward` and `realisedRiskReward` over a shared
`riskDistance` helper (a stop on the wrong side of entry yields null, not infinity);
`computeMetrics` returns both; `SORTABLE_FIELDS` and the frontend mirror both;
`getSummary` returns `avgPlannedRR` and `avgRealisedRR` in place of `avgRR` — planned averages
positive ratios only, realised includes negatives, which is the entire point of measuring
outcomes.

**Display fixed as a consequence.** Realised R:R is signed, and the table rendered `1:{value}`,
which for a stopped-out trade would print `1:-1.00`. Realised is now shown as an R multiple
(`-1.00R`, colour-coded); planned keeps ratio notation. The dashboard tile shows the realised
average with the planned one beneath it.

**Verified live** against hand-calculated values — entry 1.1000, stop 1.0900 (risk 100 pips),
target 1.1300 (reward 300 pips):

| Outcome | Hand | API |
|---|---|---|
| stopped out at 1.0900 | planned 3.0000, realised −1.0000 | **3 / −1** |
| target hit at 1.1300 | planned 3.0000, realised +3.0000 | **3 / 3** |
| still open | planned 3.0000, realised null | **3 / null** |

`avgPlannedRR` 3, `avgRealisedRR` 1 (mean of −1 and +3); `avgRR` absent from the response.
`sortBy=plannedRiskReward` and `realisedRiskReward` → 200, `sortBy=riskReward` → **400**, so
C10's whitelist moved with the rename. `tsc` and lint 0 in both packages.

### 2026-08-07 — Dependency triage: 10 Dependabot PRs, and the update none of them proposed

**Merged:** #2 (backend minor-and-patch, 6 updates) and #7 (frontend minor-and-patch, 18).
**Closed:** #3, #4, #5, #6, #9, #11 — six majors, all failing CI.
**Left open deliberately:** #8 recharts 2→3 and #10 date-fns 3→4.

**Correction to my own advice.** I called all four CI-green PRs "low risk, safe to merge". Two
of them are **major** bumps of libraries whose output is visual — recharts renders both charts,
date-fns formats every date and the trade durations. Green CI means they compile; nothing in CI
renders a chart. I only caught it when the merge conflicted and I read the diff. They stay open
for a visual check, one at a time.

**`npm audit` found what Dependabot never proposed.** `next` was **CRITICAL** with an in-range
fix, but no PR existed for it: `open-pull-requests-limit: 5` saturated both ecosystems on the
first run and silently queued the rest. A cap that hides a critical security update is worse
than the noise it prevents — raised to 10.

| | critical | high | moderate | total |
|---|---:|---:|---:|---:|
| start | 1 | 13 | 1 | **15** |
| after next@14.2.35 + group PRs | 0 | 12 | 1 | 13 |
| after deleting dead code | 0 | 10 | 0 | **10** |

**Three advisories were removed by deleting code that did nothing.** `engine.io-client`,
`socket.io-parser` and `ws` all came from `socket.io-client`, imported only by
`useTradeSocket.ts` — a hook connecting to `localhost:4000`, a port nothing has ever listened
on, for a Socket.io server that does not exist in the backend. Deleted both, plus the stale
`NEXT_PUBLIC_WS_URL` it needed. Shared bundle 87.2 → 87.6 kB (the group PR's updates offset the
saving), lint warnings 54 → 45.

**Next.js 14 is out of security support** — `14.2.35` is the last 14.2.x, and the remaining ~20
advisories are only fixed in ≥15.5.21. Deliberately **not** upgrading now; see Deferred for the
reasoning and the trigger.

**Verified:** `tsc`, `lint`, `build` all 0 in both packages; both lockfiles install from a
**cold cache** on a clean clone (516 / 303 packages).

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
- **No deployment target is configured.** C5 makes the app deployable — `HOST`, a working
  `build && start`, no Docker — but nothing is actually deployed. The audit's showcase list
  wants a live URL in the README. Railway or Render for the backend plus Vercel for the
  frontend build from source and need no Docker; both need `HOST=0.0.0.0`, a managed Postgres
  `DATABASE_URL`, a real `JWT_SECRET`, and `NEXT_PUBLIC_API_URL` pointing at the deployed API.
- **Next.js 14 → 15/16 upgrade, gated on deployment.** `14.2.35` is the final 14.2.x; ~20
  advisories are fixed only in ≥15.5.21. **Not urgent today**: the app is localhost-only,
  undeployed, and uses *none* of the vulnerable surface — verified 0 usages of `next/image`,
  Server Actions, `rewrites` and `i18n`, which is what almost every advisory targets. It
  becomes a hard blocker the moment anything is publicly reachable. Sequence it **after H4**:
  a framework major with no test suite is the exact pattern this audit exists to correct. Note
  Next 15 makes route `params` a Promise, which would *reverse* the fix made in C6.
- **recharts 2→3 (#8) and date-fns 3→4 (#10) are open and need a visual check**, not a merge
  button. Both are majors affecting rendered output; CI can only prove they compile.
- **A warm npm cache can hide a broken lockfile.** `npm ci` locally is not proof the lockfile
  installs: an unpublished or yanked version still resolves from cache. Verify with
  `npm ci --cache "$(mktemp -d)"` on a fresh clone when touching dependencies, which is what
  CI actually does.
- **One-shot Prettier format commit.** Config is in place but nothing is formatted;
  `prettier --check .` fails repo-wide. Run `npx prettier --write .` in its own commit, touching
  nothing else, so the reformat does not contaminate future diffs or `git blame`.
- **CI has no database, so nothing integration-tests the API.** The jobs typecheck, lint and
  build; they never start the server or touch Postgres. H4 should add a `services: postgres`
  block and run the suite against it — that is what would catch a C1-class defect, which
  typechecking cannot see by construction.
- **Refresh-token reuse detection is still absent** (audit S-5 / M13). C9 makes a stolen token
  unrecoverable from a database dump, but a token stolen *in transit or from the client* is
  still usable until it rotates, and replay after rotation fails silently rather than revoking
  the family and alerting.
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
