// src/auth/authService.js
// 2026-07-22 | Authentication & authorization service — JWT, bcrypt, RBAC, MFA

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
});

export const ROLE_HIERARCHY = { admin: 4, dev: 3, moderator: 2, user: 1 };

const PASSWORD_MIN_LENGTH = 13;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{13,}$/;

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

// ─── Password validation ──────────────────────────────────────────────────────

export function validatePasswordStrength(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string' };
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return {
      valid: false,
      reason: 'Password must contain uppercase, lowercase, digit, and special character',
    };
  }
  return { valid: true };
}

// ─── Username validation ──────────────────────────────────────────────────────

export function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, reason: 'Username must be a string' };
  if (username.length < 2 || username.length > 64) {
    return { valid: false, reason: 'Username must be 2–64 characters' };
  }
  // Allow letters (any Unicode), digits, underscore, hyphen, and emoji
  if (/[<>&"'/\\]/.test(username)) {
    return { valid: false, reason: 'Username contains forbidden characters' };
  }
  return { valid: true };
}

// ─── Password hashing ────────────────────────────────────────────────────────

export async function hashPassword(password) {
  return bcrypt.hash(password, 14);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env var is required');
  return s;
}

function jwtRefreshSecret() {
  const s = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  if (!s) throw new Error('JWT secret env var is required');
  return s;
}

export function signAccessToken(payload) {
  return jwt.sign(payload, jwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
    algorithm: 'HS256',
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, jwtRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, jwtRefreshSecret(), { algorithms: ['HS256'] });
}

// ─── TOTP / 2FA ───────────────────────────────────────────────────────────────

export function generateTotpSecret(username, issuer = 'NexusAIPro') {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: encodeURIComponent(username),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(
      crypto.randomBytes(20).toString('base64url').toUpperCase().slice(0, 32)
    ),
  });
  return { totp, secret: totp.secret.base32 };
}

export async function generateTotpQr(totp) {
  const uri = totp.toString();
  return QRCode.toDataURL(uri);
}

export function verifyTotp(secret, token) {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

// ─── RBAC helpers ─────────────────────────────────────────────────────────────

export function hasRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function requireRoleMiddleware(requiredRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasRole(req.user.role, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ─── Biometric challenge ──────────────────────────────────────────────────────

export function generateBiometricChallenge() {
  return crypto.randomBytes(32).toString('base64url');
}

export function verifyBiometricChallenge(challenge, signature, publicKey) {
  // WebAuthn assertion verification stub — production uses @simplewebauthn/server
  // On native (Capacitor), the native layer handles biometric auth and returns a verified token.
  // This function validates the HMAC signed challenge returned by the native bridge.
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(Buffer.from(challenge, 'base64url'));
    return verify.verify(publicKey, signature, 'base64url');
  } catch {
    return false;
  }
}

// ─── Secure token for email verification / password reset ────────────────────

export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}
