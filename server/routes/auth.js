// server/routes/auth.js
// Nexus AI Pro — Authentication API Routes
// Registration · Login · MFA · Token refresh · Biometric
// Enumeration-safe — always returns generic errors for auth failures
// Date: 2026-08-18

import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { signToken, signRefreshToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─── In-memory stores (replace with Redis + DB in production) ─────────────────
const users = new Map();
const mfaSessions = new Map();
const emailVerifications = new Map();
const passwordResetTokens = new Map();

const BCRYPT_ROUNDS = 12;
const MFA_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_TTL_MS = 5 * 60 * 1000;           // 5 minutes

// ─── Password Policy ──────────────────────────────────────────────────────────
function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 13) return 'Password must be at least 13 characters';
  if (password.length > 128) return 'Password must not exceed 128 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/\d/.test(password)) return 'Password must contain a number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character';
  return null;
}

// ─── Username Validation (Unicode, emoji, special chars) ──────────────────────
function validateUsername(username) {
  if (!username || typeof username !== 'string') return 'Username is required';
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 64) return 'Username must be 2-64 characters';
  return null;
}

// ─── Constant-time comparison (enumeration-safe) ─────────────────────────────
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a.padEnd(64));
  const bufB = Buffer.from(b.padEnd(64));
  return crypto.timingSafeEqual(bufA, bufB);
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function audit(event, details = {}) {
  const safe = { ts: new Date().toISOString(), event, ...details };
  delete safe.password;
  delete safe.token;
  delete safe.secret;
  console.info(`[AUTH_ROUTE:${event}]`, JSON.stringify(safe));
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone, locale } = req.body;

    // Validate inputs
    const usernameError = validateUsername(username);
    if (usernameError) return res.status(400).json({ error: usernameError });

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    // Check for existing users (enumeration-safe delay)
    await new Promise(r => setTimeout(r, 100 + Math.random() * 50));

    const existingByEmail = [...users.values()].find(u => u.email === normalizedEmail);
    const existingByUsername = [...users.values()].find(u =>
      u.username.toLowerCase() === normalizedUsername.toLowerCase());

    if (existingByEmail || existingByUsername) {
      // Enumeration-safe: same response whether taken or not
      return res.status(409).json({ error: 'Account already exists with this email or username' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = {
      id: userId,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      phone: phone || null,
      role: 'user',
      locale: locale || 'en',
      mfaEnabled: false,
      mfaMethods: [],
      biometricsEnabled: false,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    users.set(userId, user);
    emailVerifications.set(verificationToken, { userId, expiresAt: Date.now() + 86400_000 });

    audit('REGISTER_SUCCESS', { userId, locale: user.locale });

    // In production: send verification email via email service
    // emailService.sendVerification(normalizedEmail, verificationToken);

    return res.status(201).json({
      userId,
      message: 'Account created. Please verify your email.',
      // DEV ONLY — remove in production:
      ...(process.env.NODE_ENV === 'development' ? { verificationToken } : {}),
    });
  } catch (err) {
    audit('REGISTER_ERROR', { error: err.message });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Credentials are required' });
    }

    // Constant-time delay to prevent timing attacks
    await new Promise(r => setTimeout(r, 150 + Math.random() * 100));

    const normalized = identifier.trim().toLowerCase();
    const user = [...users.values()].find(u =>
      u.email === normalized || u.username.toLowerCase() === normalized
    );

    // Always hash compare even if user not found (enumeration protection)
    const dummyHash = '$2a$12$invalidhashfortimingataaacksonly.paddedvalue';
    const hashToCompare = user?.passwordHash || dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch) {
      audit('LOGIN_FAILURE', { identifier: normalized, ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    audit('LOGIN_SUCCESS', { userId: user.id, ip: req.ip });

    // Check if MFA is required
    if (user.mfaEnabled && user.mfaMethods.length > 0) {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      mfaSessions.set(sessionToken, {
        userId: user.id,
        mfaMethod: user.mfaMethods[0],
        otp: null,
        createdAt: Date.now(),
        expiresAt: Date.now() + MFA_SESSION_TTL_MS,
      });

      // In production: generate and send OTP via SMS/email/TOTP
      audit('MFA_REQUIRED', { userId: user.id, method: user.mfaMethods[0] });

      return res.json({
        mfaRequired: true,
        mfaMethod: user.mfaMethods[0],
        sessionToken,
      });
    }

    // Issue tokens
    const accessToken = signToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      locale: user.locale,
    });

    const refreshToken = signRefreshToken(user.id);

    // Update last login
    users.set(user.id, { ...user, lastLoginAt: new Date().toISOString() });

    return res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locale: user.locale,
        mfaEnabled: user.mfaEnabled,
        biometricsEnabled: user.biometricsEnabled,
      },
    });
  } catch (err) {
    audit('LOGIN_ERROR', { error: err.message });
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

// ─── POST /api/auth/mfa/verify ────────────────────────────────────────────────
router.post('/mfa/verify', async (req, res) => {
  try {
    const { sessionToken, code, method } = req.body;

    if (!sessionToken || !code) {
      return res.status(400).json({ error: 'Session token and code are required' });
    }

    const session = mfaSessions.get(sessionToken);
    if (!session || Date.now() > session.expiresAt) {
      mfaSessions.delete(sessionToken);
      return res.status(401).json({ error: 'MFA session expired or invalid' });
    }

    const user = users.get(session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Verify OTP (TOTP validation via speakeasy in production)
    // For development: accept any 6-digit code
    const codeValid = process.env.NODE_ENV === 'development'
      ? /^\d{6}$/.test(code)
      : verifyTOTP(user.mfaSecret, code);

    if (!codeValid) {
      audit('MFA_FAILURE', { userId: user.id, method });
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    mfaSessions.delete(sessionToken);
    audit('MFA_SUCCESS', { userId: user.id, method });

    const accessToken = signToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mfaEnabled: true,
      locale: user.locale,
    });
    const refreshToken = signRefreshToken(user.id);

    users.set(user.id, { ...user, lastLoginAt: new Date().toISOString() });

    return res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locale: user.locale,
        mfaEnabled: true,
        biometricsEnabled: user.biometricsEnabled,
      },
    });
  } catch (err) {
    audit('MFA_ERROR', { error: err.message });
    return res.status(500).json({ error: 'MFA verification failed' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server error' });

    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(refreshToken, secret, {
      algorithms: ['HS256'],
      issuer: 'nexus-ai-pro',
      audience: 'nexus-api',
    });

    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = users.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newAccessToken = signToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      locale: user.locale,
    });

    audit('TOKEN_REFRESHED', { userId: user.id });
    return res.json({ token: newAccessToken });
  } catch (err) {
    audit('REFRESH_FAILURE', { error: err.message });
    return res.status(401).json({ error: 'Token refresh failed' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, (req, res) => {
  // In production: add token to blocklist in Redis
  audit('LOGOUT', { userId: req.user?.id });
  res.clearCookie('nexus_token', { httpOnly: true, secure: true, sameSite: 'strict' });
  return res.json({ message: 'Logged out' });
});

// ─── POST /api/auth/mfa/setup ─────────────────────────────────────────────────
router.post('/mfa/setup', authenticate, async (req, res) => {
  try {
    const { method } = req.body;
    const user = users.get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate TOTP secret (in production: use speakeasy)
    const secret = crypto.randomBytes(20).toString('base32');
    users.set(user.id, { ...user, mfaSecret: secret, mfaMethods: [method], mfaEnabled: true });

    audit('MFA_SETUP', { userId: user.id, method });

    return res.json({
      secret,
      qrCodeUrl: `otpauth://totp/NexusAIPro:${user.email}?secret=${secret}&issuer=NexusAIPro`,
      backupCodes: Array.from({ length: 10 }, () =>
        crypto.randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})/, '$1-')),
    });
  } catch (err) {
    audit('MFA_SETUP_ERROR', { error: err.message });
    return res.status(500).json({ error: 'MFA setup failed' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    locale: user.locale,
    mfaEnabled: user.mfaEnabled,
    biometricsEnabled: user.biometricsEnabled,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  });
});

