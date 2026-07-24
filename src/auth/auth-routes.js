// src/auth/auth-routes.js
// 2026-07-24 | Nexus AI Pro - Auth API Routes

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ROLES } from './auth-service.js';

const strictLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, slow down.' },
});

// requireAuth middleware factory
export function requireAuth(authService) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const payload = authService.verifyToken(header.slice(7));
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.user = payload;
    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

export function createAuthRouter(authService) {
  const router = Router();
  const auth = requireAuth(authService);

  // Register
  router.post('/register', strictLimit, async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required.' });
    }
    const result = await authService.register({ username, email, password });
    if (!result.success) return res.status(400).json({ error: result.error });
    res.status(201).json(result);
  });

  // Login
  router.post('/login', strictLimit, async (req, res) => {
    const { email, password, totpToken } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }
    const result = await authService.login({ email, password, totpToken });
    if (!result.success) return res.status(401).json(result);
    res.json(result);
  });

  // Refresh token
  router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required.' });
    const result = authService.refreshAccess(refreshToken);
    if (!result.success) return res.status(401).json({ error: result.error });
    res.json(result);
  });

  // Logout
  router.post('/logout', (req, res) => {
    const { refreshToken } = req.body;
    authService.logout(refreshToken);
    res.json({ success: true });
  });

  // Current user
  router.get('/me', auth, (req, res) => {
    const user = authService.data.getUser(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(authService._publicUser(user));
  });

  // MFA setup
  router.post('/mfa/setup', auth, (req, res) => {
    const result = authService.setupMfa(req.user.sub);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // MFA confirm
  router.post('/mfa/confirm', auth, (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required.' });
    const result = authService.confirmMfa(req.user.sub, token);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // MFA disable
  router.post('/mfa/disable', auth, (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required.' });
    const result = authService.disableMfa(req.user.sub, token);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // WebAuthn: get challenge
  router.get('/webauthn/challenge', auth, (req, res) => {
    const challenge = authService.generateWebAuthnChallenge(req.user.sub);
    res.json({ challenge });
  });

  // WebAuthn: register credential
  router.post('/webauthn/register', auth, (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential required.' });
    const result = authService.registerWebAuthnCredential(req.user.sub, credential);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // Password strength
  router.post('/password-strength', (req, res) => {
    const { password } = req.body;
    const score = authService.passwordStrength(password || '');
    const valid = authService.validatePassword(password || '');
    res.json({ score, valid: valid.valid, reason: valid.reason });
  });

  // Admin: list users
  router.get('/users', auth, requireRole(ROLES.ADMIN, ROLES.MODERATOR), (req, res) => {
    const users = authService.data.listUsers();
    res.json(users.map(u => authService._publicUser(u)));
  });

  // Admin: update user role
  router.put('/users/:userId/role', auth, requireRole(ROLES.ADMIN), (req, res) => {
    const { role } = req.body;
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    const user = authService.data.getUser(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.role = role;
    authService.data.storeUser(user.id, user);
    authService.security.logAudit('ROLE_CHANGE', { targetUserId: user.id, newRole: role, byAdmin: req.user.sub });
    res.json({ success: true, user: authService._publicUser(user) });
  });

  return router;
}
