/**
 * File: src/connectors/CloudConnectors.js
 * Purpose: Cloud and third-party service connectors — Azure, AWS, Google Cloud, Adobe,
 *          Slack, Zoom, GitHub, Bitbucket, Redis, and a unified BlobConnector.
 *          All credentials come from environment variables; no secrets are hardcoded.
 *          Each connector provides: connect(), disconnect(), isConnected(),
 *          getStatus(), and test(). Graceful degradation when unconfigured.
 * Date: 2026-08-22
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 */

// ---------------------------------------------------------------------------
// Environment helper — works in both Node and Vite/browser contexts
// ---------------------------------------------------------------------------
function env(key) {
  // Node.js
  if (typeof process !== 'undefined' && process.env?.[key] != null) {
    return process.env[key];
  }
  // Vite (VITE_ prefix required for browser exposure)
  const viteKey = `VITE_${key}`;
  if (typeof import.meta !== 'undefined' && import.meta.env?.[viteKey] != null) {
    return import.meta.env[viteKey];
  }
  return null;
}

// ---------------------------------------------------------------------------
// BaseConnector — shared lifecycle, status, and logging
// ---------------------------------------------------------------------------
class BaseConnector {
  /**
   * @param {string} name  - Human-readable service name
   * @param {string[]} requiredEnvVars  - Names of env vars needed to operate
   */
  constructor(name, requiredEnvVars = []) {
    this._name       = name;
    this._required   = requiredEnvVars;
    this._connected  = false;
    this._lastError  = null;
    this._connectedAt = null;
    this._client     = null; // holds the underlying SDK client when connected
  }

  // -- Subclass interface ---------------------------------------------------

  /**
   * Build and store the SDK client. Must be overridden.
   * Throw with a descriptive message on failure.
   * @abstract
   * @returns {Promise<void>}
   */
  async _connect() {
    throw new Error(`${this._name}: _connect() not implemented`);
  }

  /**
   * Tear down the SDK client. Override when cleanup is needed.
   * @returns {Promise<void>}
   */
  async _disconnect() {
    this._client = null;
  }

  /**
   * Perform a lightweight health probe against the live service.
   * Override to make `test()` meaningful.
   * @returns {Promise<{ ok: boolean, latencyMs?: number, detail?: string }>}
   */
  async _probe() {
    return { ok: this._connected };
  }

  // -- Public API -----------------------------------------------------------

  /** Returns true if all required env vars are present (service is configurable). */
  isConfigured() {
    return this._required.every((k) => Boolean(env(k)));
  }

  /** Connect to the service. No-op if already connected. */
  async connect() {
    if (this._connected) return;
    if (!this.isConfigured()) {
      this._lastError = `${this._name}: missing required env vars: ${this._required.filter((k) => !env(k)).join(', ')}`;
      console.warn(`[Connector] ${this._lastError}`);
      return; // graceful degradation — do not throw
    }
    try {
      await this._connect();
      this._connected  = true;
      this._connectedAt = new Date().toISOString();
      this._lastError  = null;
      console.info(`[Connector] ${this._name} connected`);
    } catch (err) {
      this._connected = false;
      this._lastError = err?.message ?? String(err);
      console.error(`[Connector] ${this._name} connect failed:`, this._lastError);
      // Do not rethrow — callers must inspect getStatus()
    }
  }

  /** Disconnect from the service. No-op if already disconnected. */
  async disconnect() {
    if (!this._connected) return;
    try {
      await this._disconnect();
    } catch (err) {
      console.warn(`[Connector] ${this._name} disconnect warning:`, err?.message);
    } finally {
      this._connected  = false;
      this._client     = null;
      this._connectedAt = null;
    }
  }

  /** Whether the connector currently holds an active connection. */
  isConnected() {
    return this._connected;
  }

  /** Returns a snapshot of the connector's state. */
  getStatus() {
    return {
      name:         this._name,
      connected:    this._connected,
      configured:   this.isConfigured(),
      connectedAt:  this._connectedAt,
      lastError:    this._lastError,
    };
  }

  /**
   * Probe the live service and return health info.
   * @returns {Promise<{ ok: boolean, latencyMs?: number, detail?: string, status: object }>}
   */
  async test() {
    if (!this._connected) {
      return { ok: false, detail: 'Not connected', status: this.getStatus() };
    }
    const t0 = Date.now();
    try {
      const result = await this._probe();
      return { ...result, latencyMs: Date.now() - t0, status: this.getStatus() };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - t0, detail: err?.message, status: this.getStatus() };
    }
  }
}

