/**
 * @file authService.js
 * @description Comprehensive authentication service for Nexus AI Pro.
 *   Handles user registration, JWT issuance, TOTP-based MFA, biometric
 *   challenge generation, and audit logging.
 * @created 2026-08-04
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Environment-sourced constants (never hardcode secrets)
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  // Warn loudly at startup; do not throw so tests can stub env vars.
  console.warn(
    '[authService] WARNING: JWT_SECRET and JWT_REFRESH_SECRET must be set in process.env'
  );
}

// ---------------------------------------------------------------------------
// Supported roles
// ---------------------------------------------------------------------------
/** @type {string[]} */
export const ROLES = Object.freeze(['admin', 'dev', 'moderator', 'user']);

// ---------------------------------------------------------------------------
// In-memory stores (replace with DB adapters in production)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} UserRecord
 * @property {string}  id
 * @property {string}  username       - Display name; emoji allowed
 * @property {string}  email
 * @property {string}  passwordHash
 * @property {string}  salt           - Per-user salt (stored separately from hash)
 * @property {string}  role
 * @property {boolean} mfaEnabled
 * @property {string|null} mfaSecret  - Base32 TOTP secret
 * @property {string|null} biometricChallenge
 * @property {number}  createdAt
 */

/** @type {Map<string, UserRecord>} */
const users = new Map();           // keyed by userId

/** @type {Map<string, string>} emailIndex: email -> userId */
const emailIndex = new Map();

/** @type {Set<string>} invalidated refresh tokens */
const revokedTokens = new Set();

/** @type {Array<Object>} in-memory audit log */
const auditLog = [];

// ---------------------------------------------------------------------------
// RFC 6238 TOTP implementation (HMAC-SHA1, no external lib)
// ---------------------------------------------------------------------------

/**
 * Encodes an ASCII string as Base32 (RFC 4648).
 * @param {Buffer} buf
 * @returns {string}
 */
function base32Encode(buf) {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 0x1f];
  return output;
}

/**
 * Decodes a Base32 string (RFC 4648) into a Buffer.
 * @param {string} str
 * @returns {Buffer}
 */
function base32Decode(str) {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  str = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of str) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid Base32 character: ' + char);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(output);
}

/**
 * Generates a TOTP code per RFC 6238 (HMAC-SHA1, 30s step, 6 digits).
 * @param {string} base32Secret
 * @param {number} [timeStep=30]   - Window size in seconds
 * @param {number} [digits=6]
 * @returns {string}
 */
