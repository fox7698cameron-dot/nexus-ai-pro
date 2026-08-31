// File: src/redis/redisClient.js | Created: 2026-08-31 | Nexus AI Pro
// Redis client wrapper - handles connection, graceful fallback when unavailable
// REDIS_URL must be set in .env - never hardcoded

/**
 * Redis client with in-memory fallback.
 * In production install: npm install ioredis
 * Set REDIS_URL in environment (e.g. redis://localhost:6379 or rediss://user:pass@host:6380)
 */

let client = null;
const memoryStore = new Map(); // fallback when Redis not available

// ─────────────────────────────────────────
// Dynamic connection
// ─────────────────────────────────────────

export async function connectRedis() {
  if (!process.env.REDIS_URL) {
    console.warn('[Redis] REDIS_URL not set. Using in-memory fallback (not suitable for production).');
    return null;
  }

  try {
    const { default: Redis } = await import('ioredis');
    const opts = {
      lazyConnect:        true,
      retryStrategy:      () => null, // do not auto-retry (exponential backoff removed per spec)
      enableReadyCheck:   true,
      connectTimeout:     5000,
      maxRetriesPerRequest: 1,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    };

    client = new Redis(process.env.REDIS_URL, opts);
    await client.connect();
    console.info('[Redis] Connected:', process.env.REDIS_URL.replace(/\/\/.*@/, '//<redacted>@'));
    return client;
  } catch (err) {
    console.error('[Redis] Connection failed, using memory fallback:', err.message);
    client = null;
    return null;
  }
}

// ─────────────────────────────────────────
// Unified get/set API (works with or without Redis)
// ─────────────────────────────────────────

/**
 * Set a key with optional TTL (seconds).
 */
export async function cacheSet(key, value, ttlSeconds = 0) {
  const serialized = JSON.stringify(value);
  if (client) {
    if (ttlSeconds > 0) return client.set(key, serialized, 'EX', ttlSeconds);
    return client.set(key, serialized);
  }
  memoryStore.set(key, { value: serialized, expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null });
  return 'OK';
}

/**
 * Get a key. Returns null if not found or expired.
 */
export async function cacheGet(key) {
  if (client) {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return JSON.parse(entry.value);
}

/**
 * Delete a key.
 */
export async function cacheDel(key) {
  if (client) return client.del(key);
  return memoryStore.delete(key) ? 1 : 0;
}

/**
 * Publish a message to a channel.
 */
export async function publish(channel, message) {
  if (client) return client.publish(channel, JSON.stringify(message));
  // Emit via local event bus in fallback mode
  return 0;
}

/**
 * Check if Redis is available.
 */
export function isRedisAvailable() {
  return client !== null;
}

export default { connectRedis, cacheSet, cacheGet, cacheDel, publish, isRedisAvailable };
