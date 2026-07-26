// routes/auth.js — 2026-07-26
// Authentication: register, login, JWT refresh, TOTP 2FA, biometrics, role-based access
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ── In-memory stores (replace with DB in production) ──────────────────────────
const users = new Map();          // id → user record
const refreshTokens = new Set();  // valid refresh token strings
const totpSecrets = new Map();    // userId → base32 secret
const biometricCredentials = new Map(); // userId → credential id set

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'dev', MODERATOR: 'moderator', USER: 'user' });
const ACCESS_TTL  = '15m';
const REFRESH_TTL = '7d';
const BCRYPT_ROUNDS = 12;

// 13-char minimum, at least 1 upper, 1 lower, 1 digit, 1 special
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{13,}$/;

// Username: unicode letters/digits/emoji/underscores/hyphens, 2–64 chars
const USERNAME_RE = /^[\p{L}\p{N}\p{Emoji_Presentation}_-]{2,64}$/u;

// ── Helpers ────────────────────────────────────────────────────────────────────
function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not configured');
  return s;
}

function issueTokens(userId, role) {
  const payload = { sub: userId, role, iat: Math.floor(Date.now() / 1000) };
  const access  = jwt.sign(payload, jwtSecret(), { expiresIn: ACCESS_TTL });
  const refresh = jwt.sign(payload, jwtSecret(), { expiresIn: REFRESH_TTL });
  refreshTokens.add(refresh);
  return { access, refresh };
}

// TOTP using RFC 6238 / HMAC-SHA1 with 30-second step
function generateTotpSecret() {
  return crypto.randomBytes(20).toString('base64url');
}

function verifyTotp(secret, token) {
  for (let d = -1; d <= 1; d++) {
    const step = Math.floor(Date.now() / 1000 / 30) + d;
    const msg  = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(step));
    const key  = Buffer.from(secret, 'base64url');
    const hmac = crypto.createHmac('sha1', key).update(msg).digest();
    const off  = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac.readUInt32BE(off) & 0x7fffffff) % 1_000_000)
      .toString().padStart(6, '0');
    if (crypto.timingSafeEqual(Buffer.from(code), Buffer.from(token.padStart(6, '0')))) {
      return true;
    }
  }
  return false;
}

// ── Auth middleware ────────────────────────────────────────────────────────────
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), jwtSecret());
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Role '${req.user.role}' cannot access this resource` });
    }
    next();
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = ROLES.USER, language = 'en', region = 'US' } = req.body;

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Invalid username. Use 2-64 chars: letters, numbers, emojis, _ or -' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!PASSWORD_RE.test(password)) {
      return res.status(400).json({
        error: 'Password must be 13+ chars with upper, lower, digit, and special character'
      });
    }
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = [...users.values()].find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = {
      id,
      username,
      email,
      passwordHash: hash,
      role: role === ROLES.ADMIN ? ROLES.USER : role, // prevent self-promotion to admin
      language,
      region,
      mfaEnabled: false,
      biometricEnabled: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      active: true,
    };
    users.set(id, user);

    const { access, refresh } = issueTokens(id, user.role);
    res.status(201).json({
      user: { id, username, email, role: user.role, language, region },
      access,
      refresh,
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, totpToken } = req.body;
    const user = [...users.values()].find(u => u.email === email && u.active);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.mfaEnabled) {
      const secret = totpSecrets.get(user.id);
      if (!totpToken || !secret || !verifyTotp(secret, totpToken)) {
        return res.status(401).json({ error: 'Invalid or missing 2FA code', mfaRequired: true });
      }
    }

    users.get(user.id).lastLoginAt = new Date().toISOString();
    const { access, refresh } = issueTokens(user.id, user.role);
    res.json({
      user: { id: user.id, username: user.username, email, role: user.role, language: user.language, region: user.region, mfaEnabled: user.mfaEnabled },
      access,
      refresh,
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  try {
    const decoded = jwt.verify(refreshToken, jwtSecret());
    refreshTokens.delete(refreshToken);
    const { access, refresh } = issueTokens(decoded.sub, decoded.role);
    res.json({ access, refresh });
  } catch {
    refreshTokens.delete(refreshToken);
    res.status(401).json({ error: 'Refresh token expired' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash: _ph, ...safe } = user;
  res.json(safe);
});

// ── 2FA / MFA ─────────────────────────────────────────────────────────────────

// POST /api/auth/2fa/setup — generate TOTP secret
router.post('/2fa/setup', requireAuth, (req, res) => {
  const secret = generateTotpSecret();
  totpSecrets.set(req.user.sub, secret);
  const user = users.get(req.user.sub);
  const otpauth = `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro&algorithm=SHA1&digits=6&period=30`;
  res.json({ secret, otpauth });
});

// POST /api/auth/2fa/verify — confirm and enable 2FA
router.post('/2fa/verify', requireAuth, (req, res) => {
  const { token } = req.body;
  const secret = totpSecrets.get(req.user.sub);
  if (!secret) return res.status(400).json({ error: '2FA not set up' });
  if (!verifyTotp(secret, String(token))) {
    return res.status(400).json({ error: 'Invalid 2FA token' });
  }
  const user = users.get(req.user.sub);
  user.mfaEnabled = true;
  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex'));
  res.json({ enabled: true, backupCodes });
});

// POST /api/auth/2fa/disable
router.post('/2fa/disable', requireAuth, (req, res) => {
  const { token } = req.body;
  const secret = totpSecrets.get(req.user.sub);
  if (!secret || !verifyTotp(secret, String(token))) {
    return res.status(400).json({ error: 'Invalid 2FA token' });
  }
  totpSecrets.delete(req.user.sub);
  const user = users.get(req.user.sub);
  if (user) user.mfaEnabled = false;
  res.json({ disabled: true });
});

// ── Biometrics (server-side challenge/response skeleton) ──────────────────────

// POST /api/auth/biometric/register — store credential
router.post('/biometric/register', requireAuth, (req, res) => {
  const { credentialId, publicKey, type } = req.body;
  const ALLOWED_TYPES = ['fingerprint', 'faceid', 'touchid', 'retinal'];
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid biometric type' });
  }
  if (!credentialId || !publicKey) {
    return res.status(400).json({ error: 'credentialId and publicKey required' });
  }
  const set = biometricCredentials.get(req.user.sub) || new Map();
  set.set(credentialId, { publicKey, type, registeredAt: new Date().toISOString() });
  biometricCredentials.set(req.user.sub, set);
  const user = users.get(req.user.sub);
  if (user) user.biometricEnabled = true;
  res.json({ registered: true, credentialId });
});

// POST /api/auth/biometric/challenge — issue nonce
router.post('/biometric/challenge', (req, res) => {
  const challenge = crypto.randomBytes(32).toString('base64url');
  res.json({ challenge, expires: Date.now() + 60_000 });
});

// GET /api/auth/users — admin only
router.get('/users', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const list = [...users.values()].map(({ passwordHash: _ph2, ...u }) => u);
  res.json(list);
});

// PUT /api/auth/users/:id/role — admin only
router.put('/users/:id/role', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = role;
  res.json({ id: user.id, role });
});

// DELETE /api/auth/users/:id — admin only
router.delete('/users/:id', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.active = false;
  res.json({ deactivated: true });
});

export { users, ROLES };
export default router;
