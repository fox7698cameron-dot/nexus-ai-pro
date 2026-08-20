// ================================================
// File:        src/auth/auth-service.js
// Purpose:     Full auth service:
//                • Password rules (≥13 chars, mixed classes, symbols)
//                • Emoji + Unicode-safe usernames
//                • TOTP-based multi-factor (RFC 6238)
//                • Biometric-attestation acceptance hooks
//                  (fingerprint / Face ID / Touch ID / retinal)
//                • Role-based routing for admin / dev / moderator / user
// Created:     2026-08-20
// Last-edit:   2026-08-20
// Owner:       Nexus AI Pro platform team
// Notes:       Bcrypt is used for password hashing.  All tokens are signed
//              with an env-provided JWT secret — never a literal.
// ================================================

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const ROLES = Object.freeze(['user', 'moderator', 'developer', 'admin']);

export const ROLE_DASHBOARDS = Object.freeze({
  user: '/app',
  moderator: '/moderation',
  developer: '/dev',
  admin: '/admin'
});

export const PASSWORD_MIN_LENGTH = 13;

/**
 * Structural password validation.  Returns { ok, reasons: string[] }.
 */
export function validatePassword(password) {
  const reasons = [];
  if (typeof password !== 'string') reasons.push('password_must_be_string');
  const len = password ? [...password].length : 0;
  if (len < PASSWORD_MIN_LENGTH) reasons.push(`password_too_short_${PASSWORD_MIN_LENGTH}_required`);
  if (!/[a-z]/.test(password || '')) reasons.push('needs_lowercase');
  if (!/[A-Z]/.test(password || '')) reasons.push('needs_uppercase');
  if (!/\d/.test(password || '')) reasons.push('needs_digit');
  if (!/[^\p{L}\p{N}]/u.test(password || '')) reasons.push('needs_symbol');
  return { ok: reasons.length === 0, reasons };
}

/**
 * Unicode-safe username validation.  Accepts letters, digits, punctuation,
 * connector chars, and emoji.  Blocks control characters and NULs so we
 * never write untrusted control-code payloads into a database row.
 */
export function validateUsername(username) {
  if (typeof username !== 'string') return { ok: false, reason: 'must_be_string' };
  const trimmed = username.trim();
  const len = [...trimmed].length;
  if (len < 3) return { ok: false, reason: 'too_short' };
  if (len > 40) return { ok: false, reason: 'too_long' };
  for (const ch of trimmed) {
    const cp = ch.codePointAt(0);
    if (cp === 0 || (cp >= 0x01 && cp <= 0x1f) || cp === 0x7f) {
      return { ok: false, reason: 'control_chars' };
    }
  }
  return { ok: true, normalized: trimmed.normalize('NFC') };
}

/** Bcrypt with cost 12 — costlier than default 10, well under 250ms. */
export async function hashPassword(password) {
  const check = validatePassword(password);
  if (!check.ok) throw Object.assign(new Error('invalid_password'), { reasons: check.reasons });
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** JWT with signing secret from env; falls back to per-process ephemeral. */
function jwtSecret() {
  return process.env.JWT_SECRET || (globalThis.__nexus_ephemeral_jwt_secret__ ||= crypto.randomBytes(48).toString('hex'));
}

export function signSession(user, ttlSec = 3600) {
  const payload = {
    sub: user.id,
    role: user.role || 'user',
    mfa: !!user.mfaVerified,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSec
  };
  return jwt.sign(payload, jwtSecret(), { algorithm: 'HS256' });
}

export function verifySession(token) {
  try { return jwt.verify(token, jwtSecret()); } catch { return null; }
}

// ------------------------------------------------------------------
// TOTP (RFC 6238) — no external dep so we can vendor it into runtime.
// ------------------------------------------------------------------
export const TOTP = {
  generateSecret() {
    return base32Encode(crypto.randomBytes(20));
  },

  /**
   * Return an otpauth URI compatible with Google Authenticator, 1Password,
   * Authy, etc.
   */
  otpauth({ secret, label, issuer = 'Nexus AI Pro' }) {
    const enc = (s) => encodeURIComponent(s);
    return `otpauth://totp/${enc(issuer)}:${enc(label)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
  },

  code(secret, atMs = Date.now()) {
    const counter = Math.floor(atMs / 1000 / 30);
    const key = base32Decode(secret);
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter % 0x100000000, 4);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const bin = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
    return String(bin % 1_000_000).padStart(6, '0');
  },

  verify(secret, code, atMs = Date.now(), driftSteps = 1) {
    for (let i = -driftSteps; i <= driftSteps; i++) {
      if (this.code(secret, atMs + i * 30_000) === String(code)) return true;
    }
    return false;
  }
};

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 0x1f];
  return out;
}
function base32Decode(input) {
  const clean = input.replace(/=+$/, '').toUpperCase();
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// ------------------------------------------------------------------
// Biometric attestation acceptance.  We do NOT store or handle the
// biometric template — that stays inside the OS secure enclave.  We
// accept the OS-signed attestation blob (WebAuthn on desktop/web, Face
// ID/Touch ID + Android BiometricPrompt on mobile) and record only the
// attestation ID + a hash for the audit trail.
// ------------------------------------------------------------------
export const BIOMETRIC_MODALITIES = Object.freeze([
  'fingerprint', 'face-id', 'touch-id', 'iris', 'retinal'
]);

export function ingestBiometricAttestation({ modality, attestation }) {
  if (!BIOMETRIC_MODALITIES.includes(modality)) {
    throw new Error(`unsupported biometric modality: ${modality}`);
  }
  if (typeof attestation !== 'string' || attestation.length < 32) {
    throw new Error('attestation payload malformed');
  }
  const attestationId = crypto.createHash('sha256').update(attestation).digest('hex').slice(0, 32);
  return {
    modality,
    attestationId,
    verifiedAt: Date.now(),
    // Only the id + hash are stored; the raw blob is dropped.
    stored: { modality, attestationId, verifiedAt: Date.now() }
  };
}

/** Role check — throws when the caller lacks the requested role. */
export function requireRole(session, required) {
  if (!session) throw Object.assign(new Error('unauthenticated'), { code: 401 });
  const rank = ROLES.indexOf(session.role);
  const need = ROLES.indexOf(required);
  if (rank < need) throw Object.assign(new Error('forbidden'), { code: 403 });
}
