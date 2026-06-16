// File: redisService.js | Date: 2026-06-16
import config from '../config/index.js';

/** Lightweight in-memory cache fallback when ioredis is not available. */
class MemoryCache {
  constructor() {
    this._store = new Map();
    this._hashes = new Map();
    this._timers = new Map();
    this._pubsub = new Map();
  }

  _clearTimer(key) {
    const t = this._timers.get(key);
    if (t) { clearTimeout(t); this._timers.delete(key); }
  }

  async get(key) {
    return this._store.has(key) ? this._store.get(key) : null;
  }

  async set(key, value, ttlSeconds) {
    this._clearTimer(key);
    this._store.set(key, value);
    if (ttlSeconds && ttlSeconds > 0) {
      const t = setTimeout(() => this._store.delete(key), ttlSeconds * 1000);
      if (t.unref) t.unref();
      this._timers.set(key, t);
    }
  }

  async del(key) {
    this._clearTimer(key);
    this._store.delete(key);
    this._hashes.delete(key);
  }

  async exists(key) { return this._store.has(key) || this._hashes.has(key) ? 1 : 0; }

  async hset(key, field, value) {
    if (!this._hashes.has(key)) this._hashes.set(key, new Map());
    this._hashes.get(key).set(field, value);
  }

  async hget(key, field) {
    return this._hashes.has(key) ? (this._hashes.get(key).get(field) ?? null) : null;
  }

  async hgetall(key) {
    if (!this._hashes.has(key)) return null;
    return Object.fromEntries(this._hashes.get(key));
  }

  async publish(channel, message) {
    const subs = this._pubsub.get(channel) || [];
    subs.forEach(cb => {
      try { cb(channel, message); } catch { /* ignore */ }
    });
    return subs.length;
  }

  async subscribe(channel, callback) {
    if (!this._pubsub.has(channel)) this._pubsub.set(channel, []);
    this._pubsub.get(channel).push(callback);
  }

  async flush() {
    this._timers.forEach(t => clearTimeout(t));
    this._timers.clear();
    this._store.clear();
    this._hashes.clear();
  }

  async quit() { await this.flush(); }
}

export class RedisService {
  constructor() {
    this._client = null;
    this._useMemory = false;
    this._memory = new MemoryCache();
    this._connected = false;
  }

  async connect() {
    if (this._connected) return;

    // Try ioredis first
    try {
      const { default: Redis } = await import('ioredis');
      const url = config.redis.url || process.env.REDIS_URL;
      this._client = url ? new Redis(url) : new Redis();
      await this._client.ping();
      this._connected = true;
      this._useMemory = false;
      console.log('[RedisService] Connected to Redis via ioredis');
    } catch (err) {
      console.warn(`[RedisService] ioredis unavailable (${err.message}), using in-memory cache`);
      this._useMemory = true;
      this._connected = true;
    }
  }

  get _backend() {
    return this._useMemory ? this._memory : this._client;
  }

  async get(key) {
    await this._ensureConnected();
    try {
      const val = await this._backend.get(key);
      if (val === null || val === undefined) return null;
      try { return JSON.parse(val); } catch { return val; }
    } catch (err) {
      console.error('[RedisService] get error:', err.message);
      return null;
    }
  }

  async set(key, value, ttlSeconds) {
    await this._ensureConnected();
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (this._useMemory) {
        await this._memory.set(key, serialized, ttlSeconds);
      } else {
        if (ttlSeconds && ttlSeconds > 0) {
          await this._client.setex(key, ttlSeconds, serialized);
        } else {
          await this._client.set(key, serialized);
        }
      }
    } catch (err) {
      console.error('[RedisService] set error:', err.message);
    }
  }

  async del(key) {
    await this._ensureConnected();
    try { return await this._backend.del(key); } catch (err) {
      console.error('[RedisService] del error:', err.message);
    }
  }

  async exists(key) {
    await this._ensureConnected();
    try { return await this._backend.exists(key); } catch (err) {
      console.error('[RedisService] exists error:', err.message);
      return 0;
    }
  }

  async hset(key, field, value) {
    await this._ensureConnected();
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (this._useMemory) {
        await this._memory.hset(key, field, serialized);
      } else {
        await this._client.hset(key, field, serialized);
      }
    } catch (err) {
      console.error('[RedisService] hset error:', err.message);
    }
  }

  async hget(key, field) {
    await this._ensureConnected();
    try {
      const val = await this._backend.hget(key, field);
      if (val === null || val === undefined) return null;
      try { return JSON.parse(val); } catch { return val; }
    } catch (err) {
      console.error('[RedisService] hget error:', err.message);
      return null;
    }
  }

  async hgetall(key) {
    await this._ensureConnected();
    try {
      const result = await this._backend.hgetall(key);
      if (!result) return null;
      const parsed = {};
      for (const [k, v] of Object.entries(result)) {
        try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
      }
      return parsed;
    } catch (err) {
      console.error('[RedisService] hgetall error:', err.message);
      return null;
    }
  }

  async publish(channel, message) {
    await this._ensureConnected();
    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      return await this._backend.publish(channel, payload);
    } catch (err) {
      console.error('[RedisService] publish error:', err.message);
      return 0;
    }
  }

  async subscribe(channel, callback) {
    await this._ensureConnected();
    try {
      if (this._useMemory) {
        await this._memory.subscribe(channel, callback);
      } else {
        // ioredis: need a separate subscriber client
        const { default: Redis } = await import('ioredis');
        const sub = this._client.duplicate();
        sub.subscribe(channel);
        sub.on('message', (ch, msg) => {
          if (ch === channel) {
            try { callback(ch, JSON.parse(msg)); } catch { callback(ch, msg); }
          }
        });
      }
    } catch (err) {
      console.error('[RedisService] subscribe error:', err.message);
    }
  }

  async flush() {
    await this._ensureConnected();
    try {
      if (this._useMemory) { await this._memory.flush(); }
      else { await this._client.flushdb(); }
    } catch (err) {
      console.error('[RedisService] flush error:', err.message);
    }
  }

  async quit() {
    try {
      if (!this._useMemory && this._client) await this._client.quit();
      else await this._memory.quit();
      this._connected = false;
    } catch (err) {
      console.error('[RedisService] quit error:', err.message);
    }
  }

  async _ensureConnected() {
    if (!this._connected) await this.connect();
  }
}

export default new RedisService();
