/**
 * src/auth/AuthSystem.js
 * Nexus AI Pro — Authentication & Authorization System
 * Covers: JWT, 2FA/MFA, biometrics, RBAC, password policy, session management
 * Date: 2026-08-28
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── Role definitions ────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  ADMIN:     'admin',
  DEVELOPER: 'developer',
  MODERATOR: 'moderator',
  USER:      'user',
});

export const ROLE_PERMISSIONS = Object.freeze({
  admin:     ['*'],                                                     // all permissions
  developer: ['read:*', 'write:*', 'deploy:*', 'audit:read'],
  moderator: ['read:*', 'write:content', 'ban:users', 'audit:read'],
  user:      ['read:own', 'write:own', 'chat:*'],
});

// ── Password policy (13 + chars, special chars, uppercase, lowercase, digit) ─
export const PASSWORD_POLICY = {
  minLength:        13,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit:     true,
  requireSpecial:   true,
  specialChars:     '!@#$%^&*()_+-=[]{}|;\':",.<>?/`~\\',
  maxLength:        128,
};

/**
 * Validate a password against policy.
 * Returns { valid: boolean, errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];
  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must be at most ${PASSWORD_POLICY.maxLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/`~\\]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  return { valid: errors.length === 0, errors };
}

/** Compute a password strength score 0–100 */
export function passwordStrength(password) {
  if (!password) return 0;
  let score = 0;
  score += Math.min(40, (password.length / PASSWORD_POLICY.minLength) * 40);
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/`~\\]/.test(password)) score += 20;
  return Math.round(Math.min(100, score));
}

// ── Secure password hashing (PBKDF2-SHA-512) ──────────────────────────────
export async function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 310000, 64, 'sha512', (err, hash) => {
      if (err) return reject(err);
      resolve(`${salt}:${hash.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 310000, 64, 'sha512', (err, derivedHash) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        derivedHash
      ));
    });
  });
}

// ── JWT helpers (HS256 without third-party lib) ────────────────────────────
const JWT_SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s === 'generate_jwt_secret_here') {
    // Non-fatal: generate ephemeral secret in dev; warn in prod
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return crypto.randomBytes(32).toString('hex');
  }
  return s;
};

let _jwtSecret = null;
function getJwtSecret() {
  if (!_jwtSecret) _jwtSecret = JWT_SECRET();
  return _jwtSecret;
}

function b64url(buf) {
  return Buffer.isBuffer(buf)
    ? buf.toString('base64url')
    : Buffer.from(buf).toString('base64url');
}

