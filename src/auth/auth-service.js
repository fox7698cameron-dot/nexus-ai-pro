// src/auth/auth-service.js
// Nexus AI Pro — Authentication Service
// Biometrics · 2FA · MFA · Password Policy · Enumeration-safe
// Date: 2026-08-18

import { v4 as uuidv4 } from 'uuid';

// ─── Password Policy ────────────────────────────────────────────────────────
const PASSWORD_POLICY = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
  maxLength: 128,
};

// ─── MFA Methods ────────────────────────────────────────────────────────────
export const MFA_METHODS = {
  TOTP: 'totp',           // Time-based OTP (Google Auth, Authy)
  SMS: 'sms',             // SMS OTP
  EMAIL: 'email',         // Email OTP
  HARDWARE_KEY: 'hardware_key',  // FIDO2 / WebAuthn hardware key
  BIOMETRIC: 'biometric', // Platform biometric (Touch ID, Face ID, fingerprint, retinal)
  BACKUP_CODES: 'backup_codes',  // One-time backup codes
};

// ─── Biometric Types ─────────────────────────────────────────────────────────
export const BIOMETRIC_TYPES = {
  FINGERPRINT: 'fingerprint',
  TOUCH_ID: 'touch_id',
  FACE_ID: 'face_id',
  RETINAL: 'retinal_scan',
  VOICE: 'voice_recognition',
};

// ─── User Roles ──────────────────────────────────────────────────────────────
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
};

// ─── Role Permissions ────────────────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
  superadmin: ['*'],
  admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'manage:roles',
    'view:security', 'view:analytics', 'manage:payments', 'view:projects'],
  dev: ['read:all', 'write:code', 'write:projects', 'view:analytics',
    'view:security', 'manage:own', 'deploy:staging'],
  moderator: ['read:all', 'moderate:content', 'manage:reports',
    'view:analytics:social', 'ban:users'],
  user: ['read:public', 'write:own', 'view:own:analytics', 'manage:own'],
  guest: ['read:public'],
};

// ─── Username Validation ─────────────────────────────────────────────────────
// Supports Unicode, emoji, special characters
const USERNAME_PATTERN = /^[\p{L}\p{N}\p{Emoji}\p{P}\p{S}\s_\-\.]{2,64}$/u;

// ─── Password Strength Evaluator ─────────────────────────────────────────────
export function evaluatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { score: 0, label: 'empty', errors: ['Password is required'] };
  }

  const errors = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Must be at least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Must not exceed ${PASSWORD_POLICY.maxLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }
  if (PASSWORD_POLICY.requireNumber && !/\d/.test(password)) {
    errors.push('Must contain at least one number');
  }
  if (PASSWORD_POLICY.requireSpecial) {
    const specialRegex = new RegExp(`[${escapeRegex(PASSWORD_POLICY.specialChars)}]`);
    if (!specialRegex.test(password)) {
      errors.push('Must contain at least one special character');
    }
  }

  // Entropy scoring
  let score = 0;
  if (password.length >= 13) score += 20;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9\s]/.test(password) && password.length >= 16) score += 15;

  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated chars
  if (/^[a-z]+\d+$/.test(password)) score -= 10; // letters then numbers

  const clampedScore = Math.max(0, Math.min(100, score));
  const labels = ['very-weak', 'weak', 'fair', 'strong', 'very-strong'];
  const label = labels[Math.floor(clampedScore / 25)] || 'very-strong';

  return { score: clampedScore, label, errors, valid: errors.length === 0 };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Username Validator ──────────────────────────────────────────────────────
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 2) return { valid: false, error: 'Username must be at least 2 characters' };
  if (trimmed.length > 64) return { valid: false, error: 'Username must not exceed 64 characters' };
  if (!USERNAME_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }
  return { valid: true, normalized: trimmed };
}

