/**
 * src/api/auth.js
 * Authentication API Routes — Register, Login, Refresh, 2FA/MFA, Biometrics, Logout
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Features:
 *  - Role-based registration (user/dev/moderator/admin)
 *  - JWT access + refresh tokens (no secrets hard-coded)
 *  - TOTP-based 2FA (authenticator app)
 *  - Biometric challenge/verify flow (WebAuthn-compatible bridge)
 *  - 13+ char passwords with Unicode support
 *  - MFA enforcement middleware
 *  - Audit logging (minimal, timestamped)
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  requireAuth,
  requireRole,
  requireMFA,
  ROLES,
} from '../middleware/auth.js';
import {
  validatePassword,
  validateUsername,
  validateEmail,
  returnValidationErrors,
} from '../utils/validation.js';
import { generateUserId } from '../utils/crypto.js';

const router = Router();

// ─── In-Memory Stores (replace with DB/Redis in production) ──────────────────
const users         = new Map(); // userId → user record
const refreshTokens = new Map(); // hash(token) → { userId, expiresAt }
const mfaSecrets    = new Map(); // userId → encrypted TOTP secret
const auditLog      = [];        // minimal audit entries

const BCRYPT_ROUNDS    = 12;
const REFRESH_TTL_MS   = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_AUDIT_ENTRIES = 5000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function audit(event, userId, meta = {}) {
  const entry = {
    id:        uuidv4(),
    timestamp: new Date().toISOString(),
    event,
    userId:    userId || 'anonymous',
    ...meta,
  };
  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT_ENTRIES) auditLog.shift();
}

function publicUser(user) {
  const { passwordHash, totpSecret, ...pub } = user;
  return pub;
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { username, email, password, role = ROLES.USER, inviteCode } = req.body;

  // Validation
  const errors = [
    validateUsername(username).error,
    validateEmail(email).error,
    ...validatePassword(password).errors,
  ];
  if (returnValidationErrors(errors, res)) return;

  // Admin/Dev/Moderator registration requires an invite code
  const privilegedRoles = [ROLES.ADMIN, ROLES.DEV, ROLES.MODERATOR];
  if (privilegedRoles.includes(role)) {
    const validCode = process.env.INVITE_CODE;
    if (!validCode || inviteCode !== validCode) {
      return res.status(403).json({ error: 'Valid invite code required for privileged roles' });
    }
  }

  // Duplicate check
  const emailNorm = email.trim().toLowerCase();
  const existing  = [...users.values()].find(u => u.email === emailNorm);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const userId = generateUserId();
  const now    = new Date().toISOString();

  const user = {
    id:           userId,
    username:     username.trim(),
    email:        emailNorm,
    passwordHash,
    role:         Object.values(ROLES).includes(role) ? role : ROLES.USER,
    mfaEnabled:   false,
    createdAt:    now,
    updatedAt:    now,
  };

  users.set(userId, user);
  audit('USER_REGISTERED', userId, { role: user.role });

  return res.status(201).json({
    message: 'Registration successful',
    user:    publicUser(user),
  });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const emailNorm = email.trim().toLowerCase();
  const user      = [...users.values()].find(u => u.email === emailNorm);

  if (!user) {
    // Constant-time response to prevent user enumeration
    await bcrypt.compare('dummy', '$2b$12$invalidhashfortimingconstancy00000000000000000000000');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    audit('LOGIN_FAILED', user.id);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // If MFA enabled, return a partial token requiring MFA step
  if (user.mfaEnabled) {
    const preToken = signAccessToken(
      { id: user.id, role: user.role, mfaEnabled: true, mfaVerified: false },
      '5m'
    );
    audit('LOGIN_MFA_PENDING', user.id);
    return res.status(200).json({
      requireMFA: true,
      preAuthToken: preToken,
    });
  }

  const accessToken  = signAccessToken({ id: user.id, role: user.role, mfaEnabled: false, mfaVerified: true });
  const refreshToken = generateRefreshToken();
  const tokenHash    = hashToken(refreshToken);

  refreshTokens.set(tokenHash, {
    userId:    user.id,
    expiresAt: Date.now() + REFRESH_TTL_MS,
  });

  audit('LOGIN_SUCCESS', user.id);

  return res.status(200).json({
    accessToken,
    refreshToken,
    user: publicUser(user),
  });
});

// ─── POST /api/auth/mfa/verify ───────────────────────────────────────────────

router.post('/mfa/verify', requireAuth, async (req, res) => {
  const { totpCode } = req.body;
  const { id: userId } = req.user;

  const user = users.get(userId);
  if (!user || !user.mfaEnabled) {
    return res.status(400).json({ error: 'MFA not enabled for this account' });
  }

  const secret = mfaSecrets.get(userId);
  if (!secret) {
    return res.status(500).json({ error: 'MFA configuration error' });
  }

  const valid = authenticator.verify({ token: totpCode, secret });
  if (!valid) {
    audit('MFA_FAILED', userId);
    return res.status(401).json({ error: 'Invalid TOTP code' });
  }

  const accessToken  = signAccessToken({ id: userId, role: user.role, mfaEnabled: true, mfaVerified: true });
  const refreshToken = generateRefreshToken();
  refreshTokens.set(hashToken(refreshToken), {
    userId,
    expiresAt: Date.now() + REFRESH_TTL_MS,
  });

  audit('MFA_SUCCESS', userId);

  return res.status(200).json({
    accessToken,
    refreshToken,
    user: publicUser(user),
  });
});

// ─── POST /api/auth/mfa/setup ────────────────────────────────────────────────

router.post('/mfa/setup', requireAuth, requireMFA, async (req, res) => {
  const userId = req.user.id;
  const user   = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = authenticator.generateSecret();
  const appName  = process.env.APP_NAME || 'Nexus AI Pro';
  const otpAuthUrl = authenticator.keyuri(user.email, appName, secret);

  // Store secret (production: encrypt with user's key before saving to DB)
  mfaSecrets.set(userId, secret);

  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl);

  return res.status(200).json({
    secret,
    qrCode: qrDataUrl,
    message: 'Scan the QR code with your authenticator app, then confirm with /mfa/enable',
  });
});

// ─── POST /api/auth/mfa/enable ───────────────────────────────────────────────

router.post('/mfa/enable', requireAuth, async (req, res) => {
  const { totpCode } = req.body;
  const userId = req.user.id;
  const user   = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = mfaSecrets.get(userId);
  if (!secret) return res.status(400).json({ error: 'Run /mfa/setup first' });

  const valid = authenticator.verify({ token: totpCode, secret });
  if (!valid) return res.status(401).json({ error: 'Invalid TOTP code' });

  user.mfaEnabled = true;
  user.updatedAt  = new Date().toISOString();
  users.set(userId, user);

  audit('MFA_ENABLED', userId);

  return res.status(200).json({ message: '2FA enabled successfully' });
});

// ─── POST /api/auth/mfa/disable ──────────────────────────────────────────────

router.post('/mfa/disable', requireAuth, requireMFA, async (req, res) => {
  const { totpCode, password } = req.body;
  const userId = req.user.id;
  const user   = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Require password confirmation
  const validPw = await bcrypt.compare(password, user.passwordHash);
  if (!validPw) return res.status(401).json({ error: 'Invalid password' });

  const secret = mfaSecrets.get(userId);
  const validOtp = secret && authenticator.verify({ token: totpCode, secret });
  if (!validOtp) return res.status(401).json({ error: 'Invalid TOTP code' });

  user.mfaEnabled = false;
  user.updatedAt  = new Date().toISOString();
  users.set(userId, user);
  mfaSecrets.delete(userId);

  audit('MFA_DISABLED', userId);
  return res.status(200).json({ message: '2FA disabled' });
});

// ─── POST /api/auth/token/refresh ────────────────────────────────────────────

router.post('/token/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const tokenHash = hashToken(refreshToken);
  const record    = refreshTokens.get(tokenHash);

  if (!record || record.expiresAt < Date.now()) {
    refreshTokens.delete(tokenHash);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = users.get(record.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  // Rotate refresh token (single-use)
  refreshTokens.delete(tokenHash);
  const newRefresh = generateRefreshToken();
  refreshTokens.set(hashToken(newRefresh), {
    userId:    user.id,
    expiresAt: Date.now() + REFRESH_TTL_MS,
  });

  const accessToken = signAccessToken({
    id:         user.id,
    role:       user.role,
    mfaEnabled: user.mfaEnabled,
    mfaVerified: user.mfaEnabled, // assume verified if MFA was completed before refresh
  });

  return res.status(200).json({ accessToken, refreshToken: newRefresh });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    refreshTokens.delete(hashToken(refreshToken));
  }
  audit('LOGOUT', req.user.id);
  return res.status(200).json({ message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: publicUser(user) });
});

// ─── PUT /api/auth/me ────────────────────────────────────────────────────────

router.put('/me', requireAuth, requireMFA, async (req, res) => {
  const userId = req.user.id;
  const user   = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { username, currentPassword, newPassword } = req.body;

  if (username) {
    const { valid, error } = validateUsername(username);
    if (!valid) return res.status(400).json({ error });
    user.username = username.trim();
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password required to change password' });
    }
    const validPw = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPw) return res.status(401).json({ error: 'Current password incorrect' });

    const strength = validatePassword(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: 'New password too weak', details: strength.errors });
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    audit('PASSWORD_CHANGED', userId);
  }

  user.updatedAt = new Date().toISOString();
  users.set(userId, user);

  return res.json({ user: publicUser(user) });
});

// ─── Biometric Challenge (WebAuthn-style bridge) ─────────────────────────────

router.post('/biometric/challenge', requireAuth, (req, res) => {
  const challenge = crypto.randomBytes(32).toString('base64url');
  // In production: store challenge in Redis with short TTL keyed to user session
  return res.json({
    challenge,
    rpId:      process.env.RP_ID || 'localhost',
    timeout:   60_000,
    userVerification: 'required',
  });
});

router.post('/biometric/verify', requireAuth, (req, res) => {
  // In production: validate WebAuthn assertion using @simplewebauthn/server
  // This endpoint is the registration hook — returns a token confirming biometric success
  const { credentialId, signature, clientDataJSON } = req.body;
  if (!credentialId || !signature || !clientDataJSON) {
    return res.status(400).json({ error: 'Missing biometric assertion fields' });
  }

  // Placeholder: in production, verify against stored credential public key
  const biometricToken = signAccessToken({
    id:              req.user.id,
    role:            req.user.role,
    mfaEnabled:      req.user.mfaEnabled,
    mfaVerified:     true,
    biometricVerified: true,
  });

  audit('BIOMETRIC_VERIFIED', req.user.id);
  return res.json({ accessToken: biometricToken });
});

// ─── Admin: List Users ────────────────────────────────────────────────────────

router.get(
  '/admin/users',
  requireAuth,
  requireRole(ROLES.ADMIN),
  (req, res) => {
    const list = [...users.values()].map(publicUser);
    return res.json({ users: list, total: list.length });
  }
);

// ─── Admin: Audit Log ─────────────────────────────────────────────────────────

router.get(
  '/admin/audit',
  requireAuth,
  requireRole(ROLES.ADMIN),
  (req, res) => {
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
    const recent = auditLog.slice(-limit).reverse();
    return res.json({ logs: recent, total: auditLog.length });
  }
);

export default router;
export { users, auditLog }; // exported for server.js to wire in
