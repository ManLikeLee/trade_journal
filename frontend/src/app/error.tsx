'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-3">
        <h1 className="text-base font-medium">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The page hit an unexpected error. Try again.
        </p>
        <button
          onClick={() => reset()}
          className="ui-btn-primary"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
