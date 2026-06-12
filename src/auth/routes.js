// src/auth/routes.js
// 2026-06-12 | Auth routes: registration, login, 2FA, MFA, biometrics, role management
import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { z } from 'zod';
import { authMiddleware, requireRole } from './middleware.js';

export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user'
});

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{13,}$/;
const USERNAME_REGEX = /^[\p{L}\p{N}\p{Emoji}_.\-]{2,50}$/u;

const RegisterSchema = z.object({
  username: z.string().regex(USERNAME_REGEX, 'Invalid username (2-50 chars, supports unicode/emoji)'),
  email: z.string().email('Invalid email'),
  password: z.string().regex(PASSWORD_REGEX, 'Password must be 13+ chars with uppercase, lowercase, number, and special character'),
  language: z.string().default('en'),
  region: z.string().optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpToken: z.string().optional(),
  biometricToken: z.string().optional()
});

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 310000, 64, 'sha512').toString('hex');
}

function generateJWT(userId, role, sessionId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(
    { sub: userId, role, sid: sessionId, iat: Math.floor(Date.now() / 1000) },
    secret,
    { expiresIn: '24h', algorithm: 'HS256' }
  );
}

export function createAuthRouter(dataStore, auditLog) {
  const router = Router();

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { username, email, password, language, region } = parsed.data;

      const existing = dataStore.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const salt = crypto.randomBytes(32).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const userId = uuidv4();

      const user = {
        id: userId,
        username,
        email,
        passwordHash,
        salt,
        role: USER_ROLES.USER,
        language,
        region: region || null,
        mfaEnabled: false,
        totpSecret: null,
        biometricEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLogin: null,
        failedAttempts: 0,
        lockedUntil: null
      };

      dataStore.saveUser(user);
      auditLog('USER_REGISTERED', { userId, email, role: user.role });

      const sessionId = uuidv4();
      const token = generateJWT(userId, user.role, sessionId);

      res.status(201).json({
        token,
        user: { id: userId, username, email, role: user.role, language, region }
      });
    } catch (err) {
      auditLog('REGISTER_ERROR', { error: err.message });
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { email, password, totpToken, biometricToken } = parsed.data;

      const user = dataStore.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.lockedUntil && Date.now() < user.lockedUntil) {
        return res.status(423).json({ error: 'Account locked. Try again later.' });
      }

      const hash = hashPassword(password, user.salt);
      if (hash !== user.passwordHash) {
        user.failedAttempts = (user.failedAttempts || 0) + 1;
        if (user.failedAttempts >= 5) {
          user.lockedUntil = Date.now() + 15 * 60 * 1000;
          user.failedAttempts = 0;
        }
        dataStore.saveUser(user);
        auditLog('LOGIN_FAILED', { email, ip: req.ip });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // TOTP check
      if (user.mfaEnabled && user.totpSecret) {
        if (!totpToken) {
          return res.status(206).json({ mfaRequired: true, method: 'totp' });
        }
        const valid = speakeasy.totp.verify({
          secret: user.totpSecret,
          encoding: 'base32',
          token: totpToken,
          window: 1
        });
        if (!valid) {
          auditLog('MFA_FAILED', { userId: user.id });
          return res.status(401).json({ error: 'Invalid MFA token' });
        }
      }

      user.failedAttempts = 0;
      user.lockedUntil = null;
      user.lastLogin = Date.now();
      dataStore.saveUser(user);

      const sessionId = uuidv4();
      const token = generateJWT(user.id, user.role, sessionId);

      auditLog('USER_LOGIN', { userId: user.id, role: user.role });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          language: user.language,
          region: user.region,
          mfaEnabled: user.mfaEnabled,
          biometricEnabled: user.biometricEnabled
        }
      });
    } catch (err) {
      auditLog('LOGIN_ERROR', { error: err.message });
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // POST /api/auth/mfa/setup - Enable TOTP 2FA
  router.post('/mfa/setup', authMiddleware, async (req, res) => {
    try {
      const user = dataStore.getUserById(req.user.sub);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const secret = speakeasy.generateSecret({
        name: `NexusAI Pro (${user.email})`,
        length: 32
      });

      user.pendingTotpSecret = secret.base32;
      dataStore.saveUser(user);

      const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
      res.json({ qrCode: qrUrl, secret: secret.base32 });
    } catch (err) {
      res.status(500).json({ error: 'MFA setup failed' });
    }
  });

  // POST /api/auth/mfa/verify - Confirm TOTP setup
  router.post('/mfa/verify', authMiddleware, (req, res) => {
    const { token } = req.body;
    const user = dataStore.getUserById(req.user.sub);
    if (!user || !user.pendingTotpSecret) {
      return res.status(400).json({ error: 'No pending MFA setup' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.pendingTotpSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!valid) return res.status(400).json({ error: 'Invalid token' });

    user.totpSecret = user.pendingTotpSecret;
    user.pendingTotpSecret = null;
    user.mfaEnabled = true;
    dataStore.saveUser(user);

    auditLog('MFA_ENABLED', { userId: user.id });
    res.json({ success: true });
  });

  // DELETE /api/auth/mfa - Disable MFA
  router.delete('/mfa', authMiddleware, (req, res) => {
    const { password, token } = req.body;
    const user = dataStore.getUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return res.status(401).json({ error: 'Invalid password' });

    user.mfaEnabled = false;
    user.totpSecret = null;
    dataStore.saveUser(user);
    auditLog('MFA_DISABLED', { userId: user.id });
    res.json({ success: true });
  });

  // POST /api/auth/biometric/register - Register biometric credential
  router.post('/biometric/register', authMiddleware, (req, res) => {
    const { biometricToken, deviceId, method } = req.body;
    if (!biometricToken || !deviceId) {
      return res.status(400).json({ error: 'biometricToken and deviceId required' });
    }

    const ALLOWED_METHODS = ['fingerprint', 'face_id', 'touch_id', 'retinal'];
    if (method && !ALLOWED_METHODS.includes(method)) {
      return res.status(400).json({ error: 'Invalid biometric method' });
    }

    const user = dataStore.getUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Store salted hash of the biometric token, never plaintext
    const tokenHash = crypto.createHash('sha256')
      .update(biometricToken + process.env.ENCRYPTION_SALT)
      .digest('hex');

    user.biometricEnabled = true;
    user.biometricDevices = user.biometricDevices || [];
    user.biometricDevices.push({
      deviceId,
      tokenHash,
      method: method || 'fingerprint',
      registeredAt: Date.now()
    });
    dataStore.saveUser(user);

    auditLog('BIOMETRIC_REGISTERED', { userId: user.id, method });
    res.json({ success: true });
  });

  // GET /api/auth/me
  router.get('/me', authMiddleware, (req, res) => {
    const user = dataStore.getUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      language: user.language,
      region: user.region,
      mfaEnabled: user.mfaEnabled,
      biometricEnabled: user.biometricEnabled,
      createdAt: user.createdAt
    });
  });

  // PUT /api/auth/profile
  router.put('/profile', authMiddleware, (req, res) => {
    const { username, language, region } = req.body;
    const user = dataStore.getUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (username !== undefined) {
      if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Invalid username' });
      }
      user.username = username;
    }
    if (language) user.language = language;
    if (region) user.region = region;
    user.updatedAt = Date.now();
    dataStore.saveUser(user);
    res.json({ success: true });
  });

  // PUT /api/auth/password
  router.put('/password', authMiddleware, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = dataStore.getUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentHash = hashPassword(currentPassword, user.salt);
    if (currentHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ error: 'New password does not meet requirements' });
    }

    const newSalt = crypto.randomBytes(32).toString('hex');
    user.passwordHash = hashPassword(newPassword, newSalt);
    user.salt = newSalt;
    user.updatedAt = Date.now();
    dataStore.saveUser(user);

    auditLog('PASSWORD_CHANGED', { userId: user.id });
    res.json({ success: true });
  });

  // Admin: list users
  router.get('/users', authMiddleware, requireRole([USER_ROLES.ADMIN]), (req, res) => {
    const users = dataStore.listUsers().map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      language: u.language,
      mfaEnabled: u.mfaEnabled,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt
    }));
    res.json({ users });
  });

  // Admin: update user role
  router.put('/users/:id/role', authMiddleware, requireRole([USER_ROLES.ADMIN]), (req, res) => {
    const { role } = req.body;
    const validRoles = Object.values(USER_ROLES);
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const user = dataStore.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.role = role;
    dataStore.saveUser(user);
    auditLog('ROLE_CHANGED', { adminId: req.user.sub, targetId: user.id, newRole: role });
    res.json({ success: true });
  });

  return router;
}

export class InMemoryUserStore {
  constructor() {
    this._users = new Map();
    this._emailIndex = new Map();
  }

  saveUser(user) {
    this._users.set(user.id, { ...user });
    this._emailIndex.set(user.email.toLowerCase(), user.id);
  }

  getUserById(id) {
    return this._users.get(id) ? { ...this._users.get(id) } : null;
  }

  findUserByEmail(email) {
    const id = this._emailIndex.get(email.toLowerCase());
    return id ? this.getUserById(id) : null;
  }

  listUsers() {
    return Array.from(this._users.values());
  }
}
