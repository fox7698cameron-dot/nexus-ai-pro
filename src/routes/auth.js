// src/routes/auth.js — Updated: 2026-07-25
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { signToken, requireAuth, requireRole, generateSecureToken, ROLES } from '../middleware/auth.js';

const router = Router();

// In-memory store (replace with Redis/DB in production)
const users = new Map();
const sessions = new Map();
const pendingVerifications = new Map();
const totpSecrets = new Map();
const webauthnChallenges = new Map();
const passwordResetTokens = new Map();

const MIN_PASSWORD_LENGTH = 13;
const BCRYPT_ROUNDS = 12;

function validatePassword(password) {
  const errors = [];
  if (password.length < MIN_PASSWORD_LENGTH) errors.push(`Minimum ${MIN_PASSWORD_LENGTH} characters required`);
  if (!/[A-Z]/.test(password)) errors.push('Must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain at least one special character');
  return errors;
}

// Unicode-normalize usernames so emojis/accented chars are consistent
function normalizeUsername(username) {
  return username.normalize('NFC').trim();
}

function passwordStrengthScore(password) {
  let score = 0;
  if (password.length >= 13) score += 1;
  if (password.length >= 20) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (/[^\x00-\x7F]/.test(password)) score += 1; // non-ASCII / emoji
  const entropy = Math.log2(Math.pow(Math.max(password.length, 1), 2) * score);
  return Math.min(Math.round((entropy / 40) * 100), 100);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = ROLES.USER } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email, and password are required' });

    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = email.toLowerCase().trim();

    const pwErrors = validatePassword(password);
    if (pwErrors.length) return res.status(400).json({ error: 'Password does not meet requirements', details: pwErrors });

    if ([...users.values()].some(u => u.email === normalizedEmail)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const allowedRoles = [ROLES.USER, ROLES.MOD, ROLES.DEV];
    const assignedRole = allowedRoles.includes(role) ? role : ROLES.USER;

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();
    const verificationToken = generateSecureToken(32);

    users.set(userId, {
      id: userId,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      emailVerified: false,
      mfaEnabled: false,
      createdAt: Date.now(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null
    });

    pendingVerifications.set(verificationToken, { userId, expiresAt: Date.now() + 86400000 });

    res.status(201).json({
      message: 'Registration successful. Check your email to verify your account.',
      userId,
      // verificationToken is sent via email in production — never in response body
      _dev_verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', (req, res) => {
  const { token } = req.body;
  const entry = pendingVerifications.get(token);
  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'Invalid or expired verification token' });

  const user = users.get(entry.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.emailVerified = true;
  pendingVerifications.delete(token);
  res.json({ message: 'Email verified successfully' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, mfaCode } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = [...users.values()].find(u => u.email === email.toLowerCase().trim());

    // Timing-safe: always hash regardless of whether user exists
    const compareHash = user?.passwordHash || '$2a$12$invalidhashplaceholder123456789012345678901234';
    const match = await bcrypt.compare(password, compareHash);

    if (!user || !match) {
      if (user) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 10) user.lockedUntil = Date.now() + 900000; // 15m lockout
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const remaining = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({ error: `Account locked. Try again in ${remaining} minutes.` });
    }

    if (!user.emailVerified) return res.status(403).json({ error: 'Please verify your email before logging in' });

    if (user.mfaEnabled) {
      if (!mfaCode) return res.status(200).json({ mfaRequired: true, message: 'MFA code required' });
      const secret = totpSecrets.get(user.id);
      if (!secret || !verifyTotp(mfaCode, secret)) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }

    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = Date.now();

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    const sessionId = uuidv4();
    sessions.set(sessionId, { userId: user.id, createdAt: Date.now() });

    res.cookie('nexus_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400000
    });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      sessionId
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie('nexus_token');
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = [...users.values()].find(u => u.email === email?.toLowerCase().trim());

  // Always return success to prevent email enumeration
  if (user) {
    const resetToken = generateSecureToken(32);
    passwordResetTokens.set(resetToken, { userId: user.id, expiresAt: Date.now() + 3600000 });
    // In production: send email with reset link containing resetToken
  }

  res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const entry = passwordResetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const pwErrors = validatePassword(newPassword);
  if (pwErrors.length) return res.status(400).json({ error: 'Password does not meet requirements', details: pwErrors });

  const user = users.get(entry.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  passwordResetTokens.delete(token);
  res.json({ message: 'Password updated successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, mfaEnabled: user.mfaEnabled, createdAt: user.createdAt });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

  const pwErrors = validatePassword(newPassword);
  if (pwErrors.length) return res.status(400).json({ error: 'New password does not meet requirements', details: pwErrors });

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  res.json({ message: 'Password changed successfully' });
});

// POST /api/auth/password-strength
router.post('/password-strength', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const errors = validatePassword(password);
  const score = passwordStrengthScore(password);
  res.json({ score, valid: errors.length === 0, errors });
});

// ===== TOTP / MFA =====
function generateTotpSecret() {
  return crypto.randomBytes(20).toString('base32').toUpperCase();
}

function verifyTotp(code, secret) {
  // TOTP: compute for current window ±1 step
  const step = 30;
  const now = Math.floor(Date.now() / 1000);
  for (let t = -1; t <= 1; t++) {
    const counter = Math.floor((now + t * step) / step);
    const expected = computeHotp(secret, counter);
    if (expected === String(code).trim()) return true;
  }
  return false;
}

function computeHotp(secret, counter) {
  const key = Buffer.from(base32Decode(secret));
  const msg = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    msg[i] = counter & 0xff;
    counter >>= 8;
  }
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000;
  return String(code).padStart(6, '0');
}

function base32Decode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const output = [];
  for (const c of str.replace(/=/g, '').toUpperCase()) {
    const idx = chars.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { bits -= 8; output.push((value >> bits) & 0xff); }
  }
  return Buffer.from(output);
}

