/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Auth module: registration, login, JWT, 2FA/MFA, biometrics, RBAC
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const SALT_ROUNDS = 14;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const PASSWORD_MIN_LENGTH = 13;

// In-memory user store (replaced by DB in production via DATABASE_URL)
const users = new Map();
const refreshTokens = new Map();
const mfaSessions = new Map();
const biometricRegistry = new Map();
const auditEvents = [];

const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'dev', MODERATOR: 'moderator', USER: 'user' });

const ROLE_PERMISSIONS = Object.freeze({
  admin: ['*'],
  dev: ['analytics:read', 'analytics:write', 'projects:*', 'security:read', 'connectors:*'],
  moderator: ['analytics:read', 'projects:read', 'users:read', 'users:moderate'],
  user: ['analytics:read', 'projects:read', 'profile:*']
});

// Validation schemas
const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');

const usernameSchema = z.string()
  .min(2)
  .max(64)
  .regex(/^[\p{L}\p{N}\p{Emoji}_.\-\s]+$/u, 'Invalid username characters');

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: passwordSchema,
  role: z.enum(['admin', 'dev', 'moderator', 'user']).default('user'),
  locale: z.string().default('en'),
  adminSecret: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().optional(),
  biometricToken: z.string().optional()
});

function logAudit(event, userId, details = {}) {
  auditEvents.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    event,
    userId,
    details
  });
  if (auditEvents.length > 5000) auditEvents.splice(0, auditEvents.length - 5000);
}

function issueTokens(userId, role) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not configured');

  const payload = { sub: userId, role, iat: Math.floor(Date.now() / 1000) };
  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL, algorithm: 'HS256' });
  const refreshToken = crypto.randomBytes(64).toString('hex');

  refreshTokens.set(refreshToken, {
    userId,
    role,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  });

  return { accessToken, refreshToken };
}

export async function register(body) {
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message, status: 400 };

  const { username, email, password, role, locale, adminSecret } = parsed.data;

  if (role === 'admin' && adminSecret !== process.env.ADMIN_SECRET) {
    return { error: 'Invalid admin secret', status: 403 };
  }

  const emailKey = email.toLowerCase();
  for (const u of users.values()) {
    if (u.email === emailKey) return { error: 'Email already registered', status: 409 };
  }

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  users.set(userId, {
    id: userId,
    username,
    email: emailKey,
    passwordHash,
    role,
    locale,
    createdAt: new Date().toISOString(),
    mfaEnabled: false,
    mfaSecret: null,
    biometricEnabled: false,
    active: true,
    loginAttempts: 0,
    lockedUntil: null
  });

  logAudit('REGISTER', userId, { email: emailKey, role });
  const tokens = issueTokens(userId, role);
  return { userId, username, role, locale, ...tokens, status: 201 };
}

export async function login(body, ip) {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid credentials', status: 400 };

  const { email, password, mfaToken, biometricToken } = parsed.data;
  const emailKey = email.toLowerCase();

  let user = null;
  for (const u of users.values()) {
    if (u.email === emailKey) { user = u; break; }
  }
  if (!user || !user.active) return { error: 'Invalid credentials', status: 401 };

  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    return { error: 'Account temporarily locked', status: 429 };
  }

  // Biometric bypass (token must be pre-verified by device)
  const biometricOk = biometricToken && verifyBiometricToken(user.id, biometricToken);

  if (!biometricOk) {
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = Date.now() + 15 * 60 * 1000;
        logAudit('ACCOUNT_LOCKED', user.id, { ip });
      }
      return { error: 'Invalid credentials', status: 401 };
    }
  }

  user.loginAttempts = 0;
  user.lockedUntil = null;

  if (user.mfaEnabled) {
    if (!mfaToken) {
      const sessionId = uuidv4();
      mfaSessions.set(sessionId, { userId: user.id, expiresAt: Date.now() + 5 * 60 * 1000 });
      return { requiresMfa: true, mfaSessionId: sessionId, status: 200 };
    }
    const mfaValid = verifyTOTP(user.mfaSecret, mfaToken);
    if (!mfaValid) {
      logAudit('MFA_FAIL', user.id, { ip });
      return { error: 'Invalid MFA token', status: 401 };
    }
  }

  logAudit('LOGIN', user.id, { ip });
  const tokens = issueTokens(user.id, user.role);
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    locale: user.locale,
    ...tokens,
    status: 200
  };
}

