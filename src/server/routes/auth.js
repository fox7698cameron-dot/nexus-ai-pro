// auth.js - 2026-10-07
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────
const usernameSchema = z.string()
  .min(3, 'Username too short (min 3)')
  .max(50, 'Username too long (max 50)')
  .regex(/^[\p{L}\p{N}\p{Emoji_Presentation}\p{Emoji}️\s_\-\.]+$/u, 'Username contains invalid characters');

const passwordSchema = z.string()
  .min(13, 'Password must be at least 13 characters')
  .refine(p => /[A-Z]/.test(p), 'Password must contain an uppercase letter')
  .refine(p => /[a-z]/.test(p), 'Password must contain a lowercase letter')
  .refine(p => /\d/.test(p), 'Password must contain a number')
  .refine(p => /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?/~`\\^]/.test(p), 'Password must contain a special character');

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email('Invalid email'),
  password: passwordSchema,
  role: z.enum(['admin', 'developer', 'moderator', 'user']).default('user'),
  language: z.string().max(10).default('en')
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email required'),
  password: z.string().min(1, 'Password required')
});

// ── Helpers ─────────────────────────────────────────────────────────
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return secret;
}

function signToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, getJWTSecret(), {
    algorithm: 'HS512',
    expiresIn,
    issuer: 'nexus-ai-pro'
  });
}

function verifyToken(token) {
  return jwt.verify(token, getJWTSecret(), {
    algorithms: ['HS512'],
    issuer: 'nexus-ai-pro'
  });
}

// Generate cryptographically secure session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Enumerate-safe user ID (opaque, non-sequential)
function generateUserId() {
  const prefix = 'usr';
  const bytes = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${bytes}`;
}

// Minimal audit log entry
function auditLog(event, userId, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    userId,
    ip: meta.ip || 'unknown'
  };
  // In production: write to append-only audit store (Redis, DB, etc.)
  // Log at info level only; no PII beyond userId/event
  console.info('[AUDIT]', JSON.stringify(entry));
}

// ── In-memory store (replace with DB in production) ─────────────────
// User store: Map<userId, userRecord>
const users = new Map();
// Username index: Map<lowerUsername, userId>
const usernameIndex = new Map();
// Email index: Map<lowerEmail, userId>
const emailIndex = new Map();
// MFA pending sessions: Map<sessionToken, { userId, expiresAt }>
const mfaSessions = new Map();
// Active biometric registrations: Map<userId, credentialId>
const biometricStore = new Map();

