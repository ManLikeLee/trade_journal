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
    <div className="app-page">
      <div className="app-page-header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="app-title">AI Insights</h1>
            <p className="app-subtitle">Pattern analysis based on your trading history</p>
          </div>
        </div>
      </div>

      <div className="section-card flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Insights are generated from rule-based analysis of your closed trades, emotions, hold times, and symbols.
          The more trades you log with notes and emotions, the more accurate these become.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[10px] bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {insights && (
        <div className="space-y-2">
          {insights.map((insight: any) => {
            const cfg = SEVERITY_CONFIG[insight.severity as keyof typeof SEVERITY_CONFIG];
            const Icon = cfg.icon;
            return (
              <div key={insight.id}
                className={cn('rounded-[10px] border p-3.5 flex gap-3', cfg.bg, cfg.border)}>
                <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                  insight.severity === 'danger'  ? 'bg-red-100 dark:bg-red-900/40' :
                  insight.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/40' :
                  insight.severity === 'success' ? 'bg-green-100 dark:bg-green-900/40' :
                  'bg-blue-100 dark:bg-blue-900/40')}>
                  <Icon className={cn('w-3.5 h-3.5', cfg.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className={cn('text-xs font-medium', cfg.text)}>{insight.title}</p>
                    {insight.metric && (
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0',
                        insight.severity === 'danger'  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                        insight.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                        insight.severity === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300')}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !insights?.length && (
        <div className="section-card min-h-[160px] text-center flex flex-col items-center justify-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-xs font-medium">No insights yet</p>
          <p className="text-[11px] text-muted-foreground mt-1">Log at least 5 closed trades to generate insights.</p>
        </div>
      )}
    </div>
  );
}
