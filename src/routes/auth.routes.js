// /home/user/nexus-ai-pro/src/routes/auth.routes.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { randomUUID } from 'crypto';

import {
  Roles,
  registerSchema,
  loginSchema,
  totpVerifySchema,
  passwordChangeSchema,
  hashPassword,
  verifyPassword,
  validatePassword,
  createAccessToken,
  createRefreshToken,
  verifyToken,
  deriveDeviceFingerprint,
  createSession,
  verifySession,
  generateTotpSecret,
  verifyTotpToken,
  generateEmailMfaCode,
  verifyEmailMfaCode,
  generateBiometricChallenge,
  verifyBiometricAssertion,
  isMfaSufficient
} from '../lib/auth.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sends a 422 if express-validator found errors. */
function checkValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return true;
  }
  return false;
}

/** Sends a 400 if a Zod parse fails. */
function parseZod(schema, data, res) {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      error:   'Invalid input',
      details: result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
    });
    return { ok: false };
  }
  return { ok: true, data: result.data };
}

/** Extracts Bearer token from Authorization header. */
function extractBearer(req) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

// ─── In-memory session store (replace with Redis in production) ───────────────
// Maps sessionId → { userId, sessionToken, deviceFingerprint, role, mfaStatus, createdAt }
const sessionStore = new Map();

// Maps userId → { passwordHash, email, username, role, totpSecret?, biometricCredentials[] }
// In production this is your database layer.
const userStore = new Map();

// ─── Middleware: authenticate ─────────────────────────────────────────────────

/**
 * Verifies the access JWT and attaches decoded payload to req.auth.
 * Also validates device fingerprint binding.
 */
export function authenticate(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  let decoded;
  try {
    decoded = verifyToken(token, 'access');
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }

  const fingerprint = deriveDeviceFingerprint(req);
  if (decoded.dfp && decoded.dfp !== fingerprint) {
    return res.status(401).json({ error: 'Device fingerprint mismatch' });
  }

  req.auth = decoded;
  next();
}

// ─── Middleware: requireRole ──────────────────────────────────────────────────

/**
 * Middleware factory: requires the authenticated user to have one of the listed roles.
 * @param {string[]} roles  Array of allowed role strings (use Roles enum values).
 */
export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
}

// ─── express-validator chains (reusable) ─────────────────────────────────────

const validateEmail = body('email')
  .isEmail()
  .withMessage('Valid email required')
  .normalizeEmail();

const validateUsername = body('username')
  .isString()
  .withMessage('Username must be a string')
  .isLength({ min: 1, max: 64 })
  .withMessage('Username must be 1–64 characters');

