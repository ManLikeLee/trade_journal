'use client';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender, createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { useTrades, Trade, TradeFilters } from '@/hooks/useTrades';
import { formatCurrency, formatDateTime, formatTradeDuration, cn } from '@/lib/utils';

const col = createColumnHelper<Trade>();

const columns = [
  col.accessor('symbol', {
    header: 'Symbol',
    cell: (info) => (
      <span className="font-mono font-semibold text-sm">{info.getValue()}</span>
    ),
  }),
  col.accessor('direction', {
    header: 'Side',
    cell: (info) => {
      const dir = info.getValue();
      return (
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded',
          dir === 'BUY' ? 'bg-profit' : 'bg-loss')}>
          {dir}
        </span>
      );
    },
  }),
  col.accessor('lotSize', {
    header: 'Lots',
    cell: (info) => <span className="font-mono text-sm">{Number(info.getValue()).toFixed(2)}</span>,
  }),
  col.accessor('entryPrice', {
    header: 'Entry',
    cell: (info) => <span className="font-mono text-sm">{Number(info.getValue()).toFixed(5)}</span>,
  }),
  col.accessor('exitPrice', {
    header: 'Exit',
    cell: (info) => info.getValue()
      ? <span className="font-mono text-sm">{Number(info.getValue()).toFixed(5)}</span>
      : <span className="text-muted-foreground text-xs">Open</span>,
  }),
  col.accessor('pnl', {
    header: 'P&L',
    cell: (info) => {
      const val = Number(info.getValue() ?? 0);
      if (!info.getValue()) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <span className={cn('font-mono font-semibold text-sm tabular-nums', val >= 0 ? 'text-profit' : 'text-loss')}>
          {val >= 0 ? '+' : ''}{formatCurrency(val)}
        </span>
      );
    },
  }),
  col.accessor('riskReward', {
    header: 'R:R',
    cell: (info) => info.getValue()
      ? <span className="font-mono text-sm">1:{Number(info.getValue()).toFixed(2)}</span>
      : <span className="text-muted-foreground text-xs">—</span>,
  }),
  col.accessor('openTime', {
    header: 'Opened',
    cell: (info) => <span className="text-sm text-muted-foreground">{formatDateTime(info.getValue())}</span>,
  }),
  col.display({
    id: 'duration',
    header: 'Duration',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatTradeDuration(row.original.openTime, row.original.closeTime)}
      </span>
    ),
  }),
  col.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const s = info.getValue();
      return (
        <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
          s === 'OPEN' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
          : s === 'CLOSED' ? 'bg-muted text-muted-foreground'
          : 'bg-muted text-muted-foreground'
        )}>
          {s}
        </span>
      );
    },
  }),
];

export function TradesTable() {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'openTime', desc: true }]);
  const [filters, setFilters] = useState<TradeFilters>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTrades({
    ...filters,
    symbol: search || undefined,
    sortBy: sorting[0]?.id,
    order: sorting[0]?.desc ? 'desc' : 'asc',
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data?.meta?.pages ?? 1,
  });

  const SortIcon = ({ id }: { id: string }) => {
    const sorted = sorting[0]?.id === id;
    if (!sorted) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
    return sorting[0]?.desc
      ? <ChevronDown className="w-3.5 h-3.5 text-primary" />
      : <ChevronUp className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            placeholder="Filter by symbol…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value as any) || undefined, page: 1 }))}
          className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All status</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={filters.direction ?? ''}
          onChange={(e) => setFilters(f => ({ ...f, direction: (e.target.value as any) || undefined, page: 1 }))}
          className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Buy & Sell</option>
          <option value="BUY">Buy only</option>
          <option value="SELL">Sell only</option>
        </select>
        <div className="ml-auto text-xs text-muted-foreground">
          {data?.meta?.total ?? 0} trades
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-border bg-muted/30">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                        header.column.getCanSort() && 'cursor-pointer hover:text-foreground select-none',
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <SortIcon id={header.id} />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + (j * 17) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/trades/${row.original.id}`)}
                      className="hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
              {!isLoading && !data?.data?.length && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No trades found. Try adjusting your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.meta?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Page {filters.page} of {data?.meta?.pages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilters(f => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                disabled={filters.page === 1}
                className="h-7 w-7 flex items-center justify-center rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={filters.page === data?.meta?.pages}
                className="h-7 w-7 flex items-center justify-center rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
