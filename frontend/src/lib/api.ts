import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Dynamic import to avoid circular dep
    const raw = localStorage.getItem('tradejournal-auth');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.accessToken;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch {}
    }
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        // Lazy import to avoid circular
        const { useAuthStore } = await import('./auth');
        const newToken = await useAuthStore.getState().refreshAccessToken();
        if (newToken) {
          queue.forEach((cb) => cb(newToken));
          queue = [];
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
