// src/routes/auth.js
// Date: 2026-10-03
// Authentication routes: registration, login, 2FA, MFA, role-based access

import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jsonwebtoken from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// In-memory user store (replace with DB in production)
const users = new Map();
const refreshTokens = new Set();

const MIN_PASSWORD_LENGTH = 13;
const JWT_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const ROLES = ['user', 'moderator', 'dev', 'admin'];

// Password strength validator: 13+ chars, upper, lower, digit, special
function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

function issueTokens(userId, role) {
  const secret = process.env.JWT_SECRET || 'change-this-secret';
  const access = jsonwebtoken.sign({ sub: userId, role }, secret, { expiresIn: JWT_EXPIRY });
  const refresh = crypto.randomBytes(40).toString('hex');
  refreshTokens.add(refresh);
  return { access, refresh };
}

function verifyAccess(token) {
  const secret = process.env.JWT_SECRET || 'change-this-secret';
  return jsonwebtoken.verify(token, secret);
}

// Middleware: require valid JWT
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = verifyAccess(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware: require minimum role
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 2, max: 32 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: MIN_PASSWORD_LENGTH }),
  body('role').optional().isIn(ROLES)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password, role = 'user' } = req.body;

  if (!validatePasswordStrength(password)) {
    return res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters with uppercase, lowercase, number, and special character.`
    });
  }

  const existing = [...users.values()].find(u => u.email === email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const hash = await bcryptjs.hash(password, 12);

  users.set(id, {
    id,
    username,
    email,
    passwordHash: hash,
    role,
    mfaEnabled: false,
    mfaSecret: null,
    biometricEnabled: false,
    createdAt: Date.now()
  });

  const tokens = issueTokens(id, role);
  res.status(201).json({ userId: id, username, email, role, ...tokens });
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, totpCode } = req.body;
  const user = [...users.values()].find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcryptjs.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  if (user.mfaEnabled) {
    if (!totpCode) return res.status(200).json({ mfaRequired: true, userId: user.id });
    const ok = authenticator.check(totpCode, user.mfaSecret);
    if (!ok) return res.status(401).json({ error: 'Invalid MFA code' });
  }

  const tokens = issueTokens(user.id, user.role);
  res.json({ userId: user.id, username: user.username, role: user.role, ...tokens });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  refreshTokens.delete(refreshToken);
  const tokenPayload = req.body.userId && req.body.role
    ? { userId: req.body.userId, role: req.body.role }
    : null;
  if (!tokenPayload) return res.status(400).json({ error: 'Missing userId or role' });
  const tokens = issueTokens(tokenPayload.userId, tokenPayload.role);
  res.json(tokens);
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ success: true });
});

// GET /api/auth/mfa/setup  — generate TOTP secret + QR
router.get('/mfa/setup', requireAuth, async (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = authenticator.generateSecret();
  user.pendingMfaSecret = secret;
  users.set(user.id, user);

  const otpauth = authenticator.keyuri(user.email, 'NexusAIPro', secret);
  const qr = await QRCode.toDataURL(otpauth);
  res.json({ secret, qrCode: qr });
});

// POST /api/auth/mfa/verify  — confirm and enable TOTP
router.post('/mfa/verify', requireAuth, (req, res) => {
  const { code } = req.body;
  const user = users.get(req.user.sub);
  if (!user?.pendingMfaSecret) return res.status(400).json({ error: 'No pending MFA setup' });

  const ok = authenticator.check(code, user.pendingMfaSecret);
  if (!ok) return res.status(400).json({ error: 'Invalid code' });

  user.mfaSecret = user.pendingMfaSecret;
  user.pendingMfaSecret = null;
  user.mfaEnabled = true;
  users.set(user.id, user);
  res.json({ success: true, mfaEnabled: true });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcryptjs.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });

  user.mfaEnabled = false;
  user.mfaSecret = null;
  users.set(user.id, user);
  res.json({ success: true });
});

// POST /api/auth/biometric/register  — store biometric credential ID
router.post('/biometric/register', requireAuth, (req, res) => {
  const { credentialId, type } = req.body;
  if (!credentialId || !['fingerprint', 'face', 'touch-id', 'retinal'].includes(type)) {
    return res.status(400).json({ error: 'Invalid biometric type or credential' });
  }
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.biometricEnabled = true;
  user.biometricCredentials = user.biometricCredentials || [];
  user.biometricCredentials.push({ credentialId, type, registeredAt: Date.now() });
  users.set(user.id, user);
  res.json({ success: true, biometricEnabled: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, mfaSecret, pendingMfaSecret, ...safe } = user;
  res.json(safe);
});

// GET /api/auth/users  — admin only
router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  const list = [...users.values()].map(({ passwordHash, mfaSecret, pendingMfaSecret, ...u }) => u);
  res.json(list);
});

export { users as userStore };
export default router;
