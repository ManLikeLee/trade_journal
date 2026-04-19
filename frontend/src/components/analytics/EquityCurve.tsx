'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface Point { date: string; equity: number; pnl: number; }

interface EquityCurveProps {
  data: Point[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const { equity, pnl } = payload[0].payload as Point;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-muted-foreground mb-1">{format(new Date(label), 'MMM d, yyyy HH:mm')}</p>
      <p className="font-semibold">{formatCurrency(equity)}</p>
      <p className={pnl >= 0 ? 'text-profit text-xs' : 'text-loss text-xs'}>
        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
      </p>
    </div>
  );
}

export function EquityCurve({ data, loading }: EquityCurveProps) {
  if (loading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No closed trades yet
      </div>
    );
  }

  const startEquity = data[0]?.equity ?? 0;
  const isUp = (data[data.length - 1]?.equity ?? 0) >= startEquity;
  const strokeColor = isUp ? '#10b981' : '#ef4444';
  const gradientId = `eq-gradient-${isUp ? 'up' : 'dn'}`;

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.18} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(new Date(v), 'MMM d')}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false} tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={startEquity} stroke="hsl(var(--border))" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
