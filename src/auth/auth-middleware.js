// src/auth/auth-middleware.js
// Created: 2026-07-30
// JWT authentication and role-based authorization middleware

import jwt from 'jsonwebtoken';
import { ROLES } from './auth-routes.js';

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    req.user = payload;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please refresh.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const userLevel = ROLES[req.user.role] || 0;
    const requiredLevel = Math.min(...roles.map(r => ROLES[r] || 99));
    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    return next();
  };
}

export function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const userLevel = ROLES[req.user.role] || 0;
    const minLevel = ROLES[minRole] || 99;
    if (userLevel < minLevel) {
      return res.status(403).json({ error: `Requires ${minRole} or higher.` });
    }
    return next();
  };
}

// Attach user to request without blocking (for optional auth)
export function optionalAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    try {
      const secret = process.env.JWT_SECRET;
      const payload = jwt.verify(header.slice(7), secret, { algorithms: ['HS256'] });
      req.user = payload;
    } catch {
      // silently ignore
    }
  }
  return next();
}
