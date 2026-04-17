// nexus-ai-pro/src/services/auth.service.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Auth: registration, login, 2FA/MFA, biometrics, RBAC, password policy

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';

const BCRYPT_ROUNDS = 14;
const JWT_EXPIRY = '15m';
const REFRESH_EXPIRY = '30d';
const PASSWORD_MIN_LEN = 13;

// Validated roles in ascending privilege order
export const ROLES = Object.freeze({
  USER: 'user',
  MODERATOR: 'moderator',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
});

const ROLE_RANK = { user: 0, moderator: 1, developer: 2, admin: 3, superadmin: 4 };

// ── Password Policy ──────────────────────────────────────────
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;
const SPECIAL_CHAR_RE = /[\W_]/;

export function validatePassword(password) {
  if (typeof password !== 'string') return { ok: false, reason: 'Password must be a string' };
  if (password.length < PASSWORD_MIN_LEN) return { ok: false, reason: `Minimum ${PASSWORD_MIN_LEN} characters required` };
  if (!/[A-Z]/.test(password)) return { ok: false, reason: 'Requires at least one uppercase letter' };
  if (!/[a-z]/.test(password)) return { ok: false, reason: 'Requires at least one lowercase letter' };
  if (!/\d/.test(password)) return { ok: false, reason: 'Requires at least one digit' };
  if (!SPECIAL_CHAR_RE.test(password)) return { ok: false, reason: 'Requires at least one special character' };
  return { ok: true };
}

export function passwordStrengthScore(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 13) score++;
  if (password.length >= 18) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (SPECIAL_CHAR_RE.test(password)) score++;
  if (/[\u{1F000}-\u{1FFFF}]/u.test(password)) score++;  // emoji bonus
  return Math.min(score, 7);
}

// ── Username Policy ──────────────────────────────────────────
// Allows Unicode letters, digits, underscores, hyphens, periods, and emoji
const USERNAME_RE = /^[\p{L}\p{N}_.@\-\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]{2,50}$/u;

export function validateUsername(username) {
  if (typeof username !== 'string') return { ok: false, reason: 'Username must be a string' };
  if (!USERNAME_RE.test(username)) return { ok: false, reason: 'Username 2–50 chars; letters, digits, _, -, ., @, emoji allowed' };
  return { ok: true };
}

// ── Password Hashing ─────────────────────────────────────────
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ── JWT ──────────────────────────────────────────────────────
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is required');
  return secret;
}

export function signAccessToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRY,
    issuer: 'nexus-ai-pro',
    jwtid: crypto.randomUUID(),
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: REFRESH_EXPIRY,
    issuer: 'nexus-ai-pro',
    jwtid: crypto.randomUUID(),
  });
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret(), { issuer: 'nexus-ai-pro' });
}

export function hashTokenForStorage(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── TOTP (2FA) ────────────────────────────────────────────────
export function generateTotpSecret() {
  return authenticator.generateSecret(32);
}

export function generateTotpUri(secret, email, issuer = 'Nexus AI Pro') {
  return authenticator.keyuri(email, issuer, secret);
}

export function verifyTotp(token, secret) {
  return authenticator.verify({ token, secret });
}

// ── Backup Codes ─────────────────────────────────────────────
export function generateBackupCodes(count = 10) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})/, '$1-')
  );
}

export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.replace(/-/g, '').toUpperCase()).digest('hex');
}

// ── Biometric / WebAuthn stubs ────────────────────────────────
// Full WebAuthn implementation requires @simplewebauthn/server at the route layer.
// These helpers normalize credential storage.
export function serializeCredential(credential) {
  return {
    credentialId: credential.id,
    publicKey: Buffer.from(credential.response.publicKey).toString('base64url'),
    signCount: credential.response.authenticatorData?.signCount ?? 0,
    deviceType: credential.type ?? 'platform',
  };
}

// ── RBAC ─────────────────────────────────────────────────────
export function hasRole(userRole, requiredRole) {
  return (ROLE_RANK[userRole] ?? -1) >= (ROLE_RANK[requiredRole] ?? 999);
}

export function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasRole(req.user.role, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ── Auth Middleware ───────────────────────────────────────────
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bearer token required' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Email Verification Token ──────────────────────────────────
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Secure random OTP (SMS / email fallback) ─────────────────
export function generateNumericOtp(digits = 6) {
  const max = Math.pow(10, digits);
  const buf = crypto.randomBytes(4).readUInt32BE(0);
  return String(buf % max).padStart(digits, '0');
}
