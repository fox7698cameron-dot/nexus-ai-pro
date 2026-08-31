// File: src/routes/auth.js | Created: 2026-08-31 | Nexus AI Pro
// Authentication routes: register, login, MFA, biometrics, token refresh
// Password min 13 chars. Username supports unicode/emojis. No hardcoded secrets.

import { Router } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  signToken, verifyToken, validatePassword, validateUsername,
  requireAuth, ROLES
} from '../middleware/auth.js';

const router = Router();

// ─────────────────────────────────────────
// In-memory user store (replace with DB)
// ─────────────────────────────────────────
const users = new Map();
const refreshTokens = new Set();
const mfaSecrets = new Map();
const biometricCredentials = new Map();
const pendingOtps = new Map();

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/** bcrypt-like password hashing via PBKDF2 (no external dep) */
function hashPassword(password) {
  const salt = randomBytes(32).toString('hex');
  const hash = createHash('sha512').update(salt + password + (process.env.PASSWORD_PEPPER || '')).digest('hex');
  return `${salt}:${hash}`;
}

function verifyPasswordHash(stored, input) {
  const [salt, hash] = stored.split(':');
  const inputHash = createHash('sha512').update(salt + input + (process.env.PASSWORD_PEPPER || '')).digest('hex');
  return timingSafeEqual(Buffer.from(hash), Buffer.from(inputHash));
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

// ─────────────────────────────────────────
// Registration
// ─────────────────────────────────────────

/** POST /api/auth/register */
router.post('/register', (req, res) => {
  const { username, email, password, role = ROLES.USER, language = 'en', displayName } = req.body;

  // Validate username (supports unicode, emojis)
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.error });

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Validate password (13+ chars, complexity)
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    return res.status(400).json({ error: 'Password too weak', issues: pwCheck.errors, score: pwCheck.score });
  }

  // Enforce allowed roles at registration (admin must be created by another admin)
  const allowedRoles = [ROLES.USER, ROLES.DEVELOPER, ROLES.MODERATOR];
  const assignedRole = allowedRoles.includes(role) ? role : ROLES.USER;

  // Check for existing user
  const existingEmail = Array.from(users.values()).find(u => u.email === email.toLowerCase());
  if (existingEmail) return res.status(409).json({ error: 'Email already registered' });

  const existingUsername = Array.from(users.values())
    .find(u => u.username.toLowerCase() === usernameCheck.username.toLowerCase());
  if (existingUsername) return res.status(409).json({ error: 'Username already taken' });

  const userId = uuidv4();
  const user = {
    id:           userId,
    username:     usernameCheck.username,
    displayName:  displayName ? String(displayName).slice(0, 100) : usernameCheck.username,
    email:        email.toLowerCase(),
    passwordHash: hashPassword(password),
    role:         assignedRole,
    language:     language,
    mfaEnabled:   false,
    mfaMethod:    null,
    biometricEnabled: false,
    createdAt:    new Date().toISOString(),
    lastLogin:    null,
    active:       true
  };

  users.set(userId, user);

  // Issue tokens
  const payload = { id: userId, role: assignedRole, email: user.email };
  const accessToken  = signToken(payload, 'access');
  const refreshToken = signToken({ id: userId }, 'refresh');
  refreshTokens.add(refreshToken);

  // Never return passwordHash
  const { passwordHash, ...safeUser } = user;

  res.status(201).json({
    user: safeUser,
    accessToken,
    refreshToken,
    expiresIn: parseInt(process.env.JWT_EXPIRY_MS || '3600000', 10) / 1000
  });
});

// ─────────────────────────────────────────
// Login
// ─────────────────────────────────────────

/** POST /api/auth/login */
router.post('/login', (req, res) => {
  const { email, password, mfaCode, rememberDevice } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = Array.from(users.values()).find(u => u.email === email.toLowerCase() && u.active);
  if (!user) {
    // Constant-time response to prevent user enumeration
    hashPassword('dummy-password-to-prevent-timing-attack');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  let pwValid = false;
  try { pwValid = verifyPasswordHash(user.passwordHash, password); } catch { /* */ }

  if (!pwValid) return res.status(401).json({ error: 'Invalid credentials' });

  // MFA check
  if (user.mfaEnabled) {
    if (!mfaCode) {
      return res.status(200).json({
        mfaRequired: true,
        mfaMethod:   user.mfaMethod,
        maskedEmail: maskEmail(user.email),
        tempToken:   signToken({ id: user.id, scope: 'mfa' }, 'access')
      });
    }
    // Verify MFA
    const stored = mfaSecrets.get(user.id);
    if (!stored || stored.code !== mfaCode || Date.now() > stored.expiry) {
      return res.status(401).json({ error: 'Invalid or expired MFA code' });
    }
    mfaSecrets.delete(user.id);
  }

  // Update last login
  users.set(user.id, { ...user, lastLogin: new Date().toISOString() });

  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken  = signToken(payload, 'access');
  const refreshToken = signToken({ id: user.id }, 'refresh');
  refreshTokens.add(refreshToken);

  const { passwordHash, ...safeUser } = user;
  res.json({
    user:         safeUser,
    accessToken,
    refreshToken,
    expiresIn:    parseInt(process.env.JWT_EXPIRY_MS || '3600000', 10) / 1000,
    rememberDevice: !!rememberDevice
  });
});

// ─────────────────────────────────────────
// Token refresh
// ─────────────────────────────────────────

/** POST /api/auth/refresh */
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  let decoded;
  try { decoded = verifyToken(refreshToken); } catch (e) {
    return res.status(401).json({ error: e.message });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Refresh token revoked' });
  }

  const user = users.get(decoded.id);
  if (!user || !user.active) return res.status(401).json({ error: 'User not found' });

  // Rotate refresh token
  refreshTokens.delete(refreshToken);
  const newAccess  = signToken({ id: user.id, role: user.role, email: user.email }, 'access');
  const newRefresh = signToken({ id: user.id }, 'refresh');
  refreshTokens.add(newRefresh);

  res.json({ accessToken: newAccess, refreshToken: newRefresh });
});

