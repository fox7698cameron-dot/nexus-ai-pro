// src/routes/auth.js
// Created: 2026-10-18
// Auth routes: registration, login, MFA, role management

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { validateAuth, requireRole, verifyMFA } from '../middleware/auth.js';

const router = express.Router();

// In-memory user store (replace with DB in production)
const users = new Map();
const mfaTokens = new Map();
const refreshTokens = new Set();
const failedAttempts = new Map();

const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'dev', MODERATOR: 'moderator', USER: 'user' });
const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 13;
// Username: 2–30 chars, allows Unicode letters, digits, underscores, hyphens, emoji
const USERNAME_REGEX = /^[\p{L}\p{N}_\-\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}]{2,30}$/u;

function issueTokens(userId, role) {
  const accessToken = jwt.sign(
    { sub: userId, role, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: '15m', algorithm: 'HS256' }
  );
  const refreshToken = crypto.randomBytes(48).toString('hex');
  refreshTokens.add(refreshToken);
  return { accessToken, refreshToken };
}

function isAccountLocked(email) {
  const record = failedAttempts.get(email);
  if (!record) return false;
  if (record.count >= LOCK_THRESHOLD && Date.now() - record.lastFail < LOCK_DURATION_MS) return true;
  if (Date.now() - record.lastFail >= LOCK_DURATION_MS) failedAttempts.delete(email);
  return false;
}

function recordFailedAttempt(email) {
  const record = failedAttempts.get(email) || { count: 0, lastFail: 0 };
  record.count += 1;
  record.lastFail = Date.now();
  failedAttempts.set(email, record);
}

function clearFailedAttempts(email) {
  failedAttempts.delete(email);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, role = ROLES.USER, inviteCode } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'email, password, and username are required' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
    }

    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;
    if (!specialCharRegex.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and digit' });
    }

    const emailLower = email.toLowerCase();
    if ([...users.values()].some(u => u.email === emailLower)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Elevated roles require invite code
    const elevatedRoles = [ROLES.ADMIN, ROLES.DEV, ROLES.MODERATOR];
    if (elevatedRoles.includes(role)) {
      const validCode = process.env[`INVITE_${role.toUpperCase()}`];
      if (!validCode || inviteCode !== validCode) {
        return res.status(403).json({ error: 'Invalid invite code for elevated role' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 14);
    const id = uuidv4();
    const mfaSecret = crypto.randomBytes(20).toString('hex');
    const now = Date.now();

    users.set(id, {
      id,
      email: emailLower,
      username,
      passwordHash,
      role: elevatedRoles.includes(role) ? role : ROLES.USER,
      mfaSecret,
      mfaEnabled: false,
      biometricEnabled: false,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
      active: true,
      locale: req.body.locale || 'en',
    });

    const { accessToken, refreshToken } = issueTokens(id, users.get(id).role);

    return res.status(201).json({
      message: 'Account created',
      accessToken,
      refreshToken,
      user: { id, email: emailLower, username, role: users.get(id).role },
    });
  } catch (err) {
    console.error('[auth/register]', err.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, mfaCode } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const emailLower = email.toLowerCase();
    if (isAccountLocked(emailLower)) {
      return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
    }

    const user = [...users.values()].find(u => u.email === emailLower);
    if (!user || !user.active) {
      recordFailedAttempt(emailLower);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      recordFailedAttempt(emailLower);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.mfaEnabled) {
      if (!mfaCode) {
        const pendingToken = crypto.randomBytes(16).toString('hex');
        mfaTokens.set(pendingToken, { userId: user.id, expires: Date.now() + 5 * 60 * 1000 });
        return res.status(202).json({ mfaRequired: true, pendingToken });
      }
      if (!verifyMFA(user.mfaSecret, mfaCode)) {
        recordFailedAttempt(emailLower);
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }

    clearFailedAttempts(emailLower);
    user.lastLogin = Date.now();
    user.updatedAt = Date.now();

    const { accessToken, refreshToken } = issueTokens(user.id, user.role);
    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  try {
    // Find user by token — in production store token→userId in DB
    // For now: decode without verify to get sub (refresh tokens are opaque secrets)
    const userId = req.body.userId;
    const user = users.get(userId);
    if (!user || !user.active) return res.status(401).json({ error: 'User not found' });

    refreshTokens.delete(refreshToken);
    const tokens = issueTokens(user.id, user.role);
    return res.json(tokens);
  } catch {
    return res.status(401).json({ error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', validateAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  return res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', validateAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, mfaSecret, ...safeUser } = user;
  return res.json(safeUser);
});

// PATCH /api/auth/me
router.patch('/me', validateAuth, async (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { username, locale, biometricEnabled } = req.body;

  if (username !== undefined) {
    if (!USERNAME_REGEX.test(username)) return res.status(400).json({ error: 'Invalid username' });
    user.username = username;
  }
  if (locale !== undefined) user.locale = locale;
  if (biometricEnabled !== undefined) user.biometricEnabled = Boolean(biometricEnabled);

  user.updatedAt = Date.now();
  const { passwordHash, mfaSecret, ...safeUser } = user;
  return res.json(safeUser);
});

// POST /api/auth/mfa/enable
router.post('/mfa/enable', validateAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.mfaEnabled = true;
  user.updatedAt = Date.now();
  return res.json({ message: 'MFA enabled', mfaSecret: user.mfaSecret });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', validateAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.mfaEnabled = false;
  user.updatedAt = Date.now();
  return res.json({ message: 'MFA disabled' });
});

// GET /api/auth/users (admin only)
router.get('/users', validateAuth, requireRole([ROLES.ADMIN]), (req, res) => {
  const list = [...users.values()].map(({ passwordHash, mfaSecret, ...u }) => u);
  return res.json(list);
});

// PATCH /api/auth/users/:id/role (admin only)
router.patch('/users/:id/role', validateAuth, requireRole([ROLES.ADMIN]), (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role' });
  user.role = role;
  user.updatedAt = Date.now();
  return res.json({ id: user.id, role: user.role });
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', validateAuth, requireRole([ROLES.ADMIN]), (req, res) => {
  if (!users.has(req.params.id)) return res.status(404).json({ error: 'User not found' });
  users.get(req.params.id).active = false;
  return res.json({ message: 'User deactivated' });
});

export { router as authRouter, users as userStore, ROLES };
