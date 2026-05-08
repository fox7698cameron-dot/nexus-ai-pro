// src/auth/authService.js
// Nexus AI Pro - Authentication Service
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// --- Role enumeration ---
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
});

// --- Password policy ---
const PASSWORD_MIN_LENGTH = 13;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{13,}$/;

// Username: allow Unicode letters, digits, underscores, hyphens, emoji (1-64 chars)
const USERNAME_PATTERN = /^[\p{L}\p{N}_\-\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]{1,64}$/u;

// MFA method enumeration
export const MFA_METHOD = Object.freeze({
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
  BIOMETRIC: 'biometric',
});

// Biometric type enumeration
export const BIOMETRIC_TYPE = Object.freeze({
  FINGERPRINT: 'fingerprint',
  FACE_ID: 'face_id',
  TOUCH_ID: 'touch_id',
  RETINAL: 'retinal',
});

export class AuthService {
  /**
   * @param {object} deps
   * @param {object} deps.dataStore - KV store (Map or Redis adapter)
   * @param {object} deps.auditLogger - { log(event, details) }
   */
  constructor({ dataStore, auditLogger }) {
    this.store = dataStore;
    this.audit = auditLogger;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.bcryptRounds = 14;

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment');
    }
  }

  // ─── Password validation ─────────────────────────────────────────────────

  validatePassword(password) {
    const errors = [];
    if (typeof password !== 'string') errors.push('Password must be a string');
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!PASSWORD_PATTERN.test(password)) {
      errors.push('Password must contain uppercase, lowercase, digit, and special character');
    }
    return errors;
  }

  validateUsername(username) {
    const errors = [];
    if (typeof username !== 'string') errors.push('Username must be a string');
    if (!USERNAME_PATTERN.test(username)) {
      errors.push('Username must be 1-64 characters; letters, numbers, _, -, or emoji allowed');
    }
    return errors;
  }

  // ─── Password hashing ────────────────────────────────────────────────────

  async hashPassword(plaintext) {
    return bcrypt.hash(plaintext, this.bcryptRounds);
  }

  async verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  }

  // ─── JWT ─────────────────────────────────────────────────────────────────

  signAccessToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '15m',
      algorithm: 'HS512',
      jwtid: uuidv4(),
    });
  }

  signRefreshToken(payload) {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: '7d',
      algorithm: 'HS512',
      jwtid: uuidv4(),
    });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.jwtSecret, { algorithms: ['HS512'] });
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.jwtRefreshSecret, { algorithms: ['HS512'] });
  }

  // ─── Registration ─────────────────────────────────────────────────────────

  async register({ username, email, password, role = ROLES.USER }) {
    const usernameErrors = this.validateUsername(username);
    if (usernameErrors.length) return { ok: false, errors: usernameErrors };

    const pwErrors = this.validatePassword(password);
    if (pwErrors.length) return { ok: false, errors: pwErrors };

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { ok: false, errors: ['Invalid email address'] };
    }

    // Reject unknown roles
    if (!Object.values(ROLES).includes(role)) {
      return { ok: false, errors: ['Invalid role'] };
    }

    const userId = uuidv4();
    const hashedPw = await this.hashPassword(password);
    const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');

    const user = {
      id: userId,
      username,
      emailHash,
      passwordHash: hashedPw,
      role,
      mfaEnabled: false,
      mfaMethod: null,
      mfaSecret: null,
      biometricPublicKey: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLoginAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      locale: 'en',
    };

    await this.store.set(`user:id:${userId}`, user);
    await this.store.set(`user:email:${emailHash}`, userId);
    await this.store.set(`user:username:${username.toLowerCase()}`, userId);

    this.audit.log('USER_REGISTERED', { userId, role });
    return { ok: true, userId, role };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
    const userId = await this.store.get(`user:email:${emailHash}`);

    if (!userId) {
      // Constant-time fail to prevent user enumeration
      await bcrypt.hash('dummy', this.bcryptRounds);
      return { ok: false, error: 'Invalid credentials' };
    }

    const user = await this.store.get(`user:id:${userId}`);
    if (!user) return { ok: false, error: 'Invalid credentials' };

    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      return { ok: false, error: 'Account temporarily locked. Try again later.' };
    }

    const valid = await this.verifyPassword(password, user.passwordHash);
    if (!valid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
      }
      user.updatedAt = Date.now();
      await this.store.set(`user:id:${userId}`, user);
      this.audit.log('LOGIN_FAILED', { userId, attempts: user.failedLoginAttempts });
      return { ok: false, error: 'Invalid credentials' };
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = Date.now();
    user.updatedAt = Date.now();
    await this.store.set(`user:id:${userId}`, user);

    this.audit.log('LOGIN_SUCCESS', { userId, role: user.role });

    if (user.mfaEnabled) {
      const mfaToken = uuidv4();
      await this.store.set(`mfa:pending:${mfaToken}`, { userId, expiresAt: Date.now() + 5 * 60 * 1000 });
      return { ok: true, mfaRequired: true, mfaMethod: user.mfaMethod, mfaToken };
    }

    return this._issueTokens(user);
  }

  _issueTokens(user) {
    const payload = { sub: user.id, role: user.role, jti: uuidv4() };
    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken({ sub: user.id, jti: uuidv4() });
    return {
      ok: true,
      accessToken,
      refreshToken,
      role: user.role,
      userId: user.id,
    };
  }

  // ─── Token refresh ────────────────────────────────────────────────────────

  async refreshTokens(refreshToken) {
    let decoded;
    try {
      decoded = this.verifyRefreshToken(refreshToken);
    } catch {
      return { ok: false, error: 'Invalid refresh token' };
    }
    const user = await this.store.get(`user:id:${decoded.sub}`);
    if (!user) return { ok: false, error: 'User not found' };
    return this._issueTokens(user);
  }

  // ─── MFA / TOTP setup ────────────────────────────────────────────────────

  async setupTOTP(userId) {
    const user = await this.store.get(`user:id:${userId}`);
    if (!user) return { ok: false, error: 'User not found' };

    const secret = speakeasy.generateSecret({
      name: `NexusAIPro:${user.username}`,
      length: 20,
    });

    user.mfaTempSecret = secret.base32;
    user.updatedAt = Date.now();
    await this.store.set(`user:id:${userId}`, user);

    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
    return { ok: true, secret: secret.base32, qrCode: qrUrl };
  }

  async verifyTOTP(userId, token) {
    const user = await this.store.get(`user:id:${userId}`);
    if (!user) return false;
    const secret = user.mfaSecret || user.mfaTempSecret;
    return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
  }

  async enableMFA(userId, token, method = MFA_METHOD.TOTP) {
    const user = await this.store.get(`user:id:${userId}`);
    if (!user || !user.mfaTempSecret) return { ok: false, error: 'MFA setup not started' };

    const valid = await this.verifyTOTP(userId, token);
    if (!valid) return { ok: false, error: 'Invalid TOTP code' };

    user.mfaEnabled = true;
    user.mfaMethod = method;
    user.mfaSecret = user.mfaTempSecret;
    delete user.mfaTempSecret;
    user.updatedAt = Date.now();
    await this.store.set(`user:id:${userId}`, user);

    this.audit.log('MFA_ENABLED', { userId, method });
    return { ok: true };
  }

  async completeMFALogin(mfaToken, totpCode) {
    const pending = await this.store.get(`mfa:pending:${mfaToken}`);
    if (!pending || Date.now() > pending.expiresAt) {
      return { ok: false, error: 'MFA session expired' };
    }

    const valid = await this.verifyTOTP(pending.userId, totpCode);
    if (!valid) return { ok: false, error: 'Invalid MFA code' };

    await this.store.del(`mfa:pending:${mfaToken}`);
    const user = await this.store.get(`user:id:${pending.userId}`);
    this.audit.log('MFA_VERIFIED', { userId: pending.userId });
    return this._issueTokens(user);
  }

  // ─── Biometric registration ───────────────────────────────────────────────

  async registerBiometric(userId, { type, publicKey, challenge }) {
    if (!Object.values(BIOMETRIC_TYPE).includes(type)) {
      return { ok: false, error: 'Unsupported biometric type' };
    }
    const user = await this.store.get(`user:id:${userId}`);
    if (!user) return { ok: false, error: 'User not found' };

    // Store hashed public key — never store raw biometric data
    const keyHash = crypto.createHash('sha512').update(publicKey).digest('hex');
    user.biometricPublicKey = keyHash;
    user.biometricType = type;
    user.updatedAt = Date.now();
    await this.store.set(`user:id:${userId}`, user);

    this.audit.log('BIOMETRIC_REGISTERED', { userId, type });
    return { ok: true };
  }

  async verifyBiometric(userId, { publicKey }) {
    const user = await this.store.get(`user:id:${userId}`);
    if (!user || !user.biometricPublicKey) return false;
    const keyHash = crypto.createHash('sha512').update(publicKey).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(keyHash, 'hex'),
      Buffer.from(user.biometricPublicKey, 'hex')
    );
  }

  // ─── Middleware factory ───────────────────────────────────────────────────

  requireAuth(requiredRole = null) {
    return async (req, res, next) => {
      const header = req.headers['authorization'];
      if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const token = header.slice(7);
      try {
        const decoded = this.verifyAccessToken(token);
        req.user = decoded;
        if (requiredRole && decoded.role !== requiredRole) {
          // Allow admins through anything
          if (decoded.role !== ROLES.ADMIN) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
        }
        next();
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    };
  }

  requireRoles(...roles) {
    return async (req, res, next) => {
      const header = req.headers['authorization'];
      if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const token = header.slice(7);
      try {
        const decoded = this.verifyAccessToken(token);
        req.user = decoded;
        if (!roles.includes(decoded.role)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        next();
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    };
  }

  // ─── User lookup ─────────────────────────────────────────────────────────

  async getUser(userId) {
    const user = await this.store.get(`user:id:${userId}`);
    if (!user) return null;
    // Never return passwordHash or mfaSecret
    const { passwordHash, mfaSecret, mfaTempSecret, ...safe } = user;
    return safe;
  }

  async updateUserLocale(userId, locale) {
    const user = await this.store.get(`user:id:${userId}`);
    if (!user) return false;
    user.locale = locale;
    user.updatedAt = Date.now();
    await this.store.set(`user:id:${userId}`, user);
    return true;
  }
}
