/**
 * src/middleware/auth.js
 * Authentication & Authorization Middleware
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Provides JWT verification, role-based access control, and MFA enforcement.
 * No secrets or tokens are ever hard-coded here.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/** Roles available in the system */
export const ROLES = Object.freeze({
  ADMIN:     'admin',
  DEV:       'dev',
  MODERATOR: 'moderator',
  USER:      'user',
});

/** Role hierarchy: higher index = more privilege */
const ROLE_ORDER = [ROLES.USER, ROLES.MODERATOR, ROLES.DEV, ROLES.ADMIN];

/**
 * Verify the JWT access token from the Authorization header.
 * Attaches decoded payload to `req.user`.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer:     process.env.JWT_ISSUER || 'nexus-ai-pro',
      audience:   process.env.JWT_AUDIENCE || 'nexus-ai-pro-client',
    });

    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Require at least the given role.
 * Usage: router.get('/admin', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    const userRoleIndex = ROLE_ORDER.indexOf(req.user.role);
    const minRequired   = Math.max(...allowedRoles.map(r => ROLE_ORDER.indexOf(r)));
    if (userRoleIndex < 0 || userRoleIndex < minRequired) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Enforce MFA: if user has MFA enabled, the token must carry a valid mfaVerified claim.
 */
export function requireMFA(req, res, next) {
  if (req.user?.mfaEnabled && !req.user?.mfaVerified) {
    return res.status(403).json({ error: 'MFA verification required', code: 'MFA_REQUIRED' });
  }
  next();
}

/**
 * Generate a short-lived access token.
 * @param {object} payload - Claims to embed (must include id and role)
 * @param {string} [expiresIn='15m']
 */
export function signAccessToken(payload, expiresIn = '15m') {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn,
    issuer:   process.env.JWT_ISSUER   || 'nexus-ai-pro',
    audience: process.env.JWT_AUDIENCE || 'nexus-ai-pro-client',
  });
}

/**
 * Generate a refresh token (opaque, stored server-side).
 */
export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Hash a refresh token before storage (never store raw tokens).
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
