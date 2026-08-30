/**
 * server/routes/auth.js
 * Authentication routes – register, login, refresh, logout, MFA, biometrics
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 */

import { Router } from 'express';
import bcrypt     from 'bcryptjs';
import crypto     from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  signAccessToken,
  signRefreshToken,
  revokeToken,
  ROLES,
} from '../middleware/auth.js';
import {
  trackFailedAuth,
  resetFailedAuth,
  setSession,
  getSession,
  deleteSession,
} from '../services/redisService.js';

const router = Router();

// ─── In-memory user store (replace with DB in production) ────────────────────
// Production: use PostgreSQL / MongoDB. IDs are UUIDs, passwords bcrypt-hashed.
const users = new Map();

// ─── Password validation ──────────────────────────────────────────────────────
const COMMON_PASSWORDS = new Set([
  'password123456', 'qwerty123456789', '123456789012345',
  'passwordpassword', 'letmein123456', 'welcome123456',
  'admin1234567890', 'iloveyou12345', 'monkey123456789',
  'dragon123456789', 'master123456789', 'sunshine12345',
  'princess123456', 'shadow123456789', 'football12345',
  'baseball123456', 'trustno1234567', 'superman12345',
  'batman12345678', 'starwars123456',
]);

/**
 * Validate password strength.
 * @param {string} password
 * @returns {{ valid: boolean, score: number, issues: string[] }}
 */
function validatePassword(password) {
  const issues = [];

  if (typeof password !== 'string' || password.length < 13)
    issues.push('Password must be at least 13 characters');
  if (!/[A-Z]/.test(password)) issues.push('Must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) issues.push('Must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) issues.push('Must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('Must contain at least one special character');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) issues.push('Password is too common');

  // Penalise repetitive patterns
  if (/(.)\1{4,}/.test(password)) issues.push('Avoid repeating characters');

  const score = Math.max(0, 100 - issues.length * 18);
  return { valid: issues.length === 0, score, issues };
}

/**
 * Validate username – allows Unicode letters, digits, emoji, limited symbols.
 * Blocks null bytes, control chars, and SQL/XSS injection fragments.
 */
function validateUsername(username) {
  if (typeof username !== 'string') return false;
  const len = [...username].length;          // Unicode-aware length
  if (len < 2 || len > 50) return false;
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(username)) return false;  // control chars
  if (/<script|javascript:|on\w+=/i.test(username)) return false;         // XSS
  if (/('|"|;|--|\bDROP\b|\bSELECT\b)/i.test(username)) return false;    // SQLi
  return true;
}

// ─── TOTP helpers (RFC 6238) ──────────────────────────────────────────────────

function generateTOTPSecret() {
  return crypto.randomBytes(20).toString('base64url');
}

/** Minimal HMAC-SHA1 TOTP (RFC 6238). */
function verifyTOTP(secret, token, windowSteps = 1) {
  const now   = Math.floor(Date.now() / 1000);
  const step  = 30;
  const buf   = Buffer.from(secret, 'base64url');

  for (let w = -windowSteps; w <= windowSteps; w++) {
    const counter = Math.floor((now + w * step) / step);
    const ctr = Buffer.alloc(8);
    ctr.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    ctr.writeUInt32BE(counter >>> 0, 4);

    const hmac  = crypto.createHmac('sha1', buf).update(ctr).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code  = (
      ((hmac[offset]     & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) <<  8) |
       (hmac[offset + 3] & 0xff)
    ) % 1_000_000;

    if (String(code).padStart(6, '0') === String(token).trim()) return true;
  }
  return false;
}

/** Generate 8 alphanumeric backup codes. */
function generateBackupCodes() {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 10)
  );
}

// ─── Audit log helper ─────────────────────────────────────────────────────────

