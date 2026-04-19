import { TradeForm } from '@/components/trades/TradeForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTradePage() {
  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <div className="mb-6">
        <Link href="/trades" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Trade Log
        </Link>
        <h1 className="text-xl font-semibold">Log a Trade</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Record a trade manually with full details</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <TradeForm />
      </div>
    </div>
  );
}
