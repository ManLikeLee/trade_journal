'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-3">
          <h1 className="text-base font-medium">Application error</h1>
          <p className="text-sm text-muted-foreground">
            A critical error occurred while rendering this page.
          </p>
          <button onClick={() => reset()} className="ui-btn-primary">
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
