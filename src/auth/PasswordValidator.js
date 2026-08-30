/**
 * @file PasswordValidator.js
 * @description Password validation utilities for Nexus AI Pro.
 *   Enforces strength requirements, detects weak patterns (keyboard walks,
 *   repetition, dates), scores passwords on a 0-100 scale, and can generate
 *   cryptographically random strong passwords.
 * @author Cameron Fox <contact@nexusai.pro>
 * @date 2026-08-30
 * @license Apache-2.0
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @module auth/PasswordValidator
 */

import crypto from 'crypto';

// ─── Common passwords list (top-20 embedded) ──────────────────────────────

/**
 * Subset of the most frequently used passwords.
 * In production, expand this to the full HIBP / SecLists dataset.
 * @type {Set<string>}
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwerty123',
  'abc123',
  'letmein',
  'admin',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'sunshine',
  'princess',
  'iloveyou',
  'passw0rd',
]);

// ─── Keyboard walk detection ──────────────────────────────────────────────

/**
 * Horizontal QWERTY keyboard rows (lower + upper + numeric row fragments).
 * Used to detect sequential keyboard-walk patterns.
 * @type {string[]}
 */
const KEYBOARD_WALKS = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '1234567890',
  'qwerty',
  'asdfgh',
  'zxcvbn',
  '!@#$%^&*()',
];

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Counts the grapheme clusters in a string for accurate Unicode length.
 * @param {string} str
 * @returns {number}
 */
function graphemeLength(str) {
  const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return [...seg.segment(str)].length;
}

/**
 * Returns true if the password (lowercased) contains a known keyboard walk
 * of length ≥ minLen.
 * @param {string} lower
 * @param {number} [minLen=4]
 * @returns {boolean}
 */
function hasKeyboardWalk(lower, minLen = 4) {
  for (const row of KEYBOARD_WALKS) {
    for (let i = 0; i <= row.length - minLen; i++) {
      const seq = row.slice(i, i + minLen);
      if (lower.includes(seq) || lower.includes(seq.split('').reverse().join('')))
        return true;
    }
  }
  return false;
}

/**
 * Returns true if any single character repeats consecutively ≥ `limit` times.
 * Operates on grapheme clusters to handle emoji repetition.
 * @param {string} password
 * @param {number} [limit=3]
 * @returns {boolean}
 */
function hasRepeatedChars(password, limit = 3) {
  const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const clusters = [...seg.segment(password)].map((s) => s.segment);
  let run = 1;
  for (let i = 1; i < clusters.length; i++) {
    run = clusters[i] === clusters[i - 1] ? run + 1 : 1;
    if (run >= limit) return true;
  }
  return false;
}

/**
 * Returns true if the password contains an obvious date pattern
 * (e.g. 19xx, 20xx, MM/DD, DDMMYYYY variants).
 * @param {string} password
 * @returns {boolean}
 */
function hasDatePattern(password) {
  // Year patterns: 19xx, 20xx
  if (/(?:19|20)\d{2}/.test(password)) return true;
  // MM/DD or DD/MM or MMDDYYYY or DDMMYYYY
  if (/\b(?:0?[1-9]|1[0-2])[\/-](?:0?[1-9]|[12]\d|3[01])/.test(password)) return true;
  // Pure digit sequences that look like dates: MMDDYYYY, YYYYMMDD
  if (/(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:19|20)\d{2}/.test(password)) return true;
  return false;
}

/**
 * Returns true if the password (lowercased) is a common dictionary word
 * or appears in the common passwords set.
 * @param {string} password
 * @returns {boolean}
 */
function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

// ─── Character class checkers ──────────────────────────────────────────────

/** @param {string} p */
const hasUppercase = (p) => /\p{Lu}/u.test(p);
/** @param {string} p */
const hasLowercase = (p) => /\p{Ll}/u.test(p);
/** @param {string} p */
const hasDigit = (p) => /\p{Nd}/u.test(p);

/**
 * Checks for a "special" character: anything that is not a Unicode letter,
 * digit, or whitespace — this naturally includes emoji and all Unicode symbols.
 * @param {string} p
 * @returns {boolean}
 */
const hasSpecial = (p) => /[^\p{L}\p{Nd}\s]/u.test(p);

// ─── Entropy estimation ────────────────────────────────────────────────────

/**
 * Estimates the character-class pool size to derive a rough entropy value.
 * @param {string} password
 * @returns {number} - pool size
 */
function estimatePool(password) {
  let pool = 0;
  if (hasUppercase(password)) pool += 26;
  if (hasLowercase(password)) pool += 26;
  if (hasDigit(password)) pool += 10;
  if (hasSpecial(password)) pool += 40; // conservative estimate
  return Math.max(pool, 1);
}

/**
 * Calculates Shannon-style entropy in bits: length × log2(pool).
 * @param {string} password
 * @returns {number}
 */
function entropyBits(password) {
  const len = graphemeLength(password);
  const pool = estimatePool(password);
  return len * Math.log2(pool);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string} [reason] - first failing requirement, if not valid
 * @property {string[]} failures - all failing checks
 */

/**
 * Validates a password against all enforced requirements.
 *
 * Requirements:
 * - Minimum 13 grapheme clusters
 * - At least one Unicode uppercase letter
 * - At least one Unicode lowercase letter
 * - At least one Unicode digit
 * - At least one non-letter/non-digit character (special/emoji)
 * - Not a common password
 *
 * @param {string} password
 * @returns {ValidationResult}
 */
