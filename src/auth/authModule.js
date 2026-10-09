// src/auth/authModule.js
// Nexus AI Pro - Authentication & Authorization Module
// Date: 2026-10-09

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '1h';
const REFRESH_EXPIRY = '30d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var must be set and at least 32 characters');
}

// In-memory stores — replace with Redis/DB in production
const userStore = new Map();        // userId → user record
const sessionStore = new Map();     // sessionId → session record
const refreshTokenStore = new Map(); // refreshToken → userId
const totpSecrets = new Map();       // userId → totp secret
const passwordResetTokens = new Map(); // token → { userId, expiresAt }
const auditLog = [];

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  MODERATOR: 'moderator',
  USER: 'user',
});

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.DEVELOPER]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1,
};

function roleAtLeast(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

function addAudit(event, data) {
  auditLog.push({
    event,
    data,
    timestamp: new Date().toISOString(),
    id: uuidv4(),
  });
  if (auditLog.length > 2000) auditLog.shift();
}

// Password strength: 13+ chars, uppercase, lowercase, digit, special
export function validatePasswordStrength(password) {
  if (!password || password.length < 13) {
    return { valid: false, reason: 'Password must be at least 13 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one digit' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

// Username allows Unicode letters, digits, underscores, hyphens, dots, and emoji
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, reason: 'Username is required' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 64) {
    return { valid: false, reason: 'Username must be 2–64 characters' };
  }
  // Disallow HTML angle brackets and null bytes; allow everything else
  if (/[<>\\u0000]/.test(trimmed)) {
    return { valid: false, reason: 'Username contains disallowed characters' };
  }
  return { valid: true, username: trimmed };
}

// ── TOTP (6-digit HOTP/TOTP) using HMAC-SHA1 ──────────────────────────────
export function generateTotpSecret() {
  return crypto.randomBytes(20).toString('hex');
}

function hotp(secret, counter) {
  const key = Buffer.from(secret, 'hex');
  const buf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff;
    tmp >>= 8;
  }
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

export function generateTotpCode(secret) {
  const counter = Math.floor(Date.now() / 30000);
  return hotp(secret, counter);
}

export function verifyTotpCode(secret, code) {
  const counter = Math.floor(Date.now() / 30000);
  // Check current and adjacent windows to handle clock skew
  for (let delta = -1; delta <= 1; delta++) {
    if (hotp(secret, counter + delta) === String(code).padStart(6, '0')) {
      return true;
    }
  }
  return false;
}

// ── USER MANAGEMENT ────────────────────────────────────────────────────────
export async function registerUser({ username, email, password, role = ROLES.USER, inviteCode }) {
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.valid) return { error: usernameCheck.reason };

  const pwCheck = validatePasswordStrength(password);
  if (!pwCheck.valid) return { error: pwCheck.reason };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Valid email is required' };
  }

  // Check duplicates
  for (const u of userStore.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return { error: 'Email already registered' };
    }
    if (u.username.toLowerCase() === usernameCheck.username.toLowerCase()) {
      return { error: 'Username taken' };
    }
  }

  // Only allow admin/moderator/developer roles via invite code
  if ([ROLES.ADMIN, ROLES.DEVELOPER, ROLES.MODERATOR].includes(role)) {
    const validCode = process.env[`INVITE_CODE_${role.toUpperCase()}`];
    if (!validCode || inviteCode !== validCode) {
      return { error: 'Invalid invite code for elevated role' };
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = uuidv4();
  const now = new Date().toISOString();

  const user = {
    id: userId,
    username: usernameCheck.username,
    email: email.toLowerCase(),
    passwordHash,
    role,
    mfaEnabled: false,
    totpEnabled: false,
    biometricEnabled: false,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    loginAttempts: 0,
    lockedUntil: null,
    preferences: { language: 'en', theme: 'dark', timezone: 'UTC' },
  };

  userStore.set(userId, user);
  addAudit('USER_REGISTERED', { userId, username: user.username, role, email });

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser };
}