export function signToken(payload, expiresInSeconds = 3600) {
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  const data    = `${header}.${body}`;
  const sig     = b64url(crypto.createHmac('sha256', getJwtSecret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const data    = `${header}.${body}`;
    const expected = b64url(crypto.createHmac('sha256', getJwtSecret()).update(data).digest());
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── TOTP-based 2FA (RFC 6238) ──────────────────────────────────────────────
export function generateTotpSecret() {
  return crypto.randomBytes(20).toString('hex').toUpperCase();
}

function hotp(secret, counter) {
  const key  = Buffer.from(secret, 'hex');
  const msg  = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmacVal = crypto.createHmac('sha1', key).update(msg).digest();
  const offset  = hmacVal[hmacVal.length - 1] & 0x0f;
  const code    = ((hmacVal[offset] & 0x7f) << 24)
                | (hmacVal[offset + 1] << 16)
                | (hmacVal[offset + 2] << 8)
                |  hmacVal[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

export function generateTotp(secret, window = 0) {
  const counter = Math.floor(Date.now() / 30_000) + window;
  return hotp(secret, counter);
}

export function verifyTotp(secret, code) {
  for (const w of [-1, 0, 1]) {
    if (hotp(secret, Math.floor(Date.now() / 30_000) + w) === code) return true;
  }
  return false;
}

export function totpUri(secret, account, issuer = 'NexusAIPro') {
  const base32 = Buffer.from(secret, 'hex').toString('base64').replace(/=/g, '');
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${base32}&issuer=${encodeURIComponent(issuer)}`;
}

// ── MFA challenge registry (in-memory; production: Redis) ─────────────────
const mfaChallenges = new Map();

export function createMfaChallenge(userId, method) {
  const code     = String(crypto.randomInt(100000, 999999));
  const id       = uuidv4();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
  mfaChallenges.set(id, { userId, code, method, expiresAt, used: false });
  return { challengeId: id, code }; // In prod: send code via SMS/email instead of returning
}

export function verifyMfaChallenge(challengeId, code) {
  const ch = mfaChallenges.get(challengeId);
  if (!ch || ch.used || Date.now() > ch.expiresAt) return false;
  if (ch.code !== code) return false;
  ch.used = true;
  return true;
}

// ── Biometric credential registry (server-side stub) ──────────────────────
// Client-side biometrics use WebAuthn / Capacitor biometric APIs.
// Server stores credential IDs and public key material only.
const biometricCredentials = new Map(); // userId → [{ id, publicKey, type }]

export function registerBiometric(userId, credentialId, publicKey, type) {
  const existing = biometricCredentials.get(userId) || [];
  existing.push({ id: credentialId, publicKey, type, createdAt: new Date().toISOString() });
  biometricCredentials.set(userId, existing);
  return { registered: true, count: existing.length };
}

export function getBiometricCredentials(userId) {
  return biometricCredentials.get(userId) || [];
}

// ── Session store (in-memory; production: Redis) ───────────────────────────
const sessions = new Map();

export function createSession(userId, role, metadata = {}) {
  const sessionId = uuidv4();
  const now = Date.now();
  sessions.set(sessionId, {
    id: sessionId,
    userId,
    role,
    metadata,
    createdAt: now,
    lastActive: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 h
  });
  return sessionId;
}

export function getSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s || Date.now() > s.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  s.lastActive = Date.now();
  return s;
}

export function destroySession(sessionId) {
  sessions.delete(sessionId);
}

// ── RBAC permission check ──────────────────────────────────────────────────
export function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;
  // wildcard prefix check: 'read:*' grants 'read:users'
  const [action] = permission.split(':');
  return perms.some(p => p === `${action}:*`);
}

// ── Username validation (emoji + special chars allowed) ───────────────────
export function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, error: 'Username must be a string' };
  const length = [...username].length; // Correct emoji-aware length
  if (length < 2 || length > 32) return { valid: false, error: 'Username must be 2–32 characters' };
  // Allow unicode letters, digits, underscores, hyphens, dots, and emoji (no control chars)
  if (/[ -]/.test(username)) return { valid: false, error: 'Username contains invalid characters' };
  return { valid: true };
}

// ── In-memory user store (production: PostgreSQL/Redis) ───────────────────
const users = new Map();

export function createUser({ id, email, username, passwordHash, role = ROLES.USER, metadata = {} }) {
  if (users.has(id)) throw new Error('User already exists');
  const now = new Date().toISOString();
  const user = {
    id,
    email: email.toLowerCase().trim(),
    username,
    passwordHash,
    role,
    metadata,
    mfaEnabled: false,
    totpSecret: null,
    biometricEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  };
  users.set(id, user);
  return sanitizeUser(user);
}

export function getUserById(id) {
  const u = users.get(id);
  return u ? sanitizeUser(u) : null;
}

export function getUserByEmail(email) {
  const norm = email.toLowerCase().trim();
  for (const u of users.values()) {
    if (u.email === norm) return u;
  }
  return null;
}

export function sanitizeUser(user) {
  const { passwordHash, totpSecret, ...safe } = user;
  return safe;
}

export function updateUser(id, updates) {
  const u = users.get(id);
  if (!u) return null;
  Object.assign(u, updates, { updatedAt: new Date().toISOString() });
  users.set(id, u);
  return sanitizeUser(u);
}

// expose internal store for server-side use (read-only access pattern)
export { users as _users };

export default {
  ROLES,
  ROLE_PERMISSIONS,
  PASSWORD_POLICY,
  validatePassword,
  passwordStrength,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  totpUri,
  createMfaChallenge,
  verifyMfaChallenge,
  registerBiometric,
  getBiometricCredentials,
  createSession,
  getSession,
  destroySession,
  hasPermission,
  validateUsername,
  createUser,
  getUserById,
  getUserByEmail,
  sanitizeUser,
  updateUser,
};
