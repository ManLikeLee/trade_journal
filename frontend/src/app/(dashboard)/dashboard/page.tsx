'use client';
import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Target, Activity,
  BarChart2, Percent, DollarSign, AlertTriangle,
} from 'lucide-react';
import { StatCard } from '@/components/analytics/StatCard';
import { EquityCurve } from '@/components/analytics/EquityCurve';
import { PnlBarChart } from '@/components/analytics/PnlBarChart';
import { useAnalyticsSummary, useEquityCurve, usePnlByDay, usePnlBySymbol, useTrades } from '@/hooks/useTrades';
import { formatCurrency, formatPnl, cn } from '@/lib/utils';
import { Trade } from '@/hooks/useTrades';
import Link from 'next/link';

// Period selector
const PERIODS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0  },
];

function periodParams(days: number) {
  if (!days) return {};
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString() };
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(30);
  const params = periodParams(period);

  const { data: summary, isLoading: sumLoading } = useAnalyticsSummary(params);
  const { data: equityData, isLoading: eqLoading } = useEquityCurve(params);
  const { data: pnlDays, isLoading: pnlLoading } = usePnlByDay(params);
  const { data: bySymbol } = usePnlBySymbol(params);
  const { data: recentTrades } = useTrades({ limit: 5, order: 'desc' });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your trading performance at a glance</p>
        </div>
        {/* Period tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {PERIODS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => setPeriod(days)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                period === days
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L"
          value={summary ? formatPnl(summary.totalPnl) : '—'}
          subValue={`${summary?.totalTrades ?? 0} trades`}
          icon={DollarSign}
          colorClass={summary?.totalPnl >= 0 ? 'text-profit' : 'text-loss'}
          loading={sumLoading}
        />
        <StatCard
          label="Win Rate"
          value={summary ? `${summary.winRate}%` : '—'}
          subValue={`${summary?.winCount ?? 0}W / ${summary?.lossCount ?? 0}L`}
          icon={Percent}
          loading={sumLoading}
        />
        <StatCard
          label="Avg R:R"
          value={summary ? `${summary.avgRR.toFixed(2)}` : '—'}
          subValue={`Expectancy $${summary?.expectancy?.toFixed(2) ?? '—'}`}
          icon={Target}
          loading={sumLoading}
        />
        <StatCard
          label="Max Drawdown"
          value={summary ? `${summary.maxDrawdownPct.toFixed(1)}%` : '—'}
          subValue={summary ? formatCurrency(summary.maxDrawdown) : '—'}
          icon={AlertTriangle}
          loading={sumLoading}
        />
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Profit Factor" value={summary?.profitFactor?.toFixed(2) ?? '—'} icon={BarChart2} loading={sumLoading} />
        <StatCard label="Avg Win"  value={summary ? formatCurrency(summary.avgWin)  : '—'} icon={TrendingUp} loading={sumLoading} />
        <StatCard label="Avg Loss" value={summary ? formatCurrency(summary.avgLoss) : '—'} icon={TrendingDown} loading={sumLoading} />
        <StatCard label="Gross Win" value={summary ? formatCurrency(summary.grossWin) : '—'} icon={Activity} loading={sumLoading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equity curve */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Equity Curve</h2>
          <EquityCurve data={equityData ?? []} loading={eqLoading} />
        </div>

        {/* Symbol breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">P&L by Symbol</h2>
          {bySymbol?.length ? (
            <div className="space-y-2">
              {bySymbol.slice(0, 8).map((item: any) => (
                <div key={item.symbol} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold w-16 shrink-0">{item.symbol}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', item.pnl >= 0 ? 'bg-profit' : 'bg-loss')}
                      style={{
                        width: `${Math.min(100, Math.abs(item.pnl) / Math.max(...bySymbol.map((s: any) => Math.abs(s.pnl))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className={cn('text-xs font-medium w-20 text-right tabular-nums', item.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                    {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>
      </div>

      {/* Daily PnL */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Daily P&L</h2>
        <PnlBarChart data={pnlDays ?? []} loading={pnlLoading} />
      </div>

      {/* Recent trades */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Recent Trades</h2>
          <Link href="/trades" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-border">
          {recentTrades?.data?.map((trade: Trade) => (
            <Link
              key={trade.id}
              href={`/trades/${trade.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-accent/50 transition-colors"
            >
              <div className="w-1.5 h-8 rounded-full shrink-0" style={{
                backgroundColor: trade.direction === 'BUY' ? '#10b981' : '#ef4444',
              }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold font-mono">{trade.symbol}</span>
                  <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded',
                    trade.direction === 'BUY' ? 'bg-profit' : 'bg-loss')}>
                    {trade.direction}
                  </span>
                  <span className="text-xs text-muted-foreground">{trade.lotSize} lots</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(trade.openTime).toLocaleString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                {trade.pnl !== null ? (
                  <span className={cn('text-sm font-semibold tabular-nums',
                    Number(trade.pnl) >= 0 ? 'text-profit' : 'text-loss')}>
                    {Number(trade.pnl) >= 0 ? '+' : ''}{formatCurrency(Number(trade.pnl))}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Open</span>
                )}
              </div>
            </Link>
          ))}
          {!recentTrades?.data?.length && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No trades yet.{' '}
              <Link href="/trades/new" className="text-primary hover:underline">Log your first trade →</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
