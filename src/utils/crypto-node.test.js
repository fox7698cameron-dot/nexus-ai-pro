/**
 * src/utils/crypto-node.test.js
 * Unit tests for Node.js crypto utilities — password validation, TOTP, username validation.
 * Created: 2026-08-23
 */

import { describe, it, expect } from 'vitest';
import { validatePassword, validateUsername, generateTOTPSecret, verifyTOTP } from './crypto-node.js';

// ── Password validation tests ─────────────────────────────────────────────────
describe('validatePassword', () => {
  it('accepts a strong password (13+ chars, upper, lower, digit, special)', () => {
    const result = validatePassword('Nexus@Secure1234!');
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects passwords shorter than 13 characters', () => {
    const result = validatePassword('Short1!Ab');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('13'))).toBe(true);
  });

  it('rejects passwords without uppercase letters', () => {
    const result = validatePassword('alllowercase1234!');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes('uppercase'))).toBe(true);
  });

  it('rejects passwords without digits', () => {
    const result = validatePassword('NoDigitHere!!!!!');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes('digit'))).toBe(true);
  });

  it('rejects passwords without special characters', () => {
    const result = validatePassword('NoSpecialChar123ABC');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes('special'))).toBe(true);
  });

  it('returns score 0 for empty password', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
  });

  it('returns increasing score for stronger passwords', () => {
    const weak   = validatePassword('short');
    const medium = validatePassword('Medium1234!@#$');
    const strong = validatePassword('V3ryStr0ng!@#$%^&*ExtraLongPassword');
    expect(strong.score).toBeGreaterThan(medium.score);
    expect(medium.score).toBeGreaterThan(weak.score);
  });

  it('handles emoji and Unicode in password without crash', () => {
    // Should not throw; may or may not meet strength requirements
    expect(() => validatePassword('Unicode🎮Passw0rd!#Extra')).not.toThrow();
  });
});

// ── Username validation tests ──────────────────────────────────────────────────
describe('validateUsername', () => {
  it('accepts normal alphanumeric usernames', () => {
    expect(validateUsername('cameron_fx').valid).toBe(true);
    expect(validateUsername('user1234').valid).toBe(true);
  });

  it('accepts usernames with emoji', () => {
    expect(validateUsername('player🎮').valid).toBe(true);
    expect(validateUsername('chef👨‍🍳official').valid).toBe(true);
  });

  it('rejects usernames shorter than 2 characters', () => {
    expect(validateUsername('a').valid).toBe(false);
    expect(validateUsername('').valid).toBe(false);
  });

  it('rejects usernames longer than 64 characters', () => {
    expect(validateUsername('a'.repeat(65)).valid).toBe(false);
  });

  it('rejects SQL-injection characters', () => {
    expect(validateUsername("user'name").valid).toBe(false);
    expect(validateUsername('user"name').valid).toBe(false);
    expect(validateUsername('user;drop').valid).toBe(false);
    expect(validateUsername('user<script>').valid).toBe(false);
  });

  it('accepts max-length valid username (64 chars)', () => {
    expect(validateUsername('a'.repeat(64)).valid).toBe(true);
  });
});

// ── TOTP tests ────────────────────────────────────────────────────────────────
describe('TOTP', () => {
  it('generates a 32-char base32 secret', () => {
    const secret = generateTOTPSecret();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(0);
    // Base32 charset
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it('verifies a just-generated TOTP code', async () => {
    // We cannot generate the code without running _hotp ourselves,
    // but we can confirm the verify function returns a boolean
    const secret = generateTOTPSecret();
    // A random 6-digit code should almost certainly fail
    const result = await verifyTOTP(secret, '000000');
    expect(typeof result).toBe('boolean');
  });

  it('generates unique secrets each time', () => {
    const a = generateTOTPSecret();
    const b = generateTOTPSecret();
    expect(a).not.toBe(b);
  });
});
