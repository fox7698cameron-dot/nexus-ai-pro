/**
 * NEXUS AI PRO - Authentication API Module
 * File: src/api/auth.js
 * Date: 2026-08-26
 *
 * Handles user registration, login, MFA/2FA, biometrics,
 * role-based access (admin/dev/moderator/user), JWT issuance.
 * No secrets or tokens are hardcoded — all from environment variables.
 */

import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { auditLog, sanitizeInput, validatePasswordStrength } from '../utils/helpers.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── In-memory user store (replace with DB in production) ─────────────────────
const users = new Map();
const refreshTokens = new Set();
const mfaSecrets = new Map();
const loginAttempts = new Map();

// ─── Constants ─────────────────────────────────────────────────────────────────
const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'dev', MODERATOR: 'moderator', USER: 'user' });
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const TOTP_WINDOW = 1; // ±1 step tolerance
const SALT_ROUNDS = 12;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function generateTOTPSecret() {
  return crypto.randomBytes(20).toString('base32').toUpperCase();
}

function generateTOTPCode(secret, timestamp = Date.now()) {
  // RFC 6238 TOTP: 30-second steps, SHA-1 HMAC
  const step = Math.floor(timestamp / 30000);
  const secretBuffer = Buffer.from(secret.replace(/=/g, ''), 'base64');
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(step), 0);
  const hmac = crypto.createHmac('sha1', secretBuffer).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

function verifyTOTP(secret, token) {
  const now = Date.now();
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    if (generateTOTPCode(secret, now + i * 30000) === token) return true;
  }
  return false;
}

function issueTokens(user) {
  const payload = { sub: user.id, role: user.role, email: user.email, iat: Math.floor(Date.now() / 1000) };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m', algorithm: 'HS256' });
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
  refreshTokens.add(refreshToken);
  return { accessToken, refreshToken };
}

function checkRateLimit(email) {
  const attempts = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  if (Date.now() < attempts.lockedUntil) {
    const remainingSec = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    return { blocked: true, remainingSec };
  }
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    attempts.count = 0;
    loginAttempts.set(email, attempts);
    return { blocked: true, remainingSec: LOCKOUT_DURATION_MS / 1000 };
  }
  return { blocked: false };
}

function incrementLoginAttempts(email) {
  const attempts = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  attempts.count += 1;
  loginAttempts.set(email, attempts);
}

function clearLoginAttempts(email) {
  loginAttempts.delete(email);
}