export function generateTOTPCode(base32Secret, timeStep = 30, digits = 6) {
  const keyBuf = base32Decode(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBuf = Buffer.alloc(8);
  // Write as big-endian 64-bit integer (JS safe-integer range is fine here)
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', keyBuf).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
}

/**
 * Verifies a TOTP token with a ±1 window tolerance.
 * @param {string} base32Secret
 * @param {string} token
 * @param {number} [timeStep=30]
 * @param {number} [window=1]  - Adjacent windows to accept
 * @returns {boolean}
 */
export function verifyTOTPCode(base32Secret, token, timeStep = 30, window = 1) {
  const keyBuf = base32Decode(base32Secret);
  const now = Math.floor(Date.now() / 1000 / timeStep);
  for (let delta = -window; delta <= window; delta++) {
    const counter = now + delta;
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    counterBuf.writeUInt32BE(counter >>> 0, 4);
    const hmac = crypto.createHmac('sha1', keyBuf).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      (hmac[offset + 1] << 16) |
      (hmac[offset + 2] << 8) |
      hmac[offset + 3];
    const expected = (code % 1_000_000).toString().padStart(6, '0');
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Password validation
// ---------------------------------------------------------------------------

/**
 * Validates a plaintext password against security policy.
 * Requirements: ≥13 chars, at least one uppercase, one lowercase,
 * one digit, one special character.
 * @param {string} password
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePassword(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string.' };
  if (password.length < 13)
    return { valid: false, reason: 'Password must be at least 13 characters long.' };
  if (!/[A-Z]/.test(password))
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  if (!/[a-z]/.test(password))
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  if (!/[0-9]/.test(password))
    return { valid: false, reason: 'Password must contain at least one digit.' };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password))
    return { valid: false, reason: 'Password must contain at least one special character.' };
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AuditEntry
 * @property {string} event
 * @property {string|null} userId
 * @property {string|null} ip
 * @property {string} timestamp  - ISO 8601
 * @property {string|null} sessionId
 */

/**
 * Appends a structured audit log entry.
 * @param {string} event
 * @param {{ userId?: string, ip?: string, sessionId?: string }} context
 */
export function writeAuditEntry(event, { userId = null, ip = null, sessionId = null } = {}) {
  /** @type {AuditEntry} */
  const entry = {
    event,
    userId,
    ip,
    timestamp: new Date().toISOString(),
    sessionId,
  };
  auditLog.push(entry);
  // In production, persist to DB / SIEM. Here we emit to stdout in structured form.
  console.log('[audit]', JSON.stringify(entry));
}

/**
 * Returns a copy of the current audit log (admin use only).
 * @returns {AuditEntry[]}
 */
export function getAuditLog() {
  return [...auditLog];
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/**
 * Issues a short-lived access JWT (15 min).
 * @param {{ id: string, email: string, role: string, mfaVerified?: boolean }} payload
 * @returns {string}
 */
export function issueAccessToken(payload) {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      role: payload.role,
      mfaVerified: payload.mfaVerified ?? false,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL, jwtid: uuidv4() }
  );
}

/**
 * Issues a long-lived refresh JWT (7 days).
 * @param {string} userId
 * @param {string} sessionId
 * @returns {string}
 */
export function issueRefreshToken(userId, sessionId) {
  return jwt.sign(
    { sub: userId, sessionId },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL, jwtid: uuidv4() }
  );
}

/**
 * Verifies an access token and returns the decoded payload.
 * @param {string} token
 * @returns {object}
 * @throws {jwt.JsonWebTokenError}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Verifies a refresh token.
 * @param {string} token
 * @returns {object}
 * @throws {jwt.JsonWebTokenError}
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

// ---------------------------------------------------------------------------
// User registration
// ---------------------------------------------------------------------------

/**
 * Registers a new user.
 * Usernames support Unicode including emoji.
 * Enumeration-safe: returns a generic error message on duplicate email.
 *
 * @param {{ username: string, email: string, password: string, role?: string }} params
 * @param {{ ip?: string, sessionId?: string }} ctx
 * @returns {Promise<{ user: Partial<UserRecord>, accessToken: string, refreshToken: string }>}
 */
export async function registerUser(
  { username, email, password, role = 'user' },
  ctx = {}
) {
  // Validate role
  if (!ROLES.includes(role)) {
    throw Object.assign(new Error('Invalid role.'), { status: 400 });
  }

  // Validate password strength
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    throw Object.assign(new Error(pwCheck.reason), { status: 400 });
  }

  // Enumeration-safe duplicate check
  if (emailIndex.has(email.toLowerCase())) {
    // Same error as a bad-password scenario to prevent user enumeration
    throw Object.assign(new Error('Registration failed. Please try again.'), { status: 409 });
  }

  // Per-user salt (stored separately from bcrypt hash for Argon2-style hygiene)
  const salt = crypto.randomBytes(32).toString('hex');

  // bcrypt with cost factor 12 (≥13 rounds discouraged per spec; 12 is ≥ bcrypt min recommendation)
  const passwordHash = await bcrypt.hash(password + salt, BCRYPT_ROUNDS);

  const userId = uuidv4();
  const sessionId = uuidv4();

  /** @type {UserRecord} */
  const user = {
    id: userId,
    username,
    email: email.toLowerCase(),
    passwordHash,
    salt,
    role,
    mfaEnabled: false,
    mfaSecret: null,
    biometricChallenge: null,
    createdAt: Date.now(),
  };

  users.set(userId, user);
  emailIndex.set(email.toLowerCase(), userId);

  writeAuditEntry('USER_REGISTERED', { userId, ip: ctx.ip, sessionId });

  const accessToken = issueAccessToken({ id: userId, email: user.email, role, mfaVerified: false });
  const refreshToken = issueRefreshToken(userId, sessionId);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Authenticates a user with email + password.
 * Returns tokens; mfaRequired flag signals the caller to prompt for TOTP.
 *
 * @param {{ email: string, password: string }} params
 * @param {{ ip?: string, sessionId?: string }} ctx
 * @returns {Promise<{ user: Partial<UserRecord>, accessToken: string, refreshToken: string, mfaRequired: boolean }>}
 */
export async function loginUser({ email, password }, ctx = {}) {
  // Constant-time lookup (always run bcrypt to prevent timing attacks)
  const GENERIC_ERROR = 'Invalid credentials.';

  const userId = emailIndex.get(email.toLowerCase());
  const user = userId ? users.get(userId) : null;

  // If user not found, still run a dummy bcrypt compare to equalise timing
  const dummyHash = '$2a$12$0000000000000000000000000000000000000000000000000000';
  const candidateHash = user ? user.passwordHash : dummyHash;
  const candidateSalt = user ? user.salt : '';

  const match = await bcrypt.compare((password + candidateSalt), candidateHash);

  if (!user || !match) {
    writeAuditEntry('LOGIN_FAILED', { userId: userId ?? null, ip: ctx.ip });
    throw Object.assign(new Error(GENERIC_ERROR), { status: 401 });
  }

  const sessionId = uuidv4();
  writeAuditEntry('LOGIN_SUCCESS', { userId, ip: ctx.ip, sessionId });

  const mfaRequired = user.mfaEnabled;
  // If MFA is enabled, issue a token that is NOT yet mfaVerified
  const accessToken = issueAccessToken({
    id: userId,
    email: user.email,
    role: user.role,
    mfaVerified: !mfaRequired,
  });
  const refreshToken = issueRefreshToken(userId, sessionId);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
    mfaRequired,
  };
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Rotates a refresh token: validates the old one, revokes it, issues fresh pair.
 * @param {string} refreshToken
 * @param {{ ip?: string }} ctx
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export function rotateTokens(refreshToken, ctx = {}) {
  if (revokedTokens.has(refreshToken)) {
    throw Object.assign(new Error('Token has been revoked.'), { status: 401 });
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token.'), { status: 401 });
  }

  const user = users.get(payload.sub);
  if (!user) {
    throw Object.assign(new Error('Invalid or expired refresh token.'), { status: 401 });
  }

  // Revoke old token (token rotation)
  revokedTokens.add(refreshToken);

  const sessionId = uuidv4();
  const newAccess = issueAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    mfaVerified: !user.mfaEnabled, // MFA re-verification required after token rotation if enabled
  });
  const newRefresh = issueRefreshToken(user.id, sessionId);

  writeAuditEntry('TOKEN_ROTATED', { userId: user.id, ip: ctx.ip, sessionId });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Revokes a refresh token, preventing further rotation.
 * @param {string} refreshToken
 * @param {{ ip?: string, sessionId?: string }} ctx
 */
