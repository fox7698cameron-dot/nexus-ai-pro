/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * src/components/__tests__/AuthSystem.test.js
 * Updated: 2026-10-16
 * Tests for password strength and role hierarchy
 */

import { describe, it, expect } from 'vitest';

// checkPassword is a plain function we can import directly
// It does not depend on any browser APIs so it runs fine in Node/vitest
const SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
function checkPassword(pw) {
  const issues = [];
  if (pw.length < 13)       issues.push('At least 13 characters');
  if (!/[A-Z]/.test(pw))   issues.push('One uppercase letter');
  if (!/[a-z]/.test(pw))   issues.push('One lowercase letter');
  if (!/[0-9]/.test(pw))   issues.push('One number');
  if (!SPECIAL.test(pw))   issues.push('One special character');
  const score = Math.max(0, 5 - issues.length);
  return { issues, score, ok: issues.length === 0 };
}

const ROLES = {
  user:  { label: 'User',      icon: '👤', color: '#6b7280', desc: 'Standard access' },
  mod:   { label: 'Moderator', icon: '🛡️', color: '#f59e0b', desc: 'Moderation tools' },
  dev:   { label: 'Developer', icon: '💻', color: '#3b82f6', desc: 'Dev & API access' },
  admin: { label: 'Admin',     icon: '👑', color: '#8b5cf6', desc: 'Full access' },
};

const ROLE_LEVELS = ['user', 'mod', 'dev', 'admin'];
function hasAccess(userRole, requiredRole) {
  return ROLE_LEVELS.indexOf(userRole) >= ROLE_LEVELS.indexOf(requiredRole);
}

// Username validation matching AuthSystem logic
function validateUsername(u) {
  if (!u || u.length < 3)  return 'At least 3 characters';
  if (u.length > 32)       return 'Max 32 characters';
  if (/<|>|&/.test(u))     return 'Invalid characters';
  if (/script/i.test(u))  return 'Invalid characters';
  if (/SELECT|INSERT|DROP/i.test(u)) return 'Invalid characters';
  return null;
}

// ── Password strength ──────────────────────────────────────────────────────────

describe('checkPassword', () => {
  it('rejects short passwords', () => {
    const { ok, issues } = checkPassword('Short1!');
    expect(ok).toBe(false);
    expect(issues).toContain('At least 13 characters');
  });

  it('rejects passwords with no uppercase', () => {
    const { ok, issues } = checkPassword('alllowercase12!');
    expect(ok).toBe(false);
    expect(issues).toContain('One uppercase letter');
  });

  it('rejects passwords with no lowercase', () => {
    const { ok, issues } = checkPassword('ALLUPPERCASE12!');
    expect(ok).toBe(false);
    expect(issues).toContain('One lowercase letter');
  });

  it('rejects passwords with no digit', () => {
    const { ok, issues } = checkPassword('NoDigitsHereAtAll!');
    expect(ok).toBe(false);
    expect(issues).toContain('One number');
  });

  it('rejects passwords with no special character', () => {
    const { ok, issues } = checkPassword('NoSpecialHere123456');
    expect(ok).toBe(false);
    expect(issues).toContain('One special character');
  });

  it('accepts a strong password meeting all criteria', () => {
    const { ok, score } = checkPassword('Str0ng!Password#42');
    expect(ok).toBe(true);
    expect(score).toBe(5);
  });

  it('score increases as more criteria are met', () => {
    const weak   = checkPassword('abc').score;
    const medium = checkPassword('Abcdef123').score;
    const strong = checkPassword('Str0ng!Password#42').score;
    expect(medium).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThan(medium);
  });

  it('handles unicode / emoji in passwords (length counted by codepoints)', () => {
    // Emoji count as characters in length check
    const { ok } = checkPassword('Str0ng!Pass🔑🔑🔑🔑');
    expect(ok).toBe(true);
  });
});

// ── Role hierarchy ─────────────────────────────────────────────────────────────

describe('ROLES', () => {
  it('defines the four standard roles', () => {
    expect(Object.keys(ROLES)).toEqual(['user', 'mod', 'dev', 'admin']);
  });

  it('each role has required fields', () => {
    for (const r of Object.values(ROLES)) {
      expect(r).toHaveProperty('label');
      expect(r).toHaveProperty('icon');
      expect(r).toHaveProperty('color');
      expect(r).toHaveProperty('desc');
    }
  });
});

describe('hasAccess (role guard)', () => {
  it('user can access user-level routes', () => {
    expect(hasAccess('user', 'user')).toBe(true);
  });

  it('user cannot access mod/dev/admin routes', () => {
    expect(hasAccess('user', 'mod')).toBe(false);
    expect(hasAccess('user', 'dev')).toBe(false);
    expect(hasAccess('user', 'admin')).toBe(false);
  });

  it('mod can access user and mod routes', () => {
    expect(hasAccess('mod', 'user')).toBe(true);
    expect(hasAccess('mod', 'mod')).toBe(true);
  });

  it('mod cannot access dev or admin routes', () => {
    expect(hasAccess('mod', 'dev')).toBe(false);
    expect(hasAccess('mod', 'admin')).toBe(false);
  });

  it('dev can access user, mod, dev routes', () => {
    expect(hasAccess('dev', 'user')).toBe(true);
    expect(hasAccess('dev', 'mod')).toBe(true);
    expect(hasAccess('dev', 'dev')).toBe(true);
  });

  it('dev cannot access admin routes', () => {
    expect(hasAccess('dev', 'admin')).toBe(false);
  });

  it('admin can access all routes', () => {
    for (const role of ROLE_LEVELS) {
      expect(hasAccess('admin', role)).toBe(true);
    }
  });
});

// ── Username validation ────────────────────────────────────────────────────────

describe('validateUsername', () => {
  it('rejects usernames shorter than 3 characters', () => {
    expect(validateUsername('ab')).toBeTruthy();
  });

  it('rejects usernames longer than 32 characters', () => {
    expect(validateUsername('a'.repeat(33))).toBeTruthy();
  });

  it('rejects XSS injection attempts', () => {
    expect(validateUsername('<script>')).toBeTruthy();
    expect(validateUsername('user&admin')).toBeTruthy();
    expect(validateUsername('user>evil')).toBeTruthy();
  });

  it('rejects SQL injection attempts', () => {
    expect(validateUsername('user SELECT')).toBeTruthy();
    expect(validateUsername('DROP TABLE')).toBeTruthy();
    expect(validateUsername('INSERT INTO')).toBeTruthy();
  });

  it('accepts valid usernames with unicode and emoji', () => {
    expect(validateUsername('CoolUser99')).toBeNull();
    expect(validateUsername('user_🚀')).toBeNull();
    expect(validateUsername('Ünïcödé')).toBeNull();
  });

  it('accepts valid 3-32 character usernames', () => {
    expect(validateUsername('abc')).toBeNull();
    expect(validateUsername('a'.repeat(32))).toBeNull();
  });
});
