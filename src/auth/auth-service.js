// Created: 2026-07-28

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ROLES = ['admin', 'developer', 'moderator', 'user'];
const BCRYPT_COST = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const TOTP_WINDOW = 30;
const TOTP_DIGITS = 6;

// Base32 alphabet (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(buf) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_CHARS[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

function decodeBase32(str) {
  const lookup = {};
  for (let i = 0; i < BASE32_CHARS.length; i++) {
    lookup[BASE32_CHARS[i]] = i;
  }
  const cleaned = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of cleaned) {
    if (lookup[ch] === undefined) continue;
    value = (value << 5) | lookup[ch];
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

// RFC 6238 TOTP using HMAC-SHA1
function generateTOTP(base32Secret, timeStep = TOTP_WINDOW, digits = TOTP_DIGITS) {
  const key = decodeBase32(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBuf = Buffer.alloc(8);
  // Write counter as big-endian uint64 (upper 32 bits are always 0 for current epoch)
  counterBuf.writeUInt32BE(0, 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % Math.pow(10, digits)).padStart(digits, '0');
}

// Accept current window and one step either side to handle clock skew
function verifyTOTP(base32Secret, token) {
  const timeStep = TOTP_WINDOW;
  const now = Math.floor(Date.now() / 1000 / timeStep);
  for (const delta of [-1, 0, 1]) {
    const counter = now + delta;
    const key = decodeBase32(base32Secret);
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeUInt32BE(0, 0);
    counterBuf.writeUInt32BE(counter >>> 0, 4);
    const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const expected = String(code % Math.pow(10, TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
    if (crypto.timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(expected, 'utf8'))) {
      return true;
    }
  }
  return false;
}

function auditLog(event, userId) {
  console.log(JSON.stringify({ event, userId, timestamp: new Date().toISOString() }));
}

const PASSWORD_SPECIAL = '!@#$%^&*()_+-=[]{}|;\':\",./<>?`~';
const PASSWORD_SPECIAL_RE = /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/`~]/;

export default class AuthService {
  #users = new Map();

  validatePasswordStrength(password) {
    const errors = [];
    if (typeof password !== 'string' || password.length < 13) {
      errors.push('Password must be at least 13 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit.');
    }
    if (!PASSWORD_SPECIAL_RE.test(password)) {
      errors.push(`Password must contain at least one special character: ${PASSWORD_SPECIAL}`);
    }
    return { valid: errors.length === 0, errors };
  }

  async register(username, email, password, role = 'user') {
    if (!ROLES.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${ROLES.join(', ')}`);
    }
    const strength = this.validatePasswordStrength(password);
    if (!strength.valid) {
      throw new Error(strength.errors.join(' '));
    }
    for (const u of this.#users.values()) {
      if (u.email === email) throw new Error('Email already registered.');
      if (u.username === username) throw new Error('Username already taken.');
    }
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = {
      id,
      username,
      email,
      passwordHash,
      role,
      mfaEnabled: false,
      mfaSecret: null,
      biometricCredentials: [],
      createdAt: new Date().toISOString(),
      lastLogin: null,
      locale: 'en',
      isActive: true,
      refreshTokens: [],
    };
    this.#users.set(id, user);
    auditLog('AUTH_REGISTER', id);
    return { id, username, email, role, createdAt: user.createdAt };
  }

  async login(email, password) {
    const user = [...this.#users.values()].find(u => u.email === email);
    if (!user || !user.isActive) {
      auditLog('AUTH_LOGIN_FAIL', null);
      throw new Error('Invalid credentials.');
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      auditLog('AUTH_LOGIN_FAIL', user.id);
      throw new Error('Invalid credentials.');
    }

    if (user.mfaEnabled) {
      // Return partial result; caller must follow up with verifyMFA
      return { requiresMFA: true, userId: user.id };
    }

    return this.#issueTokens(user);
  }

  verifyMFA(userId, totpCode) {
    const user = this.#users.get(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new Error('MFA not configured for user.');
    }
    if (!verifyTOTP(user.mfaSecret, String(totpCode))) {
      auditLog('AUTH_LOGIN_FAIL', userId);
      throw new Error('Invalid MFA code.');
    }
    return this.#issueTokens(user);
  }

  #issueTokens(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured.');
    const payload = { sub: user.id, role: user.role };
    const accessToken = jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, secret, { expiresIn: REFRESH_TOKEN_TTL });
    user.refreshTokens.push(refreshToken);
    user.lastLogin = new Date().toISOString();
    auditLog('AUTH_LOGIN_SUCCESS', user.id);
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    };
  }

  refreshToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured.');
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      throw new Error('Invalid or expired refresh token.');
    }
    if (payload.type !== 'refresh') throw new Error('Token is not a refresh token.');
    const user = this.#users.get(payload.sub);
    if (!user || !user.isActive || !user.refreshTokens.includes(token)) {
      throw new Error('Refresh token not recognised.');
    }
    // Rotate: remove old, issue new pair
    user.refreshTokens = user.refreshTokens.filter(t => t !== token);
    return this.#issueTokens(user);
  }

  logout(userId, refreshToken) {
    const user = this.#users.get(userId);
    if (!user) throw new Error('User not found.');
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    auditLog('AUTH_LOGOUT', userId);
  }

  generateMFASecret(userId) {
    const user = this.#users.get(userId);
    if (!user) throw new Error('User not found.');
    const secretBytes = crypto.randomBytes(20);
    const secret = encodeBase32(secretBytes);
    user.mfaSecret = secret;
    // Return secret and a TOTP URI for authenticator apps
    const uri = `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro`;
    return { secret, uri };
  }

  enableMFA(userId) {
    const user = this.#users.get(userId);
    if (!user) throw new Error('User not found.');
    if (!user.mfaSecret) throw new Error('Call generateMFASecret first.');
    user.mfaEnabled = true;
    return { mfaEnabled: true };
  }

  // WebAuthn stub: stores and verifies credential IDs + public key bytes by userId
  registerBiometricCredential(userId, credentialId, publicKeyBytes) {
    const user = this.#users.get(userId);
    if (!user) throw new Error('User not found.');
    const exists = user.biometricCredentials.some(c => c.credentialId === credentialId);
    if (exists) throw new Error('Credential already registered.');
    user.biometricCredentials.push({
      credentialId,
      publicKeyBytes,
      registeredAt: new Date().toISOString(),
    });
    return { registered: true, credentialId };
  }

  verifyBiometricCredential(userId, credentialId) {
    const user = this.#users.get(userId);
    if (!user) throw new Error('User not found.');
    const cred = user.biometricCredentials.find(c => c.credentialId === credentialId);
    if (!cred) return { verified: false };
    // Stub: real WebAuthn would verify the assertion signature against cred.publicKeyBytes
    return { verified: true, credentialId: cred.credentialId };
  }

  getUserById(id) {
    const user = this.#users.get(id);
    if (!user) throw new Error('User not found.');
    const { passwordHash, mfaSecret, refreshTokens, ...safe } = user;
    return safe;
  }

  updateUser(id, updates) {
    const user = this.#users.get(id);
    if (!user) throw new Error('User not found.');
    const forbidden = ['id', 'passwordHash', 'mfaSecret', 'refreshTokens', 'createdAt'];
    for (const key of forbidden) {
      if (key in updates) throw new Error(`Field '${key}' cannot be updated via updateUser.`);
    }
    if (updates.role && !ROLES.includes(updates.role)) {
      throw new Error(`Invalid role. Must be one of: ${ROLES.join(', ')}`);
    }
    Object.assign(user, updates);
    return this.getUserById(id);
  }

  deleteUser(id) {
    if (!this.#users.has(id)) throw new Error('User not found.');
    this.#users.delete(id);
    return { deleted: true, id };
  }

  listUsers(filter = {}) {
    let results = [...this.#users.values()];
    if (filter.role) results = results.filter(u => u.role === filter.role);
    if (filter.isActive !== undefined) results = results.filter(u => u.isActive === filter.isActive);
    if (filter.email) results = results.filter(u => u.email === filter.email);
    return results.map(u => {
      const { passwordHash, mfaSecret, refreshTokens, ...safe } = u;
      return safe;
    });
  }

  verifyAccessToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured.');
    return jwt.verify(token, secret);
  }
}