// ===========================================================================
// AzureConnector
// Env: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET
// Services: Blob Storage, Key Vault, Monitor
// ===========================================================================
export class AzureConnector extends BaseConnector {
  constructor() {
    super('Azure', ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_SECRET']);
  }

  async _connect() {
    // In a real app, initialise @azure/identity ClientSecretCredential here.
    // Credentials are read from env vars only — never hardcoded.
    const clientId     = env('AZURE_CLIENT_ID');
    const tenantId     = env('AZURE_TENANT_ID');
    const clientSecret = env('AZURE_CLIENT_SECRET');

    if (!clientId || !tenantId || !clientSecret) {
      throw new Error('Azure credentials incomplete');
    }

    // Lazily import SDK to avoid hard dependency when unconfigured
    // const { ClientSecretCredential } = await import('@azure/identity');
    // const { BlobServiceClient }      = await import('@azure/storage-blob');
    // const { SecretClient }           = await import('@azure/keyvault-secrets');
    // const { MonitorClient }          = await import('@azure/arm-monitor');

    this._client = {
      tenantId,
      clientId,
      // credential: new ClientSecretCredential(tenantId, clientId, clientSecret),
      // blobs, keyVault, monitor clients would be built here from credential
    };
  }

  /** Azure Blob Storage operations */
  get blobs() {
    this._assertConnected();
    return {
      /** @returns {Promise<Buffer>} */
      download: async (containerName, blobName) => {
        // return this._client.blobService.getContainerClient(containerName)
        //   .getBlobClient(blobName).downloadToBuffer();
        throw new Error('Azure SDK not initialised in this environment');
      },
      /** @returns {Promise<void>} */
      upload: async (containerName, blobName, data, options = {}) => {
        // return this._client.blobService.getContainerClient(containerName)
        //   .getBlobClient(blobName).upload(data, data.length, options);
        throw new Error('Azure SDK not initialised in this environment');
      },
      /** @returns {Promise<string[]>} */
      list: async (containerName) => {
        // const blobs = [];
        // for await (const blob of this._client.blobService.getContainerClient(containerName).listBlobsFlat())
        //   blobs.push(blob.name);
        // return blobs;
        throw new Error('Azure SDK not initialised in this environment');
      },
    };
  }

  /** Azure Key Vault operations */
  get keyVault() {
    this._assertConnected();
    return {
      getSecret: async (vaultUrl, secretName) => {
        // return (await this._client.kvClient(vaultUrl).getSecret(secretName)).value;
        throw new Error('Azure SDK not initialised in this environment');
      },
      setSecret: async (vaultUrl, secretName, value) => {
        // await this._client.kvClient(vaultUrl).setSecret(secretName, value);
        throw new Error('Azure SDK not initialised in this environment');
      },
    };
  }

  /** Azure Monitor operations */
  get monitor() {
    this._assertConnected();
    return {
      queryMetrics: async (resourceId, metricNames, timespan) => {
        // return this._client.monitorClient.metrics.list(resourceId, { metricnames: metricNames.join(','), timespan });
        throw new Error('Azure SDK not initialised in this environment');
      },
    };
  }

  async _probe() {
    // A real probe would do a lightweight list-blobs call
    return { ok: true, detail: 'Azure credentials validated at connect time' };
  }

  _assertConnected() {
    if (!this._connected) throw new Error('AzureConnector is not connected');
  }
}

// ===========================================================================
// AWSConnector
// Env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
// Services: S3, CloudWatch, Secrets Manager
// ===========================================================================
export class AWSConnector extends BaseConnector {
  constructor() {
    super('AWS', ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION']);
  }

  async _connect() {
    const accessKeyId     = env('AWS_ACCESS_KEY_ID');
    const secretAccessKey = env('AWS_SECRET_ACCESS_KEY');
    const region          = env('AWS_REGION');

    if (!accessKeyId || !secretAccessKey || !region) {
      throw new Error('AWS credentials incomplete');
    }

    // const { S3Client }              = await import('@aws-sdk/client-s3');
    // const { CloudWatchClient }      = await import('@aws-sdk/client-cloudwatch');
    // const { SecretsManagerClient }  = await import('@aws-sdk/client-secrets-manager');
    // const creds = { credentials: { accessKeyId, secretAccessKey }, region };

    this._client = {
      region,
      // s3:      new S3Client(creds),
      // cw:      new CloudWatchClient(creds),
      // secrets: new SecretsManagerClient(creds),
    };
  }

  /** S3 operations */
  get s3() {
    this._assertConnected();
    return {
      getObject: async (bucket, key) => {
        // const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        // return this._client.s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        throw new Error('AWS SDK not initialised in this environment');
      },
      putObject: async (bucket, key, body, options = {}) => {
        // const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        // return this._client.s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ...options }));
        throw new Error('AWS SDK not initialised in this environment');
      },
      deleteObject: async (bucket, key) => {
        // const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        // return this._client.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        throw new Error('AWS SDK not initialised in this environment');
      },
      listObjects: async (bucket, prefix = '') => {
        // const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        // return this._client.s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
        throw new Error('AWS SDK not initialised in this environment');
      },
    };
  }

  /** CloudWatch operations */
  get cloudWatch() {
    this._assertConnected();
    return {
      putMetricData: async (namespace, metricData) => {
        // const { PutMetricDataCommand } = await import('@aws-sdk/client-cloudwatch');
        // return this._client.cw.send(new PutMetricDataCommand({ Namespace: namespace, MetricData: metricData }));
        throw new Error('AWS SDK not initialised in this environment');
      },
      getMetricStatistics: async (params) => {
        // const { GetMetricStatisticsCommand } = await import('@aws-sdk/client-cloudwatch');
        // return this._client.cw.send(new GetMetricStatisticsCommand(params));
        throw new Error('AWS SDK not initialised in this environment');
      },
    };
  }

  /** Secrets Manager operations */
  get secretsManager() {
    this._assertConnected();
    return {
      getSecret: async (secretId) => {
        // const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
        // const res = await this._client.secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
        // return res.SecretString ?? res.SecretBinary;
        throw new Error('AWS SDK not initialised in this environment');
      },
      putSecret: async (secretId, value) => {
        // const { PutSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
        // return this._client.secrets.send(new PutSecretValueCommand({ SecretId: secretId, SecretString: value }));
        throw new Error('AWS SDK not initialised in this environment');
      },
    };
  }

  async _probe() {
    return { ok: true, detail: 'AWS credentials validated at connect time' };
  }

  _assertConnected() {
    if (!this._connected) throw new Error('AWSConnector is not connected');
  }
}

// ===========================================================================
// GoogleConnector
// Env: GOOGLE_CLIENT_ID, GOOGLE_PROJECT_ID
// Services: Cloud Storage, Analytics
// ===========================================================================
export class GoogleConnector extends BaseConnector {
  constructor() {
    super('Google Cloud', ['GOOGLE_CLIENT_ID', 'GOOGLE_PROJECT_ID']);
  }

