// src/routes/auth.routes.js
// Nexus AI Pro - Authentication API Routes
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import { Router } from 'express';
import { body, validationResult } from 'express-validator';

export function createAuthRouter(authService) {
  const router = Router();

  // ─── Register ────────────────────────────────────────────────────────────────
  router.post(
    '/register',
    [
      body('username').isString().trim().notEmpty(),
      body('email').isEmail().normalizeEmail(),
      body('password').isString().isLength({ min: 13 }),
      body('role').optional().isString(),
      body('locale').optional().isString().isLength({ max: 5 }),
    ],
    async (req, res) => {
      const errs = validationResult(req);
      if (!errs.isEmpty()) {
        return res.status(400).json({ errors: errs.array().map(e => e.msg) });
      }
      const { username, email, password, role, locale } = req.body;
      const result = await authService.register({ username, email, password, role, locale });
      if (!result.ok) return res.status(400).json({ errors: result.errors });
      res.status(201).json({ message: 'Account created', userId: result.userId, role: result.role });
    }
  );

  // ─── Login ────────────────────────────────────────────────────────────────────
  router.post(
    '/login',
    [
      body('email').isEmail().normalizeEmail(),
      body('password').isString().notEmpty(),
    ],
    async (req, res) => {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: 'Invalid request' });
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      if (!result.ok) return res.status(401).json({ error: result.error });
      res.json(result);
    }
  );

  // ─── Token refresh ────────────────────────────────────────────────────────────
  router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const result = await authService.refreshTokens(refreshToken);
    if (!result.ok) return res.status(401).json({ error: result.error });
    res.json(result);
  });

  // ─── MFA setup (TOTP) ─────────────────────────────────────────────────────────
  router.post('/mfa/setup', authService.requireAuth(), async (req, res) => {
    const result = await authService.setupTOTP(req.user.sub);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ secret: result.secret, qrCode: result.qrCode });
  });

  // ─── MFA enable ───────────────────────────────────────────────────────────────
  router.post(
    '/mfa/enable',
    authService.requireAuth(),
    [body('token').isString().isLength({ min: 6, max: 6 })],
    async (req, res) => {
      const { token } = req.body;
      const result = await authService.enableMFA(req.user.sub, token);
      if (!result.ok) return res.status(400).json({ error: result.error });
      res.json({ message: 'MFA enabled' });
    }
  );

  // ─── MFA verify (login step 2) ────────────────────────────────────────────────
  router.post(
    '/mfa/verify',
    [
      body('mfaToken').isString().notEmpty(),
      body('code').isString().isLength({ min: 6, max: 6 }),
    ],
    async (req, res) => {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: 'Invalid request' });
      const { mfaToken, code } = req.body;
      const result = await authService.completeMFALogin(mfaToken, code);
      if (!result.ok) return res.status(401).json({ error: result.error });
      res.json(result);
    }
  );

  // ─── Biometric challenge ──────────────────────────────────────────────────────
  router.post('/biometric/challenge', (req, res) => {
    const challenge = Buffer.from(require('crypto').randomBytes(32)).toString('base64');
    res.json({ challenge });
  });

  // ─── Biometric register ───────────────────────────────────────────────────────
  router.post(
    '/biometric/register',
    authService.requireAuth(),
    [
      body('type').isIn(['fingerprint', 'face_id', 'touch_id', 'retinal']),
      body('publicKey').isString().notEmpty(),
    ],
    async (req, res) => {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: 'Invalid biometric data' });
      const { type, publicKey, challenge } = req.body;
      const result = await authService.registerBiometric(req.user.sub, { type, publicKey, challenge });
      if (!result.ok) return res.status(400).json({ error: result.error });
      res.json({ message: 'Biometric registered' });
    }
  );

  // ─── Biometric verify (passwordless login) ────────────────────────────────────
  router.post('/biometric/verify', async (req, res) => {
    const { userId, publicKey } = req.body;
    if (!userId || !publicKey) return res.status(400).json({ error: 'Missing biometric data' });
    const valid = await authService.verifyBiometric(userId, { publicKey });
    if (!valid) return res.status(401).json({ error: 'Biometric verification failed' });
    const user = await authService.getUser(userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const tokens = authService._issueTokens(user);
    res.json(tokens);
  });

  // ─── Get profile ──────────────────────────────────────────────────────────────
  router.get('/me', authService.requireAuth(), async (req, res) => {
    const user = await authService.getUser(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  // ─── Update locale ────────────────────────────────────────────────────────────
  router.put(
    '/locale',
    authService.requireAuth(),
    [body('locale').isString().isLength({ min: 2, max: 5 })],
    async (req, res) => {
      await authService.updateUserLocale(req.user.sub, req.body.locale);
      res.json({ message: 'Locale updated' });
    }
  );

  return router;
}
