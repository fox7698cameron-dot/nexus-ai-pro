// src/routes/auth.js | Nexus AI Pro | Date: 2026-06-07

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Audit logger (console-based singleton stand-in; swap for real security module)
// ---------------------------------------------------------------------------
const security = {
  logAudit(event, details) {
    console.log(`[AUDIT] ${new Date().toISOString()} | ${event} |`, JSON.stringify(details));
  },
};

// ---------------------------------------------------------------------------
// In-memory stores (MVP — replace with real DB layer)
// ---------------------------------------------------------------------------

/**
 * usersStore: Map<userId, userRecord>
 *
 * userRecord shape:
 * {
 *   id, email, username, passwordHash, role,
 *   twoFactorSecret, twoFactorEnabled,
 *   backupCodes: [{ codeHash, used }],
 *   biometrics: [{ id, type, credentialHash, challengeHash, deviceId, createdAt }],
 *   passwordResetToken, passwordResetTokenHash, passwordResetExpires,
 *   refreshTokenHash,
 *   createdAt, updatedAt
 * }
 */
export const usersStore = new Map();

// Secondary index: email → userId
const emailIndex = new Map();

// Pending 2FA setup secrets (userId → { secret, otpauthUrl })
const pending2FASecrets = new Map();

// Pending biometric challenges (challengeId → { userId, challenge, expiresAt })
const biometricChallenges = new Map();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const BIOMETRIC_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BACKUP_CODE_COUNT = 8;

const VALID_ROLES = ['user', 'moderator', 'developer', 'admin'];
const ADMIN_ONLY_ROLES = ['admin'];

const BIOMETRIC_TYPES = ['fingerprint', 'touch-id', 'face-id', 'retinal'];

// Password: min 13 chars, uppercase, lowercase, digit, special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{13,}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env variable is not set');
  return s;
}

function jwtRefreshSecret() {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) throw new Error('JWT_REFRESH_SECRET env variable is not set');
  return s;
}

function adminSecretKey() {
  return process.env.ADMIN_SECRET_KEY || null;
}

function issueAccessToken(user) {
  return jwt.sign(
    { sub: user.id, userId: user.id, email: user.email, role: user.role },
    jwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL, issuer: 'nexus-ai-pro', audience: 'nexus-ai-pro-client' }
  );
}

function issueRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    jwtRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_TTL, issuer: 'nexus-ai-pro', audience: 'nexus-ai-pro-client' }
  );
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: '/api/auth/refresh',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
}

async function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // 10 hex chars → readable, unguessable
    codes.push(crypto.randomBytes(5).toString('hex').toUpperCase());
  }
  return codes;
}

function sanitizeUser(user) {
  const { passwordHash, twoFactorSecret, backupCodes, passwordResetToken,
          passwordResetTokenHash, passwordResetExpires, refreshTokenHash,
          ...safe } = user;
  return safe;
}

function findUserByEmail(email) {
  const userId = emailIndex.get(email.toLowerCase());
  if (!userId) return null;
  return usersStore.get(userId) || null;
}

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validation chains (reusable)
// ---------------------------------------------------------------------------

const validatePassword = body('password')
  .isString()
  .withMessage('Password must be a string')
  .matches(PASSWORD_REGEX)
  .withMessage(
    'Password must be at least 13 characters and include uppercase, lowercase, a number, and a special character (!@#$%^&*()_+-=[]{}|;:,.<>?)'
  );

const validateEmail = body('email')
  .normalizeEmail()
  .isEmail()
  .withMessage('A valid email address is required');

const validateTOTP = body('token')
  .isString()
  .trim()
  .matches(/^\d{6}$/)
  .withMessage('TOTP token must be a 6-digit code');

// ---------------------------------------------------------------------------
// Middleware: authenticate (JWT Bearer)
// ---------------------------------------------------------------------------

