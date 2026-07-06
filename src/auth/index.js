/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Nexus AI Pro — Enterprise Authentication Module
 *
 * Provides: JWT access/refresh tokens, bcrypt password hashing, TOTP 2FA,
 * QR code generation, backup codes, account lockout, session tracking,
 * biometric challenge bridge, RBAC middleware, and a full audit trail.
 *
 * All secrets are sourced from process.env. No hardcoded credentials.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

// ============================================================
// Environment & secrets
// ============================================================

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Resolve a secret from the environment.
 * In development, generates a random ephemeral fallback and emits a warning.
 * In production, throws if the variable is absent.
 *
 * @param {string} envVar
 * @returns {string}
 */
function resolveSecret(envVar) {
  const value = process.env[envVar];
  if (value) return value;

  if (isDev) {
    const ephemeral = crypto.randomBytes(32).toString('hex');
    console.warn(
      `[auth] WARNING: ${envVar} is not set in the environment. ` +
      `Using a random ephemeral secret — tokens will NOT survive server restarts. ` +
      `Set ${envVar} in .env before deploying to production.`
    );
    return ephemeral;
  }

  throw new Error(
    `[auth] FATAL: ${envVar} must be set in the environment for production use.`
  );
}

const JWT_SECRET          = resolveSecret('JWT_SECRET');
const JWT_REFRESH_SECRET  = resolveSecret('JWT_REFRESH_SECRET');
const BIOMETRIC_SECRET    = resolveSecret('BIOMETRIC_SECRET');

// Token lifetimes (seconds) — overridable via env
const ACCESS_TOKEN_TTL        = parseInt(process.env.ACCESS_TOKEN_TTL        ?? '900',   10); // 15 min
const REFRESH_TOKEN_TTL       = parseInt(process.env.REFRESH_TOKEN_TTL       ?? '604800', 10); // 7 days
const BIOMETRIC_CHALLENGE_TTL = parseInt(process.env.BIOMETRIC_CHALLENGE_TTL ?? '300',   10); // 5 min

// Lockout policy
const MAX_LOGIN_ATTEMPTS    = 5;
const LOCKOUT_DURATION_MS   = 30 * 60 * 1000; // 30 minutes

// Session policy
const MAX_SESSIONS_PER_USER = 5;

// Bcrypt cost factor (12 = ~250 ms on modern hardware, suitable for enterprise)
const BCRYPT_ROUNDS = 12;

// ============================================================
// ROLES constant
// ============================================================

/**
 * Numeric role hierarchy. Higher values have more privileges.
 * Use hasPermission() to compare roles rather than checking equality.
 */
export const ROLES = Object.freeze({
  USER:      0,
  MODERATOR: 1,
  DEV:       2,
  ADMIN:     3,
});

// ============================================================
// In-memory stores
//
// Replace these Maps with database/Redis adapters when wiring
// persistent storage. The public interface stays unchanged.
// ============================================================

/**
 * User store.
 * Key: userId (string)
 * Value: {
 *   userId, email?, passwordHash?, role,
 *   totpSecret?, totpPending?, totpEnabledAt?,
 *   backupCodeHashes?: string[],
 *   createdAt, updatedAt
 * }
 */
export const userStore = new Map();

// Login attempts  — Map<userId, { count: number, lockedUntil: number|null }>
const loginAttempts = new Map();

// Sessions        — Map<userId, Map<sessionId, SessionRecord>>
//   SessionRecord: { sessionId, createdAt, ip, lastActive }
const sessionStore = new Map();

// Refresh tokens  — Map<rawToken, { userId, sessionId, expiresAt }>
const refreshTokenStore = new Map();

// ============================================================
// Audit trail
// ============================================================

/** @type {Array<{event:string, userId:string, timestamp:string, ip:string, success:boolean}>} */
const _auditLog = [];

