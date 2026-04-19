'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface DayPnl { date: string; pnl: number; }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { date, pnl } = payload[0].payload as DayPnl;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-muted-foreground mb-1">{format(new Date(date), 'MMM d, yyyy')}</p>
      <p className={cn('font-semibold', pnl >= 0 ? 'text-profit' : 'text-loss')}>
        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
      </p>
    </div>
  );
}

import { cn } from '@/lib/utils';

export function PnlBarChart({ data, loading }: { data: DayPnl[]; loading?: boolean }) {
  if (loading) return <div className="h-48 rounded-xl bg-muted animate-pulse" />;
  if (!data?.length) return (
    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
  );

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(new Date(v), 'MMM d')}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false} tickLine={false} width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
