// ================================================
// NEXUS AI PRO - Redis Service
// File: src/services/redisService.js
// Updated: 2026-07-01
// Provides Redis client with graceful fallback to in-memory cache
// ================================================

import { createClient } from 'redis';

// Minimal in-memory LRU fallback used when Redis is unavailable
class MemoryFallback {
  constructor(maxEntries = 10000) {
    this._store = new Map();
    this._expiry = new Map();
    this._max = maxEntries;
  }

  _evictExpired() {
    const now = Date.now();
    for (const [k, exp] of this._expiry) {
      if (exp < now) { this._store.delete(k); this._expiry.delete(k); }
    }
  }

  _evictLRU() {
    const first = this._store.keys().next().value;
    if (first !== undefined) { this._store.delete(first); this._expiry.delete(first); }
  }

  async get(key) {
    this._evictExpired();
    const exp = this._expiry.get(key);
    if (exp && exp < Date.now()) { this._store.delete(key); this._expiry.delete(key); return null; }
    return this._store.get(key) ?? null;
  }

  async set(key, value) {
    if (this._store.size >= this._max) this._evictLRU();
    this._store.set(key, value);
    return 'OK';
  }

  async setex(key, seconds, value) {
    if (this._store.size >= this._max) this._evictLRU();
    this._store.set(key, value);
    this._expiry.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }

  async del(key) {
    this._store.delete(key);
    this._expiry.delete(key);
    return 1;
  }

  async exists(key) {
    this._evictExpired();
    return this._store.has(key) ? 1 : 0;
  }

  async incr(key) {
    const val = parseInt(await this.get(key) || '0') + 1;
    await this.set(key, String(val));
    return val;
  }

  async expire(key, seconds) {
    if (!this._store.has(key)) return 0;
    this._expiry.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async keys(pattern) {
    this._evictExpired();
    const re = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return [...this._store.keys()].filter(k => re.test(k));
  }

  async hset(key, field, value) {
    const obj = JSON.parse(await this.get(key) || '{}');
    obj[field] = value;
    await this.set(key, JSON.stringify(obj));
    return 1;
  }

  async hget(key, field) {
    const obj = JSON.parse(await this.get(key) || '{}');
    return obj[field] ?? null;
  }

  async hgetall(key) {
    const raw = await this.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async lpush(key, value) {
    const list = JSON.parse(await this.get(key) || '[]');
    list.unshift(value);
    await this.set(key, JSON.stringify(list));
    return list.length;
  }

  async lrange(key, start, stop) {
    const list = JSON.parse(await this.get(key) || '[]');
    return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
  }
}

let _client = null;

export async function getRedisClient() {
  if (_client) return _client;

  const url = process.env.REDIS_URL;
  if (!url || url.startsWith('redis://localhost')) {
    // Attempt real Redis; fall back if unavailable
    try {
      const client = createClient({ url: url || 'redis://localhost:6379' });
      await Promise.race([
        client.connect(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
      ]);
      _client = client;
      console.log('[Redis] Connected to Redis server');
      return _client;
    } catch {
      console.warn('[Redis] Redis unavailable — using in-memory fallback');
      _client = new MemoryFallback();
      return _client;
    }
  }

  try {
    const client = createClient({ url });
    client.on('error', err => console.error('[Redis] error:', err.message));
    await client.connect();
    _client = client;
    console.log('[Redis] Connected to Redis server');
  } catch (err) {
    console.warn('[Redis] Connection failed — using in-memory fallback:', err.message);
    _client = new MemoryFallback();
  }

  return _client;
}

export function closeRedis() {
  if (_client && typeof _client.quit === 'function') {
    _client.quit().catch(() => null);
    _client = null;
  }
}