// ─── Token Generation ────────────────────────────────────────────────────────
export function generateSecureToken(byteLength = 32) {
  if (typeof window !== 'undefined' && window.crypto) {
    const bytes = new Uint8Array(byteLength);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Server-side (Node.js)
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

// ─── OTP Generator ───────────────────────────────────────────────────────────
export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  }
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

// ─── Backup Codes ────────────────────────────────────────────────────────────
export function generateBackupCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const bytes = new Uint8Array(5);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(bytes);
    }
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 5)}-${hex.slice(5)}`.toUpperCase();
  });
}

// ─── WebAuthn / Biometric Helpers ────────────────────────────────────────────
export const BiometricAuth = {
  isAvailable() {
    return typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined;
  },

  async checkPlatformAvailability() {
    if (!this.isAvailable()) return { available: false, reason: 'WebAuthn not supported' };
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return { available, type: available ? 'platform' : 'none' };
    } catch {
      return { available: false, reason: 'Check failed' };
    }
  },

  async register(userId, userName, challenge) {
    if (!this.isAvailable()) throw new Error('WebAuthn not available');

    const publicKeyCredentialCreationOptions = {
      challenge: new Uint8Array(challenge.match(/../g).map(h => parseInt(h, 16))),
      rp: {
        name: 'Nexus AI Pro',
        id: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none', // Privacy-preserving
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });
    return credential;
  },

  async authenticate(challenge, credentialIds = []) {
    if (!this.isAvailable()) throw new Error('WebAuthn not available');

    const publicKeyCredentialRequestOptions = {
      challenge: new Uint8Array(challenge.match(/../g).map(h => parseInt(h, 16))),
      allowCredentials: credentialIds.map(id => ({
        id: new Uint8Array(id.match(/../g).map(h => parseInt(h, 16))),
        type: 'public-key',
        transports: ['internal', 'usb', 'ble', 'nfc'],
      })),
      timeout: 60000,
      userVerification: 'required',
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });
    return assertion;
  },
};

// ─── Session Management ──────────────────────────────────────────────────────
export class SessionManager {
  constructor() {
    this.SESSION_KEY = 'nexus:session';
    this.REFRESH_KEY = 'nexus:refresh';
    this.SESSION_DURATION = 15 * 60 * 1000;     // 15 minutes
    this.REFRESH_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  setSession(token, user) {
    const session = {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        biometricsEnabled: user.biometricsEnabled,
        locale: user.locale || 'en',
        theme: user.theme || 'dark',
      },
      expiresAt: Date.now() + this.SESSION_DURATION,
      createdAt: Date.now(),
    };
    try {
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    } catch {
      // Fallback — storage might be blocked
    }
    return session;
  }

  setRefreshToken(token) {
    try {
      localStorage.setItem(this.REFRESH_KEY, JSON.stringify({
        token,
        expiresAt: Date.now() + this.REFRESH_DURATION,
      }));
    } catch {
      // Blocked
    }
  }

  getSession() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  clearSession() {
    try {
      sessionStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.REFRESH_KEY);
    } catch {
      // Blocked
    }
  }

  isAuthenticated() {
    return this.getSession() !== null;
  }

  getUser() {
    const session = this.getSession();
    return session?.user ?? null;
  }

  hasPermission(permission) {
    const user = this.getUser();
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes('*') || perms.includes(permission);
  }
}

export const sessionManager = new SessionManager();

// ─── Audit Log ──────────────────────────────────────────────────────────────
export function auditAuthEvent(eventType, details = {}) {
  const entry = {
    id: uuidv4(),
    ts: new Date().toISOString(),           // ISO-8601 label
    event: eventType,
    ...details,
  };
  // Structured minimal log — avoid sensitive data in logs
  const safeEntry = { ...entry };
  delete safeEntry.password;
  delete safeEntry.token;
  delete safeEntry.secret;

  console.info(`[AUTH:${eventType}] ${safeEntry.ts}`, safeEntry);
  return safeEntry;
}
