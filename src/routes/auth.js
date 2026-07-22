// src/routes/auth.js
// 2026-07-22 | Auth routes — register, login, refresh, MFA, biometrics, logout

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  validatePasswordStrength,
  validateUsername,
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateTotpSecret,
  generateTotpQr,
  verifyTotp,
  generateBiometricChallenge,
  generateSecureToken,
  ROLES,
} from '../auth/authService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// In-memory user store (replace with pg in production — see init.sql).
// Keyed by userId for O(1) lookup.
const userStore = new Map();
const emailIndex = new Map(); // email → userId
const refreshTokenStore = new Set();

function findByEmail(email) {
  const id = emailIndex.get(email.toLowerCase());
  return id ? userStore.get(id) : null;
}

// ─── Register ─────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { email, password, username, role, language = 'en', region = 'US' } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'email, password, and username are required' });
    }

    const emailNorm = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.reason });

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.reason });

    if (findByEmail(emailNorm)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Only allow 'user' role on public registration; admin must be seeded separately
    const assignedRole = role === ROLES.USER ? ROLES.USER : ROLES.USER;
    const hash = await hashPassword(password);
    const userId = uuidv4();

    const user = {
      id: userId,
      email: emailNorm,
      username,
      passwordHash: hash,
      role: assignedRole,
      language,
      region,
      mfaEnabled: false,
      mfaSecret: null,
      biometricKeys: [],
      emailVerified: false,
      verificationToken: generateSecureToken(),
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };

    userStore.set(userId, user);
    emailIndex.set(emailNorm, userId);

    const accessToken = signAccessToken({ sub: userId, role: user.role, email: emailNorm });
    const refreshToken = signRefreshToken({ sub: userId });
    refreshTokenStore.add(refreshToken);

    return res.status(201).json({
      user: sanitize(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password, totpToken } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const emailNorm = email.toLowerCase().trim();
    const user = findByEmail(emailNorm);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.mfaEnabled) {
      if (!totpToken) return res.status(200).json({ mfaRequired: true });
      const ok = verifyTotp(user.mfaSecret, totpToken);
      if (!ok) return res.status(401).json({ error: 'Invalid MFA token' });
    }

    user.lastLogin = new Date().toISOString();
    userStore.set(user.id, user);

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: emailNorm });
    const refreshToken = signRefreshToken({ sub: user.id });
    refreshTokenStore.add(refreshToken);

    return res.json({ user: sanitize(user), accessToken, refreshToken });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Refresh token ────────────────────────────────────────────────────────────

router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || !refreshTokenStore.has(refreshToken)) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    const payload = verifyRefreshToken(refreshToken);
    const user = userStore.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    refreshTokenStore.delete(refreshToken);
    const newAccess = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const newRefresh = signRefreshToken({ sub: user.id });
    refreshTokenStore.add(newRefresh);

    return res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ error: 'Refresh failed' });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

router.post('/logout', authenticate, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokenStore.delete(refreshToken);
  return res.json({ success: true });
});

// ─── Profile ──────────────────────────────────────────────────────────────────

router.get('/me', authenticate, (req, res) => {
  const user = userStore.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(sanitize(user));
});

// ─── MFA setup ────────────────────────────────────────────────────────────────

router.post('/mfa/setup', authenticate, async (req, res) => {
  try {
    const user = userStore.get(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.mfaEnabled) return res.status(409).json({ error: 'MFA already enabled' });

    const { totp, secret } = generateTotpSecret(user.username);
    const qrCodeUrl = await generateTotpQr(totp);

    // Store pending secret (not yet enabled until verified)
    user.pendingMfaSecret = secret;
    userStore.set(user.id, user);

    return res.json({ secret, qrCodeUrl });
  } catch {
    return res.status(500).json({ error: 'MFA setup failed' });
  }
});

router.post('/mfa/verify-setup', authenticate, (req, res) => {
  const user = userStore.get(req.user.sub);
  if (!user || !user.pendingMfaSecret) {
    return res.status(400).json({ error: 'No pending MFA setup' });
  }
  const { token } = req.body;
  if (!verifyTotp(user.pendingMfaSecret, token)) {
    return res.status(401).json({ error: 'Invalid TOTP token' });
  }
  user.mfaSecret = user.pendingMfaSecret;
  user.mfaEnabled = true;
  delete user.pendingMfaSecret;
  userStore.set(user.id, user);
  return res.json({ success: true });
});

router.delete('/mfa', authenticate, async (req, res) => {
  const user = userStore.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password } = req.body;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid password' });
  user.mfaEnabled = false;
  user.mfaSecret = null;
  userStore.set(user.id, user);
  return res.json({ success: true });
});

// ─── Biometric challenge ──────────────────────────────────────────────────────

router.post('/biometric/challenge', (req, res) => {
  const challenge = generateBiometricChallenge();
  // In production: store challenge server-side for 60s and validate on assert
  return res.json({ challenge });
});

// ─── Password change ──────────────────────────────────────────────────────────

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const user = userStore.get(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { currentPassword, newPassword } = req.body;
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password incorrect' });

    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.reason });

    user.passwordHash = await hashPassword(newPassword);
    userStore.set(user.id, user);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Password change failed' });
  }
});

// ─── Admin: list users ────────────────────────────────────────────────────────

router.get('/users', authenticate, (req, res) => {
  if (!['admin', 'dev'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const users = Array.from(userStore.values()).map(sanitize);
  return res.json({ users, total: users.length });
});

// ─── Admin: update user role ──────────────────────────────────────────────────

router.patch('/users/:id/role', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const user = userStore.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  user.role = role;
  userStore.set(user.id, user);
  return res.json(sanitize(user));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(user) {
  const { passwordHash, mfaSecret, pendingMfaSecret, verificationToken, ...safe } = user;
  return safe;
}

export { userStore, emailIndex };
export default router;
