// File: AuthContext.jsx | Date: 2026-06-16 | Nexus AI Pro
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);

  // JWT stored in memory only (not localStorage) for security
  const accessTokenRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const scheduleTokenRefresh = useCallback(() => {
    clearRefreshTimer();
    // Refresh every 14 minutes (tokens typically expire at 15 min)
    refreshTimerRef.current = setTimeout(() => {
      refreshToken();
    }, 14 * 60 * 1000);
  }, []);

  const setAuthState = useCallback((userData, token) => {
    accessTokenRef.current = token;
    setUser(userData);
    setRole(userData?.role || null);
    setIsAuthenticated(true);
    setMfaRequired(false);
    setMfaSetupRequired(false);
    scheduleTokenRefresh();
  }, [scheduleTokenRefresh]);

  const clearAuthState = useCallback(() => {
    accessTokenRef.current = null;
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
    setMfaRequired(false);
    setMfaSetupRequired(false);
    clearRefreshTimer();
  }, []);

  // On mount, try to restore session via refresh token (httpOnly cookie)
  useEffect(() => {
    const restoreSession = async () => {
      try {
        await refreshToken();
      } catch {
        // No valid session, user needs to log in
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();

    return () => clearRefreshTimer();
  }, []);

  const refreshToken = useCallback(async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // sends httpOnly cookie
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    setAuthState(data.user, data.accessToken);
    return data.accessToken;
  }, [setAuthState]);

  const login = useCallback(async (email, password, mfaCode = null) => {
    setIsLoading(true);
    try {
      const body = { email, password };
      if (mfaCode) body.mfaCode = mfaCode;

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        return { mfaRequired: true };
      }

      if (data.mfaSetupRequired) {
        setMfaSetupRequired(true);
        accessTokenRef.current = data.accessToken;
        setUser(data.user);
        setRole(data.user?.role || null);
        return { mfaSetupRequired: true };
      }

      setAuthState(data.user, data.accessToken);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  }, [setAuthState]);

  const register = useCallback(async (registrationData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registrationData, role: 'user' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setAuthState(data.user, data.accessToken);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  }, [setAuthState]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {}),
        },
      });
    } catch {
      // Ignore errors on logout
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  const updateUser = useCallback(async (updateData) => {
    const response = await fetch('/api/auth/user', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessTokenRef.current}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Update failed');
    }

    const data = await response.json();
    setUser(data.user);
    setRole(data.user?.role || null);
    return data.user;
  }, []);

  const setupMFA = useCallback(async () => {
    const response = await fetch('/api/auth/mfa/setup', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessTokenRef.current}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'MFA setup failed');
    }

    return await response.json(); // { qrCode, secret, backupCodes }
  }, []);

  const verifyMFA = useCallback(async (code) => {
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessTokenRef.current}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'MFA verification failed');
    }

    const data = await response.json();
    if (data.accessToken) {
      setAuthState(data.user, data.accessToken);
    }
    return data;
  }, [setAuthState]);

  // Expose the access token getter for other contexts (e.g., SocketContext)
  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const value = {
    user,
    role,
    isAuthenticated,
    isLoading,
    mfaRequired,
    mfaSetupRequired,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    setupMFA,
    verifyMFA,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