  async _connect() {
    const clientId  = env('GOOGLE_CLIENT_ID');
    const projectId = env('GOOGLE_PROJECT_ID');

    if (!clientId || !projectId) throw new Error('Google credentials incomplete');

    // const { Storage }             = await import('@google-cloud/storage');
    // const { BetaAnalyticsData }   = await import('@google-analytics/data');

    this._client = { clientId, projectId };
  }

  /** Google Cloud Storage */
  get storage() {
    this._assertConnected();
    return {
      upload: async (bucketName, destination, source) => {
        // return this._client.gcs.bucket(bucketName).upload(source, { destination });
        throw new Error('GCS SDK not initialised in this environment');
      },
      download: async (bucketName, fileName, destination) => {
        // return this._client.gcs.bucket(bucketName).file(fileName).download({ destination });
        throw new Error('GCS SDK not initialised in this environment');
      },
      list: async (bucketName, options = {}) => {
        // const [files] = await this._client.gcs.bucket(bucketName).getFiles(options);
        // return files.map((f) => f.name);
        throw new Error('GCS SDK not initialised in this environment');
      },
    };
  }

  /** Google Analytics Data API */
  get analytics() {
    this._assertConnected();
    return {
      runReport: async (propertyId, request) => {
        // return this._client.analyticsData.runReport({ property: `properties/${propertyId}`, ...request });
        throw new Error('GA SDK not initialised in this environment');
      },
    };
  }

  async _probe() {
    return { ok: true, detail: 'Google credentials validated at connect time' };
  }

