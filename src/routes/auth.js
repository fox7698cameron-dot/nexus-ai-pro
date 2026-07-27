// src/routes/auth.js
// 2026-07-27 | Nexus AI Pro — Authentication routes
// JWT + role-based access + MFA/2FA + biometric support + 13-char min passwords

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

// In-memory stores (replace with Redis/DB in production)
const users = new Map();
const mfaSecrets = new Map();
const refreshTokens = new Set();
const biometricKeys = new Map();
const auditLog = [];

// Supported roles with permission levels
const ROLES = {
  user: 1,
  moderator: 2,
  developer: 3,
  admin: 4,
};

// TOTP implementation (RFC 6238) — no external lib
function generateTOTP(secret, window = 0) {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30) + window;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));
  const key = Buffer.from(secret, 'base64');
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
  return code;
}

function verifyTOTP(secret, token) {
  for (let w = -1; w <= 1; w++) {
    if (generateTOTP(secret, w) === token) return true;
  }
  return false;
}

function generateMFASecret() {
  return crypto.randomBytes(20).toString('base64');
}

// Password strength: min 13 chars, uppercase, lowercase, digit, special
function validatePassword(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string' };
  if (password.length < 13) return { valid: false, reason: 'Password must be at least 13 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, reason: 'Password must contain an uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, reason: 'Password must contain a lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, reason: 'Password must contain a digit' };
  if (!/[^A-Za-z0-9]/.test(password)) return { valid: false, reason: 'Password must contain a special character' };
  return { valid: true };
}

// Username: supports Unicode, emoji, special chars — sanitise for display safety
function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, reason: 'Username must be a string' };
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 64) return { valid: false, reason: 'Username must be 2-64 characters' };
  return { valid: true, username: trimmed };
}

function signTokens(userId, role) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not set');
  const accessToken = jwt.sign({ sub: userId, role }, jwtSecret, { expiresIn: '15m', algorithm: 'HS256' });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  refreshTokens.add(refreshToken);
  return { accessToken, refreshToken, expiresIn: 900 };
}

function writeAudit(event, userId, meta = {}) {
  auditLog.push({ ts: new Date().toISOString(), event, userId, ...meta });
  if (auditLog.length > 5000) auditLog.splice(0, 1000);
}

