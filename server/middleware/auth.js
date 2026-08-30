/**
 * server/middleware/auth.js
 * JWT authentication & RBAC middleware for Nexus AI Pro
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ─── Role hierarchy ───────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  USER:      'user',
  MODERATOR: 'moderator',
  DEV:       'dev',
  ADMIN:     'admin',
});

const ROLE_LEVELS = { user: 1, moderator: 2, dev: 3, admin: 4 };

// ─── Token utilities ──────────────────────────────────────────────────────────

const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

// Lazy-read secrets at call time so the module can be imported without crashing.
// The functions below will throw with a clear message if the env vars are absent.
function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('[auth] JWT_SECRET must be set (min 16 chars) in environment variables');
  return s;
}
function getRefreshSecret() {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s || s.length < 16) throw new Error('[auth] JWT_REFRESH_SECRET must be set (min 16 chars) in environment variables');
  return s;
}

const JWT_SECRET         = null;   // resolved per-call via getJwtSecret()
const JWT_REFRESH_SECRET = null;   // resolved per-call via getRefreshSecret()

/**
 * Sign an access token for a user record.
 * @param {{ id: string, role: string, email: string }} user
 * @returns {string} signed JWT
 */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub:   user.id,
      role:  user.role,
      email: user.email,
      jti:   crypto.randomUUID(),           // unique token ID for revocation
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS512' },
  );
}

/**
 * Sign a refresh token.
 * @param {{ id: string }} user
 * @returns {string}
 */
export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, jti: crypto.randomUUID() },
    getRefreshSecret(),
    { expiresIn: JWT_REFRESH_EXPIRES, algorithm: 'HS512' },
  );
}

// ─── In-memory revocation list (production: use Redis SET) ────────────────────
const revokedJTIs = new Set();

export function revokeToken(jti) {
  revokedJTIs.add(jti);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Authenticate request via Bearer JWT.
 * Sets req.user = { id, role, email } on success.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS512'] });

    if (revokedJTIs.has(payload.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    req.user = {
      id:    payload.sub,
      role:  payload.role,
      email: payload.email,
      jti:   payload.jti,
    };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expired'
      : 'Invalid token';
    return res.status(401).json({ error: message });
  }
}

/**
 * Require a minimum role level.
 * Usage: requireRole('admin') or requireRole(['admin','dev'])
 * @param {string|string[]} requiredRole
 */
export function requireRole(requiredRole) {
  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userLevel = ROLE_LEVELS[req.user.role] ?? 0;
    const hasAccess = allowed.some(r => userLevel >= (ROLE_LEVELS[r] ?? 99));
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowed,
        current: req.user.role,
      });
    }
    next();
  };
}

/** Convenience guards */
export const requireAdmin     = requireRole('admin');
export const requireDev       = requireRole(['admin', 'dev']);
export const requireModerator = requireRole(['admin', 'dev', 'moderator']);
