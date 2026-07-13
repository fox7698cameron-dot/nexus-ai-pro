// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/routes/auth.js
// Authentication routes (mounted at /api/auth by server.js).
// Implements: register, login, 2FA (TOTP via speakeasy), MFA, biometrics,
// token refresh/logout, password change/reset, and profile management.

import { Router }  from 'express';
import bcrypt      from 'bcryptjs';
import speakeasy   from 'speakeasy';
import QRCode      from 'qrcode';
import crypto      from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import {
  getUserByEmail, createUser, updateUser, getUser, safeUser, ROLES,
} from '../services/userStore.js';

import {
  addRefreshToken,
  getRefreshToken,
  removeRefreshToken,
  removeAllUserRefreshTokens,
  addResetToken,
  getResetToken,
  removeResetToken,
  addMfaSession,
  getMfaSession,
  removeMfaSession,
} from '../services/tokenStore.js';

import { authenticate, issueToken } from '../middleware/auth.js';

const router    = Router();
const isDev     = process.env.NODE_ENV !== 'production';
const APP_NAME  = 'Nexus AI Pro';
const BCRYPT_ROUNDS = 12;

// ─── Validation helpers ──────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** @param {unknown} email @returns {boolean} */
function validateEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

/**
 * Validate a password against all complexity rules.
 * Passwords MUST be pure ASCII — Unicode/emoji is accepted in display names
 * but forbidden in passwords to prevent encoding-based bypass attacks.
 *
 * @param {unknown} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePassword(password) {
  const errors = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }

  // Block non-ASCII to prevent unicode homoglyph / encoding attacks
  if (/[^\x00-\x7F]/.test(password)) {
    errors.push('Password must contain only ASCII characters (no emoji or non-ASCII)');
  }

  if (password.length < 13) {
    errors.push('Password must be at least 13 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character: !@#$%^&*()_+-=[]{}|;:,.<>?');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate 10 backup codes of 8 hex characters each (4 random bytes → 8 hex chars).
 * Returned as an array of raw codes (shown once to the user).
 * @returns {string[]}
 */
function generateBackupCodes() {
  return Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
}

/**
 * Hash backup codes using SHA-256 (fast enough for one-time codes; bcrypt would
 * be overkill for 8-char hex values that are salted by their uniqueness + rotation).
 * @param {string[]} codes
 * @returns {string[]}
 */
function hashBackupCodes(codes) {
  return codes.map(c => crypto.createHash('sha256').update(c).digest('hex'));
}

/**
 * Find a backup code in the stored hashed list; returns its index or -1.
 * @param {string} raw
 * @param {string[]} hashed
 * @returns {number}
 */
function findBackupCode(raw, hashed) {
  const h = crypto.createHash('sha256').update(raw.toUpperCase().trim()).digest('hex');
  return hashed.indexOf(h);
}

