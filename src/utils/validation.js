/**
 * src/utils/validation.js
 * Input Validation & Password Strength Utilities
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Supports Unicode usernames (emoji, special chars), strong passwords,
 * and multi-platform email validation.
 */

// ─── Password Validation ─────────────────────────────────────────────────────

const MIN_PASSWORD_LENGTH = 13;

/**
 * Validate password strength.
 * Requirements: 13+ chars, uppercase, lowercase, number, special character.
 *
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[], score: number }}
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'], score: 0 };
  }

  // Use Unicode-aware length (handles emoji as single chars)
  const chars = [...password]; // spread splits on Unicode code points
  if (chars.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (!/[A-Z]/.test(password))          errors.push('Must contain at least one uppercase letter');
  if (!/[a-z]/.test(password))          errors.push('Must contain at least one lowercase letter');
  if (!/[0-9]/.test(password))          errors.push('Must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password))  errors.push('Must contain at least one special character');

  // Score 0-100
  let score = 0;
  if (chars.length >= MIN_PASSWORD_LENGTH)      score += 25;
  if (chars.length >= 20)                       score += 10;
  if (/[A-Z]/.test(password))                  score += 15;
  if (/[a-z]/.test(password))                  score += 15;
  if (/[0-9]/.test(password))                  score += 15;
  if (/[^A-Za-z0-9]/.test(password))           score += 20;

  return {
    valid: errors.length === 0,
    errors,
    score: Math.min(100, score),
    strength: score >= 85 ? 'strong' : score >= 60 ? 'medium' : 'weak',
  };
}

// ─── Username Validation ─────────────────────────────────────────────────────

/**
 * Validate a username.
 * Allows Unicode letters, numbers, emoji, underscores, hyphens, and dots.
 * Min 2, max 64 Unicode characters (not bytes).
 *
 * @param {string} username
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const chars = [...username]; // Unicode-aware

  if (chars.length < 2)  return { valid: false, error: 'Username must be at least 2 characters' };
  if (chars.length > 64) return { valid: false, error: 'Username must be at most 64 characters' };

  // Disallow control characters and newlines
  if (/[\x00-\x1F\x7F]/.test(username)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }

  // Disallow null bytes
  if (username.includes('\0')) {
    return { valid: false, error: 'Username contains invalid characters' };
  }

  return { valid: true };
}

// ─── Email Validation ────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

/**
 * Basic email validation (not an exhaustive RFC 5322 parser).
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email address format' };
  }

  return { valid: true, normalized: trimmed };
}

// ─── Generic Guards ──────────────────────────────────────────────────────────

/**
 * Assert that a required field is present and a non-empty string.
 */
export function requireField(value, name) {
  if (value === undefined || value === null || value === '') {
    return `${name} is required`;
  }
  return null;
}

/**
 * Validate that a value is one of the allowed enum values.
 */
export function validateEnum(value, allowed, name) {
  if (!allowed.includes(value)) {
    return `${name} must be one of: ${allowed.join(', ')}`;
  }
  return null;
}

/**
 * Collect all validation errors and return them, or call next().
 * For use in Express routes.
 *
 * @param {string[]} errors
 * @param {import('express').Response} res
 * @returns {boolean} true if errors were returned (caller should stop)
 */
export function returnValidationErrors(errors, res) {
  const filtered = errors.filter(Boolean);
  if (filtered.length === 0) return false;
  res.status(400).json({ error: 'Validation failed', details: filtered });
  return true;
}
