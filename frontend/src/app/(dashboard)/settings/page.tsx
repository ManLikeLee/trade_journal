'use client';
import { useState } from 'react';
import { Copy, Check, Plus, RefreshCw, Wallet, Key, Eye, EyeOff } from 'lucide-react';
import { useAccounts } from '@/hooks/useTrades';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const accountSchema = z.object({
  name:          z.string().min(1, 'Required'),
  broker:        z.string().min(1, 'Required'),
  accountNumber: z.string().optional(),
  currency:      z.string().default('USD'),
  initialBalance: z.coerce.number().min(0).default(0),
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-accent transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-profit" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function AccountCard({ account }: { account: any }) {
  const qc = useQueryClient();
  const [showKey, setShowKey] = useState(false);

  const regenKey = useMutation({
    mutationFn: () => api.post(`/accounts/${account.id}/regen-key`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{account.name}</p>
          <p className="text-xs text-muted-foreground">{account.broker} · {account.currency}</p>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
          account.isActive ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground')}>
          {account.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* API key section for MT4/MT5 */}
      <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Key className="w-3.5 h-3.5" />
          MT4/MT5 API Key
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono bg-background rounded px-2 py-1.5 border border-border truncate">
            {showKey ? (account.apiKey ?? 'Not generated') : '•'.repeat(32)}
          </code>
          <button onClick={() => setShowKey(s => !s)} className="p-1.5 rounded hover:bg-accent transition-colors">
            {showKey ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          {account.apiKey && <CopyButton text={account.apiKey} />}
          <button
            onClick={() => regenKey.mutate()}
            disabled={regenKey.isPending}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Regenerate key"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-muted-foreground', regenKey.isPending && 'animate-spin')} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use this key in your MT4/MT5 Expert Advisor as the <code className="font-mono">X-Api-Key</code> header.
        </p>
      </div>

      {/* EA setup code snippet */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium select-none">
          Show EA code snippet
        </summary>
        <pre className="mt-2 p-3 rounded-lg bg-muted/60 border border-border overflow-x-auto text-xs font-mono text-muted-foreground">
{`// MQL5 Expert Advisor — TradeJournal sync
string API_URL = "${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/trades/sync";
string API_KEY = "${account.apiKey ?? 'YOUR_API_KEY_HERE'}";

void SendTrade(ulong ticket) {
  string body = StringFormat(
    "{\\"ticket\\":\\"%d\\",\\"symbol\\":\\"%s\\",...}",
    ticket, Symbol());
  string headers = "Content-Type: application/json\\r\\n"
                 + "X-Api-Key: " + API_KEY;
  char post[]; StringToCharArray(body, post);
  char result[]; string rheaders;
  WebRequest("POST", API_URL, headers, 5000,
             post, result, rheaders);
}`}
        </pre>
      </details>
    </div>
  );
}

export default function SettingsPage() {
  const { data: accounts } = useAccounts();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(accountSchema),
  });

  const createAccount = useMutation({
    mutationFn: (data: any) => api.post('/accounts', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setShowForm(false); reset(); },
  });

  return (
    <div className="p-6 max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage broker connections and API keys</p>
      </div>

      {/* Accounts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Trading Accounts</h2>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-input text-sm hover:bg-accent transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>

        {/* New account form */}
        {showForm && (
          <form
            onSubmit={handleSubmit((d) => createAccount.mutate(d))}
            className="rounded-xl border border-primary/30 bg-card p-5 space-y-4 animate-slide-up"
          >
            <h3 className="text-sm font-medium">New Account</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'name',          label: 'Account Name',  placeholder: 'Main account' },
                { name: 'broker',        label: 'Broker',        placeholder: 'IC Markets' },
                { name: 'accountNumber', label: 'Account No.',   placeholder: '12345678' },
                { name: 'currency',      label: 'Currency',      placeholder: 'USD' },
              ].map(({ name, label, placeholder }) => (
                <div key={name} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input
                    {...register(name as any)}
                    placeholder={placeholder}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Initial Balance ($)</label>
              <input
                {...register('initialBalance')}
                type="number"
                placeholder="10000"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting || createAccount.isPending}
                className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {createAccount.isPending ? 'Creating…' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="h-9 px-4 rounded-lg border border-input text-sm hover:bg-accent transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {accounts?.map((account: any) => (
            <AccountCard key={account.id} account={account} />
          ))}
          {!accounts?.length && !showForm && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No accounts yet. Add one to get started.
            </p>
          )}
        </div>
      </section>

      {/* MT4/MT5 integration guide */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">MT4/MT5 Integration</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Your Expert Advisor sends trades to:</p>
          <code className="block bg-muted/50 rounded px-3 py-2 text-xs font-mono">
            POST {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/trades/sync
          </code>
          <p className="text-xs">Authentication: <code className="font-mono text-xs">X-Api-Key</code> header with your account's API key.</p>
          <p className="text-xs">The <code className="font-mono">ticket</code> field is used as the idempotency key — duplicate POSTs safely update existing trades rather than creating duplicates.</p>
        </div>
      </section>
    </div>
  );
}
