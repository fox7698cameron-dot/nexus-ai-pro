// src/auth/mfa.service.js
// TOTP 2FA / MFA — otplib + QR code generation; no secrets stored in plaintext
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { env } from '../config/env.js';

// Configure window tolerance (±1 step)
authenticator.options = { window: env.MFA_TOKEN_WINDOW };

// Encrypt TOTP secret before DB storage using AES-256-GCM
function encryptSecret(secret) {
  const key = crypto.scryptSync(env.ENCRYPTION_SECRET, env.ENCRYPTION_SALT, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(enc) {
  const [ivHex, tagHex, encHex] = enc.split(':');
  const key = crypto.scryptSync(env.ENCRYPTION_SECRET, env.ENCRYPTION_SALT, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

export function generateTotpSecret(userEmail) {
  const rawSecret = authenticator.generateSecret(20);
  const encryptedSecret = encryptSecret(rawSecret);
  const otpauth = authenticator.keyuri(userEmail, env.MFA_ISSUER, rawSecret);
  return { encryptedSecret, otpauth };
}

export async function generateTotpQrCode(otpauth) {
  return QRCode.toDataURL(otpauth, { errorCorrectionLevel: 'H', width: 256 });
}

export function verifyTotpToken(token, encryptedSecret) {
  try {
    const rawSecret = decryptSecret(encryptedSecret);
    return authenticator.verify({ token: String(token), secret: rawSecret });
  } catch {
    return false;
  }
}

// Backup codes — 10 random hex codes, stored as bcrypt hashes
import bcryptjs from 'bcryptjs';

export async function generateBackupCodes() {
  const codes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase()
  );
  const hashes = await Promise.all(codes.map(c => bcryptjs.hash(c, 10)));
  return { codes, hashes };
}

export async function verifyBackupCode(submitted, hashes) {
  for (let i = 0; i < hashes.length; i++) {
    if (await bcryptjs.compare(submitted.toUpperCase(), hashes[i])) {
      return { valid: true, usedIndex: i };
    }
  }
  return { valid: false, usedIndex: -1 };
}

// Email / SMS OTP — 6-digit code, 10-minute TTL
export function generateOtpCode() {
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const hash = crypto.createHmac('sha256', env.JWT_SECRET).update(code).digest('hex');
  return { code, hash, expiresAt };
}

export function verifyOtpCode(submitted, expectedHash) {
  const submittedHash = crypto.createHmac('sha256', env.JWT_SECRET).update(String(submitted)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(expectedHash));
}
