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
  const iconTone = colorClass?.includes('profit')
    ? 'text-profit bg-profit/15 border border-profit/25 dark:bg-profit/20 dark:border-profit/30'
    : colorClass?.includes('loss')
      ? 'text-loss bg-loss/15 border border-loss/25 dark:bg-loss/20 dark:border-loss/30'
      : 'text-primary bg-primary/10 border border-primary/15 dark:bg-primary/15 dark:border-primary/25';

  return (
    <div className="dashboard-card p-3 sm:p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.04em]">{label}</span>
        {Icon && (
          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', iconTone)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <div className="dashboard-skeleton h-6 w-24" />
          <div className="dashboard-skeleton h-3 w-16 rounded-md" />
        </div>
      ) : (
        <div>
          <span className={cn('text-[26px] leading-none font-medium tabular-nums', colorClass?.includes('profit') ? 'text-profit' : colorClass?.includes('loss') ? 'text-loss' : '')}>
            {value}
          </span>
          {subValue && (
            <p className="text-[11px] text-muted-foreground mt-1">{subValue}</p>
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
