'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
};

let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toastState: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(fn => fn([...toastState]));
}

export function toast(t: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  toastState = [...toastState, { ...t, id }];
  notifyListeners();
  setTimeout(() => {
    toastState = toastState.filter(x => x.id !== id);
    notifyListeners();
  }, 4000);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => { toastListeners = toastListeners.filter(fn => fn !== setToasts); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          'flex items-start gap-3 rounded-xl border bg-card shadow-lg px-4 py-3 animate-slide-up',
          t.variant === 'destructive' && 'border-destructive/30 bg-destructive/5',
          t.variant === 'success' && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
        )}>
          {t.variant === 'success' && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />}
          {t.variant === 'destructive' && <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
          {(!t.variant || t.variant === 'default') && <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => { toastState = toastState.filter(x => x.id !== t.id); notifyListeners(); }}
            className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
