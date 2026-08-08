/**
 * src/connectors/CloudConnectors.js
 * Nexus AI Pro — Cloud & DevOps platform connectors
 * Platforms: Azure, Adobe, AWS, Google Cloud, Slack, Zoom,
 *            GitHub, Bitbucket, Redis, Blob Storage
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 *
 * All credentials read from environment variables only — never hard-coded.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ── Lazy-loaded clients ───────────────────────────────────────────────────

let _s3Client = null;
let _azureBlobClient = null;
let _redisClient = null;

async function getS3Client() {
  if (_s3Client) return _s3Client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  _s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
      : undefined, // fall back to IAM role / environment chain
  });
  return _s3Client;
}

async function getAzureBlobClient() {
  if (_azureBlobClient) return _azureBlobClient;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
  const { BlobServiceClient } = await import('@azure/storage-blob');
  _azureBlobClient = BlobServiceClient.fromConnectionString(connectionString);
  return _azureBlobClient;
}

async function getRedisClient() {
  if (_redisClient) return _redisClient;
  const IORedis = require('ioredis');
  _redisClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      if (times > 5) return null; // Stop retrying after 5 attempts (not exponential — controlled)
      return 500; // Fixed 500ms retry interval
    },
  });
  _redisClient.on('error', (err) => console.error('[Redis] Connection error:', err.message));
  await _redisClient.connect().catch(() => {}); // Non-fatal on startup
  return _redisClient;
}

// ── Generic authenticated fetch ───────────────────────────────────────────

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${opts._svc || 'API'}] ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────
// AZURE
// ─────────────────────────────────────────────────────────────────────────

export const AzureConnector = {
  /** Upload a file to Azure Blob Storage */
  async uploadBlob(containerName, blobName, data, contentType = 'application/octet-stream') {
    const client = await getAzureBlobClient();
    const container = client.getContainerClient(containerName);
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient(blobName);
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    await blob.upload(buffer, buffer.length, { blobHTTPHeaders: { blobContentType: contentType } });
    return { url: blob.url, name: blobName, container: containerName };
  },

  /** Download a blob */
  async downloadBlob(containerName, blobName) {
    const client = await getAzureBlobClient();
    const blob = client.getContainerClient(containerName).getBlockBlobClient(blobName);
    const res = await blob.download();
    const chunks = [];
    for await (const chunk of res.readableStreamBody) chunks.push(chunk);
    return Buffer.concat(chunks);
  },

  /** List blobs in a container */
  async listBlobs(containerName, prefix = '') {
    const client = await getAzureBlobClient();
    const container = client.getContainerClient(containerName);
    const blobs = [];
    for await (const blob of container.listBlobsFlat({ prefix })) {
      blobs.push({ name: blob.name, size: blob.properties.contentLength, lastModified: blob.properties.lastModified });
    }
    return blobs;
  },

  /** Delete a blob */
  async deleteBlob(containerName, blobName) {
    const client = await getAzureBlobClient();
    const blob = client.getContainerClient(containerName).getBlockBlobClient(blobName);
    await blob.deleteIfExists();
    return { success: true };
  },

  /** Call Azure OpenAI Service */
  async callAzureOpenAI(messages, options = {}) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
    if (!endpoint || !apiKey) throw new Error('AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY not set');

    return apiFetch(
      `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`,
      {
        _svc: 'Azure OpenAI',
        method: 'POST',
        headers: { 'api-key': apiKey },
        body: JSON.stringify({ messages, max_tokens: options.maxTokens || 4096, temperature: options.temperature || 0.7 }),
      }
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────
// AWS
// ─────────────────────────────────────────────────────────────────────────

export const AWSConnector = {
  /** Upload file to S3 */
  async uploadToS3(bucket, key, body, contentType = 'application/octet-stream') {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return { bucket, key, url: `https://${bucket}.s3.amazonaws.com/${key}` };
  },

  /** Get signed URL for S3 object */
  async getSignedUrl(bucket, key, expiresIn = 3600) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = await getS3Client();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, command, { expiresIn });
  },

  /** Delete S3 object */
  async deleteFromS3(bucket, key) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { success: true };
  },

  /** SES send email */
  async sendEmail(to, subject, htmlBody, fromAddress) {
    const from = fromAddress || process.env.AWS_SES_FROM_EMAIL;
    if (!from) throw new Error('AWS_SES_FROM_EMAIL not set');
    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
    const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
    await ses.send(new SendEmailCommand({
      Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: htmlBody } },
      },
      Source: from,
    }));
    return { success: true };
  },
};

// ─────────────────────────────────────────────────────────────────────────
// REDIS
// ─────────────────────────────────────────────────────────────────────────

