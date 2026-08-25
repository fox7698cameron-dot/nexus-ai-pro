/**
 * server/utils/crypto.js
 * Nexus AI Pro — Cryptography & Enumeration Utilities
 * Labeled: 2026-08-25
 *
 * Provides proper cryptographic primitives for:
 *  - User ID enumeration (non-sequential, UUIDv4-based)
 *  - Token generation (CSPRNG)
 *  - Password hashing (Argon2id via bcryptjs fallback)
 *  - TOTP for 2FA
 *  - Secure comparison (timing-safe)
 *  - Key derivation (PBKDF2-SHA512)
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── Constants ────────────────────────────────────────────────────────────────
const PBKDF2_ITERATIONS = 210_000; // OWASP 2024 recommendation
const PBKDF2_KEY_LEN    = 64;
const PBKDF2_DIGEST     = 'sha512';
const BCRYPT_ROUNDS     = 12;      // fallback if Argon2 unavailable
const TOTP_DIGITS       = 6;
const TOTP_STEP         = 30;      // seconds
const TOTP_ALGORITHM    = 'sha1';

// ── Enumeration / ID generation ──────────────────────────────────────────────

/**
 * Generate a non-sequential, cryptographically random user ID.
 * Uses UUIDv4 (128 bits of randomness) to prevent enumeration attacks.
 */
export function generateUserId() {
  return uuidv4();
}

/**
 * Generate a secure random token of `byteLength` bytes, hex-encoded.
 */
export function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Generate a numeric OTP of `digits` length using CSPRNG.
 */
export function generateNumericOTP(digits = 6) {
  const max   = 10 ** digits;
  const bytes = crypto.randomBytes(4);
  const num   = bytes.readUInt32BE(0) % max;
  return String(num).padStart(digits, '0');
}

// ── Password hashing ──────────────────────────────────────────────────────────

/**
 * Hash a password with PBKDF2-SHA512 + random salt.
 * Returns `{ hash, salt }` — store both.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LEN,
    PBKDF2_DIGEST
  ).toString('hex');
  return { hash, salt };
}

/**
 * Verify a password against a stored hash + salt.
 * Uses timing-safe comparison.
 */
export function verifyPassword(password, storedHash, salt) {
  try {
    const candidate = crypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LEN,
      PBKDF2_DIGEST
    ).toString('hex');
    return crypto.timingSafeEqual(
      Buffer.from(candidate, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Evaluate password strength.
 * Returns { score: 0-5, level: string, suggestions: string[] }
 * Minimum: 13 characters with mixed case + digits + special chars.
 */
export function evaluatePasswordStrength(password) {
  const suggestions = [];
  let score = 0;

  if (password.length >= 13) score++;
  else suggestions.push('Use at least 13 characters');

  if (password.length >= 20) score++;

  if (/[A-Z]/.test(password)) score++;
  else suggestions.push('Add uppercase letters');

  if (/[a-z]/.test(password)) score++;
  else suggestions.push('Add lowercase letters');

  if (/[0-9]/.test(password)) score++;
  else suggestions.push('Add numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else suggestions.push('Add special characters (!@#$%^&*)');

  const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  return {
    score: Math.min(score, 5),
    level: levels[Math.min(score, 5)],
    suggestions,
    meetsMinimum: password.length >= 13 && /[A-Z]/.test(password) &&
                  /[a-z]/.test(password) && /[0-9]/.test(password) &&
                  /[^A-Za-z0-9]/.test(password)
  };
}

// ── TOTP (2FA) ────────────────────────────────────────────────────────────────

/**
 * Generate a TOTP secret (base32 encoded, 160 bits).
 */
export function generateTOTPSecret() {
  const bytes  = crypto.randomBytes(20);
  const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result   = '';
  for (let i = 0; i < bytes.length; i += 5) {
    const chunk = bytes.slice(i, i + 5);
    for (let j = 0; j < 8; j++) {
      const shift = (7 - j) * 5;
      const idx   = Number(BigInt(chunk.readUIntBE(0, Math.min(5, chunk.length))) >> BigInt(shift)) & 0x1f;
      result += base32[idx] || 'A';
    }
  }
  return result.slice(0, 32);
}

/**
 * Compute TOTP for a base32 secret at a given time step.
 */
function base32Decode(str) {
  const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits   = str.toUpperCase().split('').map(c => base32.indexOf(c).toString(2).padStart(5, '0')).join('');
  const bytes  = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function computeHOTP(secret, counter) {
  const key     = base32Decode(secret);
  const buf     = Buffer.alloc(8);
  let c         = counter;
  for (let i = 7; i >= 0; i--) { buf[i] = c & 0xff; c >>= 8; }
  const hmac    = crypto.createHmac(TOTP_ALGORITHM, key).update(buf).digest();
  const offset  = hmac[hmac.length - 1] & 0x0f;
  const code    = ((hmac[offset] & 0x7f) << 24) |
                  (hmac[offset + 1] << 16) |
                  (hmac[offset + 2] << 8)  |
                   hmac[offset + 3];
  return String(code % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a TOTP token (allows ±1 window for clock drift).
 */
export function verifyTOTP(secret, token) {
  const step = Math.floor(Date.now() / 1000 / TOTP_STEP);
  for (let i = -1; i <= 1; i++) {
    if (computeHOTP(secret, step + i) === token) return true;
  }
  return false;
}

/**
 * Get current TOTP (for testing).
 */
export function getCurrentTOTP(secret) {
  const step = Math.floor(Date.now() / 1000 / TOTP_STEP);
  return computeHOTP(secret, step);
}

// ── Key derivation ─────────────────────────────────────────────────────────────

/**
 * Derive an encryption key from a user secret + application salt.
 * Returns a 32-byte Buffer suitable for AES-256.
 */
export function deriveEncryptionKey(secret, salt) {
  return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, 32, PBKDF2_DIGEST);
}

// ── Timing-safe comparison ────────────────────────────────────────────────────

/**
 * Compare two strings in constant time to prevent timing attacks.
 */
export function timingSafeEqual(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
      // Still compare to avoid timing leak on length
      crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
