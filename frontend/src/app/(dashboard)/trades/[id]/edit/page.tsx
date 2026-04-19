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

  if (isLoading) return <div className="p-6"><div className="h-40 bg-muted animate-pulse rounded-xl" /></div>;
  if (!trade) return <div className="p-6 text-muted-foreground">Trade not found.</div>;

  return (
    <div className="p-6 max-w-lg animate-fade-in">
      <Link href={`/trades/${id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to trade
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">Edit trade</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-mono font-medium">{trade.symbol}</span> {trade.direction} · {Number(trade.lotSize).toFixed(2)} lots
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Exit price</label>
              <input {...register('exitPrice')} type="number" step="0.00001"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Close time</label>
              <input {...register('closeTime')} type="datetime-local"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Stop loss</label>
              <input {...register('stopLoss')} type="number" step="0.00001"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Take profit</label>
              <input {...register('takeProfit')} type="number" step="0.00001"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Commission</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input {...register('commission')} type="number" step="0.01"
                  className="w-full h-10 pl-7 pr-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Swap</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input {...register('swap')} type="number" step="0.01"
                  className="w-full h-10 pl-7 pr-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>

          {pnlPreview !== null && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
              Estimated P&L:{' '}
              <span className={cn('font-semibold tabular-nums', pnlPreview >= 0 ? 'text-profit' : 'text-loss')}>
                {pnlPreview >= 0 ? '+' : ''}{formatCurrency(pnlPreview)}
              </span>
            </div>
          )}

          {updateTrade.isError && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">Failed to update trade.</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isSubmitting || updateTrade.isPending}
              className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isSubmitting || updateTrade.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => router.back()}
              className="h-10 px-4 rounded-lg border border-input text-sm hover:bg-accent transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
