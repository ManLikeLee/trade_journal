'use client';
import { useMemo, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { StatCard } from '@/components/analytics/StatCard';
import { EquityCurve } from '@/components/analytics/EquityCurve';
import { useAnalyticsSummary, useEquityCurve, usePnlBySymbol, useTrades } from '@/hooks/useTrades';
import { formatCurrency, formatPnl, cn } from '@/lib/utils';
import { Trade } from '@/hooks/useTrades';
import { useInsights } from '@/hooks/useInsights';
import Link from 'next/link';

// Period selector
const PERIODS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0  },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState(30);
  const baseNowRef = useRef(new Date());
  const params = useMemo(() => {
    if (!period) return {};
    const from = new Date(baseNowRef.current);
    from.setDate(from.getDate() - period);
    return { from: from.toISOString() };
  }, [period]);

  const { data: summary, isLoading: sumLoading } = useAnalyticsSummary(params);
  const { data: equityData, isLoading: eqLoading } = useEquityCurve(params);
  const { data: bySymbol, isLoading: symbolLoading } = usePnlBySymbol(params);
  const { data: recentTrades, isLoading: tradesLoading } = useTrades({ limit: 5, order: 'desc' });
  const { data: insights, isLoading: insightsLoading } = useInsights();
  const symbolMax = bySymbol?.length ? Math.max(...bySymbol.map((s: any) => Math.abs(s.pnl))) : 0;

  const num = (value: unknown, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const totalPnl = num(summary?.totalPnl, 0);
  const totalTrades = num(summary?.totalTrades, 0);
  const winRate = num(summary?.winRate, 0);
  const winCount = num(summary?.winCount, 0);
  const lossCount = num(summary?.lossCount, 0);
  const avgRR = num(summary?.avgRR, 0);
  const expectancy = num(summary?.expectancy, 0);
  const maxDrawdownPct = num(summary?.maxDrawdownPct, 0);
  const maxDrawdown = num(summary?.maxDrawdown, 0);

  return (
    <div className="p-4 sm:p-5 space-y-3.5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-medium">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your trading performance at a glance</p>
        </div>
        {/* Period tabs */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/85 dark:bg-muted/70 p-0.5 border border-border/60">
          {PERIODS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => setPeriod(days)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                period === days
                  ? 'bg-card text-foreground shadow-sm border border-border/70'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/65',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
        <StatCard
          label="Total P&L"
          value={formatPnl(totalPnl)}
          subValue={`${totalTrades} trades`}
          colorClass={totalPnl >= 0 ? 'text-profit' : 'text-loss'}
          loading={sumLoading}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate.toFixed(2)}%`}
          subValue={`${winCount}W / ${lossCount}L`}
          loading={sumLoading}
        />
        <StatCard
          label="Avg R:R"
          value={avgRR.toFixed(2)}
          subValue={`Expectancy $${expectancy.toFixed(2)}`}
          loading={sumLoading}
        />
        <StatCard
          label="Max Drawdown"
          value={`${maxDrawdownPct.toFixed(1)}%`}
          subValue={formatCurrency(maxDrawdown)}
          colorClass="text-loss"
          loading={sumLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-2.5">
        {/* Equity curve */}
        <div className="dashboard-card p-3.5">
          <h2 className="dashboard-card-title mb-3">Equity curve</h2>
          <EquityCurve data={equityData ?? []} loading={eqLoading} />
        </div>

        {/* Symbol breakdown */}
        <div className="dashboard-card p-3.5">
          <h2 className="dashboard-card-title mb-3">P&L by symbol</h2>
          {symbolLoading && (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="dashboard-skeleton h-4" />
              ))}
            </div>
          )}
          {!symbolLoading && bySymbol?.length ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-end gap-3 pb-1">
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-profit" />
                  Profit
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-loss" />
                  Loss
                </span>
              </div>
              {bySymbol.slice(0, 8).map((item: any) => (
                <div key={item.symbol} className="flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-muted/35 transition-colors">
                  <span className="text-[11px] font-mono font-medium text-foreground/95 w-14 shrink-0">{item.symbol}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted/75 dark:bg-muted/60 overflow-hidden ring-1 ring-inset ring-border/70">
                    <div
                      className={cn('h-full rounded-full', item.pnl >= 0 ? 'bg-profit' : 'bg-loss')}
                      style={{
                        width: symbolMax > 0 ? `${Math.min(100, Math.abs(item.pnl) / symbolMax * 100)}%` : '0%',
                      }}
                    />
                  </div>
                  <span className={cn('text-[11px] font-medium w-[72px] text-right tabular-nums', item.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                    {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            !symbolLoading && <p className="dashboard-empty min-h-[120px]">No symbol data yet</p>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <div className="dashboard-card p-3.5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="dashboard-card-title">Recent trades</h2>
            <Link href="/trades" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">View all</Link>
          </div>
          {tradesLoading && (
            <div className="space-y-1.5 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="dashboard-skeleton h-10" />
              ))}
            </div>
          )}
          {!tradesLoading && (
            <div>
              {recentTrades?.data?.map((trade: Trade) => (
                <Link
                  key={trade.id}
                  href={`/trades/${trade.id}`}
                  className="group flex items-center gap-2.5 py-2 px-1.5 rounded-md border-b border-border/75 hover:bg-muted/35 transition-colors"
                >
                  <div className="w-1 h-7 rounded-full shrink-0" style={{
                    backgroundColor: trade.direction === 'BUY' ? '#10b981' : '#ef4444',
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium font-mono">{trade.symbol}</span>
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded',
                        trade.direction === 'BUY' ? 'ui-badge-buy' : 'ui-badge-sell')}>
                        {trade.direction}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground group-hover:text-foreground/75 transition-colors">
                      {new Date(trade.openTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {trade.pnl !== null ? (
                      <span className={cn('text-xs font-medium tabular-nums',
                        Number(trade.pnl) >= 0 ? 'text-profit' : 'text-loss')}>
                        {Number(trade.pnl) >= 0 ? '+' : ''}{formatCurrency(Number(trade.pnl))}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground bg-muted/90 border border-border/80 px-1.5 py-0.5 rounded">Open</span>
                    )}
                  </div>
                </Link>
              ))}
              {!recentTrades?.data?.length && (
                <p className="dashboard-empty min-h-[180px]">
                  No trades yet. <Link href="/trades/new" className="ml-1 text-primary hover:underline">Log your first trade</Link>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-card p-3.5">
          <h2 className="dashboard-card-title mb-1 inline-flex items-center gap-1.5">
            <Clock3 className="w-3.5 h-3.5 text-primary" />
            AI insights
          </h2>
          {insightsLoading && (
            <div className="space-y-1.5 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="dashboard-skeleton h-12" />
              ))}
            </div>
          )}
          {!insightsLoading && insights?.length ? (
            <div>
              {insights.slice(0, 5).map((insight: any) => (
                <div key={insight.id} className="flex gap-2.5 py-2 border-b border-border/70 last:border-b-0">
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-1 shrink-0 ring-2 ring-card',
                    insight.severity === 'danger' ? 'bg-loss' :
                    insight.severity === 'warning' ? 'bg-amber-400' :
                    insight.severity === 'success' ? 'bg-profit' : 'bg-primary',
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-tight">{insight.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{insight.description}</p>
                    {insight.metric && (
                      <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/90 border border-border/75 text-muted-foreground">
                        {insight.metric}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !insightsLoading && <p className="dashboard-empty min-h-[180px]">No insights yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
