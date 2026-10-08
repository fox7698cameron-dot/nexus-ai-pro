// auth-service.js | 2026-10-08

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ── Enums ──────────────────────────────────────────────────────────────────

export const UserRole = Object.freeze({
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  DEV: 'DEV',
});

export const MfaMethod = Object.freeze({
  TOTP: 'TOTP',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  BIOMETRIC: 'BIOMETRIC',
});

// ── Constants ──────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 13;
const SPECIAL_CHAR_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds

// ── TOTP (RFC 6238) ────────────────────────────────────────────────────────

/**
 * Generate a random TOTP base32 secret.
 * @returns {string}
 */
function generateTotpSecret() {
  const bytes = crypto.randomBytes(20);
  const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) result += BASE32[(value << (5 - bits)) & 0x1f];
  return result;
}

/**
 * Decode a base32 string to a Buffer.
 * @param {string} base32
 * @returns {Buffer}
 */
function base32Decode(base32) {
  const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const str = base32.toUpperCase().replace(/=+$/, '');
  const bytes = [];
  let bits = 0;
  let value = 0;
  for (const char of str) {
    const idx = CHARSET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

/**
 * Compute HOTP value per RFC 4226.
 * @param {Buffer} key
 * @param {number} counter
 * @returns {string} zero-padded OTP string
 */
function hotp(key, counter) {
  const counterBuf = Buffer.alloc(8);
  const hi = Math.floor(counter / 0x100000000);
  const lo = counter >>> 0;
  counterBuf.writeUInt32BE(hi, 0);
  counterBuf.writeUInt32BE(lo, 4);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

/**
 * Generate the current TOTP code for a base32 secret.
 * @param {string} secret - base32-encoded TOTP secret
 * @returns {string}
 */
function generateTotp(secret) {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  return hotp(key, counter);
}

/**
 * Verify a TOTP code with ±1 window tolerance.
 * @param {string} secret
 * @param {string} code
 * @returns {boolean}
 */
function verifyTotp(secret, code) {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  for (let delta = -1; delta <= 1; delta++) {
    if (hotp(key, counter + delta) === code) return true;
  }
  return false;
}

// ── Password helpers ───────────────────────────────────────────────────────

/**
 * Calculate password strength score 0-4.
 * @param {string} password
 * @returns {{ score: number, feedback: string[] }}
 */
function checkPasswordStrength(password) {
  const feedback = [];
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  else feedback.push(`At least ${MIN_PASSWORD_LENGTH} characters required`);
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');
  if (/[0-9]/.test(password)) score++;
  else feedback.push('Add numbers');
  if (SPECIAL_CHAR_RE.test(password)) score++;
  else feedback.push('Add special characters');
  return { score, feedback };
}

/**
 * Validate password meets minimum requirements.
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (!SPECIAL_CHAR_RE.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

/**
 * Validate username: 3-30 chars, Unicode/emoji allowed.
 * @param {string} username
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUsername(username) {
  if (!username) return { valid: false, error: 'Username is required' };
  // Count codepoints to support emoji/Unicode
  const len = [...username].length;
  if (len < 3) return { valid: false, error: 'Username must be at least 3 characters' };
  if (len > 30) return { valid: false, error: 'Username must be 30 characters or fewer' };
  return { valid: true };
}

// ── JWT helpers ────────────────────────────────────────────────────────────

function signToken(payload, expiresIn) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return jwt.sign(payload, secret, { expiresIn: expiresIn || process.env.JWT_EXPIRY || '24h' });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return jwt.verify(token, secret);
}

// ── AuthService class ──────────────────────────────────────────────────────

class AuthService {
  constructor() {
    // In-memory store for demo; replace with DB in production
    this._users = new Map();
  }

  /**
   * Register a new user.
   * @param {{ username: string, email: string, password: string, role?: string }} params
   * @returns {Promise<{ userId: string, role: string }>}
   */
  async register({ username, email, password, role = UserRole.USER }) {
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) throw new Error(usernameCheck.error);

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) throw new Error(pwCheck.error);

    const assignedRole = Object.values(UserRole).includes(role) ? role : UserRole.USER;
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = crypto.randomUUID();

    this._users.set(email.toLowerCase(), {
      userId,
      username,
      email: email.toLowerCase(),
      passwordHash: hash,
      role: assignedRole,
      mfaEnabled: false,
      mfaMethod: null,
      totpSecret: null,
      createdAt: new Date().toISOString(),
    });

    return { userId, role: assignedRole };
  }

  /**
   * Login with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ token: string, requiresMfa: boolean, mfaMethod?: string }>}
   */
  async login(email, password) {
    const user = this._users.get(email.toLowerCase());
    if (!user) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new Error('Invalid credentials');

    if (user.mfaEnabled) {
      const tempToken = signToken({ userId: user.userId, phase: 'mfa' }, '5m');
      return { token: tempToken, requiresMfa: true, mfaMethod: user.mfaMethod };
    }

    const token = signToken({ userId: user.userId, role: user.role });
    return { token, requiresMfa: false };
  }

  /**
   * Complete MFA verification and issue full session token.
   * @param {string} tempToken
   * @param {string} code
   * @param {string} method
   * @returns {Promise<{ token: string }>}
   */
  async verifyMfa(tempToken, code, method) {
    const payload = verifyToken(tempToken);
    if (payload.phase !== 'mfa') throw new Error('Invalid MFA token');

    const user = [...this._users.values()].find(u => u.userId === payload.userId);
    if (!user) throw new Error('User not found');

    if (method === MfaMethod.TOTP) {
      if (!verifyTotp(user.totpSecret, code)) throw new Error('Invalid TOTP code');
    }
    // SMS, EMAIL, BIOMETRIC stubs - validate OTP via external service in production

    const token = signToken({ userId: user.userId, role: user.role });
    return { token };
  }

  /**
   * Setup TOTP 2FA for a user. Returns the secret and provisioning URI.
   * @param {string} userId
   * @returns {{ secret: string, uri: string }}
   */
  setupTotp(userId) {
    const user = [...this._users.values()].find(u => u.userId === userId);
    if (!user) throw new Error('User not found');

    const secret = generateTotpSecret();
    user.totpSecret = secret;
    const issuer = encodeURIComponent(process.env.MFA_ISSUER || 'NexusAIPro');
    const account = encodeURIComponent(user.email);
    const uri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
    return { secret, uri };
  }

  /**
   * Enable MFA for a user after successful TOTP verification.
   * @param {string} userId
   * @param {string} code
   * @param {string} method
   */
  enableMfa(userId, code, method = MfaMethod.TOTP) {
    const user = [...this._users.values()].find(u => u.userId === userId);
    if (!user) throw new Error('User not found');

    if (method === MfaMethod.TOTP) {
      if (!verifyTotp(user.totpSecret, code)) throw new Error('Invalid TOTP code');
    }
    user.mfaEnabled = true;
    user.mfaMethod = method;
  }

  /**
   * Attempt biometric authentication via platform bridge.
   * Calls navigator.credentials (WebAuthn) in browser environments.
   * @returns {Promise<boolean>}
   */
  async authenticateBiometric() {
    if (typeof navigator !== 'undefined' && navigator.credentials) {
      try {
        const credential = await navigator.credentials.get({ publicKey: undefined });
        return Boolean(credential);
      } catch {
        return false;
      }
    }
    // Capacitor/Electron bridge stub
    return false;
  }

  /**
   * Verify a JWT token and return the decoded payload.
   * @param {string} token
   * @returns {Object}
   */
  verifyToken(token) {
    return verifyToken(token);
  }

  /**
   * Check password strength without registering.
   * @param {string} password
   * @returns {{ score: number, feedback: string[] }}
   */
  checkPasswordStrength(password) {
    return checkPasswordStrength(password);
  }
}

export default new AuthService();
export { AuthService, validatePassword, validateUsername, checkPasswordStrength, generateTotp, verifyTotp };
