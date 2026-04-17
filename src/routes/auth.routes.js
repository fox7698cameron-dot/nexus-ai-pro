// nexus-ai-pro/src/routes/auth.routes.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Auth routes: register, login, 2FA, MFA verify, WebAuthn, token refresh

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  hashPassword, verifyPassword, validatePassword, validateUsername,
  signAccessToken, signRefreshToken, verifyToken, hashTokenForStorage,
  generateTotpSecret, generateTotpUri, verifyTotp,
  generateBackupCodes, hashBackupCode,
  generateVerificationToken, generateNumericOtp,
  authenticate, requireRole, ROLES,
} from '../services/auth.service.js';
import { audit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

// In-memory user store (replace with DB pool in production)
// Structure mirrors the DB schema in init.sql
const users = new Map();
const sessions = new Map();
const mfaConfigs = new Map();
const pendingMfa = new Map();  // tempToken → { userId, mfaMethod }

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Please try again later.' },
});

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', authLimit, async (req, res) => {
  const { username, email, password } = req.body;

  const usernameCheck = validateUsername(username ?? '');
  if (!usernameCheck.ok) return res.status(400).json({ error: usernameCheck.reason });

  const passwordCheck = validatePassword(password ?? '');
  if (!passwordCheck.ok) return res.status(400).json({ error: passwordCheck.reason });

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const existing = [...users.values()].find(u => u.email === email || u.username === username);
  if (existing) return res.status(409).json({ error: 'Email or username already taken' });

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const user = {
    id: userId,
    username,
    email,
    emailVerified: false,
    passwordHash,
    role: ROLES.USER,
    status: 'pending_verification',
    tier: 'free',
    locale: 'en',
    timezone: 'UTC',
    createdAt: new Date().toISOString(),
  };
  users.set(userId, user);

  audit({ label: 'USER_REGISTER', actorId: userId, ip: req.ip, result: 'ok' });
  res.status(201).json({ message: 'Account created. Please verify your email.' });
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', authLimit, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = [...users.values()].find(u => u.email === email);
  if (!user) {
    await new Promise(r => setTimeout(r, 300));  // timing-safe delay
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.status === 'suspended' || user.status === 'banned') {
    return res.status(403).json({ error: 'Account suspended' });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    audit({ label: 'LOGIN_FAILED', actorId: user.id, ip: req.ip, result: 'denied' });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const userMfa = mfaConfigs.get(user.id);
  if (userMfa?.verified) {
    const tempToken = crypto.randomBytes(32).toString('hex');
    pendingMfa.set(tempToken, { userId: user.id, expiresAt: Date.now() + 5 * 60 * 1000 });
    return res.json({ mfaRequired: true, mfaMethod: userMfa.method, tempToken });
  }

  const payload = { id: user.id, role: user.role, tier: user.tier };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user.id });

  sessions.set(hashTokenForStorage(refreshToken), { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

  audit({ label: 'LOGIN_OK', actorId: user.id, ip: req.ip, result: 'ok' });
  const { passwordHash, ...safeUser } = user;
  res.json({ accessToken, refreshToken, user: safeUser });
});

// ── POST /api/auth/mfa/verify ─────────────────────────────────
router.post('/mfa/verify', authLimit, (req, res) => {
  const { code, tempToken } = req.body;
  if (!code || !tempToken) return res.status(400).json({ error: 'Code and tempToken required' });

  const pending = pendingMfa.get(tempToken);
  if (!pending || pending.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'MFA session expired' });
  }

  const mfa = mfaConfigs.get(pending.userId);
  if (!mfa) return res.status(401).json({ error: 'MFA not configured' });

  let valid = false;
  if (mfa.method === 'totp') valid = verifyTotp(code, mfa.secret);
  else if (mfa.method === 'email' || mfa.method === 'sms') valid = mfa.pendingCode === code;

  if (!valid) {
    audit({ label: 'MFA_FAILED', actorId: pending.userId, ip: req.ip, result: 'denied' });
    return res.status(401).json({ error: 'Invalid MFA code' });
  }

  pendingMfa.delete(tempToken);
  const user = users.get(pending.userId);
  const payload = { id: user.id, role: user.role, tier: user.tier };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user.id });
  sessions.set(hashTokenForStorage(refreshToken), { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

  audit({ label: 'MFA_OK', actorId: user.id, ip: req.ip, result: 'ok' });
  const { passwordHash, ...safeUser } = user;
  res.json({ accessToken, refreshToken, user: safeUser });
});

// ── POST /api/auth/refresh ────────────────────────────────────
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  try {
    const payload = verifyToken(refreshToken);
    const session = sessions.get(hashTokenForStorage(refreshToken));
    if (!session || session.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'Session expired' });
    }
    const user = users.get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newAccess = signAccessToken({ id: user.id, role: user.role, tier: user.tier });
    res.json({ accessToken: newAccess });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', authenticate, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) sessions.delete(hashTokenForStorage(refreshToken));
  audit({ label: 'LOGOUT', actorId: req.user.id, ip: req.ip, result: 'ok' });
  res.json({ ok: true });
});

// ── TOTP setup ────────────────────────────────────────────────
router.post('/mfa/totp/setup', authenticate, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = generateTotpSecret();
  const uri = generateTotpUri(secret, user.email);
  const backupCodes = generateBackupCodes();

  mfaConfigs.set(user.id, { method: 'totp', secret, verified: false, backupCodes: backupCodes.map(hashBackupCode) });
  res.json({ uri, backupCodes });
});

router.post('/mfa/totp/confirm', authenticate, (req, res) => {
  const { code } = req.body;
  const mfa = mfaConfigs.get(req.user.id);
  if (!mfa || mfa.method !== 'totp') return res.status(400).json({ error: 'TOTP not set up' });

  if (!verifyTotp(code, mfa.secret)) return res.status(400).json({ error: 'Invalid code' });

  mfa.verified = true;
  mfaConfigs.set(req.user.id, mfa);
  audit({ label: 'MFA_TOTP_ENABLED', actorId: req.user.id, ip: req.ip, result: 'ok' });
  res.json({ ok: true });
});

// ── WebAuthn stubs (full impl requires @simplewebauthn/server) ──
router.post('/webauthn/register/options', authenticate, (req, res) => {
  res.json({ note: 'WebAuthn registration options — integrate @simplewebauthn/server for full passkey support' });
});

router.post('/webauthn/register/verify', authenticate, (req, res) => {
  res.json({ note: 'WebAuthn registration verify — integrate @simplewebauthn/server' });
});

router.post('/webauthn/authenticate/options', (req, res) => {
  res.json({ note: 'WebAuthn authentication options — integrate @simplewebauthn/server' });
});

router.post('/webauthn/authenticate/verify', (req, res) => {
  res.json({ note: 'WebAuthn authentication verify — integrate @simplewebauthn/server' });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
