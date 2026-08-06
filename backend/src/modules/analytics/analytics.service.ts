/**
 * NULL AND ZERO P&L POLICY (see domain/trade-outcome.ts for the full statement):
 *
 *   pnl === null → UNPRICED. Excluded from every money statistic here, but
 *                  counted and reported as `unpricedTrades` rather than silently
 *                  dropped — which is what made the dashboard report 0 trades
 *                  while the trades table listed them.
 *   pnl === 0    → SCRATCH. A real outcome, not a loss. Counted in
 *                  `pricedTrades`, excluded from wins, losses and the win-rate
 *                  denominator.
 *
 * `insights.service.ts` applies the same policy. The dashboard and the insights
 * panel must never report different trade counts for the same data.
 */
import { TradeDirection, TradeStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { plannedRiskReward, realisedRiskReward } from '../../domain/pnl';
import { isPriced } from '../../domain/trade-outcome';
import { BadRequestError } from '../../utils/errors';

export interface AnalyticsQuery {
  accountId?: string;
  from?: string;
  to?: string;
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a date filter, or throw.
 *
 * KEPT rather than deleted now that the router validates with isoDate(), but its
 * behaviour is inverted. It used to return null on an unparseable value, which
 * silently dropped the filter and returned all-time data labelled as filtered —
 * a confidently wrong number on a P&L report.
 *
 * As a belt-and-braces guard it must fail loudly: a service is exported and can
 * be called from a script, a job, or a future route that forgets to validate.
 * Silently widening a date range must never be reachable again by any path.
 */
function parseDateFilter(value: unknown, field: 'from' | 'to'): Date | null {
  if (value == null) return null;
  const parsed = new Date(value as string);
  if (isNaN(parsed.getTime())) {
    throw new BadRequestError(`Invalid ${field} date`);
  }
  return parsed;
}

/** Null-safe parse for values already in the database, which cannot be invalid. */
function dateOrNull(v: unknown): Date | null {
  if (v == null) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

async function getClosedTrades(userId: string, query: AnalyticsQuery) {
  const userAccounts = await prisma.account.findMany({
    where: { userId, ...(query.accountId && { id: query.accountId }) },
    select: { id: true },
  });
  const accountIds = userAccounts.map((a) => a.id);

  const from = parseDateFilter(query.from, 'from');
  const to = parseDateFilter(query.to, 'to');

  return prisma.trade.findMany({
    where: {
      accountId: { in: accountIds },
      status: TradeStatus.CLOSED,
      ...(from || to
        ? {
            closeTime: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    },
    orderBy: { closeTime: 'asc' },
  });
}

function normalizeTrade(trade: Record<string, unknown>) {
  return {
    symbol: String(trade.symbol ?? '').toUpperCase(),
    direction: trade.direction as TradeDirection,
    entryPrice: numOrNull(trade.entryPrice),
    exitPrice: numOrNull(trade.exitPrice),
    stopLoss: numOrNull(trade.stopLoss),
    takeProfit: numOrNull(trade.takeProfit),
    plannedRiskReward: numOrNull(trade.plannedRiskReward),
    realisedRiskReward: numOrNull(trade.realisedRiskReward),
    pnl: numOrNull(trade.pnl),
    closeTime: dateOrNull(trade.closeTime),
  };
}

/**
 * Risk:reward, resolved from the stored columns and recomputed only if a row
 * predates them.
 *
 * Two separate metrics, never blended. `avgRR` used to average whatever the
 * single ambiguous column happened to hold — for a trade with a target that was
 * the *plan*, so a position stopped out for a full loss still contributed its
 * planned 5.5:1 to the headline figure. Losing trades were inflating the
 * average reward.
 */
function resolveRiskReward(
  t: ReturnType<typeof normalizeTrade>,
  kind: 'planned' | 'realised',
): number | null {
  const stored = kind === 'planned' ? t.plannedRiskReward : t.realisedRiskReward;
  if (stored != null && Number.isFinite(stored)) return stored;
  if (t.entryPrice == null) return null;

  const input = {
    direction: t.direction === TradeDirection.BUY ? ('BUY' as const) : ('SELL' as const),
    entryPrice: t.entryPrice,
    stopLoss: t.stopLoss,
    takeProfit: t.takeProfit,
    exitPrice: t.exitPrice,
  };
  const rr = kind === 'planned' ? plannedRiskReward(input) : realisedRiskReward(input);
  return rr === null ? null : rr.toNumber();
}

function calcDrawdown(pnls: number[]): { maxDrawdown: number; maxDrawdownPct: number } {
  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  let maxDdPct = 0;

  for (const pnl of pnls) {
    equity += pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDd) { maxDd = dd; maxDdPct = ddPct; }
  }
  return { maxDrawdown: maxDd, maxDrawdownPct: maxDdPct };
}

function emptyStats(totalTrades = 0, unpricedTrades = 0) {
  return {
    totalTrades, pricedTrades: 0, unpricedTrades,
    winCount: 0, lossCount: 0, scratchCount: 0, winRate: 0,
    totalPnl: 0, grossWin: 0, grossLoss: 0, avgWin: 0, avgLoss: 0,
    profitFactor: 0, expectancy: 0, avgPlannedRR: 0, avgRealisedRR: 0,
    maxDrawdown: 0, maxDrawdownPct: 0,
  };
}

// ── Public API ────────────────────────────────────────────────

export async function getSummary(userId: string, query: AnalyticsQuery = {}) {
  const trades = await getClosedTrades(userId, query);
  const normalized = trades.map(normalizeTrade);
  const realized = normalized.filter(isPriced);
  const unpricedCount = normalized.length - realized.length;
  if (realized.length === 0) return emptyStats(normalized.length, unpricedCount);

  const wins = realized.filter((t) => t.pnl! > 0);
  const losses = realized.filter((t) => t.pnl! < 0);
  // A breakeven is neither. Counted so the three add up to pricedTrades.
  const scratches = realized.filter((t) => t.pnl === 0);

  const totalPnl = realized.reduce((s, t) => s + t.pnl!, 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl!, 0);
  const grossLossRaw = losses.reduce((s, t) => s + t.pnl!, 0);
  const grossLoss = Math.abs(grossLossRaw);

  const decisiveCount = wins.length + losses.length;
  const winRate = decisiveCount > 0 ? wins.length / decisiveCount : 0;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const rawPF = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? grossWin : 0;
  const profitFactor = Number.isFinite(rawPF) ? rawPF : 0;
  const expectancy = decisiveCount > 0 ? (grossWin + grossLossRaw) / decisiveCount : 0;

  // Planned averages only positive ratios: a "plan" to lose is not a plan.
  // Realised includes negatives — that is the whole point of measuring outcomes.
  const plannedValues = normalized
    .map((t) => resolveRiskReward(t, 'planned'))
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  const realisedValues = normalized
    .map((t) => resolveRiskReward(t, 'realised'))
    .filter((v): v is number => v != null && Number.isFinite(v));

  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
  const avgPlannedRR = avg(plannedValues);
  const avgRealisedRR = avg(realisedValues);

  const curveTrades = realized
    .filter((t) => t.closeTime != null)
    .sort((a, b) => a.closeTime!.getTime() - b.closeTime!.getTime());
  const { maxDrawdown, maxDrawdownPct } = calcDrawdown(curveTrades.map((t) => t.pnl!));

  return {
    // totalTrades means every closed trade in scope, which is what the label
    // says and what the trades table shows. It previously meant "trades with a
    // P&L", so the dashboard silently reported a smaller number than the table.
    totalTrades: normalized.length,
    // The subset the money statistics below are actually computed over.
    pricedTrades: realized.length,
    unpricedTrades: unpricedCount,
    winCount: wins.length,
    lossCount: losses.length,
    scratchCount: scratches.length,
    winRate: parseFloat((winRate * 100).toFixed(2)),
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    grossWin: parseFloat(grossWin.toFixed(2)),
    grossLoss: parseFloat(grossLoss.toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(3)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    avgPlannedRR: parseFloat(avgPlannedRR.toFixed(3)),
    avgRealisedRR: parseFloat(avgRealisedRR.toFixed(3)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(2)),
  };
}

export async function getEquityCurve(userId: string, query: AnalyticsQuery = {}) {
  const trades = await getClosedTrades(userId, query);
  const normalized = trades.map(normalizeTrade);
  const curveTrades = normalized
    .filter((t) => t.pnl != null && t.closeTime != null)
    .sort((a, b) => a.closeTime!.getTime() - b.closeTime!.getTime());

  let running = 0;
  return curveTrades.map((t) => {
    running += t.pnl!;
    return {
      date: t.closeTime!.toISOString(),
      equity: parseFloat(running.toFixed(2)),
      pnl: parseFloat(t.pnl!.toFixed(2)),
    };
  });
}

export async function getPnlBySymbol(userId: string, query: AnalyticsQuery = {}) {
  const trades = await getClosedTrades(userId, query);
  const normalized = trades.map(normalizeTrade);
  const realized = normalized.filter((t) => t.pnl != null);
  const map = new Map<string, { pnl: number; count: number }>();

  for (const t of realized) {
    const cur = map.get(t.symbol) ?? { pnl: 0, count: 0 };
    map.set(t.symbol, { pnl: cur.pnl + t.pnl!, count: cur.count + 1 });
  }

  return Array.from(map.entries())
    .map(([symbol, v]) => ({ symbol, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count }))
    .sort((a, b) => b.pnl - a.pnl);
}

export async function getPnlByDay(userId: string, query: AnalyticsQuery = {}) {
  const trades = await getClosedTrades(userId, query);
  const normalized = trades.map(normalizeTrade);
  const realized = normalized
    .filter((t) => t.pnl != null && t.closeTime != null)
    .sort((a, b) => a.closeTime!.getTime() - b.closeTime!.getTime());
  const map = new Map<string, number>();

  for (const t of realized) {
    const day = t.closeTime!.toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + t.pnl!);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }));
}

export async function getPnlBySession(userId: string, query: AnalyticsQuery = {}) {
  const trades = await getClosedTrades(userId, query);
  const normalized = trades.map(normalizeTrade);
  const realized = normalized.filter((t) => t.pnl != null && t.closeTime != null);

  const sessions: Record<string, number[]> = {
    Asian: [],
    London: [],
    NewYork: [],
    Other: [],
  };

  for (const t of realized) {
    const hour = t.closeTime!.getUTCHours();
    if (hour >= 0 && hour < 8) sessions['Asian'].push(t.pnl!);
    else if (hour >= 8 && hour < 13) sessions['London'].push(t.pnl!);
    else if (hour >= 13 && hour < 22) sessions['NewYork'].push(t.pnl!);
    else sessions['Other'].push(t.pnl!);
  }

  return Object.entries(sessions).map(([session, pnls]) => ({
    session,
    pnl: parseFloat(pnls.reduce((s, v) => s + v, 0).toFixed(2)),
    count: pnls.length,
    avgPnl: pnls.length ? parseFloat((pnls.reduce((s, v) => s + v, 0) / pnls.length).toFixed(2)) : 0,
  }));
}
