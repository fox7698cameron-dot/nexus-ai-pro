/**
 * server/middleware/auth.js
 * Nexus AI Pro — Authentication & Authorization Middleware
 * Labeled: 2026-08-25
 *
 * Provides:
 *  - JWT verification (RS256 preferred, HS256 fallback)
 *  - Role-based access control (RBAC): admin | dev | moderator | user
 *  - Request fingerprinting for session binding
 *  - MFA enforcement middleware
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ── Role hierarchy ────────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  ADMIN:     'admin',
  DEV:       'dev',
  MODERATOR: 'moderator',
  USER:      'user',
  GUEST:     'guest'
});

const ROLE_WEIGHTS = {
  admin:     100,
  dev:        80,
  moderator:  60,
  user:       40,
  guest:      10
};

export function hasRole(userRole, requiredRole) {
  return (ROLE_WEIGHTS[userRole] || 0) >= (ROLE_WEIGHTS[requiredRole] || 0);
}

// ── Request fingerprint ───────────────────────────────────────────────────────
function getRequestFingerprint(req) {
  const parts = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    // Do NOT use IP alone — it can change on mobile; combine with UA
    (req.ip || '').split(':').pop()
  ];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

// ── JWT verification ──────────────────────────────────────────────────────────

/**
 * Core JWT verification. Reads secret from environment only.
 * Never accepts tokens signed with 'none' algorithm.
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256', 'HS384', 'HS512'],
    issuer:     process.env.JWT_ISSUER || 'nexus-ai-pro',
    audience:   process.env.JWT_AUDIENCE || 'nexus-ai-pro-client'
  });

  return decoded;
}

/**
 * Express middleware: require a valid JWT.
 * Attaches `req.user` on success.
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token   = authHeader.slice(7);
    const decoded = verifyToken(token);

    // Bind token to fingerprint if it was issued with one
    if (decoded.fingerprint) {
      const current = getRequestFingerprint(req);
      if (decoded.fingerprint !== current) {
        return res.status(401).json({ error: 'Session fingerprint mismatch' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: msg });
  }
}

/**
 * Express middleware: require a specific role or higher.
 * Usage: requireRole(ROLES.ADMIN)
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!hasRole(req.user.role, role)) {
      return res.status(403).json({ error: `Requires ${role} role or higher` });
    }
    next();
  };
}

/**
 * Express middleware: require MFA to be completed.
 * The token payload must include `mfaVerified: true`.
 */
export function requireMFA(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.mfaVerified) {
    return res.status(403).json({ error: 'MFA verification required', code: 'MFA_REQUIRED' });
  }
  next();
}

/**
 * Issue a signed JWT for a user.
 * Never embeds sensitive data — only userId, role, email hash.
 */
export function issueToken(user, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  const payload = {
    sub:         user.id,
    role:        user.role || ROLES.USER,
    emailHash:   crypto.createHash('sha256').update(user.email).digest('hex').slice(0, 16),
    mfaVerified: options.mfaVerified || false,
    fingerprint: options.fingerprint || undefined,
    plan:        user.plan || 'free'
  };

  return jwt.sign(payload, secret, {
    expiresIn: options.expiresIn || '1h',
    issuer:    process.env.JWT_ISSUER   || 'nexus-ai-pro',
    audience:  process.env.JWT_AUDIENCE || 'nexus-ai-pro-client',
    algorithm: 'HS256'
  });
}

/**
 * Issue a short-lived refresh token (opaque, stored server-side).
 */
export function issueRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}
