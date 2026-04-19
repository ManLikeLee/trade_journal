'use client';
import { useInsights } from '@/hooks/useInsights';
import { cn } from '@/lib/utils';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react';

const SEVERITY_CONFIG = {
  danger:  { icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/20',   border: 'border-red-200 dark:border-red-800',   text: 'text-red-700 dark:text-red-300',   dot: 'bg-red-500'   },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  success: { icon: CheckCircle,   bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  info:    { icon: Info,          bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500'  },
};

export default function InsightsPage() {
  const { data: insights, isLoading } = useInsights();

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">AI Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pattern analysis based on your trading history</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Insights are generated from rule-based analysis of your closed trades, emotions, hold times, and symbols.
          The more trades you log with notes and emotions, the more accurate these become.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {insights && (
        <div className="space-y-3">
          {insights.map((insight: any) => {
            const cfg = SEVERITY_CONFIG[insight.severity as keyof typeof SEVERITY_CONFIG];
            const Icon = cfg.icon;
            return (
              <div key={insight.id}
                className={cn('rounded-xl border p-4 flex gap-4', cfg.bg, cfg.border)}>
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  insight.severity === 'danger'  ? 'bg-red-100 dark:bg-red-900/40' :
                  insight.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/40' :
                  insight.severity === 'success' ? 'bg-green-100 dark:bg-green-900/40' :
                  'bg-blue-100 dark:bg-blue-900/40')}>
                  <Icon className={cn('w-4 h-4', cfg.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className={cn('text-sm font-semibold', cfg.text)}>{insight.title}</p>
                    {insight.metric && (
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded shrink-0',
                        insight.severity === 'danger'  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                        insight.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                        insight.severity === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300')}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !insights?.length && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No insights yet</p>
          <p className="text-xs text-muted-foreground mt-1">Log at least 5 closed trades to generate insights.</p>
        </div>
      )}
    </div>
  );
}
