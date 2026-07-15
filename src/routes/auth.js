/**
 * src/routes/auth.js
 * Nexus AI Pro — Authentication Routes
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — email + password; returns token or tempToken for 2FA
 * POST /api/auth/2fa/verify — TOTP code verification
 * GET  /api/auth/2fa/setup  — generate TOTP secret + QR
 * POST /api/auth/2fa/enable — confirm and enable 2FA
 * POST /api/auth/2fa/disable
 * POST /api/auth/refresh   — refresh JWT
 * POST /api/auth/logout
 * POST /api/auth/biometric/challenge
 * POST /api/auth/biometric/register
 * POST /api/auth/biometric/auth-challenge
 * POST /api/auth/biometric/authenticate
 * POST /api/auth/reset-request
 * POST /api/auth/reset-confirm
 * GET  /api/auth/me
 */

import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { validateEmail, validateUsername, validatePasswordStrength, validateRole, validateTOTPCode } from '../utils/validation.js';

const router = Router();

// ─── User store (replace with real DB in production) ──────────────────────────

const users = new Map();        // userId -> userRecord
const emailIndex = new Map();   // email -> userId
const resetTokens = new Map();  // token -> { userId, exp }
const biometricCreds = new Map(); // userId -> [credentialRecord]
const pendingChallenges = new Map(); // challenge -> { userId, exp }

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

function signToken(payload, expiresIn = '15m') {
  return jwt.sign(payload, jwtSecret(), { expiresIn, algorithm: 'HS256' });
}

function signRefresh(payload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: '7d', algorithm: 'HS256' });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = verifyToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeUser(u) {
  const { passwordHash, mfaSecret, biometricCreds: _b, ...safe } = u;
  return safe;
}

// ─── Register ─────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { email, username, displayName, password, role } = req.body ?? {};

  const ev = validateEmail(email);
  if (!ev.valid) return res.status(400).json({ error: ev.error });

  const uv = validateUsername(username);
  if (!uv.valid) return res.status(400).json({ error: uv.errors.join('. ') });

  const pv = validatePasswordStrength(password ?? '');
  if (!pv.valid) return res.status(400).json({ error: 'Password does not meet strength requirements (13+ chars, upper, lower, digit, special)' });

  if (emailIndex.has(ev.sanitized)) return res.status(409).json({ error: 'Email already registered' });

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = {
    id: userId,
    email: ev.sanitized,
    username: uv.sanitized,
    displayName: (displayName ?? '').trim() || uv.sanitized,
    passwordHash,
    role: validateRole(role),
    mfaEnabled: false,
    mfaSecret: null,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  users.set(userId, user);
  emailIndex.set(ev.sanitized, userId);

  const token   = signToken({ sub: userId, role: user.role, username: user.username });
  const refresh = signRefresh({ sub: userId });

  res.status(201).json({ token, refresh, user: safeUser(user) });
});

// ─── Login ────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  const ev = validateEmail(email);
  if (!ev.valid) return res.status(400).json({ error: 'Invalid email' });

  const userId = emailIndex.get(ev.sanitized);
  const user = userId ? users.get(userId) : null;

  // Use constant-time compare to prevent timing attacks
  const hash = user?.passwordHash ?? '$2b$12$invalidhashpadding00000000000000000000000000';
  const valid = await bcrypt.compare(password ?? '', hash);

  if (!valid || !user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.active) return res.status(403).json({ error: 'Account suspended' });

  if (user.mfaEnabled) {
    const tempToken = signToken({ sub: userId, scope: '2fa', role: user.role }, '10m');
    return res.json({ requires2FA: true, tempToken });
  }

  const token   = signToken({ sub: userId, role: user.role, username: user.username });
  const refresh = signRefresh({ sub: userId });
  res.json({ token, refresh, user: safeUser(user) });
});

// ─── 2FA Setup ────────────────────────────────────────────────────────────────

router.get('/2fa/setup', requireAuth, async (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = speakeasy.generateSecret({ name: `Nexus AI Pro (${user.email})`, length: 32 });

  // Store temp secret (not active until confirmed)
  users.set(user.id, { ...user, pendingMfaSecret: secret.base32 });

  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
  const backupCodes = Array.from({ length: 8 }, () =>
    [uuidv4().slice(0, 4), uuidv4().slice(0, 4), uuidv4().slice(0, 4)].join('-').toUpperCase()
  );

  res.json({ qrDataUrl, secret: secret.base32, backupCodes });
});

router.post('/2fa/enable', requireAuth, (req, res) => {
  const { code } = req.body ?? {};
  if (!validateTOTPCode(code)) return res.status(400).json({ error: 'Invalid code format' });

  const user = users.get(req.user.sub);
  if (!user?.pendingMfaSecret) return res.status(400).json({ error: 'Setup 2FA first' });

  const valid = speakeasy.totp.verify({ secret: user.pendingMfaSecret, encoding: 'base32', token: code, window: 1 });
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP code' });

  users.set(user.id, { ...user, mfaEnabled: true, mfaSecret: user.pendingMfaSecret, pendingMfaSecret: null });
  res.json({ success: true, message: '2FA enabled' });
});

