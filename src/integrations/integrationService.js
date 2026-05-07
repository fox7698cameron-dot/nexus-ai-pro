// src/integrations/integrationService.js
// Date: 2026-05-07
// Connectors: Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket, Redis, BlobStorage

import crypto from 'crypto';

const INTEGRATION_IDS = Object.freeze({
  AZURE: 'azure',
  ADOBE: 'adobe',
  AWS: 'aws',
  GOOGLE: 'google',
  SLACK: 'slack',
  ZOOM: 'zoom',
  GITHUB: 'github',
  BITBUCKET: 'bitbucket',
  REDIS: 'redis',
  BLOB: 'blob',
});

const INTEGRATION_STATUS = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  PENDING: 'pending',
});

// Minimal audit log entry
function auditEntry(event, userId) {
  return { ts: new Date().toISOString(), event, userId };
}

// ─── Redis Client Wrapper ───────────────────────────────────────────────────

export class RedisService {
  constructor(ioredis) {
    this._redis = null;
    this._ioredis = ioredis;
  }

  async connect() {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL env var not set');
    this._redis = new this._ioredis(url, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    return this._redis;
  }

  async get(key) {
    if (!this._redis) throw new Error('Redis not connected');
    return this._redis.get(key);
  }

  async set(key, value, ttlSeconds) {
    if (!this._redis) throw new Error('Redis not connected');
    if (ttlSeconds) return this._redis.set(key, value, 'EX', ttlSeconds);
    return this._redis.set(key, value);
  }

  async del(key) {
    if (!this._redis) throw new Error('Redis not connected');
    return this._redis.del(key);
  }

  async exists(key) {
    if (!this._redis) throw new Error('Redis not connected');
    return this._redis.exists(key);
  }

  async hset(key, field, value) {
    if (!this._redis) throw new Error('Redis not connected');
    return this._redis.hset(key, field, value);
  }

  async hget(key, field) {
    if (!this._redis) throw new Error('Redis not connected');
    return this._redis.hget(key, field);
  }

  async hgetall(key) {
    if (!this._redis) throw new Error('Redis not connected');
    return this._redis.hgetall(key);
  }

  async ping() {
    if (!this._redis) return false;
    try {
      const pong = await this._redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  async disconnect() {
    if (this._redis) await this._redis.quit();
    this._redis = null;
  }
}

// ─── Azure Blob Storage Connector ──────────────────────────────────────────

export class AzureBlobConnector {
  constructor(blobServiceClientFactory) {
    this._factory = blobServiceClientFactory;
    this._client = null;
  }

  async connect() {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING env var not set');
    this._client = this._factory(connStr);
    return { status: INTEGRATION_STATUS.CONNECTED, provider: INTEGRATION_IDS.AZURE };
  }

  async uploadBlob(containerName, blobName, data, contentType = 'application/octet-stream') {
    if (!this._client) throw new Error('Azure Blob not connected');
    const container = this._client.getContainerClient(containerName);
    await container.createIfNotExists({ access: 'private' });
    const blockBlob = container.getBlockBlobClient(blobName);
    await blockBlob.upload(data, Buffer.byteLength(data), {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return { url: blockBlob.url, blobName, containerName };
  }

  async downloadBlob(containerName, blobName) {
    if (!this._client) throw new Error('Azure Blob not connected');
    const container = this._client.getContainerClient(containerName);
    const blockBlob = container.getBlockBlobClient(blobName);
    const response = await blockBlob.download(0);
    const chunks = [];
    for await (const chunk of response.readableStreamBody) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async deleteBlob(containerName, blobName) {
    if (!this._client) throw new Error('Azure Blob not connected');
    const container = this._client.getContainerClient(containerName);
    return container.getBlockBlobClient(blobName).delete();
  }

  async listBlobs(containerName) {
    if (!this._client) throw new Error('Azure Blob not connected');
    const container = this._client.getContainerClient(containerName);
    const items = [];
    for await (const blob of container.listBlobsFlat()) {
      items.push({ name: blob.name, size: blob.properties.contentLength, lastModified: blob.properties.lastModified });
    }
    return items;
  }
}

// ─── AWS S3 Connector ───────────────────────────────────────────────────────

export class AWSS3Connector {
  constructor(s3ClientFactory) {
    this._factory = s3ClientFactory;
    this._client = null;
  }

  async connect() {
    const region = process.env.AWS_REGION;
    const keyId = process.env.AWS_ACCESS_KEY_ID;
    const secret = process.env.AWS_SECRET_ACCESS_KEY;
    if (!region || !keyId || !secret) throw new Error('AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY env vars required');
    this._client = this._factory({ region, credentials: { accessKeyId: keyId, secretAccessKey: secret } });
    return { status: INTEGRATION_STATUS.CONNECTED, provider: INTEGRATION_IDS.AWS };
  }

  async upload(bucket, key, body, contentType = 'application/octet-stream') {
    if (!this._client) throw new Error('AWS S3 not connected');
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await this._client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return { bucket, key };
  }

  async download(bucket, key) {
    if (!this._client) throw new Error('AWS S3 not connected');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const response = await this._client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks = [];
    for await (const chunk of response.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async delete(bucket, key) {
    if (!this._client) throw new Error('AWS S3 not connected');
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    return this._client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async list(bucket, prefix = '') {
    if (!this._client) throw new Error('AWS S3 not connected');
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const response = await this._client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    return (response.Contents || []).map(obj => ({ key: obj.Key, size: obj.Size, lastModified: obj.LastModified }));
  }
}

// ─── Slack Connector ────────────────────────────────────────────────────────

export class SlackConnector {
  constructor(webClientFactory) {
    this._factory = webClientFactory;
    this._client = null;
  }

  async connect() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error('SLACK_BOT_TOKEN env var not set');
    this._client = this._factory(token);
    return { status: INTEGRATION_STATUS.CONNECTED, provider: INTEGRATION_IDS.SLACK };
  }

  async sendMessage(channel, text, blocks) {
    if (!this._client) throw new Error('Slack not connected');
    return this._client.chat.postMessage({ channel, text, blocks });
  }

  async sendAlert(channel, title, message, severity = 'info') {
    const colors = { critical: '#FF0000', high: '#FF6600', medium: '#FFCC00', low: '#00CC00', info: '#0066CC' };
    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: title } },
      { type: 'section', text: { type: 'mrkdwn', text: message } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `*Severity:* ${severity} | ${new Date().toISOString()}` }] },
    ];
    return this.sendMessage(channel, title, blocks);
  }

  async listChannels() {
    if (!this._client) throw new Error('Slack not connected');
    const result = await this._client.conversations.list({ types: 'public_channel,private_channel' });
    return (result.channels || []).map(c => ({ id: c.id, name: c.name, memberCount: c.num_members }));
  }
}

// ─── GitHub Connector ───────────────────────────────────────────────────────

export class GitHubConnector {
  constructor(octokitFactory) {
    this._factory = octokitFactory;
    this._client = null;
  }

  async connect() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN env var not set');
    this._client = this._factory({ auth: token });
    return { status: INTEGRATION_STATUS.CONNECTED, provider: INTEGRATION_IDS.GITHUB };
  }

  async getRepo(owner, repo) {
    if (!this._client) throw new Error('GitHub not connected');
    const { data } = await this._client.repos.get({ owner, repo });
    return { name: data.name, description: data.description, stars: data.stargazers_count, forks: data.forks_count, openIssues: data.open_issues_count, defaultBranch: data.default_branch };
  }

  async listCommits(owner, repo, perPage = 10) {
    if (!this._client) throw new Error('GitHub not connected');
    const { data } = await this._client.repos.listCommits({ owner, repo, per_page: perPage });
    return data.map(c => ({ sha: c.sha.slice(0, 7), message: c.commit.message, author: c.commit.author.name, date: c.commit.author.date }));
  }

  async createIssue(owner, repo, title, body, labels = []) {
    if (!this._client) throw new Error('GitHub not connected');
    const { data } = await this._client.issues.create({ owner, repo, title, body, labels });
    return { number: data.number, url: data.html_url };
  }

  async listPullRequests(owner, repo, state = 'open') {
    if (!this._client) throw new Error('GitHub not connected');
    const { data } = await this._client.pulls.list({ owner, repo, state });
    return data.map(pr => ({ number: pr.number, title: pr.title, author: pr.user.login, state: pr.state, createdAt: pr.created_at }));
  }
}

// ─── Bitbucket Connector ────────────────────────────────────────────────────

export class BitbucketConnector {
  async connect() {
    const username = process.env.BITBUCKET_USERNAME;
    const appPassword = process.env.BITBUCKET_APP_PASSWORD;
    if (!username || !appPassword) throw new Error('BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD env vars required');
    this._credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');
    return { status: INTEGRATION_STATUS.CONNECTED, provider: INTEGRATION_IDS.BITBUCKET };
  }

  async _request(path, method = 'GET', body) {
    const response = await fetch(`https://api.bitbucket.org/2.0${path}`, {
      method,
      headers: {
        Authorization: `Basic ${this._credentials}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`Bitbucket API error: ${response.status}`);
    return response.json();
  }

  async getRepo(workspace, repoSlug) {
    return this._request(`/repositories/${workspace}/${repoSlug}`);
  }

  async listCommits(workspace, repoSlug, pagelen = 10) {
    const data = await this._request(`/repositories/${workspace}/${repoSlug}/commits?pagelen=${pagelen}`);
    return (data.values || []).map(c => ({ hash: c.hash.slice(0, 7), message: c.message, author: c.author?.raw, date: c.date }));
  }

  async listPullRequests(workspace, repoSlug, state = 'OPEN') {
    const data = await this._request(`/repositories/${workspace}/${repoSlug}/pullrequests?state=${state}`);
    return (data.values || []).map(pr => ({ id: pr.id, title: pr.title, author: pr.author?.display_name, state: pr.state }));
  }
}

// ─── Zoom Connector ─────────────────────────────────────────────────────────

export class ZoomConnector {
  async connect() {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!accountId || !clientId || !clientSecret) {
      throw new Error('ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET env vars required');
    }
    this._accountId = accountId;
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    this._token = null;
    this._tokenExpiry = 0;
    return { status: INTEGRATION_STATUS.CONNECTED, provider: INTEGRATION_IDS.ZOOM };
  }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExpiry) return this._token;
    const credentials = Buffer.from(`${this._clientId}:${this._clientSecret}`).toString('base64');
    const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this._accountId}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (!response.ok) throw new Error('Zoom token refresh failed');
    const data = await response.json();
    this._token = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._token;
  }

  async listMeetings(userId = 'me') {
    const token = await this._getToken();
    const response = await fetch(`https://api.zoom.us/v2/users/${userId}/meetings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Zoom list meetings failed');
    const data = await response.json();
    return (data.meetings || []).map(m => ({ id: m.id, topic: m.topic, type: m.type, startTime: m.start_time, duration: m.duration }));
  }

  async createMeeting(topic, startTime, duration = 60, agenda = '') {
    const token = await this._getToken();
    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, type: 2, start_time: startTime, duration, agenda }),
    });
    if (!response.ok) throw new Error('Zoom create meeting failed');
    const data = await response.json();
    return { meetingId: data.id, joinUrl: data.join_url, password: data.password };
  }
}

// ─── Adobe Connector ────────────────────────────────────────────────────────

export class AdobeConnector {
  async connect() {
    const clientId = process.env.ADOBE_CLIENT_ID;
    const clientSecret = process.env.ADOBE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('ADOBE_CLIENT_ID and ADOBE_CLIENT_SECRET env vars required');
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    return { status: INTEGRATION_STATUS.CONNECTED, provider: INTEGRATION_IDS.ADOBE };
  }