const validatePasswordField = (field = 'password') =>
  body(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .notEmpty()
    .withMessage(`${field} must not be empty`);

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post(
  '/register',
  [validateEmail, validateUsername, validatePasswordField('password')],
  async (req, res) => {
    if (checkValidationErrors(req, res)) return;

    const parsed = parseZod(registerSchema, req.body, res);
    if (!parsed.ok) return;

    const { email, username, password } = parsed.data;

    if (userStore.has(email)) {
      // Deliberately vague to prevent email enumeration
      return res.status(409).json({ error: 'Registration failed' });
    }

    const passwordHash = await hashPassword(password);
    const userId       = randomUUID();

    userStore.set(email, {
      userId,
      email,
      username,
      passwordHash,
      role:                 Roles.USER,
      totpSecret:           null,
      biometricCredentials: [],
      createdAt:            Date.now()
    });

    return res.status(201).json({ message: 'Registration successful' });
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post(
  '/login',
  [validateEmail, validatePasswordField('password')],
  async (req, res) => {
    if (checkValidationErrors(req, res)) return;

    const parsed = parseZod(loginSchema, req.body, res);
    if (!parsed.ok) return;

    const { email, password } = parsed.data;

    const user = userStore.get(email);

    // Always run bcrypt to prevent timing-based enumeration
    const hashToCheck = user?.passwordHash ?? '$2a$12$invalidhashpadding000000000000000000000000000000000000000';
    const isValid     = await verifyPassword(password, hashToCheck);

    if (!user || !isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const fingerprint              = deriveDeviceFingerprint(req);
    const { sessionId, sessionToken } = createSession(fingerprint);

    const accessToken  = createAccessToken({
      userId:            user.userId,
      email:             user.email,
      role:              user.role,
      deviceFingerprint: fingerprint
    });

    const refreshToken = createRefreshToken({
      userId:            user.userId,
      sessionId,
      deviceFingerprint: fingerprint
    });

    sessionStore.set(sessionId, {
      userId:            user.userId,
      sessionToken,
      deviceFingerprint: fingerprint,
      role:              user.role,
      mfaStatus:         { totp: false, email: false, biometric: false },
      createdAt:         Date.now()
    });

    return res.status(200).json({
      accessToken,
      refreshToken,
      sessionId,
      mfaRequired: user.totpSecret !== null,
      role:        user.role
    });
  }
);

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', authenticate, (req, res) => {
  const sessionId = req.body.sessionId;
  if (sessionId) {
    sessionStore.delete(sessionId);
  }
  return res.status(200).json({ message: 'Logged out' });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post(
  '/refresh',
  [body('refreshToken').isString().notEmpty()],
  (req, res) => {
    if (checkValidationErrors(req, res)) return;

    const { refreshToken } = req.body;

    let decoded;
    try {
      decoded = verifyToken(refreshToken, 'refresh');
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const session = sessionStore.get(decoded.sid);
    if (!session) {
      return res.status(401).json({ error: 'Session not found or expired' });
    }

    const fingerprint = deriveDeviceFingerprint(req);
    const sessionOk   = verifySession(decoded.sid, session.sessionToken, fingerprint);
    if (!sessionOk) {
      return res.status(401).json({ error: 'Device fingerprint mismatch' });
    }

    const user = [...userStore.values()].find((u) => u.userId === decoded.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accessToken = createAccessToken({
      userId:            user.userId,
      email:             user.email,
      role:              user.role,
      deviceFingerprint: fingerprint
    });

    return res.status(200).json({ accessToken });
  }
);

// ─── POST /api/auth/mfa/setup ─────────────────────────────────────────────────

router.post('/mfa/setup', authenticate, async (req, res) => {
  const user = [...userStore.values()].find((u) => u.userId === req.auth.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { secret, uri, qrDataUrl } = await generateTotpSecret({ email: user.email });

  // Persist the pending secret — only commit it after the user successfully verifies
  user.totpSecretPending = secret;

  return res.status(200).json({ uri, qrDataUrl });
});

// ─── POST /api/auth/mfa/verify ────────────────────────────────────────────────

router.post(
  '/mfa/verify',
  authenticate,
  [
    body('token').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
    body('sessionId').isString().notEmpty()
  ],
  (req, res) => {
    if (checkValidationErrors(req, res)) return;

    const user = [...userStore.values()].find((u) => u.userId === req.auth.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { token, sessionId } = req.body;

    // If a pending secret exists we are in setup/confirm flow; else normal verify
    const secret = user.totpSecretPending ?? user.totpSecret;
    if (!secret) {
      return res.status(400).json({ error: 'TOTP not configured' });
    }

    const valid = verifyTotpToken({ secret, token });
    if (!valid) {
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    // Commit pending secret on successful first verification
    if (user.totpSecretPending) {
      user.totpSecret        = user.totpSecretPending;
      user.totpSecretPending = null;
    }

    const session = sessionStore.get(sessionId);
    if (session) {
      session.mfaStatus.totp = true;
    }

    return res.status(200).json({ message: 'TOTP verified', mfaSufficient: isMfaSufficient(session?.mfaStatus ?? { totp: true, email: false, biometric: false }, user.role) });
  }
);

// ─── POST /api/auth/biometric/register ───────────────────────────────────────

router.post('/biometric/register', authenticate, (req, res) => {
  const user = [...userStore.values()].find((u) => u.userId === req.auth.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const challengePayload = generateBiometricChallenge({
    userId:   user.userId,
    username: user.username
  });

  // Store challenge for verification step (in production: Redis with TTL)
  user.pendingBiometricChallenge = challengePayload.challenge;

  return res.status(200).json(challengePayload);
});

// ─── POST /api/auth/biometric/verify ─────────────────────────────────────────

router.post(
  '/biometric/verify',
  authenticate,
  [
    body('credentialId').isString().notEmpty(),
    body('assertionResponse').isObject(),
    body('sessionId').isString().notEmpty()
  ],
  (req, res) => {
    if (checkValidationErrors(req, res)) return;

    const user = [...userStore.values()].find((u) => u.userId === req.auth.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { credentialId, assertionResponse, sessionId } = req.body;

    const result = verifyBiometricAssertion({
      userId:            user.userId,
      credentialId,
      assertionResponse
    });

    if (!result.verified) {
      // Stub always returns false — client is expected to finalize WebAuthn flow
      return res.status(200).json({ verified: false, message: result.message });
    }

    const session = sessionStore.get(sessionId);
    if (session) {
      session.mfaStatus.biometric = true;
    }

    return res.status(200).json({ verified: true });
  }
);

// ─── POST /api/auth/password/change ──────────────────────────────────────────

router.post(
  '/password/change',
  authenticate,
  [
    validatePasswordField('currentPassword'),
    validatePasswordField('newPassword')
  ],
  async (req, res) => {
    if (checkValidationErrors(req, res)) return;

    const parsed = parseZod(passwordChangeSchema, req.body, res);
    if (!parsed.ok) return;

    const { currentPassword, newPassword } = parsed.data;

    const user = [...userStore.values()].find((u) => u.userId === req.auth.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const strength = validatePassword(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    user.passwordHash = await hashPassword(newPassword);

    return res.status(200).json({ message: 'Password changed successfully' });
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', authenticate, (req, res) => {
  const user = [...userStore.values()].find((u) => u.userId === req.auth.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({
    userId:   user.userId,
    email:    user.email,
    username: user.username,
    role:     user.role,
    mfaEnabled: user.totpSecret !== null,
    biometricRegistered: user.biometricCredentials.length > 0
  });
});

// ─── Export ───────────────────────────────────────────────────────────────────

export default router;
