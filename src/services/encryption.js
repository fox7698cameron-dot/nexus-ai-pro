/**
 * NEXUS AI PRO - End-to-End Encryption Service
 * File: src/services/encryption.js
 * Date: 2026-08-26
 *
 * Proper cryptography for E2E encryption:
 * - AES-256-GCM for symmetric encryption
 * - ECDH P-384 for key exchange
 * - HKDF for key derivation
 * - Ed25519 for digital signatures
 * - Enumeration-safe user/data IDs
 * No keys hardcoded — all derived from environment secrets.
 */

import crypto from 'crypto';

// ─── Key derivation ────────────────────────────────────────────────────────────
const MASTER_SECRET = process.env.ENCRYPTION_SECRET;
const MASTER_SALT = process.env.ENCRYPTION_SALT;

if (!MASTER_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_SECRET must be set in production');
}

function deriveMasterKey() {
  const secret = MASTER_SECRET || crypto.randomBytes(32).toString('hex');
  const salt = MASTER_SALT || crypto.randomBytes(64).toString('hex');
  return crypto.pbkdf2Sync(secret, salt, 210000, 32, 'sha512'); // OWASP 2023 recommendation: 210k rounds
}

const MASTER_KEY = deriveMasterKey();

// ─── AES-256-GCM ───────────────────────────────────────────────────────────────
export function encryptAES(plaintext, additionalData = '') {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv, { authTagLength: 16 });

  if (additionalData) {
    cipher.setAAD(Buffer.from(additionalData, 'utf8'));
  }

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { iv: iv.toString('base64url'), ciphertext: encrypted.toString('base64url'), tag: tag.toString('base64url'), v: 1 };
}

export function decryptAES(encryptedObj, additionalData = '') {
  const { iv, ciphertext, tag, v } = encryptedObj;
  if (v !== 1) throw new Error('Unknown encryption version');

  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(iv, 'base64url'), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));

  if (additionalData) {
    decipher.setAAD(Buffer.from(additionalData, 'utf8'));
  }

  const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]);
  return decrypted.toString('utf8');
}

// ─── Per-user key derivation (HKDF) ───────────────────────────────────────────
export function deriveUserKey(userId, context = 'chat') {
  const info = Buffer.from(`nexus:${context}:${userId}`, 'utf8');
  return crypto.hkdfSync('sha512', MASTER_KEY, Buffer.from(userId), info, 32);
}

// ─── ECDH Key Exchange ─────────────────────────────────────────────────────────
export function generateECDHKeyPair() {
  const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'P-384', publicKeyEncoding: { type: 'spki', format: 'der' }, privateKeyEncoding: { type: 'pkcs8', format: 'der' } });
  return {
    publicKey: keyPair.publicKey.toString('base64url'),
    privateKey: keyPair.privateKey.toString('base64url'),
  };
}

export function computeSharedSecret(privateKeyB64, peerPublicKeyB64) {
  const privateKey = crypto.createPrivateKey({ key: Buffer.from(privateKeyB64, 'base64url'), format: 'der', type: 'pkcs8' });
  const peerPublicKey = crypto.createPublicKey({ key: Buffer.from(peerPublicKeyB64, 'base64url'), format: 'der', type: 'spki' });
  return crypto.diffieHellman({ privateKey, publicKey: peerPublicKey }).toString('base64url');
}

// ─── Ed25519 Signatures ────────────────────────────────────────────────────────
export function generateSigningKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  return { publicKey: publicKey.toString('base64url'), privateKey: privateKey.toString('base64url') };
}

export function signData(data, privateKeyB64) {
  const privateKey = crypto.createPrivateKey({ key: Buffer.from(privateKeyB64, 'base64url'), format: 'der', type: 'pkcs8' });
  const signature = crypto.sign(null, Buffer.from(data, 'utf8'), privateKey);
  return signature.toString('base64url');
}

export function verifySignature(data, signature, publicKeyB64) {
  try {
    const publicKey = crypto.createPublicKey({ key: Buffer.from(publicKeyB64, 'base64url'), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(data, 'utf8'), publicKey, Buffer.from(signature, 'base64url'));
  } catch {
    return false;
  }
}

// ─── Enumeration-safe IDs ──────────────────────────────────────────────────────
const ENUM_KEY = Buffer.from(process.env.ENUM_SECRET || crypto.randomBytes(32).toString('hex'));

export function opaqueId(rawId) {
  return crypto.createHmac('sha256', ENUM_KEY).update(String(rawId)).digest('base64url');
}

export function verifyOpaqueId(rawId, opaque) {
  const expected = opaqueId(rawId);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(opaque));
}

// ─── Secure Hash ───────────────────────────────────────────────────────────────
export function secureHash(input, algorithm = 'sha3-256') {
  return crypto.createHash(algorithm).update(String(input)).digest('base64url');
}

export function timingSafeCompare(a, b) {
  const aB = Buffer.from(String(a));
  const bB = Buffer.from(String(b));
  if (aB.length !== bB.length) {
    // Still do comparison to avoid timing leak on length
    crypto.timingSafeEqual(aB, aB);
    return false;
  }
  return crypto.timingSafeEqual(aB, bB);
}

// ─── Token generation ──────────────────────────────────────────────────────────
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function generateNumericOTP(digits = 6) {
  const max = Math.pow(10, digits);
  const randomBytes = crypto.randomBytes(4);
  const num = randomBytes.readUInt32BE(0) % max;
  return String(num).padStart(digits, '0');
}
