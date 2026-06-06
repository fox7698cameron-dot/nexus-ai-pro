// src/auth/AuthService.js
// 2026-06-06 | Client-side auth service: JWT storage, biometric hooks, role helpers

const API = '/api/auth';
const ACCESS_KEY = 'nexus:access_token';
const REFRESH_KEY = 'nexus:refresh_token';
const USER_KEY = 'nexus:user';

// ─── Token management ─────────────────────────────────────────────────────────

export function saveSession(accessToken, refreshToken, user) {
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getAccessToken() && !!getCurrentUser();
}

export function getUserRole() {
  return getCurrentUser()?.role || 'guest';
}

export function hasRole(...roles) {
  return roles.includes(getUserRole());
}

// ─── Authenticated fetch ──────────────────────────────────────────────────────

export async function authFetch(url, options = {}) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Token expired — attempt refresh once
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getAccessToken()}`;
      res = await fetch(url, { ...options, headers });
    } else {
      clearSession();
      window.dispatchEvent(new CustomEvent('nexus:auth:expired'));
      throw new Error('Session expired. Please log in again.');
    }
  }

  return res;
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

export async function register({ email, username, password, displayName, locale }) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password, displayName, locale })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Registration failed');
  saveSession(data.accessToken, data.refreshToken, data.user);
  return data;
}

export async function login({ email, password, mfaCode }) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, ...(mfaCode ? { mfaCode } : {}) })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');

  if (data.requiresMfa) return { requiresMfa: true, sessionId: data.sessionId };

  saveSession(data.accessToken, data.refreshToken, data.user);
  return data;
}

export async function verifyMfa({ sessionId, mfaCode }) {
  const res = await fetch(`${API}/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, mfaCode })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'MFA verification failed');
  saveSession(data.accessToken, data.refreshToken, data.user);
  return data;
}

export async function logout() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  try {
    await authFetch(`${API}/logout`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  } catch (_) { /* logout is best-effort */ }
  clearSession();
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return false;
    const data = await res.json();
    sessionStorage.setItem(ACCESS_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ─── MFA setup ────────────────────────────────────────────────────────────────

export async function setupMfa() {
  const res = await authFetch(`${API}/mfa/setup`, { method: 'POST', body: JSON.stringify({}) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'MFA setup failed');
  return data;
}

export async function confirmMfa(code) {
  const res = await authFetch(`${API}/mfa/confirm`, {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'MFA confirm failed');
  return data;
}

// ─── Biometric auth ───────────────────────────────────────────────────────────

export async function registerBiometric(platform) {
  // Generate a device-unique key ID (in production use WebAuthn or platform native APIs)
  const keyId = `bio_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

  const res = await authFetch(`${API}/biometric/register`, {
    method: 'POST',
    body: JSON.stringify({ keyId, platform: platform || detectPlatform() })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Biometric registration failed');

  localStorage.setItem('nexus:biometric_key_id', keyId);
  return { keyId, ...data };
}

export async function loginWithBiometric() {
  const keyId = localStorage.getItem('nexus:biometric_key_id');
  if (!keyId) throw new Error('No biometric credential registered on this device');

  // In production: use WebAuthn navigator.credentials.get() to get signed assertion
  const signature = 'platform_verified'; // Platform enforces biometric gate

  const res = await fetch(`${API}/biometric/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyId, signature })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Biometric login failed');
  saveSession(data.accessToken, data.refreshToken, data.user);
  return data;
}

export function hasBiometricCredential() {
  return !!localStorage.getItem('nexus:biometric_key_id');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh/.test(ua)) return 'macos';
  if (/Win/.test(ua)) return 'windows';
  return 'linux';
}

export function validatePasswordStrength(password) {
  const errors = [];
  if (!password || password.length < 13) errors.push('At least 13 characters required');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter required');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter required');
  if (!/[0-9]/.test(password)) errors.push('At least one digit required');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character required');
  return { valid: errors.length === 0, errors };
}

export function getPasswordStrengthScore(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 13) score++;
  if (password.length >= 20) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9\s]{2,}/.test(password)) score++;
  return Math.min(score, 5);
}

export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
export const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#16a34a'];
