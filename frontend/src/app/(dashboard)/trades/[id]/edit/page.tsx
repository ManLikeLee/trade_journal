'use client';
import { use } from 'react';
import { useTrade, useUpdateTrade } from '@/hooks/useTrades';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency, cn } from '@/lib/utils';
import { useMemo } from 'react';

const schema = z.object({
  exitPrice:  z.coerce.number().positive().optional().or(z.literal('')),
  stopLoss:   z.coerce.number().positive().optional().or(z.literal('')),
  takeProfit: z.coerce.number().positive().optional().or(z.literal('')),
  closeTime:  z.string().optional(),
  commission: z.coerce.number().min(0).default(0),
  swap:       z.coerce.number().default(0),
});

export default function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: trade, isLoading } = useTrade(id);
  const updateTrade = useUpdateTrade();

  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm({
    resolver: zodResolver(schema),
    values: trade ? {
      exitPrice:  trade.exitPrice  ? Number(trade.exitPrice)  : '',
      stopLoss:   trade.stopLoss   ? Number(trade.stopLoss)   : '',
      takeProfit: trade.takeProfit ? Number(trade.takeProfit) : '',
      closeTime:  trade.closeTime  ? new Date(trade.closeTime).toISOString().slice(0, 16) : '',
      commission: Number(trade.commission ?? 0),
      swap:       Number(trade.swap ?? 0),
    } : undefined,
  });

  const [exitPrice, commission, swap] = watch(['exitPrice', 'commission', 'swap']);

  const pnlPreview = useMemo(() => {
    if (!trade || !exitPrice) return null;
    const pipValue = Number(trade.lotSize) * 10;
    const diff = trade.direction === 'BUY'
      ? Number(exitPrice) - Number(trade.entryPrice)
      : Number(trade.entryPrice) - Number(exitPrice);
    return diff * pipValue * 10000 - Number(commission ?? 0) - Number(swap ?? 0);
  }, [exitPrice, trade, commission, swap]);

  const onSubmit = async (data: any) => {
    await updateTrade.mutateAsync({ id, ...data,
      exitPrice:  data.exitPrice  || undefined,
      stopLoss:   data.stopLoss   || undefined,
      takeProfit: data.takeProfit || undefined,
      closeTime:  data.closeTime  || undefined,
    });
    router.push(`/trades/${id}`);
  };

  if (isLoading) return <div className="app-page-narrow max-w-xl"><div className="h-40 bg-muted animate-pulse rounded-[10px]" /></div>;
  if (!trade) return <div className="app-page-narrow text-xs text-muted-foreground">Trade not found.</div>;

  return (
    <div className="app-page-narrow max-w-xl">
      <Link href={`/trades/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to trade
      </Link>

      <div>
        <h1 className="app-title">Edit trade</h1>
        <p className="app-subtitle">
          <span className="font-mono font-medium">{trade.symbol}</span> {trade.direction} · {Number(trade.lotSize).toFixed(2)} lots
        </p>
      </div>

      <div className="section-card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="ui-label">Exit price</label>
              <input {...register('exitPrice')} type="number" step="0.00001"
                className="ui-input-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="ui-label">Close time</label>
              <input {...register('closeTime')} type="datetime-local"
                className="ui-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="ui-label">Stop loss</label>
              <input {...register('stopLoss')} type="number" step="0.00001"
                className="ui-input-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="ui-label">Take profit</label>
              <input {...register('takeProfit')} type="number" step="0.00001"
                className="ui-input-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="ui-label">Commission</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input {...register('commission')} type="number" step="0.01"
                  className="ui-input-mono pl-7" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="ui-label">Swap</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input {...register('swap')} type="number" step="0.01"
                  className="ui-input-mono pl-7" />
              </div>
            </div>
          </div>

          {pnlPreview !== null && (
            <div className="p-2.5 rounded-md bg-muted/45 border border-border text-xs">
              Estimated P&L:{' '}
              <span className={cn('font-semibold tabular-nums', pnlPreview >= 0 ? 'text-profit' : 'text-loss')}>
                {pnlPreview >= 0 ? '+' : ''}{formatCurrency(pnlPreview)}
              </span>
            </div>
          )}

          {updateTrade.isError && (
            <p className="text-xs text-loss bg-loss/10 p-2.5 rounded-md">Failed to update trade.</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isSubmitting || updateTrade.isPending}
              className="ui-btn-primary flex-1">
              {isSubmitting || updateTrade.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => router.back()}
              className="ui-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
