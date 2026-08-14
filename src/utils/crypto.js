/**
 * utils/crypto.js
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Client-side Cryptography Utilities
 * Uses Web Crypto API (SubtleCrypto) — no hardcoded secrets
 * Enumeration-safe, timing-attack-resistant where applicable
 * Updated: 2026-08-14
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit GCM standard
const ITERATIONS = 100_000;
const HASH = 'SHA-256';
const SALT_LENGTH = 16;

// ─── Key Derivation ───────────────────────────────────────────────────────────
/**
 * Derive an AES-256-GCM key from a passphrase + salt using PBKDF2.
 * @param {string} passphrase
 * @param {Uint8Array} salt - 16 bytes recommended
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(passphrase, salt) {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH },
    baseKey,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a cryptographically random salt.
 * @returns {Uint8Array}
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a cryptographically random IV.
 * @returns {Uint8Array}
 */
export function generateIV() {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// ─── AES-256-GCM Encrypt / Decrypt ───────────────────────────────────────────
/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns base64url-encoded payload: salt(16) + iv(12) + ciphertext.
 * @param {string} plaintext
 * @param {string} passphrase
 * @returns {Promise<string>} base64url
 */
export async function encrypt(plaintext, passphrase) {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(passphrase, salt);
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoder.encode(plaintext));
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return bufToBase64url(combined);
}

/**
 * Decrypt a payload produced by encrypt().
 * @param {string} payload base64url
 * @param {string} passphrase
 * @returns {Promise<string>} plaintext
 */
export async function decrypt(payload, passphrase) {
  const combined = base64urlToBuf(payload);
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

// ─── Hashing ──────────────────────────────────────────────────────────────────
/**
 * SHA-256 hash of a string. Returns hex string.
 * @param {string} input
 * @returns {Promise<string>}
 */
export async function sha256(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return bufToHex(new Uint8Array(buf));
}

/**
 * SHA-512 hash of a string. Returns hex string.
 * @param {string} input
 * @returns {Promise<string>}
 */
export async function sha512(input) {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(input));
  return bufToHex(new Uint8Array(buf));
}

// ─── HMAC ────────────────────────────────────────────────────────────────────
/**
 * HMAC-SHA-256 message authentication.
 * @param {string} message
 * @param {string} secret
 * @returns {Promise<string>} hex MAC
 */
export async function hmac(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return bufToHex(new Uint8Array(sig));
}

// ─── Secure Random ───────────────────────────────────────────────────────────
/**
 * Generate a cryptographically secure random token.
 * @param {number} byteLength
 * @returns {string} hex token
 */
export function randomToken(byteLength = 32) {
  return bufToHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/**
 * Generate a random UUID v4.
 * @returns {string}
 */
export function randomUUID() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Polyfill
  const arr = crypto.getRandomValues(new Uint8Array(16));
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  const hex = bufToHex(arr);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// ─── Enumeration-Safe Comparison ─────────────────────────────────────────────
/**
 * Timing-safe string comparison (constant time for equal-length strings).
 * Prevents timing attacks on token/password comparisons.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Pad to same length before comparing to prevent length leakage
  const lenA = a.length, lenB = b.length;
  const maxLen = Math.max(lenA, lenB);
  let diff = lenA ^ lenB;
  for (let i = 0; i < maxLen; i++) {
    diff |= (a.charCodeAt(i % lenA) ^ b.charCodeAt(i % lenB));
  }
  return diff === 0;
}

// ─── Encoding Helpers ─────────────────────────────────────────────────────────
function bufToHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bufToBase64url(buf) {
  let bin = '';
  buf.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuf(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

export { bufToHex, bufToBase64url, base64urlToBuf };
