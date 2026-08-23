/**
 * src/middleware/security.test.js
 * Unit tests for server-side security middleware.
 * Created: 2026-08-23
 */

import { describe, it, expect, vi } from 'vitest';
import { audit, getAuditLog, rateLimiter, sanitizeBody } from './security.js';

// ── Audit log tests ───────────────────────────────────────────────────────────
describe('audit log', () => {
  it('appends entries to the log', () => {
    const before = getAuditLog(1000).length;
    audit('TEST_EVENT', { detail: 'hello' });
    const after  = getAuditLog(1000).length;
    expect(after).toBeGreaterThan(before);
  });

  it('stored entries have required fields', () => {
    audit('TEST_FIELDS', { ip: '127.0.0.1' });
    const entries = getAuditLog(10);
    const last    = entries[entries.length - 1];
    expect(last).toHaveProperty('ts');
    expect(last).toHaveProperty('action');
    expect(last.action).toBe('TEST_FIELDS');
  });

  it('does not grow beyond MAX_AUDIT_ENTRIES', () => {
    // Fire 1200 entries — should cap at 1000
    for (let i = 0; i < 1200; i++) audit('SPAM', { i });
    const log = getAuditLog(10000);
    expect(log.length).toBeLessThanOrEqual(1000);
  });
});

// ── sanitizeBody tests ────────────────────────────────────────────────────────
describe('sanitizeBody middleware', () => {
  function makeReq(body) {
    return { body };
  }

  it('strips null bytes from string values', () => {
    const req  = makeReq({ msg: 'hello\0world' });
    const next = vi.fn();
    sanitizeBody(req, {}, next);
    expect(req.body.msg).toBe('helloworld');
    expect(next).toHaveBeenCalled();
  });

  it('handles nested objects', () => {
    const req  = makeReq({ a: { b: 'ok\0' } });
    const next = vi.fn();
    sanitizeBody(req, {}, next);
    expect(req.body.a.b).toBe('ok');
    expect(next).toHaveBeenCalled();
  });

  it('handles arrays', () => {
    const req  = makeReq({ items: ['a\0', 'b'] });
    const next = vi.fn();
    sanitizeBody(req, {}, next);
    expect(req.body.items).toEqual(['a', 'b']);
  });

  it('leaves non-string values untouched', () => {
    const req  = makeReq({ count: 42, flag: true, n: null });
    const next = vi.fn();
    sanitizeBody(req, {}, next);
    expect(req.body.count).toBe(42);
    expect(req.body.flag).toBe(true);
    expect(req.body.n).toBeNull();
  });

  it('handles missing body gracefully', () => {
    const req  = makeReq(null);
    const next = vi.fn();
    expect(() => sanitizeBody(req, {}, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  it('preserves emoji and Unicode in strings', () => {
    const req  = makeReq({ username: 'user🎮123' });
    const next = vi.fn();
    sanitizeBody(req, {}, next);
    expect(req.body.username).toBe('user🎮123');
  });
});

// ── rateLimiter tests ─────────────────────────────────────────────────────────
describe('rateLimiter middleware', () => {
  it('allows requests under the limit', () => {
    const mw   = rateLimiter(5, 60_000);
    const next = vi.fn();
    const res  = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    const req  = { ip: `test-${Date.now()}` };

    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks requests over the limit', () => {
    const mw  = rateLimiter(2, 60_000);
    const ip  = `block-${Date.now()}`;
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    mw({ ip }, res, next);
    mw({ ip }, res, next);
    mw({ ip }, res, next);   // 3rd — over limit of 2

    expect(res.status).toHaveBeenCalledWith(429);
  });
});