router.post('/totp/setup', requireAuth, (req, res) => {
  const secret = generateTotpSecret();
  totpSecrets.set(req.user.userId, secret);
  const user = users.get(req.user.userId);
  const otpAuthUrl = `otpauth://totp/NexusAIPro:${encodeURIComponent(user?.email || req.user.email)}?secret=${secret}&issuer=NexusAIPro&algorithm=SHA1&digits=6&period=30`;
  res.json({ secret, otpAuthUrl });
});

router.post('/totp/verify', requireAuth, (req, res) => {
  const { code } = req.body;
  const secret = totpSecrets.get(req.user.userId);
  if (!secret) return res.status(400).json({ error: 'TOTP not set up for this account' });
  if (!verifyTotp(code, secret)) return res.status(401).json({ error: 'Invalid TOTP code' });
  const user = users.get(req.user.userId);
  if (user) user.mfaEnabled = true;
  res.json({ message: 'MFA enabled successfully' });
});

router.delete('/totp', requireAuth, (req, res) => {
  totpSecrets.delete(req.user.userId);
  const user = users.get(req.user.userId);
  if (user) user.mfaEnabled = false;
  res.json({ message: 'MFA disabled' });
});

// ===== WebAuthn / Passkeys (Biometrics) =====
router.post('/webauthn/register/begin', requireAuth, (req, res) => {
  const challenge = generateSecureToken(32);
  webauthnChallenges.set(req.user.userId, { challenge, expiresAt: Date.now() + 300000 });
  const user = users.get(req.user.userId);
  res.json({
    challenge,
    rp: { name: 'Nexus AI Pro', id: process.env.WEBAUTHN_RP_ID || 'localhost' },
    user: { id: Buffer.from(req.user.userId).toString('base64'), name: user?.email, displayName: user?.username },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
    timeout: 300000,
    attestation: 'none',
    authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' }
  });
});

router.post('/webauthn/register/complete', requireAuth, (req, res) => {
  const stored = webauthnChallenges.get(req.user.userId);
  if (!stored || stored.expiresAt < Date.now()) return res.status(400).json({ error: 'Challenge expired' });
  webauthnChallenges.delete(req.user.userId);
  const user = users.get(req.user.userId);
  if (user) {
    user.webauthnCredentials = user.webauthnCredentials || [];
    user.webauthnCredentials.push({ credentialId: req.body.id, registeredAt: Date.now() });
  }
  res.json({ message: 'Passkey registered successfully' });
});

