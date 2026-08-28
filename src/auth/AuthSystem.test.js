/**
 * src/auth/AuthSystem.test.js
 * Unit tests for AuthSystem
 * Date: 2026-08-28
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  validatePassword,
  passwordStrength,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  validateUsername,
  createUser,
  getUserByEmail,
  sanitizeUser,
  ROLES,
  hasPermission,
  PASSWORD_POLICY,
} from './AuthSystem.js';
import { v4 as uuidv4 } from 'uuid';

// ── Password policy ─────────────────────────────────────────────────────────
describe('validatePassword', () => {
  it('rejects short passwords', () => {
    const { valid, errors } = validatePassword('Short1!');
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('13'))).toBe(true);
  });

  it('rejects missing uppercase', () => {
    const { valid } = validatePassword('allowercase1234!');
    expect(valid).toBe(false);
  });

  it('rejects missing special char', () => {
    const { valid } = validatePassword('NoSpecial1234567');
    expect(valid).toBe(false);
  });

  it('accepts a strong password', () => {
    const { valid, errors } = validatePassword('MyStr0ng!Password#2026');
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('enforces minimum length of 13', () => {
    expect(PASSWORD_POLICY.minLength).toBe(13);
  });
});

describe('passwordStrength', () => {
  it('returns 0 for empty string', () => expect(passwordStrength('')).toBe(0));
  it('returns high score for strong password', () => {
    expect(passwordStrength('MyStr0ng!Password#2026')).toBeGreaterThan(80);
  });
  it('returns low score for weak password', () => {
    expect(passwordStrength('abc')).toBeLessThan(40);
  });
});

// ── Password hashing ────────────────────────────────────────────────────────
describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies correctly', async () => {
    const pw   = 'MyStr0ng!Password#2026';
    const hash = await hashPassword(pw);
    expect(hash).toContain(':');
    expect(await verifyPassword(pw, hash)).toBe(true);
    expect(await verifyPassword('wrongpassword!!XX1', hash)).toBe(false);
  });
});

// ── JWT ────────────────────────────────────────────────────────────────────
describe('signToken / verifyToken', () => {
  it('signs and verifies a token', () => {
    const payload = { sub: 'user-123', role: 'user' };
    const token   = signToken(payload, 3600);
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('user');
  });

  it('returns null for invalid token', () => {
    expect(verifyToken('bad.token.here')).toBeNull();
    expect(verifyToken('not-a-jwt')).toBeNull();
  });

  it('returns null for expired token', () => {
    const token = signToken({ sub: 'x' }, -1); // already expired
    expect(verifyToken(token)).toBeNull();
  });
});

// ── TOTP ────────────────────────────────────────────────────────────────────
describe('TOTP', () => {
  it('generates and verifies a TOTP code', () => {
    const secret = generateTotpSecret();
    const code   = generateTotp(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('rejects wrong code', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, '000000')).toBe(false);
  });
});

// ── Username validation ──────────────────────────────────────────────────────
describe('validateUsername', () => {
  it('accepts normal usernames', () => expect(validateUsername('CoolUser').valid).toBe(true));
  it('accepts emoji usernames', () => expect(validateUsername('🎮Player1').valid).toBe(true));
  it('accepts special chars', () => expect(validateUsername('user_dev.pro').valid).toBe(true));
  it('rejects too short', () => expect(validateUsername('x').valid).toBe(false));
  it('rejects too long', () => expect(validateUsername('a'.repeat(33)).valid).toBe(false));
});

// ── RBAC ────────────────────────────────────────────────────────────────────
describe('hasPermission', () => {
  it('admin has all permissions', () => {
    expect(hasPermission('admin', 'delete:users')).toBe(true);
    expect(hasPermission('admin', 'anything:atAll')).toBe(true);
  });
  it('user has read:own', () => {
    expect(hasPermission('user', 'read:own')).toBe(true);
    expect(hasPermission('user', 'delete:users')).toBe(false);
  });
  it('moderator has read:*', () => {
    expect(hasPermission('moderator', 'read:users')).toBe(true);
    expect(hasPermission('moderator', 'read:content')).toBe(true);
    expect(hasPermission('moderator', 'deploy:anything')).toBe(false);
  });
});

// ── User store ──────────────────────────────────────────────────────────────
describe('User store', () => {
  it('creates and retrieves a user', () => {
    const id   = uuidv4();
    const user = createUser({
      id, email: `test+${id.slice(0,4)}@example.com`,
      username: 'TestUser', passwordHash: 'hash:123', role: ROLES.USER,
    });
    expect(user.id).toBe(id);
    expect(user.passwordHash).toBeUndefined(); // sanitized
    expect(getUserByEmail(`test+${id.slice(0,4)}@example.com`)).not.toBeNull();
  });

  it('sanitizeUser removes sensitive fields', () => {
    const safe = sanitizeUser({ id: 'x', email: 'e', passwordHash: 'h', totpSecret: 't' });
    expect(safe.passwordHash).toBeUndefined();
    expect(safe.totpSecret).toBeUndefined();
    expect(safe.email).toBe('e');
  });
});
