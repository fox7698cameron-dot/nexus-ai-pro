// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'nexus:token';

// sessionStorage over localStorage: token is cleared when tab/browser closes,
// reducing the window for XSS-based token theft. httpOnly cookies require
// server-side session management; sessionStorage is the next-best SPA option.
const storage = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (v) => sessionStorage.setItem(TOKEN_KEY, v),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(user && token);

  const applyToken = (tok) => {
    storage.set(tok);
    setToken(tok);
  };

  const clearAuth = () => {
    storage.clear();
    setToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(async (tok) => {
    const stored = tok ?? storage.get();
    if (!stored) return;
    const data = await apiFetch('/api/auth/profile', {
      headers: { Authorization: `Bearer ${stored}` },
    });
    setToken(stored);
    setUser(data.user ?? data);
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => clearAuth())
      .finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    applyToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    const stored = storage.get();
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: stored ? { Authorization: `Bearer ${stored}` } : {},
      });
    } catch (_) {}
    clearAuth();
  };

  const register = async (data) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      applyToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const hasRole = (...roles) => roles.includes(user?.role);
  const hasTier = (...tiers) => tiers.includes(user?.tier);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, isLoading, login, logout, register, refreshUser, hasRole, hasTier }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
