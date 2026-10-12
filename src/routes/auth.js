// Nexus AI Pro - Auth Routes | 2026-10-12
import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const router = Router();

// In-memory store (replace with Redis/DB in production)
const users = new Map();
const sessions = new Map();
const mfaTokens = new Map();
const pendingBiometric = new Map();

const ROLES = { user: 0, moderator: 1, developer: 2, admin: 3 };
const BCRYPT_ROUNDS = 14;
const JWT_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

const PASSWORD_RULES = {
  minLength: 13,
  requireUppercase: /[A-Z]/,
  requireLowercase: /[a-z]/,
  requireNumber: /[0-9]/,
  requireSpecial: /[^A-Za-z0-9]/,
};

function validatePassword(password) {
  const errs = [];
  if (!password || password.length < PASSWORD_RULES.minLength)
    errs.push(`Minimum ${PASSWORD_RULES.minLength} characters required`);
  if (!PASSWORD_RULES.requireUppercase.test(password))
    errs.push('Must include uppercase letter');
  if (!PASSWORD_RULES.requireLowercase.test(password))
    errs.push('Must include lowercase letter');
  if (!PASSWORD_RULES.requireNumber.test(password))
    errs.push('Must include number');
  if (!PASSWORD_RULES.requireSpecial.test(password))
    errs.push('Must include special character');
  return errs;
}

function validateUsername(username) {
  if (!username || username.length < 2) return ['Username too short'];
  if (username.length > 50) return ['Username too long (max 50 chars)'];
  // Allow Unicode letters, numbers, emojis, underscores, hyphens
  // Using a permissive regex that blocks only dangerous control chars
  const dangerous = /[\u0000-\u001F\u007F-\u009F]/;
  if (dangerous.test(username)) return ['Username contains invalid characters'];
  return [];
}

function generateTokens(userId, role) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  const access = jwt.sign(
    { sub: userId, role, type: 'access', jti: crypto.randomUUID() },
    secret,
    { expiresIn: JWT_EXPIRY, algorithm: 'HS256' }
  );
  const refresh = jwt.sign(
    { sub: userId, role, type: 'refresh', jti: crypto.randomUUID() },
    secret,
    { expiresIn: REFRESH_EXPIRY, algorithm: 'HS256' }
  );
  return { access, refresh };
}

