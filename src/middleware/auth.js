// src/middleware/auth.js
// Created: 2026-10-18
// JWT auth middleware, role-based access control, TOTP MFA verification

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// TOTP-compatible HMAC-based OTP (RFC 6238)
export function verifyMFA(secret, token) {
  const window = 1; // ±1 time step tolerance
  const step = 30;
  const counter = Math.floor(Date.now() / 1000 / step);

  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, counter + i);
    if (timingSafeEqual(expected, String(token).padStart(6, '0'))) return true;
  }
  return false;
}

function generateTOTP(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex')).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(code).padStart(6, '0');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return crypto.timingSafeEqual(ba, bb);
}

export function validateAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = payload;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: msg });
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    // not blocking — continue as unauthenticated
  }
  next();
}
