// src/api/auth.js
// Date: 2026-10-19
// Authentication API: registration, login, MFA (TOTP), biometric (WebAuthn), JWT, roles

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const BCRYPT_ROUNDS = 12;
const ROLES = ['user', 'moderator', 'developer', 'admin'];
const ROLE_PERMISSIONS = {
  user: ['read:own', 'write:own'],
  moderator: ['read:own', 'write:own', 'read:users', 'moderate:content'],
  developer: ['read:own', 'write:own', 'read:users', 'access:devtools', 'read:logs'],
  admin: ['read:own', 'write:own', 'read:users', 'write:users', 'moderate:content', 'access:devtools', 'read:logs', 'manage:system'],
};

// In-memory stores — replace with Redis/DB in production
const users = new Map();           // userId -> userRecord
const usersByEmail = new Map();    // email -> userId
const usersByUsername = new Map(); // username -> userId
const mfaSecrets = new Map();      // userId -> { secret, enabled }
const biometricCreds = new Map();  // userId -> [credentialRecord]
const tokenBlacklist = new Set();  // revoked JWTs (jti)
const pendingChallenges = new Map(); // userId -> webauthn challenge

// ---------- helpers ----------

function validatePasswordStrength(password) {
  if (!password || password.length < 13) return { valid: false, reason: 'Minimum 13 characters required' };
  if (!/[A-Z]/.test(password)) return { valid: false, reason: 'Must contain uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, reason: 'Must contain lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, reason: 'Must contain number' };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) return { valid: false, reason: 'Must contain special character' };
  return { valid: true, strength: 'strong' };
}

function validateUsername(username) {
  if (!username || username.length < 2 || username.length > 50) return false;
  return /^[\p{L}\p{N}\p{Emoji}_\-\.]+$/u.test(username);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateBase32Secret(length = 20) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => alphabet[b % 32]).join('');
}

function generateTOTP(secret, windowOffset = 0) {
  const epoch = Math.round(Date.now() / 1000);
  const counter = Math.floor(epoch / 30) + windowOffset;
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0, 0);
  buf.writeUInt32BE(counter, 4);
  hmac.update(buf);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const otp = (
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]
  ) % 1000000;
  return otp.toString().padStart(6, '0');
}

function verifyTOTP(secret, code) {
  for (let w = -1; w <= 1; w++) {
    if (generateTOTP(secret, w) === code) return true;
  }
  return false;
}

