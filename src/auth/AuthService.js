// src/auth/AuthService.js
// Updated: 2026-10-25
// Role-based authentication with biometrics, 2FA/MFA, strong passwords, Unicode/emoji usernames

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ─── Password policy ────────────────────────────────────────────────────────
const PASSWORD_POLICY = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`\'"\\',
  maxLength: 128
};

// ─── Roles ───────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user'
};

const ROLE_PERMISSIONS = {
  admin: ['*'],
  dev: ['read', 'write', 'deploy', 'analytics', 'security:read', 'project:*', 'gamedev:*'],
  moderator: ['read', 'write', 'user:manage', 'content:moderate', 'analytics:read'],
  user: ['read', 'chat', 'project:read', 'analytics:own']
};

// ─── Token config ────────────────────────────────────────────────────────────
const TOKEN_EXPIRY = {
  access: 15 * 60 * 1000,        // 15 minutes
  refresh: 7 * 24 * 60 * 60 * 1000, // 7 days
  mfaChallenge: 5 * 60 * 1000    // 5 minutes
};

export class AuthService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.mfaChallenges = new Map();
    this.refreshTokens = new Map();
    this.auditLog = [];
    this._jwtSecret = process.env.JWT_SECRET;
    if (!this._jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  // ─── Username validation (supports Unicode / emoji) ─────────────────────
  validateUsername(username) {
    if (typeof username !== 'string') return { valid: false, error: 'Username must be a string' };
    const len = [...username].length; // count Unicode codepoints
    if (len < 3) return { valid: false, error: 'Username must be at least 3 characters' };
    if (len > 50) return { valid: false, error: 'Username must be at most 50 characters' };
    // Disallow control characters and null bytes; allow everything else including emoji
    if (/[\x00-\x1F\x7F]/.test(username)) {
      return { valid: false, error: 'Username contains invalid control characters' };
    }
    return { valid: true };
  }

  // ─── Password validation ─────────────────────────────────────────────────
  validatePassword(password) {
    if (typeof password !== 'string') return { valid: false, error: 'Password must be a string' };
    const cp = [...password].length;
    if (cp < PASSWORD_POLICY.minLength) {
      return { valid: false, error: `Password must be at least ${PASSWORD_POLICY.minLength} characters` };
    }
    if (cp > PASSWORD_POLICY.maxLength) {
      return { valid: false, error: `Password must be at most ${PASSWORD_POLICY.maxLength} characters` };
    }
    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }
    const specialPattern = new RegExp(`[${PASSWORD_POLICY.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (PASSWORD_POLICY.requireSpecial && !specialPattern.test(password)) {
      return { valid: false, error: 'Password must contain at least one special character' };
    }
    return { valid: true };
  }

  // ─── Hash password with PBKDF2-SHA512 ───────────────────────────────────
  async hashPassword(password) {
    const salt = crypto.randomBytes(64).toString('hex');
    const hash = await new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 200000, 64, 'sha512', (err, dk) => {
        if (err) reject(err);
        else resolve(dk.toString('hex'));
      });
    });
    return { hash, salt, iterations: 200000, algorithm: 'pbkdf2-sha512' };
  }

  async verifyPassword(password, storedHash) {
    const { hash, salt, iterations } = storedHash;
    const derived = await new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, dk) => {
        if (err) reject(err);
        else resolve(dk.toString('hex'));
      });
    });
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  }

  // ─── Register ────────────────────────────────────────────────────────────
  async register(userData) {
    const { username, email, password, role = ROLES.USER, displayName } = userData;

    const usernameCheck = this.validateUsername(username);
    if (!usernameCheck.valid) return { success: false, error: usernameCheck.error };

    const passwordCheck = this.validatePassword(password);
    if (!passwordCheck.valid) return { success: false, error: passwordCheck.error };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Invalid email address' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = [...this.users.values()].find(
      u => u.email === normalizedEmail || u.username === username
    );
    if (existingUser) return { success: false, error: 'Username or email already exists' };

    const userId = uuidv4();
    const hashedPassword = await this.hashPassword(password);
    const mfaSecret = crypto.randomBytes(20).toString('base32');

    const user = {
      id: userId,
      username,
      email: normalizedEmail,
      displayName: displayName || username,
      role: Object.values(ROLES).includes(role) ? role : ROLES.USER,
      passwordHash: hashedPassword,
      mfaEnabled: false,
      mfaSecret,
      biometricEnabled: false,
      biometricCredentials: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
      locale: userData.locale || 'en',
      permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user
    };

    this.users.set(userId, user);
    this.audit('USER_REGISTERED', { userId, username, role });

    return {
      success: true,
      userId,
      username,
      role: user.role,
      mfaSecret
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────
  async login(identifier, password, mfaToken = null) {
    const user = [...this.users.values()].find(
      u => u.email === identifier.toLowerCase().trim() || u.username === identifier
    );

    if (!user) {
      this.audit('LOGIN_FAILED', { identifier, reason: 'user_not_found' });
      return { success: false, error: 'Invalid credentials' };
    }

    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      return { success: false, error: 'Account temporarily locked. Try again later.' };
    }

    const passwordValid = await this.verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 min lockout
      }
      this.audit('LOGIN_FAILED', { userId: user.id, reason: 'invalid_password', attempts: user.loginAttempts });
      return { success: false, error: 'Invalid credentials' };
    }

    if (user.mfaEnabled) {
      if (!mfaToken) {
        const challengeId = uuidv4();
        this.mfaChallenges.set(challengeId, { userId: user.id, expiresAt: Date.now() + TOKEN_EXPIRY.mfaChallenge });
        return { success: false, requiresMfa: true, challengeId };
      }
      const mfaValid = this.verifyMfaToken(user.mfaSecret, mfaToken);
      if (!mfaValid) {
        this.audit('MFA_FAILED', { userId: user.id });
        return { success: false, error: 'Invalid MFA token' };
      }
    }

    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = Date.now();

    const tokens = this.generateTokens(user);
    this.audit('LOGIN_SUCCESS', { userId: user.id, role: user.role });

    return {
      success: true,
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      ...tokens
    };
  }

  // ─── TOTP/MFA token verification (RFC 6238 compliant) ───────────────────
  verifyMfaToken(secret, token) {
    if (!/^\d{6}$/.test(token)) return false;
    const window = 1; // allow ±1 time step
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    for (let i = -window; i <= window; i++) {
      const expected = this.generateTotp(secret, timeStep + i);
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return true;
    }
    return false;
  }

  generateTotp(secret, counter) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const key = Buffer.from(secret, 'base32');
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24 |
      (hmac[offset + 1] & 0xff) << 16 |
      (hmac[offset + 2] & 0xff) << 8 |
      (hmac[offset + 3] & 0xff)) % 1000000;
    return code.toString().padStart(6, '0');
  }

  // ─── Biometric registration ──────────────────────────────────────────────
  registerBiometric(userId, credential) {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const biometricId = uuidv4();
    const credentialRecord = {
      id: biometricId,
      type: credential.type, // 'fingerprint' | 'touchid' | 'faceid' | 'retinal'
      credentialId: credential.credentialId,
      publicKey: credential.publicKey,
      registeredAt: Date.now(),
      platform: credential.platform || 'unknown'
    };

    user.biometricCredentials.push(credentialRecord);
    user.biometricEnabled = true;
    this.audit('BIOMETRIC_REGISTERED', { userId, type: credential.type });
    return { success: true, biometricId };
  }

  // ─── JWT token generation ─────────────────────────────────────────────────
  generateTokens(user) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      iat: Date.now(),
      exp: Date.now() + TOKEN_EXPIRY.access
    };

    const accessToken = this.signJwt(payload);
    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
      iat: Date.now(),
      exp: Date.now() + TOKEN_EXPIRY.refresh
    };
    const refreshToken = this.signJwt(refreshPayload);

    const tokenId = uuidv4();
    this.refreshTokens.set(tokenId, { userId: user.id, token: refreshToken, expiresAt: refreshPayload.exp });

    return { accessToken, refreshToken, expiresIn: TOKEN_EXPIRY.access };
  }

  signJwt(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', this._jwtSecret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  verifyJwt(token) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto.createHmac('sha256', this._jwtSecret).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  }

  // ─── Auth middleware factory ──────────────────────────────────────────────
  middleware(requiredPermission = null) {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization token' });
      }
      const token = authHeader.slice(7);
      const payload = this.verifyJwt(token);
      if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });

      req.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        permissions: payload.permissions || []
      };

      if (requiredPermission) {
        const hasPermission = req.user.permissions.includes('*') ||
          req.user.permissions.includes(requiredPermission);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }

      next();
    };
  }

  // ─── Audit ────────────────────────────────────────────────────────────────
  audit(event, details) {
    this.auditLog.push({
      id: uuidv4(),
      event,
      details,
      timestamp: new Date().toISOString()
    });
    if (this.auditLog.length > 5000) this.auditLog = this.auditLog.slice(-5000);
  }

  getUserPublicProfile(userId) {
    const user = this.users.get(userId);
    if (!user) return null;
    const { passwordHash, mfaSecret, biometricCredentials, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
export default authService;