/**
 * Create and append an audit entry.
 *
 * @param {string}  event
 * @param {string}  userId
 * @param {string|null} ip
 * @param {boolean} success
 * @returns {{ event:string, userId:string, timestamp:string, ip:string, success:boolean }}
 */
function _audit(event, userId, ip, success) {
  const entry = {
    event,
    userId:    userId  ?? 'unknown',
    timestamp: new Date().toISOString(),
    ip:        ip      ?? 'unknown',
    success,
  };
  _auditLog.push(entry);
  return entry;
}

/**
 * Retrieve audit log entries, optionally filtered by userId.
 *
 * @param {string} [userId]
 * @returns {typeof _auditLog}
 */
export function getAuditLog(userId) {
  if (userId !== undefined) return _auditLog.filter(e => e.userId === userId);
  return [..._auditLog];
}

// ============================================================
// Password utilities
// ============================================================

/**
 * Validate a password against the enterprise policy:
 *   - Minimum 13 Unicode code points (emoji/multi-byte characters count as 1)
 *   - At least one ASCII uppercase letter  [A-Z]
 *   - At least one ASCII lowercase letter  [a-z]
 *   - At least one decimal digit           [0-9]
 *   - At least one non-alphanumeric char   (special chars, symbols, emojis all qualify)
 *
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePassword(password) {
  const errors = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string.'] };
  }

  // Spread uses the Unicode iterator — each code point counts as 1, including emoji
  const codePointLength = [...password].length;

  if (codePointLength < 13) {
    errors.push('Password must be at least 13 characters long.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z).');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z).');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit (0-9).');
  }

  // Anything that is not an ASCII letter or digit satisfies the special-character requirement
  // (covers punctuation, symbols, currency signs, emojis, Unicode letters from other scripts, etc.)
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character, symbol, or emoji.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a username:
 *   - 2–30 Unicode code points
 *   - No ASCII whitespace characters (space, tab, CR, LF)
 *   - No null bytes
 *   - Allows all other characters: emojis, Unicode letters, digits, punctuation
 *
 * @param {string} username
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateUsername(username) {
  const errors = [];

  if (typeof username !== 'string') {
    return { valid: false, errors: ['Username must be a string.'] };
  }

  const len = [...username].length; // Unicode-safe length

  if (len < 2) {
    errors.push('Username must be at least 2 characters long.');
  }

  if (len > 30) {
    errors.push('Username must be no more than 30 characters long.');
  }

  if (/[ \t\r\n]/.test(username)) {
    errors.push('Username must not contain spaces or whitespace characters.');
  }

  if (username.includes('\0')) {
    errors.push('Username must not contain null bytes.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Hash a plaintext password with bcrypt.
 *
 * @param {string} plaintext
 * @returns {Promise<string>}
 */
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 *
 * @param {string} plaintext
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

// ============================================================
// Account lockout
// ============================================================

/**
 * Check whether a user is allowed to attempt a login.
 *
 * @param {string} userId
 * @returns {{ allowed: boolean, remainingAttempts: number, lockedUntil?: number }}
 */
export function checkLoginAttempts(userId) {
  const record = loginAttempts.get(userId);
  const now = Date.now();

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  // Active lock
  if (record.lockedUntil !== null && record.lockedUntil > now) {
    return {
      allowed:           false,
      remainingAttempts: 0,
      lockedUntil:       record.lockedUntil,
    };
  }

  // Lock has expired — reset and allow
  if (record.lockedUntil !== null && record.lockedUntil <= now) {
    loginAttempts.delete(userId);
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  const remaining = MAX_LOGIN_ATTEMPTS - record.count;
  return {
    allowed:           remaining > 0,
    remainingAttempts: Math.max(0, remaining),
  };
}

/**
 * Record the outcome of a login attempt.
 * On success: resets the failure counter.
 * On failure: increments the counter; locks the account after MAX_LOGIN_ATTEMPTS.
 *
 * @param {string}  userId
 * @param {boolean} success
 * @param {string}  [ip]
 * @returns {void}
 */
export function recordLoginAttempt(userId, success, ip) {
  if (success) {
    loginAttempts.delete(userId);
    _audit('LOGIN_SUCCESS', userId, ip ?? null, true);
    return;
  }

  const record = loginAttempts.get(userId) ?? { count: 0, lockedUntil: null };
  record.count += 1;

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    loginAttempts.set(userId, record);
    _audit('ACCOUNT_LOCKED', userId, ip ?? null, false);
  } else {
    loginAttempts.set(userId, record);
    _audit('LOGIN_FAILED', userId, ip ?? null, false);
  }
}

