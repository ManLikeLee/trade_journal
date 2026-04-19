import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TradeDirection, TradeStatus } from '@prisma/client';

export interface AnalyticsQuery {
  accountId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, query: AnalyticsQuery = {}) {
    const trades = await this.getClosedTrades(userId, query);
    if (trades.length === 0) return this.emptyStats();

    const wins = trades.filter((t) => Number(t.pnl) > 0);
    const losses = trades.filter((t) => Number(t.pnl) <= 0);

    const totalPnl = trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
    const grossWin = wins.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.pnl ?? 0), 0));
    const winRate = wins.length / trades.length;
    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
    const rrValues = trades.filter((t) => t.riskReward != null).map((t) => Number(t.riskReward));
    const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

    const { maxDrawdown, maxDrawdownPct } = this.calcDrawdown(trades);

    return {
      totalTrades: trades.length,
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

  async getEquityCurve(userId: string, query: AnalyticsQuery = {}) {
    const trades = await this.getClosedTrades(userId, query);
    const account = await this.getAccountBalance(userId, query.accountId);
    let running = account?.initialBalance ? Number(account.initialBalance) : 10000;
    const curve: Array<{ date: string; equity: number; pnl: number }> = [];

    for (const trade of trades) {
      running += Number(trade.pnl ?? 0);
      curve.push({
        date: trade.closeTime!.toISOString(),
        equity: parseFloat(running.toFixed(2)),
        pnl: parseFloat(Number(trade.pnl ?? 0).toFixed(2)),
      });
    }
    return curve;
  }

  async getPnlByDay(userId: string, query: AnalyticsQuery = {}) {
    const trades = await this.getClosedTrades(userId, query);
    const map = new Map<string, number>();

    for (const trade of trades) {
      const day = trade.closeTime!.toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + Number(trade.pnl ?? 0));
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }));
  }

  async getPnlBySymbol(userId: string, query: AnalyticsQuery = {}) {
    const trades = await this.getClosedTrades(userId, query);
    const map = new Map<string, { pnl: number; count: number }>();

    for (const trade of trades) {
      const cur = map.get(trade.symbol) ?? { pnl: 0, count: 0 };
      map.set(trade.symbol, { pnl: cur.pnl + Number(trade.pnl ?? 0), count: cur.count + 1 });
    }

    return Array.from(map.entries())
      .map(([symbol, v]) => ({ symbol, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count }))
      .sort((a, b) => b.pnl - a.pnl);
  }

  async getWinLossDistribution(userId: string, query: AnalyticsQuery = {}) {
    const trades = await this.getClosedTrades(userId, query);
    const buckets: Record<string, number> = {
      '>50': 0, '10-50': 0, '0-10': 0,
      '-10-0': 0, '-50--10': 0, '<-50': 0,
    };
    for (const trade of trades) {
      const p = Number(trade.pnl ?? 0);
      if (p > 50) buckets['>50']++;
      else if (p > 10) buckets['10-50']++;
      else if (p >= 0) buckets['0-10']++;
      else if (p >= -10) buckets['-10-0']++;
      else if (p >= -50) buckets['-50--10']++;
      else buckets['<-50']++;
    }
    return buckets;
  }

  // ── Helpers ───────────────────────────────────────────────
  private async getClosedTrades(userId: string, query: AnalyticsQuery) {
    const userAccounts = await this.prisma.account.findMany({
      where: { userId, ...(query.accountId && { id: query.accountId }) },
      select: { id: true },
    });
    const accountIds = userAccounts.map((a) => a.id);

    return this.prisma.trade.findMany({
      where: {
        accountId: { in: accountIds },
        status: TradeStatus.CLOSED,
        ...(query.from || query.to ? {
          closeTime: {
            ...(query.from && { gte: new Date(query.from) }),
            ...(query.to && { lte: new Date(query.to) }),
          },
        } : {}),
      },
      orderBy: { closeTime: 'asc' },
    });
  }

  private async getAccountBalance(userId: string, accountId?: string) {
    return this.prisma.account.findFirst({
      where: { userId, ...(accountId && { id: accountId }) },
    });
  }

  private calcDrawdown(trades: Array<{ pnl: any }>) {
    let peak = 0, trough = 0, equity = 0;
    let maxDrawdown = 0, maxDrawdownPct = 0;

    for (const trade of trades) {
      equity += Number(trade.pnl ?? 0);
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
      if (dd > maxDrawdown) { maxDrawdown = dd; maxDrawdownPct = ddPct; }
    }
    return { maxDrawdown, maxDrawdownPct };
  }

  private emptyStats() {
    return {
      totalTrades: 0, winCount: 0, lossCount: 0,
      winRate: 0, totalPnl: 0, grossWin: 0, grossLoss: 0,
      avgWin: 0, avgLoss: 0, profitFactor: 0, expectancy: 0,
      avgRR: 0, maxDrawdown: 0, maxDrawdownPct: 0,
    };
  }
}
