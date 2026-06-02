// src/routes/auth.js
// Date: 2026-06-02
// Authentication routes: register, login, 2FA/MFA, token refresh

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  generateMfaSecret,
  generateQrCodeUrl,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../services/mfa-service.js';
import { requireAuth, ROLES } from '../middleware/auth.js';

const router = Router();

// Password: 13+ chars, upper + lower + digit + special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{13,}$/;

const RegisterSchema = z.object({
  username: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(13).refine(p => PASSWORD_REGEX.test(p), {
    message: 'Password must be 13+ chars with upper, lower, digit, and special character',
  }),
  language: z.string().max(10).optional().default('en'),
  region: z.string().max(10).optional().default('US'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().optional(),
});

const in_memory_users = new Map();

function issueTokens(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { username, email, password, language, region } = parsed.data;

  const existing = [...in_memory_users.values()].find(u => u.email === email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: uuidv4(),
    username,
    email,
    passwordHash,
    role: ROLES.USER,
    language,
    region,
    mfaEnabled: false,
    mfaSecret: null,
    backupCodeHashes: [],
    emailVerified: false,
    createdAt: Date.now(),
    lastLogin: null,
  };
  in_memory_users.set(user.id, user);

  const tokens = issueTokens(user);
  res.status(201).json({ user: sanitizeUser(user), ...tokens });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email, password, mfaToken } = parsed.data;
  const user = [...in_memory_users.values()].find(u => u.email === email);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  if (user.mfaEnabled) {
    if (!mfaToken) return res.status(200).json({ requiresMfa: true });

    const totpOk = verifyTotp(mfaToken, user.mfaSecret);
    if (!totpOk) {
      const backupIdx = verifyBackupCode(mfaToken, user.backupCodeHashes);
      if (backupIdx === -1) return res.status(401).json({ error: 'Invalid MFA token' });
      // Consume backup code
      user.backupCodeHashes.splice(backupIdx, 1);
    }
  }

  user.lastLogin = Date.now();
  const tokens = issueTokens(user);
  res.json({ user: sanitizeUser(user), ...tokens });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (payload.type !== 'refresh') throw new Error('Wrong token type');
    const user = in_memory_users.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const tokens = issueTokens(user);
    res.json(tokens);
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = in_memory_users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', requireAuth, async (req, res) => {
  const user = in_memory_users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.mfaEnabled) return res.status(409).json({ error: 'MFA already enabled' });

  const { secret, raw } = generateMfaSecret();
  const { qrDataUrl, otpAuthUrl } = await generateQrCodeUrl(user.email, secret);

  // Store pending secret temporarily (not yet activated)
  user._pendingMfaSecret = secret;

  res.json({ secret, qrDataUrl, otpAuthUrl });
});

// POST /api/auth/mfa/verify — activates MFA after setup
router.post('/mfa/verify', requireAuth, (req, res) => {
  const { token } = req.body;
  const user = in_memory_users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user._pendingMfaSecret) return res.status(400).json({ error: 'No pending MFA setup' });

  if (!verifyTotp(token, user._pendingMfaSecret)) {
    return res.status(401).json({ error: 'Invalid TOTP token' });
  }

  user.mfaSecret = user._pendingMfaSecret;
  delete user._pendingMfaSecret;
  user.mfaEnabled = true;

  const backupCodes = generateBackupCodes(8);
  user.backupCodeHashes = backupCodes.map(hashBackupCode);

  res.json({ success: true, backupCodes });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  const user = in_memory_users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });

  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.backupCodeHashes = [];
  res.json({ success: true });
});

// POST /api/auth/password/change
router.post('/password/change', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = in_memory_users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({ error: 'New password does not meet requirements' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  res.json({ success: true });
});

// Expose user store for other route modules
export { in_memory_users };

function sanitizeUser(user) {
  const { passwordHash, mfaSecret, backupCodeHashes, _pendingMfaSecret, ...safe } = user;
  return safe;
}

export default router;