  async generatePDF(htmlContent) {
    if (!process.env.ADOBE_PDF_SERVICES_CLIENT_ID) {
      throw new Error('ADOBE_PDF_SERVICES_CLIENT_ID env var not set');
    }
    return { status: 'stub', message: 'Adobe PDF Services integration — configure credentials in env vars', contentLength: Buffer.byteLength(htmlContent) };
  }

  async extractText(pdfBuffer) {
    return { status: 'stub', message: 'Adobe Extract API — configure credentials in env vars', inputSize: pdfBuffer.length };
  }
}

// ─── Google Connector ───────────────────────────────────────────────────────

export class GoogleConnector {
  async connect() {
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentialsJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var not set');
    this._credentials = JSON.parse(credentialsJson);
    return { status: INTEGRATION_STATUS.CONNECTED, provider: INTEGRATION_IDS.GOOGLE };
  }

  async translateText(text, targetLanguage, sourceLanguage = 'auto') {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY env var not set');
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, target: targetLanguage, source: sourceLanguage === 'auto' ? undefined : sourceLanguage }),
    });
    if (!response.ok) throw new Error('Google Translate API error');
    const data = await response.json();
    return data.data.translations[0].translatedText;
  }

  async detectLanguage(text) {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY env var not set');
    const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });
    if (!response.ok) throw new Error('Google Detect API error');
    const data = await response.json();
    return data.data.detections[0][0].language;
  }

  async generateContent(prompt, model = 'gemini-2.0-flash') {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY env var not set');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });
    if (!response.ok) throw new Error('Google Gemini API error');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
}