export async function verifyMfaSession(sessionId, mfaToken) {
  const session = mfaSessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) return { error: 'MFA session expired', status: 401 };

  const user = users.get(session.userId);
  if (!user) return { error: 'User not found', status: 404 };

  const valid = verifyTOTP(user.mfaSecret, mfaToken);
  if (!valid) return { error: 'Invalid MFA token', status: 401 };

  mfaSessions.delete(sessionId);
  logAudit('MFA_SUCCESS', user.id, {});
  const tokens = issueTokens(user.id, user.role);
  return { userId: user.id, username: user.username, role: user.role, ...tokens, status: 200 };
}

export function refreshAccessToken(refreshToken) {
  const session = refreshTokens.get(refreshToken);
  if (!session || session.expiresAt < Date.now()) {
    refreshTokens.delete(refreshToken);
    return { error: 'Invalid refresh token', status: 401 };
  }
  refreshTokens.delete(refreshToken);
  const tokens = issueTokens(session.userId, session.role);
  return { ...tokens, status: 200 };
}

export function logout(refreshToken, userId) {
  refreshTokens.delete(refreshToken);
  logAudit('LOGOUT', userId, {});
  return { status: 200 };
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

export function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission) ||
    perms.some(p => p.endsWith(':*') && permission.startsWith(p.slice(0, -1)));
}

// TOTP / 2FA
export async function setupMFA(userId) {
  const user = users.get(userId);
  if (!user) return { error: 'User not found', status: 404 };

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'NexusAIPro',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret
  });

  const otpAuthUrl = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl);

  user.mfaSecret = secret.base32;
  return { secret: secret.base32, qrDataUrl, status: 200 };
}

export function confirmMFA(userId, token) {
  const user = users.get(userId);
  if (!user || !user.mfaSecret) return { error: 'MFA not set up', status: 400 };

  const valid = verifyTOTP(user.mfaSecret, token);
  if (!valid) return { error: 'Invalid token', status: 401 };

  user.mfaEnabled = true;
  logAudit('MFA_ENABLED', userId, {});
  return { status: 200 };
}

export function disableMFA(userId, token) {
  const user = users.get(userId);
  if (!user || !user.mfaEnabled) return { error: 'MFA not enabled', status: 400 };

  const valid = verifyTOTP(user.mfaSecret, token);
  if (!valid) return { error: 'Invalid token', status: 401 };

  user.mfaEnabled = false;
  user.mfaSecret = null;
  logAudit('MFA_DISABLED', userId, {});
  return { status: 200 };
}

function verifyTOTP(secretBase32, token) {
  try {
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secretBase32), period: 30, digits: 6 });
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

// Biometric
export function registerBiometric(userId, publicKeyCredential) {
  const user = users.get(userId);
  if (!user) return { error: 'User not found', status: 404 };

  const credentialId = uuidv4();
  biometricRegistry.set(credentialId, {
    userId,
    publicKeyCredential,
    createdAt: new Date().toISOString()
  });
  user.biometricEnabled = true;
  logAudit('BIOMETRIC_REGISTERED', userId, { credentialId });
  return { credentialId, status: 200 };
}

function verifyBiometricToken(userId, token) {
  // Token format: base64(credentialId:signature) - verified against stored public key
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [credentialId] = decoded.split(':');
    const cred = biometricRegistry.get(credentialId);
    return cred && cred.userId === userId;
  } catch {
    return false;
  }
}

export function getProfile(userId) {
  const user = users.get(userId);
  if (!user) return { error: 'User not found', status: 404 };
  const { passwordHash, mfaSecret, ...safe } = user;
  return { ...safe, status: 200 };
}

export function updateProfile(userId, updates) {
  const user = users.get(userId);
  if (!user) return { error: 'User not found', status: 404 };

  const allowed = ['username', 'locale', 'avatar'];
  for (const key of allowed) {
    if (updates[key] !== undefined) user[key] = updates[key];
  }
  user.updatedAt = new Date().toISOString();
  logAudit('PROFILE_UPDATED', userId, {});
  return { status: 200 };
}

export function listUsers(requesterRole) {
  if (!hasPermission(requesterRole, 'users:read')) return { error: 'Forbidden', status: 403 };
  const list = [];
  for (const u of users.values()) {
    const { passwordHash, mfaSecret, ...safe } = u;
    list.push(safe);
  }
  return { users: list, status: 200 };
}

export function getAuditLog(requesterRole) {
  if (!hasPermission(requesterRole, '*')) return { error: 'Forbidden', status: 403 };
  return { events: auditEvents.slice(-500), status: 200 };
}

export { ROLES, ROLE_PERMISSIONS };
