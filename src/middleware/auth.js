// File: src/middleware/auth.js | Created: 2026-08-31 | Nexus AI Pro
// JWT authentication middleware - validates Bearer tokens, enforces role access
// No secrets hardcoded - all from process.env

import crypto from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Minimal JWT implementation using HMAC-SHA256 (no external library for auth module).
 * Production: verify process.env.JWT_SECRET is strong (64+ chars).
 */
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY_MS = parseInt(process.env.JWT_EXPIRY_MS || '3600000', 10); // 1 hour default
const REFRESH_EXPIRY_MS = parseInt(process.env.REFRESH_EXPIRY_MS || '604800000', 10); // 7 days

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[AUTH] FATAL: JWT_SECRET missing or too short (min 32 chars). Set in .env');
}

// Supported user roles in order of privilege
export const ROLES = Object.freeze({
  USER:       'user',
  DEVELOPER:  'developer',
  MODERATOR:  'moderator',
  ADMIN:      'admin'
});

const ROLE_RANK = { user: 0, developer: 1, moderator: 2, admin: 3 };

// ─────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────

function base64urlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

function base64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/**
 * Issue a signed JWT (HS256) with standard claims.
 * @param {object} payload - user id, role, email
 * @param {'access'|'refresh'} type
 */
export function signToken(payload, type = 'access') {
  const now = Math.floor(Date.now() / 1000);
  const expiryMs = type === 'refresh' ? REFRESH_EXPIRY_MS : JWT_EXPIRY_MS;
  const exp = now + Math.floor(expiryMs / 1000);

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = base64urlEncode(JSON.stringify({
    ...payload,
    iat: now,
    exp,
    jti: crypto.randomBytes(16).toString('hex'), // prevent replay
    type
  }));

  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${sig}`;
}

/**
 * Verify and decode a JWT. Throws descriptive errors for clarity in logs.
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') throw new Error('Token required');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const [header, body, sig] = parts;
  const expected = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expected);
  const sigBuf      = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
    throw new Error('Invalid token signature');
  }

  let decoded;
  try {
    decoded = JSON.parse(base64urlDecode(body));
  } catch {
    throw new Error('Malformed token payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp < now) throw new Error('Token expired');

  return decoded;
}

// ─────────────────────────────────────────
// Middleware factories
// ─────────────────────────────────────────

/**
 * Require a valid access token on every protected route.
 * Attaches decoded payload to req.user.
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.slice(7);
    const user  = verifyToken(token);
    if (user.type !== 'access') {
      return res.status(401).json({ error: 'Access token required' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}

/**
 * Require a minimum role level.
 * @param {string} minimumRole - one of ROLES values
 */
export function requireRole(minimumRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userRank = ROLE_RANK[req.user.role] ?? -1;
    const reqRank  = ROLE_RANK[minimumRole] ?? 999;
    if (userRank < reqRank) {
      return res.status(403).json({
        error: `Insufficient permissions. Required: ${minimumRole}, has: ${req.user.role}`
      });
    }
    next();
  };
}

/** Shorthand combiners */
export const requireAdmin     = [requireAuth, requireRole(ROLES.ADMIN)];
export const requireModerator = [requireAuth, requireRole(ROLES.MODERATOR)];
export const requireDeveloper = [requireAuth, requireRole(ROLES.DEVELOPER)];

// ─────────────────────────────────────────
// Password policy
// ─────────────────────────────────────────

/** Minimum password requirements: 13+ chars, upper, lower, digit, special */
export function validatePassword(password) {
  const errors = [];
  if (typeof password !== 'string') return { valid: false, errors: ['Password must be a string'] };
  if (password.length < 13) errors.push('Minimum 13 characters required');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter required');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter required');
  if (!/[0-9]/.test(password)) errors.push('At least one number required');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character required');

  // Strength score 0-100
  let score = 0;
  if (password.length >= 13) score += 25;
  if (password.length >= 20) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]{2,}/.test(password)) score += 10;

  return {
    valid: errors.length === 0,
    errors,
    score,
    strength: score >= 80 ? 'strong' : score >= 50 ? 'medium' : 'weak'
  };
}

/**
 * Validate username: 2-50 chars, supports unicode letters, digits, _, -, ., emojis.
 * Rejects null bytes and control characters.
 */
export function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, error: 'Username must be a string' };
  const cleaned = username.trim();
  if (cleaned.length < 2) return { valid: false, error: 'Username too short (min 2 chars)' };
  if ([...cleaned].length > 50) return { valid: false, error: 'Username too long (max 50 chars)' };
  // Block null bytes and control chars (except harmless whitespace trimmed above)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(cleaned)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }
  return { valid: true, username: cleaned };
}

export default { requireAuth, requireRole, requireAdmin, requireModerator, requireDeveloper, signToken, verifyToken, validatePassword, validateUsername, ROLES };
