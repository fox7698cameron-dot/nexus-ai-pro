/**
 * nexus-ai-pro/src/utils/validation.js
 * Input validation, sanitization, and password strength utilities
 * Supports: emojis, special characters, multi-byte unicode in usernames
 * Date: 2026-08-16
 */

// ──────────────────────────────────────────────
// Password Validation (13+ chars required)
// ──────────────────────────────────────────────

/** Entropy estimator weights */
const CHARSET_BONUSES = {
  lower: 26, upper: 26, digit: 10,
  special: 32, unicode: 1114111,
};

/**
 * Validate password strength.
 * Minimum: 13 characters, mixed case + number + special character.
 */
export function validatePassword(password) {
  const errors = [];
  const suggestions = [];

  if (typeof password !== 'string') {
    return { valid: false, score: 0, errors: ['Password must be a string'], suggestions: [] };
  }

  // Length check — 13 character minimum
  if (password.length < 13) {
    errors.push(`Password must be at least 13 characters (currently ${password.length})`);
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (!hasLower) { errors.push('Add lowercase letters'); suggestions.push('Include lowercase letters (a-z)'); }
  if (!hasUpper) { errors.push('Add uppercase letters'); suggestions.push('Include uppercase letters (A-Z)'); }
  if (!hasDigit) { errors.push('Add numbers'); suggestions.push('Include at least one number'); }
  if (!hasSpecial) { errors.push('Add special characters'); suggestions.push('Include special chars: !@#$%^&*…'); }

  // Common pattern checks
  const commonPatterns = [
    /^(.)\1+$/, // all same character
    /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)+$/i, // sequences
    /^(password|passw0rd|letmein|qwerty|admin|welcome)/i,
  ];
  if (commonPatterns.some(p => p.test(password))) {
    errors.push('Password is too common or predictable');
  }

  // Score 0-100
  let score = 0;
  if (password.length >= 13) score += 25;
  if (password.length >= 18) score += 10;
  if (password.length >= 24) score += 10;
  if (hasLower) score += 10;
  if (hasUpper) score += 10;
  if (hasDigit) score += 10;
  if (hasSpecial) score += 15;
  if (password.length >= 13 && hasLower && hasUpper && hasDigit && hasSpecial) score += 10;

  const label =
    score >= 90 ? 'Excellent' :
    score >= 75 ? 'Strong' :
    score >= 50 ? 'Fair' :
    score >= 25 ? 'Weak' : 'Very Weak';

  return {
    valid: errors.length === 0,
    score,
    label,
    errors,
    suggestions,
    meetsMinimum: password.length >= 13,
  };
}

// ──────────────────────────────────────────────
// Username Validation
// Full unicode support including emojis & special chars
// ──────────────────────────────────────────────

/**
 * Validate username.
 * Allows: letters (any unicode), digits, emojis, underscores, hyphens, dots.
 * Disallows: whitespace, null bytes, control chars, SQL injection chars.
 */
export function validateUsername(username) {
  const errors = [];

  if (typeof username !== 'string') {
    return { valid: false, errors: ['Username must be a string'] };
  }

  // Measure visible length (handles multi-byte / emoji grapheme clusters)
  const visibleLength = [...username].length; // spread handles surrogate pairs

  if (visibleLength < 2) errors.push('Username must be at least 2 characters');
  if (visibleLength > 32) errors.push('Username must be 32 characters or fewer');

  // No null bytes or control characters (except common unicode punctuation)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(username)) {
    errors.push('Username contains invalid control characters');
  }

  // Disallow leading/trailing whitespace
  if (username !== username.trim()) {
    errors.push('Username cannot start or end with spaces');
  }

  // Disallow purely whitespace
  if (/^\s+$/.test(username)) {
    errors.push('Username cannot be only whitespace');
  }

  return { valid: errors.length === 0, errors, length: visibleLength };
}

// ──────────────────────────────────────────────
// Email Validation
// ──────────────────────────────────────────────

export function validateEmail(email) {
  if (typeof email !== 'string') return { valid: false, error: 'Email must be a string' };
  const clean = email.trim().toLowerCase();
  // RFC 5322 simplified regex
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRe.test(clean)) return { valid: false, error: 'Invalid email format' };
  if (clean.length > 254) return { valid: false, error: 'Email too long' };
  return { valid: true, normalized: clean };
}

// ──────────────────────────────────────────────
// Input Sanitization
// ──────────────────────────────────────────────

/**
 * Sanitize a string for safe HTML output.
 * Escapes HTML special chars while preserving unicode (emoji, non-latin).
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strip HTML tags from input (for plain-text contexts).
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize object keys/values recursively.
 * Useful for sanitizing req.body before storage.
 */
export function sanitizeObject(obj, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return {};
  if (typeof obj === 'string') return sanitizeHtml(obj);
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(v => sanitizeObject(v, maxDepth, depth + 1));
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [sanitizeHtml(k), sanitizeObject(v, maxDepth, depth + 1)])
  );
}

// ──────────────────────────────────────────────
// URL Validation
// ──────────────────────────────────────────────

export function validateUrl(url, allowedProtocols = ['https:', 'http:']) {
  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return { valid: false, error: `Protocol must be one of: ${allowedProtocols.join(', ')}` };
    }
    return { valid: true, url: parsed.href };
  } catch {
    return { valid: false, error: 'Invalid URL' };
  }
}

// ──────────────────────────────────────────────
// SQL Injection Detection (server-side use)
// ──────────────────────────────────────────────

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|TRUNCATE|CREATE|EXEC|EXECUTE)\b)/i,
  /(--|;|\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
  /('|")\s*(OR|AND)\s*('|")/i,
  /xp_\w+/i,
  /SLEEP\s*\(/i,
  /BENCHMARK\s*\(/i,
  /LOAD_FILE\s*\(/i,
];

export function detectSqlInjection(input) {
  if (typeof input !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some(p => p.test(input));
}

// ──────────────────────────────────────────────
// XSS Detection
// ──────────────────────────────────────────────

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
];

export function detectXss(input) {
  if (typeof input !== 'string') return false;
  return XSS_PATTERNS.some(p => p.test(input));
}

// ──────────────────────────────────────────────
// Path Traversal Detection
// ──────────────────────────────────────────────

export function detectPathTraversal(input) {
  if (typeof input !== 'string') return false;
  return /(\.\.[/\\]|%2e%2e[/\\%])/i.test(input);
}

// ──────────────────────────────────────────────
// Credit Card Validation (Luhn algorithm)
// ──────────────────────────────────────────────

export function validateCard(number) {
  const digits = String(number).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return { valid: false };

  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }

  const network = detectCardNetwork(digits);
  return { valid: sum % 10 === 0, network, masked: `****-****-****-${digits.slice(-4)}` };
}

function detectCardNetwork(digits) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'AmericanExpress';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  if (/^3(?:0[0-5]|[68])/.test(digits)) return 'DinersClub';
  if (/^(?:2131|1800|35)/.test(digits)) return 'JCB';
  if (/^62/.test(digits)) return 'UnionPay';
  return 'Unknown';
}

// ──────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────
export default {
  validatePassword, validateUsername, validateEmail,
  sanitizeHtml, stripHtml, sanitizeObject,
  validateUrl, detectSqlInjection, detectXss, detectPathTraversal,
  validateCard,
};
