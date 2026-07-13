// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// tests/auth.test.js — 2026-07-13
// Authentication service unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser, getUserByEmail, getUser, updateUser, deleteUser,
  safeUser, ROLES, PERMISSIONS,
} from '../src/services/userStore.js';
import {
  addRefreshToken, hasRefreshToken, getRefreshToken,
  removeRefreshToken, removeAllUserRefreshTokens,
  addResetToken, getResetToken, removeResetToken,
  addMfaSession, getMfaSession, removeMfaSession,
} from '../src/services/tokenStore.js';
import { safeEval, evalCondition } from '../src/services/safeEval.js';

// ---- User Store ----

describe('userStore', () => {
  const email = `test-${Date.now()}@example.com`;
  let userId;

  it('creates a user', () => {
    const user = createUser({
      email,
      passwordHash: 'hashedpw',
      displayName: 'Test User 🧑',
      role: ROLES.USER,
    });
    userId = user.id;
    expect(user.email).toBe(email.toLowerCase());
    expect(user.displayName).toBe('Test User 🧑');
    expect(user.role).toBe('user');
    expect(user.permissions).toEqual(expect.arrayContaining(['analytics:read']));
    expect(user.twoFactorEnabled).toBe(false);
    expect(user.isActive).toBe(true);
  });

  it('rejects duplicate email', () => {
    expect(() => createUser({ email, passwordHash: 'x', displayName: 'Dup' })).toThrow();
  });

  it('retrieves user by email', () => {
    const u = getUserByEmail(email);
    expect(u).not.toBeNull();
    expect(u.id).toBe(userId);
  });

  it('retrieves user by id', () => {
    const u = getUser(userId);
    expect(u).not.toBeNull();
    expect(u.email).toBe(email.toLowerCase());
  });

  it('returns null for unknown user', () => {
    expect(getUser('nonexistent-id-xyz')).toBeNull();
  });

  it('updates user fields', () => {
    const updated = updateUser(userId, { displayName: 'Updated Name 🎮' });
    expect(updated.displayName).toBe('Updated Name 🎮');
    expect(updated.updatedAt).not.toBe(updated.createdAt);
  });

  it('safeUser strips sensitive fields', () => {
    const user = getUser(userId);
    const safe = safeUser(user);
    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe).not.toHaveProperty('twoFactorSecret');
    expect(safe).not.toHaveProperty('backupCodes');
    expect(safe.id).toBe(userId);
  });

  it('admin role has admin:all permission', () => {
    const perms = PERMISSIONS.admin;
    expect(perms).toContain('admin:all');
    expect(perms).toContain('users:write');
    expect(perms).toContain('security:scan');
  });

  it('deletes a user', () => {
    const ok = deleteUser(userId);
    expect(ok).toBe(true);
    expect(getUser(userId)).toBeNull();
    expect(getUserByEmail(email)).toBeNull();
  });
});

// ---- Token Store ----

describe('tokenStore - refresh tokens', () => {
  it('creates and validates refresh token', () => {
    const token = addRefreshToken('user-abc');
    expect(hasRefreshToken(token)).toBe(true);
    const data = getRefreshToken(token);
    expect(data.userId).toBe('user-abc');
  });

  it('removes refresh token', () => {
    const token = addRefreshToken('user-abc');
    removeRefreshToken(token);
    expect(hasRefreshToken(token)).toBe(false);
  });

  it('removes all user refresh tokens', () => {
    const t1 = addRefreshToken('user-multi');
    const t2 = addRefreshToken('user-multi');
    removeAllUserRefreshTokens('user-multi');
    expect(hasRefreshToken(t1)).toBe(false);
    expect(hasRefreshToken(t2)).toBe(false);
  });

  it('returns null for unknown token', () => {
    expect(getRefreshToken('nonexistent')).toBeNull();
  });
});

describe('tokenStore - reset tokens', () => {
  it('creates and validates reset token', () => {
    const raw = addResetToken('user-reset');
    const data = getResetToken(raw);
    expect(data).not.toBeNull();
    expect(data.userId).toBe('user-reset');
  });

  it('consumes reset token on remove', () => {
    const raw = addResetToken('user-reset2');
    removeResetToken(raw);
    expect(getResetToken(raw)).toBeNull();
  });

  it('returns null for wrong token', () => {
    expect(getResetToken('definitely-not-valid')).toBeNull();
  });
});

describe('tokenStore - MFA sessions', () => {
  it('creates and retrieves MFA session', () => {
    const token = addMfaSession('user-mfa');
    const session = getMfaSession(token);
    expect(session).not.toBeNull();
    expect(session.userId).toBe('user-mfa');
  });

  it('removes MFA session', () => {
    const token = addMfaSession('user-mfa2');
    removeMfaSession(token);
    expect(getMfaSession(token)).toBeNull();
  });
});

// ---- Safe Eval ----

describe('safeEval', () => {
  it('evaluates arithmetic', async () => {
    expect(await safeEval('1 + 2 * 3')).toBe(7);
  });

  it('evaluates comparisons', async () => {
    expect(await safeEval('5 > 3')).toBe(true);
    expect(await safeEval('2 === 2')).toBe(true);
  });

  it('accesses context variables', async () => {
    expect(await safeEval('x + y', { x: 10, y: 20 })).toBe(30);
  });

  it('evaluates ternary', async () => {
    expect(await safeEval('a > 0 ? "pos" : "neg"', { a: 5 })).toBe('pos');
  });

  it('blocks eval', async () => {
    await expect(safeEval('eval("1+1")')).rejects.toThrow();
  });

  it('blocks Function constructor', async () => {
    await expect(safeEval('new Function("return 1")()')).rejects.toThrow();
  });

  it('blocks process access', async () => {
    await expect(safeEval('process.env.SECRET')).rejects.toThrow();
  });

  it('blocks require', async () => {
    await expect(safeEval('require("fs")')).rejects.toThrow();
  });

  it('evalCondition returns boolean', async () => {
    expect(await evalCondition('x > 5', { x: 10 })).toBe(true);
    expect(await evalCondition('x > 5', { x: 3 })).toBe(false);
  });
});
