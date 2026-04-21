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
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useTheme } from '@/components/theme/theme-provider';

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
    <button onClick={copy} className="p-1.5 rounded-md hover:bg-accent transition-colors">
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
    <div className="section-card space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs">{account.name}</p>
          <p className="text-[11px] text-muted-foreground">{account.broker} · {account.currency}</p>
        </div>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
          account.isActive ? 'ui-badge-buy' : 'bg-muted text-muted-foreground')}>
          {account.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* API key section for MT4/MT5 */}
      <div className="rounded-md bg-muted/45 border border-border p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Key className="w-3.5 h-3.5" />
          MT4/MT5 API Key
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] font-mono bg-background rounded-md px-2 py-1.5 border border-border truncate">
            {showKey ? (account.apiKey ?? 'Not generated') : '•'.repeat(32)}
          </code>
          <button onClick={() => setShowKey(s => !s)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            {showKey ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          {account.apiKey && <CopyButton text={account.apiKey} />}
          <button
            onClick={() => regenKey.mutate()}
            disabled={regenKey.isPending}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            title="Regenerate key"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-muted-foreground', regenKey.isPending && 'animate-spin')} />
          </button>
        </div>
        <p className="text-[10.5px] text-muted-foreground">
          Use this key in your MT4/MT5 Expert Advisor as the <code className="font-mono">X-Api-Key</code> header.
        </p>
      </div>

      {/* EA setup code snippet */}
      <details className="text-[11px]">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium select-none">
          Show EA code snippet
        </summary>
        <pre className="mt-2 p-2.5 rounded-md bg-muted/55 border border-border overflow-x-auto text-[10.5px] font-mono text-muted-foreground">
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
  const { theme, setTheme } = useTheme();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(accountSchema),
  });

  const createAccount = useMutation({
    mutationFn: (data: any) => api.post('/accounts', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setShowForm(false); reset(); },
  });

  const createError = createAccount.error as any;
  const createErrorMessage =
    createError?.response?.data?.message ||
    createError?.message ||
    null;

  return (
    <div className="app-page-narrow max-w-3xl">
      <div>
        <h1 className="app-title">Settings</h1>
        <p className="app-subtitle">Manage broker connections and API keys</p>
      </div>

      {/* Accounts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-card-title">Trading accounts</h2>
          <button
            onClick={() => setShowForm(s => !s)}
            className="ui-btn-secondary h-8 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            Add account
          </button>
        </div>

        {/* New account form */}
        {showForm && (
          <form
            onSubmit={handleSubmit((d) => createAccount.mutate(d))}
            className="section-card border-primary/25 space-y-3 animate-slide-up"
          >
            <h3 className="section-card-title">New account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'name',          label: 'Account Name',  placeholder: 'Main account' },
                { name: 'broker',        label: 'Broker',        placeholder: 'IC Markets' },
                { name: 'accountNumber', label: 'Account No.',   placeholder: '12345678' },
                { name: 'currency',      label: 'Currency',      placeholder: 'USD' },
              ].map(({ name, label, placeholder }) => (
                <div key={name} className="space-y-1">
                  <label className="ui-label">{label}</label>
                  <input
                    {...register(name as any)}
                    placeholder={placeholder}
                    className="ui-input"
                  />
                  {(errors as any)[name] && <p className="ui-error">{String((errors as any)[name]?.message ?? '')}</p>}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <label className="ui-label">Initial Balance ($)</label>
              <input
                {...register('initialBalance')}
                type="number"
                placeholder="10000"
                className="ui-input-mono"
              />
              {errors.initialBalance && <p className="ui-error">{String(errors.initialBalance.message ?? '')}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting || createAccount.isPending}
                className="ui-btn-primary flex-1"
              >
                {createAccount.isPending ? 'Creating…' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="ui-btn-secondary">
                Cancel
              </button>
            </div>
            {createErrorMessage && (
              <p className="ui-error">{String(createErrorMessage)}</p>
            )}
          </form>
        )}

        <div className="space-y-2.5">
          {accounts?.map((account: any) => (
            <AccountCard key={account.id} account={account} />
          ))}
          {!accounts?.length && !showForm && (
            <div className="dashboard-empty section-card min-h-[120px]">
              No accounts yet. Add one to get started.
            </div>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="section-card space-y-2.5">
        <h2 className="section-card-title">Appearance</h2>
        <p className="text-xs text-muted-foreground">
          Choose your preferred app theme. This setting is saved on this browser.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={cn('ui-btn-secondary h-8 px-3', theme === 'light' && 'ui-nav-active border-transparent')}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn('ui-btn-secondary h-8 px-3', theme === 'dark' && 'ui-nav-active border-transparent')}
          >
            Dark
          </button>
          <ThemeToggle compact className="ml-auto" />
        </div>
      </section>

      {/* MT4/MT5 integration guide */}
      <section className="section-card space-y-2.5">
        <h2 className="section-card-title">MT4/MT5 integration</h2>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>Your Expert Advisor sends trades to:</p>
          <code className="block bg-muted/50 rounded-md px-3 py-2 text-[11px] font-mono border border-border">
            POST {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/trades/sync
          </code>
          <p className="text-[11px]">Authentication: <code className="font-mono text-[11px]">X-Api-Key</code> header with your account's API key.</p>
          <p className="text-[11px]">The <code className="font-mono">ticket</code> field is used as the idempotency key. Duplicate POSTs update existing trades rather than creating duplicates.</p>
        </div>
      </section>
    </div>
  );
}
