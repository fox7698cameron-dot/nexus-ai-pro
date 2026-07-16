// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/middleware/auth.js — 2026-07-16

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET environment variable is required');

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  MODERATOR: 'moderator',
  USER: 'user',
});

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.DEVELOPER]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1,
};

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m', algorithm: 'HS256' });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
}

export function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const decoded = verifyAccessToken(auth.slice(7));
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const required = Math.max(...roles.map(r => ROLE_HIERARCHY[r] || 0));
    if (userLevel >= required) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

export function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 310000, 64, 'sha512').toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password, hash, salt) {
  const computed = crypto.pbkdf2Sync(password, salt, 310000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}

export const PASSWORD_POLICY = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export function validatePassword(password) {
  const errors = [];
  if (password.length < PASSWORD_POLICY.minLength)
    errors.push(`Minimum ${PASSWORD_POLICY.minLength} characters required`);
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password))
    errors.push('At least one uppercase letter required');
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password))
    errors.push('At least one lowercase letter required');
  if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password))
    errors.push('At least one number required');
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password))
    errors.push('At least one special character required');
  return { valid: errors.length === 0, errors };
}

export function generateUserId() {
  return `usr_${crypto.randomBytes(16).toString('hex')}`;
}

export function generateAuditId() {
  return `aud_${crypto.randomBytes(8).toString('hex')}`;
}
