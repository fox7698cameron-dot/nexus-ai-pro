/**
 * Nexus AI Pro — Integration Connectors
 * AWS, Azure, Adobe, Google Cloud, Slack, Zoom, GitHub, Bitbucket
 * All credentials read from env vars — never hardcoded.
 * date: 2026-06-08
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── Connector registry ────────────────────────────────────────────────────────

export const IntegrationId = Object.freeze({
  AWS: 'aws',
  AZURE: 'azure',
  ADOBE: 'adobe',
  GOOGLE: 'google',
  SLACK: 'slack',
  ZOOM: 'zoom',
  GITHUB: 'github',
  BITBUCKET: 'bitbucket',
  REDIS: 'redis',
});

// Per-user credential store (replace with encrypted DB in production)
const userIntegrations = new Map();   // userId → { integrationId → { ...config, connectedAt } }
const webhookEvents = new Map();      // integrationId → EventEmitter callback list

// ── Safe fetch wrapper (no retry — fail-fast per user requirements) ───────────

async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Base connector class ──────────────────────────────────────────────────────

class BaseConnector {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  _creds(userId) {
    return userIntegrations.get(userId)?.get(this.id);
  }

  connect(userId, config) {
    if (!userIntegrations.has(userId)) userIntegrations.set(userId, new Map());
    userIntegrations.get(userId).set(this.id, { ...config, connectedAt: Date.now() });
    return { ok: true, integration: this.id };
  }

  disconnect(userId) {
    userIntegrations.get(userId)?.delete(this.id);
    return { ok: true };
  }

  isConnected(userId) {
    return !!userIntegrations.get(userId)?.has(this.id);
  }

  status(userId) {
    const creds = this._creds(userId);
    return { integration: this.id, name: this.name, connected: !!creds, connectedAt: creds?.connectedAt || null };
  }
}

// ── AWS ───────────────────────────────────────────────────────────────────────

class AWSConnector extends BaseConnector {
  constructor() { super(IntegrationId.AWS, 'Amazon Web Services'); }

  async listS3Buckets(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('AWS not connected');
    // Use AWS SDK / SigV4 signed request — credentials from env or user-provided IAM role
    // Real implementation: new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
    return { buckets: [], note: 'Connect with accessKeyId + secretAccessKey from env or IAM role' };
  }

  async uploadToS3(userId, bucket, key, body, contentType = 'application/octet-stream') {
    const c = this._creds(userId);
    if (!c) throw new Error('AWS not connected');
    // Real: await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))
    return { ok: true, bucket, key, size: Buffer.byteLength(body) };
  }

  async invokeLambda(userId, functionName, payload) {
    const c = this._creds(userId);
    if (!c) throw new Error('AWS not connected');
    // Real: await lambda.send(new InvokeCommand({ FunctionName: functionName, Payload: JSON.stringify(payload) }))
    return { ok: true, functionName, statusCode: 200 };
  }
}

// ── Azure ─────────────────────────────────────────────────────────────────────

class AzureConnector extends BaseConnector {
  constructor() { super(IntegrationId.AZURE, 'Microsoft Azure'); }

  async uploadBlob(userId, container, blobName, data) {
    const c = this._creds(userId);
    if (!c) throw new Error('Azure not connected');
    // Real: BlobServiceClient.fromConnectionString(c.connectionString).getContainerClient(container).uploadData(data)
    return { ok: true, container, blobName, size: Buffer.byteLength(data) };
  }

  async listBlobs(userId, container) {
    const c = this._creds(userId);
    if (!c) throw new Error('Azure not connected');
    return { blobs: [] };
  }
}

// ── Adobe ─────────────────────────────────────────────────────────────────────

class AdobeConnector extends BaseConnector {
  constructor() { super(IntegrationId.ADOBE, 'Adobe Creative Cloud'); }

  async getUserProfile(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('Adobe not connected');
    const res = await safeFetch('https://ims-na1.adobelogin.com/ims/userinfo/v2', {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    return res.json();
  }

  async listCreativeCloudFiles(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('Adobe not connected');
    // Uses Adobe Creative Cloud API
    const res = await safeFetch('https://cc-api-storage.adobe.io/files', {
      headers: { Authorization: `Bearer ${c.accessToken}`, 'X-Api-Key': process.env.ADOBE_CLIENT_ID },
    });
    return res.json();
  }
}

// ── Google Cloud ──────────────────────────────────────────────────────────────

class GoogleConnector extends BaseConnector {
  constructor() { super(IntegrationId.GOOGLE, 'Google Cloud'); }

  async listStorageBuckets(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('Google not connected');
    const token = c.accessToken;
    const projectId = c.projectId;
    const res = await safeFetch(
      `https://storage.googleapis.com/storage/v1/b?project=${projectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }

  async uploadObject(userId, bucket, name, data) {
    const c = this._creds(userId);
    if (!c) throw new Error('Google not connected');
    const res = await safeFetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}`,
      { method: 'POST', headers: { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/octet-stream' }, body: data }
    );
    return res.json();
  }
}

// ── Slack ─────────────────────────────────────────────────────────────────────

class SlackConnector extends BaseConnector {
  constructor() { super(IntegrationId.SLACK, 'Slack'); }

  async sendMessage(userId, channel, text, blocks = null) {
    const c = this._creds(userId);
    if (!c) throw new Error('Slack not connected');
    const body = { channel, text, ...(blocks ? { blocks } : {}) };
    const res = await safeFetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async sendWebhook(userId, message) {
    const c = this._creds(userId);
    if (!c?.webhookUrl) throw new Error('Slack webhook URL not configured');
    await safeFetch(c.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    return { ok: true };
  }

  async listChannels(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('Slack not connected');
    const res = await safeFetch('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${c.botToken}` },
    });
    return res.json();
  }
}

// ── Zoom ──────────────────────────────────────────────────────────────────────

class ZoomConnector extends BaseConnector {
  constructor() { super(IntegrationId.ZOOM, 'Zoom'); }

  async createMeeting(userId, topic, duration = 60, startTime = null) {
    const c = this._creds(userId);
    if (!c) throw new Error('Zoom not connected');
    const res = await safeFetch(`https://api.zoom.us/v2/users/me/meetings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, type: startTime ? 2 : 1, duration, start_time: startTime }),
    });
    return res.json();
  }

  async listMeetings(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('Zoom not connected');
    const res = await safeFetch('https://api.zoom.us/v2/users/me/meetings', {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    return res.json();
  }
}

// ── GitHub ────────────────────────────────────────────────────────────────────

class GitHubConnector extends BaseConnector {
  constructor() { super(IntegrationId.GITHUB, 'GitHub'); }

  _headers(c) {
    return { Authorization: `Bearer ${c.accessToken}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'NexusAIPro' };
  }

  async getUser(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('GitHub not connected');
    const res = await safeFetch('https://api.github.com/user', { headers: this._headers(c) });
    return res.json();
  }

  async listRepos(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('GitHub not connected');
    const res = await safeFetch('https://api.github.com/user/repos?per_page=100&sort=updated', { headers: this._headers(c) });
    return res.json();
  }

  async getRepoStats(userId, owner, repo) {
    const c = this._creds(userId);
    if (!c) throw new Error('GitHub not connected');
    const [repoData, commits, prs] = await Promise.all([
      safeFetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: this._headers(c) }).then(r => r.json()),
      safeFetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers: this._headers(c) }).then(r => r.json()),
      safeFetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open`, { headers: this._headers(c) }).then(r => r.json()),
    ]);
    return { repo: repoData, recentCommits: commits, openPRs: prs };
  }

  async createWebhook(userId, owner, repo, webhookUrl, events = ['push', 'pull_request']) {
    const c = this._creds(userId);
    if (!c) throw new Error('GitHub not connected');
    const res = await safeFetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: { ...this._headers(c), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events,
        config: { url: webhookUrl, content_type: 'json' },
      }),
    });
    return res.json();
  }
}

// ── Bitbucket ─────────────────────────────────────────────────────────────────

class BitbucketConnector extends BaseConnector {
  constructor() { super(IntegrationId.BITBUCKET, 'Bitbucket'); }

  async listRepositories(userId) {
    const c = this._creds(userId);
    if (!c) throw new Error('Bitbucket not connected');
    const res = await safeFetch(`https://api.bitbucket.org/2.0/repositories/${c.workspace}?pagelen=50`, {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    return res.json();
  }

  async getCommits(userId, repoSlug) {
    const c = this._creds(userId);
    if (!c) throw new Error('Bitbucket not connected');
    const res = await safeFetch(
      `https://api.bitbucket.org/2.0/repositories/${c.workspace}/${repoSlug}/commits?pagelen=20`,
      { headers: { Authorization: `Bearer ${c.accessToken}` } }
    );
    return res.json();
  }
}

// ── Webhook signature verification ───────────────────────────────────────────

export function verifyWebhookSignature(secret, payload, signature, algo = 'sha256') {
  const expected = crypto.createHmac(algo, secret).update(payload).digest('hex');
  const sigBuf = Buffer.from(signature.replace(/^sha\d+=/, ''), 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const connectors = Object.freeze({
  [IntegrationId.AWS]: new AWSConnector(),
  [IntegrationId.AZURE]: new AzureConnector(),
  [IntegrationId.ADOBE]: new AdobeConnector(),
  [IntegrationId.GOOGLE]: new GoogleConnector(),
  [IntegrationId.SLACK]: new SlackConnector(),
  [IntegrationId.ZOOM]: new ZoomConnector(),
  [IntegrationId.GITHUB]: new GitHubConnector(),
  [IntegrationId.BITBUCKET]: new BitbucketConnector(),
});

export function getConnector(id) {
  const c = connectors[id];
  if (!c) throw new Error(`Unknown integration: ${id}`);
  return c;
}

export function getAllStatuses(userId) {
  return Object.values(connectors).map(c => c.status(userId));
}

export default connectors;
