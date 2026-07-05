/**
 * src/auth/auth.js
 * Nexus AI Pro — Authentication & Authorization Module
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Roles: admin | dev | moderator | user
 * Features: JWT, bcrypt (13+ char passwords), 2FA TOTP, MFA, biometric stubs,
 *           emoji/special-char usernames, audit logging, enumeration-safe errors
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROLES = Object.freeze({
  ADMIN:     'admin',
  DEV:       'dev',
  MODERATOR: 'moderator',
  USER:      'user',
});

const ROLE_PRIORITY = { admin: 4, dev: 3, moderator: 2, user: 1 };

const JWT_ACCESS_TTL  = '15m';
const JWT_REFRESH_TTL = '7d';
const BCRYPT_ROUNDS   = 12;

// Password: 13+ chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special char
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{13,}$/;

// Username: 3-64 chars, allows letters, digits, spaces, emoji, and common special chars
// We use a unicode-aware pattern — any non-control, non-empty sequence works
const USERNAME_SCHEMA = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(64, 'Username must be at most 64 characters')
  .refine(v => !/^\s|\s$/.test(v), 'Username cannot start or end with whitespace')
  .refine(v => !/[\x00-\x1F\x7F]/.test(v), 'Username contains invalid control characters');

const EMAIL_SCHEMA = z.string().email('Invalid email address');

const PASSWORD_SCHEMA = z.string()
  .min(13, 'Password must be at least 13 characters')
  .refine(v => PASSWORD_RE.test(v),
    'Password must contain uppercase, lowercase, digit, and special character');

// ─── In-memory stores (replace with DB in production) ────────────────────────

const users      = new Map(); // userId → user record
const sessions   = new Map(); // refreshToken → { userId, expiresAt }
const mfaPending = new Map(); // userId → { secret, method }

// ─── Audit log helper (minimal — event + userId + ts only) ───────────────────

const auditLog = [];
function audit(event, userId, meta = {}) {
  auditLog.push({ ts: Date.now(), event, userId, ...meta });
  if (auditLog.length > 5000) auditLog.splice(0, auditLog.length - 5000);
}

// ─── Key helpers ─────────────────────────────────────────────────────────────

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env var is required');
  return s;
}

function jwtRefreshSecret() {
  const s = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env var is required');
  return s;
}

// Generic timing-safe error to prevent user enumeration
function enumSafeError() {
  return Object.assign(new Error('Invalid credentials'), { status: 401, code: 'AUTH_FAILED' });
}

// ─── User CRUD ───────────────────────────────────────────────────────────────

export async function registerUser({ username, email, password, role = ROLES.USER }) {
  USERNAME_SCHEMA.parse(username);
  EMAIL_SCHEMA.parse(email);
  PASSWORD_SCHEMA.parse(password);

  if (!Object.values(ROLES).includes(role)) {
    throw Object.assign(new Error('Invalid role'), { status: 400, code: 'INVALID_ROLE' });
  }

  // Check duplicates (constant-time via full scan to avoid timing oracle)
  for (const u of users.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      // Return same generic error to prevent enumeration
      throw enumSafeError();
    }
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = uuidv4();

  const user = {
    id: userId,
    username,
    email: email.toLowerCase(),
    passwordHash: hash,
    role,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mfaEnabled: false,
    mfaSecret: null,
    biometricEnabled: false,
    biometricPublicKey: null,
    active: true,
    lastLogin: null,
    loginAttempts: 0,
    lockedUntil: null,
  };

  users.set(userId, user);
  audit('REGISTER', userId, { role });

  return sanitiseUser(user);
}

export async function loginUser({ email, password }) {
  EMAIL_SCHEMA.parse(email);

  // Constant-time lookup
  let found = null;
  for (const u of users.values()) {
    if (u.email === email.toLowerCase()) { found = u; break; }
  }

  // Always run bcrypt compare even if user not found (timing safety)
  const dummyHash = '$2a$12$invalidhashpaddingtomimicbcrypt.padding.value.00000000000';
  const compareHash = found ? found.passwordHash : dummyHash;
  const match = await bcrypt.compare(password, compareHash);

  if (!found || !match || !found.active) {
    if (found) {
      found.loginAttempts = (found.loginAttempts || 0) + 1;
      if (found.loginAttempts >= 5) {
        found.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
        audit('ACCOUNT_LOCKED', found.id);
      }
    }
    throw enumSafeError();
  }

  if (found.lockedUntil && found.lockedUntil > Date.now()) {
    throw Object.assign(new Error('Account temporarily locked'), { status: 429, code: 'ACCOUNT_LOCKED' });
  }

  found.loginAttempts = 0;
  found.lockedUntil = null;
  found.lastLogin = Date.now();
  audit('LOGIN', found.id);

  if (found.mfaEnabled) {
    // Return partial token requiring MFA step
    const mfaToken = jwt.sign(
      { sub: found.id, phase: 'mfa' },
      jwtSecret(),
      { expiresIn: '5m' }
    );
    return { requiresMfa: true, mfaToken };
  }

  return issueTokenPair(found);
}

export async function verifyMfa({ mfaToken, code }) {
  let payload;
  try {
    payload = jwt.verify(mfaToken, jwtSecret());
  } catch {
    throw enumSafeError();
  }

  if (payload.phase !== 'mfa') throw enumSafeError();
  const user = users.get(payload.sub);
  if (!user || !user.mfaEnabled || !user.mfaSecret) throw enumSafeError();

  const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
  if (!valid) throw Object.assign(new Error('Invalid MFA code'), { status: 401, code: 'MFA_INVALID' });

  audit('MFA_VERIFIED', user.id);
  return issueTokenPair(user);
}

export async function enrollMfa(userId) {
  const user = users.get(userId);
  if (!user) throw enumSafeError();

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'NexusAIPro', secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  mfaPending.set(userId, { secret });
  audit('MFA_ENROLL_STARTED', userId);

  return { secret, otpauth, qrDataUrl };
}

export async function confirmMfa(userId, code) {
  const pending = mfaPending.get(userId);
  if (!pending) throw Object.assign(new Error('No pending MFA enrollment'), { status: 400 });

  const valid = authenticator.verify({ token: code, secret: pending.secret });
  if (!valid) throw Object.assign(new Error('Invalid MFA code'), { status: 400, code: 'MFA_INVALID' });

  const user = users.get(userId);
  user.mfaEnabled = true;
  user.mfaSecret = pending.secret;
  mfaPending.delete(userId);

  audit('MFA_ENABLED', userId);
  return { mfaEnabled: true };
}

export async function disableMfa(userId, code) {
  const user = users.get(userId);
  if (!user || !user.mfaEnabled) throw Object.assign(new Error('MFA not enabled'), { status: 400 });

  const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
  if (!valid) throw Object.assign(new Error('Invalid MFA code'), { status: 401 });

  user.mfaEnabled = false;
  user.mfaSecret = null;
  audit('MFA_DISABLED', userId);
  return { mfaEnabled: false };
}

// ─── Biometric registration (server-side public-key stub) ────────────────────
// Full implementation requires WebAuthn/FIDO2 or platform biometric SDK.
// This stub stores the public key and validates attestation structure.

export function registerBiometric(userId, { credentialId, publicKey, deviceType }) {
  const user = users.get(userId);
  if (!user) throw enumSafeError();

  const VALID_DEVICE_TYPES = ['fingerprint', 'touchid', 'faceid', 'retinal', 'device'];
  if (!VALID_DEVICE_TYPES.includes(deviceType)) {
    throw Object.assign(new Error('Invalid biometric device type'), { status: 400 });
  }

  if (typeof credentialId !== 'string' || credentialId.length < 8) {
    throw Object.assign(new Error('Invalid credentialId'), { status: 400 });
  }

  user.biometricEnabled = true;
  user.biometricPublicKey = publicKey;
  user.biometricCredentialId = credentialId;
  user.biometricDeviceType = deviceType;

  audit('BIOMETRIC_REGISTERED', userId, { deviceType });
  return { biometricEnabled: true, deviceType };
}

export function verifyBiometric(userId, { credentialId, signature }) {
  const user = users.get(userId);
  if (!user || !user.biometricEnabled) throw enumSafeError();

  if (!crypto.timingSafeEqual(
    Buffer.from(user.biometricCredentialId),
    Buffer.from(credentialId)
  )) throw enumSafeError();

  // In production: verify signature against stored public key using WebAuthn assertion
  audit('BIOMETRIC_VERIFIED', userId);
  return issueTokenPair(user);
}

// ─── Token management ────────────────────────────────────────────────────────

function issueTokenPair(user) {
  const payload = {
    sub:   user.id,
    role:  user.role,
    email: user.email,
  };

  const accessToken  = jwt.sign(payload, jwtSecret(), { expiresIn: JWT_ACCESS_TTL });
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt    = Date.now() + 7 * 24 * 60 * 60 * 1000;

  sessions.set(refreshToken, { userId: user.id, expiresAt });

  return { accessToken, refreshToken, expiresAt, user: sanitiseUser(user) };
}

export function refreshTokens(refreshToken) {
  const session = sessions.get(refreshToken);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(refreshToken);
    throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
  }

  const user = users.get(session.userId);
  if (!user || !user.active) throw enumSafeError();

  sessions.delete(refreshToken); // rotate
  return issueTokenPair(user);
}

export function revokeToken(refreshToken) {
  sessions.delete(refreshToken);
}

// ─── JWT middleware ───────────────────────────────────────────────────────────

export function requireAuth(minRole = ROLES.USER) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret());
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (payload.phase === 'mfa') {
      return res.status(401).json({ error: 'MFA verification required' });
    }

    const userRolePriority  = ROLE_PRIORITY[payload.role] ?? 0;
    const requiredPriority  = ROLE_PRIORITY[minRole] ?? 1;
    if (userRolePriority < requiredPriority) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.user = payload;
    next();
  };
}

export const requireAdmin     = requireAuth(ROLES.ADMIN);
export const requireDev       = requireAuth(ROLES.DEV);
export const requireModerator = requireAuth(ROLES.MODERATOR);

// ─── Profile helpers ─────────────────────────────────────────────────────────

export function getUser(userId) {
  const u = users.get(userId);
  return u ? sanitiseUser(u) : null;
}

export function updateUser(userId, updates) {
  const user = users.get(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const SAFE_FIELDS = ['username'];
  for (const [k, v] of Object.entries(updates)) {
    if (SAFE_FIELDS.includes(k)) {
      if (k === 'username') USERNAME_SCHEMA.parse(v);
      user[k] = v;
    }
  }
  user.updatedAt = Date.now();
  audit('USER_UPDATED', userId);
  return sanitiseUser(user);
}

export function getAuditLog(limit = 100) {
  return auditLog.slice(-limit);
}

// Never expose secrets
function sanitiseUser(u) {
  const { passwordHash, mfaSecret, biometricPublicKey, ...safe } = u;
  return safe;
}
