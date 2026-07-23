// src/storage/storageService.js
// 2026-07-23 | Nexus AI Pro - Redis + Blob Storage Service
// Providers: Redis (via ioredis), Azure Blob, AWS S3, GCS
// All credentials from environment variables — never hardcoded

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const STORAGE_PROVIDERS = Object.freeze({
  MEMORY: 'memory',
  REDIS: 'redis',
  AZURE_BLOB: 'azure_blob',
  AWS_S3: 'aws_s3',
  GCS: 'gcs',
});

export class StorageService {
  constructor(securityModule) {
    this.security = securityModule;
    this._redis = null;
    this._memoryStore = new Map();
    this._blobProvider = null;
    this._initialized = false;
    this.defaultTTL = 86400;
  }

  async init() {
    if (this._initialized) return;
    await this._initRedis();
    await this._initBlobStorage();
    this._initialized = true;
  }

  async _initRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    try {
      const { default: Redis } = await import('ioredis').catch(() => null);
      if (!Redis) return;

      this._redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
      });

      await this._redis.connect();
      this.security.logAudit('REDIS_CONNECTED', { url: redisUrl.replace(/:\/\/.*@/, '://***@') });
    } catch (err) {
      this.security.logAudit('REDIS_CONNECT_FAILED', { error: err.message });
      this._redis = null;
    }
  }

  async _initBlobStorage() {
    const provider = process.env.BLOB_STORAGE_PROVIDER;
    if (!provider) return;

    switch (provider) {
      case STORAGE_PROVIDERS.AZURE_BLOB: {
        const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connStr) return;
        try {
          const { BlobServiceClient } = await import('@azure/storage-blob').catch(() => ({ BlobServiceClient: null }));
          if (BlobServiceClient) {
            this._blobProvider = { type: 'azure', client: BlobServiceClient.fromConnectionString(connStr) };
            this.security.logAudit('BLOB_AZURE_CONNECTED', {});
          }
        } catch (err) {
          this.security.logAudit('BLOB_AZURE_FAILED', { error: err.message });
        }
        break;
      }
      case STORAGE_PROVIDERS.AWS_S3: {
        const bucket = process.env.AWS_S3_BUCKET;
        const region = process.env.AWS_REGION || 'us-east-1';
        if (!bucket) return;
        try {
          const { S3Client } = await import('@aws-sdk/client-s3').catch(() => ({ S3Client: null }));
          if (S3Client) {
            this._blobProvider = { type: 'aws', client: new S3Client({ region }), bucket };
            this.security.logAudit('BLOB_S3_CONNECTED', { bucket, region });
          }
        } catch (err) {
          this.security.logAudit('BLOB_S3_FAILED', { error: err.message });
        }
        break;
      }
    }
  }

  // Redis key-value cache
  async cacheSet(key, value, ttlSeconds = this.defaultTTL) {
    const serialized = JSON.stringify({ v: value, ts: Date.now() });

    if (this._redis) {
      await this._redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      this._memoryStore.set(key, { serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
  }

  async cacheGet(key) {
    if (this._redis) {
      const raw = await this._redis.get(key);
      if (!raw) return null;
      try { return JSON.parse(raw).v; } catch { return null; }
    }

    const entry = this._memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this._memoryStore.delete(key); return null; }
    try { return JSON.parse(entry.serialized).v; } catch { return null; }
  }

  async cacheDel(key) {
    if (this._redis) {
      await this._redis.del(key);
    } else {
      this._memoryStore.delete(key);
    }
  }

  async cacheIncrBy(key, delta = 1, ttlSeconds = this.defaultTTL) {
    if (this._redis) {
      const result = await this._redis.incrby(key, delta);
      await this._redis.expire(key, ttlSeconds);
      return result;
    }
    const current = await this.cacheGet(key) || 0;
    const next = current + delta;
    await this.cacheSet(key, next, ttlSeconds);
    return next;
  }

  // Pub/Sub for real-time events
  async publish(channel, message) {
    if (!this._redis) return false;
    await this._redis.publish(channel, JSON.stringify({ ...message, ts: Date.now() }));
    return true;
  }

  createSubscriber(channels, onMessage) {
    if (!this._redis) return null;
    const sub = this._redis.duplicate();
    sub.subscribe(...channels);
    sub.on('message', (channel, message) => {
      try { onMessage(channel, JSON.parse(message)); } catch { onMessage(channel, message); }
    });
    return sub;
  }

  // Blob storage
  async uploadBlob(containerOrBucket, blobName, buffer, contentType = 'application/octet-stream', encrypt = true) {
    let data = buffer;
    let encryptedMeta = null;

    if (encrypt) {
      const encResult = this.security.encrypt(buffer.toString('base64'));
      data = Buffer.from(JSON.stringify(encResult));
      contentType = 'application/json';
      encryptedMeta = { encrypted: true, originalContentType: contentType };
    }

    const id = uuidv4();

    if (this._blobProvider?.type === 'azure') {
      const container = this._blobProvider.client.getContainerClient(containerOrBucket);
      await container.createIfNotExists();
      const blockBlob = container.getBlockBlobClient(blobName);
      await blockBlob.uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });
    } else if (this._blobProvider?.type === 'aws') {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      await this._blobProvider.client.send(new PutObjectCommand({
        Bucket: this._blobProvider.bucket,
        Key: `${containerOrBucket}/${blobName}`,
        Body: data,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }));
    } else {
      await this.cacheSet(`blob:${containerOrBucket}:${blobName}`, data.toString('base64'), 7 * 86400);
    }

    const meta = { id, container: containerOrBucket, name: blobName, size: buffer.length, contentType, encryptedMeta, uploadedAt: Date.now() };
    if (this._redis) await this.cacheSet(`blobmeta:${id}`, meta, 30 * 86400);
    this.security.logAudit('BLOB_UPLOADED', { id, container: containerOrBucket, name: blobName, size: buffer.length });
    return meta;
  }

  async downloadBlob(containerOrBucket, blobName) {
    if (this._blobProvider?.type === 'azure') {
      const container = this._blobProvider.client.getContainerClient(containerOrBucket);
      const blockBlob = container.getBlockBlobClient(blobName);
      const download = await blockBlob.download();
      return Buffer.from(await this._streamToBuffer(download.readableStreamBody));
    }

    if (this._blobProvider?.type === 'aws') {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const res = await this._blobProvider.client.send(new GetObjectCommand({
        Bucket: this._blobProvider.bucket,
        Key: `${containerOrBucket}/${blobName}`,
      }));
      return Buffer.from(await res.Body.transformToByteArray());
    }

    const cached = await this.cacheGet(`blob:${containerOrBucket}:${blobName}`);
    if (cached) return Buffer.from(cached, 'base64');
    throw new Error('Blob not found');
  }

  async _streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async deleteBlob(containerOrBucket, blobName) {
    if (this._blobProvider?.type === 'azure') {
      const container = this._blobProvider.client.getContainerClient(containerOrBucket);
      await container.getBlockBlobClient(blobName).deleteIfExists();
    } else if (this._blobProvider?.type === 'aws') {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await this._blobProvider.client.send(new DeleteObjectCommand({
        Bucket: this._blobProvider.bucket,
        Key: `${containerOrBucket}/${blobName}`,
      }));
    } else {
      await this.cacheDel(`blob:${containerOrBucket}:${blobName}`);
    }
    this.security.logAudit('BLOB_DELETED', { container: containerOrBucket, name: blobName });
  }

  getStatus() {
    return {
      redis: this._redis ? 'connected' : 'not_configured',
      blobProvider: this._blobProvider?.type || 'memory',
      memoryCacheSize: this._memoryStore.size,
    };
  }

  async close() {
    if (this._redis) await this._redis.quit();
  }
}
