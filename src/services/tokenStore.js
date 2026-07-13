// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/services/tokenStore.js
// Token management: refresh tokens, password-reset tokens, MFA pending sessions.
// All stores are in-memory Maps designed to be swapped for Redis in production.

import crypto from 'crypto';

const isDev = process.env.NODE_ENV !== 'production';

// ─── TTL constants ──────────────────────────────────────────────────────────────
const REFRESH_TOKEN_TTL_MS = 7  * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL_MS   = 1  * 60 * 60 * 1000;       // 1 hour
const MFA_SESSION_TTL_MS   = 5  * 60 * 1000;             // 5 minutes

// ─── Internal stores ────────────────────────────────────────────────────────────
// refreshToken (hex string) → { userId, issuedAt, expiresAt }
const _refreshTokens = new Map();

// sha256(rawToken) → { userId, expiresAt }
const _resetTokens = new Map();

// sessionToken (hex string) → { userId, expiresAt }
const _mfaSessions = new Map();

// ─── Internal helper ────────────────────────────────────────────────────────────
/**
 * Retrieve an unexpired entry from a Map; delete and return null if expired.
 */
function _getValid(store, key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry;
}

// ─── Refresh tokens ─────────────────────────────────────────────────────────────

/**
 * Generate a new cryptographically-random refresh token, persist it, and return it.
 * @param {string} userId
 * @returns {string} The raw refresh token to return to the client.
 */
export function addRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  _refreshTokens.set(token, {
    userId,
    issuedAt:  Date.now(),
    expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
  });
  return token;
}

/** @param {string} token @returns {boolean} */
export function hasRefreshToken(token) {
  return _getValid(_refreshTokens, token) !== null;
}

/**
 * @param {string} token
 * @returns {{ userId: string, issuedAt: number, expiresAt: number } | null}
 */
export function getRefreshToken(token) {
  return _getValid(_refreshTokens, token);
}

/** @param {string} token */
export function removeRefreshToken(token) {
  _refreshTokens.delete(token);
}

/**
 * Revoke every refresh token belonging to a user (e.g. on password change).
 * @param {string} userId
 */
export function removeAllUserRefreshTokens(userId) {
  for (const [token, entry] of _refreshTokens) {
    if (entry.userId === userId) _refreshTokens.delete(token);
  }
}

// ─── Password-reset tokens ──────────────────────────────────────────────────────

/**
 * Generate a one-time password-reset token valid for `ttlMs` milliseconds.
 * The raw token is returned to the caller (to be sent to the user); only its
 * SHA-256 hash is stored so a DB leak cannot be used to reset passwords.
 *
 * @param {string} userId
 * @param {number} [ttlMs]
 * @returns {string} Raw (unhashed) token to deliver to the user.
 */
export function addResetToken(userId, ttlMs = RESET_TOKEN_TTL_MS) {
  const raw    = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  _resetTokens.set(hashed, { userId, expiresAt: Date.now() + ttlMs });
  return raw;
}

/**
 * Look up the metadata for a raw (unhashed) reset token.
 * @param {string} rawToken
 * @returns {{ userId: string, expiresAt: number } | null}
 */
export function getResetToken(rawToken) {
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  return _getValid(_resetTokens, hashed);
}

/**
 * Consume (delete) a reset token after successful use.
 * @param {string} rawToken
 */
export function removeResetToken(rawToken) {
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  _resetTokens.delete(hashed);
}

// ─── MFA pending sessions ────────────────────────────────────────────────────────
// Bridges a successful password-check with a subsequent MFA verification step.

/**
 * Create a short-lived session token returned to the client after a successful
 * credential check when 2FA is required.
 * @param {string} userId
 * @returns {string} Opaque session token to include in /mfa/verify requests.
 */
export function addMfaSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  _mfaSessions.set(token, { userId, expiresAt: Date.now() + MFA_SESSION_TTL_MS });
  return token;
}

/**
 * @param {string} token
 * @returns {{ userId: string, expiresAt: number } | null}
 */
export function getMfaSession(token) {
  return _getValid(_mfaSessions, token);
}

/** @param {string} token */
export function removeMfaSession(token) {
  _mfaSessions.delete(token);
}

// ─── Maintenance ─────────────────────────────────────────────────────────────────

/** Remove all expired entries from every store. Safe to call at any time. */
export function cleanupExpired() {
  const now = Date.now();
  for (const [k, v] of _refreshTokens) {
    if (now > v.expiresAt) _refreshTokens.delete(k);
  }
  for (const [k, v] of _resetTokens) {
    if (now > v.expiresAt) _resetTokens.delete(k);
  }
  for (const [k, v] of _mfaSessions) {
    if (now > v.expiresAt) _mfaSessions.delete(k);
  }
  if (isDev) {
    console.log('[tokenStore] cleanup ran — counts:',
      { refresh: _refreshTokens.size, reset: _resetTokens.size, mfa: _mfaSessions.size });
  }
}

// Run cleanup every hour; unref so it doesn't prevent process exit.
const _interval = setInterval(cleanupExpired, 60 * 60 * 1000);
if (typeof _interval.unref === 'function') _interval.unref();

export default {
  addRefreshToken, hasRefreshToken, getRefreshToken, removeRefreshToken, removeAllUserRefreshTokens,
  addResetToken, getResetToken, removeResetToken,
  addMfaSession, getMfaSession, removeMfaSession,
  cleanupExpired,
};
