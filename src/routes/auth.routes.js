// src/routes/auth.routes.js
// Authentication endpoints — register, login, refresh, MFA setup, biometrics
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { Router } from 'express';
import crypto from 'crypto';
import { validateBody, Schemas } from '../middleware/validate.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { hashPassword, safeVerifyPassword, validatePasswordStrength } from '../auth/password.service.js';
import { signAccessToken, signRefreshToken, verifyRefreshTokenJwt, hashRefreshToken, TOKEN_TYPE } from '../auth/auth.service.js';
import { generateTotpSecret, generateTotpQrCode, verifyTotpToken, generateBackupCodes, verifyBackupCode, generateOtpCode, verifyOtpCode } from '../auth/mfa.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import { AUDIT_EVENTS, MFA_METHODS } from '../config/constants.js';

const router = Router();

// In-memory user store (replace with DB queries in production)
const _users = new Map();
const _sessions = new Map();

function getClientInfo(req) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

// ─── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', validateBody(Schemas.register), async (req, res) => {
  try {
    const { username, email, password, displayName, locale } = req.body;

    if (_users.has(email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(422).json({ error: 'Weak password', failed: strength.failed });
    }

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();

    const user = {
      id: userId,
      username,
      email: email.toLowerCase(),
      passwordHash,
      displayName: displayName ?? username,
      role: 'user',
      plan: 'free',
      locale: locale ?? 'en',
      isActive: true,
      mfa: { enabled: false, methods: [] },
      createdAt: new Date().toISOString(),
    };
    _users.set(email.toLowerCase(), user);

    const accessToken = signAccessToken(user);
    const { rawToken: refreshRaw, hash: refreshHash } = signRefreshToken(userId);
    _sessions.set(refreshHash, { userId, createdAt: new Date().toISOString() });

    logAuditEvent({ userId, event: AUDIT_EVENTS.USER_REGISTER, ...getClientInfo(req) });

    return res.status(201).json({
      user: { id: userId, username, email: user.email, role: user.role, plan: user.plan },
      accessToken,
      refreshToken: refreshRaw,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', validateBody(Schemas.login), async (req, res) => {
  const { email, password, mfaToken, mfaMethod } = req.body;
  const user = _users.get(email.toLowerCase());
  const { ip, userAgent } = getClientInfo(req);

  // Always run password check to prevent timing attacks
  const passwordMatch = user ? await safeVerifyPassword(password, user.passwordHash) : await safeVerifyPassword(password, '$2a$12$invalidhashpadding000000000000000000000000000000000000');

  if (!user || !passwordMatch) {
    if (user) logAuditEvent({ userId: user.id, event: AUDIT_EVENTS.USER_LOGIN, ip, result: 'failure' });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: 'Account suspended' });
  }

  // MFA check
  if (user.mfa?.enabled) {
    if (!mfaToken) {
      return res.status(200).json({ mfaRequired: true, mfaMethods: user.mfa.methods });
    }
    const method = mfaMethod ?? MFA_METHODS.TOTP;
    let mfaValid = false;

    if (method === MFA_METHODS.TOTP && user.mfa.totpSecretEnc) {
      mfaValid = verifyTotpToken(mfaToken, user.mfa.totpSecretEnc);
    } else if (method === MFA_METHODS.BACKUP_CODE && user.mfa.backupHashes) {
      const result = await verifyBackupCode(mfaToken, user.mfa.backupHashes);
      mfaValid = result.valid;
      if (mfaValid) user.mfa.backupHashes.splice(result.usedIndex, 1); // invalidate used code
    }

    if (!mfaValid) {
      logAuditEvent({ userId: user.id, event: AUDIT_EVENTS.USER_MFA_VERIFY, ip, result: 'failure' });
      return res.status(401).json({ error: 'Invalid MFA token' });
    }
    logAuditEvent({ userId: user.id, event: AUDIT_EVENTS.USER_MFA_VERIFY, ip, result: 'success' });
  }

  const accessToken = signAccessToken(user);
  const { rawToken: refreshRaw, hash: refreshHash } = signRefreshToken(user.id);
  _sessions.set(refreshHash, { userId: user.id, createdAt: new Date().toISOString() });

  logAuditEvent({ userId: user.id, event: AUDIT_EVENTS.USER_LOGIN, ip });

  return res.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role, plan: user.plan },
    accessToken,
    refreshToken: refreshRaw,
  });
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const raw = req.body?.refreshToken;
  if (!raw) return res.status(400).json({ error: 'Refresh token required' });
  try {
    verifyRefreshTokenJwt(raw); // verify signature + expiry
    const hash = hashRefreshToken(raw);
    const session = _sessions.get(hash);
    if (!session) return res.status(401).json({ error: 'Session not found or revoked' });

    // Find user
    const user = [..._users.values()].find(u => u.id === session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  const raw = req.body?.refreshToken;
  if (raw) {
    const hash = hashRefreshToken(raw);
    _sessions.delete(hash);
  }
  logAuditEvent({ userId: req.user.sub, event: AUDIT_EVENTS.USER_LOGOUT, ...getClientInfo(req) });
  return res.json({ message: 'Logged out' });
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = [..._users.values()].find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, mfa, ...safe } = user;
  return res.json({ ...safe, mfaEnabled: mfa?.enabled ?? false });
});