// ============================================================
// Session management (internal helpers + public API)
// ============================================================

/**
 * Register a new session for a user, evicting the oldest if at the cap.
 *
 * @param {string} userId
 * @param {string} sessionId
 * @param {string|null} ip
 */
function _registerSession(userId, sessionId, ip) {
  if (!sessionStore.has(userId)) {
    sessionStore.set(userId, new Map());
  }

  const userSessions = sessionStore.get(userId);

  // Evict the oldest session when at the concurrent-session limit
  if (userSessions.size >= MAX_SESSIONS_PER_USER) {
    let oldestId = null;
    let oldestTs = Infinity;

    for (const [sid, session] of userSessions) {
      if (session.createdAt < oldestTs) {
        oldestTs = session.createdAt;
        oldestId = sid;
      }
    }

    if (oldestId !== null) {
      userSessions.delete(oldestId);
      // Revoke any refresh tokens tied to the evicted session
      for (const [token, data] of refreshTokenStore) {
        if (data.userId === userId && data.sessionId === oldestId) {
          refreshTokenStore.delete(token);
        }
      }
    }
  }

  userSessions.set(sessionId, {
    sessionId,
    createdAt:  Date.now(),
    ip:         ip ?? 'unknown',
    lastActive: Date.now(),
  });
}

/**
 * Return all active session records for a user.
 *
 * @param {string} userId
 * @returns {Array<{sessionId:string, createdAt:number, ip:string, lastActive:number}>}
 */
export function getActiveSessions(userId) {
  const sessions = sessionStore.get(userId);
  return sessions ? [...sessions.values()] : [];
}

/**
 * Invalidate a single session and revoke its refresh tokens.
 *
 * @param {string} userId
 * @param {string} sessionId
 * @returns {void}
 */
export function invalidateSession(userId, sessionId) {
  sessionStore.get(userId)?.delete(sessionId);

  for (const [token, data] of refreshTokenStore) {
    if (data.userId === userId && data.sessionId === sessionId) {
      refreshTokenStore.delete(token);
    }
  }

  _audit('SESSION_INVALIDATED', userId, null, true);
}

/**
 * Invalidate all sessions for a user (sign-out everywhere).
 *
 * @param {string} userId
 * @returns {void}
 */
export function invalidateAllSessions(userId) {
  sessionStore.delete(userId);

  for (const [token, data] of refreshTokenStore) {
    if (data.userId === userId) {
      refreshTokenStore.delete(token);
    }
  }

  _audit('ALL_SESSIONS_INVALIDATED', userId, null, true);
}

// ============================================================
// JWT token operations
// ============================================================

/**
 * Generate an access + refresh token pair and register a session.
 *
 * @param {string} userId
 * @param {number} role  - a ROLES value
 * @param {string} [ip]
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
export function generateTokenPair(userId, role, ip) {
  const sessionId = crypto.randomUUID();

  const accessToken = jwt.sign(
    { sub: userId, role, sessionId, type: 'access' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = jwt.sign(
    { sub: userId, role, sessionId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: REFRESH_TOKEN_TTL }
  );

  _registerSession(userId, sessionId, ip ?? null);

  refreshTokenStore.set(refreshToken, {
    userId,
    sessionId,
    expiresAt: Date.now() + REFRESH_TOKEN_TTL * 1000,
  });

  _audit('TOKEN_PAIR_ISSUED', userId, ip ?? null, true);

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL };
}

/**
 * Verify an access token and return its payload.
 * Throws a JsonWebTokenError or TokenExpiredError on failure.
 *
 * @param {string} token
 * @returns {jwt.JwtPayload}
 */
