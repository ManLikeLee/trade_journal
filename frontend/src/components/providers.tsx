'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { useAuthStore } from '@/lib/auth';

/**
 * Runs bootstrap() once on app mount: restores the session from the httpOnly
 * refresh cookie, since the access token is memory-only and gone after a reload.
 * This sets checkingAuth:false so the login page can render the form
 * (or redirect if the session is still valid).
 */
/**
 * Send `localhost` visitors to `127.0.0.1`, the canonical host.
 *
 * The refresh cookie is SameSite=Strict and the API is on 127.0.0.1:5000, so a
 * page opened on localhost:3000 is cross-site: the browser withholds the cookie
 * and every silent refresh 401s, which presents as being logged out immediately
 * after logging in, with no error anywhere.
 *
 * This has to happen in the browser. The same redirect in middleware.ts caused
 * an infinite 307 loop: Next rewrites a Location it considers same-deployment
 * back to a bare path, dropping the host change so the request returns to the
 * same middleware unchanged. `location.replace` is not rewritten by anything,
 * and cannot loop — after it runs the hostname no longer matches.
 *
 * Returns true when a redirect is under way, so the caller can skip work the
 * page is about to discard.
 */
function redirectToCanonicalHost(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname !== 'localhost') return false;

  const url = new URL(window.location.href);
  url.hostname = '127.0.0.1';
  window.location.replace(url.toString());
  return true;
}

function AuthSessionValidator() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    if (redirectToCanonicalHost()) return;
    bootstrap();
    // Only run once on mount — bootstrap is stable and de-duplicates internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, retry: 1 },
        mutations: { retry: 0 },
      },
    })
  );

  useEffect(() => {
    const isExtensionMetaMaskNoise = (message?: string, stack?: string, source?: string) => {
      const msg = (message ?? '').toLowerCase();
      const st = (stack ?? '').toLowerCase();
      const src = (source ?? '').toLowerCase();

      const isMetaMaskMessage = msg.includes('failed to connect to metamask');
      const isExtensionOrigin =
        src.includes('chrome-extension://') ||
        st.includes('chrome-extension://') ||
        st.includes('/inpage.js');

      return isMetaMaskMessage && isExtensionOrigin;
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as any;
      const message =
        typeof reason === 'string'
          ? reason
          : (reason?.message ?? '');
      const stack = typeof reason === 'object' ? (reason?.stack ?? '') : '';
      if (isExtensionMetaMaskNoise(message, stack, '')) {
        event.preventDefault();
      }
    };

    const onError = (event: ErrorEvent) => {
      if (isExtensionMetaMaskNoise(event.message, event.error?.stack, event.filename)) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSessionValidator />
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
