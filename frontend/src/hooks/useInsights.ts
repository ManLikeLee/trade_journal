// hooks/useInsights.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useInsights(accountId?: string) {
  return useQuery({
    queryKey: ['analytics', 'insights', accountId],
    queryFn: () =>
      api.get('/analytics/insights', { params: accountId ? { accountId } : {} })
        .then(r => r.data),
  });
}
