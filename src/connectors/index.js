/**
 * src/connectors/index.js
 * Nexus AI Pro — Cloud & Dev Tool Connectors
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Plugin-style connectors: Azure, AWS, Google Cloud, Adobe, Slack, Zoom,
 * GitHub, Bitbucket — OAuth2 flows, webhook registration, unified event bus.
 * Redis integration for caching & session management.
 * Blob storage abstraction (Azure Blob / AWS S3).
 */

import crypto from 'crypto';

// ─── Connector registry ───────────────────────────────────────────────────────

const CONNECTORS = {
  azure: {
    id:       'azure',
    name:     'Microsoft Azure',
    icon:     '☁️',
    authUrl:  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes:   'openid profile offline_access https://management.azure.com/user_impersonation',
    clientId: () => process.env.AZURE_CLIENT_ID,
    secret:   () => process.env.AZURE_CLIENT_SECRET,
  },
  aws: {
    id:       'aws',
    name:     'Amazon Web Services',
    icon:     '🟠',
    authUrl:  null, // AWS uses IAM / access keys, not OAuth
    tokenUrl: null,
    clientId: () => process.env.AWS_ACCESS_KEY_ID,
    secret:   () => process.env.AWS_SECRET_ACCESS_KEY,
  },
  google: {
    id:       'google',
    name:     'Google Cloud',
    icon:     '🔵',
    authUrl:  'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes:   'openid profile email https://www.googleapis.com/auth/cloud-platform',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    secret:   () => process.env.GOOGLE_CLIENT_SECRET,
  },
  adobe: {
    id:       'adobe',
    name:     'Adobe Creative Cloud',
    icon:     '🎨',
    authUrl:  'https://ims-na1.adobelogin.com/ims/authorize/v2',
    tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3',
    scopes:   'openid AdobeID creative_cloud',
    clientId: () => process.env.ADOBE_CLIENT_ID,
    secret:   () => process.env.ADOBE_CLIENT_SECRET,
  },
  slack: {
    id:       'slack',
    name:     'Slack',
    icon:     '💬',
    authUrl:  'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes:   'chat:write channels:read users:read',
    clientId: () => process.env.SLACK_CLIENT_ID,
    secret:   () => process.env.SLACK_CLIENT_SECRET,
  },
  zoom: {
    id:       'zoom',
    name:     'Zoom',
    icon:     '📹',
    authUrl:  'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    scopes:   'meeting:read meeting:write user:read',
    clientId: () => process.env.ZOOM_CLIENT_ID,
    secret:   () => process.env.ZOOM_CLIENT_SECRET,
  },
  github: {
    id:       'github',
    name:     'GitHub',
    icon:     '🐙',
    authUrl:  'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes:   'repo read:user user:email',
    clientId: () => process.env.GITHUB_OAUTH_CLIENT_ID,
    secret:   () => process.env.GITHUB_OAUTH_CLIENT_SECRET,
  },
  bitbucket: {
    id:       'bitbucket',
    name:     'Bitbucket',
    icon:     '🪣',
    authUrl:  'https://bitbucket.org/site/oauth2/authorize',
    tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
    scopes:   'repository account',
    clientId: () => process.env.BITBUCKET_CLIENT_ID,
    secret:   () => process.env.BITBUCKET_CLIENT_SECRET,
  },
};

// ─── In-memory token store (replace with DB in production) ────────────────────

const tokens = new Map(); // `${userId}:${connectorId}` → token record

// ─── OAuth helpers ────────────────────────────────────────────────────────────

export function listConnectors() {
  return Object.values(CONNECTORS).map(({ id, name, icon, authUrl }) => ({
    id, name, icon, supportsOAuth: !!authUrl,
    configured: !!(CONNECTORS[id].clientId()),
  }));
}

export function getConnectorAuthUrl(connectorId, redirectUri, state) {
  const connector = CONNECTORS[connectorId];
  if (!connector || !connector.authUrl) {
    throw Object.assign(new Error(`Connector ${connectorId} does not support OAuth`), { status: 400 });
  }

  const clientId = connector.clientId();
  if (!clientId) {
    throw Object.assign(new Error(`${connectorId} client ID not configured`), { status: 500 });
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         connector.scopes || '',
    state,
  });

  return `${connector.authUrl}?${params}`;
}

