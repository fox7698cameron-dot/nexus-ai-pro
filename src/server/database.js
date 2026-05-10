// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { createHmac, createHash } from 'crypto';

// ── In-memory fallback store with TTL ─────────────────────────
class MemoryStore {
  constructor() {
    this._data = new Map();
    this._ttls = new Map();
    // Evict every minute to prevent unbounded growth
    setInterval(() => this._evict(), 60_000).unref();
  }

  _evict() {
    const now = Date.now();
    for (const [key, expiry] of this._ttls) {
      if (expiry < now) {
        this._data.delete(key);
        this._ttls.delete(key);
      }
    }
  }

  _checkTtl(key) {
    const expiry = this._ttls.get(key);
    if (expiry && expiry < Date.now()) {
      this._data.delete(key);
      this._ttls.delete(key);
      return false;
    }
    return true;
  }

  async get(key) {
    return this._checkTtl(key) ? (this._data.get(key) ?? null) : null;
  }

  async set(key, value, ttlSeconds) {
    this._data.set(key, value);
    if (ttlSeconds) this._ttls.set(key, Date.now() + ttlSeconds * 1000);
    return 'OK';
  }

  async del(key) {
    const had = this._data.has(key);
    this._data.delete(key);
    this._ttls.delete(key);
    return had ? 1 : 0;
  }

  async exists(key) {
    return this._checkTtl(key) && this._data.has(key) ? 1 : 0;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return [...this._data.keys()].filter(k => this._checkTtl(k) && regex.test(k));
  }

  async expire(key, ttlSeconds) {
    if (!this._data.has(key)) return 0;
    this._ttls.set(key, Date.now() + ttlSeconds * 1000);
    return 1;
  }

  async incr(key) {
    const current = parseInt((await this.get(key)) || '0', 10);
    const next = current + 1;
    await this.set(key, String(next));
    return next;
  }

  // Sorted-set primitives (score desc order stored)
  async zadd(key, score, member) {
    if (!this._data.has(key)) this._data.set(key, []);
    const arr = this._data.get(key);
    const idx = arr.findIndex(e => e.member === member);
    if (idx >= 0) arr[idx].score = score;
    else arr.push({ score, member });
    arr.sort((a, b) => b.score - a.score);
    return 1;
  }

  async zrange(key, start, stop, _opts = {}) {
    const arr = this._data.get(key) || [];
    return arr.slice(start, stop === -1 ? undefined : stop + 1);
  }
}

// ── Redis client with in-memory fallback ─────────────────────
let _client = null;

async function buildClient() {
  if (!process.env.REDIS_URL) return new MemoryStore();
  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 3000
    });
    await client.connect();
    client.on('error', err => console.warn('[db] Redis error:', err.message));
    return client;
  } catch (err) {
    console.warn('[db] Redis unavailable, using in-memory store:', err.message);
    return new MemoryStore();
  }
}

// Resolved before first export use; callers may await db.ready
const _ready = buildClient().then(c => { _client = c; });

export const db = {
  get ready() { return _ready; },

  get(key) { return _client.get(key); },

  set(key, value, ttlSeconds) {
    if (ttlSeconds) return _client.set(key, value, 'EX', ttlSeconds);
    return _client.set(key, value);
  },

  del(key) { return _client.del(key); },
  exists(key) { return _client.exists(key); },
  keys(pattern) { return _client.keys(pattern); },
  expire(key, ttl) { return _client.expire(key, ttl); },
  incr(key) { return _client.incr(key); },

  zadd(key, score, member) { return _client.zadd(key, score, member); },

  zrange(key, start, stop, opts) {
    if (_client instanceof MemoryStore) return _client.zrange(key, start, stop, opts);
    return _client.zrange(key, start, stop, 'WITHSCORES');
  }
};

