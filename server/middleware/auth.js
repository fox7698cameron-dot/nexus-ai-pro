/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * server/middleware/auth.js
 * Express middleware: JWT verification & role-based access control.
 * Date: 2026-08-29
 */

import { verifyAccessToken } from '../services/authService.js';

/**
 * requireAuth — verifies Bearer token and attaches req.user.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing', code: 'UNAUTHENTICATED' });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;          // { sub, role, username }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

/**
 * requireRole(...roles) — checks that req.user.role is one of the allowed roles.
 * Must be used after requireAuth.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated', code: 'UNAUTHENTICATED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error:  `Requires role: ${roles.join(' | ')}`,
        code:   'FORBIDDEN',
        yours:  req.user.role,
      });
    }
    next();
  };
}

/**
 * requireMinLevel(level) — checks role hierarchy level.
 * Levels: user=1, moderator=2, developer=3, admin=4
 */
const ROLE_LEVELS = { user: 1, moderator: 2, developer: 3, admin: 4 };

export function requireMinLevel(minLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated', code: 'UNAUTHENTICATED' });
    }
    const level = ROLE_LEVELS[req.user.role] ?? 0;
    if (level < minLevel) {
      return res.status(403).json({ error: 'Insufficient privileges', code: 'FORBIDDEN' });
    }
    next();
  };
}
