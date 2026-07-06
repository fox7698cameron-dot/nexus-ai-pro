// ================================================
// NEXUS AI PRO - Cloud Service Connectors
// Azure, AWS S3, GCS, Slack, Zoom, GitHub,
// Bitbucket, Adobe, Redis cache layer
// ================================================

import fetch from 'node-fetch';
import express from 'express';

// ─── AWS S3 ──────────────────────────────────────────────────────────────────
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

// ─── Azure ───────────────────────────────────────────────────────────────────
import { BlobServiceClient } from '@azure/storage-blob';
import { ClientSecretCredential } from '@azure/identity';

// ─── Redis ───────────────────────────────────────────────────────────────────
import { createClient } from 'redis';

// ════════════════════════════════════════════════════════════════════════════
// REDIS CACHE LAYER
// Graceful degradation to in-memory Map when Redis is unavailable.
// ════════════════════════════════════════════════════════════════════════════

/** @type {import('redis').RedisClientType|null} */
let _redisClient = null;
let _redisReady = false;

/** In-memory fallback store: Map<key, {value, expiresAt}> */
const _memCache = new Map();

async function _initRedis() {
  if (_redisClient) return;
  const url = process.env.REDIS_URL;
  if (!url) return; // no URL → stay on in-memory
  try {
    _redisClient = createClient({ url });
    _redisClient.on('error', () => { _redisReady = false; });
    _redisClient.on('ready', () => { _redisReady = true; });
    await _redisClient.connect();
    _redisReady = true;
  } catch {
    _redisClient = null;
    _redisReady = false;
  }
}

// Kick off Redis init immediately (non-blocking)
_initRedis().catch(() => {});

/**
 * Get a value from cache.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function cacheGet(key) {
  try {
    if (_redisReady && _redisClient) {
      const raw = await _redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    }
    // Memory fallback
    const entry = _memCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      _memCache.delete(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

/**
 * Set a value in cache.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=3600]
 */
export async function cacheSet(key, value, ttlSeconds = 3600) {
  try {
    if (_redisReady && _redisClient) {
      await _redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return;
    }
    _memCache.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  } catch {
    // silent — cache failure should not break the caller
  }
}

/**
 * Delete a key from cache.
 * @param {string} key
 */
export async function cacheDel(key) {
  try {
    if (_redisReady && _redisClient) {
      await _redisClient.del(key);
      return;
    }
    _memCache.delete(key);
  } catch {}
}

/**
 * Flush all cache entries.
 */
