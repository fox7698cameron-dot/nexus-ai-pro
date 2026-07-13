// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/middleware/auth.js — 2026-07-13
// JWT authentication and RBAC middleware

import jwt from 'jsonwebtoken';
import { getUser } from '../services/userStore.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

/**
 * Verify the Bearer JWT and attach req.user.
 * Returns 401 if missing, 403 if invalid/expired.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_MISSING' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const user = getUser(payload.id);
    if (!user || !user.isActive || user.isSuspended) {
      return res.status(403).json({ error: 'Account unavailable', code: 'ACCOUNT_INACTIVE' });
    }
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
  }
}

/**
 * Optional auth — attaches req.user if a valid token is present,
 * but does not block the request if missing.
 */
export function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const user = getUser(payload.id);
    if (user && user.isActive && !user.isSuspended) {
      req.user = { id: payload.id, email: payload.email, role: payload.role, permissions: payload.permissions };
    }
  } catch {
    // Silently ignore invalid/expired tokens for optional auth
  }
  next();
}

/**
 * Require one of the specified roles.
 * Must be used after authenticate().
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required', code: 'AUTH_MISSING' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient role', code: 'ROLE_FORBIDDEN', required: roles });
    }
    next();
  };
}

/**
 * Require a specific permission.
 * Must be used after authenticate().
 */
export function requirePermission(...perms) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required', code: 'AUTH_MISSING' });
    const userPerms = new Set(req.user.permissions ?? []);
    const hasAll = perms.every(p => userPerms.has(p) || userPerms.has('admin:all'));
    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'PERMISSION_DENIED', required: perms });
    }
    next();
  };
}

export function issueToken(user, expiresIn = '15m') {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, permissions: user.permissions },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn }
  );
}

export default { authenticate, optionalAuthenticate, requireRole, requirePermission, issueToken };
