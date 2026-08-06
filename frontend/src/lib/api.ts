import axios from 'axios';
import { getAccessToken, isSessionEnded } from './access-token';

function normalizeBaseUrl(raw?: string) {
  const value = (raw ?? '').trim();
  const unquoted = value.replace(/^['"]|['"]$/g, '');
  return unquoted.replace(/\/+$/, '');
}

const primaryBaseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000/api',
);

export const api = axios.create({
  baseURL: primaryBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  // Required for the httpOnly refresh cookie to be sent with /auth/refresh and
  // /auth/logout. The API sets Access-Control-Allow-Credentials and names the
  // origin explicitly, which credentialed CORS requires.
  //
  // ⚠️ The cookie is SameSite=Strict, so the browser only attaches it when the
  // page and the API are the same *site*. Serve the app from 127.0.0.1:3000
  // while the API is on 127.0.0.1:5000 and they match; open it on
  // localhost:3000 and every refresh silently 401s. middleware.ts redirects to
  // the canonical host to stop that happening by accident.
  withCredentials: true,
});

// Attach access token to every request
/**
 * Attach the access token, waiting for the session to be restored if necessary.
 *
 * The token is memory-only, so on a cold load there is a window where it does
 * not exist yet. Firing regardless produced a 401 that the response interceptor
 * then had to recover — visible as `GET /api/accounts 401` from the Sidebar,
 * which renders outside the dashboard's checkingAuth gate.
 *
 * Waiting here fixes it for *every* caller rather than per component: anything
 * mounted before bootstrap finishes simply joins the in-flight refresh. That
 * refresh is a shared singleton, so this costs one request no matter how many
 * queries are waiting.
 */
api.interceptors.request.use(async (config) => {
  const url = String(config.url ?? '');

  // Auth endpoints carry the cookie, not a bearer token. Skipping them also
  // prevents recursion: refreshAccessToken() calls POST /auth/refresh.
  if (url.includes('/auth/')) return config;

  let token = getAccessToken();
  if (!token) {
    // Signed out, or a refresh already failed: fail fast rather than firing a
    // request we know will 401 and a refresh we know will fail. Without this,
    // logging out produced a burst of 401s as every mounted query refetched.
    if (isSessionEnded()) {
      throw new axios.CanceledError('No active session');
    }
    // Lazy import: auth.ts imports this module, so a static import is circular.
    const { useAuthStore } = await import('./auth');
    token = await useAuthStore.getState().refreshAccessToken();
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
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
    // /auth/logout is excluded for the same reason — a 401 there is terminal.
    if (url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return Promise.reject(error);
    }

    // Nothing to recover with once the session is known to be gone.
    if (isSessionEnded()) return Promise.reject(error);

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
