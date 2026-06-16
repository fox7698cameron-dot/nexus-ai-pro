// File: auth.js | Date: 2026-06-16
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import authService from '../services/authService.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// --- Rate limiters ---
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many registration attempts. Please try again in 15 minutes.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Zod schemas ---
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(13, 'Password must be at least 13 characters'),
  username: z.string().min(3).max(30),
  displayName: z.string().max(100).optional(),
  role: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(13, 'New password must be at least 13 characters'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(13, 'New password must be at least 13 characters'),
});

const mfaVerifySchema = z.object({
  code: z.string().min(6).max(8),
});

const biometricSetupSchema = z.object({
  credentialId: z.string(),
  publicKey: z.string().optional(),
  type: z.string().optional(),
});

const biometricVerifySchema = z.object({
  userId: z.string().uuid(),
  credentialId: z.string(),
  assertion: z.any().optional(),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validated = result.data;
    next();
  };
}

// POST /register
router.post('/register', registerLimiter, validate(registerSchema), async (req, res) => {
  try {
    const result = await authService.register(req.validated);
    res.status(201).json(result);
  } catch (err) {
    const status = err.message.includes('already exists') ? 409 : 400;
    res.status(status).json({ error: err.message });
  }
});

// POST /login
router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validated;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// POST /refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
    const tokens = await authService.refreshTokens(refreshToken);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// POST /logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.token) await authService.blacklistToken(req.token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /me
router.get('/me', authenticate, (req, res) => {
  const user = authService.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /me
router.put('/me', authenticate, async (req, res) => {
  try {
    const updated = await authService.updateProfile(req.user.id, req.body);
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /mfa/setup
router.post('/mfa/setup', authenticate, async (req, res) => {
  try {
    const result = await authService.setupMFA(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /mfa/verify
router.post('/mfa/verify', authenticate, validate(mfaVerifySchema), async (req, res) => {
  try {
    const result = await authService.verifyMFACode(req.user.id, req.validated.code);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /mfa/disable
router.post('/mfa/disable', authenticate, validate(mfaVerifySchema), async (req, res) => {
  try {
    const { valid } = await authService.verifyMFACode(req.user.id, req.validated.code);
    if (!valid) return res.status(401).json({ error: 'Invalid MFA code' });
    // Disable MFA
    const user = authService.getUserById(req.user.id);
    if (user) user.mfaEnabled = false;
    res.json({ success: true, mfaEnabled: false });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /biometric/setup
router.post('/biometric/setup', authenticate, validate(biometricSetupSchema), async (req, res) => {
  try {
    const result = await authService.setupBiometric(req.user.id, req.validated);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /biometric/verify (public — used for biometric login)
router.post('/biometric/verify', validate(biometricVerifySchema), async (req, res) => {
  try {
    const { userId, credentialId, assertion } = req.validated;
    const result = await authService.verifyBiometric(userId, { credentialId, ...assertion });
    if (!result.valid) return res.status(401).json({ error: 'Biometric verification failed' });

    // Generate tokens on successful biometric login
    const user = authService.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const accessToken = authService.generateJWT({
      sub: user.id, email: user.email, role: user.role, username: user.username, type: 'access',
    });
    const refreshToken = authService.generateJWT({ sub: user.id, type: 'refresh' }, '7d');

    res.json({ user, accessToken, refreshToken });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /password/change
router.post('/password/change', authenticate, validate(passwordChangeSchema), async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.validated;
    const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /password/reset-request
router.post('/password/reset-request', loginLimiter, validate(passwordResetRequestSchema), async (req, res) => {
  try {
    const result = await authService.requestPasswordReset(req.validated.email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /password/reset
router.post('/password/reset', validate(passwordResetSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.validated;
    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
