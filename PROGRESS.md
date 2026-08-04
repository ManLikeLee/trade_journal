# PROGRESS — Audit Remediation

Tracking remediation of `TradeJournal-Engineering-Audit.md` (audited against commit `7a3be4d`).
Items are the audit's own Step 15 priorities. One task per commit; update this file at the end
of every task.

**Baseline at start (`7a3be4d`):** `backend` and `frontend` both pass `npx tsc --noEmit`.
No tests, no CI, no lint config exist, so typecheck is the only automated gate today.

---

## CRITICAL — nothing ships until these are done

- [ ] **C1** — Fix `datetime-local` → ISO 8601 serialisation in `TradeForm.tsx` and
      `trades/[id]/edit/page.tsx`. The core action (log a trade) returns 400 on every attempt.
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

- *(none yet)*

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
