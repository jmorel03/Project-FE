import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, attempt a silent token refresh using the httpOnly cookie.
    // If the cookie is valid the server rotates it and returns a new access token.
    authService.silentRefresh()
      .then(({ accessToken }) => {
        setAccessToken(accessToken);
        return authService.getMe();
      })
      .then(setUser)
      .catch(() => {
        // No valid session — that's fine, user will see login page.
        setAccessToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    setAccessToken(data.accessToken);
    const me = await authService.getMe();
    setUser(me);
    return { ...data, user: me };
  }, []);

  const register = useCallback(async (credentials) => {
    const data = await authService.register(credentials);
    setAccessToken(data.accessToken);
    const me = await authService.getMe();
    setUser(me);
    return { ...data, user: me };
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch { /* clear client state regardless */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
