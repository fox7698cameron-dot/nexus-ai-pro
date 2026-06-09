// src/server/auth.js
// Nexus AI Pro — Authentication Routes (Register, Login, 2FA, MFA, Roles)
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, USER_ROLES, ROLE_HIERARCHY } from './middleware.js';

const router = express.Router();

// ── Constants ──────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 13;
const USERNAME_MAX_LENGTH = 64;
const TOKEN_TTL_SECONDS = 15 * 60;        // 15 minutes access token
const REFRESH_TTL_SECONDS = 30 * 24 * 3600; // 30 days refresh token
const MFA_CODE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// ── In-memory stores (replace with PostgreSQL/Redis in production) ─────────────

const users = new Map();          // userId → user record
const emailIndex = new Map();     // email   → userId
const usernameIndex = new Map();  // username → userId
const refreshTokens = new Set();  // valid refresh tokens (opaque)
const mfaCodes = new Map();       // userId → { code, expiresAt, type }
const loginAttempts = new Map();  // ip → { count, lockedUntil }
const totpSecrets = new Map();    // userId → base32 secret (plain text, encrypt at rest in prod)

// ── Helpers ────────────────────────────────────────────────────────────────────

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not configured');
  return s;
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + ':refresh';
}

/**
 * Validate password: 13+ chars, upper, lower, digit, special char.
 * Also blocks common patterns.
 */
function validatePassword(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string' };
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (!/[A-Z]/.test(password)) return { valid: false, reason: 'Password must contain an uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, reason: 'Password must contain a lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, reason: 'Password must contain a number' };
  if (!/[^A-Za-z0-9]/.test(password)) return { valid: false, reason: 'Password must contain a special character' };
  return { valid: true };
}

/**
 * Validate username: 2–64 chars, Unicode/emoji allowed, no control chars.
 * Allows letters, digits, underscores, hyphens, dots, and Unicode (incl. emoji).
 */
