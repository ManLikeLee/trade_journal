/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NULL AND ZERO P&L POLICY — the single definition. Both analytics and insights
 * import from here so they cannot drift apart again.
 *
 *   pnl === null   UNPRICED. The trade has no realised result: it was logged for
 *                  an instrument we cannot value, or its P&L was never supplied.
 *                  EXCLUDED from every win, loss, streak, average and win-rate
 *                  statistic. Reported separately as a count so the number is
 *                  visible rather than silently swallowed.
 *
 *   pnl === 0      SCRATCH. A genuine breakeven, which is a real outcome and not
 *                  a loss. Counted in the priced-trade total, excluded from both
 *                  wins and losses, and it BREAKS a streak rather than extending
 *                  a losing one.
 *
 *   pnl > 0        WIN.        pnl < 0   LOSS.
 *
 * These two services previously disagreed. analytics filtered nulls out, so the
 * dashboard reported 0 trades and $0.00 while the trades table listed them.
 * insights used bare `Number(t.pnl)`, and `Number(null) === 0`, so nulls were
 * treated as breakeven — and because `analyzeStreaks` branched on `> 0` with a
 * bare `else`, every null AND every genuine scratch was counted as a loss. A
 * user who logged 30 trades by hand was told they had lost 30 in a row and
 * advised to stop trading.
 *
 * Never reintroduce a bare `Number(t.pnl)` in a statistic. Use these helpers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type TradeOutcome = 'WIN' | 'LOSS' | 'SCRATCH' | 'UNPRICED';

/**
 * The realised P&L as a number, or null when the trade has no result.
 * Accepts Prisma Decimal, number, string or null.
 */
export function realisedPnl(pnl: unknown): number | null {
  if (pnl === null || pnl === undefined) return null;
  const n = Number(pnl);
  return Number.isFinite(n) ? n : null;
}

export function classifyOutcome(pnl: unknown): TradeOutcome {
  const value = realisedPnl(pnl);
  if (value === null) return 'UNPRICED';
  if (value > 0) return 'WIN';
  if (value < 0) return 'LOSS';
  return 'SCRATCH';
}

/** True when the trade has a realised result and belongs in money statistics. */
export function isPriced(trade: { pnl: unknown }): boolean {
  return realisedPnl(trade.pnl) !== null;
}

/** Keep only trades with a realised result. */
export function pricedOnly<T extends { pnl: unknown }>(trades: T[]): T[] {
  return trades.filter(isPriced);
}

/**
 * Win rate over decisive trades only. Scratches are excluded from the
 * denominator: a breakeven is neither a win nor a loss, so counting it as a
 * non-win would understate the figure.
 */
export function winRateOf(pnls: number[]): number {
  const wins = pnls.filter((p) => p > 0).length;
  const losses = pnls.filter((p) => p < 0).length;
  const decisive = wins + losses;
  return decisive === 0 ? 0 : (wins / decisive) * 100;
}