export function validatePassword(password) {
  if (typeof password !== 'string') {
    return { valid: false, reason: 'Password must be a string.', failures: ['type'] };
  }

  const failures = [];

  if (graphemeLength(password) < 13)
    failures.push('min_length');

  if (!hasUppercase(password))
    failures.push('uppercase_required');

  if (!hasLowercase(password))
    failures.push('lowercase_required');

  if (!hasDigit(password))
    failures.push('digit_required');

  if (!hasSpecial(password))
    failures.push('special_char_required');

  if (isCommonPassword(password))
    failures.push('common_password');

  const REASON_MAP = {
    min_length: 'Password must be at least 13 characters long.',
    uppercase_required: 'Password must contain at least one uppercase letter.',
    lowercase_required: 'Password must contain at least one lowercase letter.',
    digit_required: 'Password must contain at least one digit.',
    special_char_required: 'Password must contain at least one special character or emoji.',
    common_password: 'Password is too common. Please choose a more unique password.',
  };

  return {
    valid: failures.length === 0,
    reason: failures.length > 0 ? REASON_MAP[failures[0]] : undefined,
    failures,
  };
}

/**
 * @typedef {Object} StrengthResult
 * @property {number} score      - 0–100
 * @property {string} label      - 'weak' | 'fair' | 'good' | 'strong' | 'enterprise'
 * @property {number} entropy    - estimated bits of entropy
 * @property {string[]} warnings - list of detected weak patterns
 */

/**
 * Calculates a password strength score and label without enforcing minimum rules.
 * Useful for live strength meters on the registration form.
 *
 * Scoring (base 0–100):
 *  - Entropy-based score (0–70 pts)
 *  - Character class bonuses (up to 20 pts)
 *  - Penalty for weak patterns (keyboard walk, repeats, dates, common)
 *
 * Labels:
 *  - 0–19  → weak
 *  - 20–39 → fair
 *  - 40–59 → good
 *  - 60–79 → strong
 *  - 80+   → enterprise
 *
 * @param {string} password
 * @returns {StrengthResult}
 */
export function getStrength(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return { score: 0, label: 'weak', entropy: 0, warnings: [] };
  }

  const lower = password.toLowerCase();
  const warnings = [];

  // ── Entropy component (0–70) ──────────────────────────────────────
  const bits = entropyBits(password);
  // Map 0–128 bits → 0–70 pts (linear, capped)
  let score = Math.min(70, Math.round((bits / 128) * 70));

  // ── Character class bonuses (0–20) ───────────────────────────────
  let classBonuses = 0;
  if (hasUppercase(password)) classBonuses += 5;
  if (hasLowercase(password)) classBonuses += 5;
  if (hasDigit(password)) classBonuses += 5;
  if (hasSpecial(password)) classBonuses += 5;
  score += classBonuses;

  // ── Length bonus beyond 13 chars (0–10) ──────────────────────────
  const len = graphemeLength(password);
  const lengthBonus = Math.min(10, Math.max(0, len - 13));
  score += lengthBonus;

  // ── Penalties ─────────────────────────────────────────────────────
  if (isCommonPassword(password)) {
    score = Math.max(0, score - 40);
    warnings.push('Password appears in common password lists.');
  }

  if (hasKeyboardWalk(lower)) {
    score = Math.max(0, score - 15);
    warnings.push('Password contains a keyboard walk pattern (e.g. "qwerty").');
  }

  if (hasRepeatedChars(password)) {
    score = Math.max(0, score - 10);
    warnings.push('Password contains 3+ consecutive repeated characters.');
  }

  if (hasDatePattern(password)) {
    score = Math.max(0, score - 10);
    warnings.push('Password contains a recognisable date pattern.');
  }

  // Cap at 100
  score = Math.min(100, score);

  const label =
    score < 20 ? 'weak' :
    score < 40 ? 'fair' :
    score < 60 ? 'good' :
    score < 80 ? 'strong' :
    'enterprise';

  return { score, label, entropy: Math.round(bits), warnings };
}

/**
 * Generates a cryptographically random strong password that satisfies all
 * validation requirements.
 *
 * The generated password always contains:
 * - At least one uppercase Latin letter
 * - At least one lowercase Latin letter
 * - At least one digit
 * - At least one special character from a printable ASCII set
 * - Remaining positions filled from the full charset
 *
 * Unicode/emoji are intentionally excluded from generation to ensure
 * broad input-field compatibility while still accepting them in user-supplied passwords.
 *
 * @param {number} [length=16] - total password length (min 13)
 * @returns {string}
 */
export function generateStrongPassword(length = 16) {
  const safeLength = Math.max(13, Math.floor(length));

  const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';       // no I, O (ambiguous)
  const LOWER = 'abcdefghjkmnpqrstuvwxyz';         // no i, l, o
  const DIGITS = '23456789';                        // no 0, 1 (ambiguous)
  const SPECIAL = '!@#$%^&*-_=+[]{}|;:,.<>?';
  const FULL = UPPER + LOWER + DIGITS + SPECIAL;

  // Guarantee one of each required class
  const guaranteed = [
    randomChar(UPPER),
    randomChar(LOWER),
    randomChar(DIGITS),
    randomChar(SPECIAL),
  ];

  // Fill remaining positions
  const remaining = Array.from(
    { length: safeLength - guaranteed.length },
    () => randomChar(FULL)
  );

  // Shuffle all positions using Fisher-Yates with crypto randomness
  const all = [...guaranteed, ...remaining];
  for (let i = all.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join('');
}

/**
 * Picks a single random character from a string using crypto.randomInt.
 * @param {string} charset
 * @returns {string}
 */
function randomChar(charset) {
  return charset[crypto.randomInt(0, charset.length)];
}