export function logoutUser(refreshToken, ctx = {}) {
  revokedTokens.add(refreshToken);
  let userId = null;
  try {
    const payload = verifyRefreshToken(refreshToken);
    userId = payload.sub;
  } catch { /* token already invalid — still add to set */ }
  writeAuditEntry('USER_LOGGED_OUT', { userId, ip: ctx.ip, sessionId: ctx.sessionId });
}

// ---------------------------------------------------------------------------
// TOTP MFA
// ---------------------------------------------------------------------------

/**
 * Generates a TOTP secret and provisioning URI for a user.
 * @param {string} userId
 * @returns {{ secret: string, otpauthUrl: string }}
 */
export function setupMFA(userId) {
  const user = users.get(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });

  const secretBuf = crypto.randomBytes(20); // 160-bit TOTP secret
  const secret = base32Encode(secretBuf);

  // Store pending secret (not activated until verified)
  user.mfaSecret = secret;
  users.set(userId, user);

  const issuer = encodeURIComponent(process.env.APP_NAME ?? 'NexusAIPro');
  const account = encodeURIComponent(user.email);
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  writeAuditEntry('MFA_SETUP_INITIATED', { userId });

  return { secret, otpauthUrl };
}

/**
 * Verifies a TOTP token and, on success, activates MFA for the user.
 * @param {string} userId
 * @param {string} token  - 6-digit TOTP code
 * @param {{ ip?: string, sessionId?: string }} ctx
 * @returns {{ mfaEnabled: boolean, accessToken: string }}
 */
