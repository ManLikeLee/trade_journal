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
- [ ] **C2** — Fix 4 endpoint path mismatches: `pnl-by-symbol` → `by-symbol`,
      `pnl-by-day` → `by-day`, `regen-key` → `regenerate-api-key`, `/trades/sync` →
      `/mt-sync/trades` (README + in-app EA snippet).
- [ ] **C3** — Implement server-side P&L with a symbol-spec table; subtract commission and
      swap; backfill existing rows. Manual trades currently persist `pnl = NULL` forever.
- [ ] **C4** — Fix null/zero handling in `analyzeStreaks`; unify null policy across
      `analytics.service.ts` and `insights.service.ts`. Depends on C3.
- [ ] **C5** — Fix deployment: `HOST=0.0.0.0`, `CMD ["node","dist/server.js"]`, align
      PORT/EXPOSE/compose, add `output:'standalone'`, create `public/`, add `.dockerignore`.
- [ ] **C6** — Move refresh token to an `httpOnly; Secure; SameSite=Strict` cookie; access
      token in memory only; add CSP.
- [ ] **C7** — Stop leaking `apiKey`: explicit `select` on `getTrade` and `listAccounts`;
      show the key once on create/regenerate.
- [ ] **C8** — Add rate limiting on auth and sync endpoints.
- [ ] **C9** — Hash refresh tokens and API keys at rest (SHA-256); unique index on the hash.
- [ ] **C10** — Whitelist `sortBy` as a Zod enum on both ends; make `duration` non-sortable.
      Clicking the Duration column header currently returns 500.
- [ ] **C11** — Purge `.env`, `backend/dist/`, `frontend/.next/` from git; add `.env*` to
      `.gitignore`; rotate any exposed value.
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
