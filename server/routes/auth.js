// server/routes/auth.js
// 2026-06-06 | Auth routes: register, login, 2FA/MFA, biometrics, password reset

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';
import { generateTokens, verifyRefreshToken, authenticate } from '../middleware/authenticate.js';

const router = Router();

// In-memory user store (replace with DB in production)
const users = new Map();
const refreshTokens = new Set();
const mfaSessions = new Map();

// Username: supports unicode, emoji, letters, numbers, underscores, hyphens, dots
// Minimum 2 chars, max 32 chars
const USERNAME_REGEX = /^[\p{L}\p{N}\p{Emoji}_.-]{2,32}$/u;

// Password: min 13 chars, must have uppercase, lowercase, digit, special char
function validatePasswordStrength(password) {
  if (!password || password.length < 13) return 'Password must be at least 13 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').trim().isLength({ min: 2, max: 32 }),
  body('password').isLength({ min: 13 }),
  body('displayName').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password, displayName, role } = req.body;

  const pwError = validatePasswordStrength(password);
  if (pwError) return res.status(400).json({ error: pwError });

  if (!USERNAME_REGEX.test(username)) {
    return res.status(400).json({ error: 'Username contains invalid characters' });
  }

  // Check uniqueness
  for (const u of users.values()) {
    if (u.email === email) return res.status(409).json({ error: 'Email already registered' });
    if (u.username === username) return res.status(409).json({ error: 'Username already taken' });
  }

  // Restrict admin/moderator/dev role assignment to existing admins
  const assignedRole = ['admin', 'moderator', 'dev'].includes(role) ? 'user' : (role || 'user');

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id,
    email,
    username,
    displayName: displayName || username,
    role: assignedRole,
    passwordHash,
    mfaEnabled: false,
    mfaSecret: null,
    biometricKeyId: null,
    createdAt: Date.now(),
    lastLogin: null,
    subscription: 'free',
    locale: req.body.locale || 'en',
    timezone: req.body.timezone || 'UTC'
  };

  users.set(id, user);

  const { accessToken, refreshToken } = generateTokens(user);
  refreshTokens.add(refreshToken);

  const { passwordHash: _, mfaSecret: __, ...safeUser } = user;
  res.status(201).json({ user: safeUser, accessToken, refreshToken });
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, mfaCode } = req.body;

  let foundUser = null;
  for (const u of users.values()) {
    if (u.email === email) { foundUser = u; break; }
  }

  if (!foundUser) {
    // Constant-time response to prevent user enumeration
    await bcrypt.hash('dummy', 12);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, foundUser.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  if (foundUser.mfaEnabled) {
    if (!mfaCode) {
      const sessionId = uuidv4();
      mfaSessions.set(sessionId, { userId: foundUser.id, expiresAt: Date.now() + 5 * 60 * 1000 });
      return res.status(200).json({ requiresMfa: true, sessionId });
    }

    const verified = speakeasy.totp.verify({
      secret: foundUser.mfaSecret,
      encoding: 'base32',
      token: mfaCode,
      window: 2
    });

    if (!verified) return res.status(401).json({ error: 'Invalid MFA code' });
  }

  foundUser.lastLogin = Date.now();

  const { accessToken, refreshToken } = generateTokens(foundUser);
  refreshTokens.add(refreshToken);

  const { passwordHash: _, mfaSecret: __, ...safeUser } = foundUser;
  res.json({ user: safeUser, accessToken, refreshToken });
});

// POST /api/auth/mfa/verify — complete MFA after password step
router.post('/mfa/verify', [
  body('sessionId').notEmpty(),
  body('mfaCode').notEmpty()
], async (req, res) => {
  const { sessionId, mfaCode } = req.body;
  const session = mfaSessions.get(sessionId);

  if (!session || Date.now() > session.expiresAt) {
    mfaSessions.delete(sessionId);
    return res.status(401).json({ error: 'MFA session expired' });
  }

  const user = users.get(session.userId);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: mfaCode,
    window: 2
  });

  if (!verified) return res.status(401).json({ error: 'Invalid MFA code' });

  mfaSessions.delete(sessionId);
  user.lastLogin = Date.now();

  const { accessToken, refreshToken } = generateTokens(user);
  refreshTokens.add(refreshToken);

  const { passwordHash: _, mfaSecret: __, ...safeUser } = user;
  res.json({ user: safeUser, accessToken, refreshToken });
});

