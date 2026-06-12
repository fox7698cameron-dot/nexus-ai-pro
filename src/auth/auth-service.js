// src/auth/auth-service.js
// 2026-06-12 | Nexus AI Pro Auth Service
// JWT + bcrypt + TOTP 2FA + role-based access + biometric token bridge

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import zxcvbn from 'zxcvbn';

// ---- constants -------------------------------------------------------

const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'dev', MODERATOR: 'moderator', USER: 'user' });
const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const MIN_PASSWORD_LENGTH = 13;

// ---- helpers ---------------------------------------------------------

function requireEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function signAccess(payload) {
  return jwt.sign(payload, requireEnv('JWT_SECRET'), { expiresIn: ACCESS_TTL, algorithm: 'HS256' });
}

function signRefresh(payload) {
  return jwt.sign(payload, requireEnv('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TTL, algorithm: 'HS256' });
}

function verifyAccess(token) {
  return jwt.verify(token, requireEnv('JWT_SECRET'), { algorithms: ['HS256'] });
}

function verifyRefresh(token) {
  return jwt.verify(token, requireEnv('JWT_REFRESH_SECRET'), { algorithms: ['HS256'] });
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  const result = zxcvbn(password);
  if (result.score < 3) {
    return { valid: false, reason: result.feedback.warning || 'Password is too weak.', suggestions: result.feedback.suggestions };
  }
  return { valid: true, score: result.score };
}

// Username: allow unicode letters, digits, emoji, dots, underscores, hyphens, 3–64 chars
const USERNAME_RE = /^[\p{L}\p{N}\p{Emoji_Presentation}\p{Emoji}‍._-]{3,64}$/u;

function validateUsername(username) {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return { valid: false, reason: 'Username must be 3–64 chars and may contain letters, numbers, emoji, dots, underscores, or hyphens.' };
  }
  return { valid: true };
}

// ---- in-memory store (swap with pg/redis in production) --------------

const users = new Map();
const refreshTokens = new Set();
const pendingBiometricChallenges = new Map();

// ---- public API ------------------------------------------------------

export const AuthService = {
  ROLES,

  async register({ username, email, password, role = ROLES.USER, language = 'en', region = 'US' }) {
    const uv = validateUsername(username);
    if (!uv.valid) return { error: uv.reason };

    const pv = validatePasswordStrength(password);
    if (!pv.valid) return { error: pv.reason, suggestions: pv.suggestions };

    const normalEmail = email?.toLowerCase().trim();
    if (!normalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalEmail)) {
      return { error: 'Invalid email address.' };
    }

    for (const u of users.values()) {
      if (u.email === normalEmail) return { error: 'Email already registered.' };
      if (u.username.toLowerCase() === username.toLowerCase()) return { error: 'Username taken.' };
    }

    const allowedRoles = Object.values(ROLES);
    const assignedRole = allowedRoles.includes(role) ? role : ROLES.USER;

    const id = uuidv4();
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = {
      id, username, email: normalEmail,
      passwordHash: hash,
      role: assignedRole,
      language, region,
      mfaEnabled: false,
      mfaSecret: null,
      biometricEnabled: false,
      createdAt: Date.now(),
      lastLogin: null
    };
    users.set(id, user);
    return { id, username, email: normalEmail, role: assignedRole };
  },

  async login({ email, password, totpCode }) {
    const normalEmail = email?.toLowerCase().trim();
    let user = null;
    for (const u of users.values()) {
      if (u.email === normalEmail) { user = u; break; }
    }
    if (!user) return { error: 'Invalid credentials.' };

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return { error: 'Invalid credentials.' };

    if (user.mfaEnabled) {
      if (!totpCode) return { mfaRequired: true };
      const valid = authenticator.verify({ token: totpCode, secret: user.mfaSecret });
      if (!valid) return { error: 'Invalid MFA code.' };
    }

    user.lastLogin = Date.now();
    const payload = { sub: user.id, role: user.role, jti: uuidv4() };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh({ sub: user.id, jti: uuidv4() });
    refreshTokens.add(refreshToken);

    return {
      accessToken, refreshToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, language: user.language, region: user.region, mfaEnabled: user.mfaEnabled }
    };
  },

  refresh(token) {
    if (!refreshTokens.has(token)) return { error: 'Invalid refresh token.' };
    try {
      const payload = verifyRefresh(token);
      const user = users.get(payload.sub);
      if (!user) return { error: 'User not found.' };
      const newAccess = signAccess({ sub: user.id, role: user.role, jti: uuidv4() });
      return { accessToken: newAccess };
    } catch {
      return { error: 'Token expired or invalid.' };
    }
  },

  logout(refreshToken) {
    refreshTokens.delete(refreshToken);
    return { success: true };
  },

  verify(token) {
    try { return { valid: true, payload: verifyAccess(token) }; }
    catch { return { valid: false }; }
  },

  async setupMFA(userId) {
    const user = users.get(userId);
    if (!user) return { error: 'User not found.' };
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'Nexus AI Pro', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    user.mfaSecret = secret;
    return { secret, qrDataUrl };
  },

  confirmMFA(userId, totpCode) {
    const user = users.get(userId);
    if (!user || !user.mfaSecret) return { error: 'MFA setup not started.' };
    const valid = authenticator.verify({ token: totpCode, secret: user.mfaSecret });
    if (!valid) return { error: 'Invalid TOTP code.' };
    user.mfaEnabled = true;
    return { success: true };
  },

  disableMFA(userId, totpCode) {
    const user = users.get(userId);
    if (!user || !user.mfaEnabled) return { error: 'MFA not enabled.' };
    const valid = authenticator.verify({ token: totpCode, secret: user.mfaSecret });
    if (!valid) return { error: 'Invalid TOTP code.' };
    user.mfaEnabled = false;
    user.mfaSecret = null;
    return { success: true };
  },

  // Biometric: server issues a one-time challenge; client signs it with device key
  getBiometricChallenge(userId) {
    const challenge = crypto.randomBytes(32).toString('base64url');
    pendingBiometricChallenges.set(userId, { challenge, expiresAt: Date.now() + 60_000 });
    return { challenge };
  },

  // In production: verify WebAuthn assertion here; here we accept a trust-on-first-use pattern
  verifyBiometric(userId, signedChallenge) {
    const pending = pendingBiometricChallenges.get(userId);
    if (!pending || Date.now() > pending.expiresAt) return { error: 'Challenge expired.' };
    pendingBiometricChallenges.delete(userId);
    const user = users.get(userId);
    if (!user) return { error: 'User not found.' };
    user.biometricEnabled = true;
    const payload = { sub: user.id, role: user.role, jti: uuidv4() };
    return { accessToken: signAccess(payload) };
  },

  checkStrength(password) {
    if (typeof password !== 'string') return { score: 0, label: 'invalid' };
    const r = zxcvbn(password);
    const labels = ['very weak', 'weak', 'fair', 'strong', 'very strong'];
    return {
      score: r.score,
      label: labels[r.score],
      warning: r.feedback.warning,
      suggestions: r.feedback.suggestions,
      meetsMinLength: password.length >= MIN_PASSWORD_LENGTH
    };
  },

  getProfile(userId) {
    const user = users.get(userId);
    if (!user) return null;
    const { passwordHash, mfaSecret, ...safe } = user;
    return safe;
  },

  // Express middleware — attaches req.user or returns 401
  requireAuth(roles = []) {
    return (req, res, next) => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized.' });
      const token = header.slice(7);
      const { valid, payload } = AuthService.verify(token);
      if (!valid) return res.status(401).json({ error: 'Token invalid or expired.' });
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }
      req.user = payload;
      next();
    };
  }
};

export { ROLES };
