// src/storage/index.js
// Nexus AI Pro - Unified Storage Service (Redis + Azure Blob)
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import Redis from 'ioredis';
import { BlobServiceClient } from '@azure/storage-blob';

// ─── In-memory fallback store ─────────────────────────────────────────────────
class MemoryStore {
  constructor() {
    this._data = new Map();
  }
  async get(key) {
    const entry = this._data.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this._data.delete(key);
      return null;
    }
    return entry.value;
  }
  async set(key, value, ttlSeconds = null) {
    this._data.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }
  async del(key) { this._data.delete(key); }
  async exists(key) { return (await this.get(key)) !== null; }
  async keys(pattern) {
    const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this._data.keys()].filter(k => re.test(k));
  }
}

// ─── Redis store ─────────────────────────────────────────────────────────────
class RedisStore {
  constructor(client) {
    this._client = client;
  }
  async get(key) {
    const raw = await this._client.get(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  }
  async set(key, value, ttlSeconds = null) {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this._client.setex(key, ttlSeconds, serialized);
    } else {
      await this._client.set(key, serialized);
    }
  }
  async del(key) { await this._client.del(key); }
  async exists(key) { return (await this._client.exists(key)) === 1; }
  async keys(pattern) { return this._client.keys(pattern); }
}

// ─── Blob storage ─────────────────────────────────────────────────────────────
class BlobStorage {
  constructor() {
    this._client = null;
    this._containerName = process.env.AZURE_BLOB_CONTAINER || 'nexus-assets';
  }

  _init() {
    if (this._client) return;
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connStr) {
      this._client = BlobServiceClient.fromConnectionString(connStr);
    }
  }

  async upload(blobName, data, contentType = 'application/octet-stream') {
    this._init();
    if (!this._client) throw new Error('Azure Blob Storage not configured');
    const container = this._client.getContainerClient(this._containerName);
    await container.createIfNotExists({ access: 'private' });
    const blockBlob = container.getBlockBlobClient(blobName);
    await blockBlob.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blockBlob.url;
  }

  async download(blobName) {
    this._init();
    if (!this._client) throw new Error('Azure Blob Storage not configured');
    const container = this._client.getContainerClient(this._containerName);
    const blockBlob = container.getBlockBlobClient(blobName);
    const response = await blockBlob.download();
    return response.readableStreamBody;
  }

  async delete(blobName) {
    this._init();
    if (!this._client) throw new Error('Azure Blob Storage not configured');
    const container = this._client.getContainerClient(this._containerName);
    await container.getBlockBlobClient(blobName).deleteIfExists();
  }

  async list(prefix = '') {
    this._init();
    if (!this._client) return [];
    const container = this._client.getContainerClient(this._containerName);
    const blobs = [];
    for await (const blob of container.listBlobsFlat({ prefix })) {
      blobs.push({ name: blob.name, size: blob.properties.contentLength });
    }
    return blobs;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _kv = null;
let _blob = null;
let _redisClient = null;

export function createKVStore() {
  if (_kv) return _kv;
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    _redisClient = new Redis(redisUrl, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    _redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });
    _kv = new RedisStore(_redisClient);
  } else {
    console.warn('[Storage] REDIS_URL not set — using in-memory store (not suitable for production)');
    _kv = new MemoryStore();
  }
  return _kv;
}

export function createBlobStorage() {
  if (_blob) return _blob;
  _blob = new BlobStorage();
  return _blob;
}

export function getRedisClient() { return _redisClient; }
