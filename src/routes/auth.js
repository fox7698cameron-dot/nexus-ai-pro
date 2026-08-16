/**
 * nexus-ai-pro/src/routes/auth.js
 * Authentication routes: register, login, 2FA/MFA, biometrics, password management
 * Date: 2026-08-16
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { validatePassword, validateUsername, validateEmail, sanitizeHtml } from '../utils/validation.js';
import { signToken, generateRefreshToken, requireAuth, requireAdmin, ROLES, safeCompare } from '../middleware/auth.js';

const router = express.Router();

// In-memory store (replace with Redis/DB in production)
// These are keyed by userId (UUID), not credentials
const userStore = new Map();          // userId -> userData
const emailIndex = new Map();         // email -> userId
const usernameIndex = new Map();      // normalizedUsername -> userId
const refreshTokens = new Map();      // refreshToken -> userId
const mfaSecrets = new Map();         // userId -> speakeasy secret
const webauthnChallenges = new Map(); // userId -> challenge
const passwordResetTokens = new Map(); // token -> { userId, expiresAt }

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, language = 'en-US' } = req.body || {};

    // Validate inputs
    const emailResult = validateEmail(email);
    if (!emailResult.valid) return res.status(400).json({ error: emailResult.error, field: 'email' });

    const usernameResult = validateUsername(username);
    if (!usernameResult.valid) return res.status(400).json({ error: usernameResult.errors[0], field: 'username' });

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      return res.status(400).json({ error: passwordResult.errors[0], field: 'password', details: passwordResult });
    }

    const normalEmail = emailResult.normalized;
    const normalUsername = username.trim().toLowerCase();

    if (emailIndex.has(normalEmail)) return res.status(409).json({ error: 'Email already registered', field: 'email' });
    if (usernameIndex.has(normalUsername)) return res.status(409).json({ error: 'Username taken', field: 'username' });

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = Date.now();

    const user = {
      id: userId,
      email: normalEmail,
      username: username.trim(),
      passwordHash,
      role: ROLES.USER,
      language,
      mfaEnabled: false,
      biometricEnabled: false,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
      loginCount: 0,
      active: true,
    };

    userStore.set(userId, user);
    emailIndex.set(normalEmail, userId);
    usernameIndex.set(normalUsername, userId);

    // Issue tokens
    const accessToken = signToken({ sub: userId, role: user.role, email: normalEmail });
    const refreshToken = generateRefreshToken();
    refreshTokens.set(refreshToken, { userId, expiresAt: now + REFRESH_TOKEN_TTL_MS });

    // Minimal user object (never send hash)
    const publicUser = { id: userId, email: normalEmail, username: user.username, role: user.role, language };

    res.status(201).json({ user: publicUser, accessToken, refreshToken, message: 'Account created successfully' });
  } catch (err) {
    console.error('[auth/register]', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, mfaCode } = req.body || {};

    const emailResult = validateEmail(email);
    if (!emailResult.valid) return res.status(400).json({ error: 'Invalid email' });

    const userId = emailIndex.get(emailResult.normalized);
    const user = userId ? userStore.get(userId) : null;

    // Constant-time comparison to prevent user enumeration
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx';
    const hash = user?.passwordHash || dummyHash;
    const match = await bcrypt.compare(password || '', hash);

    if (!user || !match || !user.active) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'AUTH_INVALID' });
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.status(200).json({ requiresMfa: true, message: 'MFA code required' });
      }
      const secret = mfaSecrets.get(userId);
      if (!secret) return res.status(401).json({ error: 'MFA configuration error' });

      const valid = speakeasy.totp.verify({
        secret: secret.base32,
        encoding: 'base32',
        token: String(mfaCode).replace(/\s/g, ''),
        window: 2,
      });
      if (!valid) return res.status(401).json({ error: 'Invalid MFA code', code: 'MFA_INVALID' });
    }

    // Update login metadata
    user.lastLogin = Date.now();
    user.loginCount += 1;
    user.updatedAt = Date.now();

    const accessToken = signToken({ sub: userId, role: user.role, email: user.email });
    const refreshToken = generateRefreshToken();
    refreshTokens.set(refreshToken, { userId, expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS });

    const publicUser = { id: userId, email: user.email, username: user.username, role: user.role, language: user.language, mfaEnabled: user.mfaEnabled };
    res.json({ user: publicUser, accessToken, refreshToken });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const record = refreshTokens.get(refreshToken);
  if (!record || Date.now() > record.expiresAt) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = userStore.get(record.userId);
  if (!user || !user.active) return res.status(401).json({ error: 'User not found or inactive' });

  const newAccessToken = signToken({ sub: user.id, role: user.role, email: user.email });
  res.json({ accessToken: newAccessToken });
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ message: 'Logged out successfully' });
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = userStore.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...publicUser } = user;
  res.json({ user: publicUser });
});

// ─────────────────────────────────────────────
// POST /api/auth/mfa/setup
// ─────────────────────────────────────────────
router.post('/mfa/setup', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = userStore.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `NexusAI:${sanitizeHtml(user.email)}`,
      length: 32,
      issuer: 'Nexus AI Pro',
    });

    // Store secret temporarily until verified
    mfaSecrets.set(`pending_${userId}`, secret);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    });
  } catch (err) {
    console.error('[auth/mfa/setup]', err.message);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/mfa/verify
// ─────────────────────────────────────────────
router.post('/mfa/verify', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const { code } = req.body || {};
  const pendingSecret = mfaSecrets.get(`pending_${userId}`);
  if (!pendingSecret) return res.status(400).json({ error: 'No pending MFA setup found' });

  const valid = speakeasy.totp.verify({
    secret: pendingSecret.base32,
    encoding: 'base32',
    token: String(code).replace(/\s/g, ''),
    window: 2,
  });

  if (!valid) return res.status(400).json({ error: 'Invalid verification code' });

  mfaSecrets.set(userId, pendingSecret);
  mfaSecrets.delete(`pending_${userId}`);
  const user = userStore.get(userId);
  if (user) { user.mfaEnabled = true; user.updatedAt = Date.now(); }

  res.json({ message: 'MFA enabled successfully', mfaEnabled: true });
});

// ─────────────────────────────────────────────
// POST /api/auth/mfa/disable
// ─────────────────────────────────────────────
router.post('/mfa/disable', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { password } = req.body || {};
  const user = userStore.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = await bcrypt.compare(password || '', user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Password incorrect' });

  mfaSecrets.delete(userId);
  user.mfaEnabled = false;
  user.updatedAt = Date.now();
  res.json({ message: 'MFA disabled', mfaEnabled: false });
});

// ─────────────────────────────────────────────
// POST /api/auth/biometric/register
// Uses WebAuthn / FIDO2 challenge flow
// ─────────────────────────────────────────────
router.post('/biometric/register', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const challenge = crypto.randomBytes(32).toString('base64url');
  webauthnChallenges.set(userId, { challenge, expiresAt: Date.now() + 5 * 60 * 1000 });

  res.json({
    challenge,
    rp: { name: 'Nexus AI Pro', id: process.env.WEBAUTHN_RP_ID || 'localhost' },
    user: { id: Buffer.from(userId).toString('base64url'), name: userStore.get(userId)?.email || userId, displayName: userStore.get(userId)?.username || userId },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Touch ID, Face ID, Windows Hello
      residentKey: 'required',
      userVerification: 'required',
    },
    timeout: 300000,
    attestation: 'none',
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/biometric/verify
// ─────────────────────────────────────────────
router.post('/biometric/verify', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const record = webauthnChallenges.get(userId);

  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'Challenge expired. Please restart biometric registration.' });
  }

  const { credentialId, publicKey } = req.body || {};
  if (!credentialId) return res.status(400).json({ error: 'Credential ID required' });

  // Store credential (in production: use a proper WebAuthn library like @simplewebauthn/server)
  const user = userStore.get(userId);
  if (user) {
    user.biometricCredentials = user.biometricCredentials || [];
    user.biometricCredentials.push({
      credentialId,
      publicKey,
      createdAt: Date.now(),
      type: req.body.authenticatorType || 'platform',
    });
    user.biometricEnabled = true;
    user.updatedAt = Date.now();
  }

  webauthnChallenges.delete(userId);
  res.json({ message: 'Biometric credential registered', biometricEnabled: true });
});

// ─────────────────────────────────────────────
// POST /api/auth/password/change
// ─────────────────────────────────────────────
router.post('/password/change', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { currentPassword, newPassword } = req.body || {};
    const user = userStore.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(currentPassword || '', user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors[0], details: validation });
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.updatedAt = Date.now();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[auth/password/change]', err.message);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/password/forgot
// ─────────────────────────────────────────────
router.post('/password/forgot', async (req, res) => {
  try {
    const emailResult = validateEmail(req.body?.email);
    // Always respond success to prevent user enumeration
    if (!emailResult.valid) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const userId = emailIndex.get(emailResult.normalized);
    if (userId) {
      const token = crypto.randomBytes(32).toString('hex');
      passwordResetTokens.set(token, { userId, expiresAt: Date.now() + RESET_TOKEN_TTL_MS });
      // In production: send email with token link
      console.info(`[auth] Password reset token for ${userId}: ${token.slice(0, 8)}...`);
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[auth/password/forgot]', err.message);
    res.status(500).json({ error: 'Reset request failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/password/reset
// ─────────────────────────────────────────────
router.post('/password/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Reset token required' });

    const record = passwordResetTokens.get(token);
    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors[0], details: validation });
    }

    const user = userStore.get(record.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.updatedAt = Date.now();
    passwordResetTokens.delete(token);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('[auth/password/reset]', err.message);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// ─────────────────────────────────────────────
// Admin: GET /api/auth/users  (admin only)
// ─────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  let users = [...userStore.values()].map(({ passwordHash, ...u }) => u);

  if (role) users = users.filter(u => u.role === role);
  if (search) {
    const q = search.toLowerCase();
    users = users.filter(u => u.email.includes(q) || u.username.toLowerCase().includes(q));
  }

  const total = users.length;
  const start = (Number(page) - 1) * Number(limit);
  const paginated = users.slice(start, start + Number(limit));

  res.json({ users: paginated, total, page: Number(page), limit: Number(limit) });
});

// Admin: PATCH /api/auth/users/:id/role
router.patch('/users/:id/role', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};

  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: 'Invalid role', valid: Object.values(ROLES) });
  }

  const user = userStore.get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.role = role;
  user.updatedAt = Date.now();
  res.json({ message: 'Role updated', user: { id, role } });
});

// Admin: DELETE /api/auth/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const user = userStore.get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Soft delete
  user.active = false;
  user.updatedAt = Date.now();
  res.json({ message: 'User deactivated' });
});

export default router;
