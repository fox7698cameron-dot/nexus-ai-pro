/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * CryptoUtils.js
 * Updated: 2026-10-16
 * Client-side cryptography: AES-256-GCM, PBKDF2, ECDH key exchange,
 * user/data enumeration, E2E encryption helpers
 * Uses Web Crypto API (no hard-coded keys or secrets).
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const ALGO         = { name: 'AES-GCM', length: 256 };
const KEY_USAGE    = ['encrypt', 'decrypt'];
const PBKDF2_ITER  = 200000;
const PBKDF2_HASH  = 'SHA-512';
const ECDH_CURVE   = 'P-384';
const IV_BYTES     = 12;
const SALT_BYTES   = 32;

// ── Helpers ───────────────────────────────────────────────────────────────────
function buf2hex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hex2buf(hex) {
  const bytes = hex.match(/.{2}/g).map(h => parseInt(h, 16));
  return new Uint8Array(bytes).buffer;
}
function buf2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b642buf(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── Key derivation (PBKDF2) ───────────────────────────────────────────────────
export async function deriveKey(password, salt) {
  const raw = typeof salt === 'string' ? hex2buf(salt) : salt;
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: raw, iterations: PBKDF2_ITER, hash: PBKDF2_HASH },
    baseKey, ALGO, false, KEY_USAGE
  );
}

export function generateSalt() {
  return buf2hex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)).buffer);
}

// ── AES-256-GCM encryption / decryption ──────────────────────────────────────
export async function encrypt(plaintext, key) {
  const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = typeof plaintext === 'string' ? enc.encode(plaintext) : plaintext;
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return {
    iv:        buf2hex(iv.buffer),
    ciphertext: buf2b64(ct),
    alg:       'AES-256-GCM',
    ts:        Date.now(),
  };
}

export async function decrypt(payload, key) {
  const { iv, ciphertext } = payload;
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(hex2buf(iv)) },
    key,
    b642buf(ciphertext)
  );
  return dec.decode(pt);
}

// ── ECDH key pair (for E2E key exchange) ──────────────────────────────────────
export async function generateECDHKeyPair() {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: ECDH_CURVE }, true, ['deriveKey']);
}

export async function exportPublicKey(keyPair) {
  const raw = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  return buf2b64(raw);
}

export async function importPublicKey(b64) {
  const raw = b642buf(b64);
  return crypto.subtle.importKey('spki', raw, { name: 'ECDH', namedCurve: ECDH_CURVE }, true, []);
}

export async function deriveSharedKey(myPrivateKey, theirPublicKey) {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey, ALGO, false, KEY_USAGE
  );
}

// ── Random ID generation using enumeration-safe identifiers ──────────────────
// Uses crypto.getRandomValues — never Math.random() for security-sensitive IDs
export function generateSecureId(length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return buf2hex(bytes.buffer);
}

// Opaque user ID (non-sequential, non-enumerable)
export function generateUserId() {
  return 'u_' + generateSecureId(16);
}

// Opaque session token
export function generateSessionToken() {
  return 's_' + generateSecureId(32);
}

// ── Password hashing (client side — PBKDF2 before sending to server) ──────────
// The server will additionally hash with scrypt. Double-hashing reduces
// exposure if the transport layer is compromised.
export async function hashPasswordClient(password) {
  const salt = generateSalt();
  const key  = await deriveKey(password, salt);
  // Export as raw bytes and hex-encode
  const exported = await crypto.subtle.exportKey('raw', key);
  return { hash: buf2hex(exported), salt };
}

// ── HMAC message signing ──────────────────────────────────────────────────────
export async function importHmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signMessage(message, hmacKey) {
  const sig = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(message));
  return buf2hex(sig);
}

export async function verifyMessage(message, signature, hmacKey) {
  const sig = new Uint8Array(hex2buf(signature));
  return crypto.subtle.verify('HMAC', hmacKey, sig, enc.encode(message));
}

// ── SHA-256 / SHA-512 digest ──────────────────────────────────────────────────
export async function sha256(data) {
  const hash = await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data);
  return buf2hex(hash);
}

export async function sha512(data) {
  const hash = await crypto.subtle.digest('SHA-512', typeof data === 'string' ? enc.encode(data) : data);
  return buf2hex(hash);
}

// ── Timing-safe string comparison (constant-time) ────────────────────────────
// Prevents timing attacks when comparing tokens
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Secure storage helpers ───────────────────────────────────────────────────
// Encrypt before writing to localStorage; decrypt on read.
let _storageKey = null;

export async function initSecureStorage(userSecret) {
  const salt = localStorage.getItem('nexus:storageSalt') || generateSalt();
  localStorage.setItem('nexus:storageSalt', salt);
  _storageKey = await deriveKey(userSecret, salt);
}

export async function secureSet(key, value) {
  if (!_storageKey) throw new Error('Secure storage not initialised');
  const enc = await encrypt(typeof value === 'string' ? value : JSON.stringify(value), _storageKey);
  try { localStorage.setItem(`nexus:enc:${key}`, JSON.stringify(enc)); } catch {}
}

export async function secureGet(key) {
  if (!_storageKey) return null;
  try {
    const raw = localStorage.getItem(`nexus:enc:${key}`);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    const plain   = await decrypt(payload, _storageKey);
    try { return JSON.parse(plain); } catch { return plain; }
  } catch {
    return null;
  }
}