export const RedisConnector = {
  async set(key, value, ttlSeconds) {
    const client = await getRedisClient();
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
    return true;
  },

  async get(key) {
    const client = await getRedisClient();
    const val = await client.get(key);
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  },

  async del(key) {
    const client = await getRedisClient();
    return client.del(key);
  },

  async hset(hash, field, value) {
    const client = await getRedisClient();
    return client.hset(hash, field, typeof value === 'object' ? JSON.stringify(value) : String(value));
  },

  async hget(hash, field) {
    const client = await getRedisClient();
    const val = await client.hget(hash, field);
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  },

  async hgetall(hash) {
    const client = await getRedisClient();
    const data = await client.hgetall(hash);
    if (!data) return {};
    const result = {};
    for (const [k, v] of Object.entries(data)) {
      try { result[k] = JSON.parse(v); } catch { result[k] = v; }
    }
    return result;
  },

  async incr(key) {
    const client = await getRedisClient();
    return client.incr(key);
  },

  async expire(key, ttlSeconds) {
    const client = await getRedisClient();
    return client.expire(key, ttlSeconds);
  },

  async publish(channel, message) {
    const client = await getRedisClient();
    return client.publish(channel, typeof message === 'object' ? JSON.stringify(message) : message);
  },

  async ping() {
    try {
      const client = await getRedisClient();
      const res = await client.ping();
      return res === 'PONG';
    } catch { return false; }
  },
};

// ─────────────────────────────────────────────────────────────────────────
// GOOGLE CLOUD
// ─────────────────────────────────────────────────────────────────────────

export const GoogleConnector = {
  async translateText(texts, targetLang = 'en', sourceLang = null) {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY not set');
    return apiFetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      _svc: 'Google Translate',
      method: 'POST',
      body: JSON.stringify({ q: texts, target: targetLang, ...(sourceLang && { source: sourceLang }), format: 'text' }),
    });
  },

  async analyzeText(text, features = ['entities', 'sentiment', 'syntax']) {
    const apiKey = process.env.GOOGLE_NL_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_NL_API_KEY not set');
    const featureMap = {};
    for (const f of features) featureMap[`extract${f[0].toUpperCase()}${f.slice(1)}`] = true;
    return apiFetch(`https://language.googleapis.com/v1/documents:annotateText?key=${apiKey}`, {
      _svc: 'Google NL',
      method: 'POST',
      body: JSON.stringify({ document: { type: 'PLAIN_TEXT', content: text }, features: featureMap }),
    });
  },

  async textToSpeech(text, languageCode = 'en-US', voiceName = 'en-US-Wavenet-D') {
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY not set');
    return apiFetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      _svc: 'Google TTS',
      method: 'POST',
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────
// SLACK
// ─────────────────────────────────────────────────────────────────────────

export const SlackConnector = {
  async sendMessage(channel, text, blocks = null) {
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) throw new Error('SLACK_BOT_TOKEN not set');
    return apiFetch('https://slack.com/api/chat.postMessage', {
      _svc: 'Slack',
      method: 'POST',
      headers: { Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ channel, text, ...(blocks && { blocks }) }),
    });
  },

  async getChannels() {
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) throw new Error('SLACK_BOT_TOKEN not set');
    return apiFetch('https://slack.com/api/conversations.list', {
      _svc: 'Slack',
      headers: { Authorization: `Bearer ${botToken}` },
    });
  },

  verifyWebhookSignature(rawBody, signingSecret, signature, timestamp) {
    const ts = parseInt(timestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false; // 5-min window
    const baseStr = `v0:${timestamp}:${rawBody}`;
    const expected = `v0=${require('crypto').createHmac('sha256', signingSecret).update(baseStr).digest('hex')}`;
    try {
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length) return false;
      return require('crypto').timingSafeEqual(sigBuf, expBuf);
    } catch { return false; }
  },
};

// ─────────────────────────────────────────────────────────────────────────
// ZOOM
// ─────────────────────────────────────────────────────────────────────────

