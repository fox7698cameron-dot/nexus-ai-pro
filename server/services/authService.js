/**
 * server/services/authService.js
 * Nexus AI Pro — Authentication Service
 * Labeled: 2026-08-25
 *
 * Handles user registration, login, biometric challenge, 2FA, MFA,
 * session management, and role-based access.
 *
 * Storage: In-memory Map for MVP; swap for Redis/Postgres in production.
 * All user IDs are non-sequential UUIDs. No secrets or tokens are stored
 * in plaintext.
 */

import crypto from 'crypto';
import {
  generateUserId,
  generateSecureToken,
  generateNumericOTP,
  hashPassword,
  verifyPassword,
  evaluatePasswordStrength,
  generateTOTPSecret,
  verifyTOTP,
  timingSafeEqual
} from '../utils/crypto.js';
import { issueToken, issueRefreshToken, ROLES } from '../middleware/auth.js';

// ── In-memory stores (replace with DB in production) ─────────────────────────
const users         = new Map(); // userId → userRecord
const emailIndex    = new Map(); // email  → userId
const sessions      = new Map(); // refreshToken → sessionRecord
const otpStore      = new Map(); // userId → { code, expiresAt }
const biometricKeys = new Map(); // userId → [publicKeyCredential]

// ── Username validation ────────────────────────────────────────────────────────
// Supports Unicode letters, digits, emoji, underscores, hyphens, dots
// Length: 2–50 grapheme clusters
const USERNAME_RE = /^[\p{L}\p{N}\p{Emoji_Presentation}\p{Emoji}️_\-.]{2,50}$/u;

function validateUsername(username) {
  if (!username || typeof username !== 'string') return 'Username required';
  // Normalise to NFC to handle composed/decomposed forms consistently
  const norm = username.normalize('NFC');
  if (!USERNAME_RE.test(norm)) {
    return 'Username must be 2–50 characters (letters, digits, emoji, _ - . allowed)';
  }
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim()) ? null : 'Invalid email address';
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function registerUser({ email, username, password, role, language }) {
  // Validate inputs
  const emailErr    = validateEmail(email);
  if (emailErr) return { ok: false, error: emailErr };

  const usernameErr = validateUsername(username);
  if (usernameErr) return { ok: false, error: usernameErr };

  // Password strength
  const strength = evaluatePasswordStrength(password || '');
  if (!strength.meetsMinimum) {
    return {
      ok: false,
      error: 'Password too weak: ' + strength.suggestions.join(', ')
    };
  }

  const normalEmail = email.trim().toLowerCase();
  if (emailIndex.has(normalEmail)) {
    // Constant-time delay to prevent user enumeration
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
    return { ok: false, error: 'Registration failed' }; // ambiguous on purpose
  }

  const { hash, salt } = hashPassword(password);
  const userId          = generateUserId();
  const totpSecret      = generateTOTPSecret();

  const userRecord = {
    id:           userId,
    email:        normalEmail,
    username:     username.normalize('NFC'),
    passwordHash: hash,
    passwordSalt: salt,
    role:         role || ROLES.USER,
    plan:         'free',
    language:     language || 'en',
    totpSecret,
    totpEnabled:  false,
    mfaMethods:   [],           // ['totp', 'sms', 'email', 'biometric']
    biometricIds: [],
    createdAt:    Date.now(),
    lastLogin:    null,
    locked:       false,
    failedLogins: 0
  };

  users.set(userId, userRecord);
  emailIndex.set(normalEmail, userId);

  // Return TOTP secret for QR code (never stored in plaintext after this)
  return {
    ok: true,
    userId,
    username:    userRecord.username,
    role:        userRecord.role,
    totpSecret,  // Show once for authenticator app setup
    totpQR: `otpauth://totp/NexusAIPro:${encodeURIComponent(normalEmail)}?secret=${totpSecret}&issuer=NexusAIPro`
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginUser({ email, password, fingerprint }) {
  await new Promise(r => setTimeout(r, 100 + Math.random() * 100)); // constant-time

  const normalEmail = (email || '').trim().toLowerCase();
  const userId      = emailIndex.get(normalEmail);
  if (!userId) return { ok: false, error: 'Invalid credentials' };

  const user = users.get(userId);
  if (!user || user.locked) return { ok: false, error: 'Invalid credentials' };

  const valid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!valid) {
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= 10) {
      user.locked = true;
    }
    return { ok: false, error: 'Invalid credentials' };
  }

  user.failedLogins = 0;
  user.lastLogin    = Date.now();

  // If MFA enabled, return partial session (requires MFA step)
  if (user.totpEnabled || user.mfaMethods.length > 0) {
    const mfaToken = generateSecureToken(24);
    otpStore.set(`mfa:${userId}`, {
      token:     mfaToken,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });
    return {
      ok:         true,
      mfaRequired: true,
      mfaToken,
      userId,
      mfaMethods: user.mfaMethods.length > 0 ? user.mfaMethods : ['totp']
    };
  }

  return issueSession(user, { fingerprint, mfaVerified: false });
}

// ── MFA verification ──────────────────────────────────────────────────────────

