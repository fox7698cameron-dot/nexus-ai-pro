// src/auth/authService.js
// 2026-07-23 | Nexus AI Pro - Authentication Service
// Roles: admin, dev, moderator, user | 2FA/MFA | Biometrics | i18n

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Password policy: minimum 13 chars, at least one uppercase, one lowercase, one digit, one special char
const PASSWORD_MIN_LENGTH = 13;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;

// Username allows Unicode letters, digits, emoji, underscores, hyphens (1–64 chars)
const USERNAME_REGEX = /^[\p{L}\p{N}\p{Emoji}_\-]{1,64}$/u;

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
});

export const ROLE_PERMISSIONS = Object.freeze({
  admin: ['read', 'write', 'delete', 'manage_users', 'manage_roles', 'view_audit', 'manage_connectors', 'view_security', 'manage_system'],
  dev: ['read', 'write', 'delete', 'manage_connectors', 'view_security', 'view_audit'],
  moderator: ['read', 'write', 'manage_users', 'view_audit'],
  user: ['read', 'write'],
});

export class AuthService {
  constructor(securityModule) {
    this.security = securityModule;
    this.users = new Map();
    this.sessions = new Map();
    this.mfaSecrets = new Map();
    this.refreshTokens = new Map();
    this.resetTokens = new Map();
    this.loginAttempts = new Map();
    this.MAX_LOGIN_ATTEMPTS = 5;
    this.LOCKOUT_DURATION_MS = 15 * 60 * 1000;
    this.SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
    this.REFRESH_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
    this.TOTP_WINDOW = 1;
  }

