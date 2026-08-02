// src/auth/auth-routes.js
// 2026-08-02 — Authentication & Authorization API Routes
// Role-based access control: admin | dev | moderator | user
// JWT + bcrypt, 2FA/MFA, biometric token support, audit logging

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const USER_ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'dev', MODERATOR: 'moderator', USER: 'user' });
const ROLE_HIERARCHY = { admin: 4, dev: 3, moderator: 2, user: 1 };

const ROLE_PERMISSIONS = Object.freeze({
  admin:     ['*'],
  dev:       ['read:*', 'write:*', 'delete:own', 'manage:projects', 'view:analytics', 'view:security'],
  moderator: ['read:*', 'write:own', 'moderate:content', 'view:analytics'],
  user:      ['read:own', 'write:own', 'view:own:analytics'],
});

// Password policy: 13+ chars, upper+lower+digit+special
const PASSWORD_POLICY = {
  minLength: 13,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`',
};

// Username policy: allows letters, digits, emoji, special chars (Unicode)
const USERNAME_POLICY = {
  minLength: 3,
  maxLength: 50,
  pattern: /^[\p{L}\p{N}\p{Emoji}\p{P}\p{S}_\-. ]+$/u,
};

// Rate limiting state per IP for auth endpoints
const authAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = authAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 };
  if (entry.lockedUntil > now) {
    return { blocked: true, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (now - entry.firstAttempt > LOCKOUT_MS) {
    authAttempts.set(ip, { count: 0, firstAttempt: now, lockedUntil: 0 });
    return { blocked: false };
  }
  return { blocked: false };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = authAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  authAttempts.set(ip, entry);
}

function clearAttempts(ip) {
  authAttempts.delete(ip);
}

function validatePassword(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string.' };
  if (password.length < PASSWORD_POLICY.minLength) return { valid: false, reason: `Minimum ${PASSWORD_POLICY.minLength} characters required.` };
  if (PASSWORD_POLICY.requireUpper && !/[A-Z]/.test(password)) return { valid: false, reason: 'Must contain an uppercase letter.' };
  if (PASSWORD_POLICY.requireLower && !/[a-z]/.test(password)) return { valid: false, reason: 'Must contain a lowercase letter.' };
  if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(password)) return { valid: false, reason: 'Must contain a digit.' };
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(password)) return { valid: false, reason: 'Must contain a special character.' };
  return { valid: true };
}

function validateUsername(username) {
  if (typeof username !== 'string') return { valid: false, reason: 'Username must be a string.' };
  const clean = username.trim();
  if (clean.length < USERNAME_POLICY.minLength) return { valid: false, reason: `Username must be at least ${USERNAME_POLICY.minLength} characters.` };
  if (clean.length > USERNAME_POLICY.maxLength) return { valid: false, reason: `Username must be at most ${USERNAME_POLICY.maxLength} characters.` };
  if (!USERNAME_POLICY.pattern.test(clean)) return { valid: false, reason: 'Username contains disallowed characters.' };
  return { valid: true, value: clean };
}

function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

function generateTOTPSecret() {
  return crypto.randomBytes(20).toString('base32').replace(/=/g, '');
}

function verifyTOTP(secret, token) {
  // Simplified TOTP verification (30s windows)
  if (!/^\d{6}$/.test(token)) return false;
  const time = Math.floor(Date.now() / 30000);
  for (const t of [time - 1, time, time + 1]) {
    const expected = crypto
      .createHmac('sha1', Buffer.from(secret, 'base32'))
      .update(Buffer.alloc(8).fill(0).writeBigUInt64BE(BigInt(t)) && (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(t)); return b; })())
      .digest();
    const offset = expected[19] & 0xf;
    const code = ((expected.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
    if (code === token) return true;
  }
  return false;
}

export function registerAuthRoutes(app, security, dataService, bcrypt, jwt) {
  const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
  const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';
  const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

  function signToken(payload, expiresIn) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn, algorithm: 'HS256' });
  }

  function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  }

  function authMiddleware(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }
    try {
      const payload = verifyToken(header.slice(7));
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
      const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
      const minLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] || 0));
      if (userLevel < minLevel) return res.status(403).json({ error: 'Insufficient permissions' });
      next();
    };
  }

  // ── Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const limit = checkRateLimit(ip);
      if (limit.blocked) return res.status(429).json({ error: 'Too many attempts', retryAfter: limit.retryAfter });

      const { username, email, password, language = 'en', region = 'US', role } = req.body;

      const usernameCheck = validateUsername(username);
      if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.reason });
      if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });

      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.reason });

      const existing = dataService.list('users', { email: email.trim().toLowerCase() });
      if (existing.length > 0) return res.status(409).json({ error: 'Email already registered.' });

      const existingUn = dataService.list('users', { username: usernameCheck.value });
      if (existingUn.length > 0) return res.status(409).json({ error: 'Username already taken.' });

      const assignedRole = role === 'admin' ? USER_ROLES.USER : (Object.values(USER_ROLES).includes(role) ? role : USER_ROLES.USER);
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      const totpSecret = generateTOTPSecret();

      const user = {
        id: uuidv4(),
        username: usernameCheck.value,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: assignedRole,
        language,
        region,
        mfaEnabled: false,
        mfaSecret: totpSecret,
        biometricEnabled: false,
        biometricTokenHash: null,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        permissions: ROLE_PERMISSIONS[assignedRole],
        active: true,
      };

      dataService.store('users', user.id, user);
      security.logAudit('USER_REGISTERED', { userId: user.id, role: assignedRole, ip });

      const accessToken = signToken({ userId: user.id, role: user.role, username: user.username }, JWT_EXPIRES);
      const refreshToken = signToken({ userId: user.id, type: 'refresh' }, REFRESH_EXPIRES);

      res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email, role: user.role, language, region, mfaEnabled: false },
        accessToken,
        refreshToken,
        totpSetupUri: `otpauth://totp/NexusAI:${user.email}?secret=${totpSecret}&issuer=NexusAIPro`,
      });
    } catch (err) {
      security.logAudit('REGISTER_ERROR', { error: err.message });
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // ── Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const limit = checkRateLimit(ip);
      if (limit.blocked) return res.status(429).json({ error: 'Too many attempts', retryAfter: limit.retryAfter });

      const { email, password, mfaToken, biometricToken } = req.body;

      if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

      const users = dataService.list('users', { email: email.trim().toLowerCase(), active: true });
      if (users.length === 0) {
        recordFailedAttempt(ip);
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const user = users[0];

      // Biometric fast-path
      if (biometricToken && user.biometricEnabled) {
        const tokenHash = security.hash(biometricToken);
        if (tokenHash !== user.biometricTokenHash) {
          recordFailedAttempt(ip);
          return res.status(401).json({ error: 'Biometric verification failed.' });
        }
      } else {
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          recordFailedAttempt(ip);
          return res.status(401).json({ error: 'Invalid credentials.' });
        }
      }

      // MFA check
      if (user.mfaEnabled) {
        if (!mfaToken) return res.status(200).json({ mfaRequired: true, userId: user.id });
        if (!verifyTOTP(user.mfaSecret, mfaToken)) {
          recordFailedAttempt(ip);
          return res.status(401).json({ error: 'Invalid MFA token.' });
        }
      }

      clearAttempts(ip);

      // Update last login
      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      dataService.store('users', user.id, updatedUser);
      security.logAudit('USER_LOGIN', { userId: user.id, role: user.role, ip });

      const accessToken = signToken({ userId: user.id, role: user.role, username: user.username }, JWT_EXPIRES);
      const refreshToken = signToken({ userId: user.id, type: 'refresh' }, REFRESH_EXPIRES);

      res.json({
        user: { id: user.id, username: user.username, email: user.email, role: user.role, language: user.language, region: user.region, mfaEnabled: user.mfaEnabled, biometricEnabled: user.biometricEnabled },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      security.logAudit('LOGIN_ERROR', { error: err.message });
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ── Token refresh
  app.post('/api/auth/refresh', (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });
      const payload = verifyToken(refreshToken);
      if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type.' });

      const users = dataService.list('users', { id: payload.userId, active: true });
      if (users.length === 0) return res.status(401).json({ error: 'User not found.' });

      const user = users[0];
      const accessToken = signToken({ userId: user.id, role: user.role, username: user.username }, JWT_EXPIRES);
      res.json({ accessToken });
    } catch {
      res.status(401).json({ error: 'Invalid refresh token.' });
    }
  });

  // ── Logout
  app.post('/api/auth/logout', authMiddleware, (req, res) => {
    security.logAudit('USER_LOGOUT', { userId: req.user.userId });
    res.json({ success: true });
  });

  // ── Enable/update MFA
  app.post('/api/auth/mfa/enable', authMiddleware, async (req, res) => {
    try {
      const { totpToken } = req.body;
      const users = dataService.list('users', { id: req.user.userId });
      if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
      const user = users[0];

      if (!verifyTOTP(user.mfaSecret, totpToken)) {
        return res.status(400).json({ error: 'Invalid TOTP token. Verify your authenticator app.' });
      }

      dataService.store('users', user.id, { ...user, mfaEnabled: true });
      security.logAudit('MFA_ENABLED', { userId: user.id });
      res.json({ success: true, mfaEnabled: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to enable MFA.' });
    }
  });

  // ── Register biometric token
  app.post('/api/auth/biometric/register', authMiddleware, async (req, res) => {
    try {
      const { biometricToken, biometricType } = req.body;
      const allowedTypes = ['fingerprint', 'touchId', 'faceId', 'retinal'];
      if (!allowedTypes.includes(biometricType)) return res.status(400).json({ error: 'Unsupported biometric type.' });
      if (typeof biometricToken !== 'string' || biometricToken.length < 32) return res.status(400).json({ error: 'Invalid biometric token.' });

      const users = dataService.list('users', { id: req.user.userId });
      if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
      const user = users[0];

      const tokenHash = security.hash(biometricToken);
      dataService.store('users', user.id, { ...user, biometricEnabled: true, biometricTokenHash: tokenHash, biometricType });
      security.logAudit('BIOMETRIC_REGISTERED', { userId: user.id, biometricType });
      res.json({ success: true, biometricEnabled: true, biometricType });
    } catch (err) {
      res.status(500).json({ error: 'Failed to register biometric.' });
    }
  });

  // ── Get current user profile
  app.get('/api/auth/me', authMiddleware, (req, res) => {
    const users = dataService.list('users', { id: req.user.userId });
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    const { password, mfaSecret, biometricTokenHash, ...safeUser } = users[0];
    res.json(safeUser);
  });

  // ── Update profile
  app.patch('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const users = dataService.list('users', { id: req.user.userId });
      if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
      const user = users[0];

      const allowed = ['username', 'language', 'region'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (updates.username) {
        const check = validateUsername(updates.username);
        if (!check.valid) return res.status(400).json({ error: check.reason });
        updates.username = check.value;
      }

      dataService.store('users', user.id, { ...user, ...updates });
      security.logAudit('PROFILE_UPDATED', { userId: user.id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  // ── Change password
  app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const users = dataService.list('users', { id: req.user.userId });
      if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
      const user = users[0];

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.reason });

      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash(newPassword, salt);
      dataService.store('users', user.id, { ...user, password: hashed });
      security.logAudit('PASSWORD_CHANGED', { userId: user.id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to change password.' });
    }
  });

  // ── Admin: list users
  app.get('/api/admin/users', authMiddleware, requireRole('admin'), (req, res) => {
    const users = dataService.list('users').map(({ password, mfaSecret, biometricTokenHash, ...u }) => u);
    res.json({ users, total: users.length });
  });

  // ── Admin: update user role
  app.patch('/api/admin/users/:userId/role', authMiddleware, requireRole('admin'), (req, res) => {
    const { role } = req.body;
    if (!Object.values(USER_ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role.' });

    const users = dataService.list('users', { id: req.params.userId });
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = users[0];
    dataService.store('users', user.id, { ...user, role, permissions: ROLE_PERMISSIONS[role] });
    security.logAudit('ROLE_UPDATED', { targetUserId: user.id, newRole: role, adminId: req.user.userId });
    res.json({ success: true });
  });

  // ── Admin: disable/enable user
  app.patch('/api/admin/users/:userId/status', authMiddleware, requireRole('admin'), (req, res) => {
    const { active } = req.body;
    const users = dataService.list('users', { id: req.params.userId });
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = users[0];
    dataService.store('users', user.id, { ...user, active: Boolean(active) });
    security.logAudit('USER_STATUS_CHANGED', { targetUserId: user.id, active, adminId: req.user.userId });
    res.json({ success: true });
  });

  return { authMiddleware, requireRole, USER_ROLES, ROLE_HIERARCHY };
}

export { USER_ROLES, ROLE_HIERARCHY, ROLE_PERMISSIONS, validatePassword, validateUsername };
