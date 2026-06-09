// src/server/middleware.js
// Nexus AI Pro — Authentication & Authorization Middleware
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import jwt from 'jsonwebtoken';

export const USER_ROLES = Object.freeze({
  USER:       'user',
  MODERATOR:  'moderator',
  DEV:        'dev',
  ADMIN:      'admin',
  SUPER_ADMIN:'super_admin',
});

// Numeric hierarchy: higher = more privileged
export const ROLE_HIERARCHY = Object.freeze({
  user:        10,
  moderator:   20,
  dev:         30,
  admin:       40,
  super_admin: 50,
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const minRequired = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r] ?? 999));

    if (userLevel < minRequired) {
      return res.status(403).json({ error: 'Insufficient permissions', required: allowedRoles });
    }
    next();
  };
}

export const requireAdmin     = requireRole(USER_ROLES.ADMIN);
export const requireDev       = requireRole(USER_ROLES.DEV);
export const requireModerator = requireRole(USER_ROLES.MODERATOR);
export const requireSuperAdmin = requireRole(USER_ROLES.SUPER_ADMIN);

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, getJwtSecret());
  } catch (_) {
    // Optional — allow unauthenticated through
  }
  next();
}
