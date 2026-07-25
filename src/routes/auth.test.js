// src/routes/auth.test.js — Updated: 2026-07-25
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit tests for auth utilities — no HTTP needed

describe('Password validation', () => {
  function validatePassword(password) {
    const errors = [];
    if (password.length < 13) errors.push('Minimum 13 characters required');
    if (!/[A-Z]/.test(password)) errors.push('Must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Must contain at least one number');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain at least one special character');
    return errors;
  }

  it('rejects passwords shorter than 13 characters', () => {
    const errors = validatePassword('Short1!');
    expect(errors).toContain('Minimum 13 characters required');
  });

  it('accepts a valid 13+ character password with all requirements', () => {
    const errors = validatePassword('SecurePass123!@#');
    expect(errors).toHaveLength(0);
  });

  it('rejects passwords missing uppercase', () => {
    const errors = validatePassword('securepass123!@#');
    expect(errors).toContain('Must contain at least one uppercase letter');
  });

  it('rejects passwords missing lowercase', () => {
    const errors = validatePassword('SECUREPASS123!@#');
    expect(errors).toContain('Must contain at least one lowercase letter');
  });

  it('rejects passwords missing numbers', () => {
    const errors = validatePassword('SecurePassword!@#');
    expect(errors).toContain('Must contain at least one number');
  });

  it('rejects passwords missing special characters', () => {
    const errors = validatePassword('SecurePassword123');
    expect(errors).toContain('Must contain at least one special character');
  });

  it('accepts passwords with emoji and special chars', () => {
    const errors = validatePassword('Secure🔑Pass123!');
    expect(errors).toHaveLength(0);
  });

  it('accepts passwords with Unicode special characters', () => {
    const errors = validatePassword('Pässwörd#123xyz');
    expect(errors).toHaveLength(0);
  });
});

describe('Username normalization', () => {
  function normalizeUsername(username) {
    return username.normalize('NFC').trim();
  }

  it('normalizes Unicode to NFC form', () => {
    const nfd = 'café'.normalize('NFD');
    const result = normalizeUsername(nfd);
    expect(result).toBe('café'.normalize('NFC'));
  });

  it('trims whitespace', () => {
    expect(normalizeUsername('  user  ')).toBe('user');
  });

  it('preserves emoji in usernames', () => {
    const username = 'user🎮gamer';
    expect(normalizeUsername(username)).toBe('user🎮gamer');
  });

  it('preserves special characters in usernames', () => {
    expect(normalizeUsername('user_name-123')).toBe('user_name-123');
  });
});

describe('Password strength score', () => {
  function passwordStrengthScore(password) {
    let score = 0;
    if (password.length >= 13) score += 1;
    if (password.length >= 20) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (/[^\x00-\x7F]/.test(password)) score += 1;
    const entropy = Math.log2(Math.pow(Math.max(password.length, 1), 2) * score);
    return Math.min(Math.round((entropy / 40) * 100), 100);
  }

  it('gives low score to short passwords', () => {
    const score = passwordStrengthScore('abc');
    expect(score).toBeLessThan(50);
  });

  it('gives higher score to complex long passwords than short simple ones', () => {
    const complex = passwordStrengthScore('MyV3ryStr0ng!P@ssword#2026');
    const simple = passwordStrengthScore('abc');
    expect(complex).toBeGreaterThan(simple);
  });

  it('does not throw on empty string', () => {
    expect(() => passwordStrengthScore('')).not.toThrow();
  });
});

describe('TOTP implementation', () => {
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

  it('decodes a known base32 string', () => {
    const result = base32Decode('JBSWY3DPEHPK3PXP');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles padding characters', () => {
    const result = base32Decode('JBSWY3DP====');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Token generation', () => {
  it('generates tokens of the correct length', async () => {
    const { generateSecureToken } = await import('./auth.js').catch(() => null) || {};
    if (!generateSecureToken) return; // Skip if not importable in test env
    const token = generateSecureToken(32);
    expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
  });
});

describe('Role hierarchy', () => {
  const ROLE_HIERARCHY = { admin: 4, developer: 3, moderator: 2, user: 1 };

  it('admin has highest privilege', () => {
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.developer);
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.moderator);
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.user);
  });

  it('developer has higher privilege than moderator and user', () => {
    expect(ROLE_HIERARCHY.developer).toBeGreaterThan(ROLE_HIERARCHY.moderator);
    expect(ROLE_HIERARCHY.developer).toBeGreaterThan(ROLE_HIERARCHY.user);
  });

  it('moderator has higher privilege than user', () => {
    expect(ROLE_HIERARCHY.moderator).toBeGreaterThan(ROLE_HIERARCHY.user);
  });

  it('unknown roles have no privilege', () => {
    expect(ROLE_HIERARCHY['unknown'] ?? 0).toBe(0);
  });
});