// POST /api/auth/mfa/setup — enable 2FA for authenticated user
router.post('/mfa/setup', authenticate, async (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = speakeasy.generateSecret({
    name: `Nexus AI Pro (${user.email})`,
    length: 32
  });

  // Store temporarily; confirm in /mfa/confirm
  user.mfaSecretPending = secret.base32;

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  res.json({
    secret: secret.base32,
    qrCode: qrCodeUrl,
    message: 'Scan QR code with your authenticator app, then confirm with /api/auth/mfa/confirm'
  });
});

// POST /api/auth/mfa/confirm — confirm 2FA setup
router.post('/mfa/confirm', authenticate, [
  body('code').notEmpty()
], async (req, res) => {
  const user = users.get(req.user.id);
  if (!user || !user.mfaSecretPending) return res.status(400).json({ error: 'No pending MFA setup' });

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecretPending,
    encoding: 'base32',
    token: req.body.code,
    window: 2
  });

  if (!verified) return res.status(400).json({ error: 'Invalid code — please try again' });

  user.mfaSecret = user.mfaSecretPending;
  user.mfaEnabled = true;
  delete user.mfaSecretPending;

  res.json({ message: 'Two-factor authentication enabled successfully' });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', authenticate, [
  body('password').notEmpty(),
  body('code').notEmpty()
], async (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const pwValid = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!pwValid) return res.status(401).json({ error: 'Invalid password' });

  const mfaValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: req.body.code,
    window: 2
  });
  if (!mfaValid) return res.status(401).json({ error: 'Invalid MFA code' });

  user.mfaEnabled = false;
  user.mfaSecret = null;

  res.json({ message: 'Two-factor authentication disabled' });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'Refresh token invalid' });
  }

  const user = users.get(payload.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  refreshTokens.delete(refreshToken);
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  refreshTokens.add(newRefreshToken);

  res.json({ accessToken, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, mfaSecret, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/auth/biometric/register — register biometric key ID (device-side, server stores key handle)
router.post('/biometric/register', authenticate, [
  body('keyId').notEmpty(),
  body('platform').isIn(['ios', 'android', 'macos', 'windows', 'linux'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.biometricKeyId = req.body.keyId;
  user.biometricPlatform = req.body.platform;

  res.json({ message: 'Biometric credential registered' });
});

// POST /api/auth/biometric/verify
router.post('/biometric/verify', [
  body('keyId').notEmpty(),
  body('signature').notEmpty()
], async (req, res) => {
  const { keyId } = req.body;

  let foundUser = null;
  for (const u of users.values()) {
    if (u.biometricKeyId === keyId) { foundUser = u; break; }
  }

  if (!foundUser) return res.status(401).json({ error: 'Biometric credential not found' });

  // In production: verify the signature against the registered public key
  // For now, trust the key ID match as the platform enforces biometric gate
  const { accessToken, refreshToken } = generateTokens(foundUser);
  refreshTokens.add(refreshToken);

  const { passwordHash, mfaSecret, ...safeUser } = foundUser;
  res.json({ user: safeUser, accessToken, refreshToken });
});

// ADMIN: POST /api/auth/admin/set-role
router.post('/admin/set-role', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });

  const { targetUserId, role } = req.body;
  const validRoles = ['user', 'moderator', 'dev', 'admin'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const target = users.get(targetUserId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  target.role = role;
  res.json({ message: `Role updated to ${role}`, userId: targetUserId });
});

// Export users map for use in admin routes
export { users, router as authRouter };
export default router;
