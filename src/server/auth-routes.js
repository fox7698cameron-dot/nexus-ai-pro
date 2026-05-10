// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import { db } from './database.js';
import { authenticate, auditLog } from './middleware.js';

export const router = Router();

// ── Constants ─────────────────────────────────────────────────
const BCRYPT_COST = 12;
const VALID_ROLES = ['admin', 'developer', 'moderator', 'user'];
const VALID_TIERS = ['free', 'pro', 'enterprise'];

// Require uppercase, lowercase, digit, and special char; minimum 13 chars
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]).{13,}$/;

// ── Helpers ───────────────────────────────────────────────────
function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not configured');
  return s;
}

function encryptionKey() {
  const raw = process.env.ENCRYPTION_SECRET;
  if (!raw || raw.length < 32) throw new Error('ENCRYPTION_SECRET must be at least 32 chars');
  return Buffer.from(raw).slice(0, 32);
}

function signToken(payload, extra = {}) {
  return jwt.sign(
    { sub: payload.id, email: payload.email, role: payload.role, tier: payload.tier, ...extra },
    jwtSecret(),
    { expiresIn: '24h' }
  );
}

function encryptSecret(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), data: encrypted.toString('hex'), tag: cipher.getAuthTag().toString('hex') };
}

function decryptSecret({ iv, data, tag }) {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
}

async function sendMail(to, subject, html) {
  if (!process.env.SMTP_HOST) return;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transport.sendMail({ from: process.env.SMTP_USER, to, subject, html });
}

function safeUserView(user) {
  const { passwordHash, twoFactorSecret, ...safe } = user;
  return safe;
}

// ── Validation schemas ────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(13).regex(PASSWORD_REGEX, 'Password must be 13+ chars with uppercase, lowercase, digit, and special character'),
  username: z.string().min(2).max(50),   // Unicode/emoji intentionally allowed by zod default
  language: z.string().max(10).default('en'),
  region: z.string().max(10).default('US')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const passwordSchema = z.string().min(13).regex(PASSWORD_REGEX, 'Password must be 13+ chars with uppercase, lowercase, digit, and special character');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema
});

const profileUpdateSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  language: z.string().max(10).optional(),
  region: z.string().max(10).optional(),
  avatar: z.string().url().optional()
});

const totpTokenSchema = z.object({ token: z.string().length(6) });

const biometricSchema = z.object({
  deviceId: z.string().min(1).max(256),
  credentialId: z.string().min(1).max(512),
  platform: z.enum(['ios', 'android', 'windows', 'macos', 'web'])
});

// ── Built-in rate limiters (caller may also inject one via param) ─
const authLimiter = rateLimit({ windowMs: 3_600_000, max: 5, standardHeaders: true, legacyHeaders: false });
const otpLimiter  = rateLimit({ windowMs:   300_000, max: 5, standardHeaders: true, legacyHeaders: false });

// ── Register ──────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await db.get(`email:${data.email}`);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
    const csrfToken = randomBytes(32).toString('hex');

    const user = {
      id, email: data.email, username: data.username, passwordHash,
      role: 'user', tier: 'free',
      language: data.language, region: data.region,
      twoFactorEnabled: false, biometricEnabled: false,
      status: 'active', createdAt: new Date().toISOString()
    };

    await db.set(`user:${id}`, JSON.stringify(user));
    await db.set(`email:${data.email}`, id);

    const token = signToken(user);

    // Non-blocking — mail failure must not abort registration
    sendMail(data.email, 'Welcome to Nexus AI Pro',
      `<h1>Welcome, ${data.username}!</h1><p>Your account is ready.</p>`
    ).catch(err => console.warn('[auth] Welcome email failed:', err.message));

    res.status(201).json({
      token, csrfToken,
      user: { id, email: user.email, username: user.username, role: user.role, tier: user.tier }
    });
  } catch (err) {
    res.status(err instanceof z.ZodError ? 400 : 500).json({ error: err.message });
  }
});