export function verifyAccessToken(token) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

  if (payload.type !== 'access') {
    throw Object.assign(new Error('Token type mismatch — expected access token.'), {
      name: 'JsonWebTokenError',
    });
  }

  return payload;
}

/**
 * Verify a refresh token, confirm it exists in the store, and return its payload.
 * Throws on any failure (expired, revoked, type mismatch).
 *
 * @param {string} token
 * @returns {jwt.JwtPayload}
 */
export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });

  if (payload.type !== 'refresh') {
    throw Object.assign(new Error('Token type mismatch — expected refresh token.'), {
      name: 'JsonWebTokenError',
    });
  }

  const stored = refreshTokenStore.get(token);
  if (!stored) {
    throw Object.assign(new Error('Refresh token not found or already rotated.'), {
      name: 'JsonWebTokenError',
    });
  }

  if (stored.expiresAt < Date.now()) {
    refreshTokenStore.delete(token);
    throw Object.assign(new Error('Refresh token has expired.'), {
      name: 'TokenExpiredError',
    });
  }

  return payload;
}

/**
 * Rotate a refresh token: invalidate the old one and issue a fresh pair.
 * Implements refresh token rotation to limit the window of stolen token abuse.
 *
 * @param {string} oldRefreshToken
 * @param {string} [ip]
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
export function rotateRefreshToken(oldRefreshToken, ip) {
  const payload = verifyRefreshToken(oldRefreshToken);

  // Revoke the consumed token immediately (rotation)
  const stored = refreshTokenStore.get(oldRefreshToken);
  const oldSessionId = stored?.sessionId;
  refreshTokenStore.delete(oldRefreshToken);

  // Remove old session record so _registerSession starts fresh
  if (oldSessionId) {
    sessionStore.get(payload.sub)?.delete(oldSessionId);
  }

  _audit('REFRESH_TOKEN_ROTATED', payload.sub, ip ?? null, true);

  return generateTokenPair(payload.sub, payload.role, ip ?? null);
}

// ============================================================
// TOTP / MFA
// ============================================================

/**
 * Generate a TOTP secret for a user, produce an authenticator-app QR code,
 * and issue a fresh set of single-use backup codes.
 *
 * The secret and hashed backup codes are stored in userStore.
 * The plaintext backup codes are returned ONCE — the caller must present
 * them to the user immediately; they cannot be recovered later.
 *
 * @param {string} userId
 * @param {string} email
 * @returns {Promise<{ secret: string, qrCodeUrl: string, backupCodes: string[] }>}
 */
export async function generateTOTPSecret(userId, email) {
  const appName  = process.env.APP_NAME ?? 'Nexus AI Pro';
  const issuer   = process.env.APP_ISSUER ?? appName;

  const secretObj = speakeasy.generateSecret({
    name:   `${issuer}:${email}`,
    issuer,
    length: 32, // 160-bit base32 secret
  });

  const qrCodeUrl    = await QRCode.toDataURL(secretObj.otpauth_url);
  const backupCodes  = generateBackupCodes();
  const backupHashes = backupCodes.map(_hashBackupCode);

  // Upsert user record
  const existing = userStore.get(userId) ?? { userId };
  userStore.set(userId, {
    ...existing,
    totpSecret:        secretObj.base32,
    totpPending:       true, // marked false after first successful verifyTOTP
    backupCodeHashes:  backupHashes,
    updatedAt:         new Date().toISOString(),
  });

  _audit('TOTP_SETUP_INITIATED', userId, null, true);

  return { secret: secretObj.base32, qrCodeUrl, backupCodes };
}

/**
 * Verify a TOTP token against the user's stored secret.
 * On the first successful verification, marks the TOTP setup as complete.
 *
 * @param {string} userId
 * @param {string|number} token
 * @returns {boolean}
 */
