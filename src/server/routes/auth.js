// src/server/routes/auth.js
// Nexus AI Pro — Authentication Routes
// Registration · Login · 2FA (TOTP) · MFA · JWT · Role-based
// Updated: 2026-05-06

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';

const router = Router();

// In-memory user store — replace with PostgreSQL in production
const users = new Map();
const tempTokens = new Map(); // short-lived MFA tokens

// ── Password policy ───────────────────────────────────────────────────────────
const PW_MIN_LENGTH = 13;
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY    = '7d';
const MFA_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters');
  return s;
}

// ── Sanitize username (allow emoji/unicode, block injection chars) ────────────
function sanitizeUsername(u) {
  if (!u || typeof u !== 'string') return null;
  if (u.length < 3 || u.length > 32) return null;
  if (/[<>"';\\]/.test(u)) return null;
  return u.trim();
}

// ── Validation middleware ─────────────────────────────────────────────────────
const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: PW_MIN_LENGTH }).withMessage(`Password must be at least ${PW_MIN_LENGTH} characters`),
  body('username').isLength({ min: 3, max: 32 }),
  body('role').optional().isIn(['admin', 'dev', 'moderator', 'user']),
];

const validateLogin = [
  body('identifier').notEmpty().trim(),
  body('password').notEmpty(),
];

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', validateRegister, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { username, email, password, role = 'user' } = req.body;

  const cleanUsername = sanitizeUsername(username);
  if (!cleanUsername) return res.status(400).json({ error: 'Invalid username format' });

  // Check uniqueness
  for (const [, u] of users) {
    if (u.email === email)          return res.status(409).json({ error: 'Email already registered' });
    if (u.username === cleanUsername) return res.status(409).json({ error: 'Username already taken' });
  }

  // Enforce only users can self-register as admin — requires existing admin token in production
  const allowedSelfRegisterRoles = ['user', 'dev'];
  const finalRole = allowedSelfRegisterRoles.includes(role) ? role : 'user';

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id   = uuidv4();

  // Generate TOTP secret for 2FA setup
  const totpSecret = speakeasy.generateSecret({ name: `NexusAIPro (${email})`, issuer: 'Nexus AI Pro' });

  const user = {
    id,
    username: cleanUsername,
    email,
    passwordHash: hash,
    role: finalRole,
    createdAt: Date.now(),
    mfaEnabled: false,
    totpSecret: totpSecret.base32,
    totpUri: totpSecret.otpauth_url,
  };

  users.set(id, user);

  // Generate QR code for TOTP setup
  const qrCode = await QRCode.toDataURL(totpSecret.otpauth_url);

  return res.status(201).json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    mfaSetup: { qrCode, secret: totpSecret.base32 },
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', validateLogin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { identifier, password } = req.body;

  // Find user by email or username
  let user = null;
  for (const [, u] of users) {
    if (u.email === identifier || u.username === identifier) { user = u; break; }
  }

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match)  return res.status(401).json({ error: 'Invalid credentials' });

  if (user.mfaEnabled) {
    // Issue short-lived temp token — client must verify TOTP
    const tempId  = uuidv4();
    const tempTok = jwt.sign({ tempId, userId: user.id }, getJwtSecret(), { expiresIn: '5m' });
    tempTokens.set(tempId, { userId: user.id, expiresAt: Date.now() + MFA_EXPIRY_MS });
    return res.json({ mfaRequired: true, tempToken: tempTok });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, username: user.username },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );

  return res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// ── Verify MFA (TOTP) ─────────────────────────────────────────────────────────
router.post('/verify-mfa', async (req, res) => {
  const { tempToken, totp } = req.body;
  if (!tempToken || !totp) return res.status(400).json({ error: 'Missing fields' });

  let decoded;
  try { decoded = jwt.verify(tempToken, getJwtSecret()); }
  catch { return res.status(401).json({ error: 'Expired or invalid session' }); }

  const temp = tempTokens.get(decoded.tempId);
  if (!temp || temp.expiresAt < Date.now()) return res.status(401).json({ error: 'MFA session expired' });

  const user = users.get(temp.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const verified = speakeasy.totp.verify({
    secret:   user.totpSecret,
    encoding: 'base32',
    token:    totp,
    window:   1,
  });
  if (!verified) return res.status(401).json({ error: 'Invalid 2FA code' });

  tempTokens.delete(decoded.tempId);

  const token = jwt.sign(
    { userId: user.id, role: user.role, username: user.username },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );

  return res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// ── Enable / disable MFA ──────────────────────────────────────────────────────
router.post('/mfa/enable', authenticateToken, async (req, res) => {
  const { totp } = req.body;
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const verified = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: totp, window: 1 });
  if (!verified) return res.status(400).json({ error: 'Invalid TOTP code — scan QR first' });

  user.mfaEnabled = true;
  return res.json({ mfaEnabled: true });
});

router.post('/mfa/disable', authenticateToken, async (req, res) => {
  const { totp } = req.body;
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const verified = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: totp, window: 1 });
  if (!verified) return res.status(400).json({ error: 'Invalid TOTP code' });

  user.mfaEnabled = false;
  return res.json({ mfaEnabled: false });
});

// ── Get MFA setup QR code ─────────────────────────────────────────────────────
router.get('/mfa/setup', authenticateToken, async (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const qrCode = await QRCode.toDataURL(user.totpUri);
  return res.json({ qrCode, secret: user.totpSecret, enabled: user.mfaEnabled });
});

// ── Get current user ──────────────────────────────────────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ id: user.id, username: user.username, email: user.email, role: user.role, mfaEnabled: user.mfaEnabled });
});

// ── JWT middleware (exported for other routes) ────────────────────────────────
export function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export default router;
