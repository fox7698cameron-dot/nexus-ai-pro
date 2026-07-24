// src/auth/auth-service.js
// 2026-07-24 | Nexus AI Pro - Authentication Service
// JWT + bcrypt + TOTP MFA + WebAuthn biometrics + RBAC

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── Password policy ──────────────────────────────────────────────────────────
const PASSWORD_MIN_LENGTH = 13;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{13,}$/;

// Username: Unicode letters, digits, emojis, underscores, hyphens, dots — 2–50 chars
const USERNAME_PATTERN = /^[\p{L}\p{N}\p{Emoji_Presentation}\p{Emoji}️_\-.]{2,50}$/u;

// ── Roles ────────────────────────────────────────────────────────────────────
export const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
};

const ROLE_PERMISSIONS = {
  user: ['read:own', 'write:own', 'chat', 'analytics:own'],
  moderator: ['read:own', 'write:own', 'chat', 'analytics:own', 'read:users', 'moderate:content'],
  developer: ['read:own', 'write:own', 'chat', 'analytics:own', 'api:access', 'connectors:manage'],
  admin: ['*'],
};

// ── TOTP (RFC 6238) ──────────────────────────────────────────────────────────
function base32Decode(s) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const output = [];
  for (const c of s.toUpperCase().replace(/=+$/, '')) {
    value = (value << 5) | alphabet.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function base32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function hotp(secret, counter) {
  const key = base32Decode(secret);
  const msg = Buffer.allocUnsafe(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { msg[i] = c & 0xff; c = Math.floor(c / 256); }
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[19] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24 |
                 hmac[offset + 1] << 16 |
                 hmac[offset + 2] << 8 |
                 hmac[offset + 3]) % 1_000_000;
  return code.toString().padStart(6, '0');
}

function totp(secret, windowSeconds = 30) {
  return hotp(secret, Math.floor(Date.now() / 1000 / windowSeconds));
}

function verifyTotp(secret, token, window = 1) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i) === token.toString()) return true;
  }
  return false;
}

// ── Auth Service ─────────────────────────────────────────────────────────────
export class AuthService {
  constructor(dataService, securityModule) {
    this.data = dataService;
    this.security = securityModule;
    this.refreshTokens = new Map();   // refreshToken → userId
    this.webAuthnChallenges = new Map(); // userId → challenge
    this.activeSessions = new Map();  // userId → Set<sessionId>
  }

  // Password validation
  validatePassword(password) {
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      return { valid: false, reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
    }
    if (!PASSWORD_PATTERN.test(password)) {
      return { valid: false, reason: 'Password must include uppercase, lowercase, number, and special character.' };
    }
    return { valid: true };
  }

  // Username validation (Unicode-safe, emoji-safe)
  validateUsername(username) {
    if (typeof username !== 'string') return { valid: false, reason: 'Username must be a string.' };
    const cleaned = username.trim();
    if (cleaned.length < 2 || cleaned.length > 50) {
      return { valid: false, reason: 'Username must be 2–50 characters.' };
    }
    if (!USERNAME_PATTERN.test(cleaned)) {
      return { valid: false, reason: 'Username contains invalid characters.' };
    }
    return { valid: true, cleaned };
  }

