// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/services/userStore.js
// Singleton in-memory user store. Replace Map with pg pool for production persistence.
// Top-level await seeds the admin account on module load.

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const isDev = process.env.NODE_ENV !== 'production';
const BCRYPT_ROUNDS = 12;

// ─── Permission catalogue ─────────────────────────────────────────────────────
// Single source of truth — also consumed by middleware/rbac.js via re-export.

export const PERMISSIONS = Object.freeze({
  admin: Object.freeze([
    'analytics:read',  'analytics:write',
    'projects:read',   'projects:write',
    'gamedev:read',    'gamedev:write',
    'security:read',   'security:write',   'security:scan',
    'users:read',      'users:write',      'users:delete',   'users:moderate',
    'payments:read',   'payments:write',
    'connectors:read', 'connectors:write',
    'audit:read',
    'admin:all',
  ]),
  dev: Object.freeze([
    'analytics:read',
    'projects:write',   // write implies read in UI logic; store only what the spec specifies
    'gamedev:write',
    'security:read',
    'connectors:read',  'connectors:write',
    'audit:read',
  ]),
  moderator: Object.freeze([
    'analytics:read',
    'users:moderate',
  ]),
  user: Object.freeze([
    'analytics:read',
    'projects:read',
    'gamedev:read',
  ]),
});

export const ROLES = Object.freeze({
  ADMIN:     'admin',
  DEV:       'dev',
  MODERATOR: 'moderator',
  USER:      'user',
});

// ─── Store internals ─────────────────────────────────────────────────────────
/** Primary store: userId → user object */
export const userStore = new Map();

/** Fast email-to-id lookup: normalized email → userId */
const emailIndex = new Map();

// ─── User shape ───────────────────────────────────────────────────────────────
/**
 * @typedef {Object} User
 * @property {string}   id
 * @property {string}   email               — always lowercase
 * @property {string}   passwordHash
 * @property {string}   displayName         — Unicode/emoji allowed
 * @property {string}   role                — admin | dev | moderator | user
 * @property {string[]} permissions
 * @property {string|null} twoFactorSecret  — base32 TOTP secret (null until setup)
 * @property {boolean}  twoFactorEnabled
 * @property {string[]} backupCodes         — SHA-256 hashed backup codes
 * @property {Set<string>} refreshTokens    — active refresh token values per user
 * @property {Array}    biometricCredentials
 * @property {string}   createdAt           — ISO-8601
 * @property {string}   updatedAt           — ISO-8601
 * @property {string|null} lastLogin        — ISO-8601
 * @property {string}   language
 * @property {string|null} region
 * @property {string}   theme               — light | dark | system
 * @property {boolean}  isActive
 * @property {boolean}  isSuspended
 */

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

/** @param {string} id @returns {User|null} */
export function getUser(id) {
  return userStore.get(id) ?? null;
}

/** @param {string} email @returns {User|null} */
export function getUserByEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const id = emailIndex.get(email.toLowerCase());
  return id ? (userStore.get(id) ?? null) : null;
}

/**
 * Create and persist a new user.
 * @param {{ email: string, passwordHash: string, displayName?: string,
 *           role?: string, language?: string, region?: string }} data
 * @returns {User}
 */
export function createUser({ email, passwordHash, displayName = '', role = ROLES.USER, language = 'en', region = null }) {
  if (!email || !passwordHash) throw new TypeError('email and passwordHash are required');

  const normalizedEmail = email.toLowerCase().trim();
  if (emailIndex.has(normalizedEmail)) throw new Error('Email already in use');

  const id  = uuidv4();
  const now = new Date().toISOString();

  /** @type {User} */
  const user = {
    id,
    email:                normalizedEmail,
    passwordHash,
    displayName:          String(displayName).trim(),
    role,
    permissions:          Array.from(PERMISSIONS[role] ?? PERMISSIONS.user),
    twoFactorSecret:      null,
    twoFactorEnabled:     false,
    backupCodes:          [],
    refreshTokens:        new Set(),
    biometricCredentials: [],
    createdAt:            now,
    updatedAt:            now,
    lastLogin:            null,
    language,
    region,
    theme:                'system',
    isActive:             true,
    isSuspended:          false,
  };

  userStore.set(id, user);
  emailIndex.set(normalizedEmail, id);
  return user;
}

