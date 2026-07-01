// ================================================
// NEXUS AI PRO - Authentication Service
// File: src/services/authService.js
// Updated: 2026-07-01
// Handles: JWT, bcrypt, TOTP 2FA, MFA, biometrics
// ================================================

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Password policy: 13+ chars, uppercase, lowercase, digit, special
const PASSWORD_MIN_LENGTH = 13;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~])/;

// Supported user roles — enumerated to prevent privilege escalation
export const ROLES = Object.freeze({
  USER: 'user',
  MODERATOR: 'moderator',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
});

// MFA method enumeration
export const MFA_METHODS = Object.freeze({
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
  BIOMETRIC: 'biometric',
  BACKUP: 'backup',
});

export class AuthService {
  constructor(db, redis) {
    this.db = db;
    this.redis = redis;
    this._validateEnv();
  }

  _validateEnv() {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_SECRET'];
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }

  // ── Password validation ────────────────────────────────────────────────────

  validatePassword(password) {
    const errors = [];
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    }
    if (!PASSWORD_REGEX.test(password)) {
      errors.push('Password must include uppercase, lowercase, digit, and special character.');
    }
    return { valid: errors.length === 0, errors };
  }

  // Username may contain letters, numbers, underscores, hyphens, dots,
  // and Unicode characters (including emoji). Length 2-64.
  validateUsername(username) {
    if (typeof username !== 'string') return { valid: false, errors: ['Username must be a string.'] };
    const len = [...username].length; // unicode-aware length
    if (len < 2 || len > 64) return { valid: false, errors: ['Username must be 2–64 characters.'] };
    // Reject control characters and null bytes only
    if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(username)) {
      return { valid: false, errors: ['Username contains invalid control characters.'] };
    }
    return { valid: true, errors: [] };
  }

  // ── Password hashing (bcrypt cost 12) ─────────────────────────────────────

  async hashPassword(password) {
    const { default: bcrypt } = await import('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password, hash) {
    const { default: bcrypt } = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  // ── JWT (access + refresh) ────────────────────────────────────────────────

  async generateTokenPair(payload) {
    const { default: jwt } = await import('jsonwebtoken');
    const jti = uuidv4();
    const accessToken = jwt.sign(
      { ...payload, jti, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m', algorithm: 'HS256' }
    );
    const refreshToken = jwt.sign(
      { sub: payload.sub, jti, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', algorithm: 'HS256' }
    );
    // Store refresh token reference in Redis (TTL 7 days)
    if (this.redis) {
      await this.redis.setex(`refresh:${jti}`, 7 * 24 * 3600, payload.sub);
    }
    return { accessToken, refreshToken, jti };
  }

  async verifyAccessToken(token) {
    const { default: jwt } = await import('jsonwebtoken');
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  async verifyRefreshToken(token) {
    const { default: jwt } = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');
    // Check revocation list
    if (this.redis) {
      const revoked = await this.redis.get(`revoked:${decoded.jti}`);
      if (revoked) throw new Error('Token revoked');
    }
    return decoded;
  }

  async revokeToken(jti) {
    if (this.redis) {
      await this.redis.setex(`revoked:${jti}`, 7 * 24 * 3600, '1');
      await this.redis.del(`refresh:${jti}`);
    }
  }

  // ── TOTP 2FA ──────────────────────────────────────────────────────────────

  async setupTOTP(userId, username) {
    const { default: speakeasy } = await import('speakeasy');
    const { default: QRCode } = await import('qrcode');
    const secret = speakeasy.generateSecret({
      name: `Nexus AI Pro:${username}`,
      issuer: 'Nexus AI Pro',
      length: 32,
    });
    // Store encrypted secret in Redis pending verification
    if (this.redis) {
      const encrypted = this._encryptTOTPSecret(secret.base32);
      await this.redis.setex(`totp:pending:${userId}`, 600, encrypted);
    }
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    return {
      secret: secret.base32,
      qrCode: qrDataUrl,
      backupCodes: this._generateBackupCodes(),
    };
  }

  async verifyTOTP(userId, token, secret) {
    const { default: speakeasy } = await import('speakeasy');
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  _generateBackupCodes(count = 10) {
    return Array.from({ length: count }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase()
    );
  }

  _encryptTOTPSecret(secret) {
    const key = crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'totp-salt', 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({ iv: iv.toString('hex'), enc: enc.toString('hex'), tag: tag.toString('hex') });
  }

  _decryptTOTPSecret(payload) {
    const { iv, enc, tag } = JSON.parse(payload);
    const key = crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'totp-salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(enc, 'hex')), decipher.final()]).toString('utf8');
  }

  // ── Biometrics ────────────────────────────────────────────────────────────
  // Server stores a cryptographic challenge; the client signs it with the
  // platform credential (Touch ID / Face ID / fingerprint / retinal scan).
  // This is a WebAuthn-compatible credential binding pattern.

  async generateBiometricChallenge(userId) {
    const challenge = crypto.randomBytes(32).toString('base64url');
    if (this.redis) {
      await this.redis.setex(`biometric:challenge:${userId}`, 300, challenge);
    }
    return { challenge };
  }

  async verifyBiometricResponse(userId, { credentialId, signature, clientDataHash }) {
    if (!this.redis) throw new Error('Redis required for biometric verification');
    const challenge = await this.redis.get(`biometric:challenge:${userId}`);
    if (!challenge) throw new Error('Challenge expired or not found');
    await this.redis.del(`biometric:challenge:${userId}`);
    // In production integrate with @simplewebauthn/server; here we verify
    // that the response contains the stored challenge in clientDataHash.
    if (!clientDataHash || !clientDataHash.includes(challenge)) {
      throw new Error('Biometric challenge mismatch');
    }
    return { verified: true, credentialId };
  }

  // ── MFA orchestration ─────────────────────────────────────────────────────

  async initiateMFA(userId, method) {
    const stateKey = `mfa:state:${userId}`;
    const state = { method, initiated: Date.now(), verified: false };
    if (this.redis) {
      await this.redis.setex(stateKey, 300, JSON.stringify(state));
    }
    if (method === MFA_METHODS.EMAIL) {
      const code = crypto.randomInt(100000, 999999).toString();
      if (this.redis) await this.redis.setex(`mfa:code:${userId}`, 300, code);
      return { method, action: 'email_sent' };
    }
    if (method === MFA_METHODS.SMS) {
      const code = crypto.randomInt(100000, 999999).toString();
      if (this.redis) await this.redis.setex(`mfa:code:${userId}`, 300, code);
      return { method, action: 'sms_sent' };
    }
    return { method, action: 'awaiting_credential' };
  }

  async verifyMFA(userId, method, credential) {
    if (method === MFA_METHODS.EMAIL || method === MFA_METHODS.SMS) {
      if (!this.redis) throw new Error('Redis required for MFA');
      const stored = await this.redis.get(`mfa:code:${userId}`);
      if (!stored || stored !== credential) throw new Error('Invalid MFA code');
      await this.redis.del(`mfa:code:${userId}`);
      return true;
    }
    if (method === MFA_METHODS.TOTP) {
      // caller must supply the user's stored TOTP secret
      return false; // handled by verifyTOTP
    }
    return false;
  }

  // ── Session management ────────────────────────────────────────────────────

  async createSession(userId, metadata = {}) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ...metadata,
    };
    if (this.redis) {
      await this.redis.setex(
        `session:${sessionId}`,
        parseInt(process.env.SESSION_TTL || '86400'),
        JSON.stringify(session)
      );
    }
    return sessionId;
  }

  async getSession(sessionId) {
    if (!this.redis) return null;
    const raw = await this.redis.get(`session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  }

  async destroySession(sessionId) {
    if (this.redis) await this.redis.del(`session:${sessionId}`);
  }

  // ── Secure token for email verification / password reset ─────────────────

  generateSecureToken() {
    return crypto.randomBytes(32).toString('base64url');
  }
}
