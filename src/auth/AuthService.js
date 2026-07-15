/**
 * src/auth/AuthService.js
 * Nexus AI Pro — Client-Side Authentication Service
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Manages JWT storage, WebAuthn biometrics, 2FA, MFA, and role-based
 * navigation — works across web, Electron, and Capacitor (iOS/Android).
 * No secrets are ever hardcoded; all tokens come from the server.
 */

const API = '/api/auth';
const TOKEN_KEY = 'nexus:token';
const USER_KEY  = 'nexus:user';
const REFRESH_KEY = 'nexus:refresh';

// ─── Secure Storage Abstraction ───────────────────────────────────────────────

function secureSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
    // Also persist in localStorage for refresh across tabs (token only)
    if (key === TOKEN_KEY || key === REFRESH_KEY) {
      localStorage.setItem(key, value);
    }
  } catch {
    // Storage unavailable (private mode) — in-memory fallback
    AuthService._mem[key] = value;
  }
}

function secureGet(key) {
  try {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key) ?? null;
  } catch {
    return AuthService._mem[key] ?? null;
  }
}

function secureRemove(key) {
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {
    delete AuthService._mem[key];
  }
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const AuthService = {
  _mem: {},

  /** Return current JWT or null. */
  getToken() {
    return secureGet(TOKEN_KEY);
  },

  /** Return current user object or null. */
  getUser() {
    const raw = secureGet(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    // Decode expiry without verifying signature (server always re-validates)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  getRole() {
    return this.getUser()?.role ?? 'user';
  },

  isAdmin()     { return this.getRole() === 'admin'; },
  isDeveloper() { return ['admin', 'developer'].includes(this.getRole()); },
  isModerator() { return ['admin', 'developer', 'moderator'].includes(this.getRole()); },

  // ── Register ───────────────────────────────────────────────────────────────

  async register(payload) {
    const res = await this._post(`${API}/register`, payload);
    if (res.token) this._storeSession(res);
    return res;
  },

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(email, password) {
    const res = await this._post(`${API}/login`, { email, password });
    if (res.token && !res.requires2FA) this._storeSession(res);
    return res;
  },

  // ── 2FA / TOTP ─────────────────────────────────────────────────────────────

  async verify2FA(tempToken, code) {
    const res = await this._post(`${API}/2fa/verify`, { tempToken, code });
    if (res.token) this._storeSession(res);
    return res;
  },

  async setup2FA() {
    return this._get(`${API}/2fa/setup`);
  },

  async enable2FA(code) {
    return this._post(`${API}/2fa/enable`, { code });
  },

  async disable2FA(code) {
    return this._post(`${API}/2fa/disable`, { code });
  },

  // ── Biometrics (WebAuthn) ──────────────────────────────────────────────────

  async registerBiometric(type) {
    const challenge = await this._post(`${API}/biometric/challenge`, { type });

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: Uint8Array.from(atob(challenge.challenge), c => c.charCodeAt(0)),
        rp: { name: 'Nexus AI Pro', id: window.location.hostname },
        user: {
          id: Uint8Array.from(challenge.userId, c => c.charCodeAt(0)),
          name: challenge.email,
          displayName: challenge.displayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7  },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: type === 'platform' ? 'platform' : 'cross-platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    });

    return this._post(`${API}/biometric/register`, {
      credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      response: {
        attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
        clientDataJSON:    btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
      },
      type,
    });
  },

  async loginBiometric() {
    const challenge = await this._post(`${API}/biometric/auth-challenge`, {});

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: Uint8Array.from(atob(challenge.challenge), c => c.charCodeAt(0)),
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
      },
    });

    const res = await this._post(`${API}/biometric/authenticate`, {
      credentialId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
      response: {
        authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))),
        clientDataJSON:    btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))),
        signature:         btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature))),
      },
    });

    if (res.token) this._storeSession(res);
    return res;
  },

  isBiometricAvailable() {
    return typeof window !== 'undefined' &&
           'credentials' in navigator &&
           typeof PublicKeyCredential !== 'undefined';
  },

  // ── Password reset ─────────────────────────────────────────────────────────

  async requestPasswordReset(email) {
    return this._post(`${API}/reset-request`, { email });
  },

  async confirmPasswordReset(token, newPassword) {
    return this._post(`${API}/reset-confirm`, { token, newPassword });
  },

  // ── Refresh token ──────────────────────────────────────────────────────────

  async refreshToken() {
    const refresh = secureGet(REFRESH_KEY);
    if (!refresh) return null;
    const res = await this._post(`${API}/refresh`, { refresh });
    if (res.token) this._storeSession(res);
    return res;
  },

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout() {
    try { await this._post(`${API}/logout`, {}); } catch { /* ignore */ }
    secureRemove(TOKEN_KEY);
    secureRemove(REFRESH_KEY);
    secureRemove(USER_KEY);
  },

  // ── Internals ──────────────────────────────────────────────────────────────

  _storeSession(res) {
    if (res.token)   secureSet(TOKEN_KEY,   res.token);
    if (res.refresh) secureSet(REFRESH_KEY, res.refresh);
    if (res.user)    secureSet(USER_KEY,    JSON.stringify(res.user));
  },

  _authHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async _post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: this._authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  async _get(url) {
    const res = await fetch(url, { headers: this._authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
};

export default AuthService;
