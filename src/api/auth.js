// ================================================
// NEXUS AI PRO — Authentication API Module
// Roles: admin | dev | moderator | user
// Features: JWT, bcrypt, TOTP 2FA, WebAuthn, MFA
// Created: 2026-06-04
// ================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const router = Router();

// In-memory store (swap for Redis/PostgreSQL in production)
const userStore = new Map();
const refreshTokens = new Set();
const mfaChallenges = new Map(); // userId -> { secret, expiry }
const webAuthnChallenges = new Map(); // userId -> challenge

// ── Constants ──────────────────────────────────────────────
const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'dev', MODERATOR: 'moderator', USER: 'user' });
const SALT_ROUNDS = 14;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const PASSWORD_MIN_LENGTH = 13;
const USERNAME_REGEX = /^[\p{L}\p{N}\p{Emoji}_\-.@#$%^&*!?~]{3,50}$/u;

// ── Helpers ────────────────────────────────────────────────
function issueTokens(userId, role) {
  const payload = { sub: userId, role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL, algorithm: 'HS256' });
  const refreshToken = uuidv4();
  refreshTokens.add(refreshToken);
  return { accessToken, refreshToken, role };
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 13 characters.';
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain a digit.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character.';
  return null;
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') return 'Username is required.';
  if (!USERNAME_REGEX.test(username)) return 'Username contains invalid characters.';
  return null;
}

function generateTotpSecret() {
  return crypto.randomBytes(20).toString('base32');
}

function verifyTotp(secret, token) {
  const window = 1;
  const step = 30;
  const now = Math.floor(Date.now() / 1000 / step);
  for (let i = -window; i <= window; i++) {
    const expected = computeTotp(secret, now + i);
    if (expected === token) return true;
  }
  return false;
}

function computeTotp(secret, counter) {
  const key = Buffer.from(secret, 'base32');
  const buf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buf[i] = counter & 0xff;
    counter >>= 8;
  }
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1000000).padStart(6, '0');
}

// ── Middleware ─────────────────────────────────────────────
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

// ── POST /api/auth/register ────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, lang = 'en', region = 'US' } = req.body;

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.status(400).json({ error: usernameErr });

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.status(400).json({ error: passwordErr });

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required.' });
    }

    const existingByEmail = [...userStore.values()].find(u => u.email === email.toLowerCase());
    if (existingByEmail) return res.status(409).json({ error: 'Email already registered.' });

    const existingByName = [...userStore.values()].find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingByName) return res.status(409).json({ error: 'Username already taken.' });

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const isFirstUser = userStore.size === 0;

    const user = {
      id: userId,
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: isFirstUser ? ROLES.ADMIN : ROLES.USER,
      mfaEnabled: false,
      mfaSecret: null,
      webAuthnCredentials: [],
      biometricEnabled: false,
      createdAt: new Date().toISOString(),
      lang,
      region,
      active: true
    };

    userStore.set(userId, user);

    const tokens = issueTokens(userId, user.role);
    res.status(201).json({ userId, username: user.username, email: user.email, role: user.role, ...tokens });
  } catch {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, mfaToken } = req.body;

    const user = [...userStore.values()].find(u => u.email === (email || '').toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    if (!user.active) return res.status(403).json({ error: 'Account suspended.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    if (user.mfaEnabled) {
      if (!mfaToken) return res.status(200).json({ mfaRequired: true, userId: user.id });
      const ok = verifyTotp(user.mfaSecret, String(mfaToken));
      if (!ok) return res.status(401).json({ error: 'Invalid MFA token.' });
    }

    const tokens = issueTokens(user.id, user.role);
    res.json({ userId: user.id, username: user.username, email: user.email, role: user.role, ...tokens });
  } catch {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ── POST /api/auth/refresh ─────────────────────────────────
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token.' });
  }
  refreshTokens.delete(refreshToken);

  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing access token.' });

  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET, { ignoreExpiration: true });
    const tokens = issueTokens(decoded.sub, decoded.role);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Token invalid.' });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ success: true });
});

// ── GET /api/auth/me ───────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = userStore.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { passwordHash, mfaSecret, ...safe } = user;
  res.json(safe);
});

