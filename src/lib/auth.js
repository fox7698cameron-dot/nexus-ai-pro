/**
 * src/lib/auth.js
 * Nexus AI Pro - Authentication utilities (client-side)
 * Created: 2026-07-26
 */

export const AUTH_ROLES = {
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
};

export const AUTH_STORAGE_KEY = 'nexus:auth';
export const TOKEN_KEY = 'nexus:token';
export const REFRESH_KEY = 'nexus:refresh';

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAuth(user, token, refresh) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  const auth = getStoredAuth();
  const token = getToken();
  return !!(auth && token);
}

export function hasRole(requiredRole) {
  const auth = getStoredAuth();
  if (!auth) return false;
  const roleHierarchy = [AUTH_ROLES.USER, AUTH_ROLES.MODERATOR, AUTH_ROLES.DEV, AUTH_ROLES.ADMIN];
  const userIdx = roleHierarchy.indexOf(auth.role);
  const reqIdx = roleHierarchy.indexOf(requiredRole);
  return userIdx >= reqIdx;
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Password strength validator — 13+ chars, mixed case, digits, special chars
export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 13) errors.push('At least 13 characters required');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character (!@#$%^&* etc.)');
  return { valid: errors.length === 0, errors };
}

// Username validator — supports unicode, emoji, special chars, 2-32 chars
export function validateUsername(username) {
  if (!username) return { valid: false, error: 'Username required' };
  const trimmed = username.trim();
  if (trimmed.length < 2) return { valid: false, error: 'Username must be at least 2 characters' };
  if (trimmed.length > 32) return { valid: false, error: 'Username must be 32 characters or fewer' };
  // Block control chars and null bytes only
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return { valid: false, error: 'Username contains invalid characters' };
  return { valid: true, error: null };
}

export async function apiFetch(path, options = {}) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
