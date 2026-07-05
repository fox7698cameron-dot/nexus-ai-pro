/**
 * src/auth/routes.js
 * Nexus AI Pro — Auth API Routes
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Mount at: /api/auth
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerUser, loginUser, verifyMfa,
  enrollMfa, confirmMfa, disableMfa,
  registerBiometric, verifyBiometric,
  refreshTokens, revokeToken,
  requireAuth, ROLES, getAuditLog, getUser, updateUser,
} from './auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, slow down.' },
});

// ─── Registration ─────────────────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const user = await registerUser({ username, email, password, role });
    res.status(201).json({ user });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message, code: err.code });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    res.json(result);
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message, code: err.code });
  }
});

// ─── MFA verification (second factor) ────────────────────────────────────────
router.post('/mfa/verify', authLimiter, async (req, res) => {
  try {
    const { mfaToken, code } = req.body;
    const result = await verifyMfa({ mfaToken, code });
    res.json(result);
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message, code: err.code });
  }
});

// ─── MFA enrollment (authenticated) ──────────────────────────────────────────
router.post('/mfa/enroll', requireAuth(), async (req, res) => {
  try {
    const result = await enrollMfa(req.user.sub);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/mfa/confirm', requireAuth(), async (req, res) => {
  try {
    const { code } = req.body;
    const result = await confirmMfa(req.user.sub, code);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/mfa/disable', requireAuth(), async (req, res) => {
  try {
    const { code } = req.body;
    const result = await disableMfa(req.user.sub, code);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// ─── Biometrics ───────────────────────────────────────────────────────────────
router.post('/biometric/register', requireAuth(), (req, res) => {
  try {
    const { credentialId, publicKey, deviceType } = req.body;
    const result = registerBiometric(req.user.sub, { credentialId, publicKey, deviceType });
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/biometric/verify', authLimiter, (req, res) => {
  try {
    const { userId, credentialId, signature } = req.body;
    const result = verifyBiometric(userId, { credentialId, signature });
    res.json(result);
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message });
  }
});

// ─── Token refresh / logout ───────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const result = refreshTokens(refreshToken);
    res.json(result);
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) revokeToken(refreshToken);
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/me', requireAuth(), (req, res) => {
  const user = getUser(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

router.patch('/me', requireAuth(), (req, res) => {
  try {
    const user = updateUser(req.user.sub, req.body);
    res.json({ user });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// ─── Admin: audit log ─────────────────────────────────────────────────────────
router.get('/audit', requireAuth(ROLES.ADMIN), (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({ log: getAuditLog(limit) });
});

export default router;
