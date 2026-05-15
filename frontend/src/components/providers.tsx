'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { useAuthStore } from '@/lib/auth';

/**
 * Runs validateSession() once on app mount.
 * This sets checkingAuth:false so the login page can render the form
 * (or redirect if the session is still valid).
 */
function AuthSessionValidator() {
  const validateSession = useAuthStore((s) => s.validateSession);
  useEffect(() => {
    validateSession();
    // Only run once on mount — validateSession is stable
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