// ─── POST /register ──────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, language = 'en', region = null } = req.body ?? {};

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address', code: 'INVALID_EMAIL' });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({
        error:   pwCheck.errors[0],
        code:    'WEAK_PASSWORD',
        details: pwCheck.errors,
      });
    }

    // displayName: required, string, supports Unicode/emoji, 1–100 chars
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 1) {
      return res.status(400).json({ error: 'Display name is required', code: 'INVALID_DISPLAY_NAME' });
    }
    const sanitizedName = displayName.trim().slice(0, 100);

    if (getUserByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = createUser({
      email: email.trim().toLowerCase(),
      passwordHash,
      displayName: sanitizedName,
      role: ROLES.USER,
      language: String(language).slice(0, 10),
      region:   region ? String(region).slice(0, 10) : null,
    });

    const accessToken  = issueToken(user, '15m');
    const refreshToken = addRefreshToken(user.id);
    user.refreshTokens.add(refreshToken);

    return res.status(201).json({
      success: true,
      data: {
        user: safeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    if (isDev) console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Registration failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /login ─────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!validateEmail(email) || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required', code: 'INVALID_INPUT' });
    }

    const user = getUserByEmail(email);

    // Always run bcrypt to prevent timing-based email enumeration
    const hashToCheck = user?.passwordHash ?? '$2b$12$invalidhashpadding......................';
    const valid = await bcrypt.compare(password, hashToCheck);

    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    if (user.isSuspended || !user.isActive) {
      return res.status(403).json({ error: 'Account suspended or inactive', code: 'ACCOUNT_INACTIVE' });
    }

    // 2FA required → issue a short-lived MFA session token
    if (user.twoFactorEnabled) {
      const mfaSessionToken = addMfaSession(user.id);
      return res.status(200).json({
        success: true,
        data: { requiresTwoFactor: true, mfaSessionToken },
      });
    }

    updateUser(user.id, { lastLogin: new Date().toISOString() });

    const accessToken  = issueToken(user, '15m');
    const refreshToken = addRefreshToken(user.id);
    user.refreshTokens.add(refreshToken);

    return res.status(200).json({
      success: true,
      data: { user: safeUser(user), accessToken, refreshToken },
    });
  } catch (err) {
    if (isDev) console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Login failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /mfa/verify ────────────────────────────────────────────────────────
// Complete a login that required 2FA.  Accepts either a TOTP code or a backup code.

router.post('/mfa/verify', async (req, res) => {
  try {
    const { mfaSessionToken, code, backupCode } = req.body ?? {};

    if (!mfaSessionToken) {
      return res.status(400).json({ error: 'mfaSessionToken is required', code: 'INVALID_INPUT' });
    }

    const session = getMfaSession(mfaSessionToken);
    if (!session) {
      return res.status(401).json({ error: 'MFA session expired or invalid', code: 'SESSION_INVALID' });
    }

    const user = getUser(session.userId);
    if (!user || !user.isActive || user.isSuspended) {
      removeMfaSession(mfaSessionToken);
      return res.status(403).json({ error: 'Account unavailable', code: 'ACCOUNT_INACTIVE' });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      removeMfaSession(mfaSessionToken);
      return res.status(400).json({ error: '2FA is not enabled on this account', code: '2FA_NOT_ENABLED' });
    }

    let verified = false;

    if (code) {
      verified = speakeasy.totp.verify({
        secret:   user.twoFactorSecret,
        encoding: 'base32',
        token:    String(code).trim(),
        window:   1, // ±30-second drift tolerance
      });
    } else if (backupCode) {
      const idx = findBackupCode(backupCode, user.backupCodes);
      if (idx !== -1) {
        verified = true;
        // Consume the used backup code — one-time use
        const remaining = user.backupCodes.filter((_, i) => i !== idx);
        updateUser(user.id, { backupCodes: remaining });
      }
    } else {
      return res.status(400).json({
        error: 'Provide either a TOTP code or a backup code',
        code:  'MISSING_FACTOR',
      });
    }

    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA code', code: 'INVALID_MFA_CODE' });
    }

    removeMfaSession(mfaSessionToken);
    updateUser(user.id, { lastLogin: new Date().toISOString() });

    const accessToken  = issueToken(user, '15m');
    const refreshToken = addRefreshToken(user.id);
    user.refreshTokens.add(refreshToken);

    return res.status(200).json({
      success: true,
      data: { user: safeUser(user), accessToken, refreshToken },
    });
  } catch (err) {
    if (isDev) console.error('[auth/mfa/verify]', err);
    return res.status(500).json({ error: 'MFA verification failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /refresh ────────────────────────────────────────────────────────────
// Exchange a valid refresh token for a new access + refresh token pair (rotation).

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'refreshToken is required', code: 'INVALID_INPUT' });
    }

    const entry = getRefreshToken(refreshToken);
    if (!entry) {
      return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'TOKEN_INVALID' });
    }

    const user = getUser(entry.userId);
    if (!user || !user.isActive || user.isSuspended) {
      removeRefreshToken(refreshToken);
      return res.status(403).json({ error: 'Account unavailable', code: 'ACCOUNT_INACTIVE' });
    }

    // Rotate: invalidate old token, issue new pair
    removeRefreshToken(refreshToken);
    user.refreshTokens.delete(refreshToken);

    const newAccessToken  = issueToken(user, '15m');
    const newRefreshToken = addRefreshToken(user.id);
    user.refreshTokens.add(newRefreshToken);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    if (isDev) console.error('[auth/refresh]', err);
    return res.status(500).json({ error: 'Token refresh failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post('/logout', authenticate, (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (refreshToken && typeof refreshToken === 'string') {
      removeRefreshToken(refreshToken);
      const user = getUser(req.user.id);
      if (user) user.refreshTokens.delete(refreshToken);
    }
    return res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    if (isDev) console.error('[auth/logout]', err);
    return res.status(500).json({ error: 'Logout failed', code: 'SERVER_ERROR' });
  }
});

