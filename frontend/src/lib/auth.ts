import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  refreshAccessToken: () => Promise<string | null>;
}

function setAuthCookie(refreshToken: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `tj-auth=${encodeURIComponent(refreshToken)}; path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

function clearAuthCookie() {
  if (typeof window === 'undefined') return;
  document.cookie = 'tj-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}

function fallbackUserFromToken(accessToken: string): User | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    if (!decoded?.sub || !decoded?.email) return null;
    return { id: decoded.sub, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      login: async (email, password) => {
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const fallbackUser = fallbackUserFromToken(data.accessToken);
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            user: fallbackUser,
          });
          setAuthCookie(data.refreshToken);

          // Populate canonical profile data, but don't fail login if this call flakes.
          try {
            const me = await api.get('/users/me', {
              headers: { Authorization: `Bearer ${data.accessToken}` },
              timeout: 8000,
            });
            set({ user: me.data });
          } catch (profileError) {
            console.warn('Profile fetch after login failed; continuing with token identity.', profileError);
          }
        } catch (e) {
          console.error('AuthStore login error:', e);
          throw e;
        }
      },

      register: async (email, password, name) => {
        const { data } = await api.post('/auth/register', { email, password, name });
        const fallbackUser = fallbackUserFromToken(data.accessToken);
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          user: fallbackUser,
        });
        setAuthCookie(data.refreshToken);
        try {
          const me = await api.get('/users/me', {
            headers: { Authorization: `Bearer ${data.accessToken}` },
            timeout: 8000,
          });
          set({ user: me.data });
        } catch (profileError) {
          console.warn('Profile fetch after registration failed; continuing with token identity.', profileError);
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } finally {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          clearAuthCookie();
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
          setAuthCookie(data.refreshToken);
          return data.accessToken;
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          clearAuthCookie();
          return null;
        }
      },
    }),
    {
      name: 'tradejournal-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);
