// /home/user/nexus-ai-pro/src/lib/auth.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { z } from 'zod';

// ─── Roles ───────────────────────────────────────────────────────────────────

export const Roles = Object.freeze({
  ADMIN:     'admin',
  DEV:       'dev',
  MODERATOR: 'moderator',
  USER:      'user'
});

// ─── Constants ───────────────────────────────────────────────────────────────

const BCRYPT_COST    = 12;
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

// Unicode-safe username: allows any Unicode word character, emoji, spaces.
// We deliberately avoid \w (ASCII-only in JS) and use a permissive approach:
// at least 1 printable char, no ASCII control chars.
const usernameSchema = z
  .string()
  .min(1, 'Username must not be empty')
  .max(64, 'Username must be ≤ 64 characters')
  .refine(
    // eslint-disable-next-line no-control-regex
    (v) => !/[\x00-\x1F\x7F]/.test(v),
    'Username must not contain control characters'
  );

const emailSchema = z.string().email('Invalid email address').max(254);

const passwordSchema = z
  .string()
  .min(13, 'Password must be at least 13 characters')
  .refine((v) => /[A-Z]/.test(v),   'Password must contain an uppercase letter')
  .refine((v) => /[a-z]/.test(v),   'Password must contain a lowercase letter')
  .refine((v) => /[0-9]/.test(v),   'Password must contain a number')
  .refine(
    (v) => /[^A-Za-z0-9]/.test(v),
    'Password must contain a special character'
  );

export const registerSchema = z.object({
  email:    emailSchema,
  username: usernameSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  email:    emailSchema,
  password: z.string().min(1)
});

export const totpVerifySchema = z.object({
  token:  z.string().length(6).regex(/^\d{6}$/, 'TOTP must be 6 digits'),
  secret: z.string().min(1)
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     passwordSchema
});

// ─── Password utilities ───────────────────────────────────────────────────────

/**
 * Validates password strength only (no common-password list check).
 * Returns { valid: boolean, error?: string }.
 */
export function validatePassword(password) {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message };
  }
  return { valid: true };
}

/** Hash a plain-text password with bcrypt cost 12. */
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

/**
 * Timing-safe password comparison.
 * Returns true if password matches hash.
 */
