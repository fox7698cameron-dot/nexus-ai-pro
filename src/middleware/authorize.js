// File: authorize.js | Date: 2026-06-16
import config from '../config/index.js';

const ROLE_HIERARCHY = config.roles; // ['user','moderator','developer','admin','super_admin']

function getRoleIndex(role) {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? -1 : idx;
}

/**
 * Authorize middleware factory.
 * Checks that req.user.role is one of the allowed roles.
 * Returns 403 if the user's role is not in the list.
 *
 * @param {...string} roles - Allowed roles
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'NO_USER' });
    }

    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: roles,
        current: userRole,
      });
    }

    next();
  };
}

/**
 * Authorize by minimum role in the hierarchy.
 * Allows access if the user's role is >= minRole.
 *
 * Role hierarchy (ascending):
 *   user < moderator < developer < admin < super_admin
 *
 * @param {string} minRole - Minimum required role
 */
export function authorizeMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'NO_USER' });
    }

    const minIndex = getRoleIndex(minRole);
    if (minIndex === -1) {
      console.error(`[authorize] Unknown minRole: ${minRole}`);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const userIndex = getRoleIndex(req.user.role);
    if (userIndex < minIndex) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredMinRole: minRole,
        current: req.user.role,
      });
    }

    next();
  };
}

export default authorize;
