'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';

interface DayPnl { date: string; pnl: number; }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { date, pnl } = payload[0].payload as DayPnl;
  return (
    <div
      className="rounded-lg shadow-lg px-3 py-2 text-sm border backdrop-blur-sm"
      style={{
        backgroundColor: 'hsl(var(--chart-tooltip-bg) / 0.96)',
        borderColor: 'hsl(var(--chart-tooltip-border))',
        color: 'hsl(var(--chart-tooltip-fg))',
      }}
    >
      <p className="mb-1" style={{ color: 'hsl(var(--chart-tooltip-muted))' }}>
        {format(new Date(date), 'MMM d, yyyy')}
      </p>
      <p className={cn('font-semibold', pnl >= 0 ? 'text-profit' : 'text-loss')}>
        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
      </p>
    </div>
  );
}

export function PnlBarChart({ data, loading }: { data: DayPnl[]; loading?: boolean }) {
  if (loading) return <div className="h-48 rounded-xl dashboard-skeleton" />;
  if (!data?.length) return (
    <div className="dashboard-empty h-48 min-h-0 text-sm">No data</div>
  );

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" strokeOpacity={0.55} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(new Date(v), 'MMM d')}
          tick={{ fontSize: 11, fill: 'hsl(var(--chart-axis))' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tick={{ fontSize: 11, fill: 'hsl(var(--chart-axis))' }}
          axisLine={false} tickLine={false} width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.45 }} />
        <ReferenceLine y={0} stroke="hsl(var(--chart-crosshair))" />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