export async function exchangeConnectorCode(connectorId, code, redirectUri) {
  const connector = CONNECTORS[connectorId];
  if (!connector || !connector.tokenUrl) {
    throw Object.assign(new Error('OAuth token exchange not supported for this connector'), { status: 400 });
  }

  const clientId = connector.clientId();
  const secret   = connector.secret();
  if (!clientId || !secret) {
    throw Object.assign(new Error(`${connectorId} credentials not configured`), { status: 500 });
  }

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  redirectUri,
    client_id:     clientId,
    client_secret: secret,
  });

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (connectorId === 'github') headers['Accept'] = 'application/json';

  const response = await fetch(connector.tokenUrl, { method: 'POST', headers, body });
  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(new Error(`Token exchange failed: ${text}`), { status: 502 });
  }

  return response.json();
}

export function saveConnectorToken(userId, connectorId, tokenData) {
  const key = `${userId}:${connectorId}`;
  tokens.set(key, {
    userId, connectorId,
    accessToken:  tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,
    expiresAt:    tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null,
    connectedAt:  Date.now(),
  });
  return { connected: true, connectorId };
}

export function getConnectorToken(userId, connectorId) {
  return tokens.get(`${userId}:${connectorId}`) || null;
}

export function disconnectConnector(userId, connectorId) {
  return tokens.delete(`${userId}:${connectorId}`);
}

export function listUserConnections(userId) {
  const result = [];
  for (const [key, t] of tokens) {
    if (t.userId === userId) {
      const { accessToken, refreshToken, ...safe } = t;
      result.push(safe);
    }
  }
  return result;
}

// ─── Slack notification helper ────────────────────────────────────────────────

export async function sendSlackMessage(userId, channel, text) {
  const token = getConnectorToken(userId, 'slack');
  if (!token?.accessToken) throw Object.assign(new Error('Slack not connected'), { status: 401 });

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.accessToken}`,
    },
    body: JSON.stringify({ channel, text }),
  });

  return response.json();
}

// ─── GitHub helper ────────────────────────────────────────────────────────────

export async function getGitHubRepos(userId) {
  const token = getConnectorToken(userId, 'github');
  if (!token?.accessToken) throw Object.assign(new Error('GitHub not connected'), { status: 401 });

  const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  return response.json();
}

// ─── Redis connection factory ─────────────────────────────────────────────────

let _redis = null;

export async function getRedisClient() {
  if (_redis) return _redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  let Redis;
  try {
    const mod = await import('ioredis');
    Redis = mod.default;
  } catch {
    return null;
  }

  _redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck:     true,
    lazyConnect:          true,
  });

  _redis.on('error', err => {
    if (process.env.NODE_ENV !== 'test') {
      process.stderr.write(`[Redis] ${err.message}\n`);
    }
  });

  return _redis;
}

// Thin cache helpers (no-ops when Redis unavailable)
export async function cacheSet(key, value, ttlSeconds = 300) {
  const r = await getRedisClient();
  if (!r) return;
  try { await r.setex(key, ttlSeconds, JSON.stringify(value)); } catch { /* non-critical */ }
}

export async function cacheGet(key) {
  const r = await getRedisClient();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function cacheDel(key) {
  const r = await getRedisClient();
  if (!r) return;
  try { await r.del(key); } catch { /* non-critical */ }
}

// ─── Blob storage abstraction ─────────────────────────────────────────────────
// Supports Azure Blob Storage and AWS S3 via env-var detection.

export async function uploadBlob(containerOrBucket, blobName, buffer, contentType = 'application/octet-stream') {
  // Azure Blob Storage
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    const { BlobServiceClient } = await import('@azure/storage-blob').catch(() => ({ BlobServiceClient: null }));
    if (BlobServiceClient) {
      const client    = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      const container = client.getContainerClient(containerOrBucket);
      await container.createIfNotExists();
      const blob = container.getBlockBlobClient(blobName);
      await blob.upload(buffer, buffer.length, { blobHTTPHeaders: { blobContentType: contentType } });
      return { provider: 'azure', url: blob.url };
    }
  }

  // AWS S3
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3').catch(() => ({}));
    if (S3Client) {
      const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      await s3.send(new PutObjectCommand({
        Bucket:      containerOrBucket,
        Key:         blobName,
        Body:        buffer,
        ContentType: contentType,
      }));
      return { provider: 's3', key: blobName };
    }
  }

  throw Object.assign(new Error('No blob storage provider configured (set AZURE_STORAGE_CONNECTION_STRING or AWS_ACCESS_KEY_ID)'), { status: 501 });
}
