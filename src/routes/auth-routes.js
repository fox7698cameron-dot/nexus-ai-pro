// src/routes/auth-routes.js
// Date: 2026-07-08
// Auth routes: register, login, 2FA, biometrics, MFA, token refresh

import express from 'express';
import rateLimit from 'express-rate-limit';
import { createAuthMiddleware, requireRole } from '../middleware/auth-middleware.js';
import { ROLES } from '../services/auth-service.js';

const authStrictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' }
});

export function createAuthRouter(authService) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(authService);

  // POST /api/auth/register
  router.post('/register', authStrictLimiter, async (req, res) => {
    try {
      const { username, email, password, language, region } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email, and password are required' });
      }
      const result = await authService.register({ username, email, password, language, region });
      if (!result.success) {
        return res.status(400).json({ error: 'Registration failed', errors: result.errors });
      }
      res.status(201).json({ message: 'Registration successful', userId: result.user.id, user: result.user });
    } catch (err) {
      res.status(500).json({ error: 'Registration error' });
    }
  });

  // POST /api/auth/login
  router.post('/login', authStrictLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
      }
      const ip = req.ip;
      const ua = req.headers['user-agent'] || '';
      const result = await authService.login(email, password, ip, ua);

      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }

      if (result.requiresMfa) {
        return res.json({ requiresMfa: true, pendingToken: result.pendingToken, mfaMethods: result.mfaMethods });
      }

      res.json({ tokens: result.tokens, user: result.user });
    } catch (err) {
      res.status(500).json({ error: 'Login error' });
    }
  });

  // POST /api/auth/refresh
  router.post('/refresh', authLimiter, async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
      const result = await authService.refreshTokens(refreshToken);
      if (!result.success) return res.status(401).json({ error: result.error });
      res.json(result.tokens);
    } catch {
      res.status(500).json({ error: 'Token refresh error' });
    }
  });

  // POST /api/auth/2fa/setup
  router.post('/2fa/setup', authenticate, async (req, res) => {
    try {
      const result = await authService.setupTwoFactor(req.user.id);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json({ secret: result.secret, qrCode: result.qrCode });
    } catch {
      res.status(500).json({ error: '2FA setup error' });
    }
  });

  // POST /api/auth/2fa/confirm
  router.post('/2fa/confirm', authenticate, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Verification code required' });
      const result = await authService.confirmTwoFactor(req.user.id, code);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json({ success: true, backupCodes: result.backupCodes });
    } catch {
      res.status(500).json({ error: '2FA confirmation error' });
    }
  });

  // POST /api/auth/2fa/verify
  router.post('/2fa/verify', authStrictLimiter, async (req, res) => {
    try {
      const { pendingToken, code, userId } = req.body;
      if (!pendingToken || !code || !userId) {
        return res.status(400).json({ error: 'pendingToken, code, and userId are required' });
      }
      const result = await authService.verifyTwoFactor(pendingToken, code, userId);
      if (!result.success) return res.status(401).json({ error: result.error });
      res.json({ tokens: result.tokens, user: result.user });
    } catch {
      res.status(500).json({ error: '2FA verification error' });
    }
  });

  // POST /api/auth/biometric/register
  router.post('/biometric/register', authenticate, async (req, res) => {
    try {
      const { credentialType, credentialData } = req.body;
      if (!credentialType || !credentialData) {
        return res.status(400).json({ error: 'credentialType and credentialData required' });
      }
      const result = await authService.registerBiometric(req.user.id, credentialType, credentialData);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json({ success: true, credentialId: result.credentialId });
    } catch {
      res.status(500).json({ error: 'Biometric registration error' });
    }
  });

  // POST /api/auth/biometric/verify
  router.post('/biometric/verify', authStrictLimiter, async (req, res) => {
    try {
      const { userId, credentialType, credentialData } = req.body;
      if (!userId || !credentialType || !credentialData) {
        return res.status(400).json({ error: 'userId, credentialType, credentialData required' });
      }
      const result = await authService.verifyBiometric(userId, credentialType, credentialData);
      if (!result.success) return res.status(401).json({ error: result.error });
      res.json({ tokens: result.tokens, user: result.user });
    } catch {
      res.status(500).json({ error: 'Biometric verification error' });
    }
  });

  // POST /api/auth/change-password
  router.post('/change-password', authenticate, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'currentPassword and newPassword required' });
      }
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      if (!result.success) return res.status(400).json({ error: result.error, errors: result.errors });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Password change error' });
    }
  });

  // GET /api/auth/password-strength
  router.get('/password-strength', authLimiter, (req, res) => {
    const { password } = req.query;
    if (!password) return res.status(400).json({ error: 'password query param required' });
    res.json(authService.getPasswordStrength(password));
  });

  // GET /api/auth/me
  router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
  });

  // ---- Admin-only routes ----

  // POST /api/auth/admin/assign-role
  router.post('/admin/assign-role', authenticate, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
      const { targetUserId, role } = req.body;
      if (!targetUserId || !role) return res.status(400).json({ error: 'targetUserId and role required' });
      const result = await authService.assignRole(req.user.id, targetUserId, role);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Role assignment error' });
    }
  });

  return router;
}
