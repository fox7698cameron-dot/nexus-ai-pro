/**
 * @file auth.js  (routes)
 * @description Express router for all authentication endpoints.
 *   Registration, login, token refresh, logout, MFA, and biometrics.
 * @created 2026-08-04
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  rotateTokens,
  logoutUser,
  setupMFA,
  verifyAndActivateMFA,
  generateBiometricChallenge,
  verifyBiometricAssertion,
  getUserById,
  updateUserProfile,
  ROLES,
} from '../auth/authService.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

/** Strict limiter for login / register — 10 requests per 15 minutes per IP */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/** Moderate limiter for MFA / biometric endpoints */
const mfaLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/** Light limiter for token refresh / logout */
const tokenLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  /** Username accepts any Unicode string including emoji */
  username: z.string().min(1, 'Username is required').max(64, 'Username too long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(13, 'Password must be at least 13 characters'),
  role: z.enum(/** @type {[string, ...string[]]} */ (ROLES)).optional().default('user'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const mfaVerifySchema = z.object({
  token: z.string().length(6, 'TOTP token must be 6 digits').regex(/^\d+$/, 'Must be numeric'),
});

const biometricVerifySchema = z.object({
  assertion: z.object({
    id: z.string(),
    rawId: z.string().optional(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string().optional(),
      signature: z.string().optional(),
    }),
    type: z.literal('public-key').optional(),
  }),
});

const updateProfileSchema = z.object({
  username: z.string().min(1).max(64).optional(),
  email: z.string().email().optional(),
}).refine(data => data.username !== undefined || data.email !== undefined, {
  message: 'At least one field (username or email) must be provided.',
});

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the client IP from the request, preferring X-Forwarded-For.
 * @param {import('express').Request} req
 * @returns {string}
 */
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Validates a Zod schema against req.body, responding 400 on failure.
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @returns {T | null}  parsed data, or null if invalid (response already sent)
 */
function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed.',
      details: result.error.flatten().fieldErrors,
    });
    return null;
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------

/**
 * @route  POST /auth/register
 * @access Public
 * @body   { username, email, password, role? }
 * @returns { user, accessToken, refreshToken }
 */
router.post('/register', strictLimiter, async (req, res) => {
  const data = parseBody(registerSchema, req, res);
  if (!data) return;

  try {
    const result = await registerUser(data, { ip: clientIp(req) });
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status ?? 500;
    // Never expose stack traces; enumerate-safe messaging already handled in service
    return res.status(status).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

/**
 * @route  POST /auth/login
 * @access Public
 * @body   { email, password }
 * @returns { user, accessToken, refreshToken, mfaRequired }
 */
router.post('/login', strictLimiter, async (req, res) => {
  const data = parseBody(loginSchema, req, res);
  if (!data) return;

  try {
    const result = await loginUser(data, { ip: clientIp(req) });
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /refresh
// ---------------------------------------------------------------------------

/**
 * @route  POST /auth/refresh
 * @access Public (refresh token required)
 * @body   { refreshToken }
 * @returns { accessToken, refreshToken }
 */
router.post('/refresh', tokenLimiter, (req, res) => {
  const data = parseBody(refreshSchema, req, res);
  if (!data) return;

  try {
    const tokens = rotateTokens(data.refreshToken, { ip: clientIp(req) });
    return res.status(200).json(tokens);
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------

/**
 * @route  POST /auth/logout
 * @access Public (refresh token required)
 * @body   { refreshToken }
 */
router.post('/logout', tokenLimiter, (req, res) => {
  const data = parseBody(logoutSchema, req, res);
  if (!data) return;

  logoutUser(data.refreshToken, { ip: clientIp(req) });
  return res.status(204).send();
});

// ---------------------------------------------------------------------------
// POST /mfa/setup
// ---------------------------------------------------------------------------

/**
 * @route  POST /auth/mfa/setup
 * @access Private (authenticated)
 * @returns { secret, otpauthUrl }
 */
router.post('/mfa/setup', mfaLimiter, authenticate, (req, res) => {
  try {
    const result = setupMFA(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /mfa/verify
// ---------------------------------------------------------------------------

/**
 * @route  POST /auth/mfa/verify
 * @access Private (authenticated, MFA pending)
 * @body   { token }
 * @returns { mfaEnabled, accessToken }
 */
router.post('/mfa/verify', mfaLimiter, authenticate, (req, res) => {
  const data = parseBody(mfaVerifySchema, req, res);
  if (!data) return;

  try {
    const result = verifyAndActivateMFA(req.user.id, data.token, {
      ip: clientIp(req),
      sessionId: req.user.jti,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /biometric/register
// ---------------------------------------------------------------------------

/**
 * @route  POST /auth/biometric/register
 * @access Private (authenticated)
 * @returns { challenge, userId, rpName, rpId }
 */
router.post('/biometric/register', mfaLimiter, authenticate, (req, res) => {
  try {
    const result = generateBiometricChallenge(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /biometric/verify
// ---------------------------------------------------------------------------

/**
 * @route  POST /auth/biometric/verify
 * @access Private (authenticated, challenge active)
 * @body   { assertion }
 * @returns { verified, accessToken }
 */
router.post('/biometric/verify', mfaLimiter, authenticate, (req, res) => {
  const data = parseBody(biometricVerifySchema, req, res);
  if (!data) return;

  try {
    const result = verifyBiometricAssertion(req.user.id, data.assertion, {
      ip: clientIp(req),
      sessionId: req.user.jti,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

/**
 * @route  GET /auth/me
 * @access Private (authenticated)
 * @returns {Partial<UserRecord>}
 */
router.get('/me', authenticate, (req, res) => {
  try {
    const user = getUserById(req.user.id);
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /me
// ---------------------------------------------------------------------------

/**
 * @route  PUT /auth/me
 * @access Private (authenticated)
 * @body   { username?, email? }   - username supports emoji/Unicode
 * @returns {Partial<UserRecord>}
 */
router.put('/me', authenticate, (req, res) => {
  const data = parseBody(updateProfileSchema, req, res);
  if (!data) return;

  try {
    const user = updateUserProfile(req.user.id, data);
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