// ─── Registration ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, displayName, language = 'en', role = ROLES.USER } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    // Sanitize input (allows emoji and special characters in usernames)
    const safeUsername = sanitizeInput(username, { allowEmoji: true, allowSpecial: true, maxLength: 64 });
    const safeDisplayName = sanitizeInput(displayName || username, { allowEmoji: true, allowSpecial: true, maxLength: 128 });
    const safeEmail = sanitizeInput(email, { maxLength: 254 });

    // Password strength: minimum 13 characters with special chars
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.message, requirements: passwordCheck.requirements });
    }

    // Check duplicate email / username
    for (const [, u] of users) {
      if (u.email === safeEmail) return res.status(409).json({ error: 'Email already registered' });
      if (u.username === safeUsername) return res.status(409).json({ error: 'Username already taken' });
    }

    // Only allow admin/dev roles if requested by existing admin
    const allowedRole = [ROLES.ADMIN, ROLES.DEV].includes(role) ? ROLES.USER : role;

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = {
      id,
      email: safeEmail,
      username: safeUsername,
      displayName: safeDisplayName,
      passwordHash,
      role: allowedRole,
      language,
      createdAt: new Date().toISOString(),
      mfaEnabled: false,
      biometricEnabled: false,
      active: true,
    };
    users.set(id, user);

    auditLog('USER_REGISTERED', { id, email: safeEmail, role: allowedRole });
    const { passwordHash: _ph, ...publicUser } = user;
    res.status(201).json({ user: publicUser, message: 'Registration successful' });
  } catch (err) {
    auditLog('REGISTER_ERROR', { error: err.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, totpToken, biometricToken } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const rateCheck = checkRateLimit(email);
    if (rateCheck.blocked) {
      return res.status(429).json({ error: `Account locked. Try again in ${rateCheck.remainingSec}s` });
    }

    let user = null;
    for (const [, u] of users) {
      if (u.email === email) { user = u; break; }
    }

    if (!user || !user.active) {
      incrementLoginAttempts(email);
      auditLog('LOGIN_FAILED', { email, reason: 'user_not_found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      incrementLoginAttempts(email);
      auditLog('LOGIN_FAILED', { email, reason: 'wrong_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // MFA/2FA check
    if (user.mfaEnabled) {
      if (!totpToken) {
        return res.status(200).json({ mfaRequired: true, message: 'MFA code required' });
      }
      const secret = mfaSecrets.get(user.id);
      if (!secret || !verifyTOTP(secret, totpToken)) {
        incrementLoginAttempts(email);
        auditLog('MFA_FAILED', { userId: user.id });
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }

    // Biometric verification (if enabled and provided)
    if (user.biometricEnabled && biometricToken) {
      // Token is a signed assertion from device — verify signature
      try {
        const biometricPayload = jwt.verify(biometricToken, process.env.BIOMETRIC_SECRET || process.env.JWT_SECRET);
        if (biometricPayload.userId !== user.id) {
          return res.status(401).json({ error: 'Biometric verification failed' });
        }
      } catch {
        return res.status(401).json({ error: 'Invalid biometric token' });
      }
    }

    clearLoginAttempts(email);
    const tokens = issueTokens(user);
    auditLog('LOGIN_SUCCESS', { userId: user.id, role: user.role });

    const { passwordHash: _ph, ...publicUser } = user;
    res.json({ user: publicUser, ...tokens });
  } catch (err) {
    auditLog('LOGIN_ERROR', { error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Token Refresh ─────────────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = users.get(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'User not found' });

    refreshTokens.delete(refreshToken);
    const tokens = issueTokens(user);
    auditLog('TOKEN_REFRESHED', { userId: user.id });
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  auditLog('LOGOUT', { userId: req.user?.sub });
  res.json({ message: 'Logged out' });
});

// ─── MFA Setup ─────────────────────────────────────────────────────────────────
router.post('/mfa/setup', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = generateTOTPSecret();
  mfaSecrets.set(user.id, secret);
  const otpAuthUrl = `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro&algorithm=SHA1&digits=6&period=30`;

  auditLog('MFA_SETUP_INITIATED', { userId: user.id });
  res.json({ secret, otpAuthUrl, message: 'Scan QR code with authenticator app, then verify with /mfa/verify' });
});

router.post('/mfa/verify', requireAuth, (req, res) => {
  const { token } = req.body;
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = mfaSecrets.get(user.id);
  if (!secret) return res.status(400).json({ error: 'MFA setup not initiated' });

  if (!verifyTOTP(secret, token)) {
    return res.status(401).json({ error: 'Invalid TOTP code' });
  }

  user.mfaEnabled = true;
  users.set(user.id, user);
  auditLog('MFA_ENABLED', { userId: user.id });
  res.json({ message: 'MFA enabled successfully' });
});

router.delete('/mfa/disable', requireAuth, async (req, res) => {
  const { password, token } = req.body;
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) return res.status(401).json({ error: 'Invalid password' });

  const secret = mfaSecrets.get(user.id);
  if (secret && !verifyTOTP(secret, token)) {
    return res.status(401).json({ error: 'Invalid MFA code' });
  }

  user.mfaEnabled = false;
  mfaSecrets.delete(user.id);
  users.set(user.id, user);
  auditLog('MFA_DISABLED', { userId: user.id });
  res.json({ message: 'MFA disabled' });
});

// ─── Biometric registration ────────────────────────────────────────────────────
router.post('/biometric/register', requireAuth, (req, res) => {
  const { publicKey, deviceId, method } = req.body; // method: fingerprint | touchid | faceid | retinal
  const validMethods = ['fingerprint', 'touchid', 'faceid', 'retinal'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ error: `Invalid biometric method. Use: ${validMethods.join(', ')}` });
  }

  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.biometrics) user.biometrics = [];
  const existing = user.biometrics.find(b => b.deviceId === deviceId && b.method === method);
  if (existing) return res.status(409).json({ error: 'Biometric already registered for this device' });

  user.biometrics.push({ deviceId, method, publicKey, registeredAt: new Date().toISOString() });
  user.biometricEnabled = true;
  users.set(user.id, user);
  auditLog('BIOMETRIC_REGISTERED', { userId: user.id, method, deviceId });
  res.json({ message: `${method} registered successfully` });
});

// ─── Admin: User management ────────────────────────────────────────────────────
router.get('/users', requireAuth, requireRole([ROLES.ADMIN]), (req, res) => {
  const result = [];
  for (const [, u] of users) {
    const { passwordHash: _ph, ...pub } = u;
    result.push(pub);
  }
  res.json({ users: result, total: result.length });
});

router.patch('/users/:id/role', requireAuth, requireRole([ROLES.ADMIN]), (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: `Invalid role. Valid: ${Object.values(ROLES).join(', ')}` });
  }
  const user = users.get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = role;
  users.set(id, user);
  auditLog('ROLE_CHANGED', { targetUserId: id, newRole: role, changedBy: req.user.sub });
  res.json({ message: 'Role updated', userId: id, role });
});

router.patch('/users/:id/deactivate', requireAuth, requireRole([ROLES.ADMIN]), (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.active = false;
  users.set(user.id, user);
  auditLog('USER_DEACTIVATED', { targetUserId: user.id, changedBy: req.user.sub });
  res.json({ message: 'User deactivated' });
});

// ─── Password change ───────────────────────────────────────────────────────────
router.post('/password/change', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = users.get(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password incorrect' });

    const check = validatePasswordStrength(newPassword);
    if (!check.valid) return res.status(400).json({ error: check.message, requirements: check.requirements });

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    users.set(user.id, user);
    auditLog('PASSWORD_CHANGED', { userId: user.id });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

// ─── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash: _ph, ...pub } = user;
  res.json(pub);
});

router.patch('/profile', requireAuth, (req, res) => {
  const { displayName, language, avatar } = req.body;
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (displayName) user.displayName = sanitizeInput(displayName, { allowEmoji: true, allowSpecial: true, maxLength: 128 });
  if (language) user.language = language;
  if (avatar) user.avatar = avatar;
  user.updatedAt = new Date().toISOString();
  users.set(user.id, user);
  auditLog('PROFILE_UPDATED', { userId: user.id });
  const { passwordHash: _ph, ...pub } = user;
  res.json(pub);
});

// ─── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth', timestamp: new Date().toISOString() });
});

export { router as authRouter, users, ROLES, issueTokens };
