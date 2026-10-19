// src/utils/crypto.js
// Created: 2026-10-19
// Cryptographic utilities using Node.js built-in crypto module
// Implements E2E encryption helpers, key derivation, and secure enumeration

import crypto from 'crypto';

export const CRYPTO_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 12,
  tagLength: 16,
  saltLength: 32,
  iterations: 100000,
  digest: 'sha512',
  hashAlgorithm: 'sha256',
};

export function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    CRYPTO_CONFIG.iterations,
    CRYPTO_CONFIG.keyLength,
    CRYPTO_CONFIG.digest
  );
}

export function generateSalt() {
  return crypto.randomBytes(CRYPTO_CONFIG.saltLength);
}

export function generateSecureId() {
  return crypto.randomUUID();
}

export function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function hashPassword(password) {
  const salt = generateSalt();
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    CRYPTO_CONFIG.iterations,
    64,
    CRYPTO_CONFIG.digest
  );
  return { hash: hash.toString('hex'), salt: salt.toString('hex') };
}

export function verifyPassword(password, hash, salt) {
  const saltBuf = Buffer.from(salt, 'hex');
  const derived = crypto.pbkdf2Sync(
    password,
    saltBuf,
    CRYPTO_CONFIG.iterations,
    64,
    CRYPTO_CONFIG.digest
  );
  return crypto.timingSafeEqual(derived, Buffer.from(hash, 'hex'));
}

export function hmacSign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function hmacVerify(data, signature, secret) {
  const expected = hmacSign(data, secret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function encryptSymmetric(plaintext, key) {
  const iv = crypto.randomBytes(CRYPTO_CONFIG.ivLength);
  const cipher = crypto.createCipheriv(CRYPTO_CONFIG.algorithm, key, iv, {
    authTagLength: CRYPTO_CONFIG.tagLength,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptSymmetric(encryptedObj, key) {
  const { iv, data, tag } = encryptedObj;
  const decipher = crypto.createDecipheriv(
    CRYPTO_CONFIG.algorithm,
    key,
    Buffer.from(iv, 'base64'),
    { authTagLength: CRYPTO_CONFIG.tagLength }
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function generateKeyPair() {
  return crypto.generateKeyPairSync('x25519');
}

export function computeSharedSecret(privateKey, publicKey) {
  return crypto.diffieHellman({ privateKey, publicKey });
}

export function safeHash(data) {
  return crypto.createHash(CRYPTO_CONFIG.hashAlgorithm).update(data).digest('hex');
}

export function generateTOTP(secret, windowOffset = 0) {
  const epoch = Math.round(Date.now() / 1000);
  const counter = Math.floor((epoch + windowOffset * 30) / 30);

  let base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let decoded = [];

  for (const char of secret.toUpperCase()) {
    const charIndex = base32Chars.indexOf(char);
    if (charIndex === -1) continue;
    value = (value << 5) | charIndex;
    bits += 5;
    if (bits >= 8) {
      decoded.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  const keyBuf = Buffer.from(decoded);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(0, 0);
  counterBuf.writeUInt32BE(counter, 4);

  const hmac = crypto.createHmac('sha1', keyBuf);
  hmac.update(counterBuf);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const otp =
    ((digest[offset] & 0x7f) << 24 |
      digest[offset + 1] << 16 |
      digest[offset + 2] << 8 |
      digest[offset + 3]) %
    1000000;

  return otp.toString().padStart(6, '0');
}

export function verifyTOTP(token, secret) {
  for (let w = -1; w <= 1; w++) {
    if (generateTOTP(secret, w) === token) return true;
  }
  return false;
}

export function generateTOTPSecret() {
  const bytes = crypto.randomBytes(20);
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) result += base32Chars[(value << (5 - bits)) & 31];
  return result;
}

export function buildOTPAuthURL(secret, accountName, issuer = 'NexusAIPro') {
  const encoded = encodeURIComponent(accountName);
  return `otpauth://totp/${encoded}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateEnumerationId(prefix, data) {
  const hash = safeHash(JSON.stringify(data) + Date.now().toString());
  return `${prefix}_${hash.substring(0, 16)}`;
}

export default {
  CRYPTO_CONFIG,
  deriveKey,
  generateSalt,
  generateSecureId,
  generateSecureToken,
  hashPassword,
  verifyPassword,
  hmacSign,
  hmacVerify,
  encryptSymmetric,
  decryptSymmetric,
  generateKeyPair,
  computeSharedSecret,
  safeHash,
  generateTOTP,
  verifyTOTP,
  generateTOTPSecret,
  buildOTPAuthURL,
  generateEnumerationId,
};
