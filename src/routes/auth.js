// auth.js | Nexus AI Pro | Created: 2026-10-15 | Authentication Routes
// Handles user registration, login, MFA, biometrics, password policy

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Role enumeration
const ROLES = Object.freeze({
  USER: 'user',
  DEVELOPER: 'developer',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

// Password policy: 13+ chars, uppercase, lowercase, digit, special char
const PASSWORD_MIN_LENGTH = 13;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{13,}$/;

// Username: 3–64 chars, supports Unicode (emoji, special chars) but no null bytes or control chars
const USERNAME_REGEX = /^[^\u0000-\u001F\u007F]{3,64}$/u;

// In-memory user store (replace with DB in production)
const users = new Map();
// MFA secrets keyed by userId
const mfaSecrets = new Map();
// Refresh token store
const refreshTokens = new Map();

/** Derive a JWT-like signed token without external libs */
function signToken(payload, secret, expiresInSec = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSec })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest('base64url');
  return `${header}.${claims}.${sig}`;
}

function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [header, claims, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Invalid token signature');
  }
  const payload = JSON.parse(Buffer.from(claims, 'base64url').toString());
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 210000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.pbkdf2Sync(password, salt, 210000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(hash, 'hex'));
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    // Warn in dev; in prod this must be set
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET env var required');
  }
  return process.env.JWT_SECRET || 'nexus-dev-jwt-secret-change-in-prod';
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { username, email, password, role, inviteCode } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Username must be 3–64 characters with no control characters' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include uppercase, lowercase, digit, and special character`,
      });
    }

    const requestedRole = Object.values(ROLES).includes(role) ? role : ROLES.USER;
    if (requestedRole === ROLES.ADMIN) {
      if (!inviteCode || inviteCode !== process.env.ADMIN_INVITE_CODE) {
        return res.status(403).json({ error: 'Valid admin invite code required' });
      }
    }

    // Check duplicate email/username
    for (const u of users.values()) {
      if (u.email === email) return res.status(409).json({ error: 'Email already registered' });
      if (u.username === username) return res.status(409).json({ error: 'Username already taken' });
    }

    const userId = uuidv4();
    const user = {
      id: userId,
      username,
      email,
      passwordHash: hashPassword(password),
      role: requestedRole,
      createdAt: Date.now(),
      mfaEnabled: false,
      biometricEnabled: false,
      active: true,
    };
    users.set(userId, user);

    const { passwordHash: _, ...safeUser } = user;
    const token = signToken({ sub: userId, role: requestedRole }, getJwtSecret());
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password, mfaCode } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    let found = null;
    for (const u of users.values()) {
      if (u.email === email) { found = u; break; }
    }
    if (!found || !verifyPassword(password, found.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!found.active) return res.status(403).json({ error: 'Account suspended' });

    if (found.mfaEnabled) {
      if (!mfaCode) return res.status(202).json({ mfaRequired: true });
      const secret = mfaSecrets.get(found.id);
      const expected = generateTotpCode(secret);
      if (mfaCode !== expected) return res.status(401).json({ error: 'Invalid MFA code' });
    }

    const token = signToken({ sub: found.id, role: found.role }, getJwtSecret());
    const refresh = crypto.randomBytes(48).toString('hex');
    refreshTokens.set(refresh, { userId: found.id, exp: Date.now() + 30 * 24 * 3600 * 1000 });

    const { passwordHash: _, ...safeUser } = found;
    res.json({ token, refresh, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error: 'Refresh token required' });
  const entry = refreshTokens.get(refresh);
  if (!entry || entry.exp < Date.now()) {
    refreshTokens.delete(refresh);
    return res.status(401).json({ error: 'Refresh token invalid or expired' });
  }
  const user = users.get(entry.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const token = signToken({ sub: user.id, role: user.role }, getJwtSecret());
  res.json({ token });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { refresh } = req.body;
  if (refresh) refreshTokens.delete(refresh);
  res.json({ success: true });
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const secret = crypto.randomBytes(20).toString('base32').slice(0, 32);
  mfaSecrets.set(userId, secret);
  res.json({ secret, message: 'Use this secret in your TOTP authenticator app' });
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });
  const secret = mfaSecrets.get(userId);
  if (!secret) return res.status(404).json({ error: 'MFA not set up' });
  const expected = generateTotpCode(secret);
  if (code !== expected) return res.status(401).json({ error: 'Invalid code' });
  const user = users.get(userId);
  if (user) { user.mfaEnabled = true; users.set(userId, user); }
  res.json({ success: true, message: 'MFA enabled' });
});

// POST /api/auth/biometric/register
router.post('/biometric/register', (req, res) => {
  const { userId, biometricType, credentialId } = req.body;
  if (!userId || !biometricType) return res.status(400).json({ error: 'userId and biometricType required' });
  const validTypes = ['fingerprint', 'touchId', 'faceId', 'retinal'];
  if (!validTypes.includes(biometricType)) return res.status(400).json({ error: 'Invalid biometric type' });
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.biometricEnabled = true;
  user.biometricType = biometricType;
  user.biometricCredentialId = credentialId;
  users.set(userId, user);
  res.json({ success: true, biometricType });
});

// GET /api/auth/profile/:userId
router.get('/profile/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/auth/password/change
router.post('/password/change', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'userId, currentPassword, newPassword required' });
  }
  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({ error: `New password must be at least ${PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, digit, and special character` });
  }
  const user = users.get(userId);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  user.passwordHash = hashPassword(newPassword);
  users.set(userId, user);
  res.json({ success: true });
});

// Simple TOTP stub (real production needs a proper TOTP library)
function generateTotpCode(secret) {
  const epoch = Math.floor(Date.now() / 30000);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(epoch));
  const hmac = crypto.createHmac('sha1', Buffer.from(secret)).update(buf).digest();
  const offset = hmac[19] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000;
  return code.toString().padStart(6, '0');
}

export { router as authRouter, verifyToken, ROLES };
