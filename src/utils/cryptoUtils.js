/**
 * src/utils/cryptoUtils.js
 * Nexus AI Pro — Cryptography utilities
 * AES-256-GCM, PBKDF2, HMAC-SHA512, enumeration-safe IDs,
 * secure token generation, key rotation, and TLS pinning helpers.
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 */

import crypto from 'crypto';

// ── Constants ──────────────────────────────────────────────────────────────
const ALG = 'aes-256-gcm';
const KEY_LEN = 32;    // bytes (AES-256)
const IV_LEN = 12;     // bytes (GCM standard)
const TAG_LEN = 16;    // bytes (GCM auth tag)
const SALT_LEN = 64;   // bytes (PBKDF2 salt)
const PBKDF2_ITER = 210_000; // OWASP-recommended minimum 2026
const PBKDF2_DIG = 'sha512';

// ── Key derivation ─────────────────────────────────────────────────────────

/**
 * Derive a 32-byte key from a passphrase using PBKDF2-SHA512.
 * @param {string} passphrase
 * @param {string|Buffer} salt - hex string or Buffer
 * @param {number} [iterations]
 * @returns {Buffer}
 */
export function deriveKey(passphrase, salt, iterations = PBKDF2_ITER) {
  const saltBuf = typeof salt === 'string' ? Buffer.from(salt, 'hex') : salt;
  return crypto.pbkdf2Sync(passphrase, saltBuf, iterations, KEY_LEN, PBKDF2_DIG);
}

/**
 * Generate a new random salt (hex string).
 */
export function generateSalt() {
  return crypto.randomBytes(SALT_LEN).toString('hex');
}

// ── AES-256-GCM ────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param {string} plaintext
 * @param {Buffer} keyBuf - 32-byte key
 * @param {string} [aad] - additional authenticated data (not encrypted)
 * @returns {{ iv: string, ciphertext: string, tag: string, aad: string }}
 */
export function encrypt(plaintext, keyBuf, aad = '') {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, keyBuf, iv, { authTagLength: TAG_LEN });
  if (aad) cipher.setAAD(Buffer.from(aad), { plaintextLength: Buffer.byteLength(plaintext) });
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    ciphertext: enc.toString('hex'),
    tag: tag.toString('hex'),
    aad,
    v: 1, // version for future algorithm migrations
  };
}

/**
 * Decrypt an AES-256-GCM encrypted object.
 */
export function decrypt(encObj, keyBuf) {
  const { iv, ciphertext, tag, aad = '' } = encObj;
  const decipher = crypto.createDecipheriv(ALG, keyBuf, Buffer.from(iv, 'hex'), { authTagLength: TAG_LEN });
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  if (aad) decipher.setAAD(Buffer.from(aad));
  const dec = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}

// ── Password hashing ───────────────────────────────────────────────────────

/**
 * Hash a password with PBKDF2-SHA512 and a new random salt.
 * Returns { hash, salt } both as hex strings.
 */
export async function hashPassword(password) {
  const salt = generateSalt();
  const hash = await new Promise((resolve, reject) =>
    crypto.pbkdf2(password, salt, PBKDF2_ITER, 64, PBKDF2_DIG, (err, buf) =>
      err ? reject(err) : resolve(buf.toString('hex'))
    )
  );
  return { hash, salt };
}

/**
 * Verify a password against a stored hash + salt (constant-time).
 */
export async function verifyPassword(password, storedHash, storedSalt) {
  const candidateHash = await new Promise((resolve, reject) =>
    crypto.pbkdf2(password, storedSalt, PBKDF2_ITER, 64, PBKDF2_DIG, (err, buf) =>
      err ? reject(err) : resolve(buf.toString('hex'))
    )
  );
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── HMAC ───────────────────────────────────────────────────────────────────

export function hmacSHA512(data, keyHex) {
  return crypto.createHmac('sha512', Buffer.from(keyHex, 'hex')).update(data).digest('hex');
}

export function hmacVerify(data, keyHex, expected) {
  const computed = Buffer.from(hmacSHA512(data, keyHex), 'hex');
  const exp = Buffer.from(expected, 'hex');
  if (computed.length !== exp.length) return false;
  return crypto.timingSafeEqual(computed, exp);
}

// ── Secure token generation ───────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token.
 * @param {number} byteLength - default 32 → 64-char hex
 */
export function generateToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Generate a URL-safe base64 token (suitable for email verification links etc.)
 */
export function generateUrlSafeToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('base64url');
}

// ── Enumeration-safe IDs ───────────────────────────────────────────────────

/**
 * Hash a sequential or guessable ID into a non-sequential opaque token.
 * Uses HMAC-SHA256 so the original ID is never reversible without the server key.
 */
export function maskId(id, serverSecret) {
  return crypto.createHmac('sha256', serverSecret).update(String(id)).digest('base64url');
}

// ── Key rotation ────────────────────────────────────────────────────────────

export class RotatingKeyStore {
  constructor(initialPassphrase) {
    const salt = generateSalt();
    this._current = { key: deriveKey(initialPassphrase, salt), salt, id: generateToken(4), createdAt: new Date().toISOString() };
    this._previous = null;
  }

  rotate(newPassphrase) {
    this._previous = this._current;
    const salt = generateSalt();
    this._current = { key: deriveKey(newPassphrase, salt), salt, id: generateToken(4), createdAt: new Date().toISOString() };
    return { newKeyId: this._current.id, prevKeyId: this._previous.id };
  }

  /** Decrypt — tries current key first, then previous (for rotation window) */
  decrypt(encObj) {
    try {
      return decrypt(encObj, this._current.key);
    } catch {
      if (this._previous) return decrypt(encObj, this._previous.key);
      throw new Error('Decryption failed with all keys');
    }
  }

  encrypt(plaintext, aad) {
    return { ...encrypt(plaintext, this._current.key, aad), keyId: this._current.id };
  }
}

// ── Hash helpers ───────────────────────────────────────────────────────────

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function sha512(data) {
  return crypto.createHash('sha512').update(data).digest('hex');
}

// ── Constant-time string compare ────────────────────────────────────────────

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Still consume time
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

export default {
  deriveKey,
  generateSalt,
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  hmacSHA512,
  hmacVerify,
  generateToken,
  generateUrlSafeToken,
  maskId,
  RotatingKeyStore,
  sha256,
  sha512,
  safeEqual,
};