// ===== Admin Routes =====
router.get('/admin/users', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const allUsers = [...users.values()].map(u => ({
    id: u.id, username: u.username, email: u.email, role: u.role,
    emailVerified: u.emailVerified, mfaEnabled: u.mfaEnabled,
    createdAt: u.createdAt, lastLogin: u.lastLogin, lockedUntil: u.lockedUntil
  }));
  const start = (page - 1) * limit;
  res.json({ users: allUsers.slice(start, start + Number(limit)), total: allUsers.length, page: Number(page) });
});

router.patch('/admin/users/:userId/role', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role' });
  user.role = role;
  res.json({ message: 'Role updated', user: { id: user.id, role: user.role } });
});

router.post('/admin/users/:userId/lock', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { durationMinutes = 60 } = req.body;
  user.lockedUntil = Date.now() + durationMinutes * 60000;
  res.json({ message: 'Account locked', lockedUntil: user.lockedUntil });
});

router.delete('/admin/users/:userId', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
  if (!users.has(req.params.userId)) return res.status(404).json({ error: 'User not found' });
  users.delete(req.params.userId);
  res.json({ message: 'User deleted' });
});

// ===== Developer Routes =====
const devApiKeys = new Map();

router.get('/dev/keys', requireAuth, requireRole(ROLES.DEV, ROLES.ADMIN), (req, res) => {
  const keys = devApiKeys.get(req.user.userId) || [];
  res.json({ keys: keys.map(k => ({ id: k.id, name: k.name, prefix: k.key.slice(0, 8) + '...', createdAt: k.createdAt })) });
});

router.post('/dev/keys', requireAuth, requireRole(ROLES.DEV, ROLES.ADMIN), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Key name required' });
  const key = `nxs_${generateSecureToken(24)}`;
  const keyEntry = { id: uuidv4(), name, key, createdAt: Date.now() };
  const existing = devApiKeys.get(req.user.userId) || [];
  existing.push(keyEntry);
  devApiKeys.set(req.user.userId, existing);
  res.status(201).json({ id: keyEntry.id, name: keyEntry.name, key, createdAt: keyEntry.createdAt, warning: 'Save this key now — it will not be shown again.' });
});

router.delete('/dev/keys/:keyId', requireAuth, requireRole(ROLES.DEV, ROLES.ADMIN), (req, res) => {
  const keys = devApiKeys.get(req.user.userId) || [];
  const updated = keys.filter(k => k.id !== req.params.keyId);
  devApiKeys.set(req.user.userId, updated);
  res.json({ message: 'API key deleted' });
});

// ===== Moderator Routes =====
const reports = new Map();

router.get('/mod/reports', requireAuth, requireRole(ROLES.MOD, ROLES.ADMIN), (req, res) => {
  const { status = 'pending' } = req.query;
  const allReports = [...reports.values()].filter(r => r.status === status);
  res.json({ reports: allReports, total: allReports.length });
});

router.patch('/mod/reports/:reportId', requireAuth, requireRole(ROLES.MOD, ROLES.ADMIN), (req, res) => {
  const report = reports.get(req.params.reportId);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  const { status, notes } = req.body;
  report.status = status;
  report.notes = notes;
  report.reviewedBy = req.user.userId;
  report.reviewedAt = Date.now();
  res.json({ report });
});

// POST /api/auth/report (any user can file a report)
router.post('/report', requireAuth, (req, res) => {
  const { contentId, contentType, reason } = req.body;
  if (!contentId || !reason) return res.status(400).json({ error: 'contentId and reason required' });
  const report = {
    id: uuidv4(),
    contentId,
    contentType,
    reason,
    reportedBy: req.user.userId,
    status: 'pending',
    createdAt: Date.now()
  };
  reports.set(report.id, report);
  res.status(201).json({ message: 'Report submitted', reportId: report.id });
});

export { router as authRouter, users };
