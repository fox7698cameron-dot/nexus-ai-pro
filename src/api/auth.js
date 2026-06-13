// ================================================
// NEXUS AI PRO - Authentication & Authorization API
// Updated: 2026-06-13
// ------------------------------------------------
// RBAC: admin | dev | moderator | user
// Auth: JWT access (15m) + refresh (7d) + rotation
// 2FA: TOTP (authenticator app) + email OTP
// MFA: WebAuthn (fingerprint / Face ID / retina)
// Password: 13+ chars, upper, lower, digit, symbol
// ================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ── Constants ────────────────────────────────────
const ACCESS_TTL  = 15 * 60;           // 15 minutes
const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;
const OTP_TTL_MS = 10 * 60 * 1000;    // 10 minutes

const ROLE_PERMISSIONS = {
  admin:     ['*'],
  dev:       ['analytics:read','analytics:write','projects:*','security:*','connectors:read'],
  moderator: ['users:read','content:moderate','analytics:read','audit:read'],
  user:      ['profile:*','chats:*','projects:read','analytics:read','subscriptions:read'],
};

// In-memory OTP store (replace with Redis in production)
const otpStore = new Map();

// ── Password validation ───────────────────────────
function validatePassword(password) {
  const errors = [];
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  if (password.length < 13)          errors.push('Minimum 13 characters required');
  if (!/[A-Z]/.test(password))       errors.push('At least one uppercase letter required');
  if (!/[a-z]/.test(password))       errors.push('At least one lowercase letter required');
  if (!/[0-9]/.test(password))       errors.push('At least one digit required');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character required');
  return { valid: errors.length === 0, errors };
}

// ── Username validation ───────────────────────────
// Supports Unicode, emojis, letters, digits, dots, underscores, hyphens
function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  // 3-50 grapheme clusters, no whitespace-only, no control chars
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false; // no control chars
  return true;
}

// ── Token helpers ─────────────────────────────────
function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
    expiresIn: REFRESH_TTL,
  });
}

function verifyAccess(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
  );
}

// ── Auth middleware (exported) ────────────────────
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  try {
    const decoded = verifyAccess(header.slice(7));
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userRole = req.user.role;
    if (!roles.includes(userRole) && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const perms = ROLE_PERMISSIONS[req.user.role] || [];
    const hasAll  = perms.includes('*');
    const hasPerm = perms.some(p => {
      if (p === permission) return true;
      if (p.endsWith(':*') && permission.startsWith(p.slice(0, -1))) return true;
      return false;
    });
    if (!hasAll && !hasPerm) {
      return res.status(403).json({ error: `Permission '${permission}' required` });
    }
    next();
  };
}

// ── Data access stub ──────────────────────────────
// Replace getUserByEmail / createUser / etc. with real DB calls
const users = new Map(); // keyed by id
const usersByEmail = new Map();
const usersByUsername = new Map();
const sessions = new Map(); // keyed by refreshToken

function findUserByEmail(email) {
  return usersByEmail.get(email.toLowerCase()) || null;
}

function findUserByUsername(username) {
  return usersByUsername.get(username.toLowerCase()) || null;
}

function findUserById(id) {
  return users.get(id) || null;
}

function saveUser(user) {
  users.set(user.id, user);
  usersByEmail.set(user.email.toLowerCase(), user);
  if (user.username) usersByUsername.set(user.username.toLowerCase(), user);
}

function saveSession(session) {
  sessions.set(session.refreshToken, session);
}

function getSession(refreshToken) {
  return sessions.get(refreshToken) || null;
}

function revokeSession(refreshToken) {
  sessions.delete(refreshToken);
}

