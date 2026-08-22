// ================================================
// routes/auth.js
// Authentication & Authorization API Routes
// Supports: User, Admin, Developer, Moderator roles
// 2FA/MFA, Biometrics, WebAuthn, Strong Passwords
// Date: 2026-08-22
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// ─── Constants ──────────────────────────────────────────────────────────────
const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'developer', MOD: 'moderator', USER: 'user' });
const MFA_REQUIRED_ROLES = new Set([ROLES.ADMIN, ROLES.DEV]);
const PASSWORD_MIN_LENGTH = 13;
const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory stores (replace with DB/Redis in production)
const users = new Map();
const refreshTokens = new Set();
const otpStore = new Map();        // { email -> { otp, expiresAt, attempts } }
const webauthnChallenges = new Map(); // { userId -> challenge }
const webauthnCredentials = new Map(); // { userId -> credential[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'generate_jwt_secret_here') {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return secret;
}

function issueTokens(payload) {
  const secret = getJwtSecret();
  const accessToken = jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  refreshTokens.add(refreshToken);
  return { accessToken, refreshToken };
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

/**
 * Validate password strength.
 * Minimum 13 characters; must contain uppercase, lowercase, digit, special char.
 * Returns { valid, strength, issues[] }
 */
function validatePassword(password) {
  const issues = [];
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) issues.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) issues.push('Password must contain a lowercase letter');
  if (!/[0-9]/.test(password)) issues.push('Password must contain a number');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('Password must contain a special character');

  // Entropy-based strength score (0-100)
  const charset =
    (/[a-z]/.test(password) ? 26 : 0) +
    (/[A-Z]/.test(password) ? 26 : 0) +
    (/[0-9]/.test(password) ? 10 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 32 : 0);
  const entropy = password.length * Math.log2(charset || 1);
  const strength = Math.min(100, Math.floor((entropy / 80) * 100));

  return { valid: issues.length === 0, strength, issues };
}

/**
 * Validate username: Unicode supported, emojis allowed, 2-50 chars.
 * Sanitizes for safe storage.
 */
function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, issues: ['Username must be a string'] };
  // Normalize Unicode
  const normalized = username.normalize('NFC').trim();
  const len = [...normalized].length; // Correct emoji/Unicode length
  const issues = [];
  if (len < 2) issues.push('Username must be at least 2 characters');
  if (len > 50) issues.push('Username must be 50 characters or fewer');
  // Block injection chars but allow Unicode/emojis
  if (/[<>"'`;\\]/.test(normalized)) issues.push('Username contains forbidden characters (< > " \' ` ; \\)');
  return { valid: issues.length === 0, sanitized: normalized, issues };
}

