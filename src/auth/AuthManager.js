/**
 * AuthManager.js
 * Created: 2026-10-24
 * Full-stack authentication manager: roles, MFA, biometrics, password validation
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// User roles in ascending privilege order
export const ROLES = Object.freeze({
  USER: 'user',
  MODERATOR: 'moderator',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
});

const ROLE_HIERARCHY = {
  [ROLES.USER]: 0,
  [ROLES.MODERATOR]: 1,
  [ROLES.DEVELOPER]: 2,
  [ROLES.ADMIN]: 3,
};

// Password policy: 13+ chars, upper, lower, digit, special, unicode-safe
export const PASSWORD_POLICY = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`',
};

export function validatePassword(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string.' };
  if (password.length < PASSWORD_POLICY.minLength)
    return { valid: false, reason: `Password must be at least ${PASSWORD_POLICY.minLength} characters.` };
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/u.test(password))
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/u.test(password))
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  if (PASSWORD_POLICY.requireDigit && !/\d/u.test(password))
    return { valid: false, reason: 'Password must contain at least one digit.' };
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()\-_=+[\]{}|;:',.<>?/~`\\]/u.test(password))
    return { valid: false, reason: 'Password must contain at least one special character.' };
  return { valid: true };
}

// Username: allow letters, digits, emoji, special unicode — block NUL and injection chars
export function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, reason: 'Username must be a string.' };
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 64)
    return { valid: false, reason: 'Username must be 2–64 characters.' };
  // Block null bytes and angle brackets to prevent injection
  if (/[\u0000<>]/.test(trimmed))
    return { valid: false, reason: 'Username contains disallowed characters.' };
  return { valid: true };
}

export class AuthManager {
  constructor(securityModule) {
    this.security = securityModule;
    // In-memory user store — replace with DB in production
    this.users = new Map();
    this.sessions = new Map();
    this.mfaSecrets = new Map();
    this.refreshTokens = new Map();
  }

  // -------- Registration --------
  async register({ username, email, password, role = ROLES.USER }) {
    const uv = validateUsername(username);
    if (!uv.valid) return { ok: false, error: uv.reason };

    const pv = validatePassword(password);
    if (!pv.valid) return { ok: false, error: pv.reason };

    const emailLower = (email || '').toLowerCase().trim();
    if (!emailLower.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      return { ok: false, error: 'Invalid email address.' };

    // Check for duplicate email
    for (const u of this.users.values()) {
      if (u.email === emailLower) return { ok: false, error: 'Email already registered.' };
    }

    const userId = uuidv4();
    const salt = crypto.randomBytes(64).toString('hex');
    const passwordHash = this._hashPassword(password, salt);

    const user = {
      id: userId,
      username: username.trim(),
      email: emailLower,
      passwordHash,
      salt,
      role: Object.values(ROLES).includes(role) ? role : ROLES.USER,
      mfaEnabled: false,
      biometricEnabled: false,
      createdAt: Date.now(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
    };

    this.users.set(userId, user);
    this.security?.logAudit('USER_REGISTERED', { userId, email: emailLower, role: user.role });

    return { ok: true, userId, role: user.role };
  }

  // -------- Login --------
  async login({ email, password, mfaToken, biometricToken }) {
    const emailLower = (email || '').toLowerCase().trim();
    let user = null;
    for (const u of this.users.values()) {
      if (u.email === emailLower) { user = u; break; }
    }

    if (!user) return { ok: false, error: 'Invalid credentials.' };

    // Lockout check
    if (user.lockedUntil && Date.now() < user.lockedUntil)
      return { ok: false, error: 'Account temporarily locked. Try again later.' };

    // Password verification
    const hash = this._hashPassword(password, user.salt);
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash))) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
        this.security?.logAudit('ACCOUNT_LOCKED', { userId: user.id });
      }
      return { ok: false, error: 'Invalid credentials.' };
    }

    // MFA check
    if (user.mfaEnabled) {
      if (!mfaToken) return { ok: false, mfaRequired: true };
      const mfaValid = this._verifyTOTP(user.id, mfaToken);
      if (!mfaValid) return { ok: false, error: 'Invalid MFA token.' };
    }

    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = Date.now();

    const { accessToken, refreshToken } = this._issueTokens(user);
    this.security?.logAudit('USER_LOGIN', { userId: user.id, role: user.role });

    return {
      ok: true,
      accessToken,
      refreshToken,
      user: this._publicUser(user),
    };
  }

  // -------- Token refresh --------
  refreshSession(refreshToken) {
    const data = this.refreshTokens.get(refreshToken);
    if (!data || Date.now() > data.expiresAt) {
      this.refreshTokens.delete(refreshToken);
      return { ok: false, error: 'Refresh token expired or invalid.' };
    }
    const user = this.users.get(data.userId);
    if (!user) return { ok: false, error: 'User not found.' };

    this.refreshTokens.delete(refreshToken);
    const tokens = this._issueTokens(user);
    return { ok: true, ...tokens };
  }

  // -------- MFA setup --------
  setupMFA(userId) {
    const user = this.users.get(userId);
    if (!user) return { ok: false, error: 'User not found.' };

    const secret = crypto.randomBytes(20).toString('base32').replace(/=/g, '');
    this.mfaSecrets.set(userId, secret);
    // In production: return TOTP URI for QR code
    return { ok: true, secret, uri: `otpauth://totp/NexusAIPro:${user.email}?secret=${secret}&issuer=NexusAIPro` };
  }

  confirmMFA(userId, token) {
    const valid = this._verifyTOTP(userId, token);
    if (!valid) return { ok: false, error: 'Invalid token.' };
    const user = this.users.get(userId);
    if (user) user.mfaEnabled = true;
    return { ok: true };
  }

  // -------- Role authorization --------
  hasRole(userId, requiredRole) {
    const user = this.users.get(userId);
    if (!user) return false;
    return (ROLE_HIERARCHY[user.role] ?? -1) >= (ROLE_HIERARCHY[requiredRole] ?? Infinity);
  }

  requireRole(requiredRole) {
    return (req, res, next) => {
      const userId = req.user?.id;
      if (!userId || !this.hasRole(userId, requiredRole)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }
      next();
    };
  }

  // -------- JWT-style token verification (HMAC-SHA256) --------
  verifyToken(token) {
    try {
      const [headerB64, payloadB64, sig] = token.split('.');
      if (!headerB64 || !payloadB64 || !sig) return null;
      const expected = this._sign(`${headerB64}.${payloadB64}`);
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (Date.now() > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  }

  authMiddleware(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    const payload = this.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.user = payload;
    next();
  }

  // -------- Internal helpers --------
  _hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 310000, 64, 'sha512').toString('hex');
  }

  _sign(data) {
    const secret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    return crypto.createHmac('sha256', secret).update(data).digest('base64url');
  }

  _issueTokens(user) {
    const now = Date.now();
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const accessPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 15 * 60 * 1000,
    };
    const refreshPayload = {
      id: user.id,
      exp: now + 7 * 24 * 60 * 60 * 1000,
    };
    const accessPayloadB64 = Buffer.from(JSON.stringify(accessPayload)).toString('base64url');
    const refreshPayloadB64 = Buffer.from(JSON.stringify(refreshPayload)).toString('base64url');
    const accessToken = `${header}.${accessPayloadB64}.${this._sign(`${header}.${accessPayloadB64}`)}`;
    const refreshToken = `${header}.${refreshPayloadB64}.${this._sign(`${header}.${refreshPayloadB64}`)}`;

    this.refreshTokens.set(refreshToken, { userId: user.id, expiresAt: refreshPayload.exp });
    return { accessToken, refreshToken };
  }

  // Minimal TOTP verification (6-digit, 30s window)
  _verifyTOTP(userId, token) {
    const secret = this.mfaSecrets.get(userId);
    if (!secret) return false;
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    for (const step of [timeStep - 1, timeStep, timeStep + 1]) {
      const expected = this._totpCode(secret, step);
      if (expected === token.toString()) return true;
    }
    return false;
  }

  _totpCode(secret, counter) {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32')).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24 |
      hmac[offset + 1] << 16 |
      hmac[offset + 2] << 8 |
      hmac[offset + 3]) % 1000000;
    return code.toString().padStart(6, '0');
  }

  _publicUser(user) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      biometricEnabled: user.biometricEnabled,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }
}
