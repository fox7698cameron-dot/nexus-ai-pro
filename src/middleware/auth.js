// src/middleware/auth.js — Updated: 2026-07-25
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'developer', MOD: 'moderator', USER: 'user' });
const ROLE_HIERARCHY = { admin: 4, developer: 3, moderator: 2, user: 1 };

function getJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var is required');
  return process.env.JWT_SECRET;
}

export function signToken(payload, expiresIn = '24h') {
  return jwt.sign({ ...payload, iat: Math.floor(Date.now() / 1000) }, getJwtSecret(), { expiresIn, algorithm: 'HS256' });
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.nexus_token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  const minLevel = Math.max(...roles.map(r => ROLE_HIERARCHY[r] ?? 0));
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    if (userLevel < minLevel) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export { ROLES };
