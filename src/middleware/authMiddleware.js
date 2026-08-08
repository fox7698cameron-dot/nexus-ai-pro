/**
 * src/middleware/authMiddleware.js
 * Nexus AI Pro — Express middleware for JWT auth, role enforcement, CSRF, input validation
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 */

import crypto from 'crypto';
import { ROLES, ROLE_PERMISSIONS } from '../auth/AuthService.js';

// ── JWT verification (inline — no retry, no external dep) ─────────────────

function b64decode(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') throw new Error('No token provided');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [header, body, sig] = parts;
  const expected = Buffer.from(
    crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
  ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf))
    throw new Error('Invalid token signature');
  const payload = JSON.parse(b64decode(body));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

// ── Auth middleware ────────────────────────────────────────────────────────

/**
 * requireAuth — attaches req.user; rejects if token is missing or invalid
 */
export function requireAuth(authService) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Authentication required' });

      const payload = authService.verifyToken(token);
      req.user = payload;
      next();
    } catch (err) {
      res.status(401).json({ error: err.message || 'Unauthorized' });
    }
  };
}

/**
 * requireRole — after requireAuth, checks the user role
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!allowedRoles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

/**
 * requirePermission — check a specific permission string
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const perms = req.user.permissions || ROLE_PERMISSIONS[req.user.role] || [];
    if (perms.includes('*') || perms.includes(permission)) return next();
    res.status(403).json({ error: `Permission denied: ${permission}` });
  };
}

// ── Input sanitization ─────────────────────────────────────────────────────

/** Strip null bytes and limit string length */
export function sanitizeString(input, maxLen = 10_000) {
  if (typeof input !== 'string') return '';
  // Remove null bytes; preserve emoji and Unicode (including RTL)
  return input.replace(/\0/g, '').slice(0, maxLen);
}

/** Deeply sanitize an object (strings only; leaves numbers/booleans intact) */
export function sanitizeObject(obj, depth = 0) {
  if (depth > 10) return {};
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map((v) => sanitizeObject(v, depth + 1)).slice(0, 1000);
  const out = {};
  for (const [k, v] of Object.entries(obj).slice(0, 200)) {
    out[sanitizeString(k, 100)] = sanitizeObject(v, depth + 1);
  }
  return out;
}

/**
 * sanitizeBody — middleware to sanitize all string fields in req.body.
 * Does NOT block emoji or special characters — supports full Unicode.
 */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// ── CSRF protection ────────────────────────────────────────────────────────

const _csrfTokens = new Map(); // token → { userId, expires }

export function generateCsrfToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  _csrfTokens.set(token, { userId, expires: Date.now() + 3_600_000 });
  // Prune old tokens
  for (const [k, v] of _csrfTokens.entries()) if (Date.now() > v.expires) _csrfTokens.delete(k);
  return token;
}

export function verifyCsrfToken(token, userId) {
  const record = _csrfTokens.get(token);
  if (!record) return false;
  if (Date.now() > record.expires) { _csrfTokens.delete(token); return false; }
  return record.userId === userId;
}

export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const csrfToken = req.headers['x-csrf-token'];
  const userId = req.user?.sub;
  if (!csrfToken || !userId || !verifyCsrfToken(csrfToken, userId))
    return res.status(403).json({ error: 'CSRF token invalid or missing' });
  next();
}

// ── Rate limiting helpers ──────────────────────────────────────────────────

const _hitCounts = new Map(); // `${ip}:${endpoint}` → { count, windowStart }

/**
 * Simple in-memory rate limiter (supplement express-rate-limit for per-endpoint control)
 */
export function createRateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const record = _hitCounts.get(key) || { count: 0, windowStart: now };

    if (now - record.windowStart > windowMs) {
      record.count = 0;
      record.windowStart = now;
    }

    record.count++;
    _hitCounts.set(key, record);

    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    next();
  };
}

// ── Security headers ───────────────────────────────────────────────────────

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export default {
  requireAuth,
  requireRole,
  requirePermission,
  sanitizeBody,
  sanitizeObject,
  csrfProtection,
  generateCsrfToken,
  createRateLimiter,
  securityHeaders,
};
