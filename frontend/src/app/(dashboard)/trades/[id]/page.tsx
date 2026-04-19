'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTrade, useDeleteTrade } from '@/hooks/useTrades';
import { formatCurrency, formatDateTime, formatTradeDuration, cn } from '@/lib/utils';
import {
  ArrowLeft, Trash2, TrendingUp, TrendingDown,
  Clock, Tag, MessageSquare, Layers, Edit,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

const EMOTIONS = ['CONFIDENT','FEARFUL','GREEDY','NEUTRAL','FOMO','DISCIPLINED','REVENGE','ANXIOUS'] as const;
const EMOTION_STYLE: Record<string, string> = {
  CONFIDENT:  'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  FEARFUL:    'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  GREEDY:     'bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  NEUTRAL:    'bg-muted text-muted-foreground',
  FOMO:       'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  DISCIPLINED:'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  REVENGE:    'bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  ANXIOUS:    'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

function PriceBar({
  entry, stop, tp, exit, direction,
}: {
  entry: number; stop?: number; tp?: number; exit?: number; direction: 'BUY' | 'SELL';
}) {
  const prices = [entry, stop, tp, exit].filter(Boolean) as number[];
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pct = (v: number) => ((v - min) / range) * 100;

  return (
    <div className="relative h-10 mx-2">
      <div className="absolute inset-y-4 left-0 right-0 bg-muted rounded-full h-2 top-4" />
      {stop != null && (
        <div className="absolute top-0 flex flex-col items-center" style={{ left: `${pct(stop)}%` }}>
          <span className="text-[10px] text-loss mb-0.5">SL</span>
          <div className="w-0.5 h-6 bg-loss rounded" />
          <span className="text-[10px] font-mono text-loss">{stop.toFixed(5)}</span>
        </div>
      )}
      {tp != null && (
        <div className="absolute top-0 flex flex-col items-center" style={{ left: `${pct(tp)}%` }}>
          <span className="text-[10px] text-profit mb-0.5">TP</span>
          <div className="w-0.5 h-6 bg-profit rounded" />
          <span className="text-[10px] font-mono text-profit">{tp.toFixed(5)}</span>
        </div>
      )}
      <div className="absolute top-0 flex flex-col items-center" style={{ left: `${pct(entry)}%` }}>
        <span className="text-[10px] text-primary mb-0.5">Entry</span>
        <div className="w-0.5 h-6 bg-primary rounded" />
        <span className="text-[10px] font-mono text-primary">{entry.toFixed(5)}</span>
      </div>
      {exit != null && (
        <div className="absolute top-0 flex flex-col items-center" style={{ left: `${pct(exit)}%` }}>
          <span className="text-[10px] text-muted-foreground mb-0.5">Exit</span>
          <div className="w-0.5 h-6 bg-foreground/50 rounded" />
          <span className="text-[10px] font-mono">{exit.toFixed(5)}</span>
        </div>
      )}
    </div>
  );
}

export default function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { data: trade, isLoading } = useTrade(id);
  const deleteTrade = useDeleteTrade();
  const [noteText, setNoteText] = useState('');
  const [noteEmotion, setNoteEmotion] = useState('NEUTRAL');
  const [savingNote, setSavingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    await deleteTrade.mutateAsync(id);
    router.push('/trades');
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/trades/${id}/notes`, { content: noteText, emotion: noteEmotion });
      qc.invalidateQueries({ queryKey: ['trade', id] });
      setNoteText('');
    } finally {
      setSavingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-page-narrow max-w-4xl space-y-3 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-40 bg-muted rounded-[10px]" />
        <div className="h-60 bg-muted rounded-[10px]" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="app-page-narrow max-w-4xl text-center">
        <p className="text-xs text-muted-foreground">Trade not found.</p>
        <Link href="/trades" className="text-primary text-xs hover:underline mt-2 inline-block">← Back to trades</Link>
      </div>
    );
  }

  const pnl = Number(trade.pnl ?? 0);
  const rr = trade.riskReward ? Number(trade.riskReward) : null;
  const hasPnl = trade.pnl !== null;
  const grossPnl = pnl + Number(trade.commission ?? 0) + Number(trade.swap ?? 0);

  return (
    <div className="app-page-narrow max-w-4xl">
      {/* Header */}
      <div className="app-page-header">
        <div className="flex items-center gap-2.5">
          <Link href="/trades"
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-medium font-mono">{trade.symbol}</h1>
              <span className={cn(
                trade.direction === 'BUY' ? 'ui-badge-buy' : 'ui-badge-sell',
              )}>
                {trade.direction}
              </span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
                trade.status === 'OPEN' ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-muted text-muted-foreground')}>
                {trade.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {Number(trade.lotSize).toFixed(2)} lots · via {trade.source}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/trades/${id}/edit`}
            className="ui-btn-secondary h-8 px-3">
            <Edit className="w-3.5 h-3.5" /> Edit
          </Link>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="ui-btn-danger h-8 px-3">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">Sure?</span>
              <button onClick={handleDelete}
                className="ui-btn h-8 px-3 bg-loss text-white hover:bg-loss/90">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="ui-btn-secondary h-8 px-3">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* P&L hero */}
      {hasPnl && (
        <div className={cn('rounded-[10px] border p-4 grid grid-cols-3 gap-3', pnl >= 0 ? 'bg-[#EAF3DE] border-[#CFE2B5]' : 'bg-[#FCEBEB] border-[#F1C6C6]')}>
          <div className="text-center">
            <p className="text-[10.5px] font-medium opacity-70 mb-1">Net P&L</p>
            <p className="text-xl font-medium tabular-nums">
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
            </p>
          </div>
          <div className="text-center border-x border-current/20">
            <p className="text-[10.5px] font-medium opacity-70 mb-1">Gross P&L</p>
            <p className="text-xl font-medium tabular-nums">
              {grossPnl >= 0 ? '+' : ''}{formatCurrency(grossPnl)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10.5px] font-medium opacity-70 mb-1">Risk : Reward</p>
            <p className="text-xl font-medium">
              {rr ? `1 : ${rr.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* Price levels */}
        <div className="section-card space-y-3">
          <h2 className="section-card-title">Price levels</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Entry price',  value: Number(trade.entryPrice).toFixed(5), icon: TrendingUp, color: 'text-primary' },
              { label: 'Exit price',   value: trade.exitPrice ? Number(trade.exitPrice).toFixed(5) : '—', icon: TrendingDown, color: '' },
              { label: 'Stop loss',    value: trade.stopLoss ? Number(trade.stopLoss).toFixed(5) : '—', icon: null, color: 'text-loss' },
              { label: 'Take profit',  value: trade.takeProfit ? Number(trade.takeProfit).toFixed(5) : '—', icon: null, color: 'text-profit' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-md bg-muted/40 border border-border p-2.5">
                <p className="text-[10.5px] text-muted-foreground mb-1">{label}</p>
                <p className={cn('font-mono font-medium text-xs', color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Visual price bar */}
          {trade.entryPrice && (
            <div className="pt-2">
              <p className="text-[10.5px] text-muted-foreground mb-3">Price map</p>
              <PriceBar
                entry={Number(trade.entryPrice)}
                stop={trade.stopLoss ? Number(trade.stopLoss) : undefined}
                tp={trade.takeProfit ? Number(trade.takeProfit) : undefined}
                exit={trade.exitPrice ? Number(trade.exitPrice) : undefined}
                direction={trade.direction}
              />
            </div>
          )}
        </div>

        {/* Trade meta */}
        <div className="section-card space-y-3">
          <h2 className="section-card-title">Trade details</h2>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10.5px] text-muted-foreground">Open time</p>
                <p className="text-xs font-medium">{formatDateTime(trade.openTime)}</p>
              </div>
            </div>
            {trade.closeTime && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10.5px] text-muted-foreground">Close time</p>
                  <p className="text-xs font-medium">
                    {formatDateTime(trade.closeTime)}
                    <span className="text-muted-foreground font-normal ml-2 text-[10.5px]">
                      ({formatTradeDuration(trade.openTime, trade.closeTime)})
                    </span>
                  </p>
                </div>
              </div>
            )}
              <div className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10.5px] text-muted-foreground">Costs</p>
                  <p className="text-xs">
                    Commission: <span className="font-medium">{formatCurrency(Number(trade.commission))}</span>
                    <span className="mx-2 text-border">·</span>
                    Swap: <span className="font-medium">{formatCurrency(Number(trade.swap))}</span>
                </p>
              </div>
            </div>
            {trade.account && (
              <div className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10.5px] text-muted-foreground">Account</p>
                  <p className="text-xs font-medium">{trade.account.name} — {trade.account.broker}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {trade.tradeTags?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground mb-1.5">
                <Tag className="w-3.5 h-3.5" /> Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trade.tradeTags.map(({ tag }: any) => (
                  <span key={tag.id}
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}
                    className="text-[10.5px] px-2 py-0.5 rounded-full border font-medium">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes timeline */}
      <div className="section-card">
        <h2 className="section-card-title mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          Journal notes
        </h2>

        {trade.notes?.length > 0 ? (
          <div className="space-y-0 relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            {trade.notes.map((note: any) => (
              <div key={note.id} className="relative pl-6 pb-5 last:pb-0">
                <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-border" />
                <div className="rounded-md border border-border bg-muted/20 p-2.5">
                  {note.emotion && (
                  <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium mb-1.5 inline-block',
                      EMOTION_STYLE[note.emotion] ?? 'bg-muted')}>
                      {note.emotion}
                    </span>
                  )}
                  <p className="text-xs">{note.content}</p>
                  <p className="text-[10.5px] text-muted-foreground mt-2">{formatDateTime(note.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-4">No notes yet. Add your first reflection below.</p>
        )}

        {/* Add note form */}
        <div className={cn('space-y-2', trade.notes?.length > 0 && 'mt-4 pt-4 border-t border-border')}>
          <div className="flex items-center gap-2">
            <select value={noteEmotion} onChange={e => setNoteEmotion(e.target.value)}
              className="ui-select h-8 px-2 text-[11px]">
              {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <span className="text-[10.5px] text-muted-foreground">How were you feeling?</span>
          </div>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="What were you thinking? What did you learn from this trade?"
            rows={3}
            className="ui-textarea resize-none text-xs" />
          <button onClick={addNote} disabled={!noteText.trim() || savingNote}
            className="ui-btn-primary">
            {savingNote ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </div>
    </div>
  );
}
