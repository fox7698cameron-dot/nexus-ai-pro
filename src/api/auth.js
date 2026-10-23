// src/api/auth.js
// 2026-10-23 - Enterprise authentication API with RBAC, 2FA/MFA, biometrics support
// All secrets read from process.env only - never hardcoded

import { Router } from 'express';
import { createHmac, randomBytes, timingSafeEqual, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// ─── Constants ────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 14;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOTP_WINDOW = 1; // allow ±1 time-step
const TOTP_STEP = 30; // 30-second TOTP window

// Supported roles in privilege order
const ROLES = ['user', 'moderator', 'developer', 'admin'];

// Username: 3-30 chars, unicode letters/numbers/emoji/marks + ._-space
const USERNAME_RE = /^[\p{L}\p{N}\p{Emoji_Presentation}\p{M}._\-\s]{3,30}$/u;

// Password: ≥13 chars, upper, lower, digit, special (unicode special = non-alnum)
const PASSWORD_MIN_LEN = 13;

// ─── In-memory stores (swap for Redis/DB in production) ───────────────────────
/** @type {Map<string, object>} userId → user record */
const users = new Map();

/** @type {Map<string, string>} email → userId */
const emailIndex = new Map();

/** @type {Map<string, string>} hashed refresh token → userId */
const refreshTokens = new Map();

/** @type {Map<string, { count: number, resetAt: number }>} ip → rate state */
const ipRateMap = new Map();

/** @type {Array<{ action: string, userId: string|null, ts: number, success: boolean }>} */
const auditLog = [];

// ─── Audit logging ────────────────────────────────────────────────────────────
function audit(action, userId, success) {
  auditLog.push({ action, userId: userId || null, ts: Date.now(), success });
  if (auditLog.length > 5000) auditLog.shift(); // rolling cap
}

// ─── Password strength validation ─────────────────────────────────────────────
function validatePassword(pw) {
  if (pw.length < PASSWORD_MIN_LEN) return 'Password must be at least 13 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain a special character';
  return null;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var not set');
  return secret;
}

function issueTokens(userId, role) {
  const secret = getJwtSecret();
  const accessToken = jwt.sign({ sub: userId, role, type: 'access' }, secret, { expiresIn: ACCESS_TTL });
  const rawRefresh = randomBytes(40).toString('hex');
  const hashedRefresh = createHash('sha256').update(rawRefresh).digest('hex');
  refreshTokens.set(hashedRefresh, userId);
  // auto-expire refresh token
  setTimeout(() => refreshTokens.delete(hashedRefresh), REFRESH_TTL_MS);
  return { accessToken, refreshToken: rawRefresh };
}

// ─── TOTP (RFC 6238 / HOTP RFC 4226) ─────────────────────────────────────────
function generateTotpSecret() {
  return randomBytes(20).toString('hex'); // 160-bit secret
}

function hotp(secretHex, counter) {
  const key = Buffer.from(secretHex, 'hex');
  const msg = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const hmac = createHmac('sha1', key).update(msg).digest();
  const offset = hmac[19] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1000000).padStart(6, '0');
}

function verifyTotp(secretHex, token) {
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP);
  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
    if (hotp(secretHex, counter + delta) === token) return true;
  }
  return false;
}

// ─── IP rate limiting ─────────────────────────────────────────────────────────
function checkIpRate(ip, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const state = ipRateMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > state.resetAt) {
    state.count = 0;
    state.resetAt = now + windowMs;
  }
  state.count += 1;
  ipRateMap.set(ip, state);
  return state.count <= limit;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/** Verifies JWT access token on protected routes */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.type !== 'access') throw new Error('wrong token type');
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-based access control factory
 * @param {string[]} roles - allowed roles
 */
export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const idx = ROLES.indexOf(req.user.role);
    const allowed = roles.some(r => idx >= ROLES.indexOf(r));
    if (!allowed) return res.status(403).json({ error: 'Insufficient privileges' });
    next();
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** POST /api/auth/register */
router.post('/register', async (req, res) => {
  const ip = req.ip;
  if (!checkIpRate(ip, 10, 60_000)) return res.status(429).json({ error: 'Too many requests' });

  const { username, email, password, locale } = req.body || {};
  const lang = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || locale || 'en';

  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Invalid username' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  if (emailIndex.has(email.toLowerCase())) {
    audit('REGISTER_DUPLICATE', null, false);
    return res.status(409).json({ error: 'Email already registered' });
  }

  const userId = uuidv4();
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  users.set(userId, {
    id: userId,
    username,
    email: email.toLowerCase(),
    passwordHash: hash,
    role: 'user', // all registrations are 'user'; roles elevated by admin
    locale: lang,
    totpSecret: null,
    totpEnabled: false,
    biometrics: { fingerprint: false, faceId: false, retinal: false },
    mfaDevices: [],
    createdAt: Date.now(),
  });
  emailIndex.set(email.toLowerCase(), userId);

  audit('REGISTER', userId, true);
  res.status(201).json({ message: 'Account created', userId });
});

