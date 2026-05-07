// authService.js — 2026-05-07
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
});

export const AUTH_EVENTS = Object.freeze({
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  MFA_SETUP: 'MFA_SETUP',
  MFA_VERIFY_SUCCESS: 'MFA_VERIFY_SUCCESS',
  MFA_VERIFY_FAIL: 'MFA_VERIFY_FAIL',
  ADMIN_ACTION: 'ADMIN_ACTION',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
});

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const USERNAME_FORBIDDEN = /[<>"'`&;(){}]/u;

function validateUsername(username) {
  if (typeof username !== 'string') return 'Username must be a string';
  const trimmed = username.trim();
  if (trimmed.length < 1 || trimmed.length > 32) return 'Username must be 1–32 characters';
  if (USERNAME_FORBIDDEN.test(trimmed)) return 'Username contains forbidden characters';
  return null;
}

function validateEmail(email) {
  if (typeof email !== 'string') return 'Email must be a string';
  // RFC-5322-lite: localpart@domain.tld
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return 'Invalid email address';
  return null;
}

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const SPECIAL_RE = /[!@#$%^&*()\-_+=[\]{}|;:,.<>?]/;

function validatePassword(password) {
  if (typeof password !== 'string') return 'Password must be a string';
  if (password.length < 13) return 'Password must be at least 13 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit';
  if (!SPECIAL_RE.test(password)) {
    return `Password must contain at least one special character: ${SPECIAL_CHARS}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Minimal audit logger — ISO timestamp + userId only, never PII
// ---------------------------------------------------------------------------

function auditLog(event, userId, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    userId: userId ?? 'anonymous',
    ...extra,
  };
  // In production, pipe to a structured log collector (e.g. pino/winston sink).
  // stdout is fine here — never log PII fields.
  console.log(JSON.stringify(entry));
}

// ---------------------------------------------------------------------------
// AuthService
// ---------------------------------------------------------------------------

export class AuthService {
  constructor() {
    /** @type {Map<string, object>} userId → user record */
    this._users = new Map();

    /** @type {Map<string, string>} email (lowercase) → userId */
    this._emailIndex = new Map();

    /** @type {Set<string>} revoked session IDs */
    this._revokedSessions = new Set();

    /** @type {Map<string, object>} userId → MFA state */
    this._mfaStore = new Map();

    /** @type {Map<string, object>} challengeId → biometric challenge */
    this._biometricChallenges = new Map();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  _jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    return secret;
  }

  _jwtRefreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    return secret;
  }

  _sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }

  _generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(6).toString('hex')); // 12-char hex
    }
    return codes;
  }

  // -------------------------------------------------------------------------
  // registerUser
  // -------------------------------------------------------------------------

  async registerUser(data) {
    const { username, email, password, role } = data ?? {};

    const usernameErr = validateUsername(username);
    if (usernameErr) throw new Error(usernameErr);

    const emailErr = validateEmail(email);
    if (emailErr) throw new Error(emailErr);

    const passwordErr = validatePassword(password);
    if (passwordErr) throw new Error(passwordErr);

    const normalizedEmail = email.trim().toLowerCase();
    if (this._emailIndex.has(normalizedEmail)) {
      throw new Error('Email already registered');
    }

    // Restrict role assignment — only accept known roles, default to USER
    const assignedRole = Object.values(ROLES).includes(role) ? role : ROLES.USER;

    const userId = crypto.randomUUID();
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const user = {
      userId,
      username: username.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      createdAt: new Date().toISOString(),
    };

    this._users.set(userId, user);
    this._emailIndex.set(normalizedEmail, userId);

    return { userId, username: user.username, role: user.role };
  }

  // -------------------------------------------------------------------------
  // loginUser
  // -------------------------------------------------------------------------

  async loginUser(email, password) {
    const normalizedEmail = (email ?? '').trim().toLowerCase();
    const userId = this._emailIndex.get(normalizedEmail);

    if (!userId) {
      auditLog(AUTH_EVENTS.LOGIN_FAIL, null, { reason: 'unknown_email' });
      throw new Error('Invalid credentials');
    }

    const user = this._users.get(userId);

    let valid = false;
    try {
      valid = await argon2.verify(user.passwordHash, password);
    } catch {
      auditLog(AUTH_EVENTS.LOGIN_FAIL, userId, { reason: 'hash_error' });
      throw new Error('Invalid credentials');
    }

    if (!valid) {
      auditLog(AUTH_EVENTS.LOGIN_FAIL, userId, { reason: 'bad_password' });
      throw new Error('Invalid credentials');
    }

    const sessionId = crypto.randomUUID();
    const payload = { sub: userId, role: user.role, sid: sessionId };

    const accessToken = jwt.sign(payload, this._jwtSecret(), {
      expiresIn: '15m',
      algorithm: 'HS256',
    });

    const refreshToken = jwt.sign(
      { sub: userId, sid: sessionId, type: 'refresh' },
      this._jwtRefreshSecret(),
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    auditLog(AUTH_EVENTS.LOGIN_SUCCESS, userId);

    return {
      accessToken,
      refreshToken,
      user: this._sanitizeUser(user),
    };
  }

  // -------------------------------------------------------------------------
  // refreshToken
  // -------------------------------------------------------------------------

  refreshToken(refreshTokenStr) {
    let decoded;
    try {
      decoded = jwt.verify(refreshTokenStr, this._jwtRefreshSecret(), {
        algorithms: ['HS256'],
      });
    } catch (err) {
      throw new Error('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh') throw new Error('Not a refresh token');

    const { sub: userId, sid } = decoded;

    if (this._revokedSessions.has(sid)) {
      throw new Error('Session has been revoked');
    }

    const user = this._users.get(userId);
    if (!user) throw new Error('User not found');

    const newAccessToken = jwt.sign(
      { sub: userId, role: user.role, sid },
      this._jwtSecret(),
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    auditLog(AUTH_EVENTS.TOKEN_REFRESH, userId);

    return { accessToken: newAccessToken };
  }

  // -------------------------------------------------------------------------
  // verifyToken
  // -------------------------------------------------------------------------

  verifyToken(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, this._jwtSecret(), { algorithms: ['HS256'] });
    } catch (err) {
      throw new Error('Invalid or expired token');
    }

    if (this._revokedSessions.has(decoded.sid)) {
      throw new Error('Session has been revoked');
    }

    return decoded;
  }

  // -------------------------------------------------------------------------
  // setupMFA
  // -------------------------------------------------------------------------

  async setupMFA(userId) {
    const user = this._users.get(userId);
    if (!user) throw new Error('User not found');

    const secret = speakeasy.generateSecret({
      name: `NexusAIPro:${user.userId}`,
      length: 32,
    });

    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: encodeURIComponent(`NexusAIPro:${user.userId}`),
      issuer: 'NexusAIPro',
      encoding: 'base32',
    });

    const backupCodes = this._generateBackupCodes(8);

    this._mfaStore.set(userId, {
      secret: secret.base32,
      backupCodes,
      enabled: false,
    });

    auditLog(AUTH_EVENTS.MFA_SETUP, userId);

    return { secret: secret.base32, qrCodeUrl, backupCodes };
  }

  // -------------------------------------------------------------------------
  // verifyMFA
  // -------------------------------------------------------------------------

  verifyMFA(userId, token) {
    const mfa = this._mfaStore.get(userId);
    if (!mfa) throw new Error('MFA not configured for this user');

    // Check TOTP
    const totpValid = speakeasy.totp.verify({
      secret: mfa.secret,
      encoding: 'base32',
      token: String(token),
      window: 1,
    });

    if (totpValid) {
      mfa.enabled = true;
      auditLog(AUTH_EVENTS.MFA_VERIFY_SUCCESS, userId, { method: 'totp' });
      return true;
    }

    // Check backup codes (single-use)
    const codeIndex = mfa.backupCodes.indexOf(String(token));
    if (codeIndex !== -1) {
      mfa.backupCodes.splice(codeIndex, 1);
      mfa.enabled = true;
      auditLog(AUTH_EVENTS.MFA_VERIFY_SUCCESS, userId, { method: 'backup_code' });
      return true;
    }

    auditLog(AUTH_EVENTS.MFA_VERIFY_FAIL, userId);
    return false;
  }

  // -------------------------------------------------------------------------
  // generateBiometricChallenge
  // -------------------------------------------------------------------------

  generateBiometricChallenge(userId) {
    const user = this._users.get(userId);
    if (!user) throw new Error('User not found');

    const challenge = crypto.randomBytes(32).toString('hex');
    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    this._biometricChallenges.set(challengeId, { challenge, userId, expiresAt });

    return { challengeId, challenge, userId, expiresAt };
  }

  // -------------------------------------------------------------------------
  // verifyBiometric
  // -------------------------------------------------------------------------

  verifyBiometric(userId, biometricData) {
    if (!userId) throw new Error('userId is required');
    if (!biometricData || typeof biometricData !== 'object') {
      throw new Error('biometricData is required');
    }

    // Stub: real verification is delegated to native platform SDK
    // (Capacitor BiometricAuth, Face ID, Touch ID, fingerprint sensors, retina)
    // We only check that a signed challenge blob is present and the userId matches.
    const hasSignature = typeof biometricData.signature === 'string'
      && biometricData.signature.length > 0;
    const userMatches = biometricData.userId === userId;

    return hasSignature && userMatches;
  }

  // -------------------------------------------------------------------------
  // changePassword
  // -------------------------------------------------------------------------

  async changePassword(userId, oldPass, newPass) {
    const user = this._users.get(userId);
    if (!user) throw new Error('User not found');

    let valid = false;
    try {
      valid = await argon2.verify(user.passwordHash, oldPass);
    } catch {
      throw new Error('Password verification failed');
    }

    if (!valid) throw new Error('Current password is incorrect');

    const passwordErr = validatePassword(newPass);
    if (passwordErr) throw new Error(passwordErr);

    user.passwordHash = await argon2.hash(newPass, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    auditLog(AUTH_EVENTS.PASSWORD_CHANGE, userId);

    return true;
  }

  // -------------------------------------------------------------------------
  // revokeSession
  // -------------------------------------------------------------------------

  revokeSession(sessionId) {
    if (!sessionId) throw new Error('sessionId is required');
    this._revokedSessions.add(sessionId);
    return true;
  }

  // -------------------------------------------------------------------------
  // getUserById
  // -------------------------------------------------------------------------

  getUserById(userId) {
    const user = this._users.get(userId);
    return this._sanitizeUser(user);
  }
}

export default AuthService;
