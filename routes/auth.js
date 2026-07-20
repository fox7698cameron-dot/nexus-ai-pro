// routes/auth.js - 2026-07-20
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

// In-memory user store (replace with DB in production)
const users = new Map();
const refreshTokens = new Set();
const mfaSecrets = new Map();
const webAuthnChallenges = new Map();

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;

const PASSWORD_MIN = 13;
const PASSWORD_RULES = [
  body('password')
    .isLength({ min: PASSWORD_MIN }).withMessage(`Password must be at least ${PASSWORD_MIN} characters`)
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character')
];

function issueTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    mfaEnabled: user.mfaEnabled || false
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
  return { accessToken, refreshToken };
}

function setCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('nexus_access', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });
  res.cookie('nexus_refresh', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh'
  });
}

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('displayName').trim().isLength({ min: 2, max: 64 }).withMessage('Display name must be 2-64 characters'),
  ...PASSWORD_RULES
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, displayName, language = 'en' } = req.body;

  if ([...users.values()].some(u => u.email === email)) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = {
    id: uuidv4(),
    email,
    displayName,
    passwordHash,
    role: 'user',
    language,
    mfaEnabled: false,
    createdAt: new Date().toISOString()
  };
  users.set(user.id, user);

  const { accessToken, refreshToken } = issueTokens(user);
  refreshTokens.add(refreshToken);
  setCookies(res, accessToken, refreshToken);

  res.status(201).json({
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    accessToken
  });
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, mfaCode, totpCode } = req.body;
  const submittedMfaCode = mfaCode || totpCode;
  const user = [...users.values()].find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (user.mfaEnabled) {
    if (!submittedMfaCode) return res.status(200).json({ mfaRequired: true });
    const secret = mfaSecrets.get(user.id);
    const isValidTOTP = secret && authenticator.verify({ token: submittedMfaCode, secret });
    const isBackup = !isValidTOTP && (user.backupCodes || []).includes(submittedMfaCode);
    if (!isValidTOTP && !isBackup) {
      return res.status(401).json({ message: 'Invalid authenticator code' });
    }
    if (isBackup) {
      user.backupCodes = user.backupCodes.filter(c => c !== submittedMfaCode);
    }
  }

  const { accessToken, refreshToken } = issueTokens(user);
  refreshTokens.add(refreshToken);
  setCookies(res, accessToken, refreshToken);

  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, mfaEnabled: user.mfaEnabled },
    accessToken
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const refreshToken = req.cookies?.nexus_refresh;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.clearCookie('nexus_access');
  res.clearCookie('nexus_refresh', { path: '/api/auth/refresh' });
  res.json({ success: true });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies?.nexus_refresh || req.body?.refreshToken;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = users.get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    refreshTokens.delete(refreshToken);
    const tokens = issueTokens(user);
    refreshTokens.add(tokens.refreshToken);
    setCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ accessToken: tokens.accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateJWT, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, mfaEnabled: user.mfaEnabled, language: user.language });
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', authenticateJWT, async (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = authenticator.generateSecret();
  mfaSecrets.set(user.id, secret);

  const appName = process.env.APP_NAME || 'Nexus AI Pro';
  const otpauth = authenticator.keyuri(user.email, appName, secret);
  try {
    const qrCodeUrl = await QRCode.toDataURL(otpauth);
    res.json({ secret, otpauth, qrCodeUrl });
  } catch {
    res.status(500).json({ message: 'QR code generation failed' });
  }
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', authenticateJWT, (req, res) => {
  const { token } = req.body;
  const secret = mfaSecrets.get(req.user.id);
  if (!secret) return res.status(400).json({ error: 'MFA not set up' });

  if (!authenticator.verify({ token, secret })) {
    return res.status(401).json({ message: 'Invalid authenticator code' });
  }

  const user = users.get(req.user.id);
  user.mfaEnabled = true;

  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase().replace(/(.{4})/, '$1-')
  );
  user.backupCodes = backupCodes;

  res.json({ message: 'MFA enabled successfully', backupCodes });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', authenticateJWT, async (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.mfaEnabled = false;
  user.backupCodes = [];
  mfaSecrets.delete(user.id);
  res.json({ message: 'MFA disabled successfully' });
});

