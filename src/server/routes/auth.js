/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Authentication Routes
 * Registration, login, MFA, biometrics, password management, token refresh
 * Roles: admin | dev | moderator | user — each gets its own dashboard route
 * Date: 2026-08-09
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import {
  signAccessToken,
  signRefreshToken,
  requireAuth,
  generateMFASecret,
  verifyTOTP,
  ROLES,
} from '../middleware/auth.js';
import { logAuditEvent, sanitizeString } from '../middleware/security.js';
import { redisSet, redisGet, redisDel } from '../db/redis.js';

const router = Router();

// In-memory user store (swap for DB in production — schema in init.sql)
const users = new Map();
const refreshTokens = new Set();

const PASSWORD_MIN_LEN = 13;
const BCRYPT_ROUNDS = 12;

// ─── Validation rules ────────────────────────────────────────────────────────

const registerValidators = [
  body('username')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be 2–50 characters')
    // Allow Unicode letters, digits, emoji, hyphens, underscores, dots
    .matches(/^[\p{L}\p{N}\p{Emoji}_.\-]{2,50}$/u)
    .withMessage('Username contains invalid characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: PASSWORD_MIN_LEN })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LEN} characters`)
    .matches(/[A-Z]/).withMessage('Password needs an uppercase letter')
    .matches(/[a-z]/).withMessage('Password needs a lowercase letter')
    .matches(/[0-9]/).withMessage('Password needs a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password needs a special character'),
  body('displayName').optional().trim().isLength({ max: 100 }),
  body('language').optional().isLocale(),
];

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

function buildUserPublic(user) {
  const { passwordHash, mfaSecret, backupCodes, ...pub } = user;
  return pub;
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

router.post('/register', registerValidators, async (req, res) => {
  const vErr = validationErrors(req, res);
  if (vErr) return vErr;

  const { username, email, password, displayName, language = 'en', role } = req.body;

  // Prevent self-assignment of admin/dev roles
  const assignedRole = [ROLES.ADMIN, ROLES.DEV].includes(role)
    ? ROLES.USER
    : (role ?? ROLES.USER);

  if (users.has(email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newUser = {
    id: userId,
    username: sanitizeString(username),
    displayName: sanitizeString(displayName || username),
    email: email.toLowerCase(),
    passwordHash,
    role: assignedRole,
    language,
    locale: req.body.locale || 'en-US',
    mfaEnabled: false,
    mfaSecret: null,
    backupCodes: [],
    biometricEnabled: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    status: 'active',
    preferences: {
      theme: 'dark',
      notifications: true,
      analytics: true,
    },
  };

  users.set(email.toLowerCase(), newUser);

  logAuditEvent('user_registered', { userId, role: assignedRole });

  const accessToken = signAccessToken({
    sub: userId,
    email: newUser.email,
    role: assignedRole,
    username: newUser.username,
    mfaRequired: false,
    mfaVerified: true,
  });
  const refreshToken = signRefreshToken(userId);
  refreshTokens.add(refreshToken);

  return res.status(201).json({
    user: buildUserPublic(newUser),
    accessToken,
    refreshToken,
    dashboardRoute: getDashboardRoute(assignedRole),
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', loginValidators, async (req, res) => {
  const vErr = validationErrors(req, res);
  if (vErr) return vErr;

  const { email, password, mfaToken } = req.body;
  const user = users.get(email.toLowerCase());

  if (!user) {
    // Constant-time comparison to prevent user enumeration
    await bcrypt.compare(password, '$2a$12$invalidhashforcomparison000000000000000000000000000');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    logAuditEvent('login_failed', { email: email.toLowerCase(), ip: req.ip });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // MFA check
  if (user.mfaEnabled) {
    if (!mfaToken) {
      return res.status(200).json({ mfaRequired: true, userId: user.id });
    }

    const valid = verifyTOTP(user.mfaSecret, mfaToken)
      || user.backupCodes.includes(String(mfaToken).toUpperCase());

    if (!valid) {
      logAuditEvent('mfa_failed', { userId: user.id, ip: req.ip });
      return res.status(401).json({ error: 'Invalid MFA token' });
    }

    // Burn backup code if used
    if (user.backupCodes.includes(String(mfaToken).toUpperCase())) {
      user.backupCodes = user.backupCodes.filter(c => c !== String(mfaToken).toUpperCase());
      logAuditEvent('backup_code_used', { userId: user.id });
    }
  }

  user.lastLoginAt = new Date().toISOString();
  logAuditEvent('login_success', { userId: user.id, role: user.role, ip: req.ip });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    username: user.username,
    mfaRequired: user.mfaEnabled,
    mfaVerified: true,
  });
  const refreshToken = signRefreshToken(user.id);
  refreshTokens.add(refreshToken);

  return res.json({
    user: buildUserPublic(user),
    accessToken,
    refreshToken,
    dashboardRoute: getDashboardRoute(user.role),
  });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, secret, {
      algorithms: ['HS256'],
      issuer: 'nexus-ai-pro',
    });

    // Find user
    const user = [...users.values()].find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newAccess = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      mfaRequired: user.mfaEnabled,
      mfaVerified: true,
    });

    return res.json({ accessToken: newAccess });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  logAuditEvent('logout', { userId: req.user.sub });
  return res.json({ success: true });
});

// ─── POST /api/auth/mfa/setup ─────────────────────────────────────────────────

router.post('/mfa/setup', requireAuth, (req, res) => {
  const user = [...users.values()].find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { secret, backupCodes } = generateMFASecret();
  user.mfaSecret = secret;
  user.backupCodes = backupCodes;
  // Don't enable yet — wait for verify

  logAuditEvent('mfa_setup_initiated', { userId: user.id });

  return res.json({
    secret,
    backupCodes,
    qrCodeUrl: `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro`,
  });
});

// ─── POST /api/auth/mfa/verify ────────────────────────────────────────────────

router.post('/mfa/verify', requireAuth, (req, res) => {
  const { token } = req.body;
  const user = [...users.values()].find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.mfaSecret) return res.status(400).json({ error: 'MFA not initialized' });

  if (!verifyTOTP(user.mfaSecret, token)) {
    return res.status(401).json({ error: 'Invalid TOTP code' });
  }

  user.mfaEnabled = true;
  logAuditEvent('mfa_enabled', { userId: user.id });
  return res.json({ success: true, backupCodes: user.backupCodes });
});

// ─── POST /api/auth/biometric/register ───────────────────────────────────────

router.post('/biometric/register', requireAuth, (req, res) => {
  // In production: verify WebAuthn attestation
  // Here we record the challenge binding (demo stub)
  const { credentialId, type } = req.body;
  const user = [...users.values()].find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.biometricEnabled = true;
  user.biometricType = type; // fingerprint | faceId | touchId | retinalScan
  user.biometricCredentialId = credentialId;

  logAuditEvent('biometric_registered', { userId: user.id, type });
  return res.json({ success: true });
});

// ─── POST /api/auth/password/change ──────────────────────────────────────────

router.post(
  '/password/change',
  requireAuth,
  [
    body('currentPassword').isLength({ min: 1 }),
    body('newPassword')
      .isLength({ min: PASSWORD_MIN_LEN })
      .matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/),
  ],
  async (req, res) => {
    const vErr = validationErrors(req, res);
    if (vErr) return vErr;

    const { currentPassword, newPassword } = req.body;
    const user = [...users.values()].find(u => u.id === req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.updatedAt = new Date().toISOString();
    logAuditEvent('password_changed', { userId: user.id });
    return res.json({ success: true });
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const user = [...users.values()].find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: buildUserPublic(user), dashboardRoute: getDashboardRoute(user.role) });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDashboardRoute(role) {
  const routes = {
    [ROLES.ADMIN]: '/dashboard/admin',
    [ROLES.DEV]: '/dashboard/dev',
    [ROLES.MODERATOR]: '/dashboard/moderator',
    [ROLES.USER]: '/dashboard/user',
  };
  return routes[role] ?? '/dashboard/user';
}

export default router;