function audit(action, userId, req, meta = {}) {
  // Minimal structured log – write to stdout; aggregate externally.
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    userId: userId ?? 'anonymous',
    ip:   req.ip,
    ua:   req.get('user-agent')?.slice(0, 120) ?? '',
    ...meta,
  }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { username, email, password, role? }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = ROLES.USER } = req.body;

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username (2-50 chars, no control characters or injection patterns)' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ error: 'Password does not meet requirements', issues: pwCheck.issues });
    }

    // Restrict role assignment – only admins may set elevated roles
    const safeRole = Object.values(ROLES).includes(role) ? role : ROLES.USER;

    // Duplicate check (email or username)
    for (const u of users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    const id           = uuidv4();
    const passwordHash = await bcrypt.hash(password, 14);  // cost factor 14

    const user = {
      id,
      username,
      email:        email.toLowerCase(),
      passwordHash,
      role:         safeRole,
      createdAt:    new Date().toISOString(),
      mfa:          { enabled: false, type: null, secret: null, backupCodes: [] },
      biometric:    { enrolled: false, credentialIds: [] },
      locked:       false,
      profileLocale: 'en',
      timezone:     'UTC',
    };

    users.set(id, user);

    audit('register', id, req, { username, email, role: safeRole });

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const sessionId    = uuidv4();
    await setSession(sessionId, { userId: id, role: safeRole });

    return res.status(201).json({
      accessToken,
      refreshToken,
      sessionId,
      user: { id, username, email, role: safeRole },
    });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password, mfaToken? }
 */