/** POST /api/auth/login */
router.post('/login', async (req, res) => {
  const ip = req.ip;
  if (!checkIpRate(ip, 15, 60_000)) return res.status(429).json({ error: 'Too many requests' });

  const { email, password, totpToken } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  const userId = emailIndex.get(email.toLowerCase());
  const user = userId ? users.get(userId) : null;

  // Constant-time comparison to prevent user enumeration
  const dummyHash = '$2a$14$dummyhashfortimingattackprevention000000000000000000000';
  const hashToCompare = user ? user.passwordHash : dummyHash;
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!valid || !user) {
    audit('LOGIN_FAIL', userId || null, false);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.totpEnabled) {
    if (!totpToken) return res.status(200).json({ requires2FA: true });
    if (!verifyTotp(user.totpSecret, String(totpToken))) {
      audit('LOGIN_2FA_FAIL', userId, false);
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }
  }

  const tokens = issueTokens(userId, user.role);
  audit('LOGIN', userId, true);
  res.json({ ...tokens, role: user.role, locale: user.locale });
});

/** POST /api/auth/refresh */
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'Missing token' });

  const hashed = createHash('sha256').update(refreshToken).digest('hex');
  const userId = refreshTokens.get(hashed);
  if (!userId) return res.status(401).json({ error: 'Invalid refresh token' });

  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  refreshTokens.delete(hashed);
  const tokens = issueTokens(userId, user.role);
  audit('TOKEN_REFRESH', userId, true);
  res.json(tokens);
});

/** POST /api/auth/logout */
router.post('/logout', authMiddleware, (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    const hashed = createHash('sha256').update(refreshToken).digest('hex');
    refreshTokens.delete(hashed);
  }
  audit('LOGOUT', req.user.id, true);
  res.json({ message: 'Logged out' });
});

/** POST /api/auth/totp/setup */
router.post('/totp/setup', authMiddleware, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const secret = generateTotpSecret();
  user.totpSecret = secret;
  user.totpEnabled = false; // not enabled until verified
  res.json({ secret, otpauthUrl: `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${Buffer.from(secret, 'hex').toString('base32')}&issuer=NexusAIPro` });
});

/** POST /api/auth/totp/verify */
router.post('/totp/verify', authMiddleware, (req, res) => {
  const { token } = req.body || {};
  const user = users.get(req.user.id);
  if (!user || !user.totpSecret) return res.status(400).json({ error: 'TOTP not set up' });
  if (!verifyTotp(user.totpSecret, String(token))) {
    audit('TOTP_VERIFY_FAIL', req.user.id, false);
    return res.status(401).json({ error: 'Invalid token' });
  }
  user.totpEnabled = true;
  audit('TOTP_ENABLED', req.user.id, true);
  res.json({ message: '2FA enabled' });
});

/** POST /api/auth/biometric/enroll */
router.post('/biometric/enroll', authMiddleware, (req, res) => {
  const { type } = req.body || {}; // 'fingerprint' | 'faceId' | 'retinal'
  const allowed = ['fingerprint', 'faceId', 'retinal'];
  if (!allowed.includes(type)) return res.status(400).json({ error: 'Invalid biometric type' });
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.biometrics[type] = true;
  audit('BIOMETRIC_ENROLL', req.user.id, true);
  res.json({ message: `${type} enrolled`, biometrics: user.biometrics });
});

/** POST /api/auth/mfa/device */
router.post('/mfa/device', authMiddleware, (req, res) => {
  const { deviceName } = req.body || {};
  if (!deviceName) return res.status(400).json({ error: 'Device name required' });
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const device = { id: uuidv4(), name: deviceName, enrolledAt: Date.now() };
  user.mfaDevices.push(device);
  audit('MFA_DEVICE_ADD', req.user.id, true);
  res.json({ device });
});

/** GET /api/auth/me */
router.get('/me', authMiddleware, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, totpSecret, ...safe } = user;
  res.json(safe);
});

/** PATCH /api/auth/role - admin only */
router.patch('/role', authMiddleware, requireRole(['admin']), (req, res) => {
  const { targetUserId, role } = req.body || {};
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const user = users.get(targetUserId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = role;
  audit('ROLE_CHANGE', req.user.id, true);
  res.json({ message: 'Role updated', role });
});

export default router;
