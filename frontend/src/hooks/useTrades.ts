import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────
export interface Trade {
  id: string;
  accountId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  lotSize: string;
  entryPrice: string;
  exitPrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  openTime: string;
  closeTime: string | null;
  pnl: string | null;
  riskReward: string | null;
  commission: string;
  swap: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  source: 'MANUAL' | 'MT4' | 'MT5' | 'API';
  notes: TradeNote[];
  tradeTags: Array<{ tag: Tag }>;
}

export interface TradeNote {
  id: string;
  content: string;
  emotion: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TradeFilters {
  accountId?: string;
  symbol?: string;
  direction?: 'BUY' | 'SELL';
  status?: 'OPEN' | 'CLOSED';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface AnalyticsSummary {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  grossWin: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  avgRR: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
}

type AnalyticsParams = { accountId?: string; from?: string; to?: string };

function analyticsKey(scope: string, params: AnalyticsParams) {
  return [
    'analytics',
    scope,
    params.accountId ?? '',
    params.from ?? '',
    params.to ?? '',
  ];
}

// ── Trades hooks ─────────────────────────────────────────────
export function useTrades(filters: TradeFilters = {}) {
  return useQuery({
    queryKey: ['trades', filters],
    queryFn: () => api.get('/trades', { params: filters }).then(r => r.data),
  });
}

export function useTrade(id: string) {
  return useQuery({
    queryKey: ['trade', id],
    queryFn: () => api.get(`/trades/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/trades', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  });
}

export function useUpdateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/trades/${id}`, data).then(r => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['trade', id] });
    },
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/trades/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  });
}

// ── Analytics hooks ──────────────────────────────────────────
export function useAnalyticsSummary(params: AnalyticsParams = {}) {
  return useQuery({
    queryKey: analyticsKey('summary', params),
    queryFn: () => api.get('/analytics/summary', { params }).then(r => r.data),
  });
}

export function useEquityCurve(params: AnalyticsParams = {}) {
  return useQuery({
    queryKey: analyticsKey('equity-curve', params),
    queryFn: () => api.get('/analytics/equity-curve', { params }).then(r => r.data),
  });
}

export function usePnlByDay(params: AnalyticsParams = {}) {
  return useQuery({
    queryKey: analyticsKey('pnl-by-day', params),
    queryFn: () => api.get('/analytics/pnl-by-day', { params }).then(r => r.data),
  });
}

export function usePnlBySymbol(params: AnalyticsParams = {}) {
  return useQuery({
    queryKey: analyticsKey('pnl-by-symbol', params),
    queryFn: () => api.get('/analytics/pnl-by-symbol', { params }).then(r => r.data),
  });
}

// ── Accounts hook ────────────────────────────────────────────
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  });
}
