/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Authentication & Authorization Middleware
 * JWT verification, role-based access control, MFA enforcement
 * Date: 2026-08-09
 */

import jwt from 'jsonwebtoken';
// Date: 2026-08-09
import crypto from 'crypto';

const ROLES = {
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
};

/**
 * Verify JWT and attach decoded payload to req.user
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: no token provided' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'nexus-ai-pro',
      audience: 'nexus-clients',
    });

    // Enforce MFA completion if required
    if (decoded.mfaRequired && !decoded.mfaVerified) {
      return res.status(403).json({ error: 'MFA verification required', mfaRequired: true });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Enforce minimum role level.
 * Role hierarchy: admin > dev > moderator > user
 */
const ROLE_LEVELS = {
  [ROLES.ADMIN]: 4,
  [ROLES.DEV]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1,
};

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userLevel = ROLE_LEVELS[req.user.role] ?? 0;
    const minRequired = Math.min(...allowedRoles.map(r => ROLE_LEVELS[r] ?? Infinity));
    if (userLevel < minRequired) {
      return res.status(403).json({ error: 'Insufficient permissions', required: allowedRoles });
    }
    next();
  };
}

/**
 * Generate a signed JWT access token
 */
export function signAccessToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'nexus-ai-pro',
    audience: 'nexus-clients',
  });
}

/**
 * Generate a signed JWT refresh token
 */
export function signRefreshToken(userId) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT secret not configured');
  return jwt.sign({ sub: userId, type: 'refresh' }, secret, {
    algorithm: 'HS256',
    expiresIn: '7d',
    issuer: 'nexus-ai-pro',
  });
}

/**
 * Generate a TOTP secret and backup codes for MFA
 */
export function generateMFASecret() {
  const secret = crypto.randomBytes(20).toString('hex').toUpperCase();
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase()
  );
  return { secret, backupCodes };
}

/**
 * Verify TOTP token (time-based, 30s window, ±1 step tolerance)
 */
export function verifyTOTP(secret, token) {
  const time = Math.floor(Date.now() / 30000);
  for (const step of [-1, 0, 1]) {
    const counter = time + step;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(buf);
    const digest = hmac.digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const code = ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
      .toString()
      .padStart(6, '0');
    if (code === String(token).padStart(6, '0')) return true;
  }
  return false;
}

export { ROLES };
