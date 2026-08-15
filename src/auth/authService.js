/**
 * src/auth/authService.js
 * Auth utilities - password validation, MFA, roles.
 * Date: 2026-08-15
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

// --- Password validation ---
const PASSWORD_MIN_LENGTH = 13;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{13,}$/;

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      message:
        'Password must contain uppercase, lowercase, a number, and a special character.',
    };
  }
  return { valid: true };
}

// --- Username validation (Unicode/emoji friendly) ---
// Usernames: 3-32 grapheme clusters; no leading/trailing space
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required.' };
  }
  const trimmed = username.trim();
  if (trimmed !== username) {
    return { valid: false, message: 'Username cannot have leading or trailing spaces.' };
  }
  // Count grapheme clusters (handles emoji correctly in Node >= 18)
  const segmenter = new Intl.Segmenter();
  const clusterCount = [...segmenter.segment(trimmed)].length;
  if (clusterCount < 3 || clusterCount > 32) {
    return {
      valid: false,
      message: 'Username must be 3-32 characters (emoji count as one).',
    };
  }
  // No internal whitespace
  if (/\s/u.test(trimmed)) {
    return { valid: false, message: 'Username cannot contain whitespace.' };
  }
  return { valid: true };
}

// --- Password strength score (0-4) ---
export function passwordStrength(password) {
  let score = 0;
  if (!password) return score;
  if (password.length >= 13) score++;
  if (password.length >= 20) score++;
  if (/[A-Z]/u.test(password) && /[a-z]/u.test(password)) score++;
  if (/\d/u.test(password)) score++;
  if (/[^a-zA-Z\d\s]/u.test(password)) score++;
  return Math.min(score, 4);
}

// --- TOTP / MFA helpers ---

/**
 * Generate a new TOTP secret and QR code data URL for the given user.
 * Returns { secret, otpauth, qrDataUrl }.
 */
export async function generateMFASetup(email, appName = 'Nexus AI Pro') {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, appName, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  return { secret, otpauth, qrDataUrl };
}

/**
 * Verify a TOTP token against the stored secret.
 * Returns true/false.
 */
export function verifyTOTP(token, secret) {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

// --- Backup codes ---

/** Generate N random hex backup codes. */
export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase()
  );
}

/** Hash a backup code for storage (SHA-256). */
export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// --- Role definitions ---
export const ROLES = Object.freeze({
  USER:      'user',
  MODERATOR: 'moderator',
  DEV:       'dev',
  ADMIN:     'admin',
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.USER]:      ['read:own', 'write:own', 'analytics:social', 'projects:own'],
  [ROLES.MODERATOR]: ['read:own', 'write:own', 'analytics:social', 'projects:own',
                      'read:users', 'moderate:content'],
  [ROLES.DEV]:       ['read:own', 'write:own', 'analytics:social', 'projects:own',
                      'projects:all', 'read:users', 'read:analytics', 'read:security',
                      'write:security:scan', 'connectors:manage'],
  [ROLES.ADMIN]:     ['*'],
});

export function hasPermission(userRole, permission) {
  const perms = ROLE_PERMISSIONS[userRole] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

// --- Biometric types ---
export const BIOMETRIC_TYPES = Object.freeze({
  FINGERPRINT: 'fingerprint',
  FACE_ID:     'face_id',
  TOUCH_ID:    'touch_id',
  RETINAL:     'retinal',
});