function signToken(payload) {
  const jti = uuidv4();
  return jwt.sign(
    { ...payload, jti },
    process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET not set'); })(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ---------- middleware ----------

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });

    const decoded = jwt.verify(token, secret);

    if (tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ---------- route factory ----------

export function createAuthRoutes(app, io, securityModule) {
  function audit(action, meta = {}) {
    securityModule?.logAudit?.(action, meta);
  }

  // POST /api/auth/register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password, language } = req.body;

      if (!validateUsername(username)) {
        return res.status(400).json({ error: 'Invalid username. 2-50 chars, letters/numbers/emoji/underscore/hyphen/dot allowed.' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      const pwCheck = validatePasswordStrength(password);
      if (!pwCheck.valid) {
        return res.status(400).json({ error: pwCheck.reason });
      }

      const emailKey = email.toLowerCase();
      const usernameKey = username.toLowerCase();

      if (usersByEmail.has(emailKey)) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      if (usersByUsername.has(usernameKey)) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const user = {
        userId,
        username,
        email: emailKey,
        passwordHash,
        role: 'user',
        language: language || 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mfaEnabled: false,
        locked: false,
        failedLoginAttempts: 0,
      };

      users.set(userId, user);
      usersByEmail.set(emailKey, userId);
      usersByUsername.set(usernameKey, userId);

      const token = signToken({ userId, role: user.role, username: user.username });

      audit('USER_REGISTER', { userId, username, email: emailKey });

      res.status(201).json({ token, user: safeUser(user) });
    } catch (err) {
      audit('REGISTER_ERROR', { error: err.message });
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, password } = req.body; // identifier = email or username

      if (!identifier || !password) {
        return res.status(400).json({ error: 'Identifier and password required' });
      }

      const identifierLower = identifier.toLowerCase();
      let userId = usersByEmail.get(identifierLower) || usersByUsername.get(identifierLower);

      if (!userId) {
        // Constant-time fake compare to prevent user enumeration
        await bcrypt.compare(password, '$2a$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users.get(userId);

      if (user.locked) {
        return res.status(403).json({ error: 'Account locked. Contact support.' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= 10) {
          user.locked = true;
          audit('ACCOUNT_LOCKED', { userId });
        }
        users.set(userId, user);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user.failedLoginAttempts = 0;
      user.lastLogin = new Date().toISOString();
      users.set(userId, user);

      const requiresMFA = user.mfaEnabled;
      let token = null;

      if (!requiresMFA) {
        token = signToken({ userId, role: user.role, username: user.username });
      }

      audit('USER_LOGIN', { userId, requiresMFA });

      res.json({ token, requiresMFA, user: requiresMFA ? null : safeUser(user) });
    } catch (err) {
      audit('LOGIN_ERROR', { error: err.message });
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // POST /api/auth/mfa/setup
  app.post('/api/auth/mfa/setup', authenticateToken, (req, res) => {
    try {
      const { userId, username } = req.user;
      const secret = generateBase32Secret();
      const issuer = encodeURIComponent(process.env.APP_NAME || 'NexusAIPro');
      const account = encodeURIComponent(username);
      const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

      mfaSecrets.set(userId, { secret, enabled: false });

      audit('MFA_SETUP_INITIATED', { userId });

      res.json({ secret, otpauthUrl });
    } catch (err) {
      res.status(500).json({ error: 'MFA setup failed' });
    }
  });

  // POST /api/auth/mfa/verify
  app.post('/api/auth/mfa/verify', (req, res) => {
    try {
      const { identifier, code, activate } = req.body;

      if (!identifier || !code || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'Identifier and 6-digit code required' });
      }

      const identifierLower = identifier.toLowerCase();
      const userId = usersByEmail.get(identifierLower) || usersByUsername.get(identifierLower);
      if (!userId) return res.status(404).json({ error: 'User not found' });

      const mfa = mfaSecrets.get(userId);
      if (!mfa) return res.status(400).json({ error: 'MFA not set up' });

      if (!verifyTOTP(mfa.secret, code)) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }

      // If activating MFA for the first time
      if (activate) {
        mfa.enabled = true;
        mfaSecrets.set(userId, mfa);
        const user = users.get(userId);
        user.mfaEnabled = true;
        users.set(userId, user);
        audit('MFA_ACTIVATED', { userId });
      }

      const user = users.get(userId);
      const token = signToken({ userId, role: user.role, username: user.username });

      audit('MFA_VERIFIED', { userId });

      res.json({ token, user: safeUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'MFA verification failed' });
    }
  });

  // POST /api/auth/biometric/register
  app.post('/api/auth/biometric/register', authenticateToken, (req, res) => {
    try {
      const { userId } = req.user;
      const { credentialId, publicKey, type, deviceName } = req.body;

      if (!credentialId || !publicKey) {
        return res.status(400).json({ error: 'credentialId and publicKey required' });
      }

      const existing = biometricCreds.get(userId) || [];
      existing.push({
        credentialId,
        publicKey,
        type: type || 'platform',
        deviceName: deviceName || 'Unknown Device',
        registeredAt: new Date().toISOString(),
      });
      biometricCreds.set(userId, existing);

      audit('BIOMETRIC_REGISTERED', { userId, deviceName });

      res.json({ success: true, message: 'Biometric credential registered' });
    } catch (err) {
      res.status(500).json({ error: 'Biometric registration failed' });
    }
  });

  // POST /api/auth/biometric/verify
  app.post('/api/auth/biometric/verify', (req, res) => {
    try {
      const { credentialId, assertion, userId: claimedUserId } = req.body;

      if (!credentialId || !claimedUserId) {
        return res.status(400).json({ error: 'credentialId and userId required' });
      }

      const creds = biometricCreds.get(claimedUserId) || [];
      const cred = creds.find(c => c.credentialId === credentialId);

      if (!cred) {
        return res.status(401).json({ error: 'Biometric credential not found' });
      }

      // NOTE: Full WebAuthn assertion verification (signature check against stored public key)
      // requires a library like @simplewebauthn/server in production.
      // This placeholder accepts any assertion for the matching credentialId.
      const user = users.get(claimedUserId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const token = signToken({ userId: claimedUserId, role: user.role, username: user.username });

      audit('BIOMETRIC_VERIFIED', { userId: claimedUserId });

      res.json({ token, user: safeUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'Biometric verification failed' });
    }
  });

  // GET /api/auth/me
  app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = users.get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: safeUser(user), permissions: ROLE_PERMISSIONS[user.role] || [] });
  });

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', authenticateToken, (req, res) => {
    try {
      const user = users.get(req.user.userId);
      if (!user || user.locked) return res.status(401).json({ error: 'Cannot refresh token' });

      // Blacklist the old token's jti
      if (req.user.jti) tokenBlacklist.add(req.user.jti);

      const token = signToken({ userId: user.userId, role: user.role, username: user.username });
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: 'Token refresh failed' });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', authenticateToken, (req, res) => {
    if (req.user.jti) tokenBlacklist.add(req.user.jti);
    audit('USER_LOGOUT', { userId: req.user.userId });
    res.json({ success: true });
  });

  // PUT /api/auth/password/change
  app.put('/api/auth/password/change', authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = users.get(req.user.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

      const pwCheck = validatePasswordStrength(newPassword);
      if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.reason });

      user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      user.updatedAt = new Date().toISOString();
      users.set(user.userId, user);

      // Blacklist current token — user must log in again
      if (req.user.jti) tokenBlacklist.add(req.user.jti);

      audit('PASSWORD_CHANGED', { userId: user.userId });

      res.json({ success: true, message: 'Password changed. Please log in again.' });
    } catch (err) {
      res.status(500).json({ error: 'Password change failed' });
    }
  });

  // GET /api/auth/roles
  app.get('/api/auth/roles', (req, res) => {
    res.json({ roles: ROLES, permissions: ROLE_PERMISSIONS });
  });

  // Admin: update user role
  app.put('/api/auth/users/:userId/role', authenticateToken, requireRole('admin'), (req, res) => {
    const { role } = req.body;
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const user = users.get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.role = role;
    user.updatedAt = new Date().toISOString();
    users.set(user.userId, user);

    audit('ROLE_UPDATED', { targetUserId: user.userId, newRole: role, byUserId: req.user.userId });

    res.json({ user: safeUser(user) });
  });

  // Admin: list users
  app.get('/api/auth/users', authenticateToken, requireRole('admin', 'moderator'), (req, res) => {
    const userList = Array.from(users.values()).map(safeUser);
    res.json({ users: userList, total: userList.length });
  });
}