router.post('/2fa/disable', requireAuth, (req, res) => {
  const { code } = req.body ?? {};
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = speakeasy.totp.verify({ secret: user.mfaSecret ?? '', encoding: 'base32', token: code ?? '', window: 1 });
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP code' });

  users.set(user.id, { ...user, mfaEnabled: false, mfaSecret: null });
  res.json({ success: true, message: '2FA disabled' });
});

router.post('/2fa/verify', (req, res) => {
  const { tempToken, code } = req.body ?? {};
  if (!validateTOTPCode(code)) return res.status(400).json({ error: 'Invalid code format' });

  let payload;
  try { payload = verifyToken(tempToken); } catch { return res.status(401).json({ error: 'Invalid or expired session' }); }
  if (payload.scope !== '2fa') return res.status(401).json({ error: 'Invalid token scope' });

  const user = users.get(payload.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = speakeasy.totp.verify({ secret: user.mfaSecret ?? '', encoding: 'base32', token: code, window: 1 });
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP code' });

  const token   = signToken({ sub: user.id, role: user.role, username: user.username });
  const refresh = signRefresh({ sub: user.id });
  res.json({ token, refresh, user: safeUser(user) });
});

// ─── Token refresh ─────────────────────────────────────────────────────────────

router.post('/refresh', (req, res) => {
  const { refresh } = req.body ?? {};
  if (!refresh) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const payload = verifyToken(refresh);
    const user = users.get(payload.sub);
    if (!user?.active) return res.status(401).json({ error: 'User not found or suspended' });
    const token = signToken({ sub: user.id, role: user.role, username: user.username });
    res.json({ token, user: safeUser(user) });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, (req, res) => {
  // In production: add token to a denylist (Redis)
  res.json({ success: true });
});

// ─── Password reset ───────────────────────────────────────────────────────────

router.post('/reset-request', async (req, res) => {
  const { email } = req.body ?? {};
  const ev = validateEmail(email);
  if (!ev.valid) return res.status(400).json({ error: 'Invalid email' });

  // Always respond 200 to prevent email enumeration
  const userId = emailIndex.get(ev.sanitized);
  if (userId) {
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, { userId, exp: Date.now() + 60 * 60 * 1000 });
    // In production: send email via SMTP (nodemailer)
    console.log(`[AUTH] Password reset token for ${ev.sanitized}: ${token}`);
  }

  res.json({ message: 'If the email exists, a reset link has been sent.' });
});

router.post('/reset-confirm', async (req, res) => {
  const { token, newPassword } = req.body ?? {};
  const record = resetTokens.get(token);
  if (!record || record.exp < Date.now()) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const pv = validatePasswordStrength(newPassword ?? '');
  if (!pv.valid) return res.status(400).json({ error: 'Password does not meet strength requirements' });

  const user = users.get(record.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  users.set(user.id, { ...user, passwordHash, updatedAt: Date.now() });
  resetTokens.delete(token);

  res.json({ success: true, message: 'Password updated' });
});

// ─── Biometric (WebAuthn) ─────────────────────────────────────────────────────

router.post('/biometric/challenge', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const challenge = crypto.randomBytes(32).toString('base64');
  pendingChallenges.set(challenge, { userId: user.id, exp: Date.now() + 60_000 });

  res.json({
    challenge,
    userId: Buffer.from(user.id).toString('base64').slice(0, 16),
    email: user.email,
    displayName: user.displayName,
  });
});

router.post('/biometric/register', requireAuth, (req, res) => {
  const { credentialId, response, type } = req.body ?? {};
  if (!credentialId) return res.status(400).json({ error: 'credentialId required' });

  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Store the credential (in production: verify attestation with WebAuthn library)
  const creds = biometricCreds.get(user.id) ?? [];
  creds.push({ credentialId, type: type ?? 'platform', registeredAt: Date.now() });
  biometricCreds.set(user.id, creds);

  res.json({ success: true, message: `${type ?? 'Biometric'} registered` });
});

router.post('/biometric/auth-challenge', (req, res) => {
  const challenge = crypto.randomBytes(32).toString('base64');
  pendingChallenges.set(challenge, { exp: Date.now() + 60_000 });
  res.json({ challenge });
});

router.post('/biometric/authenticate', (req, res) => {
  const { credentialId } = req.body ?? {};
  if (!credentialId) return res.status(400).json({ error: 'credentialId required' });

  // Find user by credentialId
  for (const [userId, creds] of biometricCreds.entries()) {
    const found = creds.find(c => c.credentialId === credentialId);
    if (found) {
      const user = users.get(userId);
      if (!user?.active) return res.status(403).json({ error: 'Account suspended' });
      const token   = signToken({ sub: userId, role: user.role, username: user.username });
      const refresh = signRefresh({ sub: userId });
      return res.json({ token, refresh, user: safeUser(user) });
    }
  }

  res.status(401).json({ error: 'Credential not recognized' });
});

// ─── Me ───────────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

// ─── Export user store helper for other routes ────────────────────────────────

export { users, emailIndex };

export default router;
