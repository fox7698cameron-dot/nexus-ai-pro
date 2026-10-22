// Nexus AI Pro - Auth Routes Module | Date: 2026-10-22

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ── Configuration ────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;
const VALID_ROLES = ['admin', 'developer', 'moderator', 'user'];

// ── In-memory stores ─────────────────────────────────────────────────────────
const users = new Map();          // userId → userRecord
const usernameIndex = new Map();  // username (lower) → userId
const emailIndex = new Map();     // email (lower) → userId
const tokenBlocklist = new Set(); // invalidated JTIs
const biometricChallenges = new Map(); // userId → pending challenge

// ── Password validation ───────────────────────────────────────────────────────
// Min 13 chars; must contain at least one uppercase, lowercase, digit, special.
// Emoji / Unicode in usernames is fine; passwords must still meet ASCII class rules.
function validatePasswordStrength(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string.' };
  // Measure by Unicode code points so emoji don't inflate length unexpectedly
  const codePoints = [...password];
  if (codePoints.length < 13) {
    return { valid: false, reason: 'Password must be at least 13 characters long.' };
  }
  if (!/[A-Z]/.test(password)) return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  if (!/[a-z]/.test(password)) return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  if (!/[0-9]/.test(password)) return { valid: false, reason: 'Password must contain at least one digit.' };
  if (!/[^A-Za-z0-9]/.test(password)) return { valid: false, reason: 'Password must contain at least one special character.' };
  return { valid: true };
}

// ── TOTP (RFC 6238 / HMAC-SHA1, 30 s window, 6 digits) ───────────────────────
function generateTOTPSecret() {
  return crypto.randomBytes(20).toString('base32').replace(/=/g, '');
}

function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const str = base32.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output = [];
  for (const ch of str) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(output);
}

function generateTOTP(secret, timeStep = 30, digits = 6) {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 |
                 hmac[offset + 1] << 16 |
                 hmac[offset + 2] << 8 |
                 hmac[offset + 3]) % Math.pow(10, digits);
  return String(code).padStart(digits, '0');
}

function verifyTOTP(secret, token, windowSize = 1) {
  const timeStep = 30;
  const digits = 6;
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  for (let delta = -windowSize; delta <= windowSize; delta++) {
    const step = counter + delta;
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeUInt32BE(Math.floor(step / 0x100000000), 0);
    counterBuf.writeUInt32BE(step >>> 0, 4);
    const key = base32Decode(secret);
    const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24 |
                   hmac[offset + 1] << 16 |
                   hmac[offset + 2] << 8 |
                   hmac[offset + 3]) % Math.pow(10, digits);
    const expected = String(code).padStart(digits, '0');
    if (crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(String(token).padStart(digits, '0'), 'utf8'))) {
      return true;
    }
  }
  return false;
}

// ── JWT helpers ───────────────────────────────────────────────────────────────
function issueTokens(user) {
  const jti = uuidv4();
  const payload = {
    sub: user.id,
    jti,
    role: user.role,
    username: user.username,
  };
  const access = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshJti = uuidv4();
  const refresh = jwt.sign({ sub: user.id, jti: refreshJti, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { access, refresh };
}

function audit(action, data) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), action, ...data }));
}

// ── Exported middleware ───────────────────────────────────────────────────────
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Access token required.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (tokenBlocklist.has(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked.' });
    }
    if (decoded.type === 'refresh') {
      return res.status(401).json({ error: 'Refresh token cannot be used as access token.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}.` });
    }
    next();
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, role = 'user', displayName } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required.' });
  }
  const normalizedRole = VALID_ROLES.includes(role) ? role : 'user';
  const usernameKey = username.toLowerCase();
  const emailKey = email.toLowerCase();

  if (usernameIndex.has(usernameKey)) {
    return res.status(409).json({ error: 'Username already taken.' });
  }
  if (emailIndex.has(emailKey)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return res.status(422).json({ error: strength.reason });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = uuidv4();
  const user = {
    id,
    username,
    email: emailKey,
    displayName: displayName || username,
    passwordHash,
    role: normalizedRole,
    mfaEnabled: false,
    mfaSecret: null,
    biometricCredentials: [],
    createdAt: new Date().toISOString(),
  };

  users.set(id, user);
  usernameIndex.set(usernameKey, id);
  emailIndex.set(emailKey, id);

  const tokens = issueTokens(user);
  audit('REGISTER', { userId: id, username, role: normalizedRole });

  return res.status(201).json({
    user: { id, username, email: user.email, role: normalizedRole, displayName: user.displayName },
    ...tokens,
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier (username or email) and password are required.' });
  }

  const key = identifier.toLowerCase();
  const userId = usernameIndex.get(key) || emailIndex.get(key);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const user = users.get(userId);

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    audit('LOGIN_FAILED', { userId, identifier });
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  if (user.mfaEnabled) {
    const mfaChallengeToken = jwt.sign({ sub: userId, type: 'mfa_challenge' }, JWT_SECRET, { expiresIn: '5m' });
    audit('LOGIN_MFA_REQUIRED', { userId });
    return res.status(200).json({ mfaRequired: true, mfaChallengeToken });
  }

  const tokens = issueTokens(user);
  audit('LOGIN_SUCCESS', { userId });
  return res.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role, displayName: user.displayName },
    ...tokens,
  });
});

