import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/50 p-2 sm:p-3">
      <div className="flex min-h-[calc(100vh-1rem)] overflow-hidden rounded-xl border border-border/90 bg-card">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-full overflow-y-auto bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
