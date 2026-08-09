/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Client-side validators — mirrors server-side rules exactly
 * Use these before sending data to the API to give instant feedback
 * Date: 2026-08-09
 */

// ─── Password ─────────────────────────────────────────────────────────────────

const PASSWORD_MIN_LEN = 13;

/**
 * Validate a password against the platform's strength requirements.
 *
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < PASSWORD_MIN_LEN) {
    errors.push(`At least ${PASSWORD_MIN_LEN} characters required`);
  }
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter (A–Z)');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter (a–z)');
  if (!/[0-9]/.test(password)) errors.push('At least one digit (0–9)');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character or emoji');
  return { valid: errors.length === 0, errors };
}

/**
 * Score password strength from 0–5.
 *
 * @param {string} password
 * @returns {number}
 */
export function scorePassword(password) {
  let score = 0;
  if (!password) return score;
  if (password.length >= PASSWORD_MIN_LEN) score++;
  if (password.length >= 20) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 5);
}

// ─── Username ─────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[\p{L}\p{N}\p{Emoji}_.\-]{2,50}$/u;

/**
 * Validate a username (Unicode + emoji allowed).
 *
 * @param {string} username
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateUsername(username) {
  const errors = [];
  if (!username || username.trim().length < 2) {
    errors.push('Username must be at least 2 characters');
  } else if (username.trim().length > 50) {
    errors.push('Username must be 50 characters or fewer');
  } else if (!USERNAME_RE.test(username.trim())) {
    errors.push('Only letters, numbers, emoji, underscores, dots, and hyphens are allowed');
  }
  return { valid: errors.length === 0, errors };
}

// ─── Email ────────────────────────────────────────────────────────────────────

/**
 * Basic RFC 5322–compatible email validator.
 *
 * @param {string} email
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEmail(email) {
  const errors = [];
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !re.test(email)) {
    errors.push('Enter a valid email address');
  }
  return { valid: errors.length === 0, errors };
}

// ─── TOTP Token ───────────────────────────────────────────────────────────────

/**
 * Validate a 6-digit TOTP code.
 *
 * @param {string} token
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTOTP(token) {
  const errors = [];
  if (!token || !/^\d{6}$/.test(token.trim())) {
    errors.push('Enter a 6-digit code');
  }
  return { valid: errors.length === 0, errors };
}

// ─── Credit Card (Luhn) ───────────────────────────────────────────────────────

/**
 * Luhn algorithm check for card numbers.
 *
 * @param {string} number  Card number (may contain spaces/dashes)
 * @returns {boolean}
 */
export function validateCardNumber(number) {
  const digits = number.replace(/\D/g, '');
  if (!digits || digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/**
 * Detect card brand from number prefix.
 *
 * @param {string} number
 * @returns {'visa'|'mastercard'|'amex'|'discover'|'diners'|'jcb'|'unionpay'|'unknown'}
 */
export function detectCardBrand(number) {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  if (/^3(?:0[0-5]|[68])/.test(n)) return 'diners';
  if (/^(?:2131|1800|35)/.test(n)) return 'jcb';
  if (/^62/.test(n)) return 'unionpay';
  return 'unknown';
}

// ─── URL ─────────────────────────────────────────────────────────────────────

/**
 * Validate a URL is HTTPS.
 *
 * @param {string} url
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateHttpsUrl(url) {
  const errors = [];
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') errors.push('URL must use HTTPS');
  } catch {
    errors.push('Enter a valid URL (https://...)');
  }
  return { valid: errors.length === 0, errors };
}

// ─── Sanitize ─────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags from a string to prevent stored XSS.
 *
 * @param {string} input
 * @returns {string}
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').trim();
}
