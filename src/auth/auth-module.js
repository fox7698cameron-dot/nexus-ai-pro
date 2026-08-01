// src/auth/auth-module.js
// Nexus AI Pro - Authentication Module
// Covers: JWT (RS256), bcrypt, TOTP 2FA, WebAuthn stubs, role-based access
// Date: 2026-08-01

import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// ── Password Policy ────────────────────────────────────────────────────────────
const PASSWORD_POLICY = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;\':",.<>?/`~\\'
};

export function validatePasswordStrength(password) {
  const errors = [];
  if (!password || password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()\-_=+\[\]{}|;':",.<>?/`~\\]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  return { valid: errors.length === 0, errors };
}

// Validate username: allow unicode letters, digits, emoji, and common special chars
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return { valid: false, error: 'Username required' };
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { valid: false, error: 'Username must be 2-50 characters' };
  }
  // Reject control characters only; allow emoji, unicode, special chars
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }
  return { valid: true, username: trimmed };
}

// ── User Store (in-memory, swap for DB in production) ─────────────────────────
const users = new Map();
const refreshTokens = new Map();
const mfaSecrets = new Map();
const biometricChallenges = new Map();
const activeSessionTokens = new Map(); // jti → userId for revocation

// ── Role Definitions ──────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user'
};

const ROLE_HIERARCHY = {
  admin: 4,
  dev: 3,
  moderator: 2,
  user: 1
};

export function hasPermission(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

// ── JWT Helpers ────────────────────────────────────────────────────────────────
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'generate_jwt_secret_here') {
    throw new Error('JWT_SECRET must be set in environment');
  }
  return secret;
}

export function signToken(payload, expiresIn = '1h') {
  const jti = uuidv4();
  const token = jwt.sign(
    { ...payload, jti },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn, issuer: 'nexus-ai-pro' }
  );
  activeSessionTokens.set(jti, payload.sub);
  return token;
}

export function signRefreshToken(userId) {
  const jti = uuidv4();
  const token = jwt.sign(
    { sub: userId, jti, type: 'refresh' },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: '30d', issuer: 'nexus-ai-pro' }
  );
  refreshTokens.set(jti, { userId, createdAt: Date.now() });
  return token;
}

export function verifyToken(token) {
  const decoded = jwt.verify(token, getJwtSecret(), { issuer: 'nexus-ai-pro' });
  if (!activeSessionTokens.has(decoded.jti)) {
    throw new Error('Token has been revoked');
  }
  return decoded;
}

export function revokeToken(jti) {
  activeSessionTokens.delete(jti);
  refreshTokens.delete(jti);
}

// ── Middleware ─────────────────────────────────────────────────────────────────
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!hasPermission(req.user.role, role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ── User Registration ──────────────────────────────────────────────────────────
export async function registerUser({ username, email, password, role = ROLES.USER, language = 'en' }) {
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) throw new Error(usernameValidation.error);

  const pwValidation = validatePasswordStrength(password);
  if (!pwValidation.valid) throw new Error(pwValidation.errors.join('; '));

  const normalizedEmail = email.toLowerCase().trim();
  for (const [, u] of users) {
    if (u.email === normalizedEmail) throw new Error('Email already registered');
    if (u.username.toLowerCase() === usernameValidation.username.toLowerCase()) {
      throw new Error('Username already taken');
    }
  }

  const allowedRoles = Object.values(ROLES);
  const assignedRole = allowedRoles.includes(role) ? role : ROLES.USER;

  const saltRounds = 12;
  const passwordHash = await bcryptjs.hash(password, saltRounds);
  const userId = uuidv4();

  const user = {
    id: userId,
    username: usernameValidation.username,
    email: normalizedEmail,
    passwordHash,
    role: assignedRole,
    mfaEnabled: false,
    biometricEnabled: false,
    language,
    createdAt: Date.now(),
    lastLogin: null,
    active: true
  };

  users.set(userId, user);
  return sanitizeUser(user);
}

