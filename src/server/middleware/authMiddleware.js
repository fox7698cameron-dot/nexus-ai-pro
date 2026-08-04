/**
 * @file authMiddleware.js
 * @description Express middleware for JWT authentication, role-based access
 *   control, MFA session verification, and HTTPS enforcement.
 * @created 2026-08-04
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 */

import { verifyAccessToken } from '../auth/authService.js';

// ---------------------------------------------------------------------------
// HTTPS enforcement
// ---------------------------------------------------------------------------

/**
 * Middleware: rejects plain-HTTP requests in production environments.
 * Trusts the X-Forwarded-Proto header set by reverse proxies (nginx, ALB, etc.).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function enforceHttps(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();

  const proto = req.headers['x-forwarded-proto'] ?? req.protocol;
  if (proto !== 'https') {
    return res.status(301).redirect('https://' + req.headers.host + req.originalUrl);
  }
  return next();
}

// ---------------------------------------------------------------------------
// JWT authentication
// ---------------------------------------------------------------------------

/**
 * Middleware: verifies a Bearer JWT in the Authorization header and attaches
 * the decoded payload to `req.user`.
 *
 * Enumeration-safe: always returns the same 401 body regardless of whether
 * the token is missing, malformed, or expired.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      mfaVerified: payload.mfaVerified ?? false,
      jti: payload.jti,
    };
    return next();
  } catch {
    // Do not leak jwt error details (expiry, signature, etc.)
    return res.status(401).json({ error: 'Authentication required.' });
  }
}

// ---------------------------------------------------------------------------
// Role-based access control
// ---------------------------------------------------------------------------

/**
 * Middleware factory: allows only users whose role is in the provided list.
 * Must be used AFTER `authenticate`.
 *
 * @param {...string} roles  - Accepted roles (e.g. 'admin', 'dev')
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   router.get('/admin', authenticate, requireRole('admin'), handler);
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      // Defensive: caller forgot to add authenticate() first
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    return next();
  };
}

// ---------------------------------------------------------------------------
// MFA session enforcement
// ---------------------------------------------------------------------------

/**
 * Middleware: ensures the current session has completed MFA verification.
 * Must be used AFTER `authenticate`.
 *
 * Users who have MFA enabled but have not yet verified their TOTP code during
 * this session will receive a 403 with a structured body that clients can use
 * to redirect to the MFA challenge screen.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireMFA(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!req.user.mfaVerified) {
    return res.status(403).json({
      error: 'MFA verification required.',
      code: 'MFA_REQUIRED',
    });
  }

  return next();
}
