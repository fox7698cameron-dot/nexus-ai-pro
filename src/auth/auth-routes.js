// src/auth/auth-routes.js
// Created: 2026-07-30
// Full authentication system: registration, login, 2FA/MFA, biometrics, role-based access

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';

const router = Router();

// In-memory user store (replace with DB in production)
const users = new Map();
const sessions = new Map();
const pendingMfa = new Map();
const biometricCreds = new Map();

// Password policy: 13+ chars, mixed case, digit, special char
const PASSWORD_POLICY = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Valid roles with hierarchy
const ROLES = Object.freeze({
  superadmin: 5,
  admin: 4,
  dev: 3,
  moderator: 2,
  user: 1
});

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

// Validate username: supports unicode, emoji, letters, digits, underscore, dot, hyphen
function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const len = [...username].length; // Unicode-aware length
  if (len < 3 || len > 50) return false;
  // Allow unicode letters (including emoji), digits, _, ., -
  return /^[\p{L}\p{N}\p{Emoji_Presentation}\p{Emoji}\s._-]+$/u.test(username);
}

function validatePassword(password) {
  const errors = [];
  if (!password || typeof password !== 'string') return ['Password is required'];
  if (password.length < PASSWORD_POLICY.minLength)
    errors.push(`Minimum ${PASSWORD_POLICY.minLength} characters required`);
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password))
    errors.push('Must contain at least one uppercase letter');
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password))
    errors.push('Must contain at least one lowercase letter');
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password))
    errors.push('Must contain at least one digit');
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password))
    errors.push('Must contain at least one special character');
  return errors;
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(payload, expiresIn = '24h') {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' });
}

function signRefreshToken(payload) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT secret not configured');
  return jwt.sign(payload, secret, { expiresIn: '30d', algorithm: 'HS256' });
}

function computePasswordStrength(password) {
  let score = 0;
  if (password.length >= 13) score += 20;
  if (password.length >= 20) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score += 15;
  if (/\p{Emoji}/u.test(password)) score += 5;
  const unique = new Set(password).size;
  if (unique > 10) score += 10;
  if (unique > 20) score += 10;
  return Math.min(score, 100);
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, displayName, language, region, role } = req.body;

    // Validate inputs
    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username. 3-50 chars, supports unicode & emoji.' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    const pwErrors = validatePassword(password);
    if (pwErrors.length) {
      return res.status(400).json({ error: 'Weak password', details: pwErrors });
    }

    // Check duplicates
    for (const [, u] of users) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return res.status(409).json({ error: 'Username already taken.' });
      }
    }

    const userId = uuidv4();
    const hash = await bcrypt.hash(password, 14);
    const assignedRole = ['user'].includes(role) ? role : 'user';

    const user = {
      id: userId,
      username: username.trim(),
      displayName: (displayName || username).trim(),
      email: email.toLowerCase(),
      passwordHash: hash,
      role: assignedRole,
      language: language || 'en',
      region: region || 'US',
      mfaEnabled: false,
      mfaSecret: null,
      biometricEnabled: false,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      active: true,
      emailVerified: false,
      loginAttempts: 0,
      lockedUntil: null,
      subscriptionTier: 'free',
      preferences: {}
    };

    users.set(userId, user);

    const token = signToken({ sub: userId, role: user.role, username: user.username });
    const refreshToken = signRefreshToken({ sub: userId });

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        language: user.language,
        region: user.region,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, mfaCode, biometricToken } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const user = [...users.values()].find(u => u.email === email.toLowerCase());
    if (!user) {
      await bcrypt.hash('dummy-timing-prevention', 14);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Check lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
    }

    // Biometric path
    if (biometricToken) {
      const stored = biometricCreds.get(user.id);
      if (!stored || stored.token !== biometricToken) {
        return res.status(401).json({ error: 'Biometric authentication failed.' });
      }
    } else {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }
        users.set(user.id, user);
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
    }

    // MFA check
    if (user.mfaEnabled) {
      if (!mfaCode) {
        const pendingToken = crypto.randomBytes(32).toString('hex');
        pendingMfa.set(pendingToken, { userId: user.id, expiresAt: Date.now() + 5 * 60 * 1000 });
        return res.status(200).json({ requiresMfa: true, pendingToken });
      }
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaCode,
        window: 1
      });
      if (!verified) {
        return res.status(401).json({ error: 'Invalid MFA code.' });
      }
    }

    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();
    users.set(user.id, user);

    const token = signToken({ sub: user.id, role: user.role, username: user.username });
    const refreshToken = signRefreshToken({ sub: user.id });

    return res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        language: user.language,
        region: user.region,
        subscriptionTier: user.subscriptionTier,
        mfaEnabled: user.mfaEnabled
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/mfa/verify (complete login after pending MFA)
router.post('/mfa/verify', authLimiter, (req, res) => {
  const { pendingToken, mfaCode } = req.body;
  const pending = pendingMfa.get(pendingToken);
  if (!pending || pending.expiresAt < Date.now()) {
    pendingMfa.delete(pendingToken);
    return res.status(401).json({ error: 'MFA session expired. Please log in again.' });
  }
  const user = users.get(pending.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: mfaCode,
    window: 1
  });
  if (!verified) return res.status(401).json({ error: 'Invalid MFA code.' });

  pendingMfa.delete(pendingToken);
  user.lastLogin = new Date().toISOString();
  users.set(user.id, user);

  const token = signToken({ sub: user.id, role: user.role, username: user.username });
  const refreshToken = signRefreshToken({ sub: user.id });
  return res.json({ token, refreshToken });
});