export async function cacheFlush() {
  try {
    if (_redisReady && _redisClient) {
      await _redisClient.flushDb();
      return;
    }
    _memCache.clear();
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════════
// AZURE BLOB STORAGE
// ════════════════════════════════════════════════════════════════════════════

function _getAzureBlobClient() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT;

  if (!tenantId || !clientId || !clientSecret || !accountName) {
    throw new Error('Azure credentials not fully configured');
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  return new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
}

/**
 * Upload data to an Azure Blob Storage container.
 * @param {string} containerName
 * @param {string} blobName
 * @param {Buffer|string} data
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
 */
export async function uploadToAzureBlob(containerName, blobName, data) {
  try {
    const client = _getAzureBlobClient();
    const container = client.getContainerClient(containerName);
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient(blobName);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await blob.upload(buffer, buffer.length);
    return { success: true, url: blob.url };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Download a blob from Azure.
 * @returns {Promise<{ data: Buffer|null, error?: string }>}
 */
export async function downloadFromAzureBlob(containerName, blobName) {
  try {
    const client = _getAzureBlobClient();
    const blob = client.getContainerClient(containerName).getBlockBlobClient(blobName);
    const res = await blob.download();
    const chunks = [];
    for await (const chunk of res.readableStreamBody) chunks.push(chunk);
    return { data: Buffer.concat(chunks) };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * List blobs in an Azure container.
 * @returns {Promise<{ blobs: string[], error?: string }>}
 */
export async function listAzureBlobs(containerName) {
  try {
    const client = _getAzureBlobClient();
    const container = client.getContainerClient(containerName);
    const blobs = [];
    for await (const item of container.listBlobsFlat()) blobs.push(item.name);
    return { blobs };
  } catch (err) {
    return { blobs: [], error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// AWS S3
// ════════════════════════════════════════════════════════════════════════════

function _getS3Client() {
  const region = process.env.AWS_REGION;
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !region) {
    throw new Error('AWS credentials not fully configured');
  }
  return new S3Client({ region });
}

/**
 * Upload data to an S3 bucket.
 * @param {string} bucket
 * @param {string} key
 * @param {Buffer|string} data
 * @returns {Promise<{ success: boolean, location?: string, error?: string }>}
 */
export async function uploadToS3(bucket, key, data) {
  try {
    const s3 = _getS3Client();
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
    const region = process.env.AWS_REGION;
    return {
      success: true,
      location: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Download an object from S3.
 * @returns {Promise<{ data: Buffer|null, error?: string }>}
 */
export async function downloadFromS3(bucket, key) {
  try {
    const s3 = _getS3Client();
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks = [];
    for await (const chunk of res.Body) chunks.push(chunk);
    return { data: Buffer.concat(chunks) };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * List objects in an S3 bucket.
 * @param {string} bucket
 * @param {string} [prefix]
 * @returns {Promise<{ objects: object[], error?: string }>}
 */
export async function listS3Objects(bucket, prefix = '') {
  try {
    const s3 = _getS3Client();
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
    );
    return { objects: res.Contents || [] };
  } catch (err) {
    return { objects: [], error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE CLOUD STORAGE (GCS) — fetch-based stub
// ════════════════════════════════════════════════════════════════════════════

async function _getGCSToken() {
  const creds = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!creds) throw new Error('GOOGLE_CREDENTIALS_JSON not set');
  const parsed = JSON.parse(creds);

  // Build a JWT for service-account auth
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: parsed.client_email,
      scope: 'https://www.googleapis.com/auth/devstorage.read_write',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');

  // Node crypto sign — uses the private key from credentials JSON
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(parsed.private_key).toString('base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  if (!res.ok) throw new Error('GCS token exchange failed');
  const body = await res.json();
  return body.access_token;
}

/**
 * Upload data to Google Cloud Storage.
 * @param {string} bucket
 * @param {string} name
 * @param {Buffer|string} data
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function uploadToGCS(bucket, name, data) {
  try {
    const token = await _getGCSToken();
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const res = await fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(name)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(body.length),
        },
        body,
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * List files in a Google Drive folder (stub).
 * @param {string} folderId
 * @returns {Promise<{ files: object[], error?: string }>}
 */
export async function getGoogleDriveFiles(folderId) {
  try {
    const token = await _getGCSToken();
    const query = folderId ? `'${folderId}' in parents` : '';
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { files: [], error: await res.text() };
    const body = await res.json();
    return { files: body.files || [] };
  } catch (err) {
    return { files: [], error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SLACK
// ════════════════════════════════════════════════════════════════════════════

const SLACK_API = 'https://slack.com/api';

async function _slackFetch(endpoint, body) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set');
  const res = await fetch(`${SLACK_API}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Slack API error');
  return json;
}

/**
 * Post a message to a Slack channel.
 * @param {string} channel
 * @param {string} text
 * @param {object[]} [blocks]
 * @returns {Promise<{ success: boolean, ts?: string, error?: string }>}
 */
export async function sendSlackMessage(channel, text, blocks) {
  try {
    const body = { channel, text };
    if (blocks) body.blocks = blocks;
    const res = await _slackFetch('chat.postMessage', body);
    return { success: true, ts: res.ts };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * List all Slack channels the bot has access to.
 * @returns {Promise<{ channels: object[], error?: string }>}
 */
export async function getSlackChannels() {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return { channels: [], error: 'SLACK_BOT_TOKEN not set' };
    const res = await fetch(`${SLACK_API}/conversations.list?types=public_channel,private_channel&limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.ok) return { channels: [], error: json.error };
    return { channels: json.channels || [] };
  } catch (err) {
    return { channels: [], error: err.message };
  }
}

/**
 * Upload a file to a Slack channel.
 * @param {string} channel
 * @param {string} filename
 * @param {Buffer|string} content
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function uploadFileToSlack(channel, filename, content) {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return { success: false, error: 'SLACK_BOT_TOKEN not set' };

    const { FormData, Blob } = await import('node-fetch');
    const form = new FormData();
    form.append('channels', channel);
    form.append('filename', filename);
    form.append('file', new Blob([content]), filename);

    const res = await fetch(`${SLACK_API}/files.upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const json = await res.json();
    return json.ok ? { success: true } : { success: false, error: json.error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ZOOM
// ════════════════════════════════════════════════════════════════════════════

const ZOOM_API = 'https://api.zoom.us/v2';

async function _getZoomToken() {
  const apiKey = process.env.ZOOM_API_KEY;
  const apiSecret = process.env.ZOOM_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('Zoom credentials not configured');

  // Zoom Server-to-Server OAuth
  const accountId = process.env.ZOOM_ACCOUNT_ID || '';
  const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}` },
    }
  );
  if (!res.ok) throw new Error('Zoom token exchange failed');
  const body = await res.json();
  return body.access_token;
}

async function _zoomFetch(method, path, body) {
  const token = await _getZoomToken();
  const res = await fetch(`${ZOOM_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Zoom API error');
  return json;
}

/**
 * Create a Zoom meeting.
 * @param {string} topic
 * @param {string} startTime - ISO 8601 datetime string
 * @param {number} duration - minutes
 * @returns {Promise<{ meeting?: object, error?: string }>}
 */
export async function createZoomMeeting(topic, startTime, duration) {
  try {
    const meeting = await _zoomFetch('POST', '/users/me/meetings', {
      topic,
      type: 2, // scheduled
      start_time: startTime,
      duration,
      settings: { join_before_host: false, mute_upon_entry: true },
    });
    return { meeting };
  } catch (err) {
    return { meeting: null, error: err.message };
  }
}

/**
 * List all Zoom meetings for the authenticated user.
 * @returns {Promise<{ meetings: object[], error?: string }>}
 */
export async function getZoomMeetings() {
  try {
    const res = await _zoomFetch('GET', '/users/me/meetings');
    return { meetings: res?.meetings || [] };
  } catch (err) {
    return { meetings: [], error: err.message };
  }
}

/**
 * Delete a Zoom meeting.
 * @param {string|number} id
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteZoomMeeting(id) {
  try {
    await _zoomFetch('DELETE', `/meetings/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GITHUB
// ════════════════════════════════════════════════════════════════════════════

const GITHUB_API = 'https://api.github.com';

async function _ghFetch(method, path, body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'GitHub API error');
  return json;
}

/**
 * Create a GitHub repository for the authenticated user.
 * @param {string} name
 * @param {string} description
 * @param {boolean} isPrivate
 * @returns {Promise<{ repo?: object, error?: string }>}
 */
export async function createGitHubRepo(name, description, isPrivate = false) {
  try {
    const repo = await _ghFetch('POST', '/user/repos', {
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });
    return { repo };
  } catch (err) {
    return { repo: null, error: err.message };
  }
}

/**
 * List repositories for the authenticated GitHub user.
 * @returns {Promise<{ repos: object[], error?: string }>}
 */
export async function getGitHubRepos() {
  try {
    const repos = await _ghFetch('GET', '/user/repos?per_page=100&sort=updated');
    return { repos: repos || [] };
  } catch (err) {
    return { repos: [], error: err.message };
  }
}

/**
 * Create a GitHub issue.
 * @param {string} repo - "owner/repo"
 * @param {string} title
 * @param {string} body
 * @returns {Promise<{ issue?: object, error?: string }>}
 */
export async function createGitHubIssue(repo, title, body) {
  try {
    const issue = await _ghFetch('POST', `/repos/${repo}/issues`, { title, body });
    return { issue };
  } catch (err) {
    return { issue: null, error: err.message };
  }
}

/**
 * List issues for a GitHub repository.
 * @param {string} repo - "owner/repo"
 * @returns {Promise<{ issues: object[], error?: string }>}
 */
export async function listGitHubIssues(repo) {
  try {
    const issues = await _ghFetch('GET', `/repos/${repo}/issues?per_page=50&state=open`);
    return { issues: issues || [] };
  } catch (err) {
    return { issues: [], error: err.message };
  }
}

/**
 * Create a pull request on GitHub.
 * @param {string} repo - "owner/repo"
 * @param {string} title
 * @param {string} body
 * @param {string} head - source branch
 * @param {string} base - target branch
 * @returns {Promise<{ pr?: object, error?: string }>}
 */
export async function createGitHubPR(repo, title, body, head, base) {
  try {
    const pr = await _ghFetch('POST', `/repos/${repo}/pulls`, {
      title,
      body,
      head,
      base,
    });
    return { pr };
  } catch (err) {
    return { pr: null, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BITBUCKET
// ════════════════════════════════════════════════════════════════════════════

const BITBUCKET_API = 'https://api.bitbucket.org/2.0';

async function _bbFetch(method, path, body) {
  const token = process.env.BITBUCKET_TOKEN;
  const clientId = process.env.BITBUCKET_CLIENT_ID;
  const clientSecret = process.env.BITBUCKET_CLIENT_SECRET;

  if (!token && (!clientId || !clientSecret)) {
    throw new Error('Bitbucket credentials not configured');
  }

  const authHeader = token
    ? `Bearer ${token}`
    : `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  const res = await fetch(`${BITBUCKET_API}${path}`, {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Bitbucket API error');
  return json;
}

/**
 * List Bitbucket repositories for the authenticated user.
 * @returns {Promise<{ repos: object[], error?: string }>}
 */
export async function getBitbucketRepos() {
  try {
    const res = await _bbFetch('GET', '/repositories?role=member&pagelen=50');
    return { repos: res?.values || [] };
  } catch (err) {
    return { repos: [], error: err.message };
  }
}

/**
 * Create a Bitbucket repository.
 * @param {string} name
 * @returns {Promise<{ repo?: object, error?: string }>}
 */
export async function createBitbucketRepo(name) {
  try {
    const workspace = process.env.BITBUCKET_WORKSPACE || '';
    if (!workspace) return { repo: null, error: 'BITBUCKET_WORKSPACE not set' };
    const repo = await _bbFetch('POST', `/repositories/${workspace}/${name}`, {
      scm: 'git',
      is_private: true,
    });
    return { repo };
  } catch (err) {
    return { repo: null, error: err.message };
  }
}

/**
 * List pull requests for a Bitbucket repository.
 * @param {string} repo - "workspace/slug"
 * @returns {Promise<{ prs: object[], error?: string }>}
 */
export async function getBitbucketPRs(repo) {
  try {
    const res = await _bbFetch('GET', `/repositories/${repo}/pullrequests?state=OPEN`);
    return { prs: res?.values || [] };
  } catch (err) {
    return { prs: [], error: err.message };
  }
}

/**
 * Create a pull request on Bitbucket.
 * @param {string} repo - "workspace/slug"
 * @param {string} title
 * @param {string} description
 * @param {{ branch: string }} [source]
 * @param {{ branch: string }} [destination]
 * @returns {Promise<{ pr?: object, error?: string }>}
 */
export async function createBitbucketPR(
  repo,
  title,
  description,
  source = { branch: { name: 'feature' } },
  destination = { branch: { name: 'main' } }
) {
  try {
    const pr = await _bbFetch('POST', `/repositories/${repo}/pullrequests`, {
      title,
      description,
      source,
      destination,
    });
    return { pr };
  } catch (err) {
    return { pr: null, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ADOBE CREATIVE CLOUD (stub — REST API patterns)
// ════════════════════════════════════════════════════════════════════════════

const ADOBE_IMS_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';
const ADOBE_STORAGE_URL = 'https://cc-api-storage.adobe.io';

async function _getAdobeToken() {
  const clientId = process.env.ADOBE_CLIENT_ID;
  const clientSecret = process.env.ADOBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Adobe credentials not configured');

  const cacheKey = 'adobe:token';
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(ADOBE_IMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'AdobeID,openid,creative_sdk',
    }).toString(),
  });
  if (!res.ok) throw new Error('Adobe token exchange failed');
  const body = await res.json();
  await cacheSet(cacheKey, body.access_token, body.expires_in || 3600);
  return body.access_token;
}

/**
 * List assets in the user's Adobe Creative Cloud storage.
 * @returns {Promise<{ assets: object[], error?: string }>}
 */
export async function getAdobeCreativeCloudAssets() {
  try {
    const token = await _getAdobeToken();
    const res = await fetch(`${ADOBE_STORAGE_URL}/files`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key': process.env.ADOBE_CLIENT_ID || '',
      },
    });
    if (!res.ok) return { assets: [], error: await res.text() };
    const body = await res.json();
    return { assets: body.children || body.assets || [] };
  } catch (err) {
    return { assets: [], error: err.message };
  }
}

/**
 * Upload a file to Adobe Creative Cloud.
 * @param {string} filename
 * @param {Buffer|string} data
 * @returns {Promise<{ success: boolean, href?: string, error?: string }>}
 */
export async function uploadToAdobeCreativeCloud(filename, data) {
  try {
    const token = await _getAdobeToken();
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const res = await fetch(`${ADOBE_STORAGE_URL}/files/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key': process.env.ADOBE_CLIENT_ID || '',
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buffer.length),
      },
      body: buffer,
    });
    if (!res.ok) return { success: false, error: await res.text() };
    const body = await res.json().catch(() => ({}));
    return { success: true, href: body.href };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPRESS ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const cloudRouter = express.Router();

// ── Cache ─────────────────────────────────────────────────────────────────
cloudRouter.get('/cache/:key', async (req, res) => {
  const value = await cacheGet(req.params.key);
  res.json({ key: req.params.key, value });
});

cloudRouter.put('/cache/:key', async (req, res) => {
  const { value, ttl } = req.body || {};
  await cacheSet(req.params.key, value, ttl);
  res.json({ success: true });
});

cloudRouter.delete('/cache/:key', async (req, res) => {
  await cacheDel(req.params.key);
  res.json({ success: true });
});

cloudRouter.delete('/cache', async (_req, res) => {
  await cacheFlush();
  res.json({ success: true });
});

// ── Azure ─────────────────────────────────────────────────────────────────
cloudRouter.post('/azure/blobs/:container', async (req, res) => {
  const { blobName, data } = req.body || {};
  if (!blobName || !data) return res.status(400).json({ error: 'blobName and data required' });
  res.json(await uploadToAzureBlob(req.params.container, blobName, data));
});

cloudRouter.get('/azure/blobs/:container/:blobName', async (req, res) => {
  const { data, error } = await downloadFromAzureBlob(req.params.container, req.params.blobName);
  if (error) return res.status(500).json({ error });
  res.set('Content-Type', 'application/octet-stream').send(data);
});

cloudRouter.get('/azure/blobs/:container', async (req, res) => {
  res.json(await listAzureBlobs(req.params.container));
});

// ── AWS S3 ────────────────────────────────────────────────────────────────
cloudRouter.post('/s3/:bucket', async (req, res) => {
  const { key, data } = req.body || {};
  if (!key || !data) return res.status(400).json({ error: 'key and data required' });
  res.json(await uploadToS3(req.params.bucket, key, data));
});

cloudRouter.get('/s3/:bucket/:key(*)', async (req, res) => {
  const { data, error } = await downloadFromS3(req.params.bucket, req.params.key);
  if (error) return res.status(500).json({ error });
  res.set('Content-Type', 'application/octet-stream').send(data);
});

cloudRouter.get('/s3/:bucket', async (req, res) => {
  res.json(await listS3Objects(req.params.bucket, req.query.prefix));
});

// ── GCS ───────────────────────────────────────────────────────────────────
cloudRouter.post('/gcs/:bucket', async (req, res) => {
  const { name, data } = req.body || {};
  if (!name || !data) return res.status(400).json({ error: 'name and data required' });
  res.json(await uploadToGCS(req.params.bucket, name, data));
});

cloudRouter.get('/gdrive', async (req, res) => {
  res.json(await getGoogleDriveFiles(req.query.folderId || ''));
});

// ── Slack ─────────────────────────────────────────────────────────────────
cloudRouter.post('/slack/message', async (req, res) => {
  const { channel, text, blocks } = req.body || {};
  if (!channel || !text) return res.status(400).json({ error: 'channel and text required' });
  res.json(await sendSlackMessage(channel, text, blocks));
});

cloudRouter.get('/slack/channels', async (_req, res) => {
  res.json(await getSlackChannels());
});

cloudRouter.post('/slack/upload', async (req, res) => {
  const { channel, filename, content } = req.body || {};
  if (!channel || !filename || !content) {
    return res.status(400).json({ error: 'channel, filename, content required' });
  }
  res.json(await uploadFileToSlack(channel, filename, content));
});

// ── Zoom ──────────────────────────────────────────────────────────────────
cloudRouter.post('/zoom/meetings', async (req, res) => {
  const { topic, startTime, duration } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'topic required' });
  res.json(await createZoomMeeting(topic, startTime, duration || 60));
});

cloudRouter.get('/zoom/meetings', async (_req, res) => {
  res.json(await getZoomMeetings());
});

cloudRouter.delete('/zoom/meetings/:id', async (req, res) => {
  res.json(await deleteZoomMeeting(req.params.id));
});

// ── GitHub ────────────────────────────────────────────────────────────────
cloudRouter.post('/github/repos', async (req, res) => {
  const { name, description, isPrivate } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  res.json(await createGitHubRepo(name, description, isPrivate));
});

cloudRouter.get('/github/repos', async (_req, res) => {
  res.json(await getGitHubRepos());
});

cloudRouter.post('/github/repos/:repo(*)/issues', async (req, res) => {
  const { title, body } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  res.json(await createGitHubIssue(req.params.repo, title, body));
});

cloudRouter.get('/github/repos/:repo(*)/issues', async (req, res) => {
  res.json(await listGitHubIssues(req.params.repo));
});

cloudRouter.post('/github/repos/:repo(*)/pulls', async (req, res) => {
  const { title, body, head, base } = req.body || {};
  if (!title || !head || !base) return res.status(400).json({ error: 'title, head, base required' });
  res.json(await createGitHubPR(req.params.repo, title, body, head, base));
});

// ── Bitbucket ─────────────────────────────────────────────────────────────
cloudRouter.get('/bitbucket/repos', async (_req, res) => {
  res.json(await getBitbucketRepos());
});

cloudRouter.post('/bitbucket/repos', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  res.json(await createBitbucketRepo(name));
});

cloudRouter.get('/bitbucket/repos/:workspace/:slug/pullrequests', async (req, res) => {
  res.json(await getBitbucketPRs(`${req.params.workspace}/${req.params.slug}`));
});

cloudRouter.post('/bitbucket/repos/:workspace/:slug/pullrequests', async (req, res) => {
  const { title, description, source, destination } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  res.json(
    await createBitbucketPR(
      `${req.params.workspace}/${req.params.slug}`,
      title,
      description,
      source,
      destination
    )
  );
});

// ── Adobe ─────────────────────────────────────────────────────────────────
cloudRouter.get('/adobe/assets', async (_req, res) => {
  res.json(await getAdobeCreativeCloudAssets());
});

cloudRouter.post('/adobe/assets', async (req, res) => {
  const { filename, data } = req.body || {};
  if (!filename || !data) return res.status(400).json({ error: 'filename and data required' });
  res.json(await uploadToAdobeCreativeCloud(filename, data));
});