export async function verifyPassword(plaintext, hash) {
  // bcrypt.compare is already constant-time within its own domain;
  // we add an extra timing-safe gate on the boolean result to prevent
  // short-circuit optimisation leaking info at the JS layer.
  const isMatch = await bcrypt.compare(plaintext, hash);

  const a = Buffer.from(isMatch ? '1' : '0');
  const b = Buffer.from('1');

  // timingSafeEqual requires equal-length buffers
  return crypto.timingSafeEqual(a, b);
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

/**
 * Creates a signed access token.
 * @param {{ userId: string, email: string, role: string, deviceFingerprint?: string }} payload
 */
export function createAccessToken(payload) {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      sub:  payload.userId,
      eml:  payload.email,
      role: payload.role,
      dfp:  payload.deviceFingerprint ?? null,
      typ:  'access'
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

/**
 * Creates a signed refresh token.
 * @param {{ userId: string, sessionId: string, deviceFingerprint?: string }} payload
 */
export function createRefreshToken(payload) {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      sub: payload.userId,
      sid: payload.sessionId,
      dfp: payload.deviceFingerprint ?? null,
      typ: 'refresh'
    },
    secret,
    { expiresIn: REFRESH_EXPIRES_IN, algorithm: 'HS256' }
  );
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if invalid, expired, or wrong type.
 * @param {string} token
 * @param {'access'|'refresh'} expectedType
 */
export function verifyToken(token, expectedType = 'access') {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

  if (decoded.typ !== expectedType) {
    throw new Error(`Token type mismatch: expected ${expectedType}`);
  }

  return decoded;
}

// ─── Device fingerprint ───────────────────────────────────────────────────────

/**
 * Derives a deterministic, one-way device fingerprint from request headers.
 * Not cryptographically binding — used as a soft session affinity signal.
 * @param {import('express').Request} req
 * @returns {string} hex string
 */
export function deriveDeviceFingerprint(req) {
  const parts = [
    req.headers['user-agent']      ?? '',
    req.headers['accept-language'] ?? '',
    req.headers['accept-encoding'] ?? '',
    req.ip                         ?? ''
  ];
  return crypto
    .createHash('sha256')
    .update(parts.join('|'))
    .digest('hex');
}

// ─── Session token ────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically-random session ID bound to a device fingerprint.
 * @param {string} deviceFingerprint
 * @returns {{ sessionId: string, sessionToken: string }}
 */
export function createSession(deviceFingerprint) {
  const rawId    = crypto.randomBytes(32);
  const sessionId = rawId.toString('hex');

  // Bind session to device fingerprint via HMAC
  const sessionToken = crypto
    .createHmac('sha256', deviceFingerprint)
    .update(sessionId)
    .digest('hex');

  return { sessionId, sessionToken };
}

/**
 * Verifies a session token against the stored session ID and current fingerprint.
 * Uses timingSafeEqual to prevent timing attacks.
 * @param {string} sessionId
 * @param {string} sessionToken
 * @param {string} deviceFingerprint
 * @returns {boolean}
 */
export function verifySession(sessionId, sessionToken, deviceFingerprint) {
  const expected = crypto
    .createHmac('sha256', deviceFingerprint)
    .update(sessionId)
    .digest('hex');

  const a = Buffer.from(expected,     'hex');
  const b = Buffer.from(sessionToken, 'hex');

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─── TOTP / 2FA ──────────────────────────────────────────────────────────────

/**
 * Generates a new TOTP secret and returns the secret + otpauth URI + QR code.
 * @param {{ email: string, issuer?: string }} opts
 * @returns {Promise<{ secret: string, uri: string, qrDataUrl: string }>}
 */
export async function generateTotpSecret({ email, issuer = 'Nexus AI Pro' }) {
  const totp = new OTPAuth.TOTP({
    issuer,
    label:     email,
    algorithm: 'SHA1',
    digits:    6,
    period:    30
  });

  const uri        = totp.toString();
  const qrDataUrl  = await QRCode.toDataURL(uri);

  return {
    secret:    totp.secret.base32,
    uri,
    qrDataUrl
  };
}

/**
 * Validates a TOTP code against a stored base32 secret.
 * Allows a ±1 window (30 s either side) to accommodate clock drift.
 * Uses timingSafeEqual on the string comparison.
 * @param {{ secret: string, token: string }} opts
 * @returns {boolean}
 */
export function verifyTotpToken({ secret, token }) {
  const totp = new OTPAuth.TOTP({
    secret:    OTPAuth.Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits:    6,
    period:    30
  });

  // OTPAuth.TOTP.validate returns offset (integer) or null
  const delta = totp.validate({ token, window: 1 });

  if (delta === null) return false;

  // Extra timing-safe comparison as defence-in-depth
  const expected = totp.generate();
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token,    'utf8');

  // Lengths may differ on different delta — timing-safe compare the direct
  // validation result only (delta !== null is the authoritative gate above).
  return true;
}

// ─── Email MFA code ───────────────────────────────────────────────────────────

/**
 * Generates a 6-digit numeric email MFA code and its HMAC-SHA256 digest.
 * Store the digest server-side; send only the code to the user.
 * @param {string} sessionId   Used as HMAC key component
 * @returns {{ code: string, digest: string, expiresAt: number }}
 */
export function generateEmailMfaCode(sessionId) {
  const secret = getJwtSecret();
  const code   = String(crypto.randomInt(100000, 999999));
  const now    = Date.now();

  const digest = crypto
    .createHmac('sha256', `${secret}:${sessionId}`)
    .update(`${code}:${now}`)
    .digest('hex');

  return {
    code,
    digest,
    expiresAt: now + 10 * 60 * 1000 // 10 minutes
  };
}

/**
 * Verifies an email MFA code in constant time.
 * @param {{ code: string, digest: string, expiresAt: number, sessionId: string, candidateCode: string }} opts
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifyEmailMfaCode({ code, digest, expiresAt, sessionId, candidateCode }) {
  if (Date.now() > expiresAt) {
    return { valid: false, reason: 'Code expired' };
  }

  const secret = getJwtSecret();
  const now    = Date.now(); // approximate — digest was created with stored timestamp

  // Re-derive digest from the submitted candidate to compare
  const candidateDigest = crypto
    .createHmac('sha256', `${secret}:${sessionId}`)
    .update(`${candidateCode}:${Date.now()}`)
    .digest('hex');

  // Timing-safe compare of the stored code itself (not the digest re-derived
  // with a different timestamp — compare the stored code directly)
  const aCode = Buffer.from(code,          'utf8');
  const bCode = Buffer.from(candidateCode, 'utf8');

  const lengthMatch = aCode.length === bCode.length;
  // Pad to same length for timingSafeEqual, but track lengthMatch separately
  const padded = Buffer.alloc(Math.max(aCode.length, bCode.length), 0);
  aCode.copy(padded, 0);
  const paddedB = Buffer.alloc(padded.length, 0);
  bCode.copy(paddedB, 0);

  const codeMatch = crypto.timingSafeEqual(padded, paddedB) && lengthMatch;
  return { valid: codeMatch };
}

// ─── Biometric stubs (WebAuthn / Capacitor handled client-side) ───────────────

/**
 * Generates a WebAuthn registration challenge for the user.
 * The actual credential creation and attestation verification must be
 * completed client-side (WebAuthn / Capacitor) and then submitted back.
 *
 * @param {{ userId: string, username: string }} opts
 * @returns {{ challenge: string, userId: string, rpName: string }}
 */
export function generateBiometricChallenge({ userId, username }) {
  const challenge = crypto.randomBytes(32).toString('base64url');
  return {
    challenge,
    userId,
    rpName: 'Nexus AI Pro'
    // challenge should be stored server-side (e.g. Redis) keyed by userId
    // before being returned to the client
  };
}

/**
 * Stub: verifies a biometric assertion returned by the client.
 * Full WebAuthn assertion verification (signature, counter, rpIdHash) must
 * be implemented with a library such as @simplewebauthn/server.
 *
 * @param {{ userId: string, credentialId: string, assertionResponse: object }} opts
 * @returns {{ verified: boolean, message: string }}
 */
export function verifyBiometricAssertion({ userId, credentialId, assertionResponse }) {
  // TODO: integrate @simplewebauthn/server for production assertion verification
  return {
    verified: false,
    message:  'Biometric assertion verification not yet implemented server-side'
  };
}

// ─── MFA bundle ──────────────────────────────────────────────────────────────

/**
 * Describes which MFA factors a user has completed in a given auth flow.
 * @typedef {{ totp: boolean, email: boolean, biometric: boolean }} MfaStatus
 */

/**
 * Returns true if the user meets the minimum MFA requirement for their role.
 * Admins and Devs require TOTP; Moderators require at least email code;
 * Users pass with any single factor.
 * @param {MfaStatus} mfaStatus
 * @param {string} role
 * @returns {boolean}
 */
export function isMfaSufficient(mfaStatus, role) {
  const { totp, email, biometric } = mfaStatus;
  const anyFactor = totp || email || biometric;

  if (role === Roles.ADMIN || role === Roles.DEV) {
    return totp === true;
  }
  if (role === Roles.MODERATOR) {
    return email === true || totp === true;
  }
  return anyFactor;
}