// POST /api/auth/login/mfa
router.post('/login/mfa', (req, res) => {
  const { mfaChallengeToken, totpCode } = req.body || {};
  if (!mfaChallengeToken || !totpCode) {
    return res.status(400).json({ error: 'mfaChallengeToken and totpCode are required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(mfaChallengeToken, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired MFA challenge token.' });
  }

  if (decoded.type !== 'mfa_challenge') {
    return res.status(401).json({ error: 'Invalid token type.' });
  }

  const user = users.get(decoded.sub);
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(401).json({ error: 'MFA not configured for this account.' });
  }

  if (!verifyTOTP(user.mfaSecret, String(totpCode))) {
    audit('MFA_FAILED', { userId: decoded.sub });
    return res.status(401).json({ error: 'Invalid TOTP code.' });
  }

  const tokens = issueTokens(user);
  audit('LOGIN_MFA_SUCCESS', { userId: decoded.sub });
  return res.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role, displayName: user.displayName },
    ...tokens,
  });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  tokenBlocklist.add(req.user.jti);
  audit('LOGOUT', { userId: req.user.sub });
  return res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
  });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required.' });

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }

  if (decoded.type !== 'refresh') {
    return res.status(401).json({ error: 'Not a refresh token.' });
  }
  if (tokenBlocklist.has(decoded.jti)) {
    return res.status(401).json({ error: 'Refresh token has been revoked.' });
  }

  const user = users.get(decoded.sub);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  tokenBlocklist.add(decoded.jti);
  const tokens = issueTokens(user);
  audit('TOKEN_REFRESHED', { userId: decoded.sub });
  return res.json(tokens);
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', authenticateToken, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const secret = generateTOTPSecret();
  user.pendingMfaSecret = secret;
  users.set(user.id, user);

  const otpauthUrl = `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro&algorithm=SHA1&digits=6&period=30`;
  audit('MFA_SETUP_INITIATED', { userId: user.id });
  return res.json({ secret, otpauthUrl });
});

// POST /api/auth/mfa/verify  — confirm pending secret and enable MFA
router.post('/mfa/verify', authenticateToken, (req, res) => {
  const { totpCode } = req.body || {};
  if (!totpCode) return res.status(400).json({ error: 'totpCode is required.' });

  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (!user.pendingMfaSecret) return res.status(400).json({ error: 'No MFA setup in progress. Call /mfa/setup first.' });

  if (!verifyTOTP(user.pendingMfaSecret, String(totpCode))) {
    return res.status(401).json({ error: 'Invalid TOTP code.' });
  }

  user.mfaSecret = user.pendingMfaSecret;
  user.mfaEnabled = true;
  delete user.pendingMfaSecret;
  users.set(user.id, user);

  audit('MFA_ENABLED', { userId: user.id });
  return res.json({ success: true, mfaEnabled: true });
});

// POST /api/auth/biometric/register — issue a WebAuthn-style challenge
router.post('/biometric/register', authenticateToken, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const challenge = crypto.randomBytes(32).toString('base64url');
  biometricChallenges.set(user.id, { challenge, createdAt: Date.now() });

  audit('BIOMETRIC_CHALLENGE_ISSUED', { userId: user.id });
  return res.json({
    challenge,
    rpId: process.env.RP_ID || 'nexusai.pro',
    rpName: 'Nexus AI Pro',
    userId: user.id,
    userName: user.username,
    userDisplayName: user.displayName,
    timeout: 60000,
    attestation: 'none',
  });
});

// POST /api/auth/biometric/verify — store credential after client-side signing
router.post('/biometric/verify', authenticateToken, (req, res) => {
  const { credentialId, clientDataJSON, attestationObject } = req.body || {};
  if (!credentialId || !clientDataJSON) {
    return res.status(400).json({ error: 'credentialId and clientDataJSON are required.' });
  }

  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const pending = biometricChallenges.get(user.id);
  if (!pending || Date.now() - pending.createdAt > 60000) {
    return res.status(401).json({ error: 'Challenge expired or not found.' });
  }
  biometricChallenges.delete(user.id);

  user.biometricCredentials.push({
    credentialId,
    registeredAt: new Date().toISOString(),
  });
  users.set(user.id, user);

  audit('BIOMETRIC_REGISTERED', { userId: user.id, credentialId });
  return res.json({ success: true });
});

// POST /api/auth/password/change
router.post('/password/change', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
  }

  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) return res.status(422).json({ error: strength.reason });

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  users.set(user.id, user);

  audit('PASSWORD_CHANGED', { userId: user.id });
  return res.json({ success: true });
});

export { router };
export default router;