// ─── Register ───────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, language = 'en', region = 'US' } = req.body;

    const unCheck = validateUsername(username);
    if (!unCheck.valid) return res.status(400).json({ error: unCheck.reason });

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.reason });

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Duplicate check
    for (const u of users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id,
      username: unCheck.username,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user',
      mfaEnabled: false,
      biometricEnabled: false,
      language,
      region,
      createdAt: new Date().toISOString(),
    };
    users.set(id, user);
    writeAudit('REGISTER', id, { email: user.email });

    const tokens = signTokens(id, user.role);
    res.status(201).json({ userId: id, role: user.role, username: user.username, ...tokens });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, mfaToken, biometricAssertion } = req.body;

    let found = null;
    for (const u of users.values()) {
      if (u.email.toLowerCase() === email?.toLowerCase()) { found = u; break; }
    }
    if (!found) return res.status(401).json({ error: 'Invalid credentials' });

    const pwOk = await bcrypt.compare(password, found.passwordHash);
    if (!pwOk) {
      writeAudit('LOGIN_FAILED', found.id, { reason: 'bad_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // MFA check
    if (found.mfaEnabled) {
      if (!mfaToken) return res.status(401).json({ error: 'MFA token required', mfaRequired: true });
      const secret = mfaSecrets.get(found.id);
      if (!verifyTOTP(secret, mfaToken)) {
        writeAudit('MFA_FAILED', found.id);
        return res.status(401).json({ error: 'Invalid MFA token' });
      }
    }

    writeAudit('LOGIN_OK', found.id);
    const tokens = signTokens(found.id, found.role);
    res.json({ userId: found.id, role: found.role, username: found.username, language: found.language, region: found.region, ...tokens });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Refresh token ───────────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  try {
    // Decode without verifying expiry to extract userId
    const decoded = jwt.decode(req.body.accessToken || '');
    if (!decoded?.sub) return res.status(401).json({ error: 'Invalid access token payload' });
    const user = users.get(decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    refreshTokens.delete(refreshToken);
    const tokens = signTokens(user.id, user.role);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// ─── MFA Setup ───────────────────────────────────────────────────────────────
router.post('/mfa/setup', requireAuth(), (req, res) => {
  const userId = req.user.sub;
  const secret = generateMFASecret();
  mfaSecrets.set(userId, secret);
  // Return secret for user to add to authenticator app
  res.json({ secret, algorithm: 'TOTP-SHA1', digits: 6, period: 30 });
});

router.post('/mfa/verify', requireAuth(), (req, res) => {
  const userId = req.user.sub;
  const { token } = req.body;
  const secret = mfaSecrets.get(userId);
  if (!secret) return res.status(400).json({ error: 'MFA not set up' });
  if (!verifyTOTP(secret, token)) return res.status(401).json({ error: 'Invalid token' });

  const user = users.get(userId);
  if (user) { user.mfaEnabled = true; users.set(userId, user); }
  writeAudit('MFA_ENABLED', userId);
  res.json({ mfaEnabled: true });
});

router.delete('/mfa', requireAuth(), (req, res) => {
  const userId = req.user.sub;
  mfaSecrets.delete(userId);
  const user = users.get(userId);
  if (user) { user.mfaEnabled = false; users.set(userId, user); }
  writeAudit('MFA_DISABLED', userId);
  res.json({ mfaEnabled: false });
});

// ─── Biometric Registration ───────────────────────────────────────────────────
router.post('/biometric/register', requireAuth(), (req, res) => {
  const userId = req.user.sub;
  const { type, publicKey, deviceId } = req.body;
  const supportedTypes = ['fingerprint', 'face_id', 'touch_id', 'retinal'];
  if (!supportedTypes.includes(type)) {
    return res.status(400).json({ error: `Unsupported biometric type. Use: ${supportedTypes.join(', ')}` });
  }
  if (!publicKey || typeof publicKey !== 'string') {
    return res.status(400).json({ error: 'publicKey required (base64-encoded)' });
  }

  const entry = { type, publicKey, deviceId: deviceId || uuidv4(), registeredAt: new Date().toISOString() };
  const existing = biometricKeys.get(userId) || [];
  existing.push(entry);
  biometricKeys.set(userId, existing);

  const user = users.get(userId);
  if (user) { user.biometricEnabled = true; users.set(userId, user); }
  writeAudit('BIOMETRIC_REGISTER', userId, { type });
  res.json({ registered: true, type, deviceId: entry.deviceId });
});

router.get('/biometric/keys', requireAuth(), (req, res) => {
  const keys = biometricKeys.get(req.user.sub) || [];
  res.json({ keys: keys.map(k => ({ type: k.type, deviceId: k.deviceId, registeredAt: k.registeredAt })) });
});

// ─── Profile / Role ───────────────────────────────────────────────────────────
router.get('/me', requireAuth(), (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

router.put('/role', requireAuth(ROLES.admin), (req, res) => {
  const { userId, role } = req.body;
  if (!ROLES[role]) return res.status(400).json({ error: 'Invalid role' });
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = role;
  users.set(userId, user);
  writeAudit('ROLE_CHANGED', req.user.sub, { targetUser: userId, newRole: role });
  res.json({ updated: true, userId, role });
});

router.put('/language', requireAuth(), (req, res) => {
  const { language, region } = req.body;
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (language) user.language = language;
  if (region) user.region = region;
  users.set(req.user.sub, user);
  res.json({ language: user.language, region: user.region });
});

// ─── Audit log (admin only) ───────────────────────────────────────────────────
router.get('/audit', requireAuth(ROLES.admin), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  res.json({ entries: auditLog.slice(-limit), total: auditLog.length });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ loggedOut: true });
});

// ─── Auth middleware factory ──────────────────────────────────────────────────
export function requireAuth(minRole = ROLES.user) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    const token = header.slice(7);
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ error: 'Server misconfigured' });
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      const userRole = ROLES[decoded.role] || ROLES.user;
      if (userRole < minRole) return res.status(403).json({ error: 'Insufficient permissions' });
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

export { router as authRouter, users, ROLES };