  // Compute password strength score (0–100)
  passwordStrength(password) {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 13) score += 20;
    if (password.length >= 20) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    if (/[\p{Emoji}]/u.test(password)) score += 10;
    return Math.min(score, 100);
  }

  // Register
  async register({ username, email, password, role = ROLES.USER }) {
    const usernameCheck = this.validateUsername(username);
    if (!usernameCheck.valid) return { success: false, error: usernameCheck.reason };

    const pwCheck = this.validatePassword(password);
    if (!pwCheck.valid) return { success: false, error: pwCheck.reason };

    const emailNorm = email?.toLowerCase().trim();
    if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return { success: false, error: 'Invalid email address.' };
    }

    // Check uniqueness
    const existing = this.data.findUserByEmail(emailNorm);
    if (existing) return { success: false, error: 'Email already registered.' };

    const existingUser = this.data.findUserByUsername(usernameCheck.cleaned);
    if (existingUser) return { success: false, error: 'Username already taken.' };

    const userId = uuidv4();
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = {
      id: userId,
      username: usernameCheck.cleaned,
      email: emailNorm,
      passwordHash,
      role: Object.values(ROLES).includes(role) ? role : ROLES.USER,
      mfaEnabled: false,
      mfaSecret: null,
      webAuthnCredentials: [],
      createdAt: Date.now(),
      lastLogin: null,
      active: true,
      emailVerified: false,
      preferences: { language: 'en', theme: 'dark', timezone: 'UTC' },
    };

    this.data.storeUser(userId, user);
    this.security.logAudit('USER_REGISTER', { userId, username: user.username, role: user.role });

    const tokens = this._issueTokens(user);
    return { success: true, user: this._publicUser(user), ...tokens };
  }

  // Login
  async login({ email, password, totpToken }) {
    const emailNorm = email?.toLowerCase().trim();
    const user = this.data.findUserByEmail(emailNorm);
    if (!user || !user.active) {
      return { success: false, error: 'Invalid credentials.' };
    }

    const pwMatch = await bcrypt.compare(password, user.passwordHash);
    if (!pwMatch) {
      this.security.logAudit('LOGIN_FAILED', { email: emailNorm, reason: 'bad_password' });
      return { success: false, error: 'Invalid credentials.' };
    }

    if (user.mfaEnabled) {
      if (!totpToken) return { success: false, error: 'MFA token required.', mfaRequired: true };
      if (!verifyTotp(user.mfaSecret, totpToken)) {
        this.security.logAudit('LOGIN_FAILED', { userId: user.id, reason: 'bad_totp' });
        return { success: false, error: 'Invalid MFA token.' };
      }
    }

    user.lastLogin = Date.now();
    this.data.storeUser(user.id, user);

    this.security.logAudit('LOGIN_SUCCESS', { userId: user.id, role: user.role });
    const tokens = this._issueTokens(user);
    return { success: true, user: this._publicUser(user), ...tokens };
  }

  // Refresh access token
  refreshAccess(refreshToken) {
    const userId = this.refreshTokens.get(refreshToken);
    if (!userId) return { success: false, error: 'Invalid or expired refresh token.' };

    const user = this.data.getUser(userId);
    if (!user || !user.active) return { success: false, error: 'User not found.' };

    const accessToken = this._signAccess(user);
    this.security.logAudit('TOKEN_REFRESH', { userId });
    return { success: true, accessToken };
  }

  // Logout
  logout(refreshToken) {
    const userId = this.refreshTokens.get(refreshToken);
    if (userId) {
      this.refreshTokens.delete(refreshToken);
      this.security.logAudit('LOGOUT', { userId });
    }
    return { success: true };
  }

  // MFA: Generate TOTP secret + provisioning URI
  setupMfa(userId) {
    const user = this.data.getUser(userId);
    if (!user) return { success: false, error: 'User not found.' };

    const secret = base32Encode(crypto.randomBytes(20));
    const issuer = 'NexusAIPro';
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // Store pending secret (not enabled yet)
    user.mfaSecretPending = secret;
    this.data.storeUser(userId, user);

    return { success: true, secret, uri };
  }

  // MFA: Confirm TOTP token to enable MFA
  confirmMfa(userId, token) {
    const user = this.data.getUser(userId);
    if (!user || !user.mfaSecretPending) return { success: false, error: 'No pending MFA setup.' };

    if (!verifyTotp(user.mfaSecretPending, token)) {
      return { success: false, error: 'Invalid TOTP token.' };
    }

    user.mfaSecret = user.mfaSecretPending;
    user.mfaSecretPending = null;
    user.mfaEnabled = true;
    this.data.storeUser(userId, user);
    this.security.logAudit('MFA_ENABLED', { userId });
    return { success: true };
  }

  // MFA: Disable
  disableMfa(userId, token) {
    const user = this.data.getUser(userId);
    if (!user || !user.mfaEnabled) return { success: false, error: 'MFA not enabled.' };
    if (!verifyTotp(user.mfaSecret, token)) return { success: false, error: 'Invalid token.' };

    user.mfaEnabled = false;
    user.mfaSecret = null;
    this.data.storeUser(userId, user);
    this.security.logAudit('MFA_DISABLED', { userId });
    return { success: true };
  }

  // WebAuthn: Generate registration challenge
  generateWebAuthnChallenge(userId) {
    const challenge = crypto.randomBytes(32).toString('base64url');
    this.webAuthnChallenges.set(userId, { challenge, expiresAt: Date.now() + 120_000 });
    return challenge;
  }

  // WebAuthn: Verify registration (stores credential)
  registerWebAuthnCredential(userId, credential) {
    const pending = this.webAuthnChallenges.get(userId);
    if (!pending || Date.now() > pending.expiresAt) {
      return { success: false, error: 'Challenge expired.' };
    }
    this.webAuthnChallenges.delete(userId);

    const user = this.data.getUser(userId);
    if (!user) return { success: false, error: 'User not found.' };

    user.webAuthnCredentials = user.webAuthnCredentials || [];
    user.webAuthnCredentials.push({
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter || 0,
      deviceType: credential.deviceType || 'unknown',
      addedAt: Date.now(),
    });

    this.data.storeUser(userId, user);
    this.security.logAudit('WEBAUTHN_CREDENTIAL_ADDED', { userId, deviceType: credential.deviceType });
    return { success: true };
  }

  // Verify JWT (middleware helper)
  verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not configured');
      return jwt.verify(token, secret);
    } catch {
      return null;
    }
  }

  // RBAC: check permission
  hasPermission(user, permission) {
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes('*') || perms.includes(permission);
  }

  // ── Private ────────────────────────────────────────────────────────────────
  _signAccess(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    return jwt.sign(
      { sub: user.id, username: user.username, role: user.role, email: user.email },
      secret,
      { expiresIn: '15m', issuer: 'nexus-ai-pro', audience: 'nexus-ai-pro-client' }
    );
  }

  _issueTokens(user) {
    const accessToken = this._signAccess(user);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    this.refreshTokens.set(refreshToken, user.id);
    // Expire refresh tokens after 7 days
    setTimeout(() => this.refreshTokens.delete(refreshToken), 7 * 24 * 3600 * 1000);
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  _publicUser(user) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      preferences: user.preferences,
      webAuthnEnabled: (user.webAuthnCredentials?.length ?? 0) > 0,
    };
  }
}

export default AuthService;
