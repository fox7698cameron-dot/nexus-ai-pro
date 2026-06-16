// File: authService.js | Date: 2026-06-16
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import cryptoService from './cryptoService.js';
import redisService from './redisService.js';
import config from '../config/index.js';
import auditLogger from '../utils/audit.js';

const COMMON_PASSWORDS = new Set([
  'password', '123456789', 'password123', 'qwerty123', 'iloveyou123',
  'admin1234567', 'letmein123', 'welcome123', 'monkey123456',
]);

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_\-+=]).{13,}$/;
const SPECIAL_CHAR_REGEX = /[@$!%*?&#^_\-+=]/;
const USERNAME_REGEX = /^[\p{L}\p{N}_.@\-]{3,30}$/u;

// In-memory user store (keyed by email). Replace with DB in production.
const userStore = new Map();
const userById = new Map();
const resetTokens = new Map(); // token → {userId, expires}
const mfaSecrets = new Map();  // userId → {secret, backupCodes, enabled}
const biometricData = new Map(); // userId → encryptedCredential

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
}

function validatePassword(password) {
  if (!password || password.length < config.security.passwordMinLength) {
    throw new Error(`Password must be at least ${config.security.passwordMinLength} characters`);
  }
  if (!PASSWORD_REGEX.test(password)) {
    throw new Error(
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&#^_-+=)'
    );
  }
  if (!SPECIAL_CHAR_REGEX.test(password)) {
    throw new Error('Password must contain at least one special character');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new Error('Password is too common. Please choose a more unique password.');
  }
}

export class AuthService {
  /**
   * Register a new user.
   */
  async register({ email, password, username, displayName, role }) {
    if (!email || !password || !username) {
      throw new Error('Email, password, and username are required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (userStore.has(normalizedEmail)) {
      throw new Error('An account with this email already exists');
    }

    if (!USERNAME_REGEX.test(username)) {
      throw new Error('Username must be 3-30 characters and may contain letters, numbers, underscores, hyphens, dots, or emoji');
    }

    validatePassword(password);

    const passwordHash = await cryptoService.hashPassword(password);
    const id = uuidv4();

    // First registered user becomes admin
    const isFirstUser = userStore.size === 0;
    const assignedRole = isFirstUser ? 'admin' : (config.roles.includes(role) ? role : 'user');

    const user = {
      id,
      email: normalizedEmail,
      username,
      displayName: displayName || username,
      role: assignedRole,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mfaEnabled: false,
      biometricEnabled: false,
      isActive: true,
    };

    userStore.set(normalizedEmail, user);
    userById.set(id, user);

    const { accessToken, refreshToken } = await this._generateTokenPair(user);

    auditLogger.log('user.register', id, { email: normalizedEmail, role: assignedRole }, 'info');

    return { user: sanitizeUser(user), accessToken, refreshToken };
  }

  /**
   * Authenticate a user with email + password.
   */
  async login(email, password) {
    if (!email || !password) throw new Error('Email and password are required');

    const normalizedEmail = email.toLowerCase().trim();
    const user = userStore.get(normalizedEmail);

    if (!user || !user.isActive) {
      // Constant-time-ish: still hash to prevent timing attacks
      await cryptoService.hashPassword(password);
      throw new Error('Invalid email or password');
    }

    const valid = await cryptoService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      auditLogger.log('auth.login.failed', user.id, { email: normalizedEmail }, 'warn');
      throw new Error('Invalid email or password');
    }

    user.lastLoginAt = new Date().toISOString();
    userStore.set(normalizedEmail, user);
    userById.set(user.id, user);

    const { accessToken, refreshToken } = await this._generateTokenPair(user);

    auditLogger.log('auth.login', user.id, { email: normalizedEmail }, 'info');

    return { user: sanitizeUser(user), accessToken, refreshToken };
  }

  /**
   * Refresh access + refresh token pair.
   */
  async refreshTokens(refreshToken) {
    if (!refreshToken) throw new Error('Refresh token is required');

    // Check if token has been blacklisted
    const blacklisted = await redisService.get(`blacklist:${refreshToken}`);
    if (blacklisted) throw new Error('Refresh token has been revoked');

    let payload;
    try {
      payload = this.verifyJWT(refreshToken);
    } catch {
      throw new Error('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') throw new Error('Invalid token type');

    const user = userById.get(payload.sub);
    if (!user || !user.isActive) throw new Error('User not found or deactivated');

    // Invalidate old refresh token
    await redisService.set(`blacklist:${refreshToken}`, '1', 7 * 24 * 3600);

    const tokens = await this._generateTokenPair(user);
    return tokens;
  }

  /**
   * Sign a JWT with the app secret.
   */
  generateJWT(payload, expiresIn) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return jwt.sign(payload, secret, { expiresIn: expiresIn || config.security.jwtExpiresIn });
  }

  /**
   * Verify and decode a JWT.
   */
  verifyJWT(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return jwt.verify(token, secret);
  }

  /**
   * Set up MFA for a user.
   */
  async setupMFA(userId) {
    const user = userById.get(userId);
    if (!user) throw new Error('User not found');

    const totpSecret = cryptoService.generateTOTPSecret();
    const backupCodes = cryptoService.generateBackupCodes(8);

    mfaSecrets.set(userId, {
      secret: totpSecret.base32,
      backupCodes,
      enabled: false, // Enabled only after first successful verify
    });

    auditLogger.log('auth.mfa.setup', userId, {}, 'info');

    return {
      secret: totpSecret.base32,
      qrCode: totpSecret.otpauth_url,
      backupCodes,
    };
  }

