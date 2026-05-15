import { TradeStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export interface Insight {
  id: string;
  type: 'pattern' | 'warning' | 'positive' | 'suggestion';
  title: string;
  description: string;
  metric?: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function getClosedTrades(userId: string, accountId?: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, ...(accountId && { id: accountId }) },
    select: { id: true },
  });
  const ids = accounts.map((a) => a.id);
  return prisma.trade.findMany({
    where: { accountId: { in: ids }, status: TradeStatus.CLOSED },
    orderBy: { closeTime: 'asc' },
    include: { notes: true },
  });
}

function analyzeEmotions(trades: { pnl: unknown; notes: { emotion: unknown }[] }[]): Insight[] {
  const insights: Insight[] = [];
  const tradesWithNotes = trades.filter((t) => t.notes?.length > 0);
  if (!tradesWithNotes.length) return insights;

  const stats: Record<string, { pnl: number[]; count: number }> = {};
  for (const trade of tradesWithNotes) {
    for (const note of trade.notes) {
      if (!note.emotion) continue;
      const e = String(note.emotion);
      if (!stats[e]) stats[e] = { pnl: [], count: 0 };
      stats[e].pnl.push(Number(trade.pnl));
      stats[e].count++;
    }
  }

  for (const [emotion, s] of Object.entries(stats)) {
    if (s.count < 3) continue;
    const avg = s.pnl.reduce((a, b) => a + b, 0) / s.count;
    const wr = (s.pnl.filter((p) => p > 0).length / s.count) * 100;

    if (emotion === 'FOMO' && avg < 0) {
      insights.push({
        id: 'fomo-negative',
        type: 'warning',
        title: 'FOMO trades are costing you',
        description: `Your ${s.count} FOMO-tagged trades average ${avg >= 0 ? '+' : ''}$${avg.toFixed(2)} with only ${wr.toFixed(0)}% win rate.`,
        metric: `Avg: $${avg.toFixed(2)}`,
        severity: 'warning',
      });
    }
    if (emotion === 'REVENGE' && s.count >= 2) {
      insights.push({
        id: 'revenge-trading',
        type: 'warning',
        title: 'Revenge trading detected',
        description: `You've tagged ${s.count} trades as REVENGE averaging $${avg.toFixed(2)}. Revenge trades are rarely profitable.`,
        metric: `${s.count} trades`,
        severity: 'danger',
      });
    }
    if (emotion === 'DISCIPLINED' && avg > 0) {
      insights.push({
        id: 'disciplined-positive',
        type: 'positive',
        title: 'Discipline pays off',
        description: `Your DISCIPLINED trades average +$${avg.toFixed(2)} with ${wr.toFixed(0)}% win rate.`,
        metric: `Avg: +$${avg.toFixed(2)}`,
        severity: 'success',
      });
    }
  }
  return insights;
}

function analyzeDayOfWeek(trades: { closeTime: unknown; pnl: unknown }[]): Insight[] {
  const insights: Insight[] = [];
  const dayStats: Record<number, { pnl: number[]; wins: number }> = {};

  for (const t of trades) {
    const day = new Date(t.closeTime as string).getDay();
    if (!dayStats[day]) dayStats[day] = { pnl: [], wins: 0 };
    const p = Number(t.pnl);
    dayStats[day].pnl.push(p);
    if (p > 0) dayStats[day].wins++;
  }

  const dayPerf = Object.entries(dayStats)
    .filter(([, s]) => s.pnl.length >= 3)
    .map(([day, s]) => ({
      day: Number(day),
      name: DAY_NAMES[Number(day)],
      avg: s.pnl.reduce((a, b) => a + b, 0) / s.pnl.length,
      wr: (s.wins / s.pnl.length) * 100,
      count: s.pnl.length,
    }));

  if (dayPerf.length < 2) return insights;

  const best = dayPerf.reduce((a, b) => (a.avg > b.avg ? a : b));
  const worst = dayPerf.reduce((a, b) => (a.avg < b.avg ? a : b));

  if (worst.avg < -5) {
    insights.push({
      id: 'worst-day',
      type: 'warning',
      title: `${worst.name}s are your worst trading day`,
      description: `On ${worst.name}s you average $${worst.avg.toFixed(2)} per trade (${worst.count} trades). Consider reducing size or skipping.`,
      metric: `Avg: $${worst.avg.toFixed(2)}`,
      severity: 'warning',
    });
  }
  if (best.avg > 0 && best.avg > Math.abs(worst.avg)) {
    insights.push({
      id: 'best-day',
      type: 'positive',
      title: `${best.name}s are your best trading day`,
      description: `You average +$${best.avg.toFixed(2)} on ${best.name}s with ${best.wr.toFixed(0)}% win rate.`,
      metric: `Avg: +$${best.avg.toFixed(2)}`,
      severity: 'success',
    });
  }
  return insights;
}

