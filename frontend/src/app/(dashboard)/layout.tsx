'use client';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/lib/auth';

/**
 * Hold the dashboard until the session has been restored.
 *
 * The access token is memory-only, so on a cold load there is no token until
 * `bootstrap()` finishes its silent refresh. Rendering children immediately let
 * every page fire its TanStack queries first — six unauthenticated requests that
 * 401, then a refresh, then six retries, plus a *second* token rotation because
 * the interceptor's recovery raced the bootstrap already in flight.
 *
 * `checkingAuth` existed for exactly this and nothing consumed it. Gating here
 * means one refresh per load and no 401s on the happy path.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const checkingAuth = useAuthStore((s) => s.checkingAuth);

  return (
    <div className="min-h-screen bg-muted/40 dark:bg-[radial-gradient(1200px_620px_at_18%_-10%,rgba(37,99,235,0.15),transparent_56%),radial-gradient(900px_520px_at_100%_0%,rgba(16,185,129,0.08),transparent_50%),hsl(var(--background))] p-2 sm:p-3">
      <div className="flex min-h-[calc(100vh-1rem)] overflow-hidden rounded-xl border border-border/90 bg-card/95 dark:bg-card shadow-sm dark:shadow-[0_22px_55px_rgba(2,6,23,0.45)]">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-full overflow-y-auto bg-muted/25 dark:bg-[rgba(11,18,32,0.52)]">
          {checkingAuth ? (
            <div className="app-page space-y-3" aria-busy="true" aria-live="polite">
              <div className="h-6 w-48 rounded bg-muted animate-pulse" />
              <div className="h-28 rounded-[10px] bg-muted animate-pulse" />
              <div className="h-64 rounded-[10px] bg-muted animate-pulse" />
              <span className="sr-only">Restoring your session…</span>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
