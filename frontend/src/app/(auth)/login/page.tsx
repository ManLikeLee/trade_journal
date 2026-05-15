'use client';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

/** Sanitise the `from` redirect so we only ever redirect to same-origin paths. */
function safeFrom(raw: string | null): string {
  if (!raw) return '/dashboard';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/dashboard';
    return url.pathname + url.search;
  } catch {
    return raw.startsWith('/') ? raw : '/dashboard';
  }
}

function LoginForm() {
  const { login, isAuthenticated, checkingAuth } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const from = safeFrom(searchParams.get('from'));
  const [error, setError] = useState('');

  // ── Debug logs ────────────────────────────────────────────────────
  useEffect(() => {
    console.log('[Login] pathname:', pathname);
    console.log('[Login] isAuthenticated:', isAuthenticated);
    console.log('[Login] checkingAuth (overlay/loading mounted):', checkingAuth);
    console.log('[Login] route is protected: false (public)');
    console.log('[Login] redirect target after login:', from);
  }, [pathname, isAuthenticated, checkingAuth, from]);

  // ── Auto-redirect if session is still valid ───────────────────────
  useEffect(() => {
    if (!checkingAuth && isAuthenticated) {
      console.log('[Login] Session already valid — redirecting to:', from);
      router.replace(from);
    }
  }, [checkingAuth, isAuthenticated, from, router]);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    setError('');
    try {
      await login(data.email, data.password);
      console.log('[Login] Login successful — redirecting to:', from);
      router.push(from);
    } catch (e: any) {
      console.error('[Login] Login error:', e);
      const backendMessage = e?.response?.data?.message;
      const networkMessage = !e?.response
        ? 'Cannot reach API server. Verify the backend is running.'
        : null;
      setError(backendMessage ?? networkMessage ?? 'Sign in failed. Please try again.');
    }
  };

  // While validating stored token — minimal non-blocking indicator, NO overlay
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your trading journal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{String(errors.email.message)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.password && (
              <p className="text-xs text-destructive">{String(errors.password.message)}</p>
            )}
          </div>

          {/* Server / network error */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Create one →
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Wrap in Suspense — useSearchParams() requires it in Next.js App Router. */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
