/**
 * middleware/auth.js
 * Nexus AI Pro — Server-Side Auth Middleware
 * JWT verification, role guards, MFA, password hashing & validation
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import crypto from 'crypto';

// ── Environment guard ─────────────────────────────────────────────────────────
function requireEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`[auth] Required environment variable ${name} is not set`);
  return val;
}

// Resolved lazily at first use so the server can start before .env loads
let _jwtSecret, _refreshSecret;
function jwtSecret()     { return _jwtSecret     ??= requireEnv('JWT_SECRET'); }
function refreshSecret() { return _refreshSecret ??= requireEnv('JWT_REFRESH_SECRET'); }

// ── Password validation ───────────────────────────────────────────────────────
/**
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePassword(password) {
  const errors = [];
  if (!password || typeof password !== 'string') { return { valid: false, errors: ['Password is required'] }; }
  if (password.length < 13)           errors.push('Must be at least 13 characters');
  if (!/[A-Z]/.test(password))        errors.push('Must contain an uppercase letter');
  if (!/[a-z]/.test(password))        errors.push('Must contain a lowercase letter');
  if (!/[0-9]/.test(password))        errors.push('Must contain a number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain a special character');
  return { valid: errors.length === 0, errors };
}

// ── Password hashing ──────────────────────────────────────────────────────────
/**
 * @param {string} plaintext
 * @returns {Promise<string>}
 */
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, 12);
}

/**
 * @param {string} plaintext
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

// ── Token generation ──────────────────────────────────────────────────────────
/**
 * @param {string} userId
 * @param {string} role   admin | developer | moderator | user
 * @param {{ mfaVerified?: boolean, email?: string }} [extra]
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export function generateTokenPair(userId, role, extra = {}) {
  const payload = { sub: userId, role, ...extra };

  const accessToken = jwt.sign(payload, jwtSecret(), {
    expiresIn: '15m',
    issuer:    'nexus-ai-pro',
    audience:  'nexus-api',
    jwtid:     crypto.randomUUID(),
  });

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    refreshSecret(),
    { expiresIn: '7d', issuer: 'nexus-ai-pro' }
  );

  return { accessToken, refreshToken };
}

/**
 * @param {string} token
 * @returns {{ sub: string, type: 'refresh' }}
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret(), { issuer: 'nexus-ai-pro' });
}

// ── Express middleware ────────────────────────────────────────────────────────
/**
 * Verify Bearer JWT and attach req.user = { userId, role, email, mfaVerified }
 * @type {import('express').RequestHandler}
 */
export function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret(), { issuer: 'nexus-ai-pro', audience: 'nexus-api' });
    req.user = {
      userId:      payload.sub,
      role:        payload.role ?? 'user',
      email:       payload.email,
      mfaVerified: payload.mfaVerified ?? false,
    };
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: msg });
  }
}

/**
 * Require req.user.role to be one of the given roles.
 * @param {...string} roles
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

/**
 * Require MFA to have been completed for this session.
 * @type {import('express').RequestHandler}
 */
export function requireMFA(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.mfaVerified) {
    return res.status(403).json({ error: 'MFA verification required', mfaRequired: true });
  }
  next();
}
