'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useCreateTrade, useAccounts } from '@/hooks/useTrades';
import { formatCurrency, cn } from '@/lib/utils';
import { useEffect, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Calculator } from 'lucide-react';

const schema = z.object({
  accountId:  z.string().min(1, 'Select an account'),
  symbol:     z.string().min(1, 'Symbol is required').max(10).toUpperCase(),
  direction:  z.enum(['BUY', 'SELL']),
  lotSize:    z.coerce.number().positive('Must be positive'),
  entryPrice: z.coerce.number().positive(),
  exitPrice:  z.coerce.number().positive().optional().or(z.literal('')),
  stopLoss:   z.coerce.number().positive().optional().or(z.literal('')),
  takeProfit: z.coerce.number().positive().optional().or(z.literal('')),
  openTime:   z.string().min(1, 'Required'),
  closeTime:  z.string().optional(),
  commission: z.coerce.number().min(0).default(0),
  swap:       z.coerce.number().default(0),
});

type FormData = z.infer<typeof schema>;

interface TradeFormProps {
  defaultValues?: Partial<FormData>;
  mode?: 'create' | 'edit';
}

export function TradeForm({ defaultValues, mode = 'create' }: TradeFormProps) {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const createTrade = useCreateTrade();

  const {
    register, handleSubmit, watch, control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      direction: 'BUY',
      commission: 0,
      swap: 0,
      openTime: new Date().toISOString().slice(0, 16),
      ...defaultValues,
    },
  });

  const [entryPrice, exitPrice, stopLoss, takeProfit, direction, lotSize, commission, swap] =
    watch(['entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'direction', 'lotSize', 'commission', 'swap']);

  // Auto-calculate P&L preview
  const pnlPreview = useMemo(() => {
    if (!entryPrice || !exitPrice || !lotSize) return null;
    const pipValue = Number(lotSize) * 10;
    const diff = direction === 'BUY'
      ? Number(exitPrice) - Number(entryPrice)
      : Number(entryPrice) - Number(exitPrice);
    const gross = diff * pipValue * 10000;
    return gross - Number(commission ?? 0) - Number(swap ?? 0);
  }, [entryPrice, exitPrice, direction, lotSize, commission, swap]);

  // Auto-calculate R:R preview
  const rrPreview = useMemo(() => {
    if (!entryPrice || !stopLoss || !takeProfit) return null;
    const risk   = Math.abs(Number(entryPrice) - Number(stopLoss));
    const reward = Math.abs(Number(takeProfit) - Number(entryPrice));
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  }, [entryPrice, stopLoss, takeProfit]);

  const onSubmit = async (data: FormData) => {
    try {
      await createTrade.mutateAsync({
        ...data,
        exitPrice: data.exitPrice || undefined,
        stopLoss: data.stopLoss || undefined,
        takeProfit: data.takeProfit || undefined,
        closeTime: data.closeTime || undefined,
      });
      router.push('/trades');
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Account */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Account</label>
        <select {...register('accountId')}
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Select account…</option>
          {accounts?.map((a: any) => (
            <option key={a.id} value={a.id}>{a.name} — {a.broker}</option>
          ))}
        </select>
        {errors.accountId && <p className="text-xs text-destructive">{errors.accountId.message}</p>}
      </div>

      {/* Symbol + Direction */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Symbol</label>
          <input {...register('symbol')}
            placeholder="EURUSD"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Direction</label>
          <Controller
            name="direction"
            control={control}
            render={({ field }) => (
              <div className="flex rounded-lg border border-input overflow-hidden h-10">
                {(['BUY', 'SELL'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => field.onChange(dir)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors',
                      field.value === dir
                        ? dir === 'BUY' ? 'bg-profit text-white' : 'bg-loss text-white'
                        : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {dir === 'BUY'
                      ? <ArrowUpRight className="w-3.5 h-3.5" />
                      : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {dir}
                  </button>
                ))}
              </div>
            )}
          />
        </div>
      </div>

      {/* Lot size + Entry */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Lot Size</label>
          <input {...register('lotSize')} type="number" step="0.01" placeholder="0.10"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.lotSize && <p className="text-xs text-destructive">{errors.lotSize.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Entry Price</label>
          <input {...register('entryPrice')} type="number" step="0.00001" placeholder="1.08540"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Exit + SL + TP */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'exitPrice',  label: 'Exit Price',   placeholder: '1.08820' },
          { name: 'stopLoss',   label: 'Stop Loss',    placeholder: '1.08200' },
          { name: 'takeProfit', label: 'Take Profit',  placeholder: '1.09100' },
        ].map(({ name, label, placeholder }) => (
          <div key={name} className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{label}</label>
            <input {...register(name as any)} type="number" step="0.00001" placeholder={placeholder}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        ))}
      </div>

      {/* Auto-computed preview */}
      {(pnlPreview !== null || rrPreview !== null) && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border">
          <Calculator className="w-4 h-4 text-muted-foreground shrink-0" />
          {pnlPreview !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Estimated P&L</p>
              <p className={cn('text-sm font-semibold tabular-nums', pnlPreview >= 0 ? 'text-profit' : 'text-loss')}>
                {pnlPreview >= 0 ? '+' : ''}{formatCurrency(pnlPreview)}
              </p>
            </div>
          )}
          {rrPreview !== null && (
            <div className="border-l border-border pl-4">
              <p className="text-xs text-muted-foreground">Risk : Reward</p>
              <p className="text-sm font-semibold">1 : {rrPreview}</p>
            </div>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Open Time</label>
          <input {...register('openTime')} type="datetime-local"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Close Time</label>
          <input {...register('closeTime')} type="datetime-local"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Commission + Swap */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Commission</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input {...register('commission')} type="number" step="0.01" placeholder="0.00"
              className="w-full h-10 pl-7 pr-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Swap</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input {...register('swap')} type="number" step="0.01" placeholder="0.00"
              className="w-full h-10 pl-7 pr-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </div>

      {/* Error summary */}
      {createTrade.isError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          Failed to save trade. Please check the form and try again.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || createTrade.isPending}
          className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSubmitting || createTrade.isPending ? 'Saving…' : 'Save Trade'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-10 px-4 rounded-lg border border-input text-sm hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