// ── Login ─────────────────────────────────────────────────────
// Accepts an optional external limiter as the first route-level middleware
export function createLoginHandler(externalLimiter) {
  const middlewares = externalLimiter ? [externalLimiter] : [authLimiter];

  return [
    ...middlewares,
    async (req, res) => {
      try {
        const { email, password } = loginSchema.parse(req.body);

        const userId = await db.get(`email:${email}`);
        if (!userId) return res.status(401).json({ error: 'Invalid credentials' });

        const raw = await db.get(`user:${userId}`);
        if (!raw) return res.status(401).json({ error: 'Invalid credentials' });

        const user = JSON.parse(raw);
        if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        await db.set(`user:${userId}`, JSON.stringify({ ...user, lastLogin: new Date().toISOString() }));

        const csrfToken = randomBytes(32).toString('hex');
        const token = signToken(user);

        res.json({
          token, csrfToken,
          twoFactorEnabled: user.twoFactorEnabled,
          user: { id: user.id, email: user.email, username: user.username, role: user.role, tier: user.tier, language: user.language, region: user.region }
        });
      } catch (err) {
        res.status(err instanceof z.ZodError ? 400 : 500).json({ error: err.message });
      }
    }
  ];
}

// Default login route using built-in limiter
router.post('/login', ...createLoginHandler());

// ── Logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const token = req.headers['authorization']?.slice(7) ?? '';
  // 24h TTL matches maximum JWT lifetime
  if (token) await db.set(`revoked:${token.slice(-16)}`, '1', 86_400);
  res.json({ success: true });
});

