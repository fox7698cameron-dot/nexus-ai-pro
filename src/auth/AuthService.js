/**
 * @file AuthService.js
 * @description Comprehensive authentication service for Nexus AI Pro.
 *   Covers registration, login, biometric/WebAuthn, TOTP 2FA, MFA flows,
 *   session management, RBAC, audit logging, and AES-256-GCM encryption.
 *   All secrets are read from process.env — no hardcoded values.
 * @author Cameron Fox <contact@nexusai.pro>
 * @date 2026-08-30
 * @license Apache-2.0
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @module auth/AuthService
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validatePassword } from './PasswordValidator.js';

// ─── Environment helpers ────────────────────────────────────────────────────

/**
 * Reads a required environment variable, throwing if absent.
 * @param {string} key
 * @returns {string}
 */
function requireEnv(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable: ${key}`);
  return v;
}

// ─── Error classes ──────────────────────────────────────────────────────────

/** Base authentication error. */
export class AuthError extends Error {
  /**
   * @param {string} message
   * @param {string} [code='AUTH_ERROR']
   * @param {number} [statusCode=401]
   */
  constructor(message, code = 'AUTH_ERROR', statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** Thrown when an MFA step fails or is required. */
export class MFAError extends AuthError {
  /**
   * @param {string} message
   * @param {string} [code='MFA_ERROR']
   */
  constructor(message, code = 'MFA_ERROR') {
    super(message, code, 403);
    this.name = 'MFAError';
  }
}

/** Thrown when a biometric operation fails. */
export class BiometricError extends AuthError {
  /**
   * @param {string} message
   * @param {string} [code='BIOMETRIC_ERROR']
   */
  constructor(message, code = 'BIOMETRIC_ERROR') {
    super(message, code, 403);
    this.name = 'BiometricError';
  }
}

// ─── RBAC — role hierarchy & permissions ───────────────────────────────────

/**
 * Role hierarchy (higher index = more privilege).
 * @type {string[]}
 */
const ROLE_HIERARCHY = ['user', 'moderator', 'dev', 'admin'];

/**
 * Permission sets per role. Higher roles inherit lower-role permissions.
 * @type {Object.<string, string[]>}
 */
const ROLE_PERMISSIONS = {
  user: [
    'profile:read',
    'profile:write',
    'content:read',
    'session:own:read',
    'session:own:revoke',
  ],
  moderator: [
    'content:moderate',
    'user:read',
    'report:read',
    'report:resolve',
  ],
  dev: [
    'api:read',
    'api:write',
    'logs:read',
    'deploy:staging',
    'feature:toggle',
  ],
  admin: [
    'user:write',
    'user:delete',
    'role:assign',
    'audit:read',
    'system:config',
    'deploy:production',
    'session:any:revoke',
    'mfa:bypass',
    'biometric:manage',
  ],
};

/**
 * Returns the full permission set for a given role (cumulative up the hierarchy).
 * @param {string} role
 * @returns {string[]}
 */
function getPermissionsForRole(role) {
  const idx = ROLE_HIERARCHY.indexOf(role);
  if (idx === -1) return [];
  return ROLE_HIERARCHY.slice(0, idx + 1).flatMap((r) => ROLE_PERMISSIONS[r] || []);
}

// ─── Encryption helpers (AES-256-GCM) ──────────────────────────────────────

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // 96-bit IV recommended for GCM
const TAG_LEN = 16;

/**
 * Derives a 32-byte key from process.env.ENCRYPTION_KEY using SHA-256.
 * @returns {Buffer}
 */
function getEncryptionKey() {
  return crypto.createHash('sha256').update(requireEnv('ENCRYPTION_KEY')).digest();
}

/**
 * Encrypts a UTF-8 string with AES-256-GCM.
 * @param {string} plaintext
 * @returns {{ iv: string, tag: string, ciphertext: string }} — all hex-encoded
 */
export function encryptSensitive(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload produced by {@link encryptSensitive}.
 * @param {{ iv: string, tag: string, ciphertext: string }} payload
 * @returns {string} — plaintext
 */
export function decryptSensitive({ iv, tag, ciphertext }) {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'hex'), {
    authTagLength: TAG_LEN,
  });
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

// ─── Audit logger ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} AuditEntry
 * @property {string} timestamp - ISO-8601
 * @property {string} action    - e.g. 'login', 'failed_login'
 * @property {string} userId
 * @property {string} ip
 * @property {string} userAgent
 * @property {Object} metadata
 */

/** In-memory audit log store (replace with persistent store in production). */
const _auditLog = [];

/**
 * Supported audit action names.
 * @enum {string}
 */
export const AuditAction = Object.freeze({
  LOGIN: 'login',
  LOGOUT: 'logout',
  FAILED_LOGIN: 'failed_login',
  PASSWORD_CHANGE: 'password_change',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  ROLE_CHANGE: 'role_change',
  BIOMETRIC_REGISTERED: 'biometric_registered',
  SESSION_REVOKED: 'session_revoked',
  ACCOUNT_LOCKED: 'account_locked',
});

/**
 * Records a structured audit event.
 * @param {string} action
 * @param {string} userId
 * @param {string} ip
 * @param {string} userAgent
 * @param {Object} [metadata={}]
 * @returns {AuditEntry}
 */
export function auditLog(action, userId, ip, userAgent, metadata = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip,
    userAgent,
    metadata,
  };
  _auditLog.push(entry);
  // In production, forward to a SIEM / persistent store here.
  return entry;
}

/**
 * Returns audit log entries for a given userId, optionally filtered by action.
 * @param {string} userId
 * @param {string} [action]
 * @returns {AuditEntry[]}
 */
export function getAuditLog(userId, action) {
  return _auditLog.filter(
    (e) => e.userId === userId && (action ? e.action === action : true)
  );
}

// ─── In-memory stores (swap for DB adapters in production) ─────────────────

/** @type {Map<string, Object>} userId → user record */
const _users = new Map();

/** @type {Map<string, Set<string>>} userId → Set of active session IDs */
const _sessions = new Map();

/** @type {Map<string, Object>} sessionId → session metadata */
const _sessionMeta = new Map();

/** @type {Map<string, { attempts: number, lockUntil: number|null }>} userId → rate-limit state */
const _rateLimits = new Map();

/** @type {Map<string, string>} refreshToken → userId */
const _refreshTokens = new Map();

/** @type {Map<string, { otp: string, expiresAt: number }>} userId → pending OTP */
const _otpStore = new Map();

// ─── Constants ─────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRY_MS = 5 * 60 * 1000;         // 5 minutes
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const VALID_ROLES = new Set(ROLE_HIERARCHY);

// ─── Validation helpers ─────────────────────────────────────────────────────

/**
 * Validates an email address with a broad RFC-5322 approximation.
 * Supports international domains (IDN not decoded here).
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (typeof email !== 'string' || email.length > 254) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
  return re.test(email.trim());
}

/**
 * Validates a username.
 * Rules: 2–64 grapheme clusters, allows Unicode letters, digits, emojis,
 * underscores, hyphens, and dots; no leading/trailing/consecutive dots.
 * @param {string} username
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, reason: 'Must be a string.' };
  // Count grapheme clusters for accurate Unicode length
  const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const clusters = [...seg.segment(username)];
  if (clusters.length < 2) return { valid: false, reason: 'Username too short (min 2 characters).' };
  if (clusters.length > 64) return { valid: false, reason: 'Username too long (max 64 characters).' };
  if (/^\./u.test(username) || /\.$/u.test(username))
    return { valid: false, reason: 'Username cannot start or end with a dot.' };
  if (/\.\./u.test(username))
    return { valid: false, reason: 'Username cannot contain consecutive dots.' };
  // Allow: Unicode letters/digits/marks, emoji, _, -, .
  // Reject control characters and invisible separators
  if (/[ --]/u.test(username))
    return { valid: false, reason: 'Username contains invalid control characters.' };
  return { valid: true };
}

// ─── Rate limiting ──────────────────────────────────────────────────────────

/**
 * Checks whether a userId is currently rate-limited and records a failed attempt.
 * @param {string} userId
 * @throws {AuthError} if account is locked
 */
function recordFailedAttempt(userId) {
  const state = _rateLimits.get(userId) || { attempts: 0, lockUntil: null };
  const now = Date.now();

  if (state.lockUntil && now < state.lockUntil) {
    const remaining = Math.ceil((state.lockUntil - now) / 1000);
    throw new AuthError(
      `Account locked. Try again in ${remaining}s.`,
      'ACCOUNT_LOCKED',
      429
    );
  }

  state.attempts += 1;
  if (state.attempts >= MAX_FAILED_ATTEMPTS) {
    state.lockUntil = now + LOCKOUT_DURATION_MS;
    state.attempts = 0;
  }
  _rateLimits.set(userId, state);
}

/** Clears rate-limit state after a successful login. @param {string} userId */
function clearRateLimit(userId) {
  _rateLimits.delete(userId);
}

// ─── Token helpers ─────────────────────────────────────────────────────────

/**
 * Issues a signed JWT access token.
 * @param {{ userId: string, role: string, sessionId: string }} payload
 * @returns {string}
 */
function issueAccessToken({ userId, role, sessionId }) {
  return jwt.sign(
    { sub: userId, role, sid: sessionId, type: 'access' },
    requireEnv('JWT_SECRET'),
    { expiresIn: ACCESS_TOKEN_TTL, algorithm: 'HS256' }
  );
}

/**
 * Issues an opaque refresh token and stores the mapping.
 * @param {string} userId
 * @returns {string}
 */
function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  _refreshTokens.set(token, userId);
  return token;
}

/**
 * Rotates a refresh token — old token is invalidated, new one is issued.
 * @param {string} oldToken
 * @returns {{ userId: string, refreshToken: string }}
 * @throws {AuthError}
 */
export function rotateRefreshToken(oldToken) {
  const userId = _refreshTokens.get(oldToken);
  if (!userId) throw new AuthError('Invalid or expired refresh token.', 'INVALID_REFRESH_TOKEN');
  _refreshTokens.delete(oldToken);
  const refreshToken = issueRefreshToken(userId);
  return { userId, refreshToken };
}

// ─── Session management ────────────────────────────────────────────────────

/**
 * @typedef {Object} SessionInfo
 * @property {string} sessionId
 * @property {string} userId
 * @property {string} deviceFingerprint
 * @property {string} ipAddress
 * @property {string} userAgent
 * @property {Object} geo  - IP-based geolocation stub (populate via geo-ip service)
 * @property {number} createdAt - Unix ms
 * @property {number} lastSeenAt - Unix ms
 */

/**
 * Creates and registers a new session.
 * @param {string} userId
 * @param {Object} ctx
 * @param {string} ctx.ip
 * @param {string} ctx.userAgent
 * @param {string} ctx.deviceFingerprint
 * @returns {SessionInfo}
 */
function createSession(userId, { ip, userAgent, deviceFingerprint }) {
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  /** @type {SessionInfo} */
  const session = {
    sessionId,
    userId,
    deviceFingerprint,
    ipAddress: ip,
    userAgent,
    geo: resolveGeo(ip),
    createdAt: now,
    lastSeenAt: now,
  };
  if (!_sessions.has(userId)) _sessions.set(userId, new Set());
  _sessions.get(userId).add(sessionId);
  _sessionMeta.set(sessionId, session);
  return session;
}

/**
 * Stub for IP-based geolocation.  Replace with a real geo-IP lookup in production.
 * @param {string} ip
 * @returns {{ country: string|null, city: string|null, ip: string }}
 */
function resolveGeo(ip) {
  return { country: null, city: null, ip };
}

/**
 * Returns all active sessions for a user.
 * @param {string} userId
 * @returns {SessionInfo[]}
 */
export function getUserSessions(userId) {
  const ids = _sessions.get(userId) || new Set();
  return [...ids].map((id) => _sessionMeta.get(id)).filter(Boolean);
}

/**
 * Revokes a specific session (or all sessions for a user).
 * @param {string} userId
 * @param {string} [sessionId] - omit to revoke all sessions
 * @param {Object} ctx - audit context { ip, userAgent }
 */
export function revokeSession(userId, sessionId, ctx = {}) {
  const ids = _sessions.get(userId) || new Set();
  const toRevoke = sessionId ? [sessionId] : [...ids];
  for (const id of toRevoke) {
    ids.delete(id);
    _sessionMeta.delete(id);
    auditLog(AuditAction.SESSION_REVOKED, userId, ctx.ip || '', ctx.userAgent || '', {
      revokedSessionId: id,
    });
  }
  if (!sessionId) _sessions.delete(userId);
}

// ─── User registration ──────────────────────────────────────────────────────

/**
 * @typedef {Object} RegisterOptions
 * @property {string} username
 * @property {string} email
 * @property {string} password
 * @property {string} [role='user']
 */

/**
 * @typedef {Object} UserRecord
 * @property {string} id
 * @property {string} username
 * @property {string} email
 * @property {string} passwordHash
 * @property {string} role
 * @property {string[]} permissions
 * @property {boolean} mfaEnabled
 * @property {string|null} totpSecret   - encrypted
 * @property {string[]} backupCodes     - hashed
 * @property {Object[]} biometricKeys   - WebAuthn credential records
 * @property {number} createdAt
 * @property {boolean} active
 */

/**
 * Registers a new user.
 * @param {RegisterOptions} options
 * @param {Object} ctx - request context { ip, userAgent }
 * @returns {Promise<{ userId: string, user: Partial<UserRecord> }>}
 * @throws {AuthError}
 */
export async function register(
  { username, email, password, role = 'user' },
  ctx = {}
) {
  // Validate username
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.valid)
    throw new AuthError(usernameCheck.reason, 'INVALID_USERNAME', 400);

  // Validate email
  if (!isValidEmail(email))
    throw new AuthError('Invalid email address.', 'INVALID_EMAIL', 400);

  // Validate role
  if (!VALID_ROLES.has(role))
    throw new AuthError(`Invalid role. Must be one of: ${[...VALID_ROLES].join(', ')}`, 'INVALID_ROLE', 400);

  // Validate password
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid)
    throw new AuthError(pwCheck.reason, 'WEAK_PASSWORD', 400);

  // Check uniqueness
  for (const u of _users.values()) {
    if (u.email.toLowerCase() === email.toLowerCase())
      throw new AuthError('Email already registered.', 'EMAIL_TAKEN', 409);
    if (u.username.toLowerCase() === username.toLowerCase())
      throw new AuthError('Username already taken.', 'USERNAME_TAKEN', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = crypto.randomUUID();

  /** @type {UserRecord} */
  const user = {
    id: userId,
    username,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    permissions: getPermissionsForRole(role),
    mfaEnabled: false,
    totpSecret: null,
    backupCodes: [],
    biometricKeys: [],
    createdAt: Date.now(),
    active: true,
  };

  _users.set(userId, user);

  return {
    userId,
    user: { id: userId, username, email: user.email, role, permissions: user.permissions },
  };
}

// ─── Login ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} LoginResult
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {SessionInfo} session
 * @property {boolean} mfaRequired
 * @property {string} [mfaChallengeToken] - short-lived token for MFA step
 */

/**
 * Authenticates a user with email + password.
 * If MFA is enabled, returns mfaRequired=true with a challenge token instead
 * of full tokens.
 *
 * @param {{ email: string, password: string }} credentials
 * @param {Object} ctx - { ip, userAgent, deviceFingerprint }
 * @returns {Promise<LoginResult>}
 * @throws {AuthError}
 */
export async function login({ email, password }, ctx = {}) {
  const user = findUserByEmail(email);

  if (!user) {
    // Avoid timing oracle — still hash to equalise time
    await bcrypt.hash(password, BCRYPT_ROUNDS);
    throw new AuthError('Invalid credentials.', 'INVALID_CREDENTIALS');
  }

  // Rate limit check
  const rlState = _rateLimits.get(user.id);
  if (rlState?.lockUntil && Date.now() < rlState.lockUntil) {
    const remaining = Math.ceil((rlState.lockUntil - Date.now()) / 1000);
    throw new AuthError(`Account locked. Try again in ${remaining}s.`, 'ACCOUNT_LOCKED', 429);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    recordFailedAttempt(user.id);
    auditLog(AuditAction.FAILED_LOGIN, user.id, ctx.ip || '', ctx.userAgent || '', {
      reason: 'bad_password',
    });
    throw new AuthError('Invalid credentials.', 'INVALID_CREDENTIALS');
  }

  if (!user.active) throw new AuthError('Account is disabled.', 'ACCOUNT_DISABLED', 403);

  clearRateLimit(user.id);

  // MFA gating
  if (user.mfaEnabled) {
    const mfaChallengeToken = jwt.sign(
      { sub: user.id, type: 'mfa_challenge' },
      requireEnv('JWT_SECRET'),
      { expiresIn: '5m', algorithm: 'HS256' }
    );
    return { accessToken: null, refreshToken: null, session: null, mfaRequired: true, mfaChallengeToken };
  }

  const session = createSession(user.id, {
    ip: ctx.ip || '0.0.0.0',
    userAgent: ctx.userAgent || '',
    deviceFingerprint: ctx.deviceFingerprint || fingerprintDevice(ctx),
  });

  const accessToken = issueAccessToken({ userId: user.id, role: user.role, sessionId: session.sessionId });
  const refreshToken = issueRefreshToken(user.id);

  auditLog(AuditAction.LOGIN, user.id, ctx.ip || '', ctx.userAgent || '', {
    sessionId: session.sessionId,
    role: user.role,
  });

  return { accessToken, refreshToken, session, mfaRequired: false };
}

/**
 * Completes login after successful MFA verification.
 * @param {string} mfaChallengeToken
 * @param {Object} ctx
 * @returns {LoginResult}
 */
function completeMFALogin(mfaChallengeToken, ctx) {
  let payload;
  try {
    payload = jwt.verify(mfaChallengeToken, requireEnv('JWT_SECRET'));
  } catch {
    throw new AuthError('Invalid or expired MFA challenge token.', 'INVALID_MFA_CHALLENGE');
  }
  if (payload.type !== 'mfa_challenge') throw new AuthError('Bad token type.', 'INVALID_MFA_CHALLENGE');

  const user = _users.get(payload.sub);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND');

  const session = createSession(user.id, {
    ip: ctx.ip || '0.0.0.0',
    userAgent: ctx.userAgent || '',
    deviceFingerprint: ctx.deviceFingerprint || fingerprintDevice(ctx),
  });

  const accessToken = issueAccessToken({ userId: user.id, role: user.role, sessionId: session.sessionId });
  const refreshToken = issueRefreshToken(user.id);

  auditLog(AuditAction.LOGIN, user.id, ctx.ip || '', ctx.userAgent || '', {
    sessionId: session.sessionId,
    mfaVerified: true,
  });

  return { accessToken, refreshToken, session, mfaRequired: false };
}

/** Logout: revokes the session tied to the given access token. */
export function logout(accessToken, ctx = {}) {
  let payload;
  try {
    payload = jwt.verify(accessToken, requireEnv('JWT_SECRET'));
  } catch {
    throw new AuthError('Invalid token.', 'INVALID_TOKEN');
  }
  revokeSession(payload.sub, payload.sid, ctx);
  auditLog(AuditAction.LOGOUT, payload.sub, ctx.ip || '', ctx.userAgent || '', {
    sessionId: payload.sid,
  });
}

// ─── TOTP (RFC 6238) ────────────────────────────────────────────────────────

/**
 * Generates a base32 TOTP secret for a user and stores it encrypted.
 * @param {string} userId
 * @returns {{ secret: string, otpauthUrl: string }}
 */
export function generateTOTPSecret(userId) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  // Generate 20 random bytes → base32
  const rawSecret = crypto.randomBytes(20);
  const secret = base32Encode(rawSecret);

  // Encrypt before storing
  user.totpSecret = encryptSensitive(secret);
  _users.set(userId, user);

  const issuer = encodeURIComponent(process.env.APP_NAME || 'NexusAIPro');
  const account = encodeURIComponent(user.email);
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  return { secret, otpauthUrl };
}

/**
 * Verifies a 6-digit TOTP token for a user (±1 window for clock drift).
 * @param {string} userId
 * @param {string} token - 6-digit string
 * @returns {boolean}
 */
export function verifyTOTP(userId, token) {
  const user = _users.get(userId);
  if (!user?.totpSecret) throw new MFAError('TOTP not configured.', 'TOTP_NOT_CONFIGURED');

  const secret = decryptSensitive(user.totpSecret);
  const now = Math.floor(Date.now() / 1000);
  const period = 30;

  for (const offset of [-1, 0, 1]) {
    const counter = Math.floor((now + offset * period) / period);
    if (computeHOTP(secret, counter) === token.trim()) return true;
  }
  return false;
}

/**
 * Computes an HOTP value per RFC 4226.
 * @param {string} base32Secret
 * @param {number} counter
 * @returns {string} - 6-digit zero-padded string
 */
function computeHOTP(base32Secret, counter) {
  const key = base32Decode(base32Secret);
  const buf = Buffer.alloc(8);
  // Write 64-bit big-endian counter (JS safe for ~285 million years of 30s windows)
  const hi = Math.floor(counter / 0x100000000);
  const lo = counter >>> 0;
  buf.writeUInt32BE(hi, 0);
  buf.writeUInt32BE(lo, 4);

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

// ─── Backup codes ──────────────────────────────────────────────────────────

/**
 * Generates 8 one-time backup codes (10 alphanumeric chars each) and stores
 * their bcrypt hashes on the user record.
 * @param {string} userId
 * @returns {string[]} - plaintext codes to display once
 */
export async function generateBackupCodes(userId) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const codes = Array.from({ length: 8 }, () =>
    Array.from(crypto.randomBytes(10))
      .map((b) => CHARSET[b % CHARSET.length])
      .join('')
  );

  user.backupCodes = await Promise.all(codes.map((c) => bcrypt.hash(c, BCRYPT_ROUNDS)));
  _users.set(userId, user);
  return codes;
}

/**
 * Consumes a backup code, removing it from the user's list.
 * @param {string} userId
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function useBackupCode(userId, code) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  for (let i = 0; i < user.backupCodes.length; i++) {
    const match = await bcrypt.compare(code.toUpperCase(), user.backupCodes[i]);
    if (match) {
      user.backupCodes.splice(i, 1); // consume
      _users.set(userId, user);
      return true;
    }
  }
  return false;
}

// ─── SMS / Email OTP ────────────────────────────────────────────────────────

/**
 * Generates a 6-digit OTP for SMS or email delivery.
 * Actual sending is the responsibility of a transport adapter (not included here).
 * @param {string} userId
 * @returns {string} - 6-digit OTP (caller sends via SMS/email)
 */
export function generateOTP(userId) {
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  _otpStore.set(userId, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });
  return otp;
}

/**
 * Verifies a 6-digit OTP.
 * @param {string} userId
 * @param {string} otp
 * @returns {boolean}
 */
export function verifyOTP(userId, otp) {
  const record = _otpStore.get(userId);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    _otpStore.delete(userId);
    return false;
  }
  const valid = record.otp === otp.trim();
  if (valid) _otpStore.delete(userId);
  return valid;
}

// ─── MFA flow orchestration ────────────────────────────────────────────────

/**
 * @typedef {'totp'|'sms_otp'|'email_otp'|'webauthn'|'backup_code'} MFAMethod
 */

/**
 * Enables MFA for a user (TOTP + backup codes).
 * @param {string} userId
 * @param {Object} ctx
 * @returns {Promise<{ secret: string, otpauthUrl: string, backupCodes: string[] }>}
 */
export async function enableMFA(userId, ctx = {}) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  const { secret, otpauthUrl } = generateTOTPSecret(userId);
  const backupCodes = await generateBackupCodes(userId);
  user.mfaEnabled = true;
  _users.set(userId, user);

  auditLog(AuditAction.MFA_ENABLED, userId, ctx.ip || '', ctx.userAgent || '', {
    method: 'totp',
  });

  return { secret, otpauthUrl, backupCodes };
}

/**
 * Verifies an MFA challenge and completes login.
 * @param {string} mfaChallengeToken
 * @param {MFAMethod} method
 * @param {string} code - TOTP / OTP / backup code
 * @param {Object} ctx
 * @returns {Promise<LoginResult>}
 */
export async function verifyMFA(mfaChallengeToken, method, code, ctx = {}) {
  let payload;
  try {
    payload = jwt.verify(mfaChallengeToken, requireEnv('JWT_SECRET'));
  } catch {
    throw new MFAError('Invalid or expired MFA challenge token.');
  }

  const userId = payload.sub;
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  let verified = false;

  switch (method) {
    case 'totp':
      verified = verifyTOTP(userId, code);
      break;
    case 'sms_otp':
    case 'email_otp':
      verified = verifyOTP(userId, code);
      break;
    case 'backup_code':
      verified = await useBackupCode(userId, code);
      break;
    case 'webauthn':
      // WebAuthn assertion verification is handled by verifyWebAuthnAssertion below.
      throw new MFAError('Use verifyWebAuthnAssertion() for WebAuthn MFA.', 'USE_WEBAUTHN_FLOW');
    default:
      throw new MFAError(`Unknown MFA method: ${method}`, 'UNKNOWN_MFA_METHOD');
  }

  if (!verified) {
    recordFailedAttempt(userId);
    auditLog(AuditAction.FAILED_LOGIN, userId, ctx.ip || '', ctx.userAgent || '', {
      reason: `bad_mfa_${method}`,
    });
    throw new MFAError('MFA verification failed.', 'MFA_FAILED');
  }

  return completeMFALogin(mfaChallengeToken, ctx);
}

// ─── WebAuthn / FIDO2 (Biometric) ─────────────────────────────────────────

/**
 * @typedef {Object} WebAuthnCredential
 * @property {string} credentialId   - base64url-encoded
 * @property {string} publicKey      - COSE public key, base64url-encoded
 * @property {number} signCount
 * @property {string} deviceType     - 'platform' | 'cross-platform'
 * @property {string[]} transports   - e.g. ['internal'], ['usb','nfc']
 * @property {string} aaguid         - authenticator AAGUID
 * @property {number} registeredAt
 */

/**
 * Generates a WebAuthn registration challenge for a user.
 * Send the returned options to the browser's navigator.credentials.create().
 *
 * @param {string} userId
 * @param {'platform'|'cross-platform'|null} [authenticatorAttachment=null]
 *   'platform' = fingerprint/Face ID/Touch ID, 'cross-platform' = hardware key.
 *   Pass null to allow either.
 * @returns {Object} - PublicKeyCredentialCreationOptions-compatible object
 */
export function generateWebAuthnRegistrationOptions(userId, authenticatorAttachment = null) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  const challenge = crypto.randomBytes(32).toString('base64url');
  // Store challenge temporarily (5-minute window)
  _otpStore.set(`webauthn:reg:${userId}`, { otp: challenge, expiresAt: Date.now() + OTP_EXPIRY_MS });

  /** @type {Object} */
  const options = {
    challenge,
    rp: {
      name: process.env.APP_NAME || 'Nexus AI Pro',
      id: process.env.RP_ID || 'localhost',
    },
    user: {
      id: Buffer.from(userId).toString('base64url'),
      name: user.email,
      displayName: user.username,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      userVerification: 'required',
      residentKey: 'preferred',
      ...(authenticatorAttachment ? { authenticatorAttachment } : {}),
    },
    excludeCredentials: user.biometricKeys.map((k) => ({
      id: k.credentialId,
      type: 'public-key',
      transports: k.transports,
    })),
    extensions: {
      credProps: true,
    },
    // Platform-specific biometric hints (non-standard, ignored by unsupported clients)
    hints: authenticatorAttachment === 'platform'
      ? ['client-device', 'security-key']
      : ['security-key', 'client-device'],
  };

  return options;
}

/**
 * Verifies a WebAuthn registration response and stores the credential.
 * NOTE: Full CBOR/COSE decoding and attestation verification requires a library
 * such as @simplewebauthn/server in production. This implementation validates
 * the challenge and stores the provided credential metadata.
 *
 * @param {string} userId
 * @param {Object} registrationResponse - RegistrationResponseJSON from the browser
 * @returns {WebAuthnCredential}
 */
export function verifyWebAuthnRegistration(userId, registrationResponse) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  const challengeKey = `webauthn:reg:${userId}`;
  const stored = _otpStore.get(challengeKey);
  if (!stored || Date.now() > stored.expiresAt)
    throw new BiometricError('WebAuthn registration challenge expired or not found.', 'CHALLENGE_EXPIRED');

  // Verify the client's challenge matches
  const clientData = JSON.parse(
    Buffer.from(registrationResponse.response.clientDataJSON, 'base64url').toString('utf8')
  );
  if (clientData.challenge !== stored.otp)
    throw new BiometricError('WebAuthn challenge mismatch.', 'CHALLENGE_MISMATCH');

  _otpStore.delete(challengeKey);

  /** @type {WebAuthnCredential} */
  const credential = {
    credentialId: registrationResponse.id,
    publicKey: registrationResponse.response.publicKey || '',
    signCount: registrationResponse.response.authenticatorData
      ? parseSignCount(registrationResponse.response.authenticatorData)
      : 0,
    deviceType: registrationResponse.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
    transports: registrationResponse.response.transports || [],
    aaguid: '',
    registeredAt: Date.now(),
  };

  user.biometricKeys.push(credential);
  _users.set(userId, user);

  auditLog(AuditAction.BIOMETRIC_REGISTERED, userId, '', '', {
    credentialId: credential.credentialId,
    deviceType: credential.deviceType,
  });

  return credential;
}

/**
 * Generates a WebAuthn authentication challenge.
 * @param {string} userId
 * @returns {Object} - PublicKeyCredentialRequestOptions-compatible object
 */
export function generateWebAuthnAuthOptions(userId) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  const challenge = crypto.randomBytes(32).toString('base64url');
  _otpStore.set(`webauthn:auth:${userId}`, { otp: challenge, expiresAt: Date.now() + OTP_EXPIRY_MS });

  return {
    challenge,
    rpId: process.env.RP_ID || 'localhost',
    timeout: 60000,
    userVerification: 'required',
    allowCredentials: user.biometricKeys.map((k) => ({
      id: k.credentialId,
      type: 'public-key',
      transports: k.transports,
    })),
  };
}

/**
 * Verifies a WebAuthn assertion and completes authentication.
 * In production, replace the signature-check stub with real COSE verification.
 *
 * @param {string} userId
 * @param {Object} assertionResponse - AuthenticationResponseJSON
 * @param {string} mfaChallengeToken - present if called as MFA step
 * @param {Object} ctx
 * @returns {LoginResult}
 */
export function verifyWebAuthnAssertion(userId, assertionResponse, mfaChallengeToken = null, ctx = {}) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  const challengeKey = `webauthn:auth:${userId}`;
  const stored = _otpStore.get(challengeKey);
  if (!stored || Date.now() > stored.expiresAt)
    throw new BiometricError('WebAuthn auth challenge expired.', 'CHALLENGE_EXPIRED');

  const clientData = JSON.parse(
    Buffer.from(assertionResponse.response.clientDataJSON, 'base64url').toString('utf8')
  );
  if (clientData.challenge !== stored.otp)
    throw new BiometricError('WebAuthn auth challenge mismatch.', 'CHALLENGE_MISMATCH');

  _otpStore.delete(challengeKey);

  // Find matching credential
  const cred = user.biometricKeys.find((k) => k.credentialId === assertionResponse.id);
  if (!cred)
    throw new BiometricError('Unknown credential ID.', 'CREDENTIAL_NOT_FOUND');

  // NOTE: Full ECDSA/RSA signature verification over authenticatorData + clientDataHash
  // must be implemented here using the stored COSE public key.
  // This stub trusts the challenge match; production MUST verify the signature.

  // Update sign count (replay attack mitigation)
  const newSignCount = parseSignCount(assertionResponse.response.authenticatorData);
  if (newSignCount !== 0 && newSignCount <= cred.signCount)
    throw new BiometricError('Possible authenticator clone detected.', 'SIGN_COUNT_ANOMALY');
  cred.signCount = newSignCount;
  _users.set(userId, user);

  if (mfaChallengeToken) return completeMFALogin(mfaChallengeToken, ctx);

  // Stand-alone biometric login
  const session = createSession(userId, {
    ip: ctx.ip || '0.0.0.0',
    userAgent: ctx.userAgent || '',
    deviceFingerprint: ctx.deviceFingerprint || fingerprintDevice(ctx),
  });
  const accessToken = issueAccessToken({ userId, role: user.role, sessionId: session.sessionId });
  const refreshToken = issueRefreshToken(userId);
  auditLog(AuditAction.LOGIN, userId, ctx.ip || '', ctx.userAgent || '', {
    method: 'webauthn',
    sessionId: session.sessionId,
  });
  return { accessToken, refreshToken, session, mfaRequired: false };
}

/**
 * Retinal scan placeholder — enterprise feature flag.
 * Actual retinal scan hardware integration is vendor-specific.
 * Enable by setting FEATURE_RETINAL_SCAN=true in environment.
 *
 * @param {string} userId
 * @param {Buffer} scanPayload - raw scan data from hardware SDK
 * @returns {Promise<boolean>}
 */
export async function verifyRetinalScan(userId, scanPayload) {
  if (process.env.FEATURE_RETINAL_SCAN !== 'true')
    throw new BiometricError(
      'Retinal scan is an enterprise feature. Set FEATURE_RETINAL_SCAN=true to enable.',
      'FEATURE_DISABLED'
    );

  // TODO: Integrate with enterprise retinal scan hardware SDK.
  // The SDK should provide a verify(enrolledTemplate, scanPayload) function.
  // Placeholder: always returns false until integrated.
  void userId;
  void scanPayload;
  throw new BiometricError('Retinal scan hardware SDK not integrated.', 'NOT_IMPLEMENTED');
}

/**
 * Returns platform-specific biometric hints for the client.
 * @param {string} platform - 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'web'
 * @returns {{ methods: string[], preferredMethod: string, fallback: string }}
 */
export function getBiometricHints(platform) {
  const hints = {
    ios: { methods: ['Face ID', 'Touch ID', 'Passcode'], preferredMethod: 'Face ID', fallback: 'password' },
    android: { methods: ['Fingerprint', 'Face Unlock', 'PIN'], preferredMethod: 'Fingerprint', fallback: 'password' },
    macos: { methods: ['Touch ID', 'Apple Watch'], preferredMethod: 'Touch ID', fallback: 'password' },
    windows: { methods: ['Windows Hello (Face)', 'Windows Hello (Fingerprint)', 'PIN'], preferredMethod: 'Windows Hello (Face)', fallback: 'password' },
    linux: { methods: ['FIDO2 Security Key'], preferredMethod: 'FIDO2 Security Key', fallback: 'password' },
    web: { methods: ['Platform Authenticator', 'Security Key'], preferredMethod: 'Platform Authenticator', fallback: 'password' },
  };
  return hints[platform] || hints.web;
}

// ─── RBAC middleware helpers ───────────────────────────────────────────────

/**
 * Express-style middleware that checks whether the authenticated user has a
 * required permission.  Attach after a token-verification middleware that
 * sets req.auth = { userId, role }.
 *
 * @param {string|string[]} requiredPermissions - one or more permission strings
 * @param {'all'|'any'} [mode='all'] - require all or any of the listed permissions
 * @returns {Function} - Express middleware (req, res, next) => void
 */
export function requirePermission(requiredPermissions, mode = 'all') {
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }
    const userPerms = getPermissionsForRole(req.auth.role);
    const check = mode === 'any'
      ? perms.some((p) => userPerms.includes(p))
      : perms.every((p) => userPerms.includes(p));
    if (!check) {
      return res.status(403).json({ error: 'Insufficient permissions.', required: perms });
    }
    next();
  };
}

/**
 * Express-style middleware that validates a JWT access token and populates
 * req.auth with { userId, role, sessionId }.
 *
 * @returns {Function}
 */
export function requireAuth() {
  return (req, res, next) => {
    const header = req.headers?.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Missing Authorization header.' });

    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, requireEnv('JWT_SECRET'));
      if (payload.type !== 'access') throw new Error('Wrong token type.');
      req.auth = { userId: payload.sub, role: payload.role, sessionId: payload.sid };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  };
}

/**
 * Express-style middleware that restricts access to specific roles.
 * @param {...string} roles
 * @returns {Function}
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'Unauthenticated.' });
    if (!roles.includes(req.auth.role))
      return res.status(403).json({ error: 'Insufficient role.', required: roles });
    next();
  };
}

// ─── Password change ───────────────────────────────────────────────────────

/**
 * Changes a user's password, revoking all existing sessions (force re-login).
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @param {Object} ctx
 * @returns {Promise<void>}
 */
export async function changePassword(userId, currentPassword, newPassword, ctx = {}) {
  const user = _users.get(userId);
  if (!user) throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new AuthError('Current password is incorrect.', 'INVALID_CREDENTIALS');

  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) throw new AuthError(pwCheck.reason, 'WEAK_PASSWORD', 400);

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  _users.set(userId, user);

  // Revoke all sessions to force re-login
  revokeSession(userId, undefined, ctx);
  auditLog(AuditAction.PASSWORD_CHANGE, userId, ctx.ip || '', ctx.userAgent || '', {});
}

// ─── Role assignment ───────────────────────────────────────────────────────

/**
 * Assigns a new role to a user.  Caller must hold the 'role:assign' permission.
 * @param {string} adminUserId - the user performing the assignment
 * @param {string} targetUserId
 * @param {string} newRole
 * @param {Object} ctx
 */
export function assignRole(adminUserId, targetUserId, newRole, ctx = {}) {
  if (!VALID_ROLES.has(newRole))
    throw new AuthError(`Invalid role: ${newRole}`, 'INVALID_ROLE', 400);

  const admin = _users.get(adminUserId);
  if (!admin) throw new AuthError('Admin user not found.', 'USER_NOT_FOUND', 404);

  const adminPerms = getPermissionsForRole(admin.role);
  if (!adminPerms.includes('role:assign'))
    throw new AuthError('Insufficient permissions to assign roles.', 'FORBIDDEN', 403);

  const target = _users.get(targetUserId);
  if (!target) throw new AuthError('Target user not found.', 'USER_NOT_FOUND', 404);

  const oldRole = target.role;
  target.role = newRole;
  target.permissions = getPermissionsForRole(newRole);
  _users.set(targetUserId, target);

  auditLog(AuditAction.ROLE_CHANGE, targetUserId, ctx.ip || '', ctx.userAgent || '', {
    changedBy: adminUserId,
    oldRole,
    newRole,
  });
}

// ─── Utility ───────────────────────────────────────────────────────────────

/**
 * Looks up a user by email (case-insensitive).
 * @param {string} email
 * @returns {UserRecord|undefined}
 */
function findUserByEmail(email) {
  const target = email.toLowerCase().trim();
  for (const u of _users.values()) {
    if (u.email === target) return u;
  }
}

/**
 * Produces a simple device fingerprint from request context.
 * @param {{ ip?: string, userAgent?: string }} ctx
 * @returns {string}
 */
function fingerprintDevice({ ip = '', userAgent = '' } = {}) {
  return crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex').slice(0, 16);
}

/**
 * Parses the sign count (bytes 33-36) from an authenticatorData buffer.
 * @param {string} authenticatorDataB64 - base64url
 * @returns {number}
 */
function parseSignCount(authenticatorDataB64) {
  try {
    const buf = Buffer.from(authenticatorDataB64, 'base64url');
    if (buf.length < 37) return 0;
    return buf.readUInt32BE(33);
  } catch {
    return 0;
  }
}

// ─── Base32 helpers (RFC 4648, no padding) ────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a Buffer as base32 (RFC 4648, no padding).
 * @param {Buffer} buf
 * @returns {string}
 */
function base32Encode(buf) {
  let bits = 0, value = 0, output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
  return output;
}

/**
 * Decodes a base32 string to a Buffer (RFC 4648, tolerates lowercase/padding).
 * @param {string} str
 * @returns {Buffer}
 */
function base32Decode(str) {
  const s = str.toUpperCase().replace(/=+$/, '');
  let bits = 0, value = 0;
  const output = [];
  for (const char of s) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// ─── Public API surface ────────────────────────────────────────────────────

export default {
  // Registration & login
  register,
  login,
  logout,
  changePassword,

  // Token management
  rotateRefreshToken,

  // MFA
  enableMFA,
  verifyMFA,
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
  useBackupCode,
  generateOTP,
  verifyOTP,

  // Biometric / WebAuthn
  generateWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
  generateWebAuthnAuthOptions,
  verifyWebAuthnAssertion,
  verifyRetinalScan,
  getBiometricHints,

  // Session management
  getUserSessions,
  revokeSession,

  // RBAC
  requireAuth,
  requirePermission,
  requireRole,
  assignRole,
  getPermissionsForRole,

  // Audit
  auditLog,
  getAuditLog,
  AuditAction,

  // Encryption
  encryptSensitive,
  decryptSensitive,

  // Validation
  isValidEmail,
  validateUsername,
};
