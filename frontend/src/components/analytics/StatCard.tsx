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
    <div className="dashboard-card p-3 sm:p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.04em]">{label}</span>
        {Icon && (
          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', colorClass ?? 'bg-primary/10')}>
            <Icon className={cn('w-3.5 h-3.5', colorClass ? 'text-current' : 'text-primary')} />
          </div>
        )}
      </div>
      {loading ? (
        <div className="dashboard-skeleton h-6 w-24" />
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