  /**
   * Verify a TOTP code and enable MFA if not yet enabled.
   */
  async verifyMFACode(userId, code) {
    const mfa = mfaSecrets.get(userId);
    if (!mfa) throw new Error('MFA not set up for this user');

    // Check backup codes first
    const backupIndex = mfa.backupCodes.indexOf(code.toUpperCase());
    if (backupIndex !== -1) {
      mfa.backupCodes.splice(backupIndex, 1);
      mfaSecrets.set(userId, mfa);
      auditLogger.log('auth.mfa.backup_code_used', userId, {}, 'warn');
      return { valid: true, method: 'backup' };
    }

    const valid = cryptoService.verifyTOTP(code, mfa.secret);
    if (valid && !mfa.enabled) {
      mfa.enabled = true;
      mfaSecrets.set(userId, mfa);
      const user = userById.get(userId);
      if (user) { user.mfaEnabled = true; }
    }

    if (valid) auditLogger.log('auth.mfa.verified', userId, {}, 'info');
    return { valid, method: 'totp' };
  }

  /**
   * Store encrypted biometric credential ID for a user.
   */
  async setupBiometric(userId, biometricData_) {
    const user = userById.get(userId);
    if (!user) throw new Error('User not found');

    const encrypted = cryptoService.encrypt(JSON.stringify(biometricData_), userId);
    biometricData.set(userId, encrypted);

    user.biometricEnabled = true;
    auditLogger.log('auth.biometric.setup', userId, {}, 'info');

    return { success: true };
  }

  /**
   * Verify a WebAuthn assertion against stored biometric credential.
   */
  async verifyBiometric(userId, assertion) {
    const stored = biometricData.get(userId);
    if (!stored) throw new Error('No biometric credential found for user');

    const storedData = JSON.parse(cryptoService.decrypt(stored, userId));
    // WebAuthn assertion verification stub — replace with @simplewebauthn/server in production
    const credentialIdMatch = storedData.credentialId === assertion.credentialId;

    if (!credentialIdMatch) {
      auditLogger.log('auth.biometric.failed', userId, {}, 'warn');
      return { valid: false };
    }

    auditLogger.log('auth.biometric.verified', userId, {}, 'info');
    return { valid: true };
  }

  /**
   * Change a user's password.
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = userById.get(userId);
    if (!user) throw new Error('User not found');

    const valid = await cryptoService.verifyPassword(oldPassword, user.passwordHash);
    if (!valid) throw new Error('Current password is incorrect');

    validatePassword(newPassword);

    user.passwordHash = await cryptoService.hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();

    userStore.set(user.email, user);
    userById.set(userId, user);

    auditLogger.log('auth.password.changed', userId, {}, 'info');
    return { success: true };
  }

  /**
   * Initiate a password reset flow.
   */
  async requestPasswordReset(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = userStore.get(normalizedEmail);

    // Always return success to prevent email enumeration
    if (!user) return { success: true };

    const token = cryptoService.generateToken(32);
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes

    resetTokens.set(token, { userId: user.id, expires });

    // In production: send email with reset link containing token
    auditLogger.log('auth.password.reset_requested', user.id, { email: normalizedEmail }, 'info');

    return { success: true, token }; // Token only returned in dev; omit in prod email flow
  }

  /**
   * Complete a password reset using a valid token.
   */
  async resetPassword(token, newPassword) {
    const entry = resetTokens.get(token);
    if (!entry) throw new Error('Invalid or expired password reset token');
    if (Date.now() > entry.expires) {
      resetTokens.delete(token);
      throw new Error('Password reset token has expired');
    }

    validatePassword(newPassword);

    const user = userById.get(entry.userId);
    if (!user) throw new Error('User not found');

    user.passwordHash = await cryptoService.hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    userStore.set(user.email, user);
    userById.set(user.id, user);

    resetTokens.delete(token);
    auditLogger.log('auth.password.reset', user.id, {}, 'info');

    return { success: true };
  }

  /**
   * Blacklist a token (logout).
   */
  async blacklistToken(token) {
    try {
      const payload = this.verifyJWT(token);
      const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
      await redisService.set(`blacklist:${token}`, '1', ttl || 900);
    } catch {
      // If token is already invalid, nothing to do
    }
  }

  /**
   * Update a user's profile fields.
   */
  async updateProfile(userId, updates) {
    const user = userById.get(userId);
    if (!user) throw new Error('User not found');

    const allowed = ['displayName', 'username', 'avatarUrl', 'bio', 'timezone'];
    for (const key of allowed) {
      if (updates[key] !== undefined) user[key] = updates[key];
    }
    user.updatedAt = new Date().toISOString();
    userStore.set(user.email, user);
    return sanitizeUser(user);
  }

  /**
   * Get a user by ID.
   */
  getUserById(id) {
    const user = userById.get(id);
    return user ? sanitizeUser(user) : null;
  }

  /**
   * Get all users (admin use).
   */
  getAllUsers(page = 1, limit = 20) {
    const all = [...userStore.values()].map(sanitizeUser);
    const start = (page - 1) * limit;
    return {
      users: all.slice(start, start + limit),
      total: all.length,
      page,
      pages: Math.ceil(all.length / limit),
    };
  }

  // --- Internal helpers ---

  async _generateTokenPair(user) {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      type: 'access',
    };
    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
    };

    const accessToken = this.generateJWT(accessPayload, config.security.jwtExpiresIn);
    const refreshToken = this.generateJWT(refreshPayload, config.security.refreshExpiresIn);

    return { accessToken, refreshToken };
  }
}

export default new AuthService();
