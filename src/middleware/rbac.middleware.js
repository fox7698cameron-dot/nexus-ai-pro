// src/middleware/rbac.middleware.js
// Role-based access control middleware using constants enumerations
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { ROLE_HIERARCHY } from '../config/constants.js';

// Require minimum role level
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const required = Math.max(...roles.map(r => ROLE_HIERARCHY[r] ?? 0));
    if (userLevel >= required) return next();
    return res.status(403).json({ error: 'Insufficient role privileges' });
  };
}

// Require specific permission (from JWT claims)
export function requirePermission(...perms) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userPerms = new Set(req.user.permissions ?? []);
    const missing = perms.filter(p => !userPerms.has(p));
    if (missing.length === 0) return next();
    return res.status(403).json({ error: 'Missing permissions', missing });
  };
}

// Require resource ownership or admin/dev role
export function requireOwnerOrRole(getOwnerId, ...roles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = Math.max(...roles.map(r => ROLE_HIERARCHY[r] ?? 0));
    if (userLevel >= requiredLevel) return next();
    try {
      const ownerId = await getOwnerId(req);
      if (ownerId && ownerId === req.user.sub) return next();
    } catch {
      // fall through to 403
    }
    return res.status(403).json({ error: 'Access denied' });
  };
}
