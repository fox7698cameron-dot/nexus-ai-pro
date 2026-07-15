/**
 * src/utils/validation.js
 * Nexus AI Pro — Input Validation Utilities
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Handles emoji, special characters, multi-script usernames.
 * All validation is Unicode-aware and safe against ReDoS.
 */

// ─── Password ──────────────────────────────────────────────────────────────────

const PASSWORD_MIN = 13;

const PASSWORD_CHECKS = [
  { label: 'length',    test: p => p.length >= PASSWORD_MIN,                    weight: 2 },
  { label: 'upper',     test: p => /[A-Z]/.test(p),                             weight: 1 },
  { label: 'lower',     test: p => /[a-z]/.test(p),                             weight: 1 },
  { label: 'digit',     test: p => /[0-9]/.test(p),                             weight: 1 },
  { label: 'special',   test: p => /[^A-Za-z0-9]/.test(p),                      weight: 2 },
  { label: 'long',      test: p => p.length >= 20,                              weight: 1 },
  { label: 'entropy',   test: p => new Set(p).size >= 8,                        weight: 1 },
];

/**
 * Returns { score: 0-9, level: 'weak'|'fair'|'strong'|'very-strong', failed: string[] }
 */
export function validatePasswordStrength(password) {
  const failed = [];
  let score = 0;

  for (const check of PASSWORD_CHECKS) {
    if (check.test(password)) {
      score += check.weight;
    } else {
      failed.push(check.label);
    }
  }

  let level;
  if (score < 3)       level = 'weak';
  else if (score < 5)  level = 'fair';
  else if (score < 7)  level = 'strong';
  else                 level = 'very-strong';

  const valid = !failed.includes('length') && !failed.includes('upper') &&
                !failed.includes('lower') && !failed.includes('digit') &&
                !failed.includes('special');

  return { score, level, failed, valid, minLength: PASSWORD_MIN };
}

// ─── Username ─────────────────────────────────────────────────────────────────

const USERNAME_MIN = 2;
const USERNAME_MAX = 32;

// Allowed: letters (any script), digits, emoji, _ . - and spaces
// Blocked: control chars, zero-width chars, directional overrides
const BLOCKED_USERNAME_RE = /[\u0000-\u001f\u007f\u200b-\u200d\u2028\u2029\ufeff\u202a-\u202e]/u;

export function validateUsername(username) {
  const errors = [];

  if (typeof username !== 'string') {
    return { valid: false, errors: ['Username must be a string'] };
  }

  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN) {
    errors.push(`Username must be at least ${USERNAME_MIN} characters`);
  }
  if (trimmed.length > USERNAME_MAX) {
    errors.push(`Username must be at most ${USERNAME_MAX} characters`);
  }
  if (BLOCKED_USERNAME_RE.test(trimmed)) {
    errors.push('Username contains disallowed control characters');
  }
  if (/^\s|\s$/.test(username)) {
    errors.push('Username cannot start or end with whitespace');
  }

  return { valid: errors.length === 0, errors, sanitized: trimmed };
}

// ─── Email ────────────────────────────────────────────────────────────────────

// RFC-5322-ish simple validator — no ReDoS risk
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,63}$/u;

export function validateEmail(email) {
  if (typeof email !== 'string') return { valid: false, error: 'Email must be a string' };
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return { valid: false, error: 'Invalid email address' };
  return { valid: true, sanitized: trimmed };
}

// ─── Display name ─────────────────────────────────────────────────────────────

export function validateDisplayName(name) {
  const errors = [];
  if (typeof name !== 'string') return { valid: false, errors: ['Name must be a string'] };
  const trimmed = name.trim();
  if (trimmed.length < 1)  errors.push('Display name cannot be empty');
  if (trimmed.length > 50) errors.push('Display name must be at most 50 characters');
  if (BLOCKED_USERNAME_RE.test(trimmed)) errors.push('Display name contains disallowed characters');
  return { valid: errors.length === 0, errors, sanitized: trimmed };
}

// ─── General sanitizers ───────────────────────────────────────────────────────

/** Strip HTML tags and JS event handlers. Keeps plain text + emoji. */
export function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/** Ensure a value is within an allowed set (enumeration safety). */
export function enumCheck(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

/** Clamp a numeric value to [min, max]. */
export function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Safe JSON parse — returns null on error. */
export function safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

// ─── Role / permission guard ──────────────────────────────────────────────────

export const VALID_ROLES = ['user', 'moderator', 'developer', 'admin'];
export const ROLE_LEVELS = { user: 0, moderator: 1, developer: 2, admin: 3 };

export function validateRole(role) {
  return enumCheck(role, VALID_ROLES, 'user');
}

export function hasPermission(userRole, requiredRole) {
  return (ROLE_LEVELS[userRole] ?? -1) >= (ROLE_LEVELS[requiredRole] ?? 999);
}

// ─── Phone / MFA ─────────────────────────────────────────────────────────────

export function validateTOTPCode(code) {
  if (typeof code !== 'string') return false;
  return /^\d{6}$/.test(code.trim());
}

export function validateBackupCode(code) {
  if (typeof code !== 'string') return false;
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code.trim().toUpperCase());
}

// ─── Content type whitelist ───────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
export const ALLOWED_DOC_TYPES   = ['application/pdf', 'text/plain', 'text/csv', 'application/json'];
export const ALLOWED_UPLOAD_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

export function validateMimeType(mime, allowed = ALLOWED_UPLOAD_TYPES) {
  return allowed.includes(mime);
}