export function verifyTOTP(userId, token) {
  const user = userStore.get(userId);

  if (!user?.totpSecret) {
    _audit('TOTP_VERIFY_NO_SECRET', userId, null, false);
    return false;
  }

  const verified = speakeasy.totp.verify({
    secret:   user.totpSecret,
    encoding: 'base32',
    token:    String(token).replace(/\s/g, ''),
    window:   1, // ±1 time step tolerance for clock drift (~60 s)
  });

  if (verified && user.totpPending) {
    userStore.set(userId, {
      ...user,
      totpPending:    false,
      totpEnabledAt:  new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    });
  }

  _audit('TOTP_VERIFY', userId, null, verified);
  return verified;
}

/**
 * Generate 6 single-use backup codes, each exactly 8 uppercase alphanumeric characters.
 *
 * The character set is A-Z + 0-9 (36 chars), chosen for legibility.
 * Visually ambiguous characters (O/0, I/1) are left in intentionally —
 * they are formatted for copy-paste and screened by the UI layer.
 *
 * @returns {string[]}
 */
export function generateBackupCodes() {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const CODE_COUNT  = 6;
  const CODE_LENGTH = 8;
  const codes = [];

  for (let i = 0; i < CODE_COUNT; i++) {
    // Use one random byte per output character to keep the implementation simple;
    // mod bias across 36 chars is negligible for backup code use.
    const bytes = crypto.randomBytes(CODE_LENGTH);
    const code  = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
    codes.push(code);
  }

  return codes;
}

/**
 * SHA-256 hash a backup code for storage comparison.
 * Codes are normalised to uppercase + stripped of whitespace before hashing.
 *
 * @param {string} code
 * @returns {string} hex digest
 */
function _hashBackupCode(code) {
  return crypto
    .createHash('sha256')
    .update(code.toUpperCase().replace(/\s/g, ''))
    .digest('hex');
}

/**
 * Attempt to consume a single-use backup code for a user.
 * Returns true and removes the code on success; returns false otherwise.
 *
 * @param {string} userId
 * @param {string} code
 * @returns {boolean}
 */
export function consumeBackupCode(userId, code) {
  const user = userStore.get(userId);

  if (!Array.isArray(user?.backupCodeHashes) || user.backupCodeHashes.length === 0) {
    _audit('BACKUP_CODE_EXHAUSTED', userId, null, false);
    return false;
  }

  const hash  = _hashBackupCode(code);
  const index = user.backupCodeHashes.indexOf(hash);

  if (index === -1) {
    _audit('BACKUP_CODE_INVALID', userId, null, false);
    return false;
  }

  // Remove consumed code — it cannot be reused
  const updatedHashes = [...user.backupCodeHashes];
  updatedHashes.splice(index, 1);

  userStore.set(userId, {
    ...user,
    backupCodeHashes: updatedHashes,
    updatedAt:        new Date().toISOString(),
  });

  _audit('BACKUP_CODE_CONSUMED', userId, null, true);
  return true;
}

// ============================================================
// Biometric challenge bridge
// ============================================================

/**
 * Issue a short-lived signed challenge token for the native biometric layer.
 *
 * Workflow:
 *   1. Server calls generateBiometricChallenge(userId) and sends token + challenge to the client.
 *   2. Native layer signs or validates the challenge using device biometrics.
 *   3. Native layer returns the token to the server; server calls verifyBiometricChallenge(token)
 *      to confirm origin and freshness before elevating privilege.
 *
 * @param {string} userId
 * @returns {{ challenge: string, token: string, expiresAt: string }}
 */