// POST /api/auth/webauthn/register - generate challenge
router.post('/webauthn/register', authenticateJWT, (req, res) => {
  const challenge = crypto.randomBytes(32).toString('base64url');
  const appName = process.env.APP_NAME || 'Nexus AI Pro';
  const rpId = process.env.RP_ID || req.hostname || 'localhost';
  webAuthnChallenges.set(`reg:${req.user.id}`, { challenge, expires: Date.now() + 300000 });

  res.json({
    challenge,
    rp: { name: appName, id: rpId },
    user: {
      id: Buffer.from(req.user.id).toString('base64url'),
      name: req.user.email,
      displayName: req.user.displayName
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 }
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred'
    },
    timeout: 300000,
    attestation: 'none',
    excludeCredentials: (users.get(req.user.id)?.webauthnCredentials || []).map(c => ({
      id: c.credentialId, type: 'public-key'
    }))
  });
});

// POST /api/auth/webauthn/register/verify
router.post('/webauthn/register/verify', authenticateJWT, (req, res) => {
  const stored = webAuthnChallenges.get(`reg:${req.user.id}`);
  if (!stored || Date.now() > stored.expires) {
    return res.status(400).json({ message: 'Registration challenge expired or not found' });
  }
  webAuthnChallenges.delete(`reg:${req.user.id}`);

  const { rawId, type } = req.body;
  if (type !== 'public-key') return res.status(400).json({ message: 'Invalid credential type' });

  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.webauthnCredentials = user.webauthnCredentials || [];
  user.webauthnCredentials.push({ credentialId: rawId, createdAt: new Date().toISOString() });

  res.json({ message: 'Biometric credential registered successfully' });
});

// POST /api/auth/webauthn/authenticate - generate challenge (pre-login, no JWT required)
router.post('/webauthn/authenticate', (req, res) => {
  const rpId = process.env.RP_ID || req.hostname || 'localhost';
  const challenge = crypto.randomBytes(32).toString('base64url');
  const sessionKey = `auth:${req.ip || 'anon'}`;
  webAuthnChallenges.set(sessionKey, { challenge, expires: Date.now() + 300000 });

  res.json({
    challenge,
    timeout: 300000,
    rpId,
    userVerification: 'required',
    allowCredentials: []
  });
});

// POST /api/auth/webauthn/authenticate/verify
router.post('/webauthn/authenticate/verify', (req, res) => {
  const sessionKey = `auth:${req.ip || 'anon'}`;
  const stored = webAuthnChallenges.get(sessionKey);
  if (!stored || Date.now() > stored.expires) {
    return res.status(400).json({ message: 'Authentication challenge expired or not found' });
  }
  webAuthnChallenges.delete(sessionKey);

  const { rawId, type } = req.body;
  if (type !== 'public-key') return res.status(400).json({ message: 'Invalid credential type' });

  const matchedUser = [...users.values()].find(u =>
    (u.webauthnCredentials || []).some(c => c.credentialId === rawId)
  );
  if (!matchedUser) return res.status(401).json({ message: 'Credential not found' });

  const { accessToken, refreshToken } = issueTokens(matchedUser);
  refreshTokens.add(refreshToken);
  setCookies(res, accessToken, refreshToken);

  res.json({
    message: 'Biometric authentication successful',
    user: { id: matchedUser.id, email: matchedUser.email, displayName: matchedUser.displayName, role: matchedUser.role }
  });
});

// PATCH /api/auth/profile
router.patch('/profile', authenticateJWT, [
  body('displayName').optional().trim().isLength({ min: 2, max: 64 }),
  body('language').optional().isIn(['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'ar', 'ko', 'hi'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.body.displayName) user.displayName = req.body.displayName;
  if (req.body.language) user.language = req.body.language;
  if (req.body.newPassword) {
    if (!(await bcrypt.compare(req.body.currentPassword || '', user.passwordHash))) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    user.passwordHash = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
  }

  res.json({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, language: user.language });
});

// Admin: list users
router.get('/users', authenticateJWT, requireRole('admin'), (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const allUsers = [...users.values()].map(u => ({
    id: u.id, email: u.email, displayName: u.displayName, role: u.role,
    mfaEnabled: u.mfaEnabled, createdAt: u.createdAt
  }));
  const start = (page - 1) * limit;
  res.json({ users: allUsers.slice(start, start + limit), total: allUsers.length, page, limit });
});

// Admin: change user role
router.patch('/users/:id/role', authenticateJWT, requireRole('admin'), [
  body('role').isIn(['admin', 'dev', 'moderator', 'user'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.role = req.body.role;
  res.json({ id: user.id, role: user.role });
});

// Admin: ban/unban user
router.patch('/users/:id/status', authenticateJWT, requireRole('admin', 'moderator'), (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.banned = req.body.banned;
  user.banReason = req.body.reason || '';
  res.json({ id: user.id, banned: user.banned });
});

export default router;