  validatePasswordStrength(password) {
    const errors = [];
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[a-z]/.test(password)) errors.push('Must include a lowercase letter');
    if (!/[A-Z]/.test(password)) errors.push('Must include an uppercase letter');
    if (!/\d/.test(password)) errors.push('Must include a digit');
    if (!/[\W_]/.test(password)) errors.push('Must include a special character');
    return { valid: errors.length === 0, errors };
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username is required' };
    }
    if (!USERNAME_REGEX.test(username)) {
      return { valid: false, error: 'Username can contain letters, numbers, emoji, underscores, hyphens (1-64 chars)' };
    }
    return { valid: true };
  }

  hashPassword(password, salt) {
    const s = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 210000, 64, 'sha512').toString('hex');
    return { hash, salt: s };
  }

  verifyPassword(password, storedHash, salt) {
    const { hash } = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  }

  generateToken(length = 48) {
    return crypto.randomBytes(length).toString('base64url');
  }

  generateTOTPSecret() {
    return crypto.randomBytes(20).toString('base32' in Buffer ? 'base32' : 'hex');
  }

  // TOTP verification using time-based one-time passwords (RFC 6238)
  verifyTOTP(secret, token) {
    const now = Math.floor(Date.now() / 1000);
    for (let delta = -this.TOTP_WINDOW; delta <= this.TOTP_WINDOW; delta++) {
      const counter = Math.floor((now + delta * 30) / 30);
      const expected = this._computeHOTP(secret, counter);
      if (crypto.timingSafeEqual(
        Buffer.from(String(expected).padStart(6, '0')),
        Buffer.from(token.toString().padStart(6, '0'))
      )) return true;
    }
    return false;
  }

  _computeHOTP(secret, counter) {
    const keyBuf = Buffer.from(secret, 'hex').slice(0, 20);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', keyBuf).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24)
      | ((hmac[offset + 1] & 0xff) << 16)
      | ((hmac[offset + 2] & 0xff) << 8)
      | (hmac[offset + 3] & 0xff);
    return code % 1000000;
  }

  // Biometric challenge: server issues a cryptographic nonce; client signs it.
  // The actual biometric verification is done on-device (WebAuthn / FIDO2 compatible).
  generateBiometricChallenge(userId) {
    const challenge = crypto.randomBytes(32).toString('base64url');
    const expires = Date.now() + 5 * 60 * 1000;
    const entry = { userId, challenge, expires };
    this.sessions.set(`bio:${userId}`, entry);
    return { challenge, expires };
  }

  verifyBiometricResponse(userId, clientDataJSON, signature) {
    const entry = this.sessions.get(`bio:${userId}`);
    if (!entry || Date.now() > entry.expires) return false;
    this.sessions.delete(`bio:${userId}`);
    // In production, verify WebAuthn assertion against stored credential public key.
    // For now, we trust the client-signed challenge (works with Capacitor Biometric plugin).
    try {
      const parsed = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
      return parsed.challenge === entry.challenge;
    } catch {
      return false;
    }
  }

  isAccountLocked(email) {
    const attempts = this.loginAttempts.get(email);
    if (!attempts) return false;
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) return true;
    if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
      this.loginAttempts.delete(email);
    }
    return false;
  }

  recordLoginAttempt(email, success) {
    if (success) {
      this.loginAttempts.delete(email);
      return;
    }
    const existing = this.loginAttempts.get(email) || { count: 0 };
    existing.count += 1;
    if (existing.count >= this.MAX_LOGIN_ATTEMPTS) {
      existing.lockedUntil = Date.now() + this.LOCKOUT_DURATION_MS;
    }
    this.loginAttempts.set(email, existing);
  }

  async register({ username, email, password, role = ROLES.USER, locale = 'en' }) {
    const usernameValidation = this.validateUsername(username);
    if (!usernameValidation.valid) throw new Error(usernameValidation.error);

    const pwValidation = this.validatePasswordStrength(password);
    if (!pwValidation.valid) throw new Error(pwValidation.errors.join('; '));

    const normalizedEmail = email.toLowerCase().trim();

    for (const user of this.users.values()) {
      if (user.email === normalizedEmail) throw new Error('Email already registered');
      if (user.username.toLowerCase() === username.toLowerCase()) throw new Error('Username taken');
    }

    const validRole = Object.values(ROLES).includes(role) ? role : ROLES.USER;
    const { hash, salt } = this.hashPassword(password);
    const userId = uuidv4();
    const mfaSecret = this.generateTOTPSecret();

    const user = {
      id: userId,
      username,
      email: normalizedEmail,
      passwordHash: hash,
      passwordSalt: salt,
      role: validRole,
      permissions: ROLE_PERMISSIONS[validRole],
      locale,
      mfaEnabled: false,
      mfaSecret,
      biometricEnabled: false,
      biometricCredentialIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLogin: null,
      emailVerified: false,
      status: 'active',
    };

    this.users.set(userId, user);
    this.security.logAudit('USER_REGISTERED', { userId, email: normalizedEmail, role: validRole });

    const { passwordHash, passwordSalt, mfaSecret: _ms, ...safeUser } = user;
    return safeUser;
  }

  async login({ email, password, totpToken, locale }) {
    const normalizedEmail = email.toLowerCase().trim();

    if (this.isAccountLocked(normalizedEmail)) {
      throw new Error('Account temporarily locked due to too many failed attempts');
    }

    let foundUser;
    for (const user of this.users.values()) {
      if (user.email === normalizedEmail) { foundUser = user; break; }
    }

    if (!foundUser || !this.verifyPassword(password, foundUser.passwordHash, foundUser.passwordSalt)) {
      this.recordLoginAttempt(normalizedEmail, false);
      throw new Error('Invalid credentials');
    }

    if (foundUser.status !== 'active') throw new Error('Account is not active');

    if (foundUser.mfaEnabled) {
      if (!totpToken) return { requiresMFA: true, userId: foundUser.id };
      if (!this.verifyTOTP(foundUser.mfaSecret, totpToken)) {
        this.recordLoginAttempt(normalizedEmail, false);
        throw new Error('Invalid MFA token');
      }
    }

    this.recordLoginAttempt(normalizedEmail, true);

    foundUser.lastLogin = Date.now();
    foundUser.updatedAt = Date.now();
    if (locale) foundUser.locale = locale;
    this.users.set(foundUser.id, foundUser);

    const sessionToken = this.generateToken();
    const refreshToken = this.generateToken(64);
    const expiresAt = Date.now() + this.SESSION_DURATION_MS;

    this.sessions.set(sessionToken, { userId: foundUser.id, expiresAt, role: foundUser.role });
    this.refreshTokens.set(refreshToken, { userId: foundUser.id, expiresAt: Date.now() + this.REFRESH_DURATION_MS });

    this.security.logAudit('USER_LOGIN', { userId: foundUser.id, email: normalizedEmail });

    const { passwordHash, passwordSalt, mfaSecret, ...safeUser } = foundUser;
    return { user: safeUser, sessionToken, refreshToken, expiresAt };
  }

  refreshSession(refreshToken) {
    const entry = this.refreshTokens.get(refreshToken);
    if (!entry || Date.now() > entry.expiresAt) throw new Error('Invalid or expired refresh token');

    const user = this.users.get(entry.userId);
    if (!user || user.status !== 'active') throw new Error('User not found or inactive');

    const newSession = this.generateToken();
    const newRefresh = this.generateToken(64);
    this.sessions.set(newSession, { userId: user.id, expiresAt: Date.now() + this.SESSION_DURATION_MS, role: user.role });
    this.refreshTokens.delete(refreshToken);
    this.refreshTokens.set(newRefresh, { userId: user.id, expiresAt: Date.now() + this.REFRESH_DURATION_MS });

    return { sessionToken: newSession, refreshToken: newRefresh, expiresAt: Date.now() + this.SESSION_DURATION_MS };
  }

  logout(sessionToken) {
    this.sessions.delete(sessionToken);
  }

  verifySession(sessionToken) {
    const session = this.sessions.get(sessionToken);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionToken);
      return null;
    }
    const user = this.users.get(session.userId);
    if (!user || user.status !== 'active') return null;
    const { passwordHash, passwordSalt, mfaSecret, ...safeUser } = user;
    return safeUser;
  }

  requirePermission(permission) {
    return (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Authentication required' });

      const user = this.verifySession(token);
      if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

      if (!user.permissions.includes(permission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.user = user;
      next();
    };
  }

  requireRole(...roles) {
    return (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Authentication required' });

      const user = this.verifySession(token);
      if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied for your role' });
      }

      req.user = user;
      next();
    };
  }

  enableMFA(userId) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const secret = this.generateTOTPSecret();
    user.mfaSecret = secret;
    user.mfaEnabled = true;
    user.updatedAt = Date.now();
    this.users.set(userId, user);
    this.security.logAudit('MFA_ENABLED', { userId });
    return { secret, qrCodeUrl: `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro` };
  }

  disableMFA(userId, totpToken) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    if (!this.verifyTOTP(user.mfaSecret, totpToken)) throw new Error('Invalid MFA token');
    user.mfaEnabled = false;
    user.updatedAt = Date.now();
    this.users.set(userId, user);
    this.security.logAudit('MFA_DISABLED', { userId });
  }

  registerBiometric(userId, credentialId, publicKey) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.biometricCredentialIds = [...(user.biometricCredentialIds || []), { credentialId, publicKey, registeredAt: Date.now() }];
    user.biometricEnabled = true;
    user.updatedAt = Date.now();
    this.users.set(userId, user);
    this.security.logAudit('BIOMETRIC_REGISTERED', { userId, credentialId });
  }

  getUserById(userId) {
    const user = this.users.get(userId);
    if (!user) return null;
    const { passwordHash, passwordSalt, mfaSecret, ...safeUser } = user;
    return safeUser;
  }

  listUsers(filter = {}) {
    const results = [];
    for (const user of this.users.values()) {
      const { passwordHash, passwordSalt, mfaSecret, ...safeUser } = user;
      let match = true;
      for (const [k, v] of Object.entries(filter)) {
        if (safeUser[k] !== v) { match = false; break; }
      }
      if (match) results.push(safeUser);
    }
    return results;
  }

  updateUserRole(adminUserId, targetUserId, newRole) {
    const admin = this.users.get(adminUserId);
    if (!admin || admin.role !== ROLES.ADMIN) throw new Error('Only admins can change roles');
    const target = this.users.get(targetUserId);
    if (!target) throw new Error('Target user not found');
    const validRole = Object.values(ROLES).includes(newRole) ? newRole : ROLES.USER;
    target.role = validRole;
    target.permissions = ROLE_PERMISSIONS[validRole];
    target.updatedAt = Date.now();
    this.users.set(targetUserId, target);
    this.security.logAudit('ROLE_CHANGED', { adminUserId, targetUserId, newRole: validRole });
  }

  generatePasswordResetToken(email) {
    const normalizedEmail = email.toLowerCase().trim();
    let foundUser;
    for (const user of this.users.values()) {
      if (user.email === normalizedEmail) { foundUser = user; break; }
    }
    if (!foundUser) return null;
    const token = this.generateToken(48);
    this.resetTokens.set(token, { userId: foundUser.id, expires: Date.now() + 60 * 60 * 1000 });
    return token;
  }

  resetPassword(token, newPassword) {
    const entry = this.resetTokens.get(token);
    if (!entry || Date.now() > entry.expires) throw new Error('Invalid or expired reset token');

    const pwValidation = this.validatePasswordStrength(newPassword);
    if (!pwValidation.valid) throw new Error(pwValidation.errors.join('; '));

    const user = this.users.get(entry.userId);
    if (!user) throw new Error('User not found');

    const { hash, salt } = this.hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.updatedAt = Date.now();
    this.users.set(user.id, user);
    this.resetTokens.delete(token);

    // Invalidate all existing sessions for this user
    for (const [sessionToken, session] of this.sessions.entries()) {
      if (session.userId === user.id) this.sessions.delete(sessionToken);
    }

    this.security.logAudit('PASSWORD_RESET', { userId: user.id });
  }
}