// ── Email OTP ─────────────────────────────────────
function generateOTP(userId) {
  const code = crypto.randomInt(100000, 999999).toString();
  otpStore.set(userId, { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

function verifyOTP(userId, code) {
  const entry = otpStore.get(userId);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { otpStore.delete(userId); return false; }
  if (entry.code !== code) return false;
  otpStore.delete(userId);
  return true;
}

// ── TOTP helpers (manual RFC 6238 — no native dep) ─
function base32Decode(s) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = s.toUpperCase().replace(/=+$/, '');
  let bits = 0, value = 0;
  const output = [];
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { bits -= 8; output.push((value >> bits) & 0xff); }
  }
  return Buffer.from(output);
}

function computeTOTP(secretBase32, window = 0) {
  const counter = Math.floor(Date.now() / 1000 / 30) + window;
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const keyBuf = base32Decode(secretBase32);
  const hmac = crypto.createHmac('sha1', keyBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString().padStart(6, '0');
  return code;
}

function generateTOTPSecret() {
  const bytes = crypto.randomBytes(20);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (const byte of bytes) result += alphabet[byte % 32];
  return result;
}

function verifyTOTP(secretBase32, token) {
  for (const w of [-1, 0, 1]) {
    if (computeTOTP(secretBase32, w) === token) return true;
  }
  return false;
}

// ── Routes ────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, displayName, language = 'en', region = 'US' } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: 'Password requirements not met', details: passCheck.errors });
    }

    if (username && !validateUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3-50 characters, no control chars' });
    }

    if (findUserByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (username && findUserByUsername(username)) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = uuidv4();
    const now = new Date().toISOString();
    const user = {
      id,
      email: email.toLowerCase(),
      username: username || null,
      passwordHash,
      displayName: displayName || username || email.split('@')[0],
      role: 'user',
      subscriptionTier: 'free',
      language,
      region,
      mfaEnabled: false,
      mfaSecret: null,
      biometricRegistered: false,
      webauthnCredentials: [],
      failedLoginAttempts: 0,
      lockedUntil: null,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };
    saveUser(user);

    const accessToken = signAccess({ sub: id, role: user.role, tier: user.subscriptionTier });
    const refreshToken = signRefresh({ sub: id });
    saveSession({ refreshToken, userId: id, createdAt: now });

    res.status(201).json({
      user: safeUser(user),
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL,
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, totpToken } = req.body;

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockedUntil) - Date.now()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${remaining} minutes.` });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      }
      saveUser(user);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2FA check
    if (user.mfaEnabled) {
      if (!totpToken) {
        return res.status(202).json({ requiresMfa: true, userId: user.id });
      }
      if (!verifyTOTP(user.mfaSecret, totpToken)) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();
    saveUser(user);

    const accessToken = signAccess({ sub: user.id, role: user.role, tier: user.subscriptionTier });
    const refreshToken = signRefresh({ sub: user.id });
    saveSession({ refreshToken, userId: user.id, createdAt: new Date().toISOString() });

    res.json({
      user: safeUser(user),
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL,
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const decoded = verifyRefresh(refreshToken);
    const session = getSession(refreshToken);
    if (!session) return res.status(401).json({ error: 'Session revoked or expired' });

    const user = findUserById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Rotate refresh token
    revokeSession(refreshToken);
    const newRefresh = signRefresh({ sub: user.id });
    saveSession({ refreshToken: newRefresh, userId: user.id, createdAt: new Date().toISOString() });

    const newAccess = signAccess({ sub: user.id, role: user.role, tier: user.subscriptionTier });

    res.json({ accessToken: newAccess, refreshToken: newRefresh, expiresIn: ACCESS_TTL });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) revokeSession(refreshToken);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: safeUser(user) });
});

// POST /api/auth/mfa/setup  — returns secret + QR URI
router.post('/mfa/setup', requireAuth, (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = generateTOTPSecret();
  user.mfaSecret = secret;       // store temporarily until verified
  user.mfaEnabled = false;
  saveUser(user);

  const issuer = 'NexusAIPro';
  const label  = encodeURIComponent(`${issuer}:${user.email}`);
  const otpAuthUri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  res.json({ secret, otpAuthUri });
});

// POST /api/auth/mfa/verify  — confirm TOTP and enable MFA
router.post('/mfa/verify', requireAuth, (req, res) => {
  const { token } = req.body;
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.mfaSecret) return res.status(400).json({ error: 'MFA setup not initiated' });

  if (!verifyTOTP(user.mfaSecret, token)) {
    return res.status(400).json({ error: 'Invalid TOTP code' });
  }

  user.mfaEnabled = true;
  saveUser(user);
  res.json({ success: true, mfaEnabled: true });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid password' });

  user.mfaEnabled = false;
  user.mfaSecret = null;
  saveUser(user);
  res.json({ success: true });
});

// POST /api/auth/otp/send  — email OTP for email-based 2FA
router.post('/otp/send', (req, res) => {
  const { userId } = req.body;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const code = generateOTP(userId);
  // In production: send via nodemailer / SendGrid etc.
  // Never log the code in production!
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${user.email}: ${code}`);
  }

  res.json({ sent: true, expiresInSeconds: OTP_TTL_MS / 1000 });
});

