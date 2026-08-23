/**
 * src/utils/crypto-node.js
 * Node.js-only crypto utilities used by server routes.
 * Import this in server-side code; never bundle it with Vite.
 * Created: 2026-08-23
 */

import crypto from 'crypto';

// ── Enumerated error codes ────────────────────────────────────────────────────
export const CryptoError = Object.freeze({
  ENCRYPT_FAILED:    'E_ENCRYPT',
  DECRYPT_FAILED:    'E_DECRYPT',
  KEY_DERIVE_FAILED: 'E_KEY_DERIVE',
  MFA_INVALID:       'E_MFA_INVALID',
  BIOMETRIC_FAILED:  'E_BIOMETRIC',
});

// ── Password strength (duplicated here for server-side use) ──────────────────
const SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
const HAS_UPPER = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/u;
const HAS_LOWER = /[a-z\u00DF-\u00F6\u00F8-\u00FF]/u;
const HAS_DIGIT = /\d/;

export function validatePassword(password) {
  const p = password || '';
  const issues = [];
  if (p.length < 13)           issues.push('Minimum 13 characters required');
  if (!HAS_UPPER.test(p))      issues.push('At least one uppercase letter required');
  if (!HAS_LOWER.test(p))      issues.push('At least one lowercase letter required');
  if (!HAS_DIGIT.test(p))      issues.push('At least one digit required');
  if (!SPECIAL.test(p))        issues.push('At least one special character required');
  let score = 0;
  if (p.length >= 13) score++;
  if (p.length >= 20) score++;
  if (HAS_UPPER.test(p) && HAS_LOWER.test(p)) score++;
  if (HAS_DIGIT.test(p) && SPECIAL.test(p))   score++;
  if (p.length >= 30)                          score++;
  return { valid: issues.length === 0, score, issues };
}

export function validateUsername(username) {
  const u = username || '';
  if (u.length < 2 || u.length > 64) return { valid: false, issue: 'Username must be 2–64 characters' };
  if (/['"`;\\<>{}]/.test(u)) return { valid: false, issue: 'Username contains disallowed characters' };
  return { valid: true };
}

// ── TOTP (RFC 6238) ───────────────────────────────────────────────────────────
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str) {
  const s = str.toUpperCase().replace(/=+$/, '');
  let bits = 0, val = 0;
  const out = [];
  for (const c of s) { val = (val << 5) | BASE32_CHARS.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}

function base32Encode(bytes) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += BASE32_CHARS[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += BASE32_CHARS[(val << (5 - bits)) & 31];
  return out;
}

function _hotp(key, counter) {
  const buf = Buffer.alloc(8);
  let c = BigInt(counter);
  for (let i = 7; i >= 0; i--) { buf[i] = Number(c & 0xffn); c >>= 8n; }
  const mac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code = (((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]) % 1_000_000;
  return code.toString().padStart(6, '0');
}

export function generateTOTPSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export async function verifyTOTP(base32Secret, token) {
  const key = base32Decode(base32Secret);
  const now = Math.floor(Date.now() / 1000 / 30);
  const padded = token.toString().padStart(6, '0');
  for (const delta of [-1, 0, 1]) {
    const expected = _hotp(key, now + delta);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(padded))) return true;
  }
  return false;
}
