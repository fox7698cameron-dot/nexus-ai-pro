/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Auth Context — centralized authentication state
 * Handles JWT, refresh, MFA, biometrics, role-based routing
 * Date: 2026-08-09
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'nexus:access_token';
const REFRESH_KEY = 'nexus:refresh_token';
const USER_KEY = 'nexus:user';

/** Strip PII from logs — only log non-sensitive fields */
function safeUser(user) {
  if (!user) return null;
  const { email, passwordHash, ...safe } = user;
  return { ...safe, email: email ? `${email.slice(0, 3)}***` : undefined };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const refreshTimer = useRef(null);

  // ── Token helpers ──────────────────────────────────────────────────────────

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  function setTokens(accessToken, refreshToken, persist = false) {
    const store = persist ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) store.setItem(REFRESH_KEY, refreshToken);
  }

  function clearTokens() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function parseToken(token) {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }

  // ── Auto-refresh token 2 minutes before expiry ─────────────────────────────

  function scheduleRefresh(accessToken) {
    const decoded = parseToken(accessToken);
    if (!decoded?.exp) return;
    const msUntilExpiry = decoded.exp * 1000 - Date.now();
    const refreshAt = msUntilExpiry - 2 * 60 * 1000;

    if (refreshAt <= 0) {
      // Already expired or about to — refresh now
      refreshAccessToken();
      return;
    }

    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refreshAccessToken, refreshAt);
  }

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) { logout(); return; }

    try {
      const resp = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!resp.ok) throw new Error('Refresh failed');
      const { accessToken } = await resp.json();
      const store = localStorage.getItem(REFRESH_KEY) ? localStorage : sessionStorage;
      store.setItem(TOKEN_KEY, accessToken);
      scheduleRefresh(accessToken);
    } catch {
      logout();
    }
  }, []);

  // ── Initialization — restore session ──────────────────────────────────────

  useEffect(() => {
    const token = getToken();
    const storedUser = localStorage.getItem(USER_KEY);

    if (token && storedUser) {
      try {
        const decoded = parseToken(token);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          setUser(JSON.parse(storedUser));
          scheduleRefresh(token);
        } else {
          clearTokens();
        }
      } catch {
        clearTokens();
      }
    }

    setLoading(false);
    return () => clearTimeout(refreshTimer.current);
  }, []);

  // ── API helper with auth header ────────────────────────────────────────────

  async function authFetch(url, opts = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    };
    const resp = await fetch(url, { ...opts, headers });
    if (resp.status === 401) {
      await refreshAccessToken();
      const newToken = getToken();
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      return fetch(url, { ...opts, headers: retryHeaders });
    }
    return resp;
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (email, password, options = {}) => {
    setAuthError(null);
    const { mfaToken, rememberMe = false } = options;

    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, mfaToken }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      if (data.mfaRequired) {
        setMfaRequired(true);
        setPendingUserId(data.userId);
        return { mfaRequired: true };
      }
      setAuthError(data.error || 'Login failed');
      return { error: data.error };
    }

    setMfaRequired(false);
    setPendingUserId(null);
    setTokens(data.accessToken, data.refreshToken, rememberMe);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    scheduleRefresh(data.accessToken);
    return { success: true, dashboardRoute: data.dashboardRoute };
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────

  const register = useCallback(async (payload) => {
    setAuthError(null);
    const resp = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (!resp.ok) {
      setAuthError(data.error || 'Registration failed');
      return { error: data.error, details: data.details };
    }

    setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    scheduleRefresh(data.accessToken);
    return { success: true, dashboardRoute: data.dashboardRoute };
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    const token = getToken();
    const refreshToken = sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY);

    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch { /* ignore logout errors */ }

    clearTimeout(refreshTimer.current);
    clearTokens();
    setUser(null);
    setMfaRequired(false);
    setPendingUserId(null);
    setAuthError(null);
  }, []);

  // ── MFA ────────────────────────────────────────────────────────────────────

  const setupMFA = useCallback(async () => {
    const resp = await authFetch('/api/auth/mfa/setup', { method: 'POST' });
    return resp.json();
  }, [authFetch]);

  const verifyMFA = useCallback(async (token) => {
    const resp = await authFetch('/api/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    const data = await resp.json();
    if (resp.ok && user) {
      const updated = { ...user, mfaEnabled: true };
      setUser(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
    return data;
  }, [authFetch, user]);

  // ── Biometric registration ─────────────────────────────────────────────────

  const registerBiometric = useCallback(async (type, credentialId) => {
    const resp = await authFetch('/api/auth/biometric/register', {
      method: 'POST',
      body: JSON.stringify({ type, credentialId }),
    });
    const data = await resp.json();
    if (resp.ok && user) {
      const updated = { ...user, biometricEnabled: true, biometricType: type };
      setUser(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
    return data;
  }, [authFetch, user]);

  // ── Change password ────────────────────────────────────────────────────────

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const resp = await authFetch('/api/auth/password/change', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return resp.json();
  }, [authFetch]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const isAuthenticated = !!user && !!getToken();
  const role = user?.role ?? null;
  const isAdmin = role === 'admin';
  const isDev = role === 'dev' || role === 'admin';
  const isModerator = ['admin', 'dev', 'moderator'].includes(role);

  const value = {
    user,
    loading,
    authError,
    mfaRequired,
    pendingUserId,
    isAuthenticated,
    role,
    isAdmin,
    isDev,
    isModerator,
    login,
    logout,
    register,
    setupMFA,
    verifyMFA,
    registerBiometric,
    changePassword,
    authFetch,
    getToken,
    clearAuthError: () => setAuthError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
