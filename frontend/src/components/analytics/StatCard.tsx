import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  icon?: LucideIcon;
  colorClass?: string;
  loading?: boolean;
}

export function StatCard({ label, value, subValue, trend, icon: Icon, colorClass, loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClass ?? 'bg-primary/10')}>
            <Icon className={cn('w-4 h-4', colorClass ? 'text-current' : 'text-primary')} />
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-24 rounded bg-muted animate-pulse" />
      ) : (
        <div>
          <span className={cn('text-2xl font-semibold tabular-nums', colorClass?.includes('profit') ? 'text-profit' : colorClass?.includes('loss') ? 'text-loss' : '')}>
            {value}
          </span>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
          )}
        </div>
      )}
      {trend !== undefined && !loading && (
        <span className={cn('text-xs font-medium', trend >= 0 ? 'text-profit' : 'text-loss')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs last period
        </span>
      )}
    </div>
  );
}