// ── AWS Signature V4 (pure Node.js crypto, no SDK) ───────────
function hmac(key, data) {
  return createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

function signV4({ method, url, headers, body = '', service, region, accessKey, secretKey }) {
  const parsed = new URL(url);
  const now = new Date();
  // yyyymmddTHHmmssZ  →  strip separators
  const dateTimeStr = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStr = dateTimeStr.slice(0, 8);

  const sortedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map(k => `${k}:${headers[Object.keys(headers).find(h => h.toLowerCase() === k)].trim()}`)
    .join('\n') + '\n';
  const signedHeaders = sortedHeaderKeys.join(';');

  const payloadHash = sha256Hex(body || '');
  const canonicalRequest = [
    method, parsed.pathname, parsed.search.slice(1),
    canonicalHeaders, signedHeaders, payloadHash
  ].join('\n');

  const credentialScope = `${dateStr}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', dateTimeStr, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const signingKey = [dateStr, region, service, 'aws4_request'].reduce(
    (key, part) => hmac(key, part),
    Buffer.from(`AWS4${secretKey}`)
  );
  const signature = hmac(signingKey, stringToSign).toString('hex');

  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// ── Blob storage abstraction ──────────────────────────────────
class BlobStorage {
  constructor() {
    // Ephemeral in-process fallback when no cloud storage is configured
    this._memory = new Map();
  }

  async uploadBlob(name, buffer, mimetype) {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return this._azureUpload(name, buffer, mimetype);
    }
    if (process.env.AWS_ACCESS_KEY_ID) {
      return this._s3Upload(name, buffer, mimetype);
    }
    this._memory.set(name, { buffer, mimetype, uploadedAt: Date.now() });
    return { url: `memory://${name}`, provider: 'memory' };
  }

  async getBlob(name) {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return this._azureGet(name).catch(() => this._s3Get(name));
    }
    if (process.env.AWS_ACCESS_KEY_ID) return this._s3Get(name);
    return this._memory.get(name)?.buffer ?? null;
  }

  async _azureUpload(name, buffer, mimetype) {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const container = process.env.AZURE_CONTAINER_NAME || 'nexus-uploads';
    const match = connStr.match(/AccountName=([^;]+)/);
    if (!match) throw new Error('Cannot parse Azure account name from connection string');
    const account = match[1];
    const url = `https://${account}.blob.core.windows.net/${container}/${encodeURIComponent(name)}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': mimetype,
        'Content-Length': String(buffer.length),
        'x-ms-blob-type': 'BlockBlob',
        'x-ms-version': '2020-10-02'
      },
      body: buffer
    });

    if (!res.ok) throw new Error(`Azure upload failed: ${res.status} ${await res.text()}`);
    return { url, provider: 'azure' };
  }

  async _azureGet(name) {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const container = process.env.AZURE_CONTAINER_NAME || 'nexus-uploads';
    const match = connStr.match(/AccountName=([^;]+)/);
    const account = match?.[1];
    if (!account) return null;
    const url = `https://${account}.blob.core.windows.net/${container}/${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  async _s3Upload(name, buffer, mimetype) {
    const { region, bucket, accessKey, secretKey } = this._s3Env();
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(name)}`;
    const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');

    const headers = {
      'Content-Type': mimetype,
      Host: `${bucket}.s3.${region}.amazonaws.com`,
      'x-amz-date': now
    };
    const auth = signV4({ method: 'PUT', url, headers, body: buffer, service: 's3', region, accessKey, secretKey });
    const res = await fetch(url, { method: 'PUT', headers: { ...headers, Authorization: auth }, body: buffer });
    if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
    return { url, provider: 's3' };
  }

  async _s3Get(name) {
    const { region, bucket, accessKey, secretKey } = this._s3Env();
    if (!bucket) return null;
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(name)}`;
    const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const headers = { Host: `${bucket}.s3.${region}.amazonaws.com`, 'x-amz-date': now };
    const auth = signV4({ method: 'GET', url, headers, body: '', service: 's3', region, accessKey, secretKey });
    const res = await fetch(url, { headers: { ...headers, Authorization: auth } });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  _s3Env() {
    return {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET,
      accessKey: process.env.AWS_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY
    };
  }
}

export const blobStore = new BlobStorage();
