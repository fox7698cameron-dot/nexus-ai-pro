/**
 * server/services/redisService.js
 * Redis client wrapper for Nexus AI Pro (sessions, cache, pub/sub)
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Uses the `redis` package (ioredis-compatible interface).
 * Falls back to an in-memory Map when Redis is not configured.
 */

import crypto from 'crypto';

// ─── In-memory fallback ───────────────────────────────────────────────────────
class MemoryStore {
  constructor() {
    this._store  = new Map();   // key → { value, expiresAt }
    this._subs   = new Map();   // channel → Set<callback>
    this.connected = false;
  }

  async get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, options = {}) {
    const expiresAt = options.EX ? Date.now() + options.EX * 1000 : null;
    this._store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key) {
    return this._store.delete(key) ? 1 : 0;
  }

  async exists(key) {
    const entry = this._store.get(key);
    if (!entry) return 0;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return 0;
    }
    return 1;
  }

  async incr(key) {
    const current = parseInt((await this.get(key)) || '0', 10);
    const next = current + 1;
    await this.set(key, String(next));
    return next;
  }

  async expire(key, seconds) {
    const entry = this._store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async sadd(key, ...members) {
    const entry = this._store.get(key) ?? { value: new Set(), expiresAt: null };
    members.forEach(m => entry.value.add(m));
    this._store.set(key, entry);
    return members.length;
  }

  async sismember(key, member) {
    const entry = this._store.get(key);
    return entry?.value instanceof Set && entry.value.has(member) ? 1 : 0;
  }

  async smembers(key) {
    const entry = this._store.get(key);
    return entry?.value instanceof Set ? [...entry.value] : [];
  }

  async hset(key, field, value) {
    const entry = this._store.get(key) ?? { value: {}, expiresAt: null };
    if (!(entry.value instanceof Object)) entry.value = {};
    entry.value[field] = value;
    this._store.set(key, entry);
    return 1;
  }

  async hget(key, field) {
    const entry = this._store.get(key);
    return entry?.value?.[field] ?? null;
  }

  async hgetall(key) {
    const entry = this._store.get(key);
    return entry?.value instanceof Object ? { ...entry.value } : null;
  }

  async publish(channel, message) {
    const subs = this._subs.get(channel) ?? new Set();
    subs.forEach(cb => cb(message));
    return subs.size;
  }

  async subscribe(channel, callback) {
    if (!this._subs.has(channel)) this._subs.set(channel, new Set());
    this._subs.get(channel).add(callback);
  }

  async quit() { return 'OK'; }
  async ping() { return 'PONG'; }
}

// ─── Redis client factory ─────────────────────────────────────────────────────
let client;
let isRedisAvailable = false;

async function createClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[redis] REDIS_URL not set – using in-memory fallback store');
    client = new MemoryStore();
    return;
  }

  try {
    // Dynamic import so the package is optional
    const { createClient: redisCreate } = await import('redis');
    client = redisCreate({ url: redisUrl });

    client.on('error', err => {
      console.error('[redis] connection error:', err.message);
    });

    await client.connect();
    await client.ping();
    isRedisAvailable = true;
    console.info('[redis] connected to Redis');
  } catch (err) {
    console.warn('[redis] could not connect to Redis, falling back to in-memory store:', err.message);
    client = new MemoryStore();
  }
}

// Lazy-initialise once
let initPromise = null;

async function getClient() {
  if (!initPromise) initPromise = createClient();
  await initPromise;
  return client;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

/**
 * Store a user session.
 * @param {string} sessionId
 * @param {object} data
 */
export async function setSession(sessionId, data) {
  const c = await getClient();
  await c.set(`session:${sessionId}`, JSON.stringify(data), { EX: SESSION_TTL });
}

/**
 * Retrieve a user session.
 * @param {string} sessionId
 * @returns {object|null}
 */
export async function getSession(sessionId) {
  const c = await getClient();
  const raw = await c.get(`session:${sessionId}`);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Delete a session.
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
  const c = await getClient();
  return c.del(`session:${sessionId}`);
}

// ─── Rate-limit helpers ───────────────────────────────────────────────────────

/**
 * Track failed auth attempts; return current count.
 * @param {string} identifier - IP or user ID
 * @returns {Promise<number>}
 */
export async function trackFailedAuth(identifier) {
  const c    = await getClient();
  const key  = `auth:fail:${identifier}`;
  const count = await c.incr(key);
  if (count === 1) await c.expire(key, 60 * 15); // 15-minute window
  return count;
}

/**
 * Reset failed auth counter.
 * @param {string} identifier
 */
export async function resetFailedAuth(identifier) {
  const c = await getClient();
  return c.del(`auth:fail:${identifier}`);
}

// ─── Token revocation (Redis SET for production) ──────────────────────────────

export async function addRevokedToken(jti, ttlSeconds = 900) {
  const c = await getClient();
  await c.sadd('revoked:tokens', jti);
  // Note: individual expiry not supported on set members; use a sorted set in production
}

export async function isTokenRevoked(jti) {
  const c = await getClient();
  return (await c.sismember('revoked:tokens', jti)) === 1;
}

// ─── General cache ────────────────────────────────────────────────────────────

export async function cacheSet(key, value, ttlSeconds = 300) {
  const c = await getClient();
  await c.set(`cache:${key}`, JSON.stringify(value), { EX: ttlSeconds });
}

export async function cacheGet(key) {
  const c = await getClient();
  const raw = await c.get(`cache:${key}`);
  return raw ? JSON.parse(raw) : null;
}

export async function cacheDel(key) {
  const c = await getClient();
  return c.del(`cache:${key}`);
}

// ─── Pub/Sub helpers ──────────────────────────────────────────────────────────

export async function publish(channel, payload) {
  const c = await getClient();
  return c.publish(channel, JSON.stringify(payload));
}

export async function subscribe(channel, callback) {
  const c = await getClient();
  return c.subscribe(channel, msg => callback(JSON.parse(msg)));
}

// ─── Healthcheck ──────────────────────────────────────────────────────────────

export async function redisPing() {
  try {
    const c = await getClient();
    const result = await c.ping();
    return { ok: true, result, usingFallback: !isRedisAvailable };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Initialise eagerly (non-blocking)
getClient().catch(() => {});

export default { setSession, getSession, deleteSession, cacheSet, cacheGet, cacheDel, publish, subscribe, redisPing };
