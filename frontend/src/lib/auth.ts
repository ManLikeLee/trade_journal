import { create } from 'zustand';
import { api } from './api';
import { setAccessToken, markSessionActive, markSessionEnded } from './access-token';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TOKEN HANDLING
 *
 * The refresh token is NOT here, and must never be. It lives in an httpOnly
 * cookie set by the API (see backend/src/utils/cookies.ts), so no JavaScript on
 * this page — including anything injected by an XSS — can read it. It used to
 * be written to localStorage *and* a JS-readable cookie, which made a single
 * XSS a 30-day account takeover.
 *
 * The access token is held in memory only. It is deliberately not persisted:
 * a page reload discards it and the session is restored by a silent refresh
 * against the cookie. Nothing about the session survives in storage a script
 * can reach.
 *
 * Consequence to keep in mind: on a cold load `accessToken` is null and
 * `checkingAuth` is true until `bootstrap()` resolves. UI must wait on
 * `checkingAuth` rather than assuming a null token means logged out.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  /** In memory only. Never persisted. */
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True until the initial silent refresh resolves on app mount. */
  checkingAuth: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  /** Restore a session from the refresh cookie once on app mount. */
  bootstrap: () => Promise<void>;
}

/**
 * Remove credentials left by the previous storage model.
 *
 * Without this, a token issued before the cookie migration sits in localStorage
 * for its full 30-day life, readable by any script — the exact exposure this
 * change removes. The old `tj-auth` cookie is cleared for the same reason.
 */
function purgeLegacyCredentials() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('tradejournal-auth');
  } catch {
    /* storage disabled — nothing to purge */
  }
  document.cookie = 'tj-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}

/**
 * A single in-flight refresh, shared by every caller.
 *
 * Refreshing rotates the token server-side, so two concurrent refreshes mean the
 * second presents a token the first already consumed — a 401, and a spurious
 * logout. React StrictMode double-invokes effects in development, so the mount
 * bootstrap alone would trigger exactly that on every page load without this.
 */
let inFlightRefresh: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  checkingAuth: true,

  login: async (email, password) => {
    // The API sets the refresh cookie; the body carries the access token and user.
    const { data } = await api.post('/auth/login', { email, password });
    purgeLegacyCredentials();
    setAccessToken(data.accessToken);
    markSessionActive();
    set({
      accessToken: data.accessToken,
      user: data.user ?? null,
      isAuthenticated: true,
      checkingAuth: false,
    });
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    purgeLegacyCredentials();
    setAccessToken(data.accessToken);
    markSessionActive();
    set({
      accessToken: data.accessToken,
      user: data.user ?? null,
      isAuthenticated: true,
      checkingAuth: false,
    });
  },

  logout: async () => {
    try {
      // No body: the API reads the cookie and clears it server-side.
      await api.post('/auth/logout');
    } finally {
      purgeLegacyCredentials();
      setAccessToken(null);
      // Stops every in-flight and subsequent request from trying to refresh a
      // session we just destroyed.
      markSessionEnded();
      set({ user: null, accessToken: null, isAuthenticated: false, checkingAuth: false });
    }
  },

  refreshAccessToken: async () => {
    if (inFlightRefresh) return inFlightRefresh;

    inFlightRefresh = (async () => {
      try {
        // No body: the refresh token travels as an httpOnly cookie.
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        markSessionActive();
        set({
          accessToken: data.accessToken,
          user: data.user ?? null,
          isAuthenticated: true,
        });
        return data.accessToken as string;
      } catch {
        setAccessToken(null);
        markSessionEnded();
        set({ user: null, accessToken: null, isAuthenticated: false });
        return null;
      } finally {
        inFlightRefresh = null;
      }
    })();

    return inFlightRefresh;
  },

  bootstrap: async () => {
    purgeLegacyCredentials();
    // Deliberately goes through refreshAccessToken so it shares the in-flight
    // singleton above. StrictMode invokes the mount effect twice in development;
    // without that sharing the second call would present an already-rotated
    // token, 401, and log the user out on every page load.
    // A null result is not an error — it is every logged-out visit.
    await useAuthStore.getState().refreshAccessToken();
    set({ checkingAuth: false });
  },
}));
