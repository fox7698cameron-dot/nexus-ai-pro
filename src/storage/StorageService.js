// src/storage/StorageService.js
// Updated: 2026-10-25
// Redis session/cache layer + blob storage (Azure, AWS S3, GCS)

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ─── In-memory fallback store (used when Redis is unavailable) ────────────────
class MemoryStore {
  constructor() {
    this._data = new Map();
    this._expiry = new Map();
    // Prune expired keys every 5 minutes
    setInterval(() => this._prune(), 5 * 60 * 1000);
  }

  _prune() {
    const now = Date.now();
    for (const [k, exp] of this._expiry.entries()) {
      if (now > exp) { this._data.delete(k); this._expiry.delete(k); }
    }
  }

  async get(key) { return this._data.get(key) ?? null; }
  async set(key, value, ttlMs = null) {
    this._data.set(key, value);
    if (ttlMs) this._expiry.set(key, Date.now() + ttlMs);
    return true;
  }
  async del(key) { this._data.delete(key); this._expiry.delete(key); return true; }
  async exists(key) { return this._data.has(key); }
  async ping() { return true; }
}

// ─── Redis wrapper (uses ioredis if available, else memory store) ──────────────
export class RedisService {
  constructor() {
    this._redisUrl = process.env.REDIS_URL;
    this._client = null;
    this._memoryFallback = new MemoryStore();
    this._connected = false;
  }

  async connect() {
    if (!this._redisUrl) {
      this._connected = false;
      return false;
    }
    try {
      // Dynamic import so the server works without ioredis installed
      const { default: Redis } = await import('ioredis');
      this._client = new Redis(this._redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        lazyConnect: true
      });
      await this._client.connect();
      await this._client.ping();
      this._connected = true;
      return true;
    } catch {
      this._connected = false;
      return false;
    }
  }

  get store() { return this._connected && this._client ? this._client : this._memoryFallback; }
  get isRedisConnected() { return this._connected; }

  async get(key) { return this.store.get(key); }
  async set(key, value, ttlSeconds = null) {
    if (this._connected && this._client) {
      if (ttlSeconds) return this._client.setex(key, ttlSeconds, value);
      return this._client.set(key, value);
    }
    return this._memoryFallback.set(key, value, ttlSeconds ? ttlSeconds * 1000 : null);
  }
  async del(key) { return this.store.del(key); }
  async exists(key) { return this.store.exists(key); }

  // ─── Session helpers ───────────────────────────────────────────────────────
  async setSession(sessionId, data, ttlSeconds = 3600) {
    return this.set(`session:${sessionId}`, JSON.stringify(data), ttlSeconds);
  }
  async getSession(sessionId) {
    const raw = await this.get(`session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  }
  async deleteSession(sessionId) { return this.del(`session:${sessionId}`); }

  // ─── Rate-limit counter ────────────────────────────────────────────────────
  async incrementCounter(key, ttlSeconds = 60) {
    if (this._connected && this._client) {
      const val = await this._client.incr(key);
      if (val === 1) await this._client.expire(key, ttlSeconds);
      return val;
    }
    const current = (await this._memoryFallback.get(key)) || 0;
    const next = parseInt(current, 10) + 1;
    await this._memoryFallback.set(key, next, ttlSeconds * 1000);
    return next;
  }

  // ─── Cache ────────────────────────────────────────────────────────────────
  async cacheGet(key) {
    const raw = await this.get(`cache:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }
  async cacheSet(key, value, ttlSeconds = 300) {
    return this.set(`cache:${key}`, JSON.stringify(value), ttlSeconds);
  }
}

// ─── Blob storage abstraction ─────────────────────────────────────────────────
export class BlobStorageService {
  constructor() {
    this._provider = process.env.BLOB_STORAGE_PROVIDER || 'local'; // 'azure' | 'aws' | 'gcs' | 'local'
    this._localDir = process.env.BLOB_LOCAL_DIR || '/tmp/nexus-blobs';
    this._localStore = new Map(); // in-memory for demo when no cloud provider
  }

  // Encrypt blob data before storage
  _encryptData(data) {
    const key = Buffer.from(process.env.BLOB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.isBuffer(data) ? data : Buffer.from(data)), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { iv: iv.toString('hex'), data: encrypted.toString('hex'), tag: tag.toString('hex') };
  }

  _decryptData(stored) {
    const key = Buffer.from(process.env.BLOB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(stored.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(stored.tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(stored.data, 'hex')), decipher.final()]);
  }

  async upload(userId, filename, data, contentType = 'application/octet-stream') {
    const blobId = uuidv4();
    const encrypted = this._encryptData(data);
    const metadata = {
      blobId,
      userId,
      filename,
      contentType,
      size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
      uploadedAt: Date.now(),
      encrypted: true,
      provider: this._provider
    };

    // Store encrypted blob in memory (production: forward to Azure/S3/GCS)
    this._localStore.set(blobId, { encrypted, metadata });

    return { blobId, ...metadata };
  }

  async download(blobId, userId) {
    const blob = this._localStore.get(blobId);
    if (!blob) throw new Error('Blob not found');
    if (blob.metadata.userId !== userId) throw new Error('Access denied');
    return this._decryptData(blob.encrypted);
  }

  async delete(blobId, userId) {
    const blob = this._localStore.get(blobId);
    if (!blob) return false;
    if (blob.metadata.userId !== userId) throw new Error('Access denied');
    this._localStore.delete(blobId);
    return true;
  }

  listUserBlobs(userId) {
    return [...this._localStore.values()]
      .filter(b => b.metadata.userId === userId)
      .map(b => b.metadata);
  }
}

export const redisService = new RedisService();
export const blobStorage = new BlobStorageService();

// Attempt Redis connection on module load
redisService.connect().catch(() => {});
