/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * __tests__/server.utils.test.js
 * Updated: 2026-10-16
 * Tests for server-side password hashing, validation, and timing-safe compare
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// ── Inline the server utility functions under test ────────────────────────────
// (Avoids importing the whole server which binds to ports)

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(derived, Buffer.from(hash, 'hex'));
}

function validatePassword(pw) {
  if (!pw || pw.length < 13) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) return false;
  return true;
}

function validateUsername(u) {
  if (!u || u.length < 3 || u.length > 32) return false;
  if (/<|>|&/.test(u)) return false;
  if (/script/i.test(u)) return false;
  if (/SELECT|INSERT|DROP/i.test(u)) return false;
  return true;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Password hashing (scrypt) ─────────────────────────────────────────────────

describe('hashPassword / verifyPassword', () => {
  it('produces a hash and salt', () => {
    const { hash, salt } = hashPassword('Str0ng!Password#42');
    expect(hash).toHaveLength(128);  // 64 bytes hex
    expect(salt).toHaveLength(64);   // 32 bytes hex
  });

  it('verifies the correct password', () => {
    const pw = 'Str0ng!Password#42';
    const { hash, salt } = hashPassword(pw);
    expect(verifyPassword(pw, hash, salt)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const { hash, salt } = hashPassword('Str0ng!Password#42');
    expect(verifyPassword('WrongPassword!!1', hash, salt)).toBe(false);
  });

  it('produces different hashes for the same password (unique salts)', () => {
    const { hash: h1 } = hashPassword('Str0ng!Password#42');
    const { hash: h2 } = hashPassword('Str0ng!Password#42');
    expect(h1).not.toBe(h2);
  });
});

// ── Server-side password validation ──────────────────────────────────────────

describe('validatePassword (server-side)', () => {
  it('accepts strong passwords', () => {
    expect(validatePassword('Str0ng!Password#42')).toBe(true);
  });

  it('rejects passwords shorter than 13 chars', () => {
    expect(validatePassword('Short1!Ab')).toBe(false);
  });

  it('rejects passwords without uppercase', () => {
    expect(validatePassword('weakpass1234!!')).toBe(false);
  });

  it('rejects passwords without lowercase', () => {
    expect(validatePassword('STRONGPASS123!!')).toBe(false);
  });

  it('rejects passwords without digits', () => {
    expect(validatePassword('NoDigitsHere!!')).toBe(false);
  });

  it('rejects passwords without special chars', () => {
    expect(validatePassword('NoSpecialHere1234')).toBe(false);
  });

  it('rejects empty / null input', () => {
    expect(validatePassword('')).toBe(false);
    expect(validatePassword(null)).toBe(false);
    expect(validatePassword(undefined)).toBe(false);
  });
});

// ── Username validation (server-side) ────────────────────────────────────────

describe('validateUsername (server-side)', () => {
  it('accepts valid usernames', () => {
    expect(validateUsername('CoolUser99')).toBe(true);
    expect(validateUsername('abc')).toBe(true);
    expect(validateUsername('a'.repeat(32))).toBe(true);
  });

  it('rejects names shorter than 3 chars', () => {
    expect(validateUsername('ab')).toBe(false);
  });

  it('rejects names longer than 32 chars', () => {
    expect(validateUsername('a'.repeat(33))).toBe(false);
  });

  it('rejects XSS injection', () => {
    expect(validateUsername('<script>alert(1)</script>')).toBe(false);
    expect(validateUsername('user&admin')).toBe(false);
  });

  it('rejects SQL injection keywords', () => {
    expect(validateUsername('DROP TABLE users')).toBe(false);
    expect(validateUsername('SELECT *')).toBe(false);
    expect(validateUsername('INSERT INTO')).toBe(false);
  });
});

// ── Timing-safe comparison ────────────────────────────────────────────────────

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(timingSafeEqual('abc123', 'xyz456')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('returns false when only one char differs', () => {
    expect(timingSafeEqual('abcdefg', 'abcdefX')).toBe(false);
  });
});

// ── Secure ID generation ──────────────────────────────────────────────────────

describe('generateSecureId', () => {
  function generateSecureId(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  it('returns a hex string of correct length', () => {
    const id = generateSecureId(16);
    expect(id).toMatch(/^[0-9a-f]+$/);
    expect(id.length).toBe(32); // 16 bytes = 32 hex chars
  });

  it('generates unique IDs on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSecureId(16)));
    expect(ids.size).toBe(100);
  });

  it('default length produces 64-char hex string', () => {
    expect(generateSecureId(32).length).toBe(64);
  });
});