function setAuthCookies(res, tokens) {
  const secure = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, sameSite: 'strict', secure, path: '/' };
  res.cookie('nexus_access', tokens.access, { ...opts, maxAge: 15 * 60 * 1000 });
  res.cookie('nexus_refresh', tokens.refresh, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res) {
  res.clearCookie('nexus_access', { path: '/' });
  res.clearCookie('nexus_refresh', { path: '/' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'user', inviteCode } = req.body;

    const usernameErrs = validateUsername(username);
    if (usernameErrs.length) return res.status(400).json({ errors: usernameErrs });

    const passwordErrs = validatePassword(password);
    if (passwordErrs.length) return res.status(400).json({ errors: passwordErrs });

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ errors: ['Valid email required'] });

    // Elevated roles require invite code
    if (ROLES[role] > ROLES.user) {
      const expected = process.env[`INVITE_CODE_${role.toUpperCase()}`];
      if (!expected || inviteCode !== expected)
        return res.status(403).json({ error: 'Invalid invite code for elevated role' });
    }

    const userId = crypto.randomUUID();
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    users.set(userId, {
      id: userId,
      username,
      email,
      passwordHash: hash,
      role: role in ROLES ? role : 'user',
      createdAt: new Date().toISOString(),
      mfaEnabled: false,
      mfaSecret: null,
      biometricPublicKey: null,
      active: true,
    });

    const tokens = generateTokens(userId, role);
    setAuthCookies(res, tokens);

    res.status(201).json({
      userId,
      username,
      role,
      mfaRequired: false,
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = Array.from(users.values()).find(u => u.email === email);
    if (!user || !await bcrypt.compare(password, user.passwordHash))
      return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.active)
      return res.status(403).json({ error: 'Account suspended' });

    if (user.mfaEnabled) {
      const mfaChallenge = crypto.randomBytes(32).toString('hex');
      mfaTokens.set(mfaChallenge, { userId: user.id, expires: Date.now() + 5 * 60 * 1000 });
      return res.json({ mfaRequired: true, mfaChallenge });
    }

    const tokens = generateTokens(user.id, user.role);
    setAuthCookies(res, tokens);
    res.json({ userId: user.id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', (req, res) => {
  const { mfaChallenge, totpCode } = req.body;
  const pending = mfaTokens.get(mfaChallenge);
  if (!pending || pending.expires < Date.now()) {
    mfaTokens.delete(mfaChallenge);
    return res.status(401).json({ error: 'MFA challenge expired' });
  }

  const user = users.get(pending.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  // TOTP verification: in production use speakeasy or otplib
  // For now verify against server-stored secret via time-based algo
  const expected = generateTOTP(user.mfaSecret, Date.now());
  if (totpCode !== expected)
    return res.status(401).json({ error: 'Invalid MFA code' });

  mfaTokens.delete(mfaChallenge);
  const tokens = generateTokens(user.id, user.role);
  setAuthCookies(res, tokens);
  res.json({ userId: user.id, username: user.username, role: user.role });
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', requireAuth, (req, res) => {
  const secret = crypto.randomBytes(20).toString('base32');
  const user = users.get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.mfaSecret = secret;
  const otpAuthUrl = `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro`;
  res.json({ secret, otpAuthUrl });
});

// POST /api/auth/mfa/enable
router.post('/mfa/enable', requireAuth, (req, res) => {
  const { totpCode } = req.body;
  const user = users.get(req.userId);
  if (!user || !user.mfaSecret) return res.status(400).json({ error: 'MFA not set up' });

  const expected = generateTOTP(user.mfaSecret, Date.now());
  if (totpCode !== expected) return res.status(401).json({ error: 'Invalid TOTP code' });

  user.mfaEnabled = true;
  res.json({ mfaEnabled: true });
});

// POST /api/auth/biometric/register
router.post('/biometric/register', requireAuth, (req, res) => {
  const { publicKey, credentialId, type } = req.body;
  if (!publicKey || !credentialId || !['fingerprint', 'faceid', 'touchid', 'retinal'].includes(type))
    return res.status(400).json({ error: 'Invalid biometric data' });

  const user = users.get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.biometricPublicKey = { publicKey, credentialId, type, registeredAt: new Date().toISOString() };
  res.json({ registered: true, type });
});

// POST /api/auth/biometric/authenticate
router.post('/biometric/authenticate', (req, res) => {
  const { credentialId, signature, challenge } = req.body;
  const user = Array.from(users.values()).find(
    u => u.biometricPublicKey?.credentialId === credentialId
  );

  if (!user || !user.biometricPublicKey)
    return res.status(401).json({ error: 'Biometric not registered' });

  // In production: verify WebAuthn assertion signature against stored public key
  // For now: accept valid challenge format
  const pendingChallenge = pendingBiometric.get(credentialId);
  if (!pendingChallenge || pendingChallenge !== challenge)
    return res.status(401).json({ error: 'Invalid biometric challenge' });

  pendingBiometric.delete(credentialId);
  const tokens = generateTokens(user.id, user.role);
  setAuthCookies(res, tokens);
  res.json({ userId: user.id, username: user.username, role: user.role });
});

// GET /api/auth/biometric/challenge
router.get('/biometric/challenge', (req, res) => {
  const challenge = crypto.randomBytes(32).toString('base64url');
  // Associate challenge with request (simplified - production uses session)
  res.json({ challenge, timeout: 60000 });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const token = req.cookies?.nexus_refresh;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'refresh') throw new Error('Wrong token type');

    const user = users.get(payload.sub);
    if (!user || !user.active) throw new Error('User not found');

    const tokens = generateTokens(payload.sub, payload.role);
    setAuthCookies(res, tokens);
    res.json({ refreshed: true });
  } catch {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  clearAuthCookies(res);
  sessions.delete(req.userId);
  res.json({ loggedOut: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, mfaSecret, biometricPublicKey, ...safe } = user;
  res.json({ ...safe, biometricRegistered: !!biometricPublicKey });
});

// Password strength check (unauthenticated)
router.post('/password-strength', (req, res) => {
  const { password } = req.body;
  const errs = validatePassword(password || '');
  const score = Math.max(0, 5 - errs.length);
  const levels = ['very-weak', 'weak', 'fair', 'good', 'strong', 'very-strong'];
  res.json({ valid: errs.length === 0, errors: errs, score, level: levels[score] });
});

// Middleware
function requireAuth(req, res, next) {
  const token = req.cookies?.nexus_access || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'access') throw new Error('Wrong token type');
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Simplified TOTP per RFC 6238 (production: replace with otplib)
function generateTOTP(secret, timestamp) {
  const step = Math.floor(timestamp / 30000);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(0, 0);
  counter.writeUInt32BE(step, 4);
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
  hmac.update(counter);
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    (hash[offset + 1] << 16) |
    (hash[offset + 2] << 8) |
    hash[offset + 3]
  ) % 1000000;
  return code.toString().padStart(6, '0');
}

export { router as authRouter, requireAuth };
