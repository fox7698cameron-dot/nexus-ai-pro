/**
 * server/routes/auth.js
 * Nexus AI Pro — Authentication Routes
 * Labeled: 2026-08-25
 *
 * POST /api/auth/register          — create account
 * POST /api/auth/login             — password login
 * POST /api/auth/mfa/verify        — verify MFA code
 * POST /api/auth/mfa/totp/enable   — enable TOTP after first verification
 * POST /api/auth/mfa/otp/request   — request email/SMS OTP
 * POST /api/auth/biometric/register— store WebAuthn public key
 * GET  /api/auth/biometric/challenge — get challenge bytes
 * POST /api/auth/refresh           — rotate refresh token
 * POST /api/auth/logout            — revoke session
 * GET  /api/auth/me                — current user profile
 */

import express from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.js';
import {
  registerUser,
  loginUser,
  verifyMFA,
  generateEmailOTP,
  enableTOTP,
  registerBiometricCredential,
  getBiometricCredentials,
  refreshSession,
  revokeSession,
  getUserById,
  updateUserLanguage,
  updateUserRole,
  unlockUser
} from '../services/authService.js';

const router = express.Router();

// Pending biometric challenges: challengeId → { bytes, userId, expiresAt }
const biometricChallenges = new Map();

// ── Registration ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, language } = req.body;
    const result = await registerUser({ email, username, password, language });

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    // Return setup info; do not include sensitive data in logs
    return res.status(201).json({
      message:  'Registration successful',
      userId:   result.userId,
      username: result.username,
      role:     result.role,
      totpQR:   result.totpQR,   // Show once for authenticator app
      totpSecret: result.totpSecret
    });
  } catch (err) {
    console.error('[AUTH] register error:', err.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${req.headers['user-agent']}|${req.headers['accept-language']}`)
      .digest('hex');

    const result = await loginUser({ email, password, fingerprint });

    if (!result.ok) {
      return res.status(401).json({ error: result.error });
    }

    if (result.mfaRequired) {
      return res.status(200).json({
        mfaRequired: true,
        mfaToken:    result.mfaToken,
        userId:      result.userId,
        mfaMethods:  result.mfaMethods
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[AUTH] login error:', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// ── MFA verification ──────────────────────────────────────────────────────────
router.post('/mfa/verify', async (req, res) => {
  try {
    const { userId, mfaToken, code, method } = req.body;
    const result = await verifyMFA({ userId, mfaToken, code, method });

    if (!result.ok) {
      return res.status(401).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[AUTH] mfa verify error:', err.message);
    return res.status(500).json({ error: 'MFA verification failed' });
  }
});

// ── TOTP enable ───────────────────────────────────────────────────────────────
router.post('/mfa/totp/enable', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const result   = enableTOTP(req.user.sub, code);

    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.status(200).json({ message: 'TOTP enabled successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to enable TOTP' });
  }
});

// ── Email/SMS OTP request ─────────────────────────────────────────────────────
router.post('/mfa/otp/request', async (req, res) => {
  try {
    const { userId } = req.body;
    // In production: call email/SMS service with the generated OTP
    // OTP is generated but delivery is handled externally
    const _otp = generateEmailOTP(userId);
    // Log: console.log('[AUTH] OTP generated for', userId, '— deliver via email/SMS service')
    return res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ── Biometric challenge ───────────────────────────────────────────────────────
router.get('/biometric/challenge', requireAuth, (req, res) => {
  const challengeBytes = crypto.randomBytes(32).toString('base64url');
  const challengeId    = crypto.randomBytes(16).toString('hex');

  biometricChallenges.set(challengeId, {
    bytes:     challengeBytes,
    userId:    req.user.sub,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  // Clean old challenges
  for (const [id, c] of biometricChallenges) {
    if (Date.now() > c.expiresAt) biometricChallenges.delete(id);
  }

  return res.json({ challengeId, challenge: challengeBytes });
});

// ── Biometric registration ────────────────────────────────────────────────────
router.post('/biometric/register', requireAuth, (req, res) => {
  try {
    const { challengeId, credential } = req.body;
    const pending = biometricChallenges.get(challengeId);

    if (!pending || Date.now() > pending.expiresAt) {
      return res.status(400).json({ error: 'Challenge expired' });
    }
    if (pending.userId !== req.user.sub) {
      return res.status(403).json({ error: 'Challenge mismatch' });
    }

    biometricChallenges.delete(challengeId);

    const result = registerBiometricCredential(req.user.sub, credential);
    if (!result.ok) return res.status(400).json({ error: result.error });

    return res.status(201).json({ message: 'Biometric credential registered', credentialId: result.credentialId });
  } catch (err) {
    return res.status(500).json({ error: 'Biometric registration failed' });
  }
});

// ── Token refresh ─────────────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const result = refreshSession(refreshToken);
    if (!result.ok) return res.status(401).json({ error: result.error });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Session refresh failed' });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) revokeSession(refreshToken);
  return res.status(200).json({ message: 'Logged out' });
});

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

router.patch('/me/language', requireAuth, (req, res) => {
  const { language } = req.body;
  const result = updateUserLanguage(req.user.sub, language);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json({ message: 'Language updated' });
});

// ── Admin-only: role management ───────────────────────────────────────────────
router.patch('/users/:userId/role', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const result = updateUserRole(req.params.userId, req.body.role, req.user);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json({ message: 'Role updated' });
});

router.post('/users/:userId/unlock', requireAuth, requireRole(ROLES.MODERATOR), (req, res) => {
  const result = unlockUser(req.params.userId, req.user);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json({ message: 'User unlocked' });
});

export default router;