export async function loginUser({ email, password, totpCode, ip }) {
  const user = [...userStore.values()].find(u => u.email === email?.toLowerCase());
  if (!user) {
    addAudit('LOGIN_FAILED', { email, reason: 'user_not_found', ip });
    return { error: 'Invalid credentials' };
  }

  // Lockout check
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return { error: 'Account temporarily locked. Try again later.' };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    userStore.set(user.id, user);
    addAudit('LOGIN_FAILED', { userId: user.id, reason: 'bad_password', ip });
    return { error: 'Invalid credentials' };
  }

  // TOTP check
  if (user.totpEnabled) {
    const secret = totpSecrets.get(user.id);
    if (!secret || !totpCode || !verifyTotpCode(secret, totpCode)) {
      addAudit('LOGIN_FAILED', { userId: user.id, reason: 'bad_totp', ip });
      return { error: 'Invalid 2FA code', requireTotp: true };
    }
  }

  // Reset lockout
  user.loginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date().toISOString();
  userStore.set(user.id, user);

  const tokens = issueTokens(user);
  addAudit('LOGIN_SUCCESS', { userId: user.id, role: user.role, ip });

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, ...tokens };
}

function issueTokens(user) {
  const sessionId = uuidv4();
  const payload = {
    sub: user.id,
    sessionId,
    role: user.role,
    username: user.username,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  const refreshToken = crypto.randomBytes(40).toString('hex');

  refreshTokenStore.set(refreshToken, { userId: user.id, sessionId, createdAt: Date.now() });
  sessionStore.set(sessionId, { userId: user.id, role: user.role, createdAt: Date.now() });

  return { accessToken, refreshToken };
}

export function refreshAccessToken(refreshToken) {
  const record = refreshTokenStore.get(refreshToken);
  if (!record) return { error: 'Invalid refresh token' };

  const user = userStore.get(record.userId);
  if (!user) return { error: 'User not found' };

  // Rotate refresh token
  refreshTokenStore.delete(refreshToken);
  const tokens = issueTokens(user);
  return tokens;
}

export function logoutUser(refreshToken, sessionId) {
  if (refreshToken) refreshTokenStore.delete(refreshToken);
  if (sessionId) sessionStore.delete(sessionId);
  return { success: true };
}

// ── TOTP SETUP ─────────────────────────────────────────────────────────────
export function setupTotp(userId) {
  const user = userStore.get(userId);
  if (!user) return { error: 'User not found' };
  const secret = generateTotpSecret();
  totpSecrets.set(userId, secret);
  return { secret, otpauthUrl: `otpauth://totp/NexusAIPro:${user.email}?secret=${secret}&issuer=NexusAIPro` };
}

export function confirmTotp(userId, code) {
  const secret = totpSecrets.get(userId);
  if (!secret) return { error: 'TOTP not set up' };
  if (!verifyTotpCode(secret, code)) return { error: 'Invalid TOTP code' };
  const user = userStore.get(userId);
  if (!user) return { error: 'User not found' };
  user.totpEnabled = true;
  user.mfaEnabled = true;
  userStore.set(userId, user);
  addAudit('TOTP_ENABLED', { userId });
  return { success: true };
}

// ── JWT MIDDLEWARE ─────────────────────────────────────────────────────────
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.sessionId = decoded.sessionId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roleAtLeast(req.user.role, minRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function getAuditLog(limit = 100, offset = 0) {
  return auditLog.slice(-(limit + offset), offset > 0 ? -offset : undefined);
}

export function getUserById(userId) {
  const user = userStore.get(userId);
  if (!user) return null;
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function getAllUsers() {
  return [...userStore.values()].map(u => {
    const { passwordHash: _, ...safe } = u;
    return safe;
  });
}

export function updateUserRole(adminId, targetUserId, newRole) {
  const admin = userStore.get(adminId);
  if (!admin || admin.role !== ROLES.ADMIN) return { error: 'Admin only' };
  const target = userStore.get(targetUserId);
  if (!target) return { error: 'User not found' };
  target.role = newRole;
  target.updatedAt = new Date().toISOString();
  userStore.set(targetUserId, target);
  addAudit('ROLE_CHANGED', { adminId, targetUserId, newRole });
  const { passwordHash: _, ...safe } = target;
  return { user: safe };
}

export function enableBiometric(userId, biometricPublicKey) {
  const user = userStore.get(userId);
  if (!user) return { error: 'User not found' };
  user.biometricEnabled = true;
  user.biometricPublicKey = biometricPublicKey;
  user.updatedAt = new Date().toISOString();
  userStore.set(userId, user);
  addAudit('BIOMETRIC_ENABLED', { userId });
  return { success: true };
}