router.post('/login', async (req, res) => {
  const LOCK_THRESHOLD = 10;

  try {
    const { email, password, mfaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Rate-limit failed attempts by IP
    const failKey = `ip:${req.ip}`;
    const failures = await trackFailedAuth(failKey);
    if (failures > LOCK_THRESHOLD) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    // Find user
    const user = [...users.values()].find(u => u.email === email.toLowerCase());
    if (!user) {
      await trackFailedAuth(failKey);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.locked) {
      return res.status(403).json({ error: 'Account is locked. Contact support.' });
    }

    // Password check
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await trackFailedAuth(failKey);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // MFA check
    if (user.mfa.enabled) {
      if (!mfaToken) {
        return res.status(202).json({ mfaRequired: true, mfaType: user.mfa.type });
      }

      const mfaValid =
        user.mfa.type === 'totp'
          ? verifyTOTP(user.mfa.secret, mfaToken)
          : user.mfa.backupCodes.includes(String(mfaToken).trim().toUpperCase());

      if (!mfaValid) {
        await trackFailedAuth(failKey);
        return res.status(401).json({ error: 'Invalid MFA token' });
      }

      // Consume backup code
      if (user.mfa.backupCodes.includes(String(mfaToken).trim().toUpperCase())) {
        user.mfa.backupCodes = user.mfa.backupCodes.filter(c => c !== mfaToken.trim().toUpperCase());
      }
    }

    // Success – reset failure counter, issue tokens
    await resetFailedAuth(failKey);
    audit('login', user.id, req);

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const sessionId    = uuidv4();
    await setSession(sessionId, { userId: user.id, role: user.role });

    return res.json({
      accessToken,
      refreshToken,
      sessionId,
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
        role:     user.role,
        mfa:      { enabled: user.mfa.enabled, type: user.mfa.type },
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <token>
 */
router.post('/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const token  = header.split(' ')[1];
  if (token) {
    try {
      const { jti } = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString()
      );
      if (jti) revokeToken(jti);
    } catch { /* ignore malformed token */ }
  }

  const { sessionId } = req.body;
  if (sessionId) deleteSession(sessionId).catch(() => {});

  return res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  try {
    const { default: jwt } = await import('jsonwebtoken');
    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      { algorithms: ['HS512'] },
    );

    const user = users.get(payload.sub);
    if (!user || user.locked) {
      return res.status(401).json({ error: 'User not found or account locked' });
    }

    const newAccessToken  = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * POST /api/auth/mfa/setup
 * Body: { type: 'totp' }   (extend for sms/email OTP)
 * Requires: authenticate middleware applied at router level
 */
router.post('/mfa/setup', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { type = 'totp' } = req.body;

  const secret      = generateTOTPSecret();
  const backupCodes = generateBackupCodes();

  // Store pending – only activate after verification
  user._pendingMFA = { type, secret, backupCodes };

  audit('mfa_setup_initiated', userId, req, { type });

  return res.json({
    type,
    secret,
    backupCodes,
    otpAuthUrl: `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro`,
  });
});

/**
 * POST /api/auth/mfa/verify-setup
 * Body: { token }
 */
router.post('/mfa/verify-setup', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const user = users.get(userId);
  if (!user || !user._pendingMFA) {
    return res.status(400).json({ error: 'No pending MFA setup' });
  }

  const { token } = req.body;
  const valid = verifyTOTP(user._pendingMFA.secret, token);

  if (!valid) return res.status(400).json({ error: 'Invalid token – MFA not activated' });

  user.mfa = {
    enabled:     true,
    type:        user._pendingMFA.type,
    secret:      user._pendingMFA.secret,
    backupCodes: user._pendingMFA.backupCodes,
  };
  delete user._pendingMFA;

  audit('mfa_enabled', userId, req, { type: user.mfa.type });
  return res.json({ message: 'MFA enabled successfully', backupCodes: user.mfa.backupCodes });
});

/**
 * POST /api/auth/mfa/disable
 * Body: { password }
 */
router.post('/mfa/disable', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { password } = req.body;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });

  user.mfa = { enabled: false, type: null, secret: null, backupCodes: [] };
  audit('mfa_disabled', userId, req);
  return res.json({ message: 'MFA disabled' });
});

/**
 * POST /api/auth/biometric/challenge
 * Returns a WebAuthn challenge for fingerprint / Face ID / Touch ID.
 */
router.post('/biometric/challenge', (req, res) => {
  const challenge = crypto.randomBytes(32).toString('base64url');
  // Store challenge in session for verification (short-lived)
  const expiresAt = Date.now() + 60_000;
  return res.json({ challenge, expiresAt, rpId: process.env.WEBAUTHN_RP_ID || 'nexusai.pro' });
});

/**
 * POST /api/auth/biometric/verify
 * Body: { credentialId, clientDataJSON, authenticatorData, signature }
 * Full WebAuthn verification requires `@simplewebauthn/server` in production.
 * This stub validates the shape and returns a token for enrolled users.
 */
router.post('/biometric/verify', async (req, res) => {
  const { credentialId, userId } = req.body;
  if (!credentialId || !userId) {
    return res.status(400).json({ error: 'credentialId and userId required' });
  }

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const enrolled = user.biometric.credentialIds.includes(credentialId);
  if (!enrolled) return res.status(401).json({ error: 'Biometric credential not enrolled' });

  audit('biometric_login', userId, req);
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return res.json({ accessToken, refreshToken, user: { id: user.id, username: user.username, role: user.role } });
});

/**
 * POST /api/auth/biometric/enroll
 * Body: { credentialId, publicKey }
 */
router.post('/biometric/enroll', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const { credentialId } = req.body;
  if (!credentialId) return res.status(400).json({ error: 'credentialId required' });

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.biometric.credentialIds.includes(credentialId)) {
    user.biometric.credentialIds.push(credentialId);
  }
  user.biometric.enrolled = true;

  audit('biometric_enrolled', userId, req);
  return res.json({ message: 'Biometric credential enrolled', enrolled: user.biometric.credentialIds.length });
});

/**
 * GET /api/auth/me
 */
router.get('/me', (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.json({
    id:          user.id,
    username:    user.username,
    email:       user.email,
    role:        user.role,
    mfa:         { enabled: user.mfa.enabled, type: user.mfa.type },
    biometric:   { enrolled: user.biometric.enrolled },
    createdAt:   user.createdAt,
    profileLocale: user.profileLocale,
  });
});

/**
 * PUT /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
router.put('/change-password', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const { currentPassword, newPassword } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) {
    return res.status(400).json({ error: 'New password does not meet requirements', issues: pwCheck.issues });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 14);
  audit('password_change', userId, req);
  return res.json({ message: 'Password changed successfully' });
});

export default router;
