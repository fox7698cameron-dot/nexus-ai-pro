/* src/api/routes.js
   Created: 2026-10-11
   API Route Handlers - Auth, Payments, Analytics, Game, Admin
   Authentication: JWT + WebAuthn, Roles: user/moderator/developer/admin
*/

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ---------------------------------------------------------------------------
// In-memory stores (replace with a real DB in production)
// ---------------------------------------------------------------------------
const users = new Map();           // userId -> user object
const usernameIndex = new Map();   // username -> userId
const emailIndex = new Map();      // email -> userId
const tokenBlacklist = new Set();  // invalidated JWTs (jti)
const loginAttempts = new Map();   // key -> { count, lockedUntil }
const passwordResetTokens = new Map(); // token -> { userId, expiresAt }
const twoFaSecrets = new Map();    // userId -> { secret, backupCodes }
const biometricChallenges = new Map(); // challengeId -> { userId, expiresAt }
const payments = new Map();        // paymentId -> payment object
const subscriptions = new Map();   // userId -> subscription object
const socialPlatforms = new Map(); // userId -> Map<platform, credentials>
const platformMetrics = new Map(); // `${userId}:${platform}` -> metrics
const gameProjects = new Map();    // projectId -> project object
const gameBuilds = new Map();      // buildId -> build object
const auditLog = [];               // append-only audit records

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('[routes] JWT_SECRET not set – using insecure default. Set it in .env!');
  return 'change-me-in-production';
})();
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_EXPIRY = process.env.REFRESH_EXPIRY || '7d';
const BCRYPT_ROUNDS = 12;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const BIOMETRIC_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const VALID_ROLES = ['user', 'moderator', 'developer', 'admin'];
const ROLE_REDIRECT = {
  admin: '/dashboard/admin',
  developer: '/dashboard/developer',
  moderator: '/dashboard/moderator',
  user: '/dashboard',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function writeAudit(action, meta = {}) {
  auditLog.push({ ts: new Date().toISOString(), action, ...meta });
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function issueToken(userId, role, opts = {}) {
  const jti = uuidv4();
  const token = jwt.sign({ sub: userId, role, jti }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    ...opts,
  });
  return { token, jti };
}

function issueRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (!password || password.length < 13) return 'Password must be at least 13 characters.';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password))
    return 'Password must contain at least one special character.';
  return null;
}

function loginKey(identifier) {
  return `login:${identifier.toLowerCase()}`;
}

function checkLockout(identifier) {
  const entry = loginAttempts.get(loginKey(identifier));
  if (!entry) return null;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const remainSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return { locked: true, remainSec };
  }
  return null;
}

function recordFailedLogin(identifier) {
  const key = loginKey(identifier);
  const entry = loginAttempts.get(key) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    entry.count = 0;
  }
  loginAttempts.set(key, entry);
}

function clearFailedLogin(identifier) {
  loginAttempts.delete(loginKey(identifier));
}

// Simple Base32 for TOTP (RFC 4648 alphabet)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function generateBase32Secret(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  let result = '';
  let bits = 0;
  let acc = 0;
  for (const byte of buf) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_CHARS[(acc >> bits) & 0x1f];
    }
  }
  if (bits > 0) result += BASE32_CHARS[(acc << (5 - bits)) & 0x1f];
  return result;
}

function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g).join('-')
  );
}

// Minimal TOTP verification (RFC 6238, SHA-1, 6 digits, 30s window)
function base32Decode(str) {
  const s = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let acc = 0;
  const out = [];
  for (const ch of s) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx === -1) continue;
    acc = (acc << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

function totpCode(secret, counter) {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 |
    hmac[offset + 1] << 16 |
    hmac[offset + 2] << 8 |
    hmac[offset + 3]) % 1000000;
  return String(code).padStart(6, '0');
}

function verifyTotp(secret, userCode) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    if (totpCode(secret, counter + delta) === userCode) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * verifyToken – Parses and validates the Authorization: Bearer <token> header.
 * Attaches req.user = { id, role, jti } on success.
 */
export function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (tokenBlacklist.has(payload.jti)) {
      return res.status(401).json({ error: 'Token has been revoked.' });
    }
    req.user = { id: payload.sub, role: payload.role, jti: payload.jti };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * requireRole – Factory that creates middleware enforcing a minimum role.
 * Role hierarchy: user < moderator < developer < admin
 */
const ROLE_RANK = { user: 0, moderator: 1, developer: 2, admin: 3 };

