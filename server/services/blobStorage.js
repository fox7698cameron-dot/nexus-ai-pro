/**
 * server/services/blobStorage.js
 * Blob / object storage abstraction for Nexus AI Pro
 * Supports: AWS S3, Azure Blob Storage, Google Cloud Storage
 * Falls back to local disk storage in development.
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * All credentials are read from environment variables – never hardcoded.
 */

import crypto from 'crypto';
import path   from 'path';
import fs     from 'fs/promises';

// ─── Provider detection ───────────────────────────────────────────────────────

const PROVIDER = (process.env.BLOB_STORAGE_PROVIDER ?? 'local').toLowerCase();

// ─── Sanitise file names ──────────────────────────────────────────────────────

/**
 * Generate a safe storage key from an original filename.
 * @param {string} originalName
 * @param {string} prefix - e.g. 'uploads/avatars'
 * @returns {string}
 */
export function buildStorageKey(originalName, prefix = 'uploads') {
  const ext  = path.extname(originalName).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
  const hash = crypto.randomBytes(16).toString('hex');
  const ts   = Date.now();
  return `${prefix}/${ts}-${hash}${ext}`;
}

// ─── AWS S3 adapter ───────────────────────────────────────────────────────────

async function s3Upload(key, buffer, mimeType) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl }               = await import('@aws-sdk/s3-request-presigner');

  const client = new S3Client({
    region:      process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET not set');

  await client.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         key,
    Body:        buffer,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',
  }));

  const url = `https://${bucket}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${key}`;
  return { key, url, provider: 's3' };
}

async function s3Delete(key) {
  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region:      process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key:    key,
  }));
  return true;
}

async function s3GetSignedUrl(key, expiresIn = 3600) {
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl }               = await import('@aws-sdk/s3-request-presigner');

  const client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key }),
    { expiresIn },
  );
}

// ─── Azure Blob adapter ───────────────────────────────────────────────────────

async function azureUpload(key, buffer, mimeType) {
  const { BlobServiceClient } = await import('@azure/storage-blob');
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');

  const client    = BlobServiceClient.fromConnectionString(connStr);
  const container = process.env.AZURE_BLOB_CONTAINER ?? 'nexus-uploads';
  const cc        = client.getContainerClient(container);
  await cc.createIfNotExists({ access: 'private' });

  const bc = cc.getBlockBlobClient(key);
  await bc.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mimeType } });

  return { key, url: bc.url, provider: 'azure' };
}

// ─── Google Cloud Storage adapter ────────────────────────────────────────────

async function gcsUpload(key, buffer, mimeType) {
  const { Storage } = await import('@google-cloud/storage');

  const storage = new Storage({
    projectId:   process.env.GCP_PROJECT_ID,
    credentials: process.env.GCP_CREDENTIALS_JSON
      ? JSON.parse(process.env.GCP_CREDENTIALS_JSON)
      : undefined,
  });

  const bucket = process.env.GCS_BUCKET;
  if (!bucket) throw new Error('GCS_BUCKET not set');

  const file = storage.bucket(bucket).file(key);
  await file.save(buffer, { contentType: mimeType, resumable: false });
  const url = `https://storage.googleapis.com/${bucket}/${key}`;
  return { key, url, provider: 'gcs' };
}

// ─── Local disk adapter (development) ────────────────────────────────────────

const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? './uploads';

async function localUpload(key, buffer) {
  const fullPath = path.join(LOCAL_UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  const url = `/uploads/${key}`;
  return { key, url, provider: 'local' };
}

async function localDelete(key) {
  const fullPath = path.join(LOCAL_UPLOAD_DIR, key);
  try { await fs.unlink(fullPath); return true; } catch { return false; }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to the configured storage backend.
 * @param {string} key - Storage path/key
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<{ key: string, url: string, provider: string }>}
 */
export async function uploadFile(key, buffer, mimeType = 'application/octet-stream') {
  switch (PROVIDER) {
    case 's3':    return s3Upload(key, buffer, mimeType);
    case 'azure': return azureUpload(key, buffer, mimeType);
    case 'gcs':   return gcsUpload(key, buffer, mimeType);
    default:      return localUpload(key, buffer);
  }
}

/**
 * Delete a file from the configured storage backend.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function deleteFile(key) {
  switch (PROVIDER) {
    case 's3':    return s3Delete(key);
    case 'local': return localDelete(key);
    default:
      console.warn('[blobStorage] delete not yet implemented for provider:', PROVIDER);
      return false;
  }
}

/**
 * Get a short-lived signed URL for private file access (S3 only; others return public URL).
 * @param {string} key
 * @param {number} expiresIn - seconds
 * @returns {Promise<string>}
 */
export async function getDownloadUrl(key, expiresIn = 3600) {
  if (PROVIDER === 's3') return s3GetSignedUrl(key, expiresIn);
  return `${process.env.APP_URL ?? ''}/uploads/${key}`;
}

/**
 * Storage health check.
 * @returns {Promise<{ ok: boolean, provider: string, error?: string }>}
 */
export async function storageHealth() {
  const testKey = `_health/${Date.now()}.txt`;
  const buf     = Buffer.from('ok');
  try {
    await uploadFile(testKey, buf, 'text/plain');
    await deleteFile(testKey);
    return { ok: true, provider: PROVIDER };
  } catch (err) {
    return { ok: false, provider: PROVIDER, error: err.message };
  }
}

export default { uploadFile, deleteFile, getDownloadUrl, buildStorageKey, storageHealth };