// ── Routes ───────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { username, email, password, role, language } = parsed.data;

    // Prevent admin self-registration (must be provisioned by existing admin)
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts must be provisioned by an existing admin' });
    }

    const lowerUser = username.toLowerCase();
    const lowerEmail = email.toLowerCase();

    if (usernameIndex.has(lowerUser)) return res.status(409).json({ error: 'Username already taken' });
    if (emailIndex.has(lowerEmail)) return res.status(409).json({ error: 'Email already registered' });

    // bcrypt with rounds = 13 (sufficient security, reasonable latency)
    const passwordHash = await bcrypt.hash(password, 13);
    const userId = generateUserId();

    const user = {
      id: userId,
      username,
      email: lowerEmail,
      passwordHash,
      role,
      language,
      mfaEnabled: false,
      mfaSecret: null,
      biometricEnabled: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      active: true
    };

    users.set(userId, user);
    usernameIndex.set(lowerUser, userId);
    emailIndex.set(lowerEmail, userId);

    auditLog('REGISTER', userId, { ip: req.ip, role });

    // Return session token for 2FA setup flow
    const sessionToken = generateSessionToken();
    mfaSessions.set(sessionToken, { userId, expiresAt: Date.now() + 10 * 60 * 1000, purpose: 'setup' });

    res.status(201).json({
      message: 'Account created',
      sessionToken,
      mfaRequired: false,
      userId
    });
  } catch (err) {
    console.error('[auth/register]', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { identifier, password } = parsed.data;

    const lower = identifier.toLowerCase();
    const userId = usernameIndex.get(lower) || emailIndex.get(lower);

    // Use constant-time comparison to prevent timing attacks
    const dummyHash = '$2a$13$invalidhashfortimingnormalization00000000000000000000';
    const user = userId ? users.get(userId) : null;
    const hashToCheck = user?.passwordHash || dummyHash;
    const match = await bcrypt.compare(password, hashToCheck);

    if (!user || !match || !user.active) {
      auditLog('LOGIN_FAIL', userId || 'unknown', { ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date().toISOString();
    auditLog('LOGIN_SUCCESS', userId, { ip: req.ip });

    if (user.mfaEnabled) {
      const sessionToken = generateSessionToken();
      mfaSessions.set(sessionToken, { userId, expiresAt: Date.now() + 5 * 60 * 1000, purpose: 'mfa' });
      return res.json({ mfaRequired: true, sessionToken });
    }

    const token = signToken({ sub: userId, role: user.role, username: user.username });
    res.json({
      token,
      user: {
        id: userId,
        username: user.username,
        role: user.role,
        language: user.language,
        mfaEnabled: user.mfaEnabled
      }
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', async (req, res) => {
  try {
    const { sessionToken, code } = req.body;
    if (!sessionToken || !code) return res.status(400).json({ error: 'sessionToken and code required' });

    const session = mfaSessions.get(sessionToken);
    if (!session || session.expiresAt < Date.now() || session.purpose !== 'mfa') {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = users.get(session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // In production: verify TOTP code against user.mfaSecret using a TOTP library
    // For MVP: accept any 6-digit code
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Invalid code format' });

    mfaSessions.delete(sessionToken);
    auditLog('MFA_SUCCESS', session.userId, { ip: req.ip });

    const token = signToken({ sub: session.userId, role: user.role, username: user.username });
    res.json({
      token,
      user: { id: session.userId, username: user.username, role: user.role, language: user.language, mfaEnabled: user.mfaEnabled }
    });
  } catch (err) {
    console.error('[auth/mfa/verify]', err.message);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', async (req, res) => {
  try {
    const { sessionToken, method } = req.body;
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken required' });

    const session = mfaSessions.get(sessionToken);
    if (!session || session.expiresAt < Date.now()) return res.status(401).json({ error: 'Invalid or expired session' });

    const user = users.get(session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate TOTP secret (in production: use otpauth or speakeasy library)
    const totpSecret = crypto.randomBytes(20).toString('base32');
    user.mfaSecret = totpSecret;
    user.mfaEnabled = true;
    user.mfaMethod = method || 'totp';

    auditLog('MFA_SETUP', session.userId, { ip: req.ip, method });
    res.json({ message: 'MFA configured', totpSecret });
  } catch (err) {
    console.error('[auth/mfa/setup]', err.message);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const decoded = verifyToken(token);
    const user = users.get(decoded.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'Invalid token' });

    const newToken = signToken({ sub: decoded.sub, role: decoded.role, username: decoded.username });
    res.json({ token: newToken });
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // With stateless JWT, logout is handled client-side
  // In production: maintain a token revocation list (Redis set with TTL)
  auditLog('LOGOUT', 'session', { ip: req.ip });
  res.json({ message: 'Logged out' });
});

// POST /api/auth/biometric/register
router.post('/biometric/register', (req, res) => {
  try {
    const { userId, credentialId, publicKey } = req.body;
    if (!userId || !credentialId || !publicKey) return res.status(400).json({ error: 'Missing fields' });

    const user = users.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    biometricStore.set(userId, { credentialId, publicKey, registeredAt: new Date().toISOString() });
    user.biometricEnabled = true;

    auditLog('BIOMETRIC_REGISTER', userId, { ip: req.ip });
    res.json({ message: 'Biometric credential registered' });
  } catch (err) {
    console.error('[auth/biometric/register]', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Middleware: verify JWT token
export function requireAuth(roles = []) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authorization required' });

      const token = authHeader.slice(7);
      const decoded = verifyToken(token);
      const user = users.get(decoded.sub);

      if (!user || !user.active) return res.status(401).json({ error: 'Account inactive' });
      if (roles.length > 0 && !roles.includes(decoded.role)) return res.status(403).json({ error: 'Insufficient permissions' });

      req.user = { id: decoded.sub, role: decoded.role, username: decoded.username };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export default router;
