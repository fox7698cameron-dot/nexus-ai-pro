// lib/redis.js - 2026-07-20
import Redis from 'ioredis';

let client = null;

export function getRedis() {
  if (!client && process.env.REDIS_URL) {
    client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop after 3 attempts
        return Math.min(times * 500, 2000);
      },
      enableOfflineQueue: false,
    });
    client.on('error', (err) => console.error('[redis] Error:', err.message));
    client.on('connect', () => console.log('[redis] Connected'));
  }
  return client;
}

export async function cacheGet(key) {
  const r = getRedis();
  if (!r) return null;
  try {
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  const r = getRedis();
  if (!r) return false;
  try {
    await r.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

export async function cacheDel(key) {
  const r = getRedis();
  if (!r) return false;
  try {
    await r.del(key);
    return true;
  } catch {
    return false;
  }
}