function analyzeHoldTime(trades: { openTime: unknown; closeTime: unknown; pnl: unknown }[]): Insight[] {
  const insights: Insight[] = [];
  const tradesWithDuration = trades.filter((t) => t.closeTime);
  const buckets = {
    scalp: { trades: [] as typeof trades, label: '< 5 min' },
    intra: { trades: [] as typeof trades, label: '5 min – 4 h' },
    swing: { trades: [] as typeof trades, label: '4 h – 24 h' },
    position: { trades: [] as typeof trades, label: '> 24 h' },
  };

  for (const t of tradesWithDuration) {
    const mins =
      (new Date(t.closeTime as string).getTime() - new Date(t.openTime as string).getTime()) / 60_000;
    if (mins < 5) buckets.scalp.trades.push(t);
    else if (mins < 240) buckets.intra.trades.push(t);
    else if (mins < 1440) buckets.swing.trades.push(t);
    else buckets.position.trades.push(t);
  }

  const stats = Object.entries(buckets)
    .filter(([, b]) => b.trades.length >= 3)
    .map(([key, b]) => {
      const pnls = b.trades.map((t) => Number(t.pnl));
      const avg = pnls.reduce((s, v) => s + v, 0) / pnls.length;
      const wr = (pnls.filter((p) => p > 0).length / pnls.length) * 100;
      return { key, label: b.label, avg, wr, count: b.trades.length };
    });

  if (stats.length < 2) return insights;

  const best = stats.reduce((a, b) => (a.avg > b.avg ? a : b));
  const worst = stats.reduce((a, b) => (a.avg < b.avg ? a : b));

  if (best.key !== worst.key) {
    insights.push({
      id: 'hold-time-best',
      type: 'pattern',
      title: `Your edge is in ${best.label} trades`,
      description: `${best.label} trades average +$${best.avg.toFixed(2)} (${best.wr.toFixed(0)}% WR, ${best.count} trades).`,
      metric: `+$${best.avg.toFixed(2)} avg`,
      severity: 'success',
    });
  }
  if (worst.avg < -3) {
    insights.push({
      id: 'hold-time-worst',
      type: 'warning',
      title: `Avoid ${worst.label} trades`,
      description: `${worst.label} trades average $${worst.avg.toFixed(2)} — your worst hold-time bucket.`,
      metric: `$${worst.avg.toFixed(2)} avg`,
      severity: 'warning',
    });
  }
  return insights;
}

function analyzeSymbols(trades: { symbol: unknown; pnl: unknown }[]): Insight[] {
  const insights: Insight[] = [];
  const symMap: Record<string, number[]> = {};

  for (const t of trades) {
    const sym = String(t.symbol);
    if (!symMap[sym]) symMap[sym] = [];
    symMap[sym].push(Number(t.pnl));
  }

  const symStats = Object.entries(symMap)
    .filter(([, p]) => p.length >= 5)
    .map(([symbol, pnls]) => {
      const avg = pnls.reduce((s, v) => s + v, 0) / pnls.length;
      const wr = (pnls.filter((p) => p > 0).length / pnls.length) * 100;
      return { symbol, avg, wr, count: pnls.length };
    });

  const losers = symStats.filter((s) => s.avg < -2);
  const winners = symStats.filter((s) => s.avg > 2);

  for (const s of losers) {
    insights.push({
      id: `symbol-avoid-${s.symbol}`,
      type: 'warning',
      title: `Consider avoiding ${s.symbol}`,
      description: `Your ${s.count} ${s.symbol} trades average $${s.avg.toFixed(2)} with ${s.wr.toFixed(0)}% win rate.`,
      metric: `Avg: $${s.avg.toFixed(2)}`,
      severity: 'warning',
    });
  }

  const topWinner = winners.sort((a, b) => b.avg - a.avg)[0];
  if (topWinner) {
    insights.push({
      id: `symbol-best-${topWinner.symbol}`,
      type: 'positive',
      title: `${topWinner.symbol} is your best instrument`,
      description: `You average +$${topWinner.avg.toFixed(2)} per trade on ${topWinner.symbol} with ${topWinner.wr.toFixed(0)}% win rate.`,
      metric: `+$${topWinner.avg.toFixed(2)} avg`,
      severity: 'success',
    });
  }
  return insights;
}

function analyzeStreaks(trades: { pnl: unknown }[]): Insight[] {
  const insights: Insight[] = [];
  let maxLoss = 0, curLoss = 0;
  let maxWin = 0, curWin = 0;

  for (const t of trades) {
    if (Number(t.pnl) > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
    else { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
  }

  if (curLoss >= 3) {
    insights.push({
      id: 'current-losing-streak',
      type: 'warning',
      title: `Current losing streak: ${curLoss} trades`,
      description: `You've lost your last ${curLoss} trades in a row. Consider taking a break.`,
      metric: `${curLoss} consecutive losses`,
      severity: 'danger',
    });
  }
  if (maxLoss >= 5) {
    insights.push({
      id: 'max-losing-streak',
      type: 'suggestion',
      title: `Max losing streak: ${maxLoss} trades`,
      description: `Your worst streak was ${maxLoss} consecutive losses. Consider adding a daily loss limit rule.`,
      metric: `${maxLoss} in a row`,
      severity: 'warning',
    });
  }
  return insights;
}

export async function generateInsights(userId: string, accountId?: string): Promise<Insight[]> {
  const trades = await getClosedTrades(userId, accountId);
  if (trades.length < 5) {
    return [
      {
        id: 'not-enough-data',
        type: 'suggestion',
        title: 'Keep logging trades',
        description: `You need at least 5 closed trades for insights. You have ${trades.length} so far.`,
        severity: 'info',
      },
    ];
  }

  const all = [
    ...analyzeEmotions(trades),
    ...analyzeDayOfWeek(trades),
    ...analyzeHoldTime(trades),
    ...analyzeSymbols(trades),
    ...analyzeStreaks(trades),
  ];

  const order: Record<string, number> = { danger: 0, warning: 1, success: 2, info: 3 };
  return all.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3)).slice(0, 10);
}