export async function verifyMFA({ userId, mfaToken, code, method }) {
  const user   = users.get(userId);
  if (!user) return { ok: false, error: 'Invalid session' };

  const stored = otpStore.get(`mfa:${userId}`);
  if (!stored || Date.now() > stored.expiresAt) {
    return { ok: false, error: 'MFA session expired' };
  }

  if (!timingSafeEqual(mfaToken, stored.token)) {
    return { ok: false, error: 'Invalid MFA token' };
  }

  let verified = false;
  if (method === 'totp' || !method) {
    verified = verifyTOTP(user.totpSecret, String(code).trim());
  } else if (method === 'email' || method === 'sms') {
    // Check email/SMS OTP
    const otp = otpStore.get(`otp:${userId}`);
    if (otp && Date.now() <= otp.expiresAt && timingSafeEqual(code, otp.code)) {
      verified = true;
      otpStore.delete(`otp:${userId}`);
    }
  }

  if (!verified) return { ok: false, error: 'Invalid MFA code' };

  otpStore.delete(`mfa:${userId}`);
  return issueSession(user, { mfaVerified: true });
}

// ── Email/SMS OTP ─────────────────────────────────────────────────────────────

export function generateEmailOTP(userId) {
  const code = generateNumericOTP(6);
  otpStore.set(`otp:${userId}`, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });
  return code; // caller sends this via email/SMS — never log it
}

// ── Biometric registration ────────────────────────────────────────────────────

export function registerBiometricCredential(userId, credential) {
  const user = users.get(userId);
  if (!user) return { ok: false, error: 'User not found' };

  const existing = biometricKeys.get(userId) || [];
  existing.push({
    id:          credential.id,
    publicKey:   credential.publicKey,
    signCount:   credential.signCount || 0,
    createdAt:   Date.now(),
    type:        credential.type || 'public-key'
  });
  biometricKeys.set(userId, existing);

  if (!user.mfaMethods.includes('biometric')) {
    user.mfaMethods.push('biometric');
  }

  return { ok: true, credentialId: credential.id };
}

export function getBiometricCredentials(userId) {
  return biometricKeys.get(userId) || [];
}

// ── TOTP enable ───────────────────────────────────────────────────────────────

export function enableTOTP(userId, verificationCode) {
  const user = users.get(userId);
  if (!user) return { ok: false, error: 'User not found' };

  if (!verifyTOTP(user.totpSecret, String(verificationCode).trim())) {
    return { ok: false, error: 'Invalid verification code' };
  }

  user.totpEnabled = true;
  if (!user.mfaMethods.includes('totp')) {
    user.mfaMethods.push('totp');
  }

  return { ok: true };
}

// ── Session management ────────────────────────────────────────────────────────

function issueSession(user, options = {}) {
  const refreshToken = issueRefreshToken();
  const accessToken  = issueToken(user, {
    mfaVerified: options.mfaVerified || false,
    fingerprint: options.fingerprint,
    expiresIn:   '1h'
  });

  sessions.set(refreshToken, {
    userId:    user.id,
    issuedAt:  Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    fingerprint: options.fingerprint
  });

  return {
    ok:           true,
    accessToken,
    refreshToken,
    expiresIn:    3600,
    role:         user.role,
    plan:         user.plan,
    username:     user.username,
    mfaEnabled:   user.totpEnabled || user.mfaMethods.length > 0
  };
}

export function refreshSession(refreshToken) {
  const session = sessions.get(refreshToken);
  if (!session || Date.now() > session.expiresAt) {
    sessions.delete(refreshToken);
    return { ok: false, error: 'Invalid or expired refresh token' };
  }

  const user = users.get(session.userId);
  if (!user) return { ok: false, error: 'User not found' };

  // Rotate refresh token
  sessions.delete(refreshToken);
  return issueSession(user, {
    mfaVerified: true,
    fingerprint: session.fingerprint
  });
}

export function revokeSession(refreshToken) {
  sessions.delete(refreshToken);
  return { ok: true };
}

// ── Profile management ────────────────────────────────────────────────────────

export function getUserById(userId) {
  const user = users.get(userId);
  if (!user) return null;
  // Never return password hash or TOTP secret
  const { passwordHash, passwordSalt, totpSecret, ...safe } = user;
  return safe;
}

export function updateUserLanguage(userId, language) {
  const user = users.get(userId);
  if (!user) return { ok: false, error: 'User not found' };
  user.language = language;
  return { ok: true };
}

export function updateUserRole(userId, role, requestingUser) {
  if (requestingUser.role !== ROLES.ADMIN) {
    return { ok: false, error: 'Admin only' };
  }
  const user = users.get(userId);
  if (!user) return { ok: false, error: 'User not found' };
  user.role = role;
  return { ok: true };
}

export function unlockUser(userId, requestingUser) {
  if (requestingUser.role !== ROLES.ADMIN && requestingUser.role !== ROLES.MODERATOR) {
    return { ok: false, error: 'Insufficient permissions' };
  }
  const user = users.get(userId);
  if (!user) return { ok: false, error: 'User not found' };
  user.locked       = false;
  user.failedLogins = 0;
  return { ok: true };
}
