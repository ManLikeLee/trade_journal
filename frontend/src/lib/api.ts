import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
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