// POST /api/auth/otp/verify
router.post('/otp/verify', (req, res) => {
  const { userId, code } = req.body;
  const valid = verifyOTP(userId, code);
  if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' });

  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const accessToken = signAccess({ sub: user.id, role: user.role, tier: user.subscriptionTier });
  const refreshToken = signRefresh({ sub: user.id });
  saveSession({ refreshToken, userId: user.id, createdAt: new Date().toISOString() });

  res.json({ success: true, user: safeUser(user), accessToken, refreshToken, expiresIn: ACCESS_TTL });
});

// POST /api/auth/webauthn/register/options  — WebAuthn (biometrics)
router.post('/webauthn/register/options', requireAuth, (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const challenge = crypto.randomBytes(32).toString('base64url');
  otpStore.set(`webauthn_challenge_${user.id}`, { challenge, expiresAt: Date.now() + 120000 });

  res.json({
    challenge,
    rp: { name: 'Nexus AI Pro', id: process.env.WEBAUTHN_RP_ID || 'localhost' },
    user: {
      id: Buffer.from(user.id).toString('base64url'),
      name: user.email,
      displayName: user.displayName || user.email,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7  },  // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      requireResidentKey: false,
      userVerification: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  });
});

// POST /api/auth/webauthn/register/verify
router.post('/webauthn/register/verify', requireAuth, (req, res) => {
  const { credentialId, publicKey, deviceInfo } = req.body;
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stored = otpStore.get(`webauthn_challenge_${user.id}`);
  if (!stored || Date.now() > stored.expiresAt) {
    return res.status(400).json({ error: 'Challenge expired' });
  }
  otpStore.delete(`webauthn_challenge_${user.id}`);

  // Store credential
  const credential = {
    id: credentialId,
    publicKey,
    deviceInfo: deviceInfo || {},
    registeredAt: new Date().toISOString(),
    lastUsed: null,
  };
  user.webauthnCredentials = [...(user.webauthnCredentials || []), credential];
  user.biometricRegistered = true;
  saveUser(user);

  res.json({ success: true, credentialId });
});

// POST /api/auth/password/change
router.post('/password/change', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Current password incorrect' });

  const passCheck = validatePassword(newPassword);
  if (!passCheck.valid) {
    return res.status(400).json({ error: 'New password requirements not met', details: passCheck.errors });
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.updatedAt = new Date().toISOString();
  saveUser(user);

  res.json({ success: true });
});

// GET /api/auth/permissions
router.get('/permissions', requireAuth, (req, res) => {
  const perms = ROLE_PERMISSIONS[req.user.role] || [];
  res.json({ role: req.user.role, permissions: perms });
});

// ── Helpers ───────────────────────────────────────
function safeUser(user) {
  const { passwordHash, mfaSecret, mfaBackupCodes, webauthnCredentials, ...safe } = user;
  return safe;
}

export { router as authRouter, ROLE_PERMISSIONS };
export default router;