// POST /api/auth/mfa/setup (enable TOTP MFA)
router.post('/mfa/setup', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const secret = speakeasy.generateSecret({ name: `Nexus AI Pro (${user.email})`, length: 20 });
  user.mfaSecret = secret.base32;
  users.set(user.id, user);

  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
  return res.json({ secret: secret.base32, qrDataUrl, otpauthUrl: secret.otpauth_url });
});

// POST /api/auth/mfa/enable (confirm and enable after scanning QR)
router.post('/mfa/enable', (req, res) => {
  const { userId, code } = req.body;
  const user = users.get(userId);
  if (!user || !user.mfaSecret) return res.status(400).json({ error: 'Setup MFA first.' });

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: code,
    window: 1
  });
  if (!verified) return res.status(401).json({ error: 'Invalid verification code.' });

  user.mfaEnabled = true;
  users.set(user.id, user);
  return res.json({ message: 'MFA enabled successfully.' });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', async (req, res) => {
  const { userId, password } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password.' });

  user.mfaEnabled = false;
  user.mfaSecret = null;
  users.set(user.id, user);
  return res.json({ message: 'MFA disabled.' });
});

// POST /api/auth/biometric/register (register biometric credential)
router.post('/biometric/register', (req, res) => {
  const { userId, credentialId, publicKey, deviceInfo } = req.body;
  if (!userId || !credentialId || !publicKey) {
    return res.status(400).json({ error: 'userId, credentialId, and publicKey required.' });
  }
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const token = crypto.randomBytes(32).toString('hex');
  biometricCreds.set(userId, {
    credentialId,
    publicKey,
    token,
    deviceInfo: deviceInfo || {},
    registeredAt: new Date().toISOString()
  });
  user.biometricEnabled = true;
  users.set(user.id, user);

  return res.json({ message: 'Biometric credential registered.', token });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(refreshToken, secret);
    const user = users.get(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'Invalid session.' });

    const token = signToken({ sub: user.id, role: user.role, username: user.username });
    return res.json({ token });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password incorrect.' });

  const errors = validatePassword(newPassword);
  if (errors.length) return res.status(400).json({ error: 'Weak password', details: errors });

  user.passwordHash = await bcrypt.hash(newPassword, 14);
  users.set(user.id, user);
  return res.json({ message: 'Password changed successfully.' });
});

// GET /api/auth/password-strength
router.post('/password-strength', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required.' });
  const score = computePasswordStrength(password);
  const errors = validatePassword(password);
  const level = score >= 80 ? 'strong' : score >= 50 ? 'medium' : 'weak';
  return res.json({ score, level, valid: errors.length === 0, errors });
});

// GET /api/auth/profile/:userId
router.get('/profile/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { passwordHash, mfaSecret, ...safe } = user;
  return res.json(safe);
});

// PUT /api/auth/profile/:userId
router.put('/profile/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const allowed = ['displayName', 'language', 'region', 'preferences'];
  allowed.forEach(k => {
    if (req.body[k] !== undefined) user[k] = req.body[k];
  });

  if (req.body.username) {
    if (!validateUsername(req.body.username)) {
      return res.status(400).json({ error: 'Invalid username.' });
    }
    user.username = req.body.username.trim();
  }

  users.set(user.id, user);
  const { passwordHash, mfaSecret, ...safe } = user;
  return res.json(safe);
});

// Admin: GET /api/auth/users
router.get('/users', (req, res) => {
  const list = [...users.values()].map(({ passwordHash, mfaSecret, ...safe }) => safe);
  return res.json({ users: list, total: list.length });
});

// Admin: PUT /api/auth/users/:userId/role
router.put('/users/:userId/role', (req, res) => {
  const { role } = req.body;
  if (!ROLES[role]) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${Object.keys(ROLES).join(', ')}` });
  }
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.role = role;
  users.set(user.id, user);
  return res.json({ message: `Role updated to ${role}`, userId: user.id });
});

// Admin: PUT /api/auth/users/:userId/status
router.put('/users/:userId/status', (req, res) => {
  const { active } = req.body;
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.active = Boolean(active);
  users.set(user.id, user);
  return res.json({ message: `User ${active ? 'activated' : 'deactivated'}`, userId: user.id });
});

export default router;
export { users, ROLES };
