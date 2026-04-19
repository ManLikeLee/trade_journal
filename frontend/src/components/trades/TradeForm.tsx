'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useCreateTrade, useAccounts } from '@/hooks/useTrades';
import { formatCurrency, cn } from '@/lib/utils';
import { useMemo } from 'react';
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Account */}
      <div className="space-y-1.5">
        <label className="ui-label">Account</label>
        <select {...register('accountId')}
          className="ui-select">
          <option value="">Select account…</option>
          {accounts?.map((a: any) => (
            <option key={a.id} value={a.id}>{a.name} — {a.broker}</option>
          ))}
        </select>
        {errors.accountId && <p className="ui-error">{errors.accountId.message}</p>}
      </div>

      {/* Symbol + Direction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="ui-label">Symbol</label>
          <input {...register('symbol')}
            placeholder="EURUSD"
            className="ui-input-mono uppercase" />
          {errors.symbol && <p className="ui-error">{errors.symbol.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="ui-label">Direction</label>
          <Controller
            name="direction"
            control={control}
            render={({ field }) => (
              <div className="flex rounded-md border border-input overflow-hidden h-9">
                {(['BUY', 'SELL'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => field.onChange(dir)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 text-xs font-medium transition-colors',
                      field.value === dir
                        ? dir === 'BUY' ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#FCEBEB] text-[#791F1F]'
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="ui-label">Lot Size</label>
          <input {...register('lotSize')} type="number" step="0.01" placeholder="0.10"
            className="ui-input-mono" />
          {errors.lotSize && <p className="ui-error">{errors.lotSize.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="ui-label">Entry Price</label>
          <input {...register('entryPrice')} type="number" step="0.00001" placeholder="1.08540"
            className="ui-input-mono" />
        </div>
      </div>

      {/* Exit + SL + TP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { name: 'exitPrice',  label: 'Exit Price',   placeholder: '1.08820' },
          { name: 'stopLoss',   label: 'Stop Loss',    placeholder: '1.08200' },
          { name: 'takeProfit', label: 'Take Profit',  placeholder: '1.09100' },
        ].map(({ name, label, placeholder }) => (
          <div key={name} className="space-y-1.5">
            <label className="ui-label">{label}</label>
            <input {...register(name as any)} type="number" step="0.00001" placeholder={placeholder}
              className="ui-input-mono" />
          </div>
        ))}
      </div>

      {/* Auto-computed preview */}
      {(pnlPreview !== null || rrPreview !== null) && (
        <div className="flex items-center gap-4 p-3 rounded-md bg-muted/45 border border-border">
          <Calculator className="w-4 h-4 text-muted-foreground shrink-0" />
          {pnlPreview !== null && (
            <div>
              <p className="ui-help">Estimated P&L</p>
              <p className={cn('text-xs font-medium tabular-nums', pnlPreview >= 0 ? 'text-profit' : 'text-loss')}>
                {pnlPreview >= 0 ? '+' : ''}{formatCurrency(pnlPreview)}
              </p>
            </div>
          )}
          {rrPreview !== null && (
            <div className="border-l border-border pl-4">
              <p className="ui-help">Risk : Reward</p>
              <p className="text-xs font-medium">1 : {rrPreview}</p>
            </div>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="ui-label">Open Time</label>
          <input {...register('openTime')} type="datetime-local"
            className="ui-input" />
        </div>
        <div className="space-y-1.5">
          <label className="ui-label">Close Time</label>
          <input {...register('closeTime')} type="datetime-local"
            className="ui-input" />
        </div>
      </div>

      {/* Commission + Swap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="ui-label">Commission</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input {...register('commission')} type="number" step="0.01" placeholder="0.00"
              className="ui-input-mono pl-7" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="ui-label">Swap</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input {...register('swap')} type="number" step="0.01" placeholder="0.00"
              className="ui-input-mono pl-7" />
          </div>
        </div>
      </div>

      {/* Error summary */}
      {createTrade.isError && (
        <div className="p-3 rounded-md bg-loss/10 border border-loss/20 text-xs text-loss">
          Failed to save trade. Please check the form and try again.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting || createTrade.isPending}
          className="ui-btn-primary flex-1"
        >
          {isSubmitting || createTrade.isPending ? 'Saving…' : 'Save Trade'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="ui-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
