'use client';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { TradesTable } from '@/components/trades/TradesTable';
import { TradeDetailDrawer } from '@/components/trades/TradeDetailDrawer';

export default function TradesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="app-title">Trade log</h1>
          <p className="app-subtitle">All your trades, sortable and filterable</p>
        </div>
        <Link
          href="/trades/new"
          className="ui-btn-primary"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Log trade
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
