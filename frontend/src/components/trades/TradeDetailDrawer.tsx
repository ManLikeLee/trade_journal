'use client';
import { useState } from 'react';
import { X, Tag, MessageSquare, TrendingUp, TrendingDown, Clock, Layers } from 'lucide-react';
import { useTrade, useUpdateTrade, Trade, TradeNote } from '@/hooks/useTrades';
import { formatCurrency, formatDateTime, formatTradeDuration, cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

const EMOTIONS = ['CONFIDENT','FEARFUL','GREEDY','NEUTRAL','FOMO','DISCIPLINED','REVENGE','ANXIOUS'] as const;
const EMOTION_COLORS: Record<string, string> = {
  CONFIDENT: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  FEARFUL:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  GREEDY:    'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  NEUTRAL:   'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  FOMO:      'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  DISCIPLINED:'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  REVENGE:   'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  ANXIOUS:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

interface TradeDetailDrawerProps {
  tradeId: string | null;
  onClose: () => void;
}

export function TradeDetailDrawer({ tradeId, onClose }: TradeDetailDrawerProps) {
  const { data: trade, isLoading } = useTrade(tradeId ?? '');
  const updateTrade = useUpdateTrade();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [noteEmotion, setNoteEmotion] = useState<string>('NEUTRAL');
  const [savingNote, setSavingNote] = useState(false);

  const pnl = trade ? Number(trade.pnl ?? 0) : 0;
  const rr  = trade?.riskReward ? Number(trade.riskReward) : null;

  const addNote = async () => {
    if (!noteText.trim() || !tradeId) return;
    setSavingNote(true);
    try {
      await api.post(`/trades/${tradeId}/notes`, { content: noteText, emotion: noteEmotion });
      qc.invalidateQueries({ queryKey: ['trade', tradeId] });
      setNoteText('');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {tradeId && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Drawer */}
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 w-[460px] max-w-full bg-card border-l border-border shadow-2xl',
        'flex flex-col transition-transform duration-300 ease-out',
        tradeId ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          {trade ? (
            <div className="flex items-center gap-3">
              <div className={cn('w-1.5 h-8 rounded-full', trade.direction === 'BUY' ? 'bg-profit' : 'bg-loss')} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base">{trade.symbol}</span>
                  <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded',
                    trade.direction === 'BUY' ? 'bg-profit' : 'bg-loss')}>
                    {trade.direction}
                  </span>
                  <span className="text-xs text-muted-foreground">{Number(trade.lotSize).toFixed(2)} lots</span>
                </div>
                <p className="text-xs text-muted-foreground">{trade.source}</p>
              </div>
            </div>
          ) : (
            <div className="h-6 w-40 rounded bg-muted animate-pulse" />
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-5 rounded bg-muted animate-pulse" style={{ width: `${50 + i * 10}%` }} />
              ))}
            </div>
          )}

          {trade && (
            <div className="p-5 space-y-6">
              {/* P&L hero */}
              {trade.pnl !== null && (
                <div className={cn('rounded-xl p-4 text-center', pnl >= 0 ? 'bg-profit' : 'bg-loss')}>
                  <p className="text-xs font-medium opacity-70 mb-1">Net P&L</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                  </p>
                  {rr && (
                    <p className="text-sm mt-1 opacity-80">R:R  1:{rr.toFixed(2)}</p>
                  )}
                </div>
              )}

              {/* Price grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Entry Price', value: Number(trade.entryPrice).toFixed(5), icon: TrendingUp },
                  { label: 'Exit Price',  value: trade.exitPrice ? Number(trade.exitPrice).toFixed(5) : '—', icon: TrendingDown },
                  { label: 'Stop Loss',   value: trade.stopLoss ? Number(trade.stopLoss).toFixed(5) : '—', icon: null },
                  { label: 'Take Profit', value: trade.takeProfit ? Number(trade.takeProfit).toFixed(5) : '—', icon: null },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="font-mono font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Meta info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Opened:</span>
                  <span>{formatDateTime(trade.openTime)}</span>
                </div>
                {trade.closeTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Closed:</span>
                    <span>{formatDateTime(trade.closeTime)}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({formatTradeDuration(trade.openTime, trade.closeTime)})
                    </span>
                  </div>
                )}
                {(Number(trade.commission) > 0 || Number(trade.swap) !== 0) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Commission:</span>
                    <span>{formatCurrency(Number(trade.commission))}</span>
                    {Number(trade.swap) !== 0 && (
                      <>
                        <span className="text-muted-foreground ml-2">Swap:</span>
                        <span>{formatCurrency(Number(trade.swap))}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              {trade.tradeTags?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.tradeTags.map(({ tag }: any) => (
                      <span
                        key={tag.id}
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}
                        className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Trade Journal Notes
                </p>
                {trade.notes?.map((note: TradeNote) => (
                  <div key={note.id} className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
                    {note.emotion && (
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium mb-2 inline-block',
                        EMOTION_COLORS[note.emotion] ?? 'bg-muted')}>
                        {note.emotion}
                      </span>
                    )}
                    <p className="text-sm text-foreground">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{formatDateTime(note.createdAt)}</p>
                  </div>
                ))}

                {/* Add note */}
                <div className="mt-3 space-y-2">
                  <select
                    value={noteEmotion}
                    onChange={(e) => setNoteEmotion(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="What were you thinking? What happened?"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={addNote}
                    disabled={!noteText.trim() || savingNote}
                    className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {savingNote ? 'Saving…' : 'Add Note'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