// ── Profile ───────────────────────────────────────────────────
router.get('/profile', authenticate, async (req, res) => {
  const raw = await db.get(`user:${req.user.id}`);
  if (!raw) return res.status(404).json({ error: 'User not found' });
  res.json(safeUserView(JSON.parse(raw)));
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const updates = profileUpdateSchema.parse(req.body);
    const raw = await db.get(`user:${req.user.id}`);
    if (!raw) return res.status(404).json({ error: 'User not found' });
    const user = JSON.parse(raw);
    await db.set(`user:${req.user.id}`, JSON.stringify({ ...user, ...updates, updatedAt: new Date().toISOString() }));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── 2FA – TOTP setup ──────────────────────────────────────────
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const raw = await db.get(`user:${req.user.id}`);
    if (!raw) return res.status(404).json({ error: 'User not found' });
    const user = JSON.parse(raw);

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'NexusAIPro', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Store encrypted with 10-min window to complete verification
    await db.set(`2fa:pending:${req.user.id}`, JSON.stringify(encryptSecret(secret)), 600);

    res.json({ qrDataUrl, manualEntryHint: `${secret.slice(0, 4)}...` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = totpTokenSchema.parse(req.body);

    const raw = await db.get(`2fa:pending:${req.user.id}`);
    if (!raw) return res.status(400).json({ error: 'No pending 2FA setup — call /2fa/setup first' });

    const secret = decryptSecret(JSON.parse(raw));
    if (!authenticator.verify({ token, secret })) {
      return res.status(400).json({ error: 'Invalid TOTP code' });
    }

    // Persist encrypted secret and mark user
    const userRaw = await db.get(`user:${req.user.id}`);
    const user = JSON.parse(userRaw);
    await db.set(`2fa:secret:${req.user.id}`, raw);
    await db.del(`2fa:pending:${req.user.id}`);
    await db.set(`user:${req.user.id}`, JSON.stringify({ ...user, twoFactorEnabled: true }));

    res.json({ success: true, token: signToken({ ...req.user, ...user }, { twoFactorVerified: true }) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { token } = totpTokenSchema.parse(req.body);

    const raw = await db.get(`2fa:secret:${req.user.id}`);
    if (!raw) return res.status(400).json({ error: '2FA is not enabled' });

    const secret = decryptSecret(JSON.parse(raw));
    if (!authenticator.verify({ token, secret })) {
      return res.status(400).json({ error: 'Invalid TOTP code' });
    }

    await db.del(`2fa:secret:${req.user.id}`);
    const userRaw = await db.get(`user:${req.user.id}`);
    const user = JSON.parse(userRaw);
    await db.set(`user:${req.user.id}`, JSON.stringify({ ...user, twoFactorEnabled: false }));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── MFA – email OTP ───────────────────────────────────────────
router.post('/mfa/email', otpLimiter, authenticate, async (req, res) => {
  // 6-digit numeric OTP derived from random bytes
  const otp = String(parseInt(randomBytes(3).toString('hex'), 16)).slice(0, 6).padStart(6, '0');
  await db.set(`mfa:email:${req.user.id}`, otp, 300);
  sendMail(
    req.user.email,
    'Your Nexus AI Pro verification code',
    `<p>Your code: <strong>${otp}</strong>. Expires in 5 minutes. Do not share it.</p>`
  ).catch(err => console.warn('[auth] OTP email failed:', err.message));
  res.json({ sent: true });
});

router.post('/mfa/verify-email', authenticate, async (req, res) => {
  try {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
    const stored = await db.get(`mfa:email:${req.user.id}`);
    if (!stored || stored !== code) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    await db.del(`mfa:email:${req.user.id}`);
    res.json({ success: true, token: signToken(req.user, { emailMfaVerified: true }) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Biometric ─────────────────────────────────────────────────
// We store only a SHA-256 hash of the device credential ID — raw biometric
// data never touches the server.
router.post('/biometric/register', authenticate, async (req, res) => {
  try {
    const data = biometricSchema.parse(req.body);
    const credentialIdHash = createHash('sha256').update(data.credentialId).digest('hex');
    const deviceIdHash     = createHash('sha256').update(data.deviceId).digest('hex');

    const credential = {
      credentialIdHash,
      deviceIdHash,
      platform: data.platform,
      registeredAt: new Date().toISOString()
    };
    await db.set(`biometric:${req.user.id}:${credentialIdHash}`, JSON.stringify(credential));

    const userRaw = await db.get(`user:${req.user.id}`);
    const user = JSON.parse(userRaw);
    await db.set(`user:${req.user.id}`, JSON.stringify({ ...user, biometricEnabled: true }));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/biometric/authenticate', async (req, res) => {
  try {
    const { userId, credentialId } = z.object({
      userId: z.string().uuid(),
      credentialId: z.string().min(1)
    }).parse(req.body);

    const hash = createHash('sha256').update(credentialId).digest('hex');
    const stored = await db.get(`biometric:${userId}:${hash}`);
    if (!stored) return res.status(401).json({ error: 'Biometric credential not found' });

    const userRaw = await db.get(`user:${userId}`);
    if (!userRaw) return res.status(401).json({ error: 'User not found' });
    const user = JSON.parse(userRaw);
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    res.json({ token: signToken(user, { biometricAuth: true }) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Password management ───────────────────────────────────────
router.put('/password/change', authenticate, auditLog('PASSWORD_CHANGE'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const raw = await db.get(`user:${req.user.id}`);
    if (!raw) return res.status(404).json({ error: 'User not found' });
    const user = JSON.parse(raw);

    if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await db.set(`user:${req.user.id}`, JSON.stringify({ ...user, passwordHash, passwordChangedAt: new Date().toISOString() }));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/password/reset-request', authLimiter, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const userId = await db.get(`email:${email}`);
    if (userId) {
      const resetToken = randomBytes(32).toString('hex');
      await db.set(`pwreset:${resetToken}`, userId, 3600);
      sendMail(email, 'Reset your Nexus AI Pro password',
        `<p>Use this token to reset your password (valid 1 hour):</p><pre>${resetToken}</pre>`
      ).catch(err => console.warn('[auth] Reset email failed:', err.message));
    }
    // Always return the same response to prevent email enumeration
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/password/reset', async (req, res) => {
  try {
    const { token, newPassword } = z.object({
      token: z.string().length(64),
      newPassword: passwordSchema
    }).parse(req.body);

    const userId = await db.get(`pwreset:${token}`);
    if (!userId) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const raw = await db.get(`user:${userId}`);
    if (!raw) return res.status(404).json({ error: 'User not found' });
    const user = JSON.parse(raw);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await db.set(`user:${userId}`, JSON.stringify({ ...user, passwordHash, passwordChangedAt: new Date().toISOString() }));
    await db.del(`pwreset:${token}`);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── CSRF session token ────────────────────────────────────────
router.get('/session/csrf', (_req, res) => {
  const token = randomBytes(32).toString('hex');
  res.cookie('csrf-token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ token });
});

export default router;