// ─── GET /me ─────────────────────────────────────────────────────────────────

router.get('/me', authenticate, (req, res) => {
  const user = getUser(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  return res.status(200).json({ success: true, data: safeUser(user) });
});

// ─── PUT /me ─────────────────────────────────────────────────────────────────

router.put('/me', authenticate, async (req, res) => {
  try {
    const { displayName, language, region, theme } = req.body ?? {};
    const updates = {};

    if (displayName !== undefined) {
      if (typeof displayName !== 'string') {
        return res.status(400).json({ error: 'displayName must be a string', code: 'INVALID_DISPLAY_NAME' });
      }
      const trimmed = displayName.trim();
      if (trimmed.length < 1 || trimmed.length > 100) {
        return res.status(400).json({ error: 'Display name must be 1–100 characters', code: 'INVALID_DISPLAY_NAME' });
      }
      updates.displayName = trimmed; // Unicode/emoji permitted
    }

    if (language !== undefined) {
      if (typeof language !== 'string' || !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)) {
        return res.status(400).json({ error: 'Invalid language code (e.g. "en", "en-US")', code: 'INVALID_LANGUAGE' });
      }
      updates.language = language;
    }

    if (region !== undefined) {
      if (region !== null && (typeof region !== 'string' || region.length > 10)) {
        return res.status(400).json({ error: 'Invalid region', code: 'INVALID_REGION' });
      }
      updates.region = region;
    }

    if (theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({ error: 'theme must be "light", "dark", or "system"', code: 'INVALID_THEME' });
      }
      updates.theme = theme;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided', code: 'NO_UPDATES' });
    }

    const updated = updateUser(req.user.id, updates);
    if (!updated) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

    return res.status(200).json({ success: true, data: safeUser(updated) });
  } catch (err) {
    if (isDev) console.error('[auth/me PUT]', err);
    return res.status(500).json({ error: 'Profile update failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /2fa/setup ─────────────────────────────────────────────────────────
// Generate a TOTP secret and QR code.  2FA is not active until /2fa/verify succeeds.

router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const user = getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

    if (user.twoFactorEnabled) {
      return res.status(409).json({ error: '2FA is already enabled', code: '2FA_ALREADY_ENABLED' });
    }

    const secretObj = speakeasy.generateSecret({
      name:   `${APP_NAME} (${user.email})`,
      issuer: APP_NAME,
      length: 32,
    });

    const rawBackupCodes    = generateBackupCodes();
    const hashedBackupCodes = hashBackupCodes(rawBackupCodes);

    updateUser(user.id, {
      twoFactorSecret: secretObj.base32,
      backupCodes:     hashedBackupCodes,
    });

    const qrDataUrl = await QRCode.toDataURL(secretObj.otpauth_url);

    return res.status(200).json({
      success: true,
      data: {
        secret:      secretObj.base32,
        qrDataUrl,
        backupCodes: rawBackupCodes, // shown exactly once — user must store these
        otpauthUrl:  secretObj.otpauth_url,
        message:     'Scan the QR code in an authenticator app, then call POST /2fa/verify to activate.',
      },
    });
  } catch (err) {
    if (isDev) console.error('[auth/2fa/setup]', err);
    return res.status(500).json({ error: '2FA setup failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /2fa/verify ────────────────────────────────────────────────────────
// Confirm and activate 2FA by verifying the first TOTP code.

router.post('/2fa/verify', authenticate, (req, res) => {
  try {
    const { code } = req.body ?? {};
    if (!code) return res.status(400).json({ error: 'TOTP code is required', code: 'INVALID_INPUT' });

    const user = getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA has not been set up; call POST /2fa/setup first', code: '2FA_NOT_SETUP' });
    }

    const valid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    String(code).trim(),
      window:   1,
    });

    if (!valid) return res.status(401).json({ error: 'Invalid TOTP code', code: 'INVALID_2FA_CODE' });

    updateUser(user.id, { twoFactorEnabled: true });
    return res.status(200).json({ success: true, data: { message: '2FA enabled successfully', twoFactorEnabled: true } });
  } catch (err) {
    if (isDev) console.error('[auth/2fa/verify]', err);
    return res.status(500).json({ error: '2FA verification failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /2fa/disable ───────────────────────────────────────────────────────

router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body ?? {};
    if (!password) return res.status(400).json({ error: 'Password confirmation required', code: 'INVALID_INPUT' });

    const user = getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not currently enabled', code: '2FA_NOT_ENABLED' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password', code: 'INVALID_CREDENTIALS' });

    updateUser(user.id, { twoFactorEnabled: false, twoFactorSecret: null, backupCodes: [] });
    return res.status(200).json({ success: true, data: { message: '2FA disabled', twoFactorEnabled: false } });
  } catch (err) {
    if (isDev) console.error('[auth/2fa/disable]', err);
    return res.status(500).json({ error: 'Operation failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /password/change ───────────────────────────────────────────────────

router.post('/password/change', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required', code: 'INVALID_INPUT' });
    }

    const user = getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect', code: 'INVALID_CREDENTIALS' });

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ error: pwCheck.errors[0], code: 'WEAK_PASSWORD', details: pwCheck.errors });
    }

    // Prevent reuse of the current password
    const reused = await bcrypt.compare(newPassword, user.passwordHash);
    if (reused) {
      return res.status(400).json({ error: 'New password must differ from the current one', code: 'PASSWORD_REUSE' });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    updateUser(user.id, { passwordHash });

    // Revoke all sessions — user must re-authenticate everywhere
    removeAllUserRefreshTokens(user.id);
    user.refreshTokens.clear();

    return res.status(200).json({
      success: true,
      data: { message: 'Password changed. All existing sessions have been revoked.' },
    });
  } catch (err) {
    if (isDev) console.error('[auth/password/change]', err);
    return res.status(500).json({ error: 'Password change failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /password/reset/request ────────────────────────────────────────────

router.post('/password/reset/request', async (req, res) => {
  try {
    const { email } = req.body ?? {};

    // Always respond 200 to prevent email-enumeration attacks
    if (validateEmail(email)) {
      const user = getUserByEmail(email);
      if (user && user.isActive && !user.isSuspended) {
        const rawToken = addResetToken(user.id);
        // No email service configured — log the token so it can be used in development/testing.
        // In production: replace this block with your transactional email provider.
        console.info(`[auth] Password reset token for ${user.email}: ${rawToken}`);
      }
    }

    return res.status(200).json({
      success: true,
      data: { message: 'If that email address is registered, a reset link has been sent.' },
    });
  } catch (err) {
    if (isDev) console.error('[auth/password/reset/request]', err);
    return res.status(500).json({ error: 'Request failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /password/reset/confirm ────────────────────────────────────────────

router.post('/password/reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required', code: 'INVALID_INPUT' });
    }

    const resetData = getResetToken(token);
    if (!resetData) {
      return res.status(400).json({ error: 'Reset token is invalid or has expired', code: 'TOKEN_INVALID' });
    }

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ error: pwCheck.errors[0], code: 'WEAK_PASSWORD', details: pwCheck.errors });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    updateUser(resetData.userId, { passwordHash });

    // Consume the reset token (one-time use)
    removeResetToken(token);

    // Revoke all existing sessions
    const user = getUser(resetData.userId);
    if (user) {
      removeAllUserRefreshTokens(user.id);
      user.refreshTokens.clear();
    }

    return res.status(200).json({ success: true, data: { message: 'Password reset successfully.' } });
  } catch (err) {
    if (isDev) console.error('[auth/password/reset/confirm]', err);
    return res.status(500).json({ error: 'Password reset failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /biometric/register ────────────────────────────────────────────────
// Store a WebAuthn public-key credential.  Full @simplewebauthn/server
// verification should be wired up for production deployments.

router.post('/biometric/register', authenticate, (req, res) => {
  try {
    const { credentialId, publicKey, deviceName = 'Unknown device' } = req.body ?? {};

    if (!credentialId || typeof credentialId !== 'string') {
      return res.status(400).json({ error: 'credentialId is required', code: 'INVALID_INPUT' });
    }
    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ error: 'publicKey is required', code: 'INVALID_INPUT' });
    }

    const user = getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

    const alreadyRegistered = user.biometricCredentials.some(c => c.credentialId === credentialId);
    if (alreadyRegistered) {
      return res.status(409).json({ error: 'Credential already registered', code: 'CREDENTIAL_EXISTS' });
    }

    const credential = {
      credentialId,
      publicKey,
      deviceName: String(deviceName).trim().slice(0, 100),
      registeredAt: new Date().toISOString(),
      lastUsed: null,
    };

    const credentials = [...user.biometricCredentials, credential];
    updateUser(user.id, { biometricCredentials: credentials });

    return res.status(201).json({
      success: true,
      data: {
        message: 'Biometric credential registered',
        credentialId: credential.credentialId,
        deviceName:   credential.deviceName,
        registeredAt: credential.registeredAt,
      },
    });
  } catch (err) {
    if (isDev) console.error('[auth/biometric/register]', err);
    return res.status(500).json({ error: 'Biometric registration failed', code: 'SERVER_ERROR' });
  }
});

// ─── POST /biometric/verify ──────────────────────────────────────────────────
// Authenticate using a stored WebAuthn credential.
// NOTE: Real WebAuthn signature verification requires @simplewebauthn/server.
// This implementation does structural validation and credential-ID lookup;
// replace the TODO block with full assertion verification before production use.

router.post('/biometric/verify', async (req, res) => {
  try {
    const { credentialId, assertion, email } = req.body ?? {};

    if (!credentialId || typeof credentialId !== 'string') {
      return res.status(400).json({ error: 'credentialId is required', code: 'INVALID_INPUT' });
    }
    if (!email) {
      return res.status(400).json({ error: 'email is required', code: 'INVALID_INPUT' });
    }

    const user = getUserByEmail(email);
    if (!user || !user.isActive || user.isSuspended) {
      // Generic error to prevent credential-ID enumeration
      return res.status(401).json({ error: 'Invalid biometric credentials', code: 'INVALID_CREDENTIALS' });
    }

    const credential = user.biometricCredentials.find(c => c.credentialId === credentialId);
    if (!credential) {
      return res.status(401).json({ error: 'Credential not found', code: 'CREDENTIAL_NOT_FOUND' });
    }

    // TODO: replace with full WebAuthn assertion verification:
    //   import { verifyAuthenticationResponse } from '@simplewebauthn/server';
    //   const verified = await verifyAuthenticationResponse({ response: assertion,
    //     expectedChallenge, expectedOrigin, expectedRPID, authenticator: credential });
    // For now we verify the assertion object exists and has a signature field.
    if (!assertion || typeof assertion !== 'object' || !assertion.signature) {
      return res.status(400).json({ error: 'Malformed assertion', code: 'INVALID_ASSERTION' });
    }

    // Update last-used timestamp
    const updated = user.biometricCredentials.map(c =>
      c.credentialId === credentialId ? { ...c, lastUsed: new Date().toISOString() } : c
    );
    updateUser(user.id, { biometricCredentials: updated, lastLogin: new Date().toISOString() });

    const accessToken  = issueToken(user, '15m');
    const refreshToken = addRefreshToken(user.id);
    user.refreshTokens.add(refreshToken);

    return res.status(200).json({
      success: true,
      data: { user: safeUser(user), accessToken, refreshToken },
    });
  } catch (err) {
    if (isDev) console.error('[auth/biometric/verify]', err);
    return res.status(500).json({ error: 'Biometric verification failed', code: 'SERVER_ERROR' });
  }
});

// ─── Export the user store so server.js can access it ─────────────────────────
export { userStore } from '../services/userStore.js';

export default router;