export function generateBiometricChallenge(userId) {
  const challenge = crypto.randomBytes(32).toString('hex');
  const nowSec    = Math.floor(Date.now() / 1000);
  const expSec    = nowSec + BIOMETRIC_CHALLENGE_TTL;

  const token = jwt.sign(
    { sub: userId, challenge, type: 'biometric_challenge', iat: nowSec, exp: expSec },
    BIOMETRIC_SECRET,
    { algorithm: 'HS256' }
  );

  _audit('BIOMETRIC_CHALLENGE_ISSUED', userId, null, true);

  return {
    challenge,
    token,
    expiresAt: new Date(expSec * 1000).toISOString(),
  };
}

/**
 * Verify a biometric challenge token returned by the native layer.
 * Throws if the token is invalid, expired, or has the wrong type.
 *
 * @param {string} token
 * @returns {jwt.JwtPayload}
 */
export function verifyBiometricChallenge(token) {
  const payload = jwt.verify(token, BIOMETRIC_SECRET, { algorithms: ['HS256'] });

  if (payload.type !== 'biometric_challenge') {
    throw Object.assign(
      new Error('Token type mismatch — expected biometric_challenge.'),
      { name: 'JsonWebTokenError' }
    );
  }

  _audit('BIOMETRIC_CHALLENGE_VERIFIED', payload.sub, null, true);
  return payload;
}

// ============================================================
// Role-based access control
// ============================================================

/**
 * Return true if `userRole` satisfies the `requiredRole` threshold.
 *
 * @param {number} userRole     - value from ROLES
 * @param {number} requiredRole - value from ROLES
 * @returns {boolean}
 */
export function hasPermission(userRole, requiredRole) {
  return (
    typeof userRole     === 'number' &&
    typeof requiredRole === 'number' &&
    userRole >= requiredRole
  );
}

// ============================================================
// Express middleware
// ============================================================

/**
 * Express middleware that reads the `Authorization: Bearer <token>` header,
 * verifies the access token, and attaches `req.user` for downstream handlers.
 *
 * req.user shape: { userId: string, role: number, sessionId: string }
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error:   'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      userId:    payload.sub,
      role:      payload.role,
      sessionId: payload.sessionId,
    };

    // Keep session activity timestamp current
    const userSessions = sessionStore.get(payload.sub);
    if (userSessions?.has(payload.sessionId)) {
      userSessions.get(payload.sessionId).lastActive = Date.now();
    }

    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    const message = expired
      ? 'Access token has expired. Please refresh your token.'
      : 'Access token is invalid or has been tampered with.';

    _audit('AUTH_REJECTED', null, req.ip ?? null, false);

    return res.status(401).json({ error: 'Unauthorized', message });
  }
}

/**
 * Express middleware factory that enforces a minimum role level.
 * Must be placed after authMiddleware in the handler chain.
 *
 * @param {number} role - minimum required ROLES value
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.delete('/users/:id', authMiddleware, requireRole(ROLES.ADMIN), handler);
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error:   'Unauthorized',
        message: 'Authentication required. Use authMiddleware before requireRole.',
      });
    }

    if (!hasPermission(req.user.role, role)) {
      _audit('PERMISSION_DENIED', req.user.userId, req.ip ?? null, false);

      return res.status(403).json({
        error:   'Forbidden',
        message: `Insufficient privileges. Required role level: ${role} (current: ${req.user.role}).`,
      });
    }

    next();
  };
}

// ============================================================
// Default export — convenience bundle for CommonJS-style consumers
// ============================================================

export default {
  // Constants
  ROLES,

  // Stores (read-only access for inspection/testing)
  userStore,

  // Password
  hashPassword,
  verifyPassword,
  validatePassword,
  validateUsername,

  // Tokens
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  rotateRefreshToken,

  // TOTP / MFA
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
  consumeBackupCode,

  // Biometrics
  generateBiometricChallenge,
  verifyBiometricChallenge,

  // RBAC
  hasPermission,

  // Lockout
  checkLoginAttempts,
  recordLoginAttempt,

  // Sessions
  getActiveSessions,
  invalidateSession,
  invalidateAllSessions,

  // Middleware
  authMiddleware,
  requireRole,

  // Audit
  getAuditLog,
};