export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or malformed Authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret(), {
      issuer: 'nexus-ai-pro',
      audience: 'nexus-ai-pro-client',
    });
    req.user = payload;
    next();
  } catch (err) {
    security.logAudit('AUTH_FAILED_INVALID_TOKEN', { error: err.message, ip: req.ip });
    return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
}

// ---------------------------------------------------------------------------
// Middleware: requireRole
// ---------------------------------------------------------------------------

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      security.logAudit('AUTHZ_DENIED', {
        userId: req.user.userId,
        requiredRoles: roles,
        actualRole: req.user.role,
        path: req.path,
      });
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireDeveloper = requireRole('admin', 'developer');
export const requireModerator = requireRole('admin', 'moderator', 'developer');

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

router.post(
  '/register',
  [
    validateEmail,
    validatePassword,
    body('username')
      .isString()
      .trim()
      .isLength({ min: 2, max: 64 })
      .withMessage('Username must be between 2 and 64 characters'),
    body('role')
      .optional()
      .isIn(VALID_ROLES)
      .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { email, password, username, role: requestedRole } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Duplicate check
    if (emailIndex.has(normalizedEmail)) {
      security.logAudit('REGISTER_DUPLICATE_EMAIL', { email: normalizedEmail, ip: req.ip });
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Role assignment logic
    let assignedRole = 'user';
    if (requestedRole && requestedRole !== 'user') {
      if (ADMIN_ONLY_ROLES.includes(requestedRole)) {
        // Admin role requires the secret header
        const providedAdminKey = req.headers['x-admin-secret'];
        const expectedKey = adminSecretKey();
        if (!expectedKey || providedAdminKey !== expectedKey) {
          security.logAudit('REGISTER_UNAUTHORIZED_ADMIN_ROLE', { email: normalizedEmail, ip: req.ip });
          return res.status(403).json({ success: false, message: 'Admin role requires a valid admin secret header' });
        }
        assignedRole = 'admin';
      } else {
        // moderator / developer — must supply admin secret too
        const providedAdminKey = req.headers['x-admin-secret'];
        const expectedKey = adminSecretKey();
        if (!expectedKey || providedAdminKey !== expectedKey) {
          security.logAudit('REGISTER_UNAUTHORIZED_ELEVATED_ROLE', {
            email: normalizedEmail,
            requestedRole,
            ip: req.ip,
          });
          return res.status(403).json({
            success: false,
            message: 'Elevated roles (moderator, developer) require a valid admin secret header',
          });
        }
        assignedRole = requestedRole;
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();

    const user = {
      id: userId,
      email: normalizedEmail,
      username: username.trim(),
      passwordHash,
      role: assignedRole,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      backupCodes: [],
      biometrics: [],
      passwordResetToken: null,
      passwordResetTokenHash: null,
      passwordResetExpires: null,
      refreshTokenHash: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usersStore.set(userId, user);
    emailIndex.set(normalizedEmail, userId);

    const accessToken = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    user.refreshTokenHash = await hashToken(refreshToken);
    user.updatedAt = new Date().toISOString();

    setRefreshCookie(res, refreshToken);

    security.logAudit('REGISTER_SUCCESS', { userId, email: normalizedEmail, role: assignedRole, ip: req.ip });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      accessToken,
      user: sanitizeUser(user),
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

router.post(
  '/login',
  [
    validateEmail,
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = findUserByEmail(normalizedEmail);
    if (!user) {
      security.logAudit('LOGIN_UNKNOWN_EMAIL', { email: normalizedEmail, ip: req.ip });
      // Constant-time response — don't leak whether email exists
      await bcrypt.compare(password, '$2a$12$invalidhashpadding000000000000000000000000000000000000000');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      security.logAudit('LOGIN_BAD_PASSWORD', { userId: user.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // If 2FA is enabled, return a partial token that only allows verify-2fa
    if (user.twoFactorEnabled) {
      const partialToken = jwt.sign(
        { sub: user.id, step: '2fa-pending' },
        jwtSecret(),
        { expiresIn: '5m', issuer: 'nexus-ai-pro', audience: 'nexus-ai-pro-client' }
      );
      security.logAudit('LOGIN_2FA_REQUIRED', { userId: user.id, ip: req.ip });
      return res.status(200).json({
        success: true,
        twoFactorRequired: true,
        partialToken,
        message: '2FA verification required',
      });
    }

    const accessToken = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    user.refreshTokenHash = await hashToken(refreshToken);
    user.updatedAt = new Date().toISOString();

    setRefreshCookie(res, refreshToken);

    security.logAudit('LOGIN_SUCCESS', { userId: user.id, ip: req.ip });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: sanitizeUser(user),
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/verify-2fa
// ---------------------------------------------------------------------------

router.post(
  '/verify-2fa',
  [
    body('partialToken').isString().notEmpty().withMessage('partialToken is required'),
    body('token')
      .isString()
      .trim()
      .withMessage('TOTP token or backup code is required'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { partialToken, token: submittedCode } = req.body;

    let payload;
    try {
      payload = jwt.verify(partialToken, jwtSecret(), {
        issuer: 'nexus-ai-pro',
        audience: 'nexus-ai-pro-client',
      });
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired partial token' });
    }

    if (payload.step !== '2fa-pending') {
      return res.status(400).json({ success: false, message: 'Token is not a 2FA partial token' });
    }

    const user = usersStore.get(payload.sub);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled for this account' });
    }

    // Try TOTP first
    const totpValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: submittedCode,
      window: 1,
    });

    if (!totpValid) {
      // Try backup codes
      const upperCode = submittedCode.toUpperCase().trim();
      const backupIndex = user.backupCodes.findIndex(
        bc => !bc.used && bcrypt.compareSync(upperCode, bc.codeHash)
      );

      if (backupIndex === -1) {
        security.logAudit('VERIFY_2FA_FAILED', { userId: user.id, ip: req.ip });
        return res.status(401).json({ success: false, message: 'Invalid 2FA code' });
      }

      // Mark backup code as used
      user.backupCodes[backupIndex].used = true;
      user.updatedAt = new Date().toISOString();
      security.logAudit('VERIFY_2FA_BACKUP_CODE_USED', { userId: user.id, ip: req.ip });
    }

    const accessToken = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    user.refreshTokenHash = await hashToken(refreshToken);
    user.updatedAt = new Date().toISOString();

    setRefreshCookie(res, refreshToken);

    security.logAudit('VERIFY_2FA_SUCCESS', { userId: user.id, ip: req.ip });

    return res.status(200).json({
      success: true,
      message: '2FA verification successful',
      accessToken,
      user: sanitizeUser(user),
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No refresh token provided' });
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtRefreshSecret(), {
      issuer: 'nexus-ai-pro',
      audience: 'nexus-ai-pro-client',
    });
  } catch {
    clearRefreshCookie(res);
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  if (payload.type !== 'refresh') {
    return res.status(401).json({ success: false, message: 'Token type mismatch' });
  }

  const user = usersStore.get(payload.sub);
  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  // Validate stored hash (token rotation / single-use enforcement)
  const incomingHash = await hashToken(token);
  if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
    security.logAudit('REFRESH_TOKEN_REUSE_DETECTED', { userId: user.id, ip: req.ip });
    clearRefreshCookie(res);
    return res.status(401).json({ success: false, message: 'Refresh token has already been used or revoked' });
  }

  const newAccessToken = issueAccessToken(user);
  const newRefreshToken = issueRefreshToken(user);
  user.refreshTokenHash = await hashToken(newRefreshToken);
  user.updatedAt = new Date().toISOString();

  setRefreshCookie(res, newRefreshToken);

  security.logAudit('TOKEN_REFRESHED', { userId: user.id, ip: req.ip });

  return res.status(200).json({
    success: true,
    accessToken: newAccessToken,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/setup  (requires auth)
// ---------------------------------------------------------------------------

router.post('/2fa/setup', authenticate, async (req, res) => {
  const user = usersStore.get(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (user.twoFactorEnabled) {
    return res.status(409).json({ success: false, message: '2FA is already enabled on this account' });
  }

  const secret = speakeasy.generateSecret({
    name: `Nexus AI Pro (${user.email})`,
    issuer: 'Nexus AI Pro',
    length: 32,
  });

  pending2FASecrets.set(user.id, {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  security.logAudit('2FA_SETUP_INITIATED', { userId: user.id, ip: req.ip });

  return res.status(200).json({
    success: true,
    message: '2FA setup initiated. Scan the QR code with your authenticator app, then call /2fa/enable to confirm.',
    qrCode: qrCodeDataUrl,
    manualEntryKey: secret.base32,
    otpauthUrl: secret.otpauth_url,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/enable  (requires auth)
// ---------------------------------------------------------------------------

router.post('/2fa/enable', authenticate, [validateTOTP], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const user = usersStore.get(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (user.twoFactorEnabled) {
    return res.status(409).json({ success: false, message: '2FA is already enabled' });
  }

  const pending = pending2FASecrets.get(user.id);
  if (!pending) {
    return res.status(400).json({ success: false, message: 'No pending 2FA setup found. Call /2fa/setup first.' });
  }

  const valid = speakeasy.totp.verify({
    secret: pending.secret,
    encoding: 'base32',
    token: req.body.token,
    window: 1,
  });

  if (!valid) {
    security.logAudit('2FA_ENABLE_FAILED_INVALID_TOKEN', { userId: user.id, ip: req.ip });
    return res.status(400).json({ success: false, message: 'Invalid TOTP code. Please try again.' });
  }

  user.twoFactorSecret = pending.secret;
  user.twoFactorEnabled = true;
  user.updatedAt = new Date().toISOString();
  pending2FASecrets.delete(user.id);

  security.logAudit('2FA_ENABLED', { userId: user.id, ip: req.ip });

  return res.status(200).json({
    success: true,
    message: '2FA has been successfully enabled on your account',
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/disable  (requires auth)
// ---------------------------------------------------------------------------

router.post(
  '/2fa/disable',
  authenticate,
  [
    body('password').isString().notEmpty().withMessage('Password confirmation is required'),
    validateTOTP,
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const user = usersStore.get(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not currently enabled' });
    }

    const passwordMatch = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!passwordMatch) {
      security.logAudit('2FA_DISABLE_BAD_PASSWORD', { userId: user.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const totpValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: req.body.token,
      window: 1,
    });

    if (!totpValid) {
      security.logAudit('2FA_DISABLE_BAD_TOTP', { userId: user.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid TOTP code' });
    }

    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    user.backupCodes = [];
    user.updatedAt = new Date().toISOString();
    pending2FASecrets.delete(user.id);

    security.logAudit('2FA_DISABLED', { userId: user.id, ip: req.ip });

    return res.status(200).json({ success: true, message: '2FA has been disabled' });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/backup-codes  (requires auth + 2FA enabled)
// ---------------------------------------------------------------------------

router.post(
  '/2fa/backup-codes',
  authenticate,
  [validateTOTP],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const user = usersStore.get(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA must be enabled before generating backup codes' });
    }

    const totpValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: req.body.token,
      window: 1,
    });

    if (!totpValid) {
      security.logAudit('BACKUP_CODES_TOTP_FAILED', { userId: user.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid TOTP code' });
    }

    const plainCodes = generateBackupCodes();

    // Hash each code for storage
    const hashedCodes = await Promise.all(
      plainCodes.map(async code => ({
        codeHash: await bcrypt.hash(code, BCRYPT_ROUNDS),
        used: false,
      }))
    );

    user.backupCodes = hashedCodes;
    user.updatedAt = new Date().toISOString();

    security.logAudit('BACKUP_CODES_GENERATED', { userId: user.id, count: BACKUP_CODE_COUNT, ip: req.ip });

    return res.status(200).json({
      success: true,
      message: `${BACKUP_CODE_COUNT} backup codes generated. Store these securely — they will not be shown again.`,
      backupCodes: plainCodes,
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/biometric/register  (requires auth)
// ---------------------------------------------------------------------------

router.post(
  '/biometric/register',
  authenticate,
  [
    body('type')
      .isIn(BIOMETRIC_TYPES)
      .withMessage(`Biometric type must be one of: ${BIOMETRIC_TYPES.join(', ')}`),
    body('credential')
      .isString()
      .notEmpty()
      .withMessage('credential (device fingerprint) is required'),
    body('deviceId')
      .isString()
      .notEmpty()
      .withMessage('deviceId is required'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { type, credential, deviceId } = req.body;
    const user = usersStore.get(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Generate a random challenge the client must echo back on verify
    const challengeRaw = await generateSecureToken(24);
    const challengeId = uuidv4();
    const credentialHash = await bcrypt.hash(credential, BCRYPT_ROUNDS);

    // Store temporary challenge keyed by challengeId
    biometricChallenges.set(challengeId, {
      userId: user.id,
      challenge: challengeRaw,
      credentialHash,
      type,
      deviceId,
      expiresAt: Date.now() + BIOMETRIC_CHALLENGE_TTL_MS,
    });

    security.logAudit('BIOMETRIC_REGISTER_CHALLENGE_ISSUED', {
      userId: user.id,
      type,
      deviceId,
      challengeId,
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Biometric challenge issued. Call /biometric/verify with the challengeId and signed challenge.',
      challengeId,
      challenge: challengeRaw,
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/biometric/verify  (requires auth)
// ---------------------------------------------------------------------------

router.post(
  '/biometric/verify',
  authenticate,
  [
    body('challengeId').isUUID().withMessage('challengeId must be a valid UUID'),
    body('credential')
      .isString()
      .notEmpty()
      .withMessage('credential is required'),
    body('challengeResponse')
      .isString()
      .notEmpty()
      .withMessage('challengeResponse is required'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { challengeId, credential, challengeResponse } = req.body;
    const user = usersStore.get(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const pending = biometricChallenges.get(challengeId);
    if (!pending) {
      return res.status(400).json({ success: false, message: 'Challenge not found or expired' });
    }

    if (Date.now() > pending.expiresAt) {
      biometricChallenges.delete(challengeId);
      return res.status(400).json({ success: false, message: 'Challenge has expired' });
    }

    if (pending.userId !== user.id) {
      security.logAudit('BIOMETRIC_CHALLENGE_USER_MISMATCH', {
        expectedUserId: pending.userId,
        actualUserId: user.id,
        ip: req.ip,
      });
      return res.status(403).json({ success: false, message: 'Challenge does not belong to this user' });
    }

    // Verify the challenge response is correct (client must echo challenge back, possibly signed)
    // For MVP: verify it matches the raw challenge (production would use WebAuthn signature verification)
    if (challengeResponse !== pending.challenge) {
      security.logAudit('BIOMETRIC_CHALLENGE_RESPONSE_MISMATCH', { userId: user.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid challenge response' });
    }

    // Verify the credential matches what was registered
    const credentialValid = await bcrypt.compare(credential, pending.credentialHash);
    if (!credentialValid) {
      security.logAudit('BIOMETRIC_CREDENTIAL_INVALID', { userId: user.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Biometric credential verification failed' });
    }

    // Commit biometric record to user profile
    const biometricId = uuidv4();
    const challengeHash = await hashToken(pending.challenge);

    user.biometrics.push({
      id: biometricId,
      type: pending.type,
      credentialHash: pending.credentialHash,
      challengeHash,
      deviceId: pending.deviceId,
      createdAt: new Date().toISOString(),
    });
    user.updatedAt = new Date().toISOString();
    biometricChallenges.delete(challengeId);

    security.logAudit('BIOMETRIC_REGISTERED', {
      userId: user.id,
      biometricId,
      type: pending.type,
      deviceId: pending.deviceId,
      ip: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Biometric credential (${pending.type}) registered successfully`,
      biometricId,
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/change-password  (requires auth)
// ---------------------------------------------------------------------------

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isString()
      .matches(PASSWORD_REGEX)
      .withMessage(
        'New password must be at least 13 characters and include uppercase, lowercase, a number, and a special character (!@#$%^&*()_+-=[]{}|;:,.<>?)'
      ),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { currentPassword, newPassword } = req.body;
    const user = usersStore.get(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      security.logAudit('CHANGE_PASSWORD_BAD_CURRENT', { userId: user.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Prevent reusing the current password
    const reusingCurrent = await bcrypt.compare(newPassword, user.passwordHash);
    if (reusingCurrent) {
      return res.status(400).json({ success: false, message: 'New password must differ from the current password' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Invalidate all existing refresh tokens
    user.refreshTokenHash = null;
    user.updatedAt = new Date().toISOString();

    clearRefreshCookie(res);

    security.logAudit('PASSWORD_CHANGED', { userId: user.id, ip: req.ip });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------

router.post(
  '/forgot-password',
  [validateEmail],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const normalizedEmail = req.body.email.toLowerCase();

    // Always respond 200 to prevent email enumeration
    const user = findUserByEmail(normalizedEmail);
    if (user) {
      const rawToken = await generateSecureToken(32);
      const tokenHash = await hashToken(rawToken);

      user.passwordResetToken = rawToken; // kept only for comparison convenience; hash is authoritative
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
      user.updatedAt = new Date().toISOString();

      // In production, send this via email. For MVP, log it.
      security.logAudit('PASSWORD_RESET_TOKEN_ISSUED', {
        userId: user.id,
        email: normalizedEmail,
        // Include raw token in audit only; remove in production — use email delivery
        resetToken: rawToken,
        ip: req.ip,
      });
    } else {
      security.logAudit('PASSWORD_RESET_UNKNOWN_EMAIL', { email: normalizedEmail, ip: req.ip });
    }

    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------

router.post(
  '/reset-password',
  [
    body('token').isString().notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isString()
      .matches(PASSWORD_REGEX)
      .withMessage(
        'Password must be at least 13 characters and include uppercase, lowercase, a number, and a special character (!@#$%^&*()_+-=[]{}|;:,.<>?)'
      ),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { token: rawToken, newPassword } = req.body;
    const tokenHash = await hashToken(rawToken);

    // Find user with matching token hash
    let targetUser = null;
    for (const user of usersStore.values()) {
      if (user.passwordResetTokenHash === tokenHash) {
        targetUser = user;
        break;
      }
    }

    if (!targetUser) {
      security.logAudit('PASSWORD_RESET_INVALID_TOKEN', { ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    if (!targetUser.passwordResetExpires || new Date(targetUser.passwordResetExpires) < new Date()) {
      targetUser.passwordResetToken = null;
      targetUser.passwordResetTokenHash = null;
      targetUser.passwordResetExpires = null;
      security.logAudit('PASSWORD_RESET_TOKEN_EXPIRED', { userId: targetUser.id, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Password reset token has expired' });
    }

    targetUser.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    targetUser.passwordResetToken = null;
    targetUser.passwordResetTokenHash = null;
    targetUser.passwordResetExpires = null;
    // Invalidate all refresh tokens
    targetUser.refreshTokenHash = null;
    targetUser.updatedAt = new Date().toISOString();

    security.logAudit('PASSWORD_RESET_SUCCESS', { userId: targetUser.id, ip: req.ip });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset. Please log in with your new password.',
    });
  }
);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default router;
