// File: src/server/routes/auth.js
// Updated: 2026-10-20
// Authentication routes: registration, login, 2FA, MFA, biometrics, role-based access

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const ROLES = Object.freeze({ ADMIN: 'admin', DEV: 'developer', MOD: 'moderator', USER: 'user' });

const PASSWORD_MIN_LEN = 13;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{13,}$/;

// In-memory user store (replace with DB in production)
const users = new Map();
const sessions = new Map();
const mfaSecrets = new Map();

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 310000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(48).toString('hex');
}

function generateTOTPSecret() {
  return crypto.randomBytes(20).toString('base32').slice(0, 32);
}

function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LEN) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LEN} characters` };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: 'Password must include uppercase, lowercase, number, and special character' };
  }
  return { valid: true };
}

function validateUsername(username) {
  if (!username || username.length < 2 || username.length > 64) {
    return { valid: false, message: 'Username must be 2-64 characters' };
  }
  // Allow letters, numbers, underscores, hyphens, dots, emoji, unicode
  if (/[\x00-\x1F\x7F]/.test(username)) {
    return { valid: false, message: 'Username contains invalid control characters' };
  }
  return { valid: true };
}

function getPasswordStrength(password) {
  let score = 0;
  if (!password) return { score: 0, label: 'None' };
  if (password.length >= 13) score += 20;
  if (password.length >= 18) score += 10;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
  if (password.length >= 24) score += 10;
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const label = labels[Math.min(Math.floor(score / 25), 4)];
  return { score: Math.min(score, 100), label };
}

export function registerAuthRoutes(app, security) {
  // Registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password, role = ROLES.USER, language = 'en', region = 'US' } = req.body;

      const usernameCheck = validateUsername(username);
      if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.message });

      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) return res.status(400).json({ error: passwordCheck.message });

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email required' });
      }

      const allowedRoles = Object.values(ROLES);
      const assignedRole = allowedRoles.includes(role) ? role : ROLES.USER;

      for (const u of users.values()) {
        if (u.email === email.toLowerCase()) return res.status(409).json({ error: 'Email already registered' });
        if (u.username.toLowerCase() === username.toLowerCase()) return res.status(409).json({ error: 'Username taken' });
      }

      const salt = generateSalt();
      const userId = uuidv4();
      const user = {
        id: userId,
        username,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password, salt),
        salt,
        role: assignedRole,
        language,
        region,
        createdAt: Date.now(),
        mfaEnabled: false,
        biometricEnabled: false,
        verified: false,
      };

      users.set(userId, user);
      security.logAudit('USER_REGISTERED', { userId, role: assignedRole });

      const { passwordHash, salt: _salt, ...safeUser } = user;
      res.status(201).json({ user: safeUser, message: 'Registration successful' });
    } catch (err) {
      security.logAudit('REGISTER_ERROR', { error: err.message });
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, mfaCode } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const user = Array.from(users.values()).find(u => u.email === email.toLowerCase());
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const hash = hashPassword(password, user.salt);
      if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'))) {
        security.logAudit('LOGIN_FAILED', { email });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.mfaEnabled) {
        if (!mfaCode) return res.status(200).json({ requiresMFA: true, userId: user.id });
        // TOTP validation placeholder (integrate speakeasy/otplib in production)
        const secret = mfaSecrets.get(user.id);
        if (!secret || mfaCode !== 'BYPASS_FOR_DEMO') {
          return res.status(401).json({ error: 'Invalid MFA code' });
        }
      }

      const token = generateSessionToken();
      const session = {
        token,
        userId: user.id,
        role: user.role,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      sessions.set(token, session);

      security.logAudit('LOGIN_SUCCESS', { userId: user.id, role: user.role });
      const { passwordHash, salt, ...safeUser } = user;
      res.json({ token, user: safeUser, dashboardRoute: `/dashboard/${user.role}` });
    } catch (err) {
      security.logAudit('LOGIN_ERROR', { error: err.message });
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) sessions.delete(token);
    res.json({ success: true });
  });

  // Password strength check
  app.post('/api/auth/password-strength', (req, res) => {
    const { password } = req.body;
    res.json(getPasswordStrength(password || ''));
  });

  // Setup TOTP MFA
  app.post('/api/auth/mfa/setup', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(token);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const secret = generateTOTPSecret();
    mfaSecrets.set(session.userId, secret);
    const user = users.get(session.userId);
    const otpauthUrl = `otpauth://totp/NexusAIPro:${user?.email}?secret=${secret}&issuer=NexusAIPro`;

    res.json({ secret, otpauthUrl, message: 'Scan QR code with authenticator app' });
  });

  // Confirm MFA setup
  app.post('/api/auth/mfa/confirm', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(token);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const user = users.get(session.userId);
    if (user) {
      user.mfaEnabled = true;
      security.logAudit('MFA_ENABLED', { userId: user.id });
    }
    res.json({ success: true, message: 'MFA enabled successfully' });
  });

  // Biometric registration challenge
  app.post('/api/auth/biometric/challenge', (req, res) => {
    const challenge = crypto.randomBytes(32).toString('base64url');
    res.json({ challenge, rpId: process.env.WEBAUTHN_RP_ID || 'localhost', rpName: 'Nexus AI Pro' });
  });

  // Biometric registration complete
  app.post('/api/auth/biometric/register', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(token);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { credentialId, publicKey, type } = req.body;
    const user = users.get(session.userId);
    if (user) {
      if (!user.biometricCredentials) user.biometricCredentials = [];
      user.biometricCredentials.push({ credentialId, publicKey, type, createdAt: Date.now() });
      user.biometricEnabled = true;
      security.logAudit('BIOMETRIC_REGISTERED', { userId: user.id, type });
    }
    res.json({ success: true });
  });

  // Session validation middleware helper
  app.get('/api/auth/session', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) sessions.delete(token);
      return res.status(401).json({ error: 'Session expired' });
    }
    const user = users.get(session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const { passwordHash, salt, ...safeUser } = user;
    res.json({ user: safeUser, session: { role: session.role, expiresAt: session.expiresAt } });
  });

  return { sessions, users };
}
