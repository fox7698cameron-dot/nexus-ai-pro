// File: src/storage/blobStorage.js | Created: 2026-08-31 | Nexus AI Pro
// Azure Blob Storage / AWS S3 wrapper with secure signed URL generation
// All credentials from environment variables - no hardcoding

/**
 * Unified blob storage interface.
 * Azure: install @azure/storage-blob, set BLOB_STORAGE_URL + BLOB_CONTAINER
 * AWS S3: install @aws-sdk/client-s3, set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION + S3_BUCKET
 */

const PROVIDER = process.env.BLOB_PROVIDER || 'azure'; // 'azure' | 's3'
const AZURE_URL = process.env.BLOB_STORAGE_URL;
const AZURE_CONTAINER = process.env.BLOB_CONTAINER || 'nexus-uploads';
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'us-east-1';

// ─────────────────────────────────────────
// Upload file
// ─────────────────────────────────────────

/**
 * Upload a buffer to blob storage.
 * @param {Buffer} buffer - file data
 * @param {string} blobName - unique name/path in container
 * @param {string} contentType - MIME type
 * @returns {Promise<{url: string, provider: string}>}
 */
export async function uploadBlob(buffer, blobName, contentType = 'application/octet-stream') {
  if (PROVIDER === 'azure') return uploadAzure(buffer, blobName, contentType);
  if (PROVIDER === 's3')    return uploadS3(buffer, blobName, contentType);
  throw new Error(`Unknown BLOB_PROVIDER: ${PROVIDER}`);
}

async function uploadAzure(buffer, blobName, contentType) {
  if (!AZURE_URL) throw new Error('BLOB_STORAGE_URL not set in environment');
  const { BlobServiceClient } = await import('@azure/storage-blob');
  const client = BlobServiceClient.fromConnectionString(AZURE_URL);
  const container = client.getContainerClient(AZURE_CONTAINER);
  await container.createIfNotExists({ access: 'none' });
  const blobClient = container.getBlockBlobClient(blobName);
  await blobClient.upload(buffer, buffer.length, { blobHTTPHeaders: { blobContentType: contentType } });
  return { url: blobClient.url, provider: 'azure', blobName };
}

async function uploadS3(buffer, blobName, contentType) {
  if (!S3_BUCKET) throw new Error('S3_BUCKET not set in environment');
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: S3_REGION });
  await s3.send(new PutObjectCommand({
    Bucket:      S3_BUCKET,
    Key:         blobName,
    Body:        buffer,
    ContentType: contentType,
    ServerSideEncryption: 'AES256'
  }));
  return { url: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${blobName}`, provider: 's3', blobName };
}

// ─────────────────────────────────────────
// Generate pre-signed download URL
// ─────────────────────────────────────────

/**
 * Generate a time-limited pre-signed URL (never exposes storage credentials).
 * @param {string} blobName
 * @param {number} expiresInSeconds
 * @returns {Promise<string>} signed URL
 */
export async function getSignedUrl(blobName, expiresInSeconds = 3600) {
  if (PROVIDER === 'azure') {
    const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = await import('@azure/storage-blob');
    // In production use managed identity; for key-based auth parse connection string
    // SAS token generated server-side, never shared raw connection strings
    throw new Error('Azure SAS generation requires StorageSharedKeyCredential - implement with your Azure setup');
  }
  if (PROVIDER === 's3') {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { getSignedUrl: awsSign } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: S3_REGION });
    return awsSign(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: blobName }), { expiresIn: expiresInSeconds });
  }
  throw new Error(`Unknown BLOB_PROVIDER: ${PROVIDER}`);
}

// ─────────────────────────────────────────
// Delete blob
// ─────────────────────────────────────────

export async function deleteBlob(blobName) {
  if (PROVIDER === 'azure') {
    if (!AZURE_URL) throw new Error('BLOB_STORAGE_URL not set');
    const { BlobServiceClient } = await import('@azure/storage-blob');
    const client = BlobServiceClient.fromConnectionString(AZURE_URL);
    await client.getContainerClient(AZURE_CONTAINER).deleteBlob(blobName);
    return { deleted: true, blobName };
  }
  if (PROVIDER === 's3') {
    if (!S3_BUCKET) throw new Error('S3_BUCKET not set');
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: S3_REGION });
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: blobName }));
    return { deleted: true, blobName };
  }
  throw new Error(`Unknown BLOB_PROVIDER: ${PROVIDER}`);
}

export default { uploadBlob, getSignedUrl, deleteBlob };
