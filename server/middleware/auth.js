// server/middleware/auth.js
// Nexus AI Pro — JWT Auth Middleware
// Enumeration-safe · Role-based access control
// Date: 2026-08-18

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ─── Constants ────────────────────────────────────────────────────────────────
const TOKEN_PREFIX = 'Bearer ';

// ─── Audit Log ────────────────────────────────────────────────────────────────
function auditLog(event, details = {}) {
  const entry = {
    id: uuidv4(),
    ts: new Date().toISOString(),
    event,
    ...details,
  };
  // Exclude any sensitive fields
  const safe = { ...entry };
  delete safe.token;
  delete safe.password;
  delete safe.secret;
  console.info(`[AUTH_MIDDLEWARE:${event}]`, JSON.stringify(safe));
}

// ─── Extract Token ────────────────────────────────────────────────────────────
function extractToken(req) {
  const header = req.headers['authorization'] || '';
  if (header.startsWith(TOKEN_PREFIX)) {
    return header.slice(TOKEN_PREFIX.length).trim();
  }
  // Also check cookie (httpOnly)
  return req.cookies?.nexus_token || null;
}

// ─── Authenticate Middleware ──────────────────────────────────────────────────
export function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('[AUTH] JWT_SECRET environment variable not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'nexus-ai-pro',
      audience: 'nexus-api',
    });

    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      mfaEnabled: payload.mfaEnabled || false,
      locale: payload.locale || 'en',
    };

    auditLog('REQUEST_AUTHENTICATED', {
      userId: payload.sub,
      role: payload.role,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    next();
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token';
    auditLog('AUTH_FAILED', { reason, path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'Authentication failed', code: reason });
  }
}

// ─── Role Guard ───────────────────────────────────────────────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = roles.includes(req.user.role) || req.user.role === 'superadmin';
    if (!hasRole) {
      auditLog('AUTHORIZATION_DENIED', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role,
        path: req.path,
        ip: req.ip,
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// ─── Permission Guard ─────────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  superadmin: new Set(['*']),
  admin: new Set(['read:all', 'write:all', 'delete:all', 'manage:users',
    'manage:roles', 'view:security', 'view:analytics', 'manage:payments', 'view:projects']),
  dev: new Set(['read:all', 'write:code', 'write:projects', 'view:analytics',
    'view:security', 'manage:own', 'deploy:staging']),
  moderator: new Set(['read:all', 'moderate:content', 'manage:reports',
    'view:analytics:social', 'ban:users']),
  user: new Set(['read:public', 'write:own', 'view:own:analytics', 'manage:own']),
  guest: new Set(['read:public']),
};

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const perms = ROLE_PERMISSIONS[req.user.role] || ROLE_PERMISSIONS.guest;
    if (perms.has('*') || perms.has(permission)) {
      return next();
    }

    auditLog('PERMISSION_DENIED', {
      userId: req.user.id,
      permission,
      role: req.user.role,
      path: req.path,
    });
    return res.status(403).json({ error: 'Permission denied' });
  };
}

// ─── Optional Auth ────────────────────────────────────────────────────────────
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return next();

  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'nexus-ai-pro',
      audience: 'nexus-api',
    });
    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      mfaEnabled: payload.mfaEnabled || false,
      locale: payload.locale || 'en',
    };
  } catch {
    // Not authenticated — that's OK for optional routes
  }

  next();
}

// ─── Token Generator ──────────────────────────────────────────────────────────
export function signToken(payload, expiresIn = '15m') {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET is not set');

  return jwt.sign(
    { ...payload, jti: uuidv4() },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn,
      issuer: 'nexus-ai-pro',
      audience: 'nexus-api',
    }
  );
}

export function signRefreshToken(userId) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT refresh secret not set');

  return jwt.sign(
    { sub: userId, jti: uuidv4(), type: 'refresh' },
    secret,
    { algorithm: 'HS256', expiresIn: '7d', issuer: 'nexus-ai-pro', audience: 'nexus-api' }
  );
}

// ─── Request ID Middleware ─────────────────────────────────────────────────────
export function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}