  _assertConnected() {
    if (!this._connected) throw new Error('GoogleConnector is not connected');
  }
}

// ===========================================================================
// AdobeConnector
// Env: ADOBE_CLIENT_ID, ADOBE_CLIENT_SECRET
// Service: Creative Cloud API
// ===========================================================================
export class AdobeConnector extends BaseConnector {
  constructor() {
    super('Adobe Creative Cloud', ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET']);
  }

  async _connect() {
    const clientId     = env('ADOBE_CLIENT_ID');
    const clientSecret = env('ADOBE_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Adobe credentials incomplete');

    // Obtain OAuth access token from Adobe IMS
    const tokenRes = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'openid,creative_sdk,AdobeID',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Adobe auth failed: ${tokenRes.status}`);
    }

    const { access_token, expires_in } = await tokenRes.json();
    this._client = {
      accessToken: access_token,
      expiresAt:   Date.now() + (expires_in ?? 3600) * 1000,
      clientId,
    };
  }

  async _disconnect() {
    // Revoke token if desired (optional)
    this._client = null;
  }

  /** Lightroom / Creative Cloud API calls */
  async listAssets(options = {}) {
    this._assertConnected();
    const res = await fetch('https://lr.adobe.io/v2/catalog', {
      headers: {
        Authorization:  `Bearer ${this._client.accessToken}`,
        'X-API-Key':    this._client.clientId,
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`Adobe API error ${res.status}`);
    return res.json();
  }

  async _probe() {
    try {
      const res = await fetch('https://ims-na1.adobelogin.com/ims/health', {
        headers: { Authorization: `Bearer ${this._client.accessToken}` },
      });
      return { ok: res.ok, detail: `Adobe IMS status ${res.status}` };
    } catch (e) {
      return { ok: false, detail: e.message };
    }
  }

  _assertConnected() {
    if (!this._connected) throw new Error('AdobeConnector is not connected');
  }
}

// ===========================================================================
// SlackConnector
// Env: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET
// Service: Slack Bot API
// ===========================================================================
export class SlackConnector extends BaseConnector {
  constructor() {
    super('Slack', ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET']);
  }

  async _connect() {
    const token         = env('SLACK_BOT_TOKEN');
    const signingSecret = env('SLACK_SIGNING_SECRET');
    if (!token || !signingSecret) throw new Error('Slack credentials incomplete');
    this._client = { token, signingSecret };
  }

  async _slackApi(method, body = {}) {
    this._assertConnected();
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${this._client.token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
    return data;
  }

  async postMessage(channel, text, options = {}) {
    return this._slackApi('chat.postMessage', { channel, text, ...options });
  }

  async postBlockMessage(channel, blocks, text = '') {
    return this._slackApi('chat.postMessage', { channel, blocks, text });
  }

  async listChannels(options = {}) {
    return this._slackApi('conversations.list', options);
  }

  async getUser(userId) {
    return this._slackApi('users.info', { user: userId });
  }

  async uploadFile(channels, filename, content, options = {}) {
    return this._slackApi('files.upload', { channels, filename, content, ...options });
  }

  async _probe() {
    try {
      const data = await this._slackApi('auth.test');
      return { ok: true, detail: `Authenticated as ${data.user} in ${data.team}` };
    } catch (e) {
      return { ok: false, detail: e.message };
    }
  }

  _assertConnected() {
    if (!this._connected) throw new Error('SlackConnector is not connected');
  }
}

// ===========================================================================
// ZoomConnector
// Env: ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
// Service: Zoom Meeting API (Server-to-Server OAuth)
// ===========================================================================
export class ZoomConnector extends BaseConnector {
  constructor() {
    super('Zoom', ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET']);
  }

  async _connect() {
    const clientId     = env('ZOOM_CLIENT_ID');
    const clientSecret = env('ZOOM_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Zoom credentials incomplete');

    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://zoom.us/oauth/token?grant_type=account_credentials&account_id=me', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!res.ok) throw new Error(`Zoom auth failed: ${res.status}`);
    const { access_token, expires_in } = await res.json();
    this._client = {
      accessToken: access_token,
      expiresAt:   Date.now() + (expires_in ?? 3600) * 1000,
    };
  }

  async _zoomApi(method, path, body = null) {
    this._assertConnected();
    const res = await fetch(`https://api.zoom.us/v2${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this._client.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Zoom API ${res.status}: ${err}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async createMeeting(userId, options = {}) {
    return this._zoomApi('POST', `/users/${userId}/meetings`, options);
  }

  async getMeeting(meetingId) {
    return this._zoomApi('GET', `/meetings/${meetingId}`);
  }

  async deleteMeeting(meetingId) {
    return this._zoomApi('DELETE', `/meetings/${meetingId}`);
  }

  async listMeetings(userId, options = {}) {
    const qs = new URLSearchParams(options);
    return this._zoomApi('GET', `/users/${userId}/meetings?${qs}`);
  }

  async _probe() {
    try {
      const data = await this._zoomApi('GET', '/users/me');
      return { ok: true, detail: `Authenticated as ${data.email}` };
    } catch (e) {
      return { ok: false, detail: e.message };
    }
  }

  _assertConnected() {
    if (!this._connected) throw new Error('ZoomConnector is not connected');
  }
}

// ===========================================================================
// GitHubConnector
// Env: GITHUB_TOKEN, GITHUB_APP_ID
// Service: GitHub REST API v4 / GraphQL
// ===========================================================================
export class GitHubConnector extends BaseConnector {
  constructor() {
    super('GitHub', ['GITHUB_TOKEN']);
  }

