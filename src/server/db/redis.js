/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Redis Client — singleton with lazy connection
 * Used for: session store, rate-limit counters, real-time pub/sub, caching
 * Date: 2026-08-09
 */

import { createClient } from 'redis';
import winston from 'winston';

const log = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { module: 'redis', date: '2026-08-09' },
  transports: [new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })],
});

let client = null;
let pubClient = null;
let subClient = null;
let connected = false;

/**
 * Initialize Redis connection.
 * Reads REDIS_URL from env — never falls back to a hardcoded address.
 */
export async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    log.warn('REDIS_URL not set — Redis features disabled');
    return null;
  }

  if (client && connected) return client;

  client = createClient({ url, socket: { reconnectStrategy: false } });
  pubClient = client.duplicate();
  subClient = client.duplicate();

  client.on('error', err => log.error('redis_error', { err: err.message }));
  client.on('connect', () => {
    connected = true;
    log.info('redis_connected');
  });
  client.on('end', () => {
    connected = false;
    log.info('redis_disconnected');
  });

  await Promise.all([client.connect(), pubClient.connect(), subClient.connect()]);
  return client;
}

/** Get the shared Redis client (null if not connected) */
export function getRedisClient() {
  return client;
}

/** Pub/Sub clients for real-time channels */
export function getPubClient() { return pubClient; }
export function getSubClient() { return subClient; }

/**
 * Convenience: set a key with optional TTL (seconds)
 */
export async function redisSet(key, value, ttlSec) {
  if (!client) return;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttlSec) {
    await client.set(key, serialized, { EX: ttlSec });
  } else {
    await client.set(key, serialized);
  }
}

/**
 * Convenience: get a key (auto-parse JSON)
 */
export async function redisGet(key) {
  if (!client) return null;
  const val = await client.get(key);
  if (val === null) return null;
  try { return JSON.parse(val); } catch { return val; }
}

/** Invalidate a key */
export async function redisDel(key) {
  if (!client) return;
  await client.del(key);
}

/** Publish event to a channel (for real-time dashboards) */
export async function publish(channel, payload) {
  if (!pubClient) return;
  await pubClient.publish(channel, JSON.stringify(payload));
}

/** Subscribe to a channel */
export async function subscribe(channel, handler) {
  if (!subClient) return;
  await subClient.subscribe(channel, (msg) => {
    try { handler(JSON.parse(msg)); } catch { handler(msg); }
  });
}
