/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Auth session context: token storage, current user, login/register/logout.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'nexus:authToken';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setStatus('unauthenticated');
      return;
    }
    (async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${stored}` }
        });
        if (!response.ok) throw new Error('Invalid session');
        const data = await response.json();
        setUser(data.user);
        setToken(stored);
        setStatus('authenticated');
      } catch (sessionError) {
        console.error('Session restore failed:', sessionError);
        window.localStorage.removeItem(TOKEN_KEY);
        setStatus('unauthenticated');
      }
    })();
  }, []);

  // Stores the issued session token/user. Only ever called with a response
  // that actually contains a token — never with an MFA-pending response.
  const finalizeAuth = useCallback((data) => {
    window.localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setToken(data.token);
    setStatus('authenticated');
    setError(null);
    return { ok: true };
  }, []);

  const handleAuthResponse = useCallback(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error || 'Something went wrong. Please try again.';
      setError(message);
      return { ok: false, error: message, errors: data.errors };
    }
    if (data.mfaRequired) {
      setError(null);
      return { ok: true, mfaRequired: true, challengeToken: data.challengeToken };
    }
    return finalizeAuth(data);
  }, [finalizeAuth]);

  const login = useCallback(async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleAuthResponse(response);
  }, [handleAuthResponse]);

  const register = useCallback(async (email, password, displayName) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    return handleAuthResponse(response);
  }, [handleAuthResponse]);

  const completeMfaChallenge = useCallback(async (challengeToken, code) => {
    const response = await fetch('/api/auth/mfa/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken, code })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error || 'Invalid authentication code.';
      setError(message);
      return { ok: false, error: message };
    }
    return finalizeAuth(data);
  }, [finalizeAuth]);

  const authHeaders = useCallback(() => (
    token ? { Authorization: `Bearer ${token}` } : {}
  ), [token]);

  const startMfaSetup = useCallback(async () => {
    const response = await fetch('/api/auth/mfa/setup', { method: 'POST', headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || 'Could not start MFA setup.' };
    return { ok: true, ...data };
  }, [authHeaders]);

  const confirmMfaSetup = useCallback(async (code) => {
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ code })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || 'Invalid authentication code.' };
    setUser((prev) => (prev ? { ...prev, mfaEnabled: true } : prev));
    return { ok: true, backupCodes: data.backupCodes };
  }, [authHeaders]);

  const disableMfa = useCallback(async (password, code) => {
    const response = await fetch('/api/auth/mfa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ password, code })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || 'Could not disable MFA.' };
    setUser((prev) => (prev ? { ...prev, mfaEnabled: false } : prev));
    return { ok: true };
  }, [authHeaders]);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, status, error, login, register, logout,
      completeMfaChallenge, startMfaSetup, confirmMfaSetup, disableMfa
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
