// 2026-07-20
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import authService from './authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = authService.getUser();
    if (stored) {
      setUser(stored);
      authService.getMe().then((serverUser) => {
        if (serverUser) {
          setUser(serverUser);
        } else {
          authService.clearSession();
          setUser(null);
        }
      }).catch(() => {
        authService.clearSession();
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password, mfaCode = null) => {
    const data = await authService.login(email, password, mfaCode);
    const currentUser = authService.getUser();
    setUser(currentUser);
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const data = await authService.register(userData);
    const currentUser = authService.getUser();
    setUser(currentUser);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const isAuthenticated = useCallback(() => {
    return authService.isAuthenticated();
  }, []);

  const hasRole = useCallback((role) => {
    return authService.hasRole(role);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, isAuthenticated, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default useAuth;
