/**
 * src/utils/crypto.js
 * Cryptography Utilities — AES-256-GCM, PBKDF2, ECDH, HMAC, Enum IDs
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * All sensitive operations use Node's built-in `crypto` module.
 * No secrets are hard-coded. Keys are derived from environment variables.
 */

import crypto from 'crypto';

const ALG           = 'aes-256-gcm';
const KEY_LEN       = 32;   // bytes (256-bit)
const IV_LEN        = 12;   // bytes (96-bit — optimal for GCM)
const TAG_LEN       = 16;   // bytes (128-bit auth tag)
const SALT_LEN      = 64;   // bytes
const PBKDF2_ITER   = 310_000; // OWASP 2023 recommendation
const PBKDF2_DIGEST = 'sha512';

// ─── Key Derivation ────────────────────────────────────────────────────────

/**
 * Derive a 256-bit key from a passphrase + salt using PBKDF2-SHA512.
 * @param {string} passphrase
 * @param {Buffer|string} salt - hex string or Buffer
 * @returns {Buffer} 32-byte key
 */
export function deriveKey(passphrase, salt) {
  const saltBuf = typeof salt === 'string' ? Buffer.from(salt, 'hex') : salt;
  return crypto.pbkdf2Sync(passphrase, saltBuf, PBKDF2_ITER, KEY_LEN, PBKDF2_DIGEST);
}

/**
 * Generate a cryptographically-secure random salt.
 * @returns {string} hex-encoded salt
 */
export function generateSalt() {
  return crypto.randomBytes(SALT_LEN).toString('hex');
}

// ─── AES-256-GCM ───────────────────────────────────────────────────────────

/**
 * Encrypt plaintext with AES-256-GCM.
 * @param {string} plaintext
 * @param {Buffer} key - 32 bytes
 * @param {string} [aad] - additional authenticated data
 * @returns {{ iv: string, ciphertext: string, tag: string }}
 */
export function encrypt(plaintext, key, aad = '') {
  const iv     = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv, { authTagLength: TAG_LEN });

  if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));

  const ct  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv:         iv.toString('hex'),
    ciphertext: ct.toString('hex'),
    tag:        tag.toString('hex'),
  };
}

/**
 * Decrypt an AES-256-GCM payload.
 * @param {{ iv: string, ciphertext: string, tag: string }} payload
 * @param {Buffer} key - 32 bytes
 * @param {string} [aad]
 * @returns {string} plaintext
 */
export function decrypt(payload, key, aad = '') {
  const { iv, ciphertext, tag } = payload;
  const decipher = crypto.createDecipheriv(
    ALG,
    key,
    Buffer.from(iv, 'hex'),
    { authTagLength: TAG_LEN }
  );

  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

// ─── Hashing ────────────────────────────────────────────────────────────────

/**
 * Hash a value with SHA-512.
 */
export function sha512(data) {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * HMAC-SHA-256 using the master key.
 */
export function hmac(data, key) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function safeCompare(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// ─── Secure Tokens ──────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random hex token.
 * @param {number} [bytes=32]
 * @returns {string}
 */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a secure numeric OTP (one-time password).
 * @param {number} [digits=6]
 * @returns {string}
 */
export function generateOTP(digits = 6) {
  const max = 10 ** digits;
  const rand = crypto.randomInt(0, max);
  return rand.toString().padStart(digits, '0');
}

// ─── Enumeration-safe IDs ───────────────────────────────────────────────────

/**
 * Generate a UUID v4 using native crypto (no external lib required).
 */
export function generateId() {
  return crypto.randomUUID();
}

/**
 * Generate an opaque user ID that is not sequentially enumerable.
 * Format: u_<16 random hex bytes>
 */
export function generateUserId() {
  return `u_${crypto.randomBytes(16).toString('hex')}`;
}

// ─── ECDH Key Exchange ───────────────────────────────────────────────────────

/**
 * Generate an ECDH key pair for secure channel establishment.
 * Uses prime256v1 (P-256) which is widely supported.
 */
export function generateECDHPair() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    privateKey: ecdh.getPrivateKey('hex'),
    publicKey:  ecdh.getPublicKey('hex', 'compressed'),
  };
}

/**
 * Compute the ECDH shared secret.
 * @param {string} privateKeyHex
 * @param {string} peerPublicKeyHex
 * @returns {Buffer} shared secret
 */
export function computeSharedSecret(privateKeyHex, peerPublicKeyHex) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(Buffer.from(privateKeyHex, 'hex'));
  return ecdh.computeSecret(Buffer.from(peerPublicKeyHex, 'hex'));
}
