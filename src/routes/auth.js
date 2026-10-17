// src/routes/auth.js
// Nexus AI Pro - Authentication Routes
// © 2025-2026 Cameron Fox. All rights reserved.
// Updated: 2026-10-17

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  hashPassword, verifyPassword, validatePassword,
  generateTokenPair, verifyRefreshToken, verifyJWT
} from '../middleware/auth.js';

const router = Router();

// In-memory user store - TODO: replace with persistent DB (Redis/Postgres)
const users = new Map();
const refreshTokens = new Set();

// Username validation: allow unicode, emoji, special chars, 2-32 chars
function validateUsername(username) {
  if (!username || typeof username !== 'string') return { valid: false, error: 'Username required' };
  const len = [...username].length; // count Unicode codepoints, not bytes
  if (len < 2 || len > 32) return { valid: false, error: 'Username must be 2-32 characters' };
  // Block only truly dangerous chars: null bytes, control chars
  if (/[\x00-\x1F\x7F]/.test(username)) return { valid: false, error: 'Username contains invalid characters' };
  return { valid: true };
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) ? { valid: true } : { valid: false, error: 'Invalid email format' };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, language = 'en', region } = req.body;

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) return res.status(400).json({ error: usernameCheck.error });

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) return res.status(400).json({ error: emailCheck.error });

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) return res.status(400).json({ errors: passwordCheck.errors });

    const emailKey = email.toLowerCase();
    for (const u of users.values()) {
      if (u.email === emailKey) return res.status(409).json({ error: 'Email already registered' });
      if (u.username.toLowerCase() === username.toLowerCase()) return res.status(409).json({ error: 'Username taken' });
    }

    const id = uuidv4();
    const hashedPw = await hashPassword(password);
    const role = users.size === 0 ? 'admin' : 'user'; // first user is admin

    users.set(id, {
      id, username, email: emailKey,
      password: hashedPw, role, language, region,
      mfaEnabled: false, mfaSecret: null,
      createdAt: Date.now(), lastLogin: null
    });

    const { accessToken, refreshToken } = generateTokenPair(id, role);
    refreshTokens.add(refreshToken);

    res.status(201).json({
      user: { id, username, email: emailKey, role, language, region },
      accessToken,
      refreshToken
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Credentials required' });

    let user = null;
    const idLower = identifier.toLowerCase();
    for (const u of users.values()) {
      if (u.email === idLower || u.username.toLowerCase() === idLower) {
        user = u;
        break;
      }
    }
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await verifyPassword(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    user.lastLogin = Date.now();

    if (user.mfaEnabled) {
      // Issue partial token requiring MFA
      const partial = generateTokenPair(user.id, user.role, false);
      refreshTokens.add(partial.refreshToken);
      return res.json({
        requiresMFA: true,
        partialToken: partial.accessToken,
        mfaMethods: ['totp']
      });
    }

    const { accessToken, refreshToken } = generateTokenPair(user.id, user.role, true);
    refreshTokens.add(refreshToken);

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      accessToken, refreshToken
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = users.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    refreshTokens.delete(refreshToken);
    const tokens = generateTokenPair(user.id, user.role, true);
    refreshTokens.add(tokens.refreshToken);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
});

// POST /api/auth/logout
router.post('/logout', verifyJWT, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', verifyJWT, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// POST /api/auth/mfa/enable
router.post('/mfa/enable', verifyJWT, (req, res) => {
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // In production: generate real TOTP secret using otplib
  const secret = Buffer.from(`NEXUS-${user.id}-${Date.now()}`).toString('base64');
  user.mfaSecret = secret;
  user.mfaEnabled = true;
  res.json({ success: true, secret, qrCodeUrl: `otpauth://totp/NexusAIPro:${user.email}?secret=${secret}&issuer=NexusAIPro` });
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', verifyJWT, (req, res) => {
  const { code } = req.body;
  // Placeholder: in production verify TOTP code against user.mfaSecret using otplib
  if (!code || code.length !== 6) return res.status(400).json({ error: 'Invalid code' });
  const { accessToken, refreshToken } = generateTokenPair(req.user.id, req.user.role, true);
  refreshTokens.add(refreshToken);
  res.json({ accessToken, refreshToken, mfaVerified: true });
});

// POST /api/auth/password/change
router.post('/password/change', verifyJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ok = await verifyPassword(currentPassword, user.password);
  if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
  const check = validatePassword(newPassword);
  if (!check.valid) return res.status(400).json({ errors: check.errors });
  user.password = await hashPassword(newPassword);
  res.json({ success: true });
});

export { users };
export default router;
