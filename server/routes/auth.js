/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * server/routes/auth.js
 * Auth routes: register, login, MFA, biometric, token refresh, logout.
 * Date: 2026-08-29
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  register,
  login,
  completeMfaLogin,
  enableMfa,
  disableMfa,
  registerBiometric,
  authenticateBiometric,
  refreshAccessToken,
  revokeAllTokens,
  getUser,
  updateProfile,
  changePassword,
  setRole,
} from '../services/authService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// ── Validation schemas ─────────────────────────────────────────────────────
const registerSchema = z.object({
  username: z.string().min(2).max(64),
  email:    z.string().email(),
  password: z.string().min(13),
  role:     z.enum(['user', 'moderator', 'developer', 'admin']).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const mfaCompleteSchema = z.object({
  tempToken:  z.string(),
  totpToken:  z.string().length(6),
});

const biometricRegisterSchema = z.object({
  credentialId: z.string(),
  publicKey:    z.string(),
  counter:      z.number().int().nonnegative().optional(),
  device:       z.string().optional(),
});

const biometricAuthSchema = z.object({
  credentialId:      z.string(),
  userId:            z.string().uuid(),
  assertionResponse: z.object({
    authenticatorData: z.object({ signCount: z.number().int().nonnegative() }).optional(),
  }).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(13),
});

const updateProfileSchema = z.object({
  username: z.string().min(2).max(64).optional(),
  email:    z.string().email().optional(),
});

const setRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  newRole:      z.enum(['user', 'moderator', 'developer', 'admin']),
});

// ── Error helper ───────────────────────────────────────────────────────────
function handleError(res, err) {
  const code   = err.code ?? 'INTERNAL_ERROR';
  const status = {
    INVALID_CREDENTIALS:   401,
    INVALID_TOKEN:         401,
    TOKEN_REVOKED:         401,
    UNAUTHENTICATED:       401,
    FORBIDDEN:             403,
    USER_NOT_FOUND:        404,
    EMAIL_TAKEN:           409,
    CREDENTIAL_EXISTS:     409,
    INVALID_ROLE:          400,
    INVALID_USERNAME:      400,
    INVALID_EMAIL:         400,
    WEAK_PASSWORD:         400,
    MFA_NOT_CONFIGURED:    400,
    INVALID_TOTP:          401,
    REPLAY_ATTACK:         403,
  }[code] ?? 500;

  return res.status(status).json({ error: err.message, code });
}

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  try {
    const result = await register(parsed.data);
    return res.status(201).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  try {
    const result = await login(parsed.data);
    return res.json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/mfa/complete ────────────────────────────────────────────
router.post('/mfa/complete', (req, res) => {
  const parsed = mfaCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  try {
    const result = completeMfaLogin(parsed.data);
    return res.json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/mfa/enable  (authenticated) ────────────────────────────
router.post('/mfa/enable', requireAuth, (req, res) => {
  try {
    const result = enableMfa(req.user.sub);
    return res.json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/mfa/disable  (authenticated) ───────────────────────────
router.post('/mfa/disable', requireAuth, (req, res) => {
  try {
    disableMfa(req.user.sub);
    return res.json({ success: true });
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/biometric/register  (authenticated) ────────────────────
router.post('/biometric/register', requireAuth, (req, res) => {
  const parsed = biometricRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  try {
    registerBiometric(req.user.sub, parsed.data);
    return res.json({ success: true });
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/biometric/authenticate ─────────────────────────────────
router.post('/biometric/authenticate', (req, res) => {
  const parsed = biometricAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  try {
    const result = authenticateBiometric(parsed.data);
    return res.json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/refresh ─────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'refreshToken required', code: 'MISSING_TOKEN' });
  }
  try {
    const result = refreshAccessToken(refreshToken);
    return res.json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/logout  (authenticated) ────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  revokeAllTokens(req.user.sub);
  return res.json({ success: true });
});

// ── GET /api/auth/me  (authenticated) ─────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = getUser(req.user.sub);
    return res.json(user);
  } catch (err) {
    return handleError(res, err);
  }
});

// ── PATCH /api/auth/profile  (authenticated) ──────────────────────────────
router.patch('/profile', requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  try {
    const user = await updateProfile(req.user.sub, parsed.data);
    return res.json(user);
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/change-password  (authenticated) ───────────────────────
router.post('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  try {
    await changePassword(req.user.sub, parsed.data);
    return res.json({ success: true, message: 'Password changed. All sessions revoked.' });
  } catch (err) {
    return handleError(res, err);
  }
});

// ── POST /api/auth/admin/set-role  (admin only) ───────────────────────────
router.post('/admin/set-role', requireAuth, requireRole('admin'), (req, res) => {
  const parsed = setRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  try {
    const user = setRole(req.user.sub, parsed.data.targetUserId, parsed.data.newRole);
    return res.json(user);
  } catch (err) {
    return handleError(res, err);
  }
});

export default router;
