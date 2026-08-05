import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SymbolSpecPayload } from '@/lib/pnl-preview';

/**
 * Contract specifications used by the P&L preview.
 *
 * Static reference data — fetched once per session and reused, so typing in the
 * trade form never triggers a request.
 */
export function useSymbolSpecs() {
  return useQuery<SymbolSpecPayload>({
    queryKey: ['symbol-specs'],
    queryFn: () => api.get('/symbol-specs').then((r) => r.data),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}