/**
 * Partially update a user. Fields `id` and `createdAt` are immutable.
 * Email changes update the index; role changes recompute permissions automatically.
 *
 * Note: `refreshTokens` (Set) is a shared mutable reference — do NOT replace it
 * via `updates`; mutate the Set directly on the returned user object instead.
 *
 * @param {string} id
 * @param {Partial<User>} updates
 * @returns {User|null}
 */
export function updateUser(id, updates) {
  const user = userStore.get(id);
  if (!user) return null;

  // Guard: id and createdAt are immutable
  const { id: _id, createdAt: _ca, ...safe } = updates;

  // Handle email index update
  if (safe.email) {
    const normalizedNew = safe.email.toLowerCase().trim();
    if (normalizedNew !== user.email) {
      emailIndex.delete(user.email);
      safe.email = normalizedNew;
      emailIndex.set(normalizedNew, id);
    } else {
      safe.email = user.email; // no-op
    }
  }

  // If role is changed, recompute permissions (unless caller overrides explicitly)
  if (safe.role && safe.role !== user.role && !safe.permissions) {
    safe.permissions = Array.from(PERMISSIONS[safe.role] ?? PERMISSIONS.user);
  }

  // Preserve the live refreshTokens Set — never let a spread overwrite it
  const refreshTokens = user.refreshTokens;

  const updated = {
    ...user,
    ...safe,
    // Immutable fields
    id,
    createdAt: user.createdAt,
    // Always keep the same Set instance so callers holding a reference stay in sync
    refreshTokens,
    updatedAt: new Date().toISOString(),
  };

  userStore.set(id, updated);
  return updated;
}

/**
 * Promote/demote a user role and recompute their permissions.
 * Separated from updateUser to make privilege escalation auditable.
 * @param {string} id @param {string} role @returns {User|null}
 */
export function updateUserRole(id, role) {
  if (!PERMISSIONS[role]) throw new RangeError(`Unknown role: ${role}`);
  return updateUser(id, { role, permissions: Array.from(PERMISSIONS[role]) });
}

/** @param {string} id @returns {boolean} */
export function deleteUser(id) {
  const user = userStore.get(id);
  if (!user) return false;
  emailIndex.delete(user.email);
  userStore.delete(id);
  return true;
}

/**
 * Paginated listing of all users (most-recently created first).
 * @param {{ limit?: number, offset?: number }} opts
 */
export function listUsers({ limit = 50, offset = 0 } = {}) {
  const all = Array.from(userStore.values())
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(offset, offset + limit)
    .map(safeUser);
  return { users: all, total: userStore.size };
}

// ─── Safe serialization ───────────────────────────────────────────────────────

/**
 * Strip all sensitive / non-serializable fields before sending a user object
 * in an API response.
 * @param {User|null} user
 * @returns {object|null}
 */
export function safeUser(user) {
  if (!user) return null;
  const {
    passwordHash,
    twoFactorSecret,
    backupCodes,
    refreshTokens, // Set — not JSON-safe
    ...safe
  } = user;
  return safe;
}

// ─── Admin seeding ────────────────────────────────────────────────────────────

/**
 * Idempotently create the admin account at startup.
 * Skips silently if ADMIN_PASSWORD is not configured.
 */
export async function seedAdmin() {
  const adminEmail    = (process.env.ADMIN_EMAIL    || 'admin@nexusai.pro').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD  || null;

  if (getUserByEmail(adminEmail)) return; // already seeded

  if (!adminPassword) {
    if (isDev) {
      console.warn('[userStore] ADMIN_PASSWORD is not set — admin account not seeded');
    }
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
  createUser({
    email:       adminEmail,
    passwordHash,
    displayName: 'Administrator',
    role:        ROLES.ADMIN,
    language:    'en',
    region:      null,
  });

  if (isDev) console.log('[userStore] Admin account seeded:', adminEmail);
}

// Seed on module load (ES module top-level await).
await seedAdmin();

export default {
  userStore,
  getUser, getUserByEmail, createUser, updateUser, updateUserRole, deleteUser, listUsers,
  safeUser, seedAdmin,
  ROLES, PERMISSIONS,
};