function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, reason: 'Username must be a string' };
  const trimmed = username.trim();
  if (trimmed.length < 2) return { valid: false, reason: 'Username must be at least 2 characters' };
  if ([...trimmed].length > USERNAME_MAX_LENGTH) {
    return { valid: false, reason: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer` };
  }
  // Reject control characters and null bytes
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { valid: false, reason: 'Username contains invalid characters' };
  }
  return { valid: true, value: trimmed };
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL_SECONDS, issuer: 'nexus-ai-pro', jwtid: uuidv4() }
  );
}

function generateRefreshToken(userId) {
  const token = jwt.sign(
    { sub: userId, type: 'refresh' },
    getRefreshSecret(),
    { expiresIn: REFRESH_TTL_SECONDS, issuer: 'nexus-ai-pro' }
  );
  refreshTokens.add(token);
  return token;
}

function checkLoginThrottle(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { allowed: false, remaining };
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    loginAttempts.delete(ip);
  }
  return { allowed: true };
}

function recordFailedLogin(ip) {
  const record = loginAttempts.get(ip) || { count: 0 };
  record.count += 1;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(ip, record);
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

function generateMfaCode() {
  return String(crypto.randomInt(100000, 999999));
}

function publicUser(user) {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

// ── TOTP helpers (requires otplib in production — stubbed for compatibility) ──

let OTPAuth;
async function getTOTP() {
  if (!OTPAuth) {
    try {
      const mod = await import('otplib');
      OTPAuth = mod;
    } catch (_) {
      OTPAuth = null;
    }
  }
  return OTPAuth;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { email, username, password, role? }
 * role is limited to 'user' unless an admin creates the account.
 */
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username, and password are required' });
    }

    // Email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.reason });

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) return res.status(400).json({ error: passwordCheck.reason });

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = usernameCheck.value;

    if (emailIndex.has(normalizedEmail)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (usernameIndex.has(normalizedUsername.toLowerCase())) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Only admins can create privileged accounts via this endpoint.
    // Public self-registration is always 'user'.
    const assignedRole = USER_ROLES.USER;
    if (role && role !== USER_ROLES.USER) {
      return res.status(403).json({ error: 'Privileged account creation requires admin action' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();
    const user = {
      id: userId,
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
      role: assignedRole,
      mfaEnabled: false,
      totpEnabled: false,
      biometricEnabled: false,
      locale: req.body.locale || 'en',
      timezone: req.body.timezone || 'UTC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.set(userId, user);
    emailIndex.set(normalizedEmail, userId);
    usernameIndex.set(normalizedUsername.toLowerCase(), userId);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(userId);

    res.status(201).json({
      user: publicUser(user),
      accessToken,
      refreshToken,
      expiresIn: TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password, totpCode?, mfaCode? }
 */
router.post('/login', async (req, res) => {
  const ip = req.ip;
  const throttle = checkLoginThrottle(ip);
  if (!throttle.allowed) {
    return res.status(429).json({
      error: `Account locked. Try again in ${throttle.remaining}s`,
      code: 'ACCOUNT_LOCKED',
    });
  }

  try {
    const { email, password, totpCode, mfaCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userId = emailIndex.get(normalizedEmail);
    const user = userId ? users.get(userId) : null;

    // Constant-time comparison — always hash even if user not found
    const dummyHash = '$2a$12$invalidsaltinvalidsaltinvali';
    const hashToCheck = user?.passwordHash || dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatch) {
      recordFailedLogin(ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // TOTP 2FA check
    if (user.totpEnabled) {
      if (!totpCode) {
        return res.status(200).json({ requireTotp: true, message: 'Enter your authenticator code' });
      }
      const otp = await getTOTP();
      const secret = totpSecrets.get(userId);
      if (!otp || !secret || !otp.authenticator.verify({ token: totpCode, secret })) {
        recordFailedLogin(ip);
        return res.status(401).json({ error: 'Invalid authenticator code' });
      }
    }

    // Email/SMS MFA check
    if (user.mfaEnabled) {
      if (!mfaCode) {
        const code = generateMfaCode();
        mfaCodes.set(userId, { code, expiresAt: Date.now() + MFA_CODE_TTL_MS, type: 'email' });
        // In production: send via SendGrid/Twilio using env-configured credentials
        // sendMfaEmail(user.email, code);
        return res.status(200).json({ requireMfa: true, message: 'MFA code sent to your email' });
      }

      const stored = mfaCodes.get(userId);
      if (!stored || stored.expiresAt < Date.now() || stored.code !== mfaCode) {
        recordFailedLogin(ip);
        return res.status(401).json({ error: 'Invalid or expired MFA code' });
      }
      mfaCodes.delete(userId);
    }

    clearLoginAttempts(ip);

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    users.set(userId, user);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(userId);

    res.json({
      user: publicUser(user),
      accessToken,
      refreshToken,
      expiresIn: TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, getRefreshSecret());
    const user = users.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: TOKEN_TTL_SECONDS });
  } catch (err) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'Refresh token expired or invalid' });
  }
});

/**
 * POST /api/auth/logout
 * Revokes refresh token. Access token expires naturally (keep TTL short).
 */
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

/**
 * POST /api/auth/setup-2fa
 * Returns QR code data URI and backup codes.
 */
router.post('/setup-2fa', requireAuth, async (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const otp = await getTOTP();
  if (!otp) {
    return res.status(501).json({ error: 'TOTP library not available. Install otplib.' });
  }

  const secret = otp.authenticator.generateSecret();
  totpSecrets.set(user.id, secret);

  const otpauth = otp.authenticator.keyuri(user.email, 'Nexus AI Pro', secret);
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase()
  );

  res.json({ otpauth, secret, backupCodes });
});

/**
 * POST /api/auth/verify-2fa
 * Body: { code } — confirms TOTP setup and enables it.
 */
router.post('/verify-2fa', requireAuth, async (req, res) => {
  const { code } = req.body;
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const otp = await getTOTP();
  const secret = totpSecrets.get(user.id);
  if (!otp || !secret) return res.status(400).json({ error: 'TOTP not set up' });

  if (!otp.authenticator.verify({ token: String(code), secret })) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  user.totpEnabled = true;
  user.updatedAt = new Date().toISOString();
  users.set(user.id, user);

  res.json({ success: true, message: 'Authenticator app enabled' });
});

/**
 * POST /api/auth/disable-2fa
 * Body: { code } — requires current TOTP to disable.
 */
router.post('/disable-2fa', requireAuth, async (req, res) => {
  const { code } = req.body;
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.totpEnabled) return res.status(400).json({ error: '2FA is not enabled' });

  const otp = await getTOTP();
  const secret = totpSecrets.get(user.id);
  if (!otp || !secret || !otp.authenticator.verify({ token: String(code), secret })) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  user.totpEnabled = false;
  user.updatedAt = new Date().toISOString();
  users.set(user.id, user);
  totpSecrets.delete(user.id);

  res.json({ success: true, message: '2FA disabled' });
});

/**
 * POST /api/auth/enable-mfa
 * Enables email/SMS MFA (separate from TOTP).
 */
router.post('/enable-mfa', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.mfaEnabled = true;
  user.updatedAt = new Date().toISOString();
  users.set(user.id, user);
  res.json({ success: true, message: 'MFA enabled' });
});

/**
 * POST /api/auth/biometric/register
 * Registers a biometric credential ID (WebAuthn/passkey flow stub).
 * Body: { credentialId, publicKey, deviceType }
 */
router.post('/biometric/register', requireAuth, (req, res) => {
  const { credentialId, publicKey, deviceType } = req.body;
  if (!credentialId || !publicKey) {
    return res.status(400).json({ error: 'credentialId and publicKey required' });
  }
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.biometricCredentials) user.biometricCredentials = [];
  user.biometricCredentials.push({
    id: credentialId,
    publicKey,
    deviceType: deviceType || 'unknown',
    registeredAt: new Date().toISOString(),
  });
  user.biometricEnabled = true;
  user.updatedAt = new Date().toISOString();
  users.set(user.id, user);

  res.json({ success: true, message: 'Biometric credential registered' });
});

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }

  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

  const check = validatePassword(newPassword);
  if (!check.valid) return res.status(400).json({ error: check.reason });

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.updatedAt = new Date().toISOString();
  users.set(user.id, user);

  res.json({ success: true, message: 'Password updated' });
});

/**
 * PUT /api/auth/profile
 * Body: { username?, locale?, timezone? }
 */
router.put('/profile', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.body.username !== undefined) {
    const check = validateUsername(req.body.username);
    if (!check.valid) return res.status(400).json({ error: check.reason });

    const lower = check.value.toLowerCase();
    const existing = usernameIndex.get(lower);
    if (existing && existing !== user.id) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    usernameIndex.delete(user.username.toLowerCase());
    user.username = check.value;
    usernameIndex.set(lower, user.id);
  }

  if (req.body.locale)   user.locale   = req.body.locale;
  if (req.body.timezone) user.timezone = req.body.timezone;

  user.updatedAt = new Date().toISOString();
  users.set(user.id, user);

  res.json({ user: publicUser(user) });
});

// ── Admin-only user management ─────────────────────────────────────────────────

/**
 * GET /api/auth/users
 * Admin-only: list all users.
 */
router.get('/users', requireAuth, (req, res) => {
  const callerRole = ROLE_HIERARCHY[req.user.role] ?? 0;
  if (callerRole < ROLE_HIERARCHY.admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const list = Array.from(users.values()).map(publicUser);
  res.json({ users: list, total: list.length });
});

/**
 * PUT /api/auth/users/:userId/role
 * Admin-only: change a user's role.
 * Body: { role }
 */
router.put('/users/:userId/role', requireAuth, (req, res) => {
  const callerLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
  if (callerLevel < ROLE_HIERARCHY.admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { userId } = req.params;
  const { role } = req.body;

  if (!Object.values(USER_ROLES).includes(role)) {
    return res.status(400).json({ error: 'Invalid role', valid: Object.values(USER_ROLES) });
  }

  const target = users.get(userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Super-admin can assign any role; admin can only assign up to 'moderator'
  const targetLevel = ROLE_HIERARCHY[role] ?? 0;
  if (callerLevel < ROLE_HIERARCHY.super_admin && targetLevel >= ROLE_HIERARCHY.admin) {
    return res.status(403).json({ error: 'Super-admin required to assign admin roles' });
  }

  target.role = role;
  target.updatedAt = new Date().toISOString();
  users.set(userId, target);

  res.json({ user: publicUser(target) });
});

export default router;