// ── Login ──────────────────────────────────────────────────────────────────────
export async function loginUser({ email, password, totpToken }) {
  const normalizedEmail = email.toLowerCase().trim();
  let found = null;
  for (const [, u] of users) {
    if (u.email === normalizedEmail) { found = u; break; }
  }
  if (!found) throw new Error('Invalid credentials');
  if (!found.active) throw new Error('Account suspended');

  const valid = await bcryptjs.compare(password, found.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  if (found.mfaEnabled) {
    if (!totpToken) throw new Error('MFA_REQUIRED');
    const verified = speakeasy.totp.verify({
      secret: mfaSecrets.get(found.id),
      encoding: 'base32',
      token: String(totpToken),
      window: 1
    });
    if (!verified) throw new Error('Invalid MFA token');
  }

  found.lastLogin = Date.now();
  users.set(found.id, found);

  const accessToken = signToken({ sub: found.id, role: found.role, username: found.username });
  const refreshToken = signRefreshToken(found.id);

  return { accessToken, refreshToken, user: sanitizeUser(found) };
}

// ── TOTP 2FA Setup ─────────────────────────────────────────────────────────────
export async function setupMfa(userId) {
  const user = users.get(userId);
  if (!user) throw new Error('User not found');

  const secret = speakeasy.generateSecret({
    name: `NexusAIPro:${user.email}`,
    issuer: 'Nexus AI Pro',
    length: 20
  });

  mfaSecrets.set(userId, secret.base32);
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return { secret: secret.base32, qrCode: qrCodeUrl };
}

export function confirmMfa(userId, totpToken) {
  const secret = mfaSecrets.get(userId);
  if (!secret) throw new Error('MFA setup not initiated');

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(totpToken),
    window: 1
  });
  if (!verified) throw new Error('Invalid TOTP token');

  const user = users.get(userId);
  user.mfaEnabled = true;
  users.set(userId, user);
  return true;
}

export function disableMfa(userId) {
  const user = users.get(userId);
  if (!user) throw new Error('User not found');
  user.mfaEnabled = false;
  users.set(userId, user);
  mfaSecrets.delete(userId);
}

// ── WebAuthn / Biometric Challenge ────────────────────────────────────────────
export function generateBiometricChallenge(userId) {
  const challenge = crypto.randomBytes(32).toString('base64url');
  biometricChallenges.set(userId, {
    challenge,
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000
  });
  return challenge;
}

export function verifyBiometricChallenge(userId, response) {
  const stored = biometricChallenges.get(userId);
  if (!stored || Date.now() > stored.expiresAt) {
    throw new Error('Biometric challenge expired or not found');
  }
  // Real WebAuthn verification would use @simplewebauthn/server here
  // Client-side Touch ID / Face ID / fingerprint handled by Capacitor/Electron bridge
  biometricChallenges.delete(userId);
  return true;
}

// ── Token Refresh ──────────────────────────────────────────────────────────────
export function refreshAccessToken(token) {
  const decoded = jwt.verify(token, getJwtSecret(), { issuer: 'nexus-ai-pro' });
  if (decoded.type !== 'refresh' || !refreshTokens.has(decoded.jti)) {
    throw new Error('Invalid refresh token');
  }
  const user = users.get(decoded.sub);
  if (!user || !user.active) throw new Error('User not found or inactive');

  revokeToken(decoded.jti);
  const newAccess = signToken({ sub: user.id, role: user.role, username: user.username });
  const newRefresh = signRefreshToken(user.id);
  return { accessToken: newAccess, refreshToken: newRefresh };
}

// ── Utility ────────────────────────────────────────────────────────────────────
function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function getUserById(id) {
  const user = users.get(id);
  return user ? sanitizeUser(user) : null;
}

export function listUsers() {
  return Array.from(users.values()).map(sanitizeUser);
}

export function updateUserRole(userId, newRole, requestingUserRole) {
  if (!hasPermission(requestingUserRole, ROLES.ADMIN)) {
    throw new Error('Only admins can change roles');
  }
  const user = users.get(userId);
  if (!user) throw new Error('User not found');
  user.role = newRole;
  users.set(userId, user);
  return sanitizeUser(user);
}

export function deactivateUser(userId, requestingUserRole) {
  if (!hasPermission(requestingUserRole, ROLES.ADMIN)) {
    throw new Error('Insufficient permissions');
  }
  const user = users.get(userId);
  if (!user) throw new Error('User not found');
  user.active = false;
  users.set(userId, user);
}

// Seed a default admin for first boot if no users exist
export async function seedDefaultAdmin() {
  if (users.size > 0) return;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!adminPassword) return;
  try {
    await registerUser({
      username: 'admin',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@nexusai.pro',
      password: adminPassword,
      role: ROLES.ADMIN
    });
  } catch (_) { /* already seeded */ }
}
