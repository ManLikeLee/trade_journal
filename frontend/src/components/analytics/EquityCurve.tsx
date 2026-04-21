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
    <div
      className="rounded-md px-2.5 py-2 text-xs shadow-lg border backdrop-blur-sm"
      style={{
        backgroundColor: 'hsl(var(--chart-tooltip-bg) / 0.96)',
        borderColor: 'hsl(var(--chart-tooltip-border))',
        color: 'hsl(var(--chart-tooltip-fg))',
      }}
    >
      <p className="mb-0.5" style={{ color: 'hsl(var(--chart-tooltip-muted))' }}>
        {format(new Date(label), 'MMM d, yyyy HH:mm')}
      </p>
      <p className="font-medium">{formatCurrency(equity)}</p>
      <p className={pnl >= 0 ? 'text-profit text-[11px]' : 'text-loss text-[11px]'}>
        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
      </p>
    </div>
  );
}

export function EquityCurve({ data, loading }: EquityCurveProps) {
  if (loading) {
    return <div className="dashboard-skeleton h-[180px] rounded-md" />;
  }
  if (!data?.length) {
    return (
      <div className="dashboard-empty h-[180px] min-h-0">
        No closed trades yet
      </div>
    );
  }

  const startEquity = data[0]?.equity ?? 0;
  const isUp = (data[data.length - 1]?.equity ?? 0) >= startEquity;
  const strokeColor = isUp ? '#10b981' : '#ef4444';
  const gradientId = `eq-gradient-${isUp ? 'up' : 'dn'}`;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.22} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" strokeOpacity={0.55} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(new Date(v), 'MMM d')}
          tick={{ fontSize: 10, fill: 'hsl(var(--chart-axis))' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
          tick={{ fontSize: 10, fill: 'hsl(var(--chart-axis))' }}
          axisLine={false} tickLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={startEquity} stroke="hsl(var(--chart-crosshair))" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={strokeColor}
          strokeWidth={1.8}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3.5, fill: strokeColor, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