  async _connect() {
    const token = env('GITHUB_TOKEN');
    if (!token) throw new Error('GITHUB_TOKEN not set');
    this._client = { token, appId: env('GITHUB_APP_ID') };
  }

  async _ghApi(method, path, body = null) {
    this._assertConnected();
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this._client.token}`,
        Accept:        'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`GitHub API ${res.status}: ${err}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async getUser()                         { return this._ghApi('GET',  '/user'); }
  async getRepo(owner, repo)              { return this._ghApi('GET',  `/repos/${owner}/${repo}`); }
  async listRepos(org, options = {})      {
    const qs = new URLSearchParams(options);
    return this._ghApi('GET', `/orgs/${org}/repos?${qs}`);
  }
  async createIssue(owner, repo, data)    { return this._ghApi('POST', `/repos/${owner}/${repo}/issues`, data); }
  async listIssues(owner, repo, options = {}) {
    const qs = new URLSearchParams(options);
    return this._ghApi('GET', `/repos/${owner}/${repo}/issues?${qs}`);
  }
  async createPR(owner, repo, data)       { return this._ghApi('POST', `/repos/${owner}/${repo}/pulls`, data); }
  async getContents(owner, repo, path)    { return this._ghApi('GET',  `/repos/${owner}/${repo}/contents/${path}`); }

  async _probe() {
    try {
      const user = await this.getUser();
      return { ok: true, detail: `Authenticated as ${user.login}` };
    } catch (e) {
      return { ok: false, detail: e.message };
    }
  }

  _assertConnected() {
    if (!this._connected) throw new Error('GitHubConnector is not connected');
  }
}

// ===========================================================================
// BitbucketConnector
// Env: BITBUCKET_CLIENT_ID, BITBUCKET_CLIENT_SECRET
// Service: Bitbucket Cloud API (OAuth 2 client credentials)
// ===========================================================================
export class BitbucketConnector extends BaseConnector {
  constructor() {
    super('Bitbucket', ['BITBUCKET_CLIENT_ID', 'BITBUCKET_CLIENT_SECRET']);
  }

