import { TradeDirection, TradeStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';

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

  const from = dateOrNull(query.from);
  const to = dateOrNull(query.to);

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
    riskReward: numOrNull(trade.riskReward),
    pnl: numOrNull(trade.pnl),
    closeTime: dateOrNull(trade.closeTime),
  };
}

function resolveRiskReward(t: ReturnType<typeof normalizeTrade>): number | null {
  if (t.riskReward != null && Number.isFinite(t.riskReward) && t.riskReward > 0) {
    return t.riskReward;
  }
  if (t.entryPrice == null || t.stopLoss == null) return null;
  const rewardTarget = t.exitPrice ?? t.takeProfit;
  if (rewardTarget == null) return null;

  const risk =
    t.direction === TradeDirection.BUY
      ? t.entryPrice - t.stopLoss
      : t.stopLoss - t.entryPrice;
  const reward =
    t.direction === TradeDirection.BUY
      ? rewardTarget - t.entryPrice
      : t.entryPrice - rewardTarget;

  if (risk <= 0) return null;
  const rr = reward / risk;
  return Number.isFinite(rr) ? rr : null;
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

function emptyStats() {
  return {
    totalTrades: 0, winCount: 0, lossCount: 0, winRate: 0,
    totalPnl: 0, grossWin: 0, grossLoss: 0, avgWin: 0, avgLoss: 0,
    profitFactor: 0, expectancy: 0, avgRR: 0, maxDrawdown: 0, maxDrawdownPct: 0,
  };
}

// ── Public API ────────────────────────────────────────────────

export async function getSummary(userId: string, query: AnalyticsQuery = {}) {
  const trades = await getClosedTrades(userId, query);
  const normalized = trades.map(normalizeTrade);
  const realized = normalized.filter((t) => t.pnl != null);
  if (realized.length === 0) return emptyStats();

  const wins = realized.filter((t) => t.pnl! > 0);
  const losses = realized.filter((t) => t.pnl! < 0);

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

  const rrValues = normalized
    .map((t) => resolveRiskReward(t))
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

  const curveTrades = realized
    .filter((t) => t.closeTime != null)
    .sort((a, b) => a.closeTime!.getTime() - b.closeTime!.getTime());
  const { maxDrawdown, maxDrawdownPct } = calcDrawdown(curveTrades.map((t) => t.pnl!));

  return {
    totalTrades: realized.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate: parseFloat((winRate * 100).toFixed(2)),
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    grossWin: parseFloat(grossWin.toFixed(2)),
    grossLoss: parseFloat(grossLoss.toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(3)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    avgRR: parseFloat(avgRR.toFixed(3)),
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
