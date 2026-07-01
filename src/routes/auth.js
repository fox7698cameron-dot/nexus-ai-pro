// ================================================
// NEXUS AI PRO - Authentication Routes
// File: src/routes/auth.js
// Updated: 2026-07-01
// Endpoints: register, login, 2FA, MFA, biometrics,
//            token refresh, logout, profile
// ================================================

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/authMiddleware.js';
import { AuthService, ROLES, MFA_METHODS } from '../services/authService.js';

const router = Router();

// ── Validation helpers ────────────────────────────────────────────────────

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
}

// Password rules exposed to client for UX
const PASSWORD_RULES = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  allowEmoji: true,
  allowUnicode: true,
};

// ── POST /api/auth/register ───────────────────────────────────────────────

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 2, max: 64 }),
    body('password').isLength({ min: 13 }),
    body('role').optional().isIn(Object.values(ROLES)),
    body('language').optional().isLocale(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { email, username, password, role = ROLES.USER, language = 'en' } = req.body;
    const authService = req.app.locals.authService;
    const db = req.app.locals.db;

    try {
      // Username validation (supports emoji/unicode)
      const usernameCheck = authService.validateUsername(username);
      if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.errors[0] });

      // Password strength validation
      const pwCheck = authService.validatePassword(password);
      if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.errors.join(' '), rules: PASSWORD_RULES });

      // Check for existing email
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

      const passwordHash = await authService.hashPassword(password);
      const userId = uuidv4();

      await db.query(
        `INSERT INTO users (id, email, username, password_hash, role, language, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [userId, email, username, passwordHash, role, language]
      );

      const { accessToken, refreshToken } = await authService.generateTokenPair({
        sub: userId, email, role, username,
      });

      return res.status(201).json({
        user: { id: userId, email, username, role, language },
        accessToken,
        refreshToken,
        passwordRules: PASSWORD_RULES,
      });
    } catch (err) {
      console.error('[auth/register]', err.message);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { email, password, mfaCode, biometricToken } = req.body;
    const authService = req.app.locals.authService;
    const db = req.app.locals.db;

    try {
      const result = await db.query(
        'SELECT id, email, username, password_hash, role, language, mfa_enabled, mfa_method, totp_secret FROM users WHERE email = $1',
        [email]
      );
      if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      const user = result.rows[0];

      const valid = await authService.verifyPassword(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      // MFA check
      if (user.mfa_enabled) {
        if (!mfaCode && !biometricToken) {
          return res.status(200).json({ requiresMFA: true, method: user.mfa_method, userId: user.id });
        }
        if (user.mfa_method === MFA_METHODS.TOTP && mfaCode) {
          const totpValid = await authService.verifyTOTP(user.id, mfaCode, user.totp_secret);
          if (!totpValid) return res.status(401).json({ error: 'Invalid MFA code' });
        }
      }

      await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      const { accessToken, refreshToken } = await authService.generateTokenPair({
        sub: user.id, email: user.email, role: user.role, username: user.username,
      });

      return res.json({
        user: { id: user.id, email: user.email, username: user.username, role: user.role, language: user.language },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error('[auth/login]', err.message);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ── POST /api/auth/refresh ────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  const authService = req.app.locals.authService;
  const db = req.app.locals.db;
  try {
    const decoded = await authService.verifyRefreshToken(refreshToken);
    const result = await db.query('SELECT id, email, username, role FROM users WHERE id = $1', [decoded.sub]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const user = result.rows[0];
    await authService.revokeToken(decoded.jti);
    const tokens = await authService.generateTokenPair({
      sub: user.id, email: user.email, role: user.role, username: user.username,
    });
    return res.json(tokens);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req, res) => {
  const authService = req.app.locals.authService;
  await authService.revokeToken(req.user.jti);
  return res.json({ success: true });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const result = await db.query(
    'SELECT id, email, username, role, language, region, mfa_enabled, mfa_method, created_at, last_login FROM users WHERE id = $1',
    [req.user.sub]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: result.rows[0] });
});

// ── POST /api/auth/2fa/setup ──────────────────────────────────────────────

router.post('/2fa/setup', requireAuth, async (req, res) => {
  const authService = req.app.locals.authService;
  try {
    const setup = await authService.setupTOTP(req.user.sub, req.user.username);
    return res.json({ secret: setup.secret, qrCode: setup.qrCode, backupCodes: setup.backupCodes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/2fa/verify ─────────────────────────────────────────────

router.post('/2fa/verify', requireAuth, [body('code').isLength({ min: 6, max: 6 }), body('secret').notEmpty()], async (req, res) => {
  if (!validate(req, res)) return;
  const { code, secret } = req.body;
  const authService = req.app.locals.authService;
  const db = req.app.locals.db;
  const valid = await authService.verifyTOTP(req.user.sub, code, secret);
  if (!valid) return res.status(400).json({ error: 'Invalid TOTP code' });
  await db.query(
    'UPDATE users SET mfa_enabled = true, mfa_method = $1, totp_secret = $2 WHERE id = $3',
    [MFA_METHODS.TOTP, secret, req.user.sub]
  );
  return res.json({ success: true, mfaEnabled: true });
});

// ── POST /api/auth/mfa/initiate ───────────────────────────────────────────

router.post('/mfa/initiate', requireAuth, async (req, res) => {
  const { method } = req.body;
  const authService = req.app.locals.authService;
  try {
    const result = await authService.initiateMFA(req.user.sub, method || MFA_METHODS.EMAIL);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/mfa/verify ─────────────────────────────────────────────

router.post('/mfa/verify', requireAuth, async (req, res) => {
  const { method, credential } = req.body;
  const authService = req.app.locals.authService;
  try {
    const valid = await authService.verifyMFA(req.user.sub, method, credential);
    return res.json({ valid });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ── POST /api/auth/biometrics/challenge ───────────────────────────────────

router.post('/biometrics/challenge', requireAuth, async (req, res) => {
  const authService = req.app.locals.authService;
  const { challenge } = await authService.generateBiometricChallenge(req.user.sub);
  return res.json({ challenge });
});

// ── POST /api/auth/biometrics/verify ─────────────────────────────────────

router.post('/biometrics/verify', requireAuth, async (req, res) => {
  const { credentialId, signature, clientDataHash } = req.body;
  const authService = req.app.locals.authService;
  try {
    const result = await authService.verifyBiometricResponse(req.user.sub, { credentialId, signature, clientDataHash });
    return res.json(result);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

// ── GET /api/auth/password-rules ──────────────────────────────────────────

router.get('/password-rules', (req, res) => res.json(PASSWORD_RULES));

export default router;