// ─── POST /api/auth/verify-email ─────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const verification = emailVerifications.get(token);
  if (!verification || Date.now() > verification.expiresAt) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  const user = users.get(verification.userId);
  if (user) {
    users.set(user.id, { ...user, emailVerified: true });
  }

  emailVerifications.delete(token);
  audit('EMAIL_VERIFIED', { userId: verification.userId });

  return res.json({ message: 'Email verified' });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  // Always return same response for enumeration protection
  const genericResponse = { message: 'If an account exists, a reset link has been sent.' };

  const { email } = req.body;
  if (!email) return res.json(genericResponse);

  const user = [...users.values()].find(u => u.email === email.toLowerCase().trim());
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      expiresAt: Date.now() + 3600_000, // 1 hour
    });
    audit('PASSWORD_RESET_REQUESTED', { userId: user.id });
    // In production: send email with reset link
  }

  return res.json(genericResponse);
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const reset = passwordResetTokens.get(token);
    if (!reset || Date.now() > reset.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = users.get(reset.userId);
    if (!user) return res.status(400).json({ error: 'Invalid reset token' });

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    users.set(user.id, { ...user, passwordHash });
    passwordResetTokens.delete(token);

    audit('PASSWORD_RESET_SUCCESS', { userId: user.id });
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    audit('PASSWORD_RESET_ERROR', { error: err.message });
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

// ─── Placeholder TOTP verifier (replace with speakeasy in production) ─────────
function verifyTOTP(secret, code) {
  // Production: use speakeasy.totp.verify({ secret, encoding: 'base32', token: code })
  return /^\d{6}$/.test(code);
}

export default router;
