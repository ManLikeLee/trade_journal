'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, PlusCircle, Settings,
  TrendingUp, LogOut, ChevronDown, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import { useAccounts } from '@/hooks/useTrades';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trades',    label: 'Trade Log',  icon: BookOpen },
  { href: '/trades/new', label: 'Add Trade', icon: PlusCircle },
  { href: '/settings',  label: 'Settings',  icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { data: accounts } = useAccounts();

  return (
    <aside className="flex h-full flex-col w-[var(--sidebar-width)] border-r border-border/90 bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border/90 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
          <TrendingUp className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-medium text-[13px] tracking-tight">TradeJournal</span>
      </div>

      {/* Account switcher */}
      <div className="px-2 pt-2 pb-1">
        {accounts?.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs hover:bg-accent transition-colors">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-left truncate font-medium">
                  {accounts[0]?.name}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {accounts.map((acc: any) => (
                <DropdownMenuItem key={acc.id} className="text-sm">
                  <Wallet className="w-4 h-4 mr-2 text-muted-foreground" />
                  {acc.name}
                  <span className="ml-auto text-xs text-muted-foreground">{acc.broker}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs bg-accent text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">No account connected</span>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard'
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-2.5 py-[7px] rounded-md text-[12.5px] font-medium transition-colors',
                active
                  ? 'bg-[#E6F1FB] text-[#185FA5]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-2 pb-2 pt-2 border-t border-border/90 mt-auto">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-accent/90">
          <div className="w-6 h-6 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[10px] font-semibold text-[#185FA5] shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-medium truncate">{user?.name ?? user?.email}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}
