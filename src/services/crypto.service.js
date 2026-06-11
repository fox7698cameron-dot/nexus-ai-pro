// src/services/crypto.service.js
// AES-256-GCM encryption/decryption; PBKDF2 key derivation; HMAC-SHA-512 signing
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import crypto from 'crypto';
import { env } from '../config/env.js';

const ALG = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const PBKDF2_ITER = 100_000;
const PBKDF2_DIGEST = 'sha512';

// Derive master key once at startup; stored only in memory
const _masterKey = crypto.pbkdf2Sync(
  env.ENCRYPTION_SECRET,
  env.ENCRYPTION_SALT,
  PBKDF2_ITER,
  KEY_LEN,
  PBKDF2_DIGEST
);

export function encrypt(plaintext, aad = '') {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, _masterKey, iv, { authTagLength: TAG_LEN });
  if (aad) cipher.setAAD(Buffer.from(aad));
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${body.toString('base64url')}`;
}

export function decrypt(ciphertext, aad = '') {
  const parts = ciphertext.split(':');
  if (parts[0] !== 'v1' || parts.length !== 4) throw new Error('Invalid ciphertext format');
  const [, ivB64, tagB64, bodyB64] = parts;
  const decipher = crypto.createDecipheriv(ALG, _masterKey, Buffer.from(ivB64, 'base64url'), { authTagLength: TAG_LEN });
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  if (aad) decipher.setAAD(Buffer.from(aad));
  return Buffer.concat([decipher.update(Buffer.from(bodyB64, 'base64url')), decipher.final()]).toString('utf8');
}

export function hmacSign(data) {
  return crypto.createHmac('sha512', _masterKey).update(data).digest('base64url');
}

export function hmacVerify(data, signature) {
  const expected = hmacSign(data);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function secureHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

// Derive a per-user sub-key for field-level encryption
export function deriveUserKey(userId) {
  return crypto.createHmac('sha256', _masterKey).update(userId).digest();
}
