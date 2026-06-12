// src/auth/auth-service.test.js
// 2026-06-12 | Nexus AI Pro — Auth Service Tests

import { describe, it, expect, beforeEach } from 'vitest';

// Stub env vars so tests don't throw on missing secrets
process.env.JWT_SECRET = 'test-jwt-secret-32chars-minimum!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-min!!';
process.env.ENCRYPTION_SECRET = 'test-encryption-secret-32chars!!';
process.env.ENCRYPTION_SALT = 'test-salt-value-64chars-minimum-padding-1234567890!!';

const { AuthService } = await import('./auth-service.js');

const VALID_PASSWORD = 'C0rrectH0rse#Battery$Staple!9'; // 13+ chars, score >= 3

describe('AuthService', () => {
  describe('password strength', () => {
    it('rejects passwords under 13 chars', () => {
      const r = AuthService.checkStrength('short');
      expect(r.meetsMinLength).toBe(false);
    });

    it('accepts a strong 13+ char password', () => {
      const r = AuthService.checkStrength(VALID_PASSWORD);
      expect(r.meetsMinLength).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(3);
    });
  });

  describe('register', () => {
    it('creates a user with valid input', async () => {
      const r = await AuthService.register({
        username: 'testuser42',
        email: 'test42@example.com',
        password: VALID_PASSWORD
      });
      expect(r.error).toBeUndefined();
      expect(r.id).toBeTruthy();
      expect(r.role).toBe('user');
    });

    it('rejects duplicate email', async () => {
      const email = `dup_${Date.now()}@test.com`;
      await AuthService.register({ username: `dup_${Date.now()}`, email, password: VALID_PASSWORD });
      const r = await AuthService.register({ username: `other_${Date.now()}`, email, password: VALID_PASSWORD });
      expect(r.error).toMatch(/email/i);
    });

    it('rejects weak password', async () => {
      const r = await AuthService.register({ username: `weakpwd_${Date.now()}`, email: `w_${Date.now()}@test.com`, password: 'abcdefghijklm' });
      expect(r.error).toBeTruthy();
    });

    it('rejects short username', async () => {
      const r = await AuthService.register({ username: 'ab', email: `sh_${Date.now()}@test.com`, password: VALID_PASSWORD });
      expect(r.error).toBeTruthy();
    });

    it('accepts emoji username', async () => {
      const r = await AuthService.register({ username: '🦊fox_dev', email: `emoji_${Date.now()}@test.com`, password: VALID_PASSWORD });
      expect(r.error).toBeUndefined();
    });
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const email = `login_${Date.now()}@test.com`;
      await AuthService.register({ username: `loguser_${Date.now()}`, email, password: VALID_PASSWORD });
      const r = await AuthService.login({ email, password: VALID_PASSWORD });
      expect(r.accessToken).toBeTruthy();
      expect(r.refreshToken).toBeTruthy();
      expect(r.user.role).toBe('user');
    });

    it('rejects wrong password', async () => {
      const email = `badpwd_${Date.now()}@test.com`;
      await AuthService.register({ username: `badpwd_${Date.now()}`, email, password: VALID_PASSWORD });
      const r = await AuthService.login({ email, password: 'WrongPassword!!!1' });
      expect(r.error).toBeTruthy();
    });

    it('rejects unknown email', async () => {
      const r = await AuthService.login({ email: 'nobody@nowhere.invalid', password: VALID_PASSWORD });
      expect(r.error).toBeTruthy();
    });
  });

  describe('token lifecycle', () => {
    it('verifies a valid access token', async () => {
      const email = `token_${Date.now()}@test.com`;
      await AuthService.register({ username: `tkuser_${Date.now()}`, email, password: VALID_PASSWORD });
      const { accessToken } = await AuthService.login({ email, password: VALID_PASSWORD });
      const { valid, payload } = AuthService.verify(accessToken);
      expect(valid).toBe(true);
      expect(payload.role).toBe('user');
    });

    it('rejects tampered tokens', () => {
      const { valid } = AuthService.verify('tampered.token.value');
      expect(valid).toBe(false);
    });

    it('refresh returns new access token', async () => {
      const email = `ref_${Date.now()}@test.com`;
      await AuthService.register({ username: `refuser_${Date.now()}`, email, password: VALID_PASSWORD });
      const { refreshToken } = await AuthService.login({ email, password: VALID_PASSWORD });
      const r = AuthService.refresh(refreshToken);
      expect(r.accessToken).toBeTruthy();
    });
  });

  describe('ROLES', () => {
    it('exports expected roles', () => {
      expect(AuthService.ROLES.ADMIN).toBe('admin');
      expect(AuthService.ROLES.USER).toBe('user');
      expect(AuthService.ROLES.DEV).toBe('dev');
      expect(AuthService.ROLES.MODERATOR).toBe('moderator');
    });
  });
});
