/**
 * src/middleware/security.js
 * Server-side security middleware — rate limiting, CORS, CSP, audit logging
 * No secrets or tokens are hard-coded here; all values must come from env vars.
 * Created: 2026-08-23
 */

import crypto from 'crypto';

// ── Audit log helper (minimal, labeled) ──────────────────────────────────────
const _auditLog = [];
const MAX_AUDIT_ENTRIES = 1000;

/**
 * Append a minimal audit entry. Fields: timestamp, action, actor, ip, success.
 */
export function audit(action, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    action,
    ...details,
  };
  _auditLog.push(entry);
  if (_auditLog.length > MAX_AUDIT_ENTRIES) _auditLog.shift();
  // Emit to console in non-production for visibility
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AUDIT ${entry.ts}] ${action}`, details);
  }
}

export function getAuditLog(limit = 100) {
  return _auditLog.slice(-limit);
}

// ── CORS origin validation ────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3001')
  .split(',')
  .map((o) => o.trim());

export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

// ── Content Security Policy ───────────────────────────────────────────────────
export function cspMiddleware(req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // relaxed for Vite HMR in dev; tighten in prod
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' wss: ws: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

// ── Request ID injection ──────────────────────────────────────────────────────
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

// ── Simple in-memory rate limiter (fallback when express-rate-limit absent) ───
const _hits = new Map();

export function rateLimiter(limit = 60, windowMs = 60_000) {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = _hits.get(key) || { count: 0, reset: now + windowMs };

    if (now > record.reset) {
      record.count = 0;
      record.reset = now + windowMs;
    }
    record.count += 1;
    _hits.set(key, record);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.reset / 1000));

    if (record.count > limit) {
      audit('RATE_LIMIT_HIT', { ip: key });
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    next();
  };
}

// ── Secure HTTP headers (complements helmet) ──────────────────────────────────
export function secureHeaders(req, res, next) {
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
}

// ── Sanitize inbound JSON body ────────────────────────────────────────────────
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj, depth = 0) {
  if (depth > 10) return '[DEPTH_LIMIT]';
  if (Array.isArray(obj)) return obj.map((v) => sanitizeObject(v, depth + 1));
  if (obj !== null && typeof obj === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      clean[k] = sanitizeObject(v, depth + 1);
    }
    return clean;
  }
  if (typeof obj === 'string') {
    // Strip null bytes; leave emoji and Unicode intact
    return obj.replace(/\0/g, '').slice(0, 65_536);
  }
  return obj;
}