export const ZoomConnector = {
  async getAccessToken() {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!accountId || !clientId || !clientSecret)
      throw new Error('ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET not set');
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await apiFetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      { _svc: 'Zoom', method: 'POST', headers: { Authorization: `Basic ${creds}` } }
    );
    return res.access_token;
  },

  async createMeeting(topic, startTime, duration = 60) {
    const token = await this.getAccessToken();
    return apiFetch('https://api.zoom.us/v2/users/me/meetings', {
      _svc: 'Zoom',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic, type: 2, start_time: startTime, duration, settings: { host_video: true, participant_video: true } }),
    });
  },

  async listMeetings() {
    const token = await this.getAccessToken();
    return apiFetch('https://api.zoom.us/v2/users/me/meetings', {
      _svc: 'Zoom',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────
// GITHUB
// ─────────────────────────────────────────────────────────────────────────

export const GitHubConnector = {
  _headers() {
    const token = process.env.GITHUB_API_TOKEN;
    if (!token) throw new Error('GITHUB_API_TOKEN not set');
    return { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' };
  },

  async getRepo(owner, repo) {
    return apiFetch(`https://api.github.com/repos/${owner}/${repo}`, {
      _svc: 'GitHub',
      headers: this._headers(),
    });
  },

  async listCommits(owner, repo, perPage = 30) {
    return apiFetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}`, {
      _svc: 'GitHub',
      headers: this._headers(),
    });
  },

  async createIssue(owner, repo, title, body, labels = []) {
    return apiFetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      _svc: 'GitHub',
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ title, body, labels }),
    });
  },

  async listPullRequests(owner, repo, state = 'open') {
    return apiFetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}`, {
      _svc: 'GitHub',
      headers: this._headers(),
    });
  },

  async getWorkflowRuns(owner, repo, workflowId) {
    return apiFetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`, {
      _svc: 'GitHub',
      headers: this._headers(),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────
// BITBUCKET
// ─────────────────────────────────────────────────────────────────────────

export const BitbucketConnector = {
  _headers() {
    const token = process.env.BITBUCKET_ACCESS_TOKEN;
    const user = process.env.BITBUCKET_USERNAME;
    const pwd = process.env.BITBUCKET_APP_PASSWORD;
    if (token) return { Authorization: `Bearer ${token}` };
    if (user && pwd) return { Authorization: `Basic ${Buffer.from(`${user}:${pwd}`).toString('base64')}` };
    throw new Error('BITBUCKET_ACCESS_TOKEN or BITBUCKET_USERNAME/BITBUCKET_APP_PASSWORD not set');
  },

  async getRepo(workspace, slug) {
    return apiFetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}`, {
      _svc: 'Bitbucket',
      headers: this._headers(),
    });
  },

  async listPipelines(workspace, slug) {
    return apiFetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/pipelines/`, {
      _svc: 'Bitbucket',
      headers: this._headers(),
    });
  },

  async listPRs(workspace, slug, state = 'OPEN') {
    return apiFetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}/pullrequests?state=${state}`, {
      _svc: 'Bitbucket',
      headers: this._headers(),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────
// ADOBE
// ─────────────────────────────────────────────────────────────────────────

export const AdobeConnector = {
  async getAccessToken() {
    const clientId = process.env.ADOBE_CLIENT_ID;
    const clientSecret = process.env.ADOBE_CLIENT_SECRET;
    const orgId = process.env.ADOBE_ORG_ID;
    if (!clientId || !clientSecret || !orgId) throw new Error('ADOBE_CLIENT_ID / ADOBE_CLIENT_SECRET / ADOBE_ORG_ID not set');
    const res = await apiFetch('https://ims-na1.adobelogin.com/ims/token/v3', {
      _svc: 'Adobe IMS',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=openid,AdobeID,read_organizations`,
    });
    return res.access_token;
  },

  async listAssets(folderId = 'root') {
    const token = await this.getAccessToken();
    const orgId = process.env.ADOBE_ORG_ID;
    return apiFetch(`https://cc-libraries.adobe.io/api/v1/libraries?folder_id=${folderId}`, {
      _svc: 'Adobe CC',
      headers: { Authorization: `Bearer ${token}`, 'x-api-key': process.env.ADOBE_CLIENT_ID, 'x-gw-ims-org-id': orgId },
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Blob Storage abstraction (chooses Azure or S3 based on env)
// ─────────────────────────────────────────────────────────────────────────

export const BlobStorage = {
  async upload(key, data, contentType = 'application/octet-stream') {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      const container = process.env.AZURE_BLOB_CONTAINER || 'nexus-uploads';
      return AzureConnector.uploadBlob(container, key, data, contentType);
    }
    if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ROLE_ARN) {
      const bucket = process.env.AWS_S3_BUCKET;
      if (!bucket) throw new Error('AWS_S3_BUCKET not set');
      return AWSConnector.uploadToS3(bucket, key, data, contentType);
    }
    throw new Error('No blob storage provider configured (set AZURE_STORAGE_CONNECTION_STRING or AWS credentials + AWS_S3_BUCKET)');
  },

  async getUrl(key) {
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      const client = await getAzureBlobClient();
      const container = process.env.AZURE_BLOB_CONTAINER || 'nexus-uploads';
      const blob = client.getContainerClient(container).getBlockBlobClient(key);
      return blob.url;
    }
    if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ROLE_ARN) {
      const bucket = process.env.AWS_S3_BUCKET;
      if (!bucket) throw new Error('AWS_S3_BUCKET not set');
      return AWSConnector.getSignedUrl(bucket, key);
    }
    throw new Error('No blob storage provider configured');
  },
};

export default {
  AzureConnector,
  AWSConnector,
  RedisConnector,
  GoogleConnector,
  SlackConnector,
  ZoomConnector,
  GitHubConnector,
  BitbucketConnector,
  AdobeConnector,
  BlobStorage,
};
