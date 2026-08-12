/**
 * src/api/auth.test.js
 * Auth API Unit Tests
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { validatePassword, validateUsername, validateEmail } from '../utils/validation.js';
import { generateToken, generateId, safeCompare, encrypt, decrypt, deriveKey, generateSalt } from '../utils/crypto.js';

// ─── Password Validation ─────────────────────────────────────────────────────

describe('validatePassword', () => {
  test('rejects passwords shorter than 13 characters', () => {
    const result = validatePassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 13 characters long');
  });

  test('rejects passwords without uppercase', () => {
    const result = validatePassword('alllowercaselongpassword1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /uppercase/i.test(e))).toBe(true);
  });

  test('rejects passwords without special characters', () => {
    const result = validatePassword('ValidPassword123');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /special/i.test(e))).toBe(true);
  });

  test('accepts strong passwords meeting all criteria', () => {
    const result = validatePassword('MyStr0ng!P@ssword2026');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.strength).toBe('strong');
  });

  test('handles emoji in passwords correctly', () => {
    // Emoji are multi-byte but should count as 1 Unicode character
    const pw = '🔒MyStr0ng!Pass2026';
    const result = validatePassword(pw);
    // [...pw].length counts Unicode code points correctly
    expect([...pw].length).toBeGreaterThanOrEqual(13);
    expect(result.valid).toBe(true);
  });

  test('returns score between 0 and 100', () => {
    const { score } = validatePassword('MyStr0ng!P@ssword2026');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─── Username Validation ─────────────────────────────────────────────────────

describe('validateUsername', () => {
  test('accepts standard alphanumeric usernames', () => {
    expect(validateUsername('alice123').valid).toBe(true);
  });

  test('accepts emoji usernames', () => {
    expect(validateUsername('🎮gamer').valid).toBe(true);
  });

  test('accepts usernames with special characters', () => {
    expect(validateUsername('user.name_here').valid).toBe(true);
  });

  test('rejects usernames shorter than 2 characters', () => {
    expect(validateUsername('a').valid).toBe(false);
  });

  test('rejects usernames longer than 64 Unicode characters', () => {
    const long = '🔥'.repeat(65); // 65 code points
    expect(validateUsername(long).valid).toBe(false);
  });

  test('rejects usernames with null bytes', () => {
    expect(validateUsername('user\0name').valid).toBe(false);
  });

  test('rejects usernames with control characters', () => {
    expect(validateUsername('user\x01name').valid).toBe(false);
  });
});

// ─── Email Validation ─────────────────────────────────────────────────────────

describe('validateEmail', () => {
  test('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
    expect(validateEmail('USER@EXAMPLE.COM').valid).toBe(true);
    expect(validateEmail('user+tag@sub.domain.io').valid).toBe(true);
  });

  test('rejects emails without @', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
  });

  test('rejects emails with spaces', () => {
    expect(validateEmail('user @example.com').valid).toBe(false);
  });

  test('normalizes email to lowercase', () => {
    const result = validateEmail('USER@EXAMPLE.COM');
    expect(result.normalized).toBe('user@example.com');
  });

  test('rejects emails over 254 characters', () => {
    const long = 'a'.repeat(250) + '@x.com';
    expect(validateEmail(long).valid).toBe(false);
  });
});

// ─── Crypto Utils ─────────────────────────────────────────────────────────────

describe('crypto utils', () => {
  test('generateToken returns a hex string of the right length', () => {
    const tok = generateToken(32);
    expect(tok).toMatch(/^[0-9a-f]+$/);
    expect(tok.length).toBe(64); // 32 bytes = 64 hex chars
  });

  test('generateId returns a valid UUID v4', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('safeCompare returns true for equal strings', () => {
    expect(safeCompare('abc', 'abc')).toBe(true);
  });

  test('safeCompare returns false for unequal strings of same length', () => {
    expect(safeCompare('abc', 'abd')).toBe(false);
  });

  test('safeCompare returns false for strings of different lengths', () => {
    expect(safeCompare('abc', 'ab')).toBe(false);
  });

  test('encrypt/decrypt roundtrip returns original plaintext', () => {
    const salt      = generateSalt();
    const key       = deriveKey('test-passphrase-12345', salt);
    const plaintext = 'Hello, Nexus AI Pro! 🔒';
    const payload   = encrypt(plaintext, key);

    expect(payload).toHaveProperty('iv');
    expect(payload).toHaveProperty('ciphertext');
    expect(payload).toHaveProperty('tag');

    const decrypted = decrypt(payload, key);
    expect(decrypted).toBe(plaintext);
  });

  test('encrypt/decrypt with AAD works correctly', () => {
    const salt  = generateSalt();
    const key   = deriveKey('test-passphrase-aaad', salt);
    const pt    = 'Secret with AAD';
    const aad   = 'user-id-12345';
    const enc   = encrypt(pt, key, aad);
    const dec   = decrypt(enc, key, aad);
    expect(dec).toBe(pt);
  });

  test('decrypt with wrong AAD throws', () => {
    const salt = generateSalt();
    const key  = deriveKey('test-passphrase-aad-fail', salt);
    const enc  = encrypt('data', key, 'correct-aad');
    expect(() => decrypt(enc, key, 'wrong-aad')).toThrow();
  });

  test('deriveKey is deterministic for same inputs', () => {
    const salt = generateSalt();
    const k1   = deriveKey('passphrase', salt);
    const k2   = deriveKey('passphrase', salt);
    expect(k1.equals(k2)).toBe(true);
  });

  test('deriveKey differs for different passphrases', () => {
    const salt = generateSalt();
    const k1   = deriveKey('pass1', salt);
    const k2   = deriveKey('pass2', salt);
    expect(k1.equals(k2)).toBe(false);
  });
});