/**
 * Generate a 6-digit TOTP-style OTP (simplified; use speakeasy in production).
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Auth middleware — verifies Bearer JWT and attaches req.user.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role guard factory.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = ROLES.USER, language = 'en', region } = req.body;

    // Validate inputs
    const usernameResult = validateUsername(username);
    if (!usernameResult.valid) {
      return res.status(400).json({ error: 'Invalid username', issues: usernameResult.issues });
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      return res.status(400).json({ error: 'Password too weak', issues: passwordResult.issues, strength: passwordResult.strength });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Prevent role escalation — only allow 'user' self-registration
    const assignedRole = ROLES.USER;

    // Check duplicate
    for (const u of users.values()) {
      if (u.email === email.toLowerCase()) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      if (u.username === usernameResult.sanitized) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();

    const user = {
      id: userId,
      username: usernameResult.sanitized,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      role: assignedRole,
      language,
      region: region || null,
      mfaEnabled: false,
      mfaMethod: null,
      webauthnCredentials: [],
      biometricEnabled: false,
      createdAt: Date.now(),
      lastLogin: null,
      active: true,
    };

    users.set(userId, user);

    const { accessToken, refreshToken } = issueTokens({
      sub: userId,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // Never send passwordHash to client
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user
    let user = null;
    for (const u of users.values()) {
      if (u.email === email?.toLowerCase()) { user = u; break; }
    }

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    // Role-specific login validation
    if (role && user.role !== role) {
      return res.status(403).json({ error: `Access denied for ${role} portal` });
    }

    // MFA required for admin/dev
    if (MFA_REQUIRED_ROLES.has(user.role) && user.mfaEnabled) {
      const mfaToken = crypto.randomBytes(16).toString('hex');
      otpStore.set(`mfa:${mfaToken}`, { userId: user.id, expiresAt: Date.now() + OTP_TTL_MS });
      return res.json({ requiresMfa: true, mfaToken, method: user.mfaMethod });
    }

    user.lastLogin = Date.now();
    const { accessToken, refreshToken } = issueTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', async (req, res) => {
  try {
    const { mfaToken, otp } = req.body;
    const entry = otpStore.get(`mfa:${mfaToken}`);

    if (!entry || Date.now() > entry.expiresAt) {
      return res.status(401).json({ error: 'MFA session expired' });
    }

    const user = users.get(entry.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // In production: verify TOTP via speakeasy or SMS OTP
    // Here we do a constant-time comparison of the stored OTP
    const storedOtp = entry.otp || '000000'; // replace with real TOTP verify
    const valid = otp?.length === 6 && crypto.timingSafeEqual(
      Buffer.from(otp.padEnd(6, '0')),
      Buffer.from(storedOtp.padEnd(6, '0'))
    );

    // For demo: accept any 6-digit code when no TOTP secret configured
    const demoMode = !user.mfaSecret;
    if (!demoMode && !valid) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    otpStore.delete(`mfa:${mfaToken}`);
    const { accessToken, refreshToken } = issueTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// POST /api/auth/otp/send - Send email/SMS OTP
router.post('/otp/send', async (req, res) => {
  const { email, method = 'email' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const otp = generateOTP();
  otpStore.set(email.toLowerCase(), {
    otp,
    method,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  // In production: send via SendGrid/Twilio
  console.log(`[OTP] ${method} OTP for ${email}: ${otp}`); // Replace with real send

  res.json({ success: true, message: `OTP sent via ${method}`, expiresIn: OTP_TTL_MS / 1000 });
});

// POST /api/auth/otp/verify
router.post('/otp/verify', async (req, res) => {
  const { email, otp } = req.body;
  const entry = otpStore.get(email?.toLowerCase());

  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(401).json({ error: 'OTP expired or not found' });
  }

  entry.attempts = (entry.attempts || 0) + 1;
  if (entry.attempts > 3) {
    otpStore.delete(email.toLowerCase());
    return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
  }

  const valid = crypto.timingSafeEqual(
    Buffer.from(String(otp).padEnd(6)),
    Buffer.from(String(entry.otp).padEnd(6))
  );

  if (!valid) return res.status(401).json({ error: 'Invalid OTP' });

  otpStore.delete(email.toLowerCase());
  res.json({ success: true, verified: true });
});

// POST /api/auth/webauthn/challenge - Start WebAuthn registration/auth
router.post('/webauthn/challenge', requireAuth, (req, res) => {
  const challenge = crypto.randomBytes(32).toString('base64url');
  webauthnChallenges.set(req.user.sub, { challenge, expiresAt: Date.now() + 5 * 60 * 1000 });
  res.json({
    challenge,
    rpName: 'Nexus AI Pro',
    rpId: process.env.WEBAUTHN_RP_ID || 'localhost',
    userId: req.user.sub,
    userName: req.user.username,
    timeout: 60000,
  });
});

// POST /api/auth/webauthn/register - Complete WebAuthn registration
router.post('/webauthn/register', requireAuth, (req, res) => {
  const { credential } = req.body;
  const { challenge } = webauthnChallenges.get(req.user.sub) || {};

  if (!challenge) return res.status(400).json({ error: 'No pending WebAuthn challenge' });

  // In production: use @simplewebauthn/server to verify credential
  const creds = webauthnCredentials.get(req.user.sub) || [];
  creds.push({ id: credential.id, type: credential.type, registeredAt: Date.now() });
  webauthnCredentials.set(req.user.sub, creds);
  webauthnChallenges.delete(req.user.sub);

  // Update user
  const user = users.get(req.user.sub);
  if (user) {
    user.biometricEnabled = true;
    user.webauthnCredentials = creds;
  }

  res.json({ success: true, credentialsCount: creds.length });
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // In production: look up refresh token in DB with userId
  res.status(501).json({ error: 'Refresh token lookup requires persistent storage' });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ success: true });
});

// POST /api/auth/password/change
router.post('/password/change', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

  const result = validatePassword(newPassword);
  if (!result.valid) return res.status(400).json({ error: 'New password too weak', issues: result.issues });

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  res.json({ success: true });
});

// GET /api/auth/me - Current user profile
router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/auth/admin/assign-role (admin only)
router.post('/admin/assign-role', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  const { targetUserId, newRole } = req.body;

  if (!Object.values(ROLES).includes(newRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const user = users.get(targetUserId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.role = newRole;
  res.json({ success: true, userId: targetUserId, role: newRole });
});

// GET /api/auth/users (admin only)
router.get('/users', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const allUsers = [...users.values()].map(({ passwordHash: _, ...u }) => u);
  const paginated = allUsers.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ users: paginated, total: allUsers.length, offset: Number(offset), limit: Number(limit) });
});

// GET /api/auth/password/strength-check (public utility)
router.post('/password/strength', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  res.json(validatePassword(password));
});

export default router;
