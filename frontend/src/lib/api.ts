import axios from 'axios';

function normalizeBaseUrl(raw?: string) {
  const value = (raw ?? '').trim();
  const unquoted = value.replace(/^['"]|['"]$/g, '');
  return unquoted.replace(/\/+$/, '');
}

const primaryBaseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
);

const localhostFallbackBaseUrl = primaryBaseUrl.includes('://localhost:')
  ? primaryBaseUrl.replace('://localhost:', '://127.0.0.1:')
  : null;

export const api = axios.create({
  baseURL: primaryBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('tradejournal-auth');
    if (!raw) return config;
    try {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let queue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = String(original?.url ?? '');

    // Never try to refresh a failed refresh request; that causes a deadlock.
    if (url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Network-level failure (no HTTP response). Retry once via localhost fallback.
    if (!error.response && original && !original._baseRetry && localhostFallbackBaseUrl) {
      original._baseRetry = true;
      original.baseURL = localhostFallbackBaseUrl;
      return api(original);
    }

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      try {
        // Lazy import to avoid circular
        const { useAuthStore } = await import('./auth');
        const newToken = await useAuthStore.getState().refreshAccessToken();
        if (newToken) {
          queue.forEach(({ resolve }) => resolve(newToken));
          queue = [];
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
        // Refresh failed without throwing. Reject queued requests so they don't hang.
        queue.forEach(({ reject }) => reject(error));
        queue = [];
      } catch (refreshError) {
        // Refresh threw; reject queued requests so they don't hang.
        queue.forEach(({ reject }) => reject(refreshError));
        queue = [];
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