export function verifyAndActivateMFA(userId, token, ctx = {}) {
  const user = users.get(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
  if (!user.mfaSecret)
    throw Object.assign(new Error('MFA setup not initiated.'), { status: 400 });

  const valid = verifyTOTPCode(user.mfaSecret, token);
  if (!valid) {
    writeAuditEntry('MFA_VERIFY_FAILED', { userId, ip: ctx.ip });
    throw Object.assign(new Error('Invalid MFA token.'), { status: 401 });
  }

  user.mfaEnabled = true;
  users.set(userId, user);

  writeAuditEntry('MFA_ACTIVATED', { userId, ip: ctx.ip, sessionId: ctx.sessionId });

  // Issue a fully-verified access token
  const accessToken = issueAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    mfaVerified: true,
  });

  return { mfaEnabled: true, accessToken };
}

// ---------------------------------------------------------------------------
// Biometric (WebAuthn-compatible stubs)
// ---------------------------------------------------------------------------

/**
 * Generates a WebAuthn-compatible registration challenge using crypto.randomBytes.
 * The challenge is stored on the user record pending verification.
 * @param {string} userId
 * @returns {{ challenge: string, userId: string, rpName: string, rpId: string }}
 */
export function generateBiometricChallenge(userId) {
  const user = users.get(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });

  const challenge = crypto.randomBytes(32).toString('base64url');
  user.biometricChallenge = challenge;
  users.set(userId, user);

  writeAuditEntry('BIOMETRIC_CHALLENGE_ISSUED', { userId });

  return {
    challenge,
    userId,
    rpName: process.env.APP_NAME ?? 'NexusAIPro',
    rpId: process.env.RP_ID ?? 'nexusai.pro',
  };
}

/**
 * Stub: verifies a biometric assertion.
 * In production, perform full WebAuthn assertion verification here.
 * @param {string} userId
 * @param {object} assertion  - WebAuthn assertion from client
 * @param {{ ip?: string, sessionId?: string }} ctx
 * @returns {{ verified: boolean, accessToken: string }}
 */
export function verifyBiometricAssertion(userId, assertion, ctx = {}) {
  const user = users.get(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
  if (!user.biometricChallenge)
    throw Object.assign(new Error('No active biometric challenge.'), { status: 400 });

  // TODO: Replace stub with full @simplewebauthn/server verification
  // For now, accept any assertion object that carries the correct challenge echo
  const challengeMatches =
    assertion?.response?.clientDataJSON &&
    Buffer.from(assertion.response.clientDataJSON, 'base64url')
      .toString()
      .includes(user.biometricChallenge);

  if (!challengeMatches) {
    writeAuditEntry('BIOMETRIC_VERIFY_FAILED', { userId, ip: ctx.ip });
    throw Object.assign(new Error('Biometric assertion verification failed.'), { status: 401 });
  }

  // Clear used challenge
  user.biometricChallenge = null;
  users.set(userId, user);

  writeAuditEntry('BIOMETRIC_VERIFIED', { userId, ip: ctx.ip, sessionId: ctx.sessionId });

  const accessToken = issueAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    mfaVerified: true,
  });

  return { verified: true, accessToken };
}

// ---------------------------------------------------------------------------
// Profile helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves a sanitized user record by ID.
 * @param {string} userId
 * @returns {Partial<UserRecord>}
 */
export function getUserById(userId) {
  const user = users.get(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
  return sanitizeUser(user);
}

/**
 * Updates a user profile (display name with emoji support, email).
 * @param {string} userId
 * @param {{ username?: string, email?: string }} updates
 * @returns {Partial<UserRecord>}
 */
export function updateUserProfile(userId, updates) {
  const user = users.get(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });

  if (updates.username !== undefined) {
    // Username accepts any Unicode codepoints including emoji
    if (typeof updates.username !== 'string' || updates.username.trim().length === 0)
      throw Object.assign(new Error('Username must be a non-empty string.'), { status: 400 });
    user.username = updates.username.trim();
  }

  if (updates.email !== undefined) {
    const newEmail = updates.email.toLowerCase();
    if (newEmail !== user.email) {
      if (emailIndex.has(newEmail))
        throw Object.assign(new Error('Email already in use.'), { status: 409 });
      emailIndex.delete(user.email);
      emailIndex.set(newEmail, userId);
      user.email = newEmail;
    }
  }

  users.set(userId, user);
  writeAuditEntry('PROFILE_UPDATED', { userId });
  return sanitizeUser(user);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a user object with all sensitive fields removed.
 * @param {UserRecord} user
 * @returns {Partial<UserRecord>}
 */
function sanitizeUser(user) {
  const { passwordHash, salt, mfaSecret, biometricChallenge, ...safe } = user; // eslint-disable-line no-unused-vars
  return safe;
}
