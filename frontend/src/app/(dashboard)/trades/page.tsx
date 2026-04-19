'use client';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { TradesTable } from '@/components/trades/TradesTable';
import { TradeDetailDrawer } from '@/components/trades/TradeDetailDrawer';

export default function TradesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trade Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All your trades — sortable, filterable, searchable</p>
        </div>
        <Link
          href="/trades/new"
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Log Trade
        </Link>
      </div>

      <TradesTable />

      <TradeDetailDrawer
        tradeId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