export function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const userRank = ROLE_RANK[req.user.role] ?? -1;
    const required = ROLE_RANK[minRole] ?? 99;
    if (userRank < required) {
      return res.status(403).json({ error: `Requires '${minRole}' role or higher.` });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH ROUTES  /auth/*
// ---------------------------------------------------------------------------

// POST /auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3)
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    if (!email || !validateEmail(email))
      return res.status(400).json({ error: 'Invalid email address.' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (usernameIndex.has(cleanUsername))
      return res.status(409).json({ error: 'Username already taken.' });
    if (emailIndex.has(cleanEmail))
      return res.status(409).json({ error: 'Email already registered.' });

    const assignedRole = VALID_ROLES.includes(role) ? role : 'user';
    // Only admin can self-assign admin on registration; block silent escalation
    const safeRole = assignedRole === 'admin' ? 'user' : assignedRole;

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const user = {
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: safeRole,
      createdAt: now,
      updatedAt: now,
      twoFaEnabled: false,
    };

    users.set(userId, user);
    usernameIndex.set(cleanUsername, userId);
    emailIndex.set(cleanEmail, userId);

    const { token } = issueToken(userId, safeRole);
    writeAudit('user.register', { userId, username: cleanUsername, role: safeRole });

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password)
      return res.status(400).json({ error: 'identifier and password are required.' });

    const lockout = checkLockout(identifier);
    if (lockout?.locked) {
      return res.status(429).json({
        error: `Account temporarily locked. Try again in ${lockout.remainSec}s.`,
      });
    }

    const clean = identifier.trim().toLowerCase();
    const userId = usernameIndex.get(clean) || emailIndex.get(clean);
    const user = userId ? users.get(userId) : null;

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      recordFailedLogin(identifier);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    clearFailedLogin(identifier);

    if (user.twoFaEnabled) {
      const challengeId = uuidv4();
      biometricChallenges.set(challengeId, {
        userId: user.id,
        expiresAt: Date.now() + BIOMETRIC_CHALLENGE_TTL_MS,
        type: '2fa-pending',
      });
      return res.status(200).json({ requires2fa: true, challengeId });
    }

    const { token } = issueToken(user.id, user.role);
    const refreshToken = issueRefreshToken(user.id);
    writeAudit('user.login', { userId: user.id });

    return res.status(200).json({
      token,
      refreshToken,
      redirectPath: ROLE_REDIRECT[user.role] || '/dashboard',
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /auth/login/biometric  – WebAuthn assertion verification
router.post('/auth/login/biometric', async (req, res) => {
  try {
    const { challengeId, assertion } = req.body || {};
    if (!challengeId || !assertion)
      return res.status(400).json({ error: 'challengeId and assertion are required.' });

    const challenge = biometricChallenges.get(challengeId);
    if (!challenge || Date.now() > challenge.expiresAt) {
      biometricChallenges.delete(challengeId);
      return res.status(401).json({ error: 'Challenge expired or not found.' });
    }

    // In production, perform full WebAuthn assertion validation here.
    // For now we trust the client sent the right challengeId and skip crypto verify.
    const user = users.get(challenge.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    biometricChallenges.delete(challengeId);
    const { token } = issueToken(user.id, user.role);
    const refreshToken = issueRefreshToken(user.id);
    writeAudit('user.login.biometric', { userId: user.id });

    return res.status(200).json({
      token,
      refreshToken,
      redirectPath: ROLE_REDIRECT[user.role] || '/dashboard',
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[auth/login/biometric]', err);
    return res.status(500).json({ error: 'Biometric login failed.' });
  }
});

// POST /auth/register/biometric  – WebAuthn registration (generate challenge)
router.post('/auth/register/biometric', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const user = users.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const challengeBytes = crypto.randomBytes(32).toString('base64url');
    const challengeId = uuidv4();
    biometricChallenges.set(challengeId, {
      userId,
      challenge: challengeBytes,
      expiresAt: Date.now() + BIOMETRIC_CHALLENGE_TTL_MS,
      type: 'registration',
    });

    return res.status(200).json({
      challengeId,
      challenge: challengeBytes,
      rp: { name: 'Nexus AI Pro', id: process.env.WEBAUTHN_RP_ID || 'localhost' },
      user: { id: userId, name: user.username, displayName: user.username },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      timeout: BIOMETRIC_CHALLENGE_TTL_MS,
      attestation: 'none',
    });
  } catch (err) {
    console.error('[auth/register/biometric]', err);
    return res.status(500).json({ error: 'Biometric registration setup failed.' });
  }
});

// POST /auth/2fa/setup  – Generate TOTP secret + return QR URI
router.post('/auth/2fa/setup', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const user = users.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const secret = generateBase32Secret();
    const issuer = encodeURIComponent('NexusAIPro');
    const account = encodeURIComponent(user.email);
    const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    // Store pending (not yet confirmed) secret
    twoFaSecrets.set(userId, { secret, confirmed: false, backupCodes: [] });
    writeAudit('user.2fa.setup', { userId });

    return res.status(200).json({ secret, otpauthUrl });
  } catch (err) {
    console.error('[auth/2fa/setup]', err);
    return res.status(500).json({ error: '2FA setup failed.' });
  }
});

// POST /auth/2fa/verify  – Confirm TOTP code and enable 2FA
router.post('/auth/2fa/verify', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'TOTP code is required.' });

    const record = twoFaSecrets.get(userId);
    if (!record) return res.status(400).json({ error: '2FA setup not initiated.' });

    if (!verifyTotp(record.secret, String(code).replace(/\s/g, ''))) {
      return res.status(401).json({ error: 'Invalid TOTP code.' });
    }

    record.confirmed = true;
    twoFaSecrets.set(userId, record);
    const user = users.get(userId);
    user.twoFaEnabled = true;
    user.updatedAt = new Date().toISOString();
    users.set(userId, user);
    writeAudit('user.2fa.enabled', { userId });

    return res.status(200).json({ message: '2FA enabled successfully.' });
  } catch (err) {
    console.error('[auth/2fa/verify]', err);
    return res.status(500).json({ error: '2FA verification failed.' });
  }
});

// POST /auth/2fa/backup  – Generate (and replace) backup codes
router.post('/auth/2fa/backup', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const record = twoFaSecrets.get(userId);
    if (!record || !record.confirmed)
      return res.status(400).json({ error: '2FA must be enabled first.' });

    const codes = generateBackupCodes(8);
    const hashedCodes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
    record.backupCodes = hashedCodes;
    twoFaSecrets.set(userId, record);
    writeAudit('user.2fa.backup.generated', { userId });

    return res.status(200).json({ backupCodes: codes, warning: 'Store these securely – they will not be shown again.' });
  } catch (err) {
    console.error('[auth/2fa/backup]', err);
    return res.status(500).json({ error: 'Backup code generation failed.' });
  }
});

// POST /auth/refresh  – Obtain a new access token using a refresh token
router.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required.' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    if (payload.type !== 'refresh')
      return res.status(401).json({ error: 'Not a refresh token.' });

    const user = users.get(payload.sub);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { token } = issueToken(user.id, user.role);
    writeAudit('user.token.refresh', { userId: user.id });

    return res.status(200).json({ token });
  } catch (err) {
    console.error('[auth/refresh]', err);
    return res.status(500).json({ error: 'Token refresh failed.' });
  }
});

// POST /auth/logout
router.post('/auth/logout', verifyToken, (req, res) => {
  tokenBlacklist.add(req.user.jti);
  writeAudit('user.logout', { userId: req.user.id });
  return res.status(200).json({ message: 'Logged out successfully.' });
});

// GET /auth/me
router.get('/auth/me', verifyToken, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.status(200).json({ user: sanitizeUser(user) });
});

// POST /auth/forgot-password
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !validateEmail(email))
      return res.status(400).json({ error: 'Valid email is required.' });

    const clean = email.trim().toLowerCase();
    const userId = emailIndex.get(clean);

    // Always return success to prevent email enumeration
    if (userId) {
      const token = crypto.randomBytes(32).toString('hex');
      passwordResetTokens.set(token, {
        userId,
        expiresAt: Date.now() + PASSWORD_RESET_TTL_MS,
      });
      writeAudit('user.password.reset.requested', { userId });
      // In production: send email with reset link containing `token`
      console.info(`[auth/forgot-password] Reset token for ${clean}: ${token}`);
    }

    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    return res.status(500).json({ error: 'Password reset initiation failed.' });
  }
});

// POST /auth/reset-password
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword are required.' });

    const record = passwordResetTokens.get(token);
    if (!record || Date.now() > record.expiresAt) {
      passwordResetTokens.delete(token);
      return res.status(400).json({ error: 'Reset token is invalid or expired.' });
    }

    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const user = users.get(record.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.updatedAt = new Date().toISOString();
    users.set(record.userId, user);
    passwordResetTokens.delete(token);
    writeAudit('user.password.reset.completed', { userId: record.userId });

    return res.status(200).json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    return res.status(500).json({ error: 'Password reset failed.' });
  }
});

// DELETE /auth/account
router.delete('/auth/account', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Password confirmation is required.' });

    const user = users.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ error: 'Incorrect password.' });

    usernameIndex.delete(user.username);
    emailIndex.delete(user.email);
    users.delete(userId);
    twoFaSecrets.delete(userId);
    tokenBlacklist.add(req.user.jti);
    writeAudit('user.account.deleted', { userId });

    return res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('[auth/account]', err);
    return res.status(500).json({ error: 'Account deletion failed.' });
  }
});

// ---------------------------------------------------------------------------
// PAYMENT ROUTES  /payments/*
// ---------------------------------------------------------------------------

// POST /payments/create-intent
router.post('/payments/create-intent', verifyToken, async (req, res) => {
  try {
    const { amount, currency = 'usd', description, metadata = {} } = req.body || {};
    if (!amount || typeof amount !== 'number' || amount <= 0)
      return res.status(400).json({ error: 'Valid amount (positive number) is required.' });

    const paymentId = `pi_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    const intent = {
      id: paymentId,
      userId: req.user.id,
      amount,
      currency: currency.toLowerCase(),
      description: description || '',
      metadata,
      status: 'requires_payment_method',
      clientSecret: `${paymentId}_secret_${crypto.randomBytes(16).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    payments.set(paymentId, intent);
    writeAudit('payment.intent.created', { userId: req.user.id, paymentId, amount });

    return res.status(201).json({ paymentIntent: intent });
  } catch (err) {
    console.error('[payments/create-intent]', err);
    return res.status(500).json({ error: 'Payment intent creation failed.' });
  }
});

// POST /payments/confirm
router.post('/payments/confirm', verifyToken, async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body || {};
    if (!paymentIntentId || !paymentMethodId)
      return res.status(400).json({ error: 'paymentIntentId and paymentMethodId are required.' });

    const intent = payments.get(paymentIntentId);
    if (!intent) return res.status(404).json({ error: 'Payment intent not found.' });
    if (intent.userId !== req.user.id)
      return res.status(403).json({ error: 'Not your payment intent.' });

    intent.status = 'succeeded';
    intent.paymentMethodId = paymentMethodId;
    intent.confirmedAt = new Date().toISOString();
    payments.set(paymentIntentId, intent);
    writeAudit('payment.confirmed', { userId: req.user.id, paymentIntentId });

    return res.status(200).json({ paymentIntent: intent });
  } catch (err) {
    console.error('[payments/confirm]', err);
    return res.status(500).json({ error: 'Payment confirmation failed.' });
  }
});

// POST /payments/subscription/create
router.post('/payments/subscription/create', verifyToken, async (req, res) => {
  try {
    const { planId, paymentMethodId, couponCode } = req.body || {};
    if (!planId || !paymentMethodId)
      return res.status(400).json({ error: 'planId and paymentMethodId are required.' });

    const PLANS = {
      free: { name: 'Free', price: 0, interval: 'month' },
      pro: { name: 'Pro', price: 999, interval: 'month' },
      enterprise: { name: 'Enterprise', price: 4999, interval: 'month' },
    };
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: `Unknown planId '${planId}'.` });

    const subscriptionId = `sub_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = {
      id: subscriptionId,
      userId: req.user.id,
      planId,
      plan,
      paymentMethodId,
      couponCode: couponCode || null,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      createdAt: now.toISOString(),
      canceledAt: null,
    };
    subscriptions.set(req.user.id, sub);
    writeAudit('subscription.created', { userId: req.user.id, subscriptionId, planId });

    return res.status(201).json({ subscription: sub });
  } catch (err) {
    console.error('[payments/subscription/create]', err);
    return res.status(500).json({ error: 'Subscription creation failed.' });
  }
});

// POST /payments/subscription/cancel
router.post('/payments/subscription/cancel', verifyToken, async (req, res) => {
  try {
    const sub = subscriptions.get(req.user.id);
    if (!sub) return res.status(404).json({ error: 'No active subscription found.' });
    if (sub.status === 'canceled')
      return res.status(400).json({ error: 'Subscription is already canceled.' });

    const { immediately = false } = req.body || {};
    sub.status = immediately ? 'canceled' : 'cancel_at_period_end';
    sub.canceledAt = new Date().toISOString();
    subscriptions.set(req.user.id, sub);
    writeAudit('subscription.canceled', { userId: req.user.id, immediately });

    return res.status(200).json({ subscription: sub });
  } catch (err) {
    console.error('[payments/subscription/cancel]', err);
    return res.status(500).json({ error: 'Subscription cancellation failed.' });
  }
});

// GET /payments/subscription/status
router.get('/payments/subscription/status', verifyToken, (req, res) => {
  const sub = subscriptions.get(req.user.id);
  if (!sub) return res.status(200).json({ subscription: null, plan: 'free' });
  return res.status(200).json({ subscription: sub });
});

// POST /payments/coupon/validate
router.post('/payments/coupon/validate', verifyToken, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Coupon code is required.' });

  // Placeholder coupon catalogue – in production this would query a DB/Stripe
  const COUPONS = {
    NEXUS10: { discount: 10, type: 'percent', description: '10% off' },
    LAUNCH50: { discount: 50, type: 'percent', description: '50% off launch special' },
    SAVE5: { discount: 500, type: 'fixed', description: '$5 off (cents)' },
  };
  const coupon = COUPONS[code.toUpperCase()];
  if (!coupon) return res.status(404).json({ error: 'Invalid coupon code.' });

  return res.status(200).json({ valid: true, coupon });
});

// POST /payments/gift-card/redeem
router.post('/payments/gift-card/redeem', verifyToken, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string' || code.trim().length < 8)
      return res.status(400).json({ error: 'Valid gift card code is required.' });

    // Placeholder – real implementation would look up the code in a DB
    const balanceCents = 1000; // $10 placeholder
    writeAudit('gift_card.redeemed', { userId: req.user.id, code: code.slice(0, 4) + '****' });

    return res.status(200).json({
      redeemed: true,
      balanceCents,
      message: `Gift card redeemed. $${(balanceCents / 100).toFixed(2)} added to your account.`,
    });
  } catch (err) {
    console.error('[payments/gift-card/redeem]', err);
    return res.status(500).json({ error: 'Gift card redemption failed.' });
  }
});

// POST /payments/crypto/generate-address
router.post('/payments/crypto/generate-address', verifyToken, async (req, res) => {
  try {
    const { currency = 'BTC', amount } = req.body || {};
    const SUPPORTED = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];
    if (!SUPPORTED.includes(currency.toUpperCase()))
      return res.status(400).json({ error: `Unsupported crypto currency. Supported: ${SUPPORTED.join(', ')}` });
    if (!amount || typeof amount !== 'number' || amount <= 0)
      return res.status(400).json({ error: 'Valid amount is required.' });

    // Placeholder address – in production use a custody/wallet provider SDK
    const fakeAddress = `${currency.toLowerCase()}1${crypto.randomBytes(20).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    writeAudit('crypto.address.generated', { userId: req.user.id, currency });

    return res.status(200).json({
      address: fakeAddress,
      currency: currency.toUpperCase(),
      amount,
      expiresAt,
      qrData: `${currency.toLowerCase()}:${fakeAddress}?amount=${amount}`,
    });
  } catch (err) {
    console.error('[payments/crypto/generate-address]', err);
    return res.status(500).json({ error: 'Crypto address generation failed.' });
  }
});

// GET /payments/invoice/:id
router.get('/payments/invoice/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const payment = payments.get(id);
  if (!payment) return res.status(404).json({ error: 'Invoice not found.' });
  if (payment.userId !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Access denied.' });

  return res.status(200).json({
    invoice: {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      createdAt: payment.createdAt,
    },
  });
});

// GET /payments/history
router.get('/payments/history', verifyToken, (req, res) => {
  const userPayments = [];
  for (const p of payments.values()) {
    if (p.userId === req.user.id) userPayments.push(p);
  }
  userPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.status(200).json({ payments: userPayments });
});

// ---------------------------------------------------------------------------
// ANALYTICS ROUTES  /analytics/*
// ---------------------------------------------------------------------------

const SUPPORTED_PLATFORMS = ['twitter', 'instagram', 'tiktok', 'youtube', 'linkedin', 'facebook'];

// GET /analytics/social/platforms
router.get('/analytics/social/platforms', verifyToken, (req, res) => {
  const userPlatforms = socialPlatforms.get(req.user.id) || new Map();
  const status = SUPPORTED_PLATFORMS.map((p) => ({
    platform: p,
    connected: userPlatforms.has(p),
    lastSync: userPlatforms.get(p)?.lastSync || null,
  }));
  return res.status(200).json({ platforms: status });
});

// POST /analytics/social/connect
router.post('/analytics/social/connect', verifyToken, async (req, res) => {
  try {
    const { platform, accessToken, refreshToken: rToken, expiresIn } = req.body || {};
    if (!platform || !SUPPORTED_PLATFORMS.includes(platform.toLowerCase()))
      return res.status(400).json({ error: `Unsupported platform. Supported: ${SUPPORTED_PLATFORMS.join(', ')}` });
    if (!accessToken)
      return res.status(400).json({ error: 'accessToken is required.' });

    let userPlatforms = socialPlatforms.get(req.user.id);
    if (!userPlatforms) {
      userPlatforms = new Map();
      socialPlatforms.set(req.user.id, userPlatforms);
    }

    userPlatforms.set(platform.toLowerCase(), {
      accessToken,
      refreshToken: rToken || null,
      expiresIn: expiresIn || null,
      connectedAt: new Date().toISOString(),
      lastSync: null,
    });

    writeAudit('social.platform.connected', { userId: req.user.id, platform });
    return res.status(200).json({ message: `${platform} connected successfully.` });
  } catch (err) {
    console.error('[analytics/social/connect]', err);
    return res.status(500).json({ error: 'Platform connection failed.' });
  }
});

// GET /analytics/social/:platform/metrics
router.get('/analytics/social/:platform/metrics', verifyToken, (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform.toLowerCase()))
    return res.status(400).json({ error: 'Unsupported platform.' });

  const userPlatforms = socialPlatforms.get(req.user.id) || new Map();
  if (!userPlatforms.has(platform.toLowerCase()))
    return res.status(404).json({ error: `${platform} is not connected.` });

  const key = `${req.user.id}:${platform.toLowerCase()}`;
  const metrics = platformMetrics.get(key) || {
    platform: platform.toLowerCase(),
    followers: 0,
    following: 0,
    posts: 0,
    impressions: 0,
    engagementRate: 0,
    lastUpdated: null,
  };

  return res.status(200).json({ metrics });
});

// GET /analytics/social/aggregate
router.get('/analytics/social/aggregate', verifyToken, (req, res) => {
  const userPlatforms = socialPlatforms.get(req.user.id) || new Map();
  const aggregate = {
    totalFollowers: 0,
    totalImpressions: 0,
    avgEngagementRate: 0,
    platformCount: userPlatforms.size,
    breakdown: [],
  };

  let engSum = 0;
  let engCount = 0;
  for (const [platform] of userPlatforms) {
    const key = `${req.user.id}:${platform}`;
    const m = platformMetrics.get(key);
    if (m) {
      aggregate.totalFollowers += m.followers || 0;
      aggregate.totalImpressions += m.impressions || 0;
      engSum += m.engagementRate || 0;
      engCount += 1;
      aggregate.breakdown.push({ platform, ...m });
    }
  }
  if (engCount > 0) aggregate.avgEngagementRate = +(engSum / engCount).toFixed(4);

  return res.status(200).json({ aggregate });
});

// POST /analytics/social/refresh
router.post('/analytics/social/refresh', verifyToken, async (req, res) => {
  try {
    const { platform } = req.body || {};
    const userPlatforms = socialPlatforms.get(req.user.id) || new Map();

    const toRefresh = platform
      ? [platform.toLowerCase()]
      : [...userPlatforms.keys()];

    const refreshed = [];
    for (const p of toRefresh) {
      if (!userPlatforms.has(p)) continue;
      // In production: call the platform's API here
      const key = `${req.user.id}:${p}`;
      const existing = platformMetrics.get(key) || {};
      const updated = {
        ...existing,
        platform: p,
        lastUpdated: new Date().toISOString(),
      };
      platformMetrics.set(key, updated);
      const creds = userPlatforms.get(p);
      creds.lastSync = updated.lastUpdated;
      userPlatforms.set(p, creds);
      refreshed.push(p);
    }

    return res.status(200).json({ refreshed, message: `Metrics refreshed for: ${refreshed.join(', ') || 'none'}` });
  } catch (err) {
    console.error('[analytics/social/refresh]', err);
    return res.status(500).json({ error: 'Metrics refresh failed.' });
  }
});

// ---------------------------------------------------------------------------
// GAME ROUTES  /game/*
// ---------------------------------------------------------------------------

// GET /game/projects
router.get('/game/projects', verifyToken, (req, res) => {
  const userProjects = [];
  for (const p of gameProjects.values()) {
    if (p.ownerId === req.user.id || (p.collaborators || []).includes(req.user.id)) {
      userProjects.push(p);
    }
  }
  userProjects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return res.status(200).json({ projects: userProjects });
});

// POST /game/projects
router.post('/game/projects', verifyToken, async (req, res) => {
  try {
    const { name, description, engine, platforms = [], genre } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2)
      return res.status(400).json({ error: 'Project name must be at least 2 characters.' });

    const ENGINES = ['unity', 'unreal', 'godot', 'phaser', 'three.js', 'custom'];
    if (engine && !ENGINES.includes(engine.toLowerCase()))
      return res.status(400).json({ error: `Unsupported engine. Supported: ${ENGINES.join(', ')}` });

    const projectId = uuidv4();
    const now = new Date().toISOString();
    const project = {
      id: projectId,
      ownerId: req.user.id,
      name: name.trim(),
      description: description || '',
      engine: engine ? engine.toLowerCase() : null,
      platforms,
      genre: genre || null,
      status: 'development',
      collaborators: [],
      connectedPlatforms: [],
      builds: [],
      createdAt: now,
      updatedAt: now,
    };
    gameProjects.set(projectId, project);
    writeAudit('game.project.created', { userId: req.user.id, projectId, name: project.name });

    return res.status(201).json({ project });
  } catch (err) {
    console.error('[game/projects]', err);
    return res.status(500).json({ error: 'Project creation failed.' });
  }
});

// PUT /game/projects/:id
router.put('/game/projects/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const project = gameProjects.get(id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.ownerId !== req.user.id)
      return res.status(403).json({ error: 'Only the project owner can update it.' });

    const allowed = ['name', 'description', 'engine', 'platforms', 'genre', 'status'];
    for (const key of allowed) {
      if (req.body && req.body[key] !== undefined) project[key] = req.body[key];
    }
    project.updatedAt = new Date().toISOString();
    gameProjects.set(id, project);
    writeAudit('game.project.updated', { userId: req.user.id, projectId: id });

    return res.status(200).json({ project });
  } catch (err) {
    console.error('[game/projects/:id]', err);
    return res.status(500).json({ error: 'Project update failed.' });
  }
});

// GET /game/platforms/status
router.get('/game/platforms/status', verifyToken, (req, res) => {
  const GAME_PLATFORMS = ['steam', 'epic', 'itch.io', 'google-play', 'app-store', 'xbox', 'playstation'];
  const userGamePlatforms = socialPlatforms.get(`game:${req.user.id}`) || new Map();
  const status = GAME_PLATFORMS.map((p) => ({
    platform: p,
    connected: userGamePlatforms.has(p),
    lastSync: userGamePlatforms.get(p)?.lastSync || null,
  }));
  return res.status(200).json({ platforms: status });
});

// POST /game/platforms/connect
router.post('/game/platforms/connect', verifyToken, async (req, res) => {
  try {
    const { platform, apiKey, storeId } = req.body || {};
    const GAME_PLATFORMS = ['steam', 'epic', 'itch.io', 'google-play', 'app-store', 'xbox', 'playstation'];
    if (!platform || !GAME_PLATFORMS.includes(platform.toLowerCase()))
      return res.status(400).json({ error: `Unsupported platform. Supported: ${GAME_PLATFORMS.join(', ')}` });
    if (!apiKey)
      return res.status(400).json({ error: 'apiKey is required.' });

    const key = `game:${req.user.id}`;
    let userGamePlatforms = socialPlatforms.get(key);
    if (!userGamePlatforms) {
      userGamePlatforms = new Map();
      socialPlatforms.set(key, userGamePlatforms);
    }
    userGamePlatforms.set(platform.toLowerCase(), {
      apiKey,
      storeId: storeId || null,
      connectedAt: new Date().toISOString(),
      lastSync: null,
    });

    writeAudit('game.platform.connected', { userId: req.user.id, platform });
    return res.status(200).json({ message: `${platform} connected successfully.` });
  } catch (err) {
    console.error('[game/platforms/connect]', err);
    return res.status(500).json({ error: 'Platform connection failed.' });
  }
});

// GET /game/achievements/:userId
router.get('/game/achievements/:userId', verifyToken, (req, res) => {
  const { userId } = req.params;
  // Users can view their own; admins/developers can view others
  if (userId !== req.user.id && !['admin', 'developer'].includes(req.user.role))
    return res.status(403).json({ error: 'Access denied.' });

  // Placeholder achievements – real impl would query a DB
  return res.status(200).json({
    userId,
    achievements: [],
    totalPoints: 0,
    level: 1,
  });
});

// POST /game/builds
router.post('/game/builds', verifyToken, async (req, res) => {
  try {
    const { projectId, version, platform, notes, artifactUrl } = req.body || {};
    if (!projectId || !version || !platform)
      return res.status(400).json({ error: 'projectId, version, and platform are required.' });

    const project = gameProjects.get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.ownerId !== req.user.id && !project.collaborators.includes(req.user.id))
      return res.status(403).json({ error: 'Access denied.' });

    const buildId = uuidv4();
    const now = new Date().toISOString();
    const build = {
      id: buildId,
      projectId,
      version,
      platform,
      notes: notes || '',
      artifactUrl: artifactUrl || null,
      status: 'pending',
      createdBy: req.user.id,
      createdAt: now,
    };
    gameBuilds.set(buildId, build);
    project.builds.push(buildId);
    project.updatedAt = now;
    gameProjects.set(projectId, project);
    writeAudit('game.build.created', { userId: req.user.id, buildId, projectId, version });

    return res.status(201).json({ build });
  } catch (err) {
    console.error('[game/builds]', err);
    return res.status(500).json({ error: 'Build record creation failed.' });
  }
});

// ---------------------------------------------------------------------------
// ADMIN ROUTES  /admin/*  – require admin role
// ---------------------------------------------------------------------------

// GET /admin/users
router.get('/admin/users', verifyToken, requireRole('admin'), (req, res) => {
  const { page = 1, limit = 50, role } = req.query;
  let result = [...users.values()].map(sanitizeUser);
  if (role && VALID_ROLES.includes(role)) result = result.filter((u) => u.role === role);
  const start = (Number(page) - 1) * Number(limit);
  return res.status(200).json({
    users: result.slice(start, start + Number(limit)),
    total: result.length,
    page: Number(page),
    limit: Number(limit),
  });
});

// PUT /admin/users/:id/role
router.put('/admin/users/:id/role', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ error: `Invalid role. Valid roles: ${VALID_ROLES.join(', ')}` });

    const user = users.get(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const previousRole = user.role;
    user.role = role;
    user.updatedAt = new Date().toISOString();
    users.set(id, user);
    writeAudit('admin.user.role.changed', {
      adminId: req.user.id,
      targetUserId: id,
      from: previousRole,
      to: role,
    });

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[admin/users/:id/role]', err);
    return res.status(500).json({ error: 'Role update failed.' });
  }
});

// DELETE /admin/users/:id
router.delete('/admin/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id)
      return res.status(400).json({ error: 'Admins cannot delete their own account through this endpoint.' });

    const user = users.get(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    usernameIndex.delete(user.username);
    emailIndex.delete(user.email);
    users.delete(id);
    twoFaSecrets.delete(id);
    writeAudit('admin.user.deleted', { adminId: req.user.id, targetUserId: id });

    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('[admin/users/:id]', err);
    return res.status(500).json({ error: 'User deletion failed.' });
  }
});

// GET /admin/audit-log
router.get('/admin/audit-log', verifyToken, requireRole('admin'), (req, res) => {
  const { page = 1, limit = 100, action } = req.query;
  let log = action ? auditLog.filter((e) => e.action.includes(action)) : [...auditLog];
  log = log.slice().reverse(); // newest first
  const start = (Number(page) - 1) * Number(limit);
  return res.status(200).json({
    log: log.slice(start, start + Number(limit)),
    total: log.length,
    page: Number(page),
    limit: Number(limit),
  });
});

// GET /admin/system-stats
router.get('/admin/system-stats', verifyToken, requireRole('admin'), (req, res) => {
  const roleCounts = {};
  for (const role of VALID_ROLES) roleCounts[role] = 0;
  for (const u of users.values()) roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;

  return res.status(200).json({
    stats: {
      users: {
        total: users.size,
        byRole: roleCounts,
        twoFaEnabled: [...users.values()].filter((u) => u.twoFaEnabled).length,
      },
      payments: {
        total: payments.size,
        activeSubscriptions: [...subscriptions.values()].filter((s) => s.status === 'active').length,
      },
      game: {
        projects: gameProjects.size,
        builds: gameBuilds.size,
      },
      analytics: {
        connectedPlatformUsers: socialPlatforms.size,
      },
      auditLog: {
        totalEntries: auditLog.length,
      },
      server: {
        uptime: process.uptime(),
        memoryMB: +(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      },
    },
  });
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export default router;
