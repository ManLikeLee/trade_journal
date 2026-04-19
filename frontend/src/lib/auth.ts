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
          alert('[login] start: ' + email);
          console.log('[login] start', { email });
          const { data } = await api.post('/auth/login', { email, password });
          alert('[login] got tokens: ' + JSON.stringify(data));
          console.log('[login] got tokens', data);
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          });
          // Set refresh token cookie for SSR/middleware
          if (typeof window !== 'undefined') {
            document.cookie = `tj-auth=${data.refreshToken}; path=/; SameSite=Lax`;
          }
          alert('[login] fetching /users/me');
          console.log('[login] fetching /users/me');
          const me = await api.get('/users/me', {
            headers: { Authorization: `Bearer ${data.accessToken}` },
            timeout: 5000,
          });
          alert('[login] got user: ' + JSON.stringify(me.data));
          console.log('[login] got user', me.data);
          set({ user: me.data });
        } catch (e) {
          alert('AuthStore login error: ' + (e?.message || e));
          console.error('AuthStore login error:', e);
          throw e;
        }
      },

      register: async (email, password, name) => {
        const { data } = await api.post('/auth/register', { email, password, name });
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
        // Set refresh token cookie for SSR/middleware
        if (typeof window !== 'undefined') {
          document.cookie = `tj-auth=${data.refreshToken}; path=/; SameSite=Lax`;
        }
        const me = await api.get('/users/me', {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        set({ user: me.data });
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } finally {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          // Remove refresh token cookie
          if (typeof window !== 'undefined') {
            document.cookie = 'tj-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
          return data.accessToken;
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          return null;
        }
      },
    }),
    { name: 'tradejournal-auth', partialize: (s) => ({ refreshToken: s.refreshToken, user: s.user }) }
  )
);