// ─── Integration Manager ────────────────────────────────────────────────────

export class IntegrationManager {
  constructor(deps = {}) {
    this._status = {};
    this._auditLog = [];
    this._deps = deps;
  }

  _log(event, userId) {
    const entry = auditEntry(event, userId);
    this._auditLog.push(entry);
    if (this._auditLog.length > 500) this._auditLog.splice(0, this._auditLog.length - 500);
    return entry;
  }

  async connectAll(userId) {
    const connectors = {
      [INTEGRATION_IDS.REDIS]: () => this.redis?.connect(),
      [INTEGRATION_IDS.BLOB]: () => this.azureBlob?.connect(),
      [INTEGRATION_IDS.AWS]: () => this.awsS3?.connect(),
      [INTEGRATION_IDS.SLACK]: () => this.slack?.connect(),
      [INTEGRATION_IDS.GITHUB]: () => this.github?.connect(),
      [INTEGRATION_IDS.BITBUCKET]: () => this.bitbucket?.connect(),
      [INTEGRATION_IDS.ZOOM]: () => this.zoom?.connect(),
      [INTEGRATION_IDS.ADOBE]: () => this.adobe?.connect(),
      [INTEGRATION_IDS.GOOGLE]: () => this.google?.connect(),
    };
    const results = {};
    for (const [id, connectFn] of Object.entries(connectors)) {
      try {
        results[id] = await connectFn();
        this._status[id] = INTEGRATION_STATUS.CONNECTED;
      } catch (err) {
        results[id] = { status: INTEGRATION_STATUS.ERROR, error: err.message };
        this._status[id] = INTEGRATION_STATUS.ERROR;
      }
    }
    this._log('INTEGRATIONS_CONNECT_ALL', userId);
    return results;
  }

  getStatus() {
    return { ...this._status };
  }
}

export { INTEGRATION_IDS, INTEGRATION_STATUS };
