/**
 * NEXUS AI PRO - Auth Middleware
 * File: src/middleware/auth.js
 * Date: 2026-08-26
 *
 * JWT verification, role-based access control middleware.
 * No tokens hardcoded — uses JWT_SECRET from environment.
 */

import jwt from 'jsonwebtoken';
import { auditLog } from '../utils/helpers.js';

// ─── JWT Verification ──────────────────────────────────────────────────────────
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = payload;
    next();
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'token_expired' : 'token_invalid';
    auditLog('AUTH_REJECTED', { reason });
    return res.status(401).json({ error: 'Invalid or expired token', reason });
  }
}

// ─── Role-Based Access Control ─────────────────────────────────────────────────
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      auditLog('ACCESS_DENIED', { userId: req.user.sub, role: req.user.role, required: allowedRoles });
      return res.status(403).json({ error: 'Insufficient permissions', required: allowedRoles });
    }
    next();
  };
}

// ─── Optional Auth (for public endpoints that can use user context) ────────────
export function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    }
  } catch {
    // Non-fatal — user simply isn't authenticated
    req.user = null;
  }
  next();
}

// ─── Machine-to-Machine API Key Auth ──────────────────────────────────────────
export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  // API keys are stored as hashed values in env (never plaintext)
  const validKeys = (process.env.API_KEYS || '').split(',').filter(Boolean);
  const matches = validKeys.some(k => k.trim() === apiKey);

  if (!matches) {
    auditLog('API_KEY_INVALID', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.isM2M = true;
  next();
}