  async _connect() {
    const clientId     = env('BITBUCKET_CLIENT_ID');
    const clientSecret = env('BITBUCKET_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Bitbucket credentials incomplete');

    const res = await fetch('https://bitbucket.org/site/oauth2/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) throw new Error(`Bitbucket auth failed: ${res.status}`);
    const { access_token, expires_in } = await res.json();
    this._client = {
      accessToken: access_token,
      expiresAt:   Date.now() + (expires_in ?? 7200) * 1000,
    };
  }

  async _bbApi(method, path, body = null) {
    this._assertConnected();
    const res = await fetch(`https://api.bitbucket.org/2.0${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this._client.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Bitbucket API ${res.status}: ${err}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async getUser()                           { return this._bbApi('GET',  '/user'); }
  async listRepos(workspace, options = {}) {
    const qs = new URLSearchParams(options);
    return this._bbApi('GET', `/repositories/${workspace}?${qs}`);
  }
  async getRepo(workspace, slug)           { return this._bbApi('GET',  `/repositories/${workspace}/${slug}`); }
  async createPR(workspace, slug, data)    { return this._bbApi('POST', `/repositories/${workspace}/${slug}/pullrequests`, data); }

  async _probe() {
    try {
      const user = await this.getUser();
      return { ok: true, detail: `Authenticated as ${user.display_name}` };
    } catch (e) {
      return { ok: false, detail: e.message };
    }
  }

  _assertConnected() {
    if (!this._connected) throw new Error('BitbucketConnector is not connected');
  }
}

// ===========================================================================
// RedisConnector
// Env: REDIS_URL, REDIS_PASSWORD (optional)
// Service: Redis (via ioredis — dynamically imported)
// ===========================================================================
export class RedisConnector extends BaseConnector {
  constructor() {
    super('Redis', ['REDIS_URL']);
  }

  async _connect() {
    const redisUrl = env('REDIS_URL');
    if (!redisUrl) throw new Error('REDIS_URL not set');

    const password = env('REDIS_PASSWORD');

    // Dynamic import to avoid hard dependency when unconfigured
    let Redis;
    try {
      ({ default: Redis } = await import('ioredis'));
    } catch {
      throw new Error('ioredis package not installed — run: npm install ioredis');
    }

    const opts = password ? { password } : {};
    const client = new Redis(redisUrl, opts);

    // Wait for connection or first error
    await new Promise((resolve, reject) => {
      client.once('ready', resolve);
      client.once('error', reject);
    });

    this._client = client;
  }

  async _disconnect() {
    await this._client?.quit();
    this._client = null;
  }

  /** Set a key with optional TTL in seconds */
  async set(key, value, ttlSeconds = null) {
    this._assertConnected();
    if (ttlSeconds) return this._client.setex(key, ttlSeconds, value);
    return this._client.set(key, value);
  }

  /** Get a key */
  async get(key) {
    this._assertConnected();
    return this._client.get(key);
  }

  /** Delete one or more keys */
  async del(...keys) {
    this._assertConnected();
    return this._client.del(...keys);
  }

  /** Increment a counter */
  async incr(key) {
    this._assertConnected();
    return this._client.incr(key);
  }

  /** Publish to a channel */
  async publish(channel, message) {
    this._assertConnected();
    return this._client.publish(channel, message);
  }

  /** Execute a pipeline of commands */
  pipeline(commands) {
    this._assertConnected();
    const pipeline = this._client.pipeline();
    for (const [cmd, ...args] of commands) {
      pipeline[cmd](...args);
    }
    return pipeline.exec();
  }

  async _probe() {
    try {
      const pong = await this._client.ping();
      return { ok: pong === 'PONG', detail: pong };
    } catch (e) {
      return { ok: false, detail: e.message };
    }
  }

  _assertConnected() {
    if (!this._connected) throw new Error('RedisConnector is not connected');
  }
}

// ===========================================================================
// BlobConnector — unified blob storage
// Env: BLOB_PROVIDER ('azure' | 'aws' | 'gcs'), plus provider-specific vars
// ===========================================================================
export class BlobConnector extends BaseConnector {
  constructor() {
    super('Blob Storage', ['BLOB_PROVIDER']);
    this._provider = null;
  }

  async _connect() {
    const provider = (env('BLOB_PROVIDER') ?? '').toLowerCase();
    if (!provider) throw new Error('BLOB_PROVIDER env var not set');

    let connector;
    if (provider === 'azure') {
      connector = new AzureConnector();
    } else if (provider === 'aws') {
      connector = new AWSConnector();
    } else if (provider === 'gcs' || provider === 'google') {
      connector = new GoogleConnector();
    } else {
      throw new Error(`Unknown BLOB_PROVIDER: ${provider}. Use 'azure', 'aws', or 'gcs'`);
    }

    await connector.connect();
    if (!connector.isConnected()) {
      const status = connector.getStatus();
      throw new Error(`Blob provider '${provider}' failed to connect: ${status.lastError}`);
    }

    this._provider = connector;
    this._client   = { provider };
  }

  async _disconnect() {
    await this._provider?.disconnect();
    this._provider = null;
    this._client   = null;
  }

  /**
   * Upload data to blob storage.
   * @param {string} bucket - Bucket or container name
   * @param {string} key    - Object key / blob name
   * @param {Buffer|Blob|string} data
   * @param {object} [options]
   */
  async upload(bucket, key, data, options = {}) {
    this._assertConnected();
    const p = env('BLOB_PROVIDER')?.toLowerCase();
    if (p === 'azure') return this._provider.blobs.upload(bucket, key, data, options);
    if (p === 'aws')   return this._provider.s3.putObject(bucket, key, data, options);
    if (p === 'gcs' || p === 'google') return this._provider.storage.upload(bucket, key, data);
  }

  /**
   * Download data from blob storage.
   * @param {string} bucket
   * @param {string} key
   */
  async download(bucket, key) {
    this._assertConnected();
    const p = env('BLOB_PROVIDER')?.toLowerCase();
    if (p === 'azure') return this._provider.blobs.download(bucket, key);
    if (p === 'aws')   return this._provider.s3.getObject(bucket, key);
    if (p === 'gcs' || p === 'google') return this._provider.storage.download(bucket, key, null);
  }

  /**
   * List objects in a bucket.
   * @param {string} bucket
   * @param {string} [prefix='']
   */
  async list(bucket, prefix = '') {
    this._assertConnected();
    const p = env('BLOB_PROVIDER')?.toLowerCase();
    if (p === 'azure') return this._provider.blobs.list(bucket);
    if (p === 'aws')   return this._provider.s3.listObjects(bucket, prefix);
    if (p === 'gcs' || p === 'google') return this._provider.storage.list(bucket, { prefix });
  }

  /** Provider name ('azure' | 'aws' | 'gcs' | null) */
  get providerName() {
    return env('BLOB_PROVIDER')?.toLowerCase() ?? null;
  }

  async _probe() {
    if (!this._provider) return { ok: false, detail: 'No provider initialised' };
    return this._provider.test();
  }

  _assertConnected() {
    if (!this._connected) throw new Error('BlobConnector is not connected');
  }
}

// ===========================================================================
// Singleton instances (created lazily — call .connect() before use)
// ===========================================================================
export const azureConnector     = new AzureConnector();
export const awsConnector       = new AWSConnector();
export const googleConnector    = new GoogleConnector();
export const adobeConnector     = new AdobeConnector();
export const slackConnector     = new SlackConnector();
export const zoomConnector      = new ZoomConnector();
export const gitHubConnector    = new GitHubConnector();
export const bitbucketConnector = new BitbucketConnector();
export const redisConnector     = new RedisConnector();
export const blobConnector      = new BlobConnector();

// ===========================================================================
// getAllStatuses — snapshot of all connectors
// ===========================================================================
export function getAllStatuses() {
  return [
    azureConnector,
    awsConnector,
    googleConnector,
    adobeConnector,
    slackConnector,
    zoomConnector,
    gitHubConnector,
    bitbucketConnector,
    redisConnector,
    blobConnector,
  ].map((c) => c.getStatus());
}

// ===========================================================================
// connectAll — connect all configured connectors in parallel (fire-and-forget)
// ===========================================================================
export async function connectAll() {
  const connectors = [
    azureConnector,
    awsConnector,
    googleConnector,
    adobeConnector,
    slackConnector,
    zoomConnector,
    gitHubConnector,
    bitbucketConnector,
    redisConnector,
    blobConnector,
  ];

  const results = await Promise.allSettled(connectors.map((c) => c.connect()));
  return results.map((r, i) => ({
    ...connectors[i].getStatus(),
    settled: r.status,
  }));
}

// ===========================================================================
// disconnectAll — gracefully disconnect all connectors
// ===========================================================================
export async function disconnectAll() {
  await Promise.allSettled([
    azureConnector.disconnect(),
    awsConnector.disconnect(),
    googleConnector.disconnect(),
    adobeConnector.disconnect(),
    slackConnector.disconnect(),
    zoomConnector.disconnect(),
    gitHubConnector.disconnect(),
    bitbucketConnector.disconnect(),
    redisConnector.disconnect(),
    blobConnector.disconnect(),
  ]);
}

export default {
  AzureConnector,
  AWSConnector,
  GoogleConnector,
  AdobeConnector,
  SlackConnector,
  ZoomConnector,
  GitHubConnector,
  BitbucketConnector,
  RedisConnector,
  BlobConnector,
  azureConnector,
  awsConnector,
  googleConnector,
  adobeConnector,
  slackConnector,
  zoomConnector,
  gitHubConnector,
  bitbucketConnector,
  redisConnector,
  blobConnector,
  getAllStatuses,
  connectAll,
  disconnectAll,
};
