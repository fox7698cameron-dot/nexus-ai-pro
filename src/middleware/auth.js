// src/middleware/auth.js
// Created: 2026-10-19
// JWT authentication and role-based access control middleware

import jwt from 'jsonwebtoken';

const tokenBlacklist = new Set();

export const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
};

export const ROLE_HIERARCHY = {
  user: 0,
  moderator: 1,
  developer: 2,
  admin: 3,
};

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
    const hasPermission = allowedRoles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role] ?? 999;
      return userRoleLevel >= requiredLevel;
    });

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
}

export function requireAdmin(req, res, next) {
  return requireRole(ROLES.ADMIN)(req, res, next);
}

export function requireDeveloper(req, res, next) {
  return requireRole(ROLES.DEVELOPER, ROLES.ADMIN)(req, res, next);
}

export function requireModerator(req, res, next) {
  return requireRole(ROLES.MODERATOR, ROLES.DEVELOPER, ROLES.ADMIN)(req, res, next);
}

export function blacklistToken(token) {
  tokenBlacklist.add(token);
  setTimeout(() => tokenBlacklist.delete(token), 24 * 60 * 60 * 1000);
}

export function generateTokenPair(payload) {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const accessToken = jwt.sign(
    { ...payload, type: 'access' },
    secret,
    { expiresIn: process.env.JWT_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    refreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT secret not configured');
  return jwt.verify(token, secret);
}

export default authenticateToken;
