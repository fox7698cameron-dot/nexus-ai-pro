/**
 * nexus-ai-pro/src/middleware/auth.js
 * Authentication middleware for role-based access control
 * Roles: admin, dev, moderator, user
 * Date: 2026-08-16
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// User roles enumeration
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
});

// Role hierarchy (higher index = more access)
const ROLE_HIERARCHY = [ROLES.GUEST, ROLES.USER, ROLES.MODERATOR, ROLES.DEV, ROLES.ADMIN];

/**
 * Verify a Bearer JWT and attach decoded user to req.user
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required', code: 'AUTH_REQUIRED' });
  }

  const token = authHeader.slice(7);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: message, code: 'AUTH_INVALID' });
  }
}

/**
 * Require a minimum role level
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'AUTH_REQUIRED' });
    }
    const userRole = req.user.role || ROLES.USER;
    const hasRole = allowedRoles.some(role => {
      const userIdx = ROLE_HIERARCHY.indexOf(userRole);
      const reqIdx = ROLE_HIERARCHY.indexOf(role);
      return userIdx >= reqIdx;
    });
    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'AUTH_FORBIDDEN',
        required: allowedRoles,
        current: userRole,
      });
    }
    next();
  };
}

/** Convenience wrappers */
export const requireAdmin = requireRole(ROLES.ADMIN);
export const requireDev = requireRole(ROLES.DEV);
export const requireModerator = requireRole(ROLES.MODERATOR);
export const requireUser = requireRole(ROLES.USER);

/**
 * Optional auth — attaches user if token present, continues either way
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const secret = process.env.JWT_SECRET;
    if (secret) req.user = jwt.verify(authHeader.slice(7), secret);
  } catch { /* ignore */ }
  next();
}

/**
 * Generate signed JWT
 */
export function signToken(payload, expiresIn = '24h') {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    secret,
    { expiresIn, algorithm: 'HS256' }
  );
}

/**
 * Generate a cryptographically secure refresh token
 */
export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export default { requireAuth, requireRole, requireAdmin, requireDev,
  requireModerator, requireUser, optionalAuth, signToken,
  generateRefreshToken, safeCompare, ROLES };
