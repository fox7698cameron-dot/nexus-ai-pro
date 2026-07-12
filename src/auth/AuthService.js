// src/auth/AuthService.js
// 2026-07-12 | User authentication: JWT, MFA, biometrics, role-based access

import crypto from 'crypto';

const PASSWORD_MIN_LENGTH = 13;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;

export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'developer',
  MODERATOR: 'moderator',
  USER: 'user',
});

export const ROLE_PERMISSIONS = Object.freeze({
  [USER_ROLES.ADMIN]: ['read', 'write', 'delete', 'manage_users', 'manage_system', 'view_audit', 'manage_billing', 'view_all_dashboards'],
  [USER_ROLES.DEV]: ['read', 'write', 'delete', 'view_audit', 'view_dev_dashboard', 'manage_projects'],
  [USER_ROLES.MODERATOR]: ['read', 'write', 'moderate_content', 'view_moderator_dashboard'],
  [USER_ROLES.USER]: ['read', 'write', 'view_user_dashboard'],
});

export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!PASSWORD_REGEX.test(password)) {
    errors.push('Password must include uppercase, lowercase, number, and special character');
  }
  return { valid: errors.length === 0, errors };
}

export function validateUsername(username) {
  if (!username || username.trim().length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  // Allow letters, numbers, underscores, hyphens, dots, emojis, unicode chars (for i18n)
  if (username.length > 50) {
    return { valid: false, error: 'Username must be 50 characters or fewer' };
  }
  return { valid: true };
}

export function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    const s = salt || crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, s, 310000, 32, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hash: derivedKey.toString('hex'), salt: s });
    });
  });
}

export function verifyPassword(password, hash, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 310000, 32, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      const candidateHash = derivedKey.toString('hex');
      resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidateHash, 'hex')));
    });
  });
}

export function hasPermission(userRole, permission) {
  const perms = ROLE_PERMISSIONS[userRole] || [];
  return perms.includes(permission);
}

export function getDashboardPath(role) {
  switch (role) {
    case USER_ROLES.ADMIN: return '/dashboard/admin';
    case USER_ROLES.DEV: return '/dashboard/developer';
    case USER_ROLES.MODERATOR: return '/dashboard/moderator';
    default: return '/dashboard/user';
  }
}
