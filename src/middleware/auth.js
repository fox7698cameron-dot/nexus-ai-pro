// src/middleware/auth.js
// Date: 2026-06-02
// JWT verification, RBAC, and API key middleware for M2M communication

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
});

const ROLE_HIERARCHY = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.DEV,
  ROLES.MODERATOR,
  ROLES.USER,
];

function roleLevel(role) {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? ROLE_HIERARCHY.length : idx;
}

export function hasRole(userRole, requiredRole) {
  return roleLevel(userRole) <= roleLevel(requiredRole);
}

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasRole(req.user.role, role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'API key required' });

  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return res.status(500).json({ error: 'Server misconfiguration' });

  const expectedBuf = Buffer.from(expected);
  const keyBuf = Buffer.from(key);
  if (expectedBuf.length !== keyBuf.length || !crypto.timingSafeEqual(expectedBuf, keyBuf)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

export function optionalAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
      // Proceed without auth
    }
  }
  next();
}
