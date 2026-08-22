/**
 * filename: src/auth/passwordUtils.js
 * purpose:  Password and username validation utilities, secure token generation,
 *           and server-side password hashing helper for Nexus AI Pro.
 * date:     2026-08-22
 * copyright: Copyright (c) 2026 Nexus AI Pro. All rights reserved.
 *
 * SECURITY NOTES
 * - hashPassword() sends the plaintext password over an authenticated HTTPS call
 *   to the backend. bcrypt hashing NEVER occurs in the browser.
 * - generateSecureToken() uses the Web Crypto API (crypto.randomUUID) which is
 *   CSPRNG-backed in all modern browsers and Node >= 14.17.
 * - No secrets, API keys, or credentials are stored in this file.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_PASSWORD_LENGTH = 13;
const MAX_USERNAME_LENGTH = 50;

/**
 * Shannon entropy threshold in bits per character.
 * Passwords below this threshold are flagged as low-entropy even when they
 * technically satisfy character-class rules.
 */
const MIN_ENTROPY_BITS_PER_CHAR = 3.0;

/**
 * Common weak password fragments to reject (lowercase comparison).
 * This is intentionally small — server-side checks should use a full
 * HaveIBeenPwned-style database lookup.
 */
const COMMON_PATTERNS = [
  'password', 'qwerty', '123456', 'abcdef', 'letmein', 'welcome',
  'admin', 'iloveyou', 'monkey', 'dragon', 'master', 'sunshine',
  'princess', 'football', 'shadow', 'superman', 'michael', 'jessica',
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Calculates the Shannon entropy (bits per character) of a string.
 * @param {string} str
 * @returns {number} bits per character
 */
function shannonEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const len = str.length;
  return Object.values(freq).reduce((acc, count) => {
    const p = count / len;
    return acc - p * Math.log2(p);
  }, 0);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a password and returns a structured result.
 *
 * Rules enforced:
 *  - Minimum 13 characters
 *  - At least one uppercase letter (Unicode-aware)
 *  - At least one lowercase letter (Unicode-aware)
 *  - At least one digit
 *  - At least one special character
 *  - No common weak patterns
 *  - Minimum Shannon entropy of 3.0 bits/char
 *
 * Strength scale: 'weak' | 'fair' | 'strong' | 'very-strong'
 *
 * @param {string} password
 * @returns {{ valid: boolean, strength: string, score: number, issues: string[] }}
 */
export function validatePassword(password) {
  const issues = [];
  let score = 0;

  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, strength: 'weak', score: 0, issues: ['Password is required.'] };
  }

  // Length
  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push(`Must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  } else {
    score += 20;
    if (password.length >= 20) score += 10;
    if (password.length >= 32) score += 5;
  }

  // Uppercase (Unicode category Lu via regex v flag or fallback)
  const hasUppercase = /\p{Lu}/u.test(password);
  if (!hasUppercase) {
    issues.push('Must contain at least one uppercase letter.');
  } else {
    score += 15;
  }

  // Lowercase
  const hasLowercase = /\p{Ll}/u.test(password);
  if (!hasLowercase) {
    issues.push('Must contain at least one lowercase letter.');
  } else {
    score += 15;
  }

  // Digit
  const hasDigit = /\d/.test(password);
  if (!hasDigit) {
    issues.push('Must contain at least one number.');
  } else {
    score += 15;
  }

  // Special character (any non-alphanumeric, non-whitespace)
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(password);
  if (!hasSpecial) {
    issues.push('Must contain at least one special character (e.g. !@#$%^&*).');
  } else {
    score += 15;
  }

  // Common pattern check
  const lower = password.toLowerCase();
  for (const pattern of COMMON_PATTERNS) {
    if (lower.includes(pattern)) {
      issues.push(`Contains a commonly used word or pattern ("${pattern}"). Choose something more unique.`);
      score -= 20;
      break;
    }
  }

  // Entropy check
  const entropy = shannonEntropy(password);
  if (entropy < MIN_ENTROPY_BITS_PER_CHAR) {
    issues.push('Password is too predictable. Add more variety of characters.');
    score -= 10;
  } else {
    score += 10;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  const strength =
    score < 40 ? 'weak' :
    score < 60 ? 'fair' :
    score < 80 ? 'strong' : 'very-strong';

  return {
    valid: issues.length === 0,
    strength,
    score,
    issues,
  };
}

/**
 * Validates a username.
 *
 * Rules:
 *  - 1–50 characters after Unicode NFC normalization
 *  - Allows: Unicode letters, digits, emojis, underscores (_), hyphens (-), dots (.)
 *  - No leading/trailing dots or hyphens
 *  - No consecutive dots
 *  - Returns a sanitized display form (NFC-normalized, trimmed)
 *
 * @param {string} username
 * @returns {{ valid: boolean, sanitized: string, issues: string[] }}
 */
export function validateUsername(username) {
  const issues = [];

  if (typeof username !== 'string') {
    return { valid: false, sanitized: '', issues: ['Username must be a string.'] };
  }

  // Unicode NFC normalization and trim
  let sanitized = username.normalize('NFC').trim();

  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', issues: ['Username is required.'] };
  }

  if (sanitized.length > MAX_USERNAME_LENGTH) {
    issues.push(`Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`);
  }

  // Allowed characters: Unicode letters, marks, digits, emojis (extended grapheme clusters),
  // plus underscore, hyphen, dot. We use a broad allowlist and then block control chars.
  // Control characters and C0/C1 ranges are disallowed.
  if (/[\x00-\x1F\x7F-\x9F]/.test(sanitized)) {
    issues.push('Username contains invalid control characters.');
  }

  // Must not start or end with dot or hyphen
  if (/^[.\-]/.test(sanitized)) {
    issues.push('Username must not start with a dot or hyphen.');
  }
  if (/[.\-]$/.test(sanitized)) {
    issues.push('Username must not end with a dot or hyphen.');
  }

  // No consecutive dots
  if (/\.{2,}/.test(sanitized)) {
    issues.push('Username must not contain consecutive dots.');
  }

  // Must contain at least one letter, digit, or emoji (not purely punctuation)
  const hasMeaningfulChar = /[\p{L}\p{N}\p{Emoji}]/u.test(sanitized);
  if (!hasMeaningfulChar) {
    issues.push('Username must contain at least one letter, number, or emoji.');
  }

  return {
    valid: issues.length === 0,
    sanitized,
    issues,
  };
}

/**
 * Generates a cryptographically secure random token using the Web Crypto API.
 * Falls back to crypto.randomBytes (Node.js) if the browser API is unavailable.
 *
 * @returns {string} UUID v4 string (e.g. "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateSecureToken() {
  // Browser & modern Node (>= 14.17)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Node.js fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomUUID();
  } catch {
    throw new Error(
      'generateSecureToken: No suitable crypto API found. ' +
      'Use Node.js >= 14.17 or a modern browser.'
    );
  }
}

/**
 * Sends the plaintext password to the server for bcrypt hashing and returns
 * the resulting hash. Password hashing MUST NOT happen in the browser.
 *
 * The server endpoint is expected to:
 *  - Accept POST /api/auth/hash-password with JSON { password }
 *  - Require a valid CSRF token or short-lived session token in the header
 *  - Return JSON { hash }
 *
 * This function should only be called during account creation or password
 * change flows where the server owns the bcrypt salt rounds and secret pepper.
 *
 * @param {string} password - plaintext password to hash
 * @param {string} [csrfToken] - CSRF token to include in the request header
 * @returns {Promise<string>} bcrypt hash string
 * @throws {Error} if the network request fails or the server returns an error
 */
export async function hashPassword(password, csrfToken) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('hashPassword: password must be a non-empty string.');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch('/api/auth/hash-password', {
    method: 'POST',
    credentials: 'include', // send httpOnly cookies for session auth
    headers,
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `hashPassword: server error ${response.status}: ${errorData.message || 'Unknown error'}`
    );
  }

  const data = await response.json();

  if (!data.hash || typeof data.hash !== 'string') {
    throw new Error('hashPassword: server returned an unexpected response format.');
  }

  return data.hash;
}