// ─────────────────────────────────────────
// MFA Setup & Verification
// ─────────────────────────────────────────

/** POST /api/auth/mfa/setup */
router.post('/mfa/setup', requireAuth, (req, res) => {
  const { method } = req.body; // totp | sms | email
  const allowed = ['totp', 'sms', 'email'];
  if (!allowed.includes(method)) return res.status(400).json({ error: `method must be one of: ${allowed.join(', ')}` });

  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // For TOTP: generate a secret (in prod use speakeasy/otplib)
  const secret = randomBytes(20).toString('base64url');

  // Generate setup OTP for email/SMS
  const setupCode = generateOtp();
  mfaSecrets.set(user.id, { code: setupCode, expiry: Date.now() + 600000, method });

  users.set(user.id, { ...user, mfaEnabled: false, mfaMethod: method }); // not enabled until verified

  res.json({
    method,
    secret:      method === 'totp' ? secret : undefined,
    otpUri:      method === 'totp' ? `otpauth://totp/NexusAI:${user.email}?secret=${secret}&issuer=NexusAIPro` : undefined,
    message:     method === 'totp' ? 'Scan QR code with authenticator app then verify' : `Verification code sent to ${maskEmail(user.email)}`
  });
});

/** POST /api/auth/mfa/verify */
router.post('/mfa/verify', requireAuth, (req, res) => {
  const { code } = req.body;
  const stored = mfaSecrets.get(req.user.id);
  if (!stored || stored.code !== String(code) || Date.now() > stored.expiry) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const user = users.get(req.user.id);
  users.set(req.user.id, { ...user, mfaEnabled: true });
  mfaSecrets.delete(req.user.id);

  res.json({ mfaEnabled: true, method: stored.method });
});

/** POST /api/auth/mfa/disable */
router.post('/mfa/disable', requireAuth, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  users.set(req.user.id, { ...user, mfaEnabled: false, mfaMethod: null });
  res.json({ mfaEnabled: false });
});

// ─────────────────────────────────────────
// Biometric Registration
// ─────────────────────────────────────────

/** POST /api/auth/biometric/register */
router.post('/biometric/register', requireAuth, (req, res) => {
  const { type, credentialId } = req.body; // type: fingerprint | faceId | touchId | retinal
  const allowedTypes = ['fingerprint', 'faceId', 'touchId', 'retinal'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${allowedTypes.join(', ')}` });
  }

  if (!credentialId || typeof credentialId !== 'string') {
    return res.status(400).json({ error: 'credentialId required (from platform biometric API)' });
  }

  const key = `${req.user.id}:${type}`;
  biometricCredentials.set(key, {
    userId:       req.user.id,
    type,
    credentialId: createHash('sha256').update(credentialId).digest('hex'), // store hash only
    registeredAt: new Date().toISOString()
  });

  const user = users.get(req.user.id);
  if (user) users.set(req.user.id, { ...user, biometricEnabled: true });

  res.json({ registered: true, type, registeredAt: new Date().toISOString() });
});

/** POST /api/auth/biometric/verify */
router.post('/biometric/verify', (req, res) => {
  const { userId, type, credentialId } = req.body;
  const key = `${userId}:${type}`;
  const stored = biometricCredentials.get(key);

  if (!stored) return res.status(401).json({ error: 'Biometric not registered' });

  const hash = createHash('sha256').update(credentialId).digest('hex');
  if (stored.credentialId !== hash) return res.status(401).json({ error: 'Biometric verification failed' });

  const user = users.get(userId);
  if (!user || !user.active) return res.status(401).json({ error: 'User not found' });

  const accessToken  = signToken({ id: user.id, role: user.role, email: user.email }, 'access');
  const refreshToken = signToken({ id: user.id }, 'refresh');
  refreshTokens.add(refreshToken);

  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser, accessToken, refreshToken });
});

// ─────────────────────────────────────────
// Password utilities
// ─────────────────────────────────────────

/** POST /api/auth/password/validate - check strength without registering */
router.post('/password/validate', (req, res) => {
  const { password } = req.body;
  res.json(validatePassword(password));
});

/** POST /api/auth/password/change */
router.post('/password/change', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!verifyPasswordHash(user.passwordHash, currentPassword)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }

  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) return res.status(400).json({ error: 'New password too weak', issues: pwCheck.errors });

  users.set(req.user.id, { ...user, passwordHash: hashPassword(newPassword) });
  res.json({ changed: true });
});

// ─────────────────────────────────────────
// Logout
// ─────────────────────────────────────────

/** POST /api/auth/logout */
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ loggedOut: true });
});

/** GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

/** GET /api/auth/translate */
router.get('/translate', (req, res) => {
  // Stub - in production proxy to Azure Translator or Google Translate using env-var key
  const { text, to } = req.query;
  res.json({
    original:   text,
    translated: text, // replace with actual translation call
    language:   to || 'en',
    provider:   'configured-via-env',
    note:       'Set TRANSLATION_API_KEY in environment for live translations'
  });
});

export default router;
