/**
 * src/server/authRoutes.js
 * Auth API routes — registration, login, MFA setup/verify, JWT refresh.
 * Passwords: bcryptjs, min 13 chars. JWT from env. No secrets hard-coded.
 * Date: 2026-08-15
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { ROLES, validatePassword, validateUsername, generateBackupCodes, hashBackupCode } from '../auth/authService.js';

const router = Router();

// ─── Constants ─────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';
const REFRESH_EXPIRY = '30d';

// ─── In-memory user store (replace with DB in production) ─────────────────
// In production, swap these Maps for PostgreSQL/Redis queries.
const users = new Map();           // userId -> user record
const emailIndex = new Map();      // email -> userId
const usernameIndex = new Map();   // username -> userId
const refreshTokens = new Set();   // valid refresh token hashes
const mfaSecrets = new Map();      // userId -> { secret, verified }
const backupCodeStore = new Map(); // userId -> [hashedCode, ...]

// ─── JWT helpers ──────────────────────────────────────────────────────────
function signAccessToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

function signRefreshToken(payload) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return jwt.sign(payload, secret, { expiresIn: REFRESH_EXPIRY });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// ─── Middleware: require valid JWT ────────────────────────────────────────
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    req.user = verifyAccessToken(auth.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// ─── Middleware: require role ─────────────────────────────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, displayName, language = 'en' } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, username, and password are required.' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    // Validate username (emoji/special char friendly)
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return res.status(400).json({ error: usernameCheck.message });
    }

    // Validate password strength (13+ chars, uppercase, lowercase, digit, special)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.message });
    }

    // Check uniqueness
    if (emailIndex.has(email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    if (usernameIndex.has(username.toLowerCase())) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // First registered user becomes admin; rest get user role
    const role = users.size === 0 ? ROLES.ADMIN : ROLES.USER;

    const user = {
      id: userId,
      email: email.toLowerCase(),
      username,
      displayName: displayName || username,
      passwordHash,
      role,
      language,
      createdAt: Date.now(),
      mfaEnabled: false,
      lastLogin: null,
      active: true,
    };

    users.set(userId, user);
    emailIndex.set(email.toLowerCase(), userId);
    usernameIndex.set(username.toLowerCase(), userId);

    return res.status(201).json({ userId, email: user.email, username, role });
  } catch (err) {
    console.error('[auth/register]', err.message);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, mfaToken } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userId = emailIndex.get(email.toLowerCase());
    if (!userId) {
      // Timing-safe: still hash to prevent enumeration
      await bcrypt.hash(password, SALT_ROUNDS);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = users.get(userId);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Account is disabled.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // MFA check
    const mfa = mfaSecrets.get(userId);
    if (user.mfaEnabled && mfa?.verified) {
      if (!mfaToken) {
        return res.json({ requiresMfa: true });
      }
      // Check TOTP
      const totpValid = authenticator.verify({ token: mfaToken, secret: mfa.secret });
      // Check backup codes
      let backupValid = false;
      if (!totpValid) {
        const codes = backupCodeStore.get(userId) ?? [];
        const tokenHash = hashBackupCode(mfaToken.toUpperCase());
        const idx = codes.indexOf(tokenHash);
        if (idx !== -1) {
          codes.splice(idx, 1); // one-time use
          backupCodeStore.set(userId, codes);
          backupValid = true;
        }
      }
      if (!totpValid && !backupValid) {
        return res.status(401).json({ error: 'Invalid MFA code.' });
      }
    }

    // Issue tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store hashed refresh token
    refreshTokens.add(crypto.createHash('sha256').update(refreshToken).digest('hex'));

    // Update last login
    user.lastLogin = Date.now();
    users.set(userId, user);

    return res.json({
      token: accessToken,
      refreshToken,
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      language: user.language,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (!refreshTokens.has(hash)) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(refreshToken, secret);
    const user = users.get(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found.' });

    const newAccessToken = signAccessToken({
      userId: user.id, email: user.email, username: user.username, role: user.role,
    });

    return res.json({ token: newAccessToken });
  } catch {
    return res.status(401).json({ error: 'Token refresh failed.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    refreshTokens.delete(hash);
  }
  return res.json({ success: true });
});

// ─── POST /api/auth/mfa/setup ─────────────────────────────────────────────
router.post('/mfa/setup', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });

    const userId = emailIndex.get(email.toLowerCase());
    if (!userId) return res.status(404).json({ error: 'User not found.' });

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'Nexus AI Pro', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Store unverified secret
    mfaSecrets.set(userId, { secret, verified: false });

    return res.json({ secret, qrDataUrl });
  } catch (err) {
    console.error('[auth/mfa/setup]', err.message);
    return res.status(500).json({ error: 'MFA setup failed.' });
  }
});

// ─── POST /api/auth/mfa/verify-setup ─────────────────────────────────────
router.post('/mfa/verify-setup', async (req, res) => {
  try {
    const { email, token, secret } = req.body;
    if (!email || !token || !secret) {
      return res.status(400).json({ error: 'Email, token, and secret are required.' });
    }

    const valid = authenticator.verify({ token, secret });
    if (!valid) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const userId = emailIndex.get(email.toLowerCase());
    if (!userId) return res.status(404).json({ error: 'User not found.' });

    // Mark MFA as verified
    mfaSecrets.set(userId, { secret, verified: true });
    const user = users.get(userId);
    if (user) { user.mfaEnabled = true; users.set(userId, user); }

    // Generate backup codes
    const codes = generateBackupCodes(8);
    backupCodeStore.set(userId, codes.map(hashBackupCode));

    return res.json({ success: true, backupCodes: codes });
  } catch (err) {
    console.error('[auth/mfa/verify-setup]', err.message);
    return res.status(500).json({ error: 'MFA verification failed.' });
  }
});

// ─── POST /api/auth/mfa/disable ──────────────────────────────────────────
router.post('/mfa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password.' });

  user.mfaEnabled = false;
  users.set(user.id, user);
  mfaSecrets.delete(user.id);
  backupCodeStore.delete(user.id);

  return res.json({ success: true });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────
router.patch('/profile', requireAuth, async (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { displayName, language } = req.body;
  if (displayName) user.displayName = displayName;
  if (language) user.language = language;
  users.set(user.id, user);

  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
});

// ─── PATCH /api/auth/password ─────────────────────────────────────────────
router.patch('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

  const { valid: pwValid, message } = validatePassword(newPassword);
  if (!pwValid) return res.status(400).json({ error: message });

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  users.set(user.id, user);

  return res.json({ success: true });
});

// ─── Admin: list users ────────────────────────────────────────────────────
router.get('/users', requireAuth, requireRole(ROLES.ADMIN, ROLES.DEV), (req, res) => {
  const list = [...users.values()].map(({ passwordHash, ...u }) => u);
  return res.json({ users: list, total: list.length });
});

// ─── Admin: update user role ──────────────────────────────────────────────
router.patch('/users/:userId/role', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.role = role;
  users.set(user.id, user);
  return res.json({ success: true, role });
});

export default router;