// ── POST /api/auth/mfa/setup ───────────────────────────────
router.post('/mfa/setup', requireAuth, (req, res) => {
  const user = userStore.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const secret = generateTotpSecret();
  mfaChallenges.set(user.id, { secret, expiry: Date.now() + 10 * 60 * 1000 });

  const issuer = encodeURIComponent('NexusAIPro');
  const account = encodeURIComponent(user.email);
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  res.json({ secret, otpauthUrl, message: 'Scan QR code and verify with /mfa/verify before enabling.' });
});

// ── POST /api/auth/mfa/verify ──────────────────────────────
router.post('/mfa/verify', requireAuth, (req, res) => {
  const { token } = req.body;
  const challenge = mfaChallenges.get(req.user.id);

  if (!challenge || Date.now() > challenge.expiry) {
    return res.status(400).json({ error: 'MFA setup session expired. Restart setup.' });
  }

  if (!verifyTotp(challenge.secret, String(token))) {
    return res.status(401).json({ error: 'Invalid TOTP token.' });
  }

  const user = userStore.get(req.user.id);
  user.mfaSecret = challenge.secret;
  user.mfaEnabled = true;
  mfaChallenges.delete(req.user.id);

  res.json({ success: true, message: 'MFA enabled successfully.' });
});

// ── POST /api/auth/mfa/disable ─────────────────────────────
router.post('/mfa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  const user = userStore.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password.' });

  user.mfaEnabled = false;
  user.mfaSecret = null;
  res.json({ success: true });
});

// ── POST /api/auth/biometric/register ─────────────────────
router.post('/biometric/register', requireAuth, (req, res) => {
  const { credentialId, publicKey, deviceName, type } = req.body;

  if (!credentialId || !publicKey) {
    return res.status(400).json({ error: 'Credential ID and public key required.' });
  }

  const allowedTypes = ['fingerprint', 'face_id', 'touch_id', 'retina'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: `Biometric type must be one of: ${allowedTypes.join(', ')}` });
  }

  const user = userStore.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const credential = {
    id: uuidv4(),
    credentialId,
    publicKey,
    deviceName: deviceName || 'Unknown Device',
    type,
    createdAt: new Date().toISOString()
  };

  user.webAuthnCredentials.push(credential);
  user.biometricEnabled = true;

  res.json({ success: true, credentialId: credential.id });
});

// ── POST /api/auth/biometric/verify ───────────────────────
router.post('/biometric/verify', (req, res) => {
  const { credentialId, signature, userId } = req.body;

  const user = userStore.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const cred = user.webAuthnCredentials.find(c => c.credentialId === credentialId);
  if (!cred) return res.status(401).json({ error: 'Unknown biometric credential.' });

  // Signature verification would use the stored public key in production
  // Here we verify the credential exists and issue tokens
  const tokens = issueTokens(user.id, user.role);
  res.json({ userId: user.id, username: user.username, role: user.role, ...tokens });
});

// ── PUT /api/auth/password ─────────────────────────────────
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = userStore.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password incorrect.' });

  const passwordErr = validatePassword(newPassword);
  if (passwordErr) return res.status(400).json({ error: passwordErr });

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  res.json({ success: true });
});

// ── GET /api/auth/users (admin) ────────────────────────────
router.get('/users', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const users = [...userStore.values()].map(({ passwordHash, mfaSecret, ...u }) => u);
  res.json(users);
});

// ── PUT /api/auth/users/:id/role (admin) ───────────────────
router.put('/users/:id/role', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${Object.values(ROLES).join(', ')}` });
  }

  const user = userStore.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.role = role;
  res.json({ success: true, role });
});

// ── PUT /api/auth/users/:id/suspend (admin/moderator) ──────
router.put('/users/:id/suspend', requireAuth, requireRole(ROLES.ADMIN, ROLES.MODERATOR), (req, res) => {
  const user = userStore.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.role === ROLES.ADMIN) return res.status(403).json({ error: 'Cannot suspend an admin.' });

  user.active = !user.active;
  res.json({ success: true, active: user.active });
});

export { router as authRouter, userStore, ROLES };
