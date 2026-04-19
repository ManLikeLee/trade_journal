import { TradeForm } from '@/components/trades/TradeForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTradePage() {
  return (
    <div className="app-page-narrow max-w-2xl">
      <div className="space-y-2">
        <Link href="/trades" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to trade log
        </Link>
        <h1 className="app-title">Log a trade</h1>
        <p className="app-subtitle">Record a trade manually with full details</p>
      </div>
      <div className="section-card">
        <TradeForm />
      </div>
    </div>
  );
}
