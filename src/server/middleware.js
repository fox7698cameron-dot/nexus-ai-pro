// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { db } from './database.js';

// ── JWT authentication ────────────────────────────────────────
export async function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const payload = jwt.verify(token, secret);

    // Trailing 16 chars used as a cheap revocation key to avoid storing full tokens
    const revoked = await db.get(`revoked:${token.slice(-16)}`);
    if (revoked) return res.status(401).json({ error: 'Token revoked' });

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tier: payload.tier
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Role-based access control ─────────────────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

// ── Subscription tier gate ────────────────────────────────────
export function requireTier(...tiers) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!tiers.includes(req.user.tier)) {
      return res.status(403).json({ error: `Requires tier: ${tiers.join(' or ')}` });
    }
    next();
  };
}

// ── CSRF double-submit cookie ─────────────────────────────────
export function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.['csrf-token'];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  next();
}

// ── Audit logger ──────────────────────────────────────────────
// Writes one Redis entry per decorated request; never blocks the response.
export function auditLog(event) {
  return async (req, _res, next) => {
    try {
      const requestId = req.requestId ?? randomBytes(4).toString('hex');
      const entry = {
        timestamp: new Date().toISOString(),
        event,
        userId: req.user?.id ?? 'anonymous',
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'] ?? ''
      };
      await db.set(`audit:${Date.now()}:${requestId}`, JSON.stringify(entry), 90 * 24 * 3600);
    } catch {
      // Log failure must never block the request
    }
    next();
  };
}

// ── Input sanitizer ───────────────────────────────────────────
export function sanitizeInput(req, _res, next) {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  next();
}

function sanitizeValue(val) {
  if (typeof val === 'string') {
    // Strip null bytes; cap at 64 KiB
    return val.replace(/\0/g, '').slice(0, 65_536);
  }
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      // Prototype-pollution keys get prefixed so they can't shadow Object properties
      const safe = ['__proto__', 'constructor', 'prototype'].includes(k) ? `_${k}` : k;
      out[safe] = sanitizeValue(v);
    }
    return out;
  }
  return val;
}
