// src/services/auth-service.js
// Date: 2026-07-08
// Authentication service: registration, JWT, 2FA, biometrics, roles, MFA

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// User roles with access levels
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user'
});

const ROLE_PERMISSIONS = {
  admin: ['read', 'write', 'delete', 'manage_users', 'view_security', 'manage_billing', 'manage_integrations', 'view_analytics', 'manage_roles'],
  dev: ['read', 'write', 'delete', 'view_security', 'view_analytics', 'manage_integrations'],
  moderator: ['read', 'write', 'manage_users', 'view_analytics'],
  user: ['read', 'write']
};

// Password policy: 13+ chars, upper, lower, digit, special, no spaces allowed
const PASSWORD_POLICY = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Username policy: allow unicode, emoji, special characters
const USERNAME_POLICY = {
  minLength: 2,
  maxLength: 50
};

function validatePassword(password) {
  const errors = [];
  if (!password || password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  return errors;
}

function validateUsername(username) {
  if (!username) return ['Username is required'];
  // Strip null bytes
  const clean = username.replace(/\0/g, '');
  if (clean.length < USERNAME_POLICY.minLength) {
    return [`Username must be at least ${USERNAME_POLICY.minLength} characters`];
  }
  if ([...clean].length > USERNAME_POLICY.maxLength) {
    return [`Username must be at most ${USERNAME_POLICY.maxLength} characters`];
  }
  return [];
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return ['Email is required'];
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return ['Invalid email address'];
  return [];
}

export class AuthService {
  constructor(dataStore, redisClient) {
    this.store = dataStore; // In-memory or database
    this.redis = redisClient;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtExpiry = '15m';
    this.refreshExpiry = '7d';
    this.bcryptRounds = 14;

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment');
    }
  }

  async register(data) {
    const { username, email, password, role = ROLES.USER, language = 'en', region = 'US' } = data;

    const usernameErrors = validateUsername(username);
    const emailErrors = validateEmail(email);
    const passwordErrors = validatePassword(password);

    if (usernameErrors.length || emailErrors.length || passwordErrors.length) {
      return { success: false, errors: [...usernameErrors, ...emailErrors, ...passwordErrors] };
    }

    const existingByEmail = this.store.findUserByEmail(email);
    if (existingByEmail) {
      return { success: false, errors: ['Email already registered'] };
    }

    const existingByUsername = this.store.findUserByUsername(username);
    if (existingByUsername) {
      return { success: false, errors: ['Username already taken'] };
    }

    // Only admins can create admin/dev/moderator accounts via this path
    const allowedRoles = [ROLES.USER];
    const assignedRole = allowedRoles.includes(role) ? role : ROLES.USER;

    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
    const userId = uuidv4();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = {
      id: userId,
      username: username.replace(/\0/g, ''), // sanitize null bytes
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
      permissions: ROLE_PERMISSIONS[assignedRole],
      language,
      region,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      isVerified: false,
      verificationToken,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      biometricCredentials: [],
      mfaMethods: [],
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      passwordChangedAt: Date.now()
    };

    this.store.saveUser(user);
    this.store.auditLog('USER_REGISTERED', { userId, email: user.email, role: assignedRole });

    const { passwordHash: _, verificationToken: __, twoFactorSecret: ___, ...safeUser } = user;
    return { success: true, user: safeUser, verificationToken };
  }

  async login(email, password, ip, userAgent) {
    const user = this.store.findUserByEmail(email?.toLowerCase()?.trim());
    if (!user) {
      // Constant-time comparison to prevent timing attacks
      await bcrypt.compare(password, '$2b$14$invalid.hash.for.timing.protection');
      return { success: false, error: 'Invalid credentials' };
    }

    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      const remaining = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return { success: false, error: `Account locked. Try again in ${remaining} minutes` };
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 10) {
        user.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 minute lockout
      }
      this.store.saveUser(user);
      this.store.auditLog('LOGIN_FAILED', { email, ip });
      return { success: false, error: 'Invalid credentials' };
    }

    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = Date.now();
    user.lastLoginIp = ip;
    this.store.saveUser(user);

    if (user.twoFactorEnabled) {
      const pendingToken = this.generatePendingToken(user.id);
      return { success: true, requiresMfa: true, pendingToken, mfaMethods: user.mfaMethods };
    }

    const tokens = this.generateTokenPair(user);
    this.store.auditLog('LOGIN_SUCCESS', { userId: user.id, ip, userAgent });

    const { passwordHash: _, twoFactorSecret: __, verificationToken: ___, ...safeUser } = user;
    return { success: true, tokens, user: safeUser };
  }

  async verifyTwoFactor(pendingToken, totpCode, userId) {
    const decoded = this.verifyPendingToken(pendingToken);
    if (!decoded || decoded.userId !== userId) {
      return { success: false, error: 'Invalid or expired session' };
    }

    const user = this.store.findUserById(userId);
    if (!user || !user.twoFactorSecret) {
      return { success: false, error: 'User not found or 2FA not configured' };
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 2
    });

    if (!verified) {
      return { success: false, error: 'Invalid 2FA code' };
    }

    const tokens = this.generateTokenPair(user);
    const { passwordHash: _, twoFactorSecret: __, ...safeUser } = user;
    return { success: true, tokens, user: safeUser };
  }

  async setupTwoFactor(userId) {
    const user = this.store.findUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    const secret = speakeasy.generateSecret({
      name: `Nexus AI Pro (${user.email})`,
      length: 32
    });

    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false; // Not yet confirmed
    this.store.saveUser(user);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    return { success: true, secret: secret.base32, qrCode: qrCodeUrl, otpauthUrl: secret.otpauth_url };
  }

  async confirmTwoFactor(userId, totpCode) {
    const user = this.store.findUserById(userId);
    if (!user || !user.twoFactorSecret) {
      return { success: false, error: '2FA setup not started' };
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 2
    });

    if (!verified) return { success: false, error: 'Invalid verification code' };

    const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(5).toString('hex'));
    user.twoFactorEnabled = true;
    if (!user.mfaMethods) user.mfaMethods = [];
    if (!user.mfaMethods.includes('totp')) user.mfaMethods.push('totp');
    user.backupCodes = backupCodes.map(c => bcrypt.hashSync(c, 12));
    this.store.saveUser(user);
    this.store.auditLog('2FA_ENABLED', { userId });

    return { success: true, backupCodes };
  }

  async registerBiometric(userId, credentialType, credentialData) {
    const validTypes = ['fingerprint', 'face_id', 'touch_id', 'retinal'];
    if (!validTypes.includes(credentialType)) {
      return { success: false, error: 'Invalid biometric type' };
    }

    const user = this.store.findUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    if (!user.biometricCredentials) user.biometricCredentials = [];

    const credentialId = uuidv4();
    const credentialHash = crypto.createHash('sha512').update(JSON.stringify(credentialData)).digest('hex');

    user.biometricCredentials.push({
      id: credentialId,
      type: credentialType,
      credentialHash,
      createdAt: Date.now(),
      platform: credentialData.platform || 'unknown'
    });

    if (!user.mfaMethods) user.mfaMethods = [];
    if (!user.mfaMethods.includes('biometric')) user.mfaMethods.push('biometric');
    this.store.saveUser(user);
    this.store.auditLog('BIOMETRIC_REGISTERED', { userId, credentialId, type: credentialType });

    return { success: true, credentialId };
  }

  async verifyBiometric(userId, credentialType, credentialData) {
    const user = this.store.findUserById(userId);
    if (!user || !user.biometricCredentials?.length) {
      return { success: false, error: 'No biometric credentials found' };
    }

    const credentialHash = crypto.createHash('sha512').update(JSON.stringify(credentialData)).digest('hex');
    const match = user.biometricCredentials.find(
      c => c.type === credentialType && crypto.timingSafeEqual(Buffer.from(c.credentialHash, 'hex'), Buffer.from(credentialHash, 'hex'))
    );

    if (!match) return { success: false, error: 'Biometric verification failed' };

    const tokens = this.generateTokenPair(user);
    this.store.auditLog('BIOMETRIC_LOGIN', { userId, type: credentialType });
    const { passwordHash: _, twoFactorSecret: __, ...safeUser } = user;
    return { success: true, tokens, user: safeUser };
  }

  generateTokenPair(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };
    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
    const refreshToken = jwt.sign({ sub: user.id }, this.jwtRefreshSecret, { expiresIn: this.refreshExpiry });
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  generatePendingToken(userId) {
    return jwt.sign({ userId, type: 'mfa_pending' }, this.jwtSecret, { expiresIn: '5m' });
  }

  verifyPendingToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (decoded.type !== 'mfa_pending') return null;
      return decoded;
    } catch {
      return null;
    }
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      return null;
    }
  }

  async refreshTokens(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
      const user = this.store.findUserById(decoded.sub);
      if (!user || !user.isActive) return { success: false, error: 'User not found or inactive' };
      const tokens = this.generateTokenPair(user);
      return { success: true, tokens };
    } catch {
      return { success: false, error: 'Invalid refresh token' };
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = this.store.findUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    const currentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentValid) return { success: false, error: 'Current password is incorrect' };

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length) return { success: false, errors: passwordErrors };

    user.passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    user.passwordChangedAt = Date.now();
    user.updatedAt = Date.now();
    this.store.saveUser(user);
    this.store.auditLog('PASSWORD_CHANGED', { userId });
    return { success: true };
  }

  async assignRole(adminUserId, targetUserId, newRole) {
    const admin = this.store.findUserById(adminUserId);
    if (!admin || admin.role !== ROLES.ADMIN) {
      return { success: false, error: 'Unauthorized: admin role required' };
    }

    if (!Object.values(ROLES).includes(newRole)) {
      return { success: false, error: 'Invalid role' };
    }

    const target = this.store.findUserById(targetUserId);
    if (!target) return { success: false, error: 'Target user not found' };

    target.role = newRole;
    target.permissions = ROLE_PERMISSIONS[newRole];
    target.updatedAt = Date.now();
    this.store.saveUser(target);
    this.store.auditLog('ROLE_ASSIGNED', { adminUserId, targetUserId, newRole });
    return { success: true };
  }

  getPasswordStrength(password) {
    if (!password) return { score: 0, label: 'No password', color: 'gray' };
    let score = 0;
    if (password.length >= 13) score += 20;
    if (password.length >= 20) score += 10;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password)) score += 15;
    if (password.length >= 30) score += 10;

    if (score < 30) return { score, label: 'Weak', color: 'red' };
    if (score < 60) return { score, label: 'Fair', color: 'orange' };
    if (score < 80) return { score, label: 'Strong', color: 'yellow' };
    return { score, label: 'Very Strong', color: 'green' };
  }
}

// In-memory user store (production should use a real DB)
export class UserStore {
  constructor() {
    this.users = new Map();
    this.logs = [];
  }

  saveUser(user) {
    this.users.set(user.id, { ...user });
  }

  findUserById(id) {
    return this.users.has(id) ? { ...this.users.get(id) } : null;
  }

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) return { ...user };
    }
    return null;
  }

  findUserByUsername(username) {
    const clean = username?.replace(/\0/g, '').toLowerCase();
    for (const user of this.users.values()) {
      if (user.username?.toLowerCase() === clean) return { ...user };
    }
    return null;
  }

  getAllUsers() {
    return Array.from(this.users.values()).map(u => {
      const { passwordHash: _, twoFactorSecret: __, ...safe } = u;
      return safe;
    });
  }

  auditLog(event, details) {
    this.logs.push({ id: uuidv4(), timestamp: Date.now(), event, details });
    if (this.logs.length > 5000) this.logs = this.logs.slice(-5000);
  }

  getAuditLogs(limit = 100) {
    return this.logs.slice(-limit);
  }
}

export const userStore = new UserStore();
