/**
 * src/auth/AuthService.js
 * Nexus AI Pro — Full-stack authentication service
 * Covers: JWT, roles (admin/dev/mod/user), biometrics, 2FA/MFA,
 * password strength (13+ chars + special chars), emoji usernames,
 * multi-language support, audit logging.
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 */

import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
import { v4 as uuidv4 } from 'uuid';

// ── Constants ──────────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
});

export const ROLE_PERMISSIONS = Object.freeze({
  admin: ['*'],
  dev: [
    'read:users', 'write:content', 'read:analytics', 'write:projects',
    'read:security', 'manage:connectors', 'read:audit',
  ],
  moderator: ['read:users', 'write:content', 'read:analytics', 'manage:reports'],
  user: ['read:own', 'write:own', 'read:public'],
});

/** Minimum password requirements */
const PASSWORD_MIN_LEN = 13;
// eslint-disable-next-line no-useless-escape
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~])/;

// ── Helpers ────────────────────────────────────────────────────────────────

/** AES-256-GCM round-trip for at-rest secrets. Key must be 32 bytes. */
function encryptSecret(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${enc.toString('hex')}.${tag.toString('hex')}`;
}

function decryptSecret(ciphertext, key) {
  const [ivHex, encHex, tagHex] = ciphertext.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Derive 32-byte key from the JWT_SECRET env var via PBKDF2.
 * Never call this in a hot path — result is cached in AuthService constructor.
 */
function deriveKey(secret, salt) {
  return crypto.pbkdf2Sync(secret, salt, 100_000, 32, 'sha512');
}

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba); // keep timing constant
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

// ── JWT (minimal, dependency-free) ────────────────────────────────────────

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signJWT(payload, secret, expiresInSec = 3600) {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(
    Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSec }))
  );
  const sig = b64url(
    crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [header, body, sig] = parts;
  const expected = b64url(
    crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
  );
  if (!safeCompare(sig, expected)) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(body, 'base64').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

// ── Password validation ────────────────────────────────────────────────────

export function validatePassword(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string' };
  if (password.length < PASSWORD_MIN_LEN)
    return { valid: false, reason: `Password must be at least ${PASSWORD_MIN_LEN} characters` };
  if (!PASSWORD_REGEX.test(password))
    return {
      valid: false,
      reason: 'Password must include uppercase, lowercase, number and special character',
    };
  return { valid: true };
}

/** Measure strength 0-100 for UI feedback */
export function passwordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 13) score += 25;
  if (password.length >= 20) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 15;
  // eslint-disable-next-line no-useless-escape
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) score += 20;
  return Math.min(score, 100);
}

// ── Username validation (emoji + special chars OK) ─────────────────────────

export function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, reason: 'Username must be a string' };
  const len = [...username].length; // Unicode-aware length
  if (len < 2 || len > 40) return { valid: false, reason: 'Username must be 2–40 characters' };
  // Disallow only control characters; allow emoji, Unicode, special chars
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(username))
    return { valid: false, reason: 'Username contains invalid control characters' };
  return { valid: true };
}

// ── AuthService class ──────────────────────────────────────────────────────

export class AuthService {
  constructor(options = {}) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required');

    const encSalt = process.env.ENCRYPTION_SALT || 'nexus-auth-salt-v1';
    this._encKey = deriveKey(jwtSecret, encSalt);
    this._jwtSecret = jwtSecret;
    this._jwtExpiry = options.jwtExpirySec || 3600;
    this._refreshExpiry = options.refreshExpirySec || 7 * 24 * 3600;

    /** In-memory user store — replace with DB adapter in production */
    this._users = new Map();
    /** Refresh token store */
    this._refreshTokens = new Map();
    /** MFA backup codes store */
    this._backupCodes = new Map();
    /** Biometric challenge store (nonce → userId, expires) */
    this._bioChallengess = new Map();
    /** Revoked tokens (jti) */
    this._revokedTokens = new Set();
    /** Audit log (minimal) */
    this._audit = [];

    this.appName = options.appName || 'Nexus AI Pro';
  }

  // ── Audit ──────────────────────────────────────────────────────────────

  _log(event, meta = {}) {
    const entry = {
      ts: new Date().toISOString(),
      event,
      ...meta,
    };
    this._audit.push(entry);
    if (this._audit.length > 5_000) this._audit.splice(0, 1_000);
  }

  getAuditLog(limit = 100) {
    return this._audit.slice(-limit);
  }

  // ── Registration ───────────────────────────────────────────────────────

  async register(data) {
    const {
      username,
      email,
      password,
      role = ROLES.USER,
      language = 'en',
      region = 'US',
    } = data;

    // Validate username (supports emoji + special chars)
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) throw new Error(usernameCheck.reason);

    // Validate email (basic RFC-5322 surface-level)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error('Invalid email address');

    // Validate password strength
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) throw new Error(pwCheck.reason);

    // Validate role
    const allowedRoles = Object.values(ROLES);
    if (!allowedRoles.includes(role)) throw new Error(`Invalid role: ${role}`);

    // Check uniqueness (case-insensitive email)
    for (const u of this._users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase())
        throw new Error('Email already registered');
    }

    const id = uuidv4();
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 100_000, 64, 'sha512')
      .toString('hex');

    const user = {
      id,
      username,
      email: email.toLowerCase(),
      passwordHash: hash,
      passwordSalt: salt,
      role,
      language,
      region,
      mfaEnabled: false,
      mfaSecret: null,
      biometricEnabled: false,
      biometricPublicKey: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };

    this._users.set(id, user);
    this._log('USER_REGISTERED', { userId: id, role });

    const { passwordHash, passwordSalt, mfaSecret, ...safe } = user;
    return safe;
  }

  // ── Login ──────────────────────────────────────────────────────────────

  async login(email, password) {
    const user = [...this._users.values()].find(
      (u) => u.email === email.toLowerCase()
    );

    if (!user) {
      // Consume time to avoid timing oracle
      crypto.pbkdf2Sync('dummy', 'dummy', 100_000, 64, 'sha512');
      throw new Error('Invalid credentials');
    }

    if (!user.active) throw new Error('Account disabled');

    const hash = crypto
      .pbkdf2Sync(password, user.passwordSalt, 100_000, 64, 'sha512')
      .toString('hex');

    if (!safeCompare(hash, user.passwordHash)) {
      this._log('LOGIN_FAILED', { userId: user.id });
      throw new Error('Invalid credentials');
    }

    this._log('LOGIN_SUCCESS', { userId: user.id });

    if (user.mfaEnabled) {
      // Return partial token requiring MFA step
      const partialToken = signJWT(
        { sub: user.id, role: user.role, mfaPending: true, jti: uuidv4() },
        this._jwtSecret,
        300 // 5 min window
      );
      return { requiresMfa: true, partialToken };
    }

    return this._issueTokenPair(user);
  }

  // ── MFA Setup (TOTP) ───────────────────────────────────────────────────

  async setupMFA(userId) {
    const user = this._users.get(userId);
    if (!user) throw new Error('User not found');

    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${user.email})`,
      length: 20,
    });

    // Encrypt secret at rest
    const encSecret = encryptSecret(secret.base32, this._encKey);
    user.mfaSecret = encSecret;
    user.mfaEnabled = false; // not yet confirmed
    user.updatedAt = new Date().toISOString();
    this._users.set(userId, user);

    const qrDataURL = await QRCode.toDataURL(secret.otpauth_url);
    return { qrDataURL, secret: secret.base32 }; // base32 shown once for backup
  }

  async confirmMFA(userId, token) {
    const user = this._users.get(userId);
    if (!user || !user.mfaSecret) throw new Error('MFA not initialised');

    const plainSecret = decryptSecret(user.mfaSecret, this._encKey);
    const verified = speakeasy.totp.verify({
      secret: plainSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) throw new Error('Invalid MFA code');

    // Generate backup codes (one-time use)
    const codes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(5).toString('hex')
    );
    const hashedCodes = codes.map((c) =>
      crypto.createHash('sha256').update(c).digest('hex')
    );
    this._backupCodes.set(userId, hashedCodes);

    user.mfaEnabled = true;
    user.updatedAt = new Date().toISOString();
    this._users.set(userId, user);
    this._log('MFA_ENABLED', { userId });

    return { success: true, backupCodes: codes };
  }

  async verifyMFA(partialToken, totpCode) {
    const payload = verifyJWT(partialToken, this._jwtSecret);
    if (!payload.mfaPending) throw new Error('Not a partial token');

    const user = this._users.get(payload.sub);
    if (!user || !user.mfaEnabled) throw new Error('MFA not configured');

    const plainSecret = decryptSecret(user.mfaSecret, this._encKey);
    const verified = speakeasy.totp.verify({
      secret: plainSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });

    if (!verified) {
      // Check backup codes
      const hashed = crypto.createHash('sha256').update(totpCode).digest('hex');
      const codes = this._backupCodes.get(user.id) || [];
      const idx = codes.indexOf(hashed);
      if (idx === -1) {
        this._log('MFA_FAILED', { userId: user.id });
        throw new Error('Invalid MFA code');
      }
      // Burn used backup code
      codes.splice(idx, 1);
      this._backupCodes.set(user.id, codes);
      this._log('MFA_BACKUP_USED', { userId: user.id });
    } else {
      this._log('MFA_VERIFIED', { userId: user.id });
    }

    return this._issueTokenPair(user);
  }

  // ── Biometrics ────────────────────────────────────────────────────────

  /**
   * Server issues a random challenge nonce; client signs it with the
   * biometric-protected private key (WebAuthn / platform authenticator).
   * In a real deployment use @simplewebauthn/server; this implements the
   * challenge generation + verification contract.
   */
  generateBiometricChallenge(userId) {
    const challenge = crypto.randomBytes(32).toString('base64url');
    this._bioChallengess.set(challenge, {
      userId,
      expires: Date.now() + 120_000,
    });
    return { challenge };
  }

  registerBiometricKey(userId, publicKeyBase64) {
    const user = this._users.get(userId);
    if (!user) throw new Error('User not found');
    // Store the public key (base64 SPKI or COSE format from WebAuthn)
    user.biometricPublicKey = publicKeyBase64;
    user.biometricEnabled = true;
    user.updatedAt = new Date().toISOString();
    this._users.set(userId, user);
    this._log('BIOMETRIC_REGISTERED', { userId });
    return { success: true };
  }

  verifyBiometricSignature(challenge, signatureBase64, clientDataBase64) {
    const record = this._bioChallengess.get(challenge);
    if (!record) throw new Error('Challenge not found or expired');
    if (Date.now() > record.expires) {
      this._bioChallengess.delete(challenge);
      throw new Error('Challenge expired');
    }
    const user = this._users.get(record.userId);
    if (!user || !user.biometricEnabled) throw new Error('Biometric not registered');
    // Real verification would use the stored public key + WebAuthn spec
    // Placeholder — replace with @simplewebauthn/server.verifyAuthenticationResponse
    this._bioChallengess.delete(challenge);
    this._log('BIOMETRIC_VERIFIED', { userId: user.id });
    return this._issueTokenPair(user);
  }

  // ── Token management ───────────────────────────────────────────────────

  _issueTokenPair(user) {
    const jti = uuidv4();
    const accessToken = signJWT(
      {
        sub: user.id,
        role: user.role,
        permissions: ROLE_PERMISSIONS[user.role] || [],
        jti,
        lang: user.language,
        region: user.region,
      },
      this._jwtSecret,
      this._jwtExpiry
    );

    const refreshJti = uuidv4();
    const refreshToken = signJWT(
      { sub: user.id, refresh: true, jti: refreshJti },
      this._jwtSecret,
      this._refreshExpiry
    );
    this._refreshTokens.set(refreshJti, { userId: user.id, expires: Date.now() + this._refreshExpiry * 1000 });

    const { passwordHash, passwordSalt, mfaSecret, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }

  verifyToken(token) {
    const payload = verifyJWT(token, this._jwtSecret);
    if (this._revokedTokens.has(payload.jti)) throw new Error('Token revoked');
    return payload;
  }

  async refreshAccessToken(refreshToken) {
    const payload = verifyJWT(refreshToken, this._jwtSecret);
    if (!payload.refresh) throw new Error('Not a refresh token');
    const record = this._refreshTokens.get(payload.jti);
    if (!record || Date.now() > record.expires) throw new Error('Refresh token expired');

    const user = this._users.get(payload.sub);
    if (!user) throw new Error('User not found');

    // Rotate: invalidate old refresh token
    this._refreshTokens.delete(payload.jti);
    this._log('TOKEN_REFRESHED', { userId: user.id });

    return this._issueTokenPair(user);
  }

  logout(token) {
    try {
      const payload = verifyJWT(token, this._jwtSecret);
      this._revokedTokens.add(payload.jti);
      this._log('LOGOUT', { userId: payload.sub });
    } catch {
      // Ignore invalid tokens on logout
    }
    return { success: true };
  }

  // ── Role / permission helpers ──────────────────────────────────────────

  hasPermission(tokenPayload, permission) {
    const perms = tokenPayload.permissions || [];
    return perms.includes('*') || perms.includes(permission);
  }

  changeRole(adminUserId, targetUserId, newRole) {
    const admin = this._users.get(adminUserId);
    if (!admin || admin.role !== ROLES.ADMIN) throw new Error('Insufficient privileges');
    const target = this._users.get(targetUserId);
    if (!target) throw new Error('Target user not found');
    target.role = newRole;
    target.updatedAt = new Date().toISOString();
    this._users.set(targetUserId, target);
    this._log('ROLE_CHANGED', { adminId: adminUserId, targetId: targetUserId, newRole });
    return { success: true };
  }

  // ── User management ────────────────────────────────────────────────────

  getUserById(id) {
    const user = this._users.get(id);
    if (!user) return null;
    const { passwordHash, passwordSalt, mfaSecret, ...safe } = user;
    return safe;
  }

  listUsers(callerRole) {
    if (callerRole !== ROLES.ADMIN && callerRole !== ROLES.DEV)
      throw new Error('Insufficient privileges');
    return [...this._users.values()].map(({ passwordHash, passwordSalt, mfaSecret, ...u }) => u);
  }

  deactivateUser(adminId, targetId) {
    const admin = this._users.get(adminId);
    if (!admin || admin.role !== ROLES.ADMIN) throw new Error('Insufficient privileges');
    const target = this._users.get(targetId);
    if (!target) throw new Error('User not found');
    target.active = false;
    target.updatedAt = new Date().toISOString();
    this._users.set(targetId, target);
    this._log('USER_DEACTIVATED', { adminId, targetId });
    return { success: true };
  }
}

export default AuthService;
