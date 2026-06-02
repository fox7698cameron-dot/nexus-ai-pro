// src/services/mfa-service.js
// Date: 2026-06-02
// TOTP/HOTP multi-factor authentication service

import { TOTP, generateSecret } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

const APP_NAME = 'Nexus AI Pro';

const totp = new TOTP({
  digits: 6,
  period: 30,
  algorithm: 'sha1',
  window: 1,
});

export function generateMfaSecret() {
  const secret = generateSecret({ size: 20 });
  return { secret };
}

export async function generateQrCodeUrl(email, base32Secret) {
  const otpAuthUrl = totp.keyuri(email, APP_NAME, base32Secret);
  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { width: 200, margin: 2 });
  return { otpAuthUrl, qrDataUrl };
}

export function verifyTotp(token, base32Secret) {
  try {
    return totp.check(token, base32Secret);
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,4}/g).join('-')
  );
}

export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.replace(/-/g, '')).digest('hex');
}

export function verifyBackupCode(inputCode, storedHashes) {
  const normalized = inputCode.replace(/-/g, '').toUpperCase();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  const idx = storedHashes.indexOf(hash);
  return idx;
}
