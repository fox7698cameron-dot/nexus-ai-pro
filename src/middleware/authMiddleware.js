// ================================================
// NEXUS AI PRO - Auth Middleware
// File: src/middleware/authMiddleware.js
// Updated: 2026-07-01
// JWT verification + role-based access control
// ================================================

import jwt from 'jsonwebtoken';

// Role hierarchy — higher index = more privilege
const ROLE_LEVELS = { user: 0, moderator: 1, developer: 2, admin: 3 };

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: message });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userLevel = ROLE_LEVELS[req.user.role] ?? -1;
    const requiredLevel = Math.max(...roles.map(r => ROLE_LEVELS[r] ?? 99));
    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    // ignore — proceed as unauthenticated
  }
  next();
}