// ─── POST /api/auth/mfa/setup ──────────────────────────────────────────────
router.post('/mfa/setup', requireAuth, async (req, res) => {
  const user = [..._users.values()].find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { encryptedSecret, otpauth } = generateTotpSecret(user.email);
  const qrCode = await generateTotpQrCode(otpauth);
  const { codes: backupCodes, hashes: backupHashes } = await generateBackupCodes();

  user.mfa = {
    ...user.mfa,
    pendingTotpSecretEnc: encryptedSecret,
    backupHashes,
  };

  return res.json({ qrCode, backupCodes, message: 'Verify TOTP token to enable MFA' });
});

// ─── POST /api/auth/mfa/verify-setup ──────────────────────────────────────
router.post('/mfa/verify-setup', requireAuth, async (req, res) => {
  const user = [..._users.values()].find(u => u.id === req.user.sub);
  if (!user?.mfa?.pendingTotpSecretEnc) return res.status(400).json({ error: 'No pending MFA setup' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const valid = verifyTotpToken(token, user.mfa.pendingTotpSecretEnc);
  if (!valid) return res.status(401).json({ error: 'Invalid token' });

  user.mfa.totpSecretEnc = user.mfa.pendingTotpSecretEnc;
  delete user.mfa.pendingTotpSecretEnc;
  user.mfa.enabled = true;
  user.mfa.methods = [MFA_METHODS.TOTP, MFA_METHODS.BACKUP_CODE];

  logAuditEvent({ userId: user.id, event: AUDIT_EVENTS.USER_MFA_ENABLE, ...getClientInfo(req) });
  return res.json({ message: 'MFA enabled successfully' });
});

// ─── POST /api/auth/mfa/disable ────────────────────────────────────────────
router.post('/mfa/disable', requireAuth, async (req, res) => {
  const user = [..._users.values()].find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password } = req.body;
  if (!await safeVerifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  user.mfa = { enabled: false, methods: [] };
  return res.json({ message: 'MFA disabled' });
});

// ─── POST /api/auth/password/check-strength ───────────────────────────────
router.post('/password/check-strength', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  return res.json(validatePasswordStrength(password));
});

// ─── POST /api/auth/password/change ───────────────────────────────────────
router.post('/password/change', requireAuth, validateBody(Schemas.changePassword), async (req, res) => {
  const user = [..._users.values()].find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { currentPassword, newPassword } = req.body;
  if (!await safeVerifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }
  user.passwordHash = await hashPassword(newPassword);
  logAuditEvent({ userId: user.id, event: AUDIT_EVENTS.USER_PASSWORD_CHANGE, ...getClientInfo(req) });
  return res.json({ message: 'Password changed successfully' });
});

export default router;
