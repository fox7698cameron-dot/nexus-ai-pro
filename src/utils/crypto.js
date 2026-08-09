/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Browser-side AES-256-GCM encryption utilities
 * Uses the Web Crypto API — no external dependencies
 * All key material stays in-memory and never leaves the device
 * Date: 2026-08-09
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;  // 96-bit IV recommended for GCM
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;

// ─── Key Derivation ───────────────────────────────────────────────────────────

/**
 * Derive an AES-256-GCM CryptoKey from a passphrase using PBKDF2-SHA-512.
 *
 * @param {string} passphrase
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-512' },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Generate a random 256-bit AES-GCM key.
 *
 * @returns {Promise<CryptoKey>}
 */
export async function generateKey() {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext with AES-256-GCM.
 *
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<string>} Base64-encoded  salt(32) + iv(12) + ciphertext
 */
export async function encrypt(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );

  // Pack: iv (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Encrypt with a passphrase (derives key automatically, embeds salt).
 *
 * @param {string} plaintext
 * @param {string} passphrase
 * @returns {Promise<string>} Base64-encoded salt(32) + iv(12) + ciphertext
 */
export async function encryptWithPassphrase(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + iv.length);

  return btoa(String.fromCharCode(...combined));
}

// ─── Decryption ───────────────────────────────────────────────────────────────

/**
 * Decrypt ciphertext (no embedded salt — key provided directly).
 *
 * @param {string} encoded  Base64 string from encrypt()
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function decrypt(encoded, key) {
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

/**
 * Decrypt ciphertext encrypted with a passphrase (extracts salt automatically).
 *
 * @param {string} encoded  Base64 string from encryptWithPassphrase()
 * @param {string} passphrase
 * @returns {Promise<string>}
 */
export async function decryptWithPassphrase(encoded, passphrase) {
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

/**
 * SHA-256 digest of a string.
 *
 * @param {string} message
 * @returns {Promise<string>} Hex digest
 */
export async function sha256(message) {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate n random bytes as a hex string.
 *
 * @param {number} n
 * @returns {string}
 */
export function randomHex(n = 16) {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
