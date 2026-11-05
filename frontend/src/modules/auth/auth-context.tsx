import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiService } from '@/shared/services/api.service';
import { storageService } from '@/shared/services/storage.service';
import { authService } from './auth.service';
import type { LoginPayload, SessionUser } from './auth.types';

interface AuthApi {
  user: SessionUser | null;
  /** manages masters and sees every client and product */
  isSuperAdmin: boolean;
  /** admin or super admin: can reopen closed tickets */
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<SessionUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() =>
    storageService.getToken() ? storageService.getUser<SessionUser>() : null,
  );

  const logout = useCallback(() => {
    storageService.clear();
    setUser(null);
  }, []);

  // Any 401 from the API signs the user out.
  useEffect(() => {
    apiService.setUnauthorizedHandler(() => setUser(null));
    return () => apiService.setUnauthorizedHandler(null);
  }, []);

  // Refresh the stored profile (role or name may have changed).
  useEffect(() => {
    if (!storageService.getToken()) return;
    authService
      .me()
      .then((me) => {
        const fresh = { id: me.id, name: me.name, email: me.email, role: me.role };
        storageService.setUser(fresh);
        setUser(fresh);
      })
      .catch(() => undefined);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    storageService.setToken(res.accessToken);
    storageService.setUser(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      isSuperAdmin: user?.role === 'super_admin',
      isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
