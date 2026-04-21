import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40 dark:bg-[radial-gradient(1200px_620px_at_18%_-10%,rgba(37,99,235,0.15),transparent_56%),radial-gradient(900px_520px_at_100%_0%,rgba(16,185,129,0.08),transparent_50%),hsl(var(--background))] p-2 sm:p-3">
      <div className="flex min-h-[calc(100vh-1rem)] overflow-hidden rounded-xl border border-border/90 bg-card/95 dark:bg-card shadow-sm dark:shadow-[0_22px_55px_rgba(2,6,23,0.45)]">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-full overflow-y-auto bg-muted/25 dark:bg-[rgba(11,18,32,0.52)]">
          {children}
        </main>
      </div>
    </div>
  );
}
