import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { User } from '../types/api';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dm_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await api<User>('/auth/me', { token });
        setUser(me);
      } catch {
        localStorage.removeItem('dm_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login: async (loginValue, password) => {
        const result = await api<{ accessToken: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ login: loginValue, password }),
        });
        localStorage.setItem('dm_token', result.accessToken);
        setToken(result.accessToken);
        setUser(result.user);
      },
      logout: () => {
        localStorage.removeItem('dm_token');
        setToken(null);
        setUser(null);
      },
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthContext nicht gefunden');
  return context;
}
