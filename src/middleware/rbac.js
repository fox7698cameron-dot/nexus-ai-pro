// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/middleware/rbac.js
// Role-based access control — constants and per-route middleware.

// ─── Permission catalogue ─────────────────────────────────────────────────────
/**
 * Every discrete action that can be granted to a role.
 * Use these constants instead of raw strings to prevent typos.
 */
export const PERMISSIONS = Object.freeze({
  // Analytics
  ANALYTICS_READ:     'analytics:read',
  ANALYTICS_WRITE:    'analytics:write',

  // Projects
  PROJECTS_READ:      'projects:read',
  PROJECTS_WRITE:     'projects:write',

  // Game / App development
  GAMEDEV_READ:       'gamedev:read',
  GAMEDEV_WRITE:      'gamedev:write',

  // Security
  SECURITY_READ:      'security:read',
  SECURITY_WRITE:     'security:write',
  SECURITY_SCAN:      'security:scan',

  // User management
  USERS_READ:         'users:read',
  USERS_WRITE:        'users:write',
  USERS_DELETE:       'users:delete',
  USERS_MODERATE:     'users:moderate',

  // Payments
  PAYMENTS_READ:      'payments:read',
  PAYMENTS_WRITE:     'payments:write',

  // Integrations / connectors
  CONNECTORS_READ:    'connectors:read',
  CONNECTORS_WRITE:   'connectors:write',

  // Audit log
  AUDIT_READ:         'audit:read',

  // Super-permission — grants all access in permission checks
  ADMIN_ALL:          'admin:all',
});

// ─── Role definitions ─────────────────────────────────────────────────────────
/**
 * Each role carries an explicit, ordered list of granted permissions.
 * `admin:all` is a wildcard matched by requirePermission so admins don't
 * need every individual permission listed.
 *
 * Spec-mandated sets:
 *   admin     — all permissions
 *   dev       — analytics:read, projects:write, gamedev:write, security:read
 *   moderator — analytics:read, users:moderate
 *   user      — analytics:read, projects:read, gamedev:read
 */
export const ROLES = Object.freeze({
  admin: Object.freeze({
    label: 'Administrator',
    permissions: Object.freeze(Object.values(PERMISSIONS)),
  }),

  dev: Object.freeze({
    label: 'Developer',
    permissions: Object.freeze([
      PERMISSIONS.ANALYTICS_READ,
      PERMISSIONS.PROJECTS_WRITE,
      PERMISSIONS.GAMEDEV_WRITE,
      PERMISSIONS.SECURITY_READ,
      PERMISSIONS.CONNECTORS_READ,
      PERMISSIONS.CONNECTORS_WRITE,
      PERMISSIONS.AUDIT_READ,
    ]),
  }),

  moderator: Object.freeze({
    label: 'Moderator',
    permissions: Object.freeze([
      PERMISSIONS.ANALYTICS_READ,
      PERMISSIONS.USERS_MODERATE,
    ]),
  }),

  user: Object.freeze({
    label: 'User',
    permissions: Object.freeze([
      PERMISSIONS.ANALYTICS_READ,
      PERMISSIONS.PROJECTS_READ,
      PERMISSIONS.GAMEDEV_READ,
    ]),
  }),
});

// Pre-computed Set<permission> per role for O(1) lookups at request time.
export const ROLE_PERMISSIONS = Object.freeze(
  Object.fromEntries(
    Object.entries(ROLES).map(([roleName, role]) => [
      roleName,
      Object.freeze(new Set(role.permissions)),
    ])
  )
);

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Express middleware factory that verifies the authenticated user holds the
 * given permission. Must be used after `authenticate` from middleware/auth.js.
 *
 * `admin:all` acts as a wildcard — any user whose permission set contains
 * `admin:all` passes every checkPermission gate automatically.
 *
 * @param {string} permission — a value from PERMISSIONS
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.get('/report', authenticate, checkPermission(PERMISSIONS.ANALYTICS_READ), handler)
 */
export function checkPermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code:  'AUTH_REQUIRED',
      });
    }

    const userPerms = new Set(req.user.permissions ?? []);

    if (userPerms.has(PERMISSIONS.ADMIN_ALL) || userPerms.has(permission)) {
      return next();
    }

    return res.status(403).json({
      error:    'Insufficient permissions',
      code:     'PERMISSION_DENIED',
      required: permission,
    });
  };
}

/**
 * Convenience variant that requires ALL listed permissions.
 * @param {...string} permissions
 * @returns {import('express').RequestHandler}
 */
export function checkPermissions(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userPerms = new Set(req.user.permissions ?? []);
    if (userPerms.has(PERMISSIONS.ADMIN_ALL)) return next();

    const missing = permissions.filter(p => !userPerms.has(p));
    if (missing.length > 0) {
      return res.status(403).json({
        error:   'Insufficient permissions',
        code:    'PERMISSION_DENIED',
        missing,
      });
    }

    return next();
  };
}

export default { PERMISSIONS, ROLES, ROLE_PERMISSIONS, checkPermission, checkPermissions };
